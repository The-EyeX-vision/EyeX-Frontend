/**
 * POST /api/model/detections
 *
 * ════════════════════════════════════════════════════════════════
 * COMPUTER VISION MODEL → EYEX DETECTION INTEGRATION ENDPOINT
 * ════════════════════════════════════════════════════════════════
 *
 * Receives detections from the computer-vision model.
 *
 * Requirements (Section 15, 19, 20, 27):
 * 1. Authenticate the model request using MODEL_API_KEY.
 * 2. Validate the event payload.
 * 3. Confirm that the session exists.
 * 4. Confirm that the session is currently ACTIVE. (Reject if not ACTIVE)
 * 5. Confirm that the camera belongs to the session's classroom/hall.
 * 6. Find or create the corresponding tracker in public.session_students.
 * 7. Enforce: ONE TRACKER + ONE ACTIVITY TYPE = ONE VIOLATION RECORD.
 * 8. If violation exists: increment count, update last_detected_at.
 * 9. If violation is new: create with count = 1.
 * 10. If evidence image is provided, upload to Supabase Storage (violation-evidence bucket)
 *     and associate image_path with the violation.
 * 11. Database changes emit through Supabase Realtime to live dashboards.
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateModelRequest } from '@/lib/auth/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  requireUUID,
  requireEnum,
  errorResponse,
} from '@/lib/validation'
import type { ViolationActivityType } from '@/types'

const ALLOWED_ACTIVITIES: ViolationActivityType[] = [
  'PHONE_DETECTED',
  'UNAUTHORIZED_MATERIAL',
  'SUSPICIOUS_MOVEMENT',
  'POSSIBLE_COMMUNICATION',
  'LOOKING_AWAY',
  'MULTIPLE_PERSONS',
  'UNKNOWN',
]

export async function POST(request: NextRequest) {
  // 1. Authenticate model request via server-to-server secret MODEL_API_KEY
  const modelAuth = authenticateModelRequest(request)
  if (!modelAuth.ok) {
    return NextResponse.json(errorResponse(modelAuth.error), { status: modelAuth.status })
  }

  // 2. Parse and validate JSON body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(errorResponse('Request body must be valid JSON.'), { status: 400 })
  }

  const b = body as Record<string, unknown>

  const sessionResult = requireUUID(b.session_id, 'session_id')
  if (!sessionResult.ok) return NextResponse.json(errorResponse(sessionResult.error), { status: 400 })

  const cameraResult = requireUUID(b.camera_id, 'camera_id')
  if (!cameraResult.ok) return NextResponse.json(errorResponse(cameraResult.error), { status: 400 })

  if (b.tracker_label === undefined || b.tracker_label === null || String(b.tracker_label).trim() === '') {
    return NextResponse.json(errorResponse('tracker_label is required.'), { status: 400 })
  }
  const rawLabel = String(b.tracker_label).trim()
  const trackerLabel = rawLabel.startsWith('Tracker #')
    ? rawLabel
    : `Tracker #${rawLabel.replace(/^Tracker\s*#?/i, '')}`

  const activityResult = requireEnum<ViolationActivityType>(
    b.activity_type,
    'activity_type',
    ALLOWED_ACTIVITIES
  )
  if (!activityResult.ok) return NextResponse.json(errorResponse(activityResult.error), { status: 400 })

  const description = typeof b.description === 'string' && b.description.trim() !== ''
    ? b.description.trim()
    : `${activityResult.value.replace(/_/g, ' ')} detected`

  const timestamp = typeof b.timestamp === 'string' && !isNaN(Date.parse(b.timestamp))
    ? new Date(b.timestamp).toISOString()
    : new Date().toISOString()

  // Use admin client if configured, otherwise server client
  const adminClient = createAdminClient()
  const supabase = adminClient ?? (await createClient())

  // 3. Confirm that the session exists
  const { data: session, error: sessionErr } = await supabase
    .from('exam_sessions')
    .select(`
      id,
      classroom_id,
      status,
      classrooms (
        id,
        school_id
      )
    `)
    .eq('id', sessionResult.value)
    .maybeSingle()

  if (sessionErr || !session) {
    return NextResponse.json(errorResponse('Examination session not found.'), { status: 404 })
  }

  // 4. Confirm that the session is currently ACTIVE
  if (session.status !== 'ACTIVE') {
    return NextResponse.json(
      {
        error: 'SESSION_NOT_ACTIVE',
        message: `Cannot record detections for session with status "${session.status}". Session must be ACTIVE.`,
      },
      { status: 409 }
    )
  }

  // 5. Confirm that the camera belongs to the session's classroom
  const { data: camera, error: cameraErr } = await supabase
    .from('cameras')
    .select('id, classroom_id, name, status')
    .eq('id', cameraResult.value)
    .maybeSingle()

  if (cameraErr || !camera) {
    return NextResponse.json(errorResponse('Camera not found.'), { status: 404 })
  }

  if (camera.classroom_id !== session.classroom_id) {
    return NextResponse.json(
      errorResponse(
        'CAMERA_MISMATCH',
        `Camera ${camera.name} does not belong to the examination hall where this session is taking place.`
      ),
      { status: 400 }
    )
  }

  // 6. Find or create the corresponding session tracker in session_students
  let sessionStudentId: string

  const { data: existingStudent } = await supabase
    .from('session_students')
    .select('id, tracker_label')
    .eq('session_id', session.id)
    .eq('tracker_label', trackerLabel)
    .maybeSingle()

  if (existingStudent) {
    sessionStudentId = existingStudent.id
    // Update last_seen_at
    await supabase
      .from('session_students')
      .update({ last_seen_at: timestamp, updated_at: new Date().toISOString() })
      .eq('id', sessionStudentId)
  } else {
    const { data: newStudent, error: createStudentErr } = await supabase
      .from('session_students')
      .insert({
        session_id: session.id,
        tracker_label: trackerLabel,
        first_seen_at: timestamp,
        last_seen_at: timestamp,
      })
      .select('id')
      .single()

    if (createStudentErr || !newStudent) {
      return NextResponse.json(
        errorResponse('Failed to register session tracker.', createStudentErr?.message),
        { status: 500 }
      )
    }
    sessionStudentId = newStudent.id
  }

  // @ts-expect-error join typing
  const schoolId = session.classrooms?.school_id ?? 'default-school'

  // 7. Handle Evidence Image Storage (Supabase Storage: violation-evidence bucket)
  let uploadedImagePath: string | null = null

  if (typeof b.image === 'string' && b.image.length > 20) {
    try {
      const base64Clean = b.image.replace(/^data:image\/\w+;base64,/, '')
      const imageBuffer = Buffer.from(base64Clean, 'base64')
      const sanitizedTracker = trackerLabel.replace(/[^a-zA-Z0-9_-]/g, '_')
      const fileName = `${schoolId}/${session.id}/${sanitizedTracker}-${activityResult.value.toLowerCase()}-${Date.now()}.jpg`

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('violation-evidence')
        .upload(fileName, imageBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (!uploadErr && uploadData?.path) {
        uploadedImagePath = uploadData.path
      }
    } catch {
      // Storage upload failure should not block violation recording
    }
  }

  // 8. Find or create violation (ONE TRACKER + ONE ACTIVITY TYPE = ONE VIOLATION RECORD)
  const { data: existingViolation } = await supabase
    .from('student_violations')
    .select('id, count, image_path')
    .eq('session_student_id', sessionStudentId)
    .eq('activity_type', activityResult.value)
    .maybeSingle()

  let finalViolation: Record<string, unknown>

  if (existingViolation) {
    // 9. Increment count and update last_detected_at
    const newCount = existingViolation.count + 1
    const { data: updatedViolation, error: updateViolErr } = await supabase
      .from('student_violations')
      .update({
        count: newCount,
        description,
        last_detected_at: timestamp,
        image_path: uploadedImagePath ?? existingViolation.image_path,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingViolation.id)
      .select('*')
      .single()

    if (updateViolErr || !updatedViolation) {
      return NextResponse.json(
        errorResponse('Failed to update violation record.', updateViolErr?.message),
        { status: 500 }
      )
    }
    finalViolation = updatedViolation
  } else {
    // 10. Create new violation record with count = 1
    const { data: newViolation, error: createViolErr } = await supabase
      .from('student_violations')
      .insert({
        session_student_id: sessionStudentId,
        activity_type: activityResult.value,
        description,
        count: 1,
        image_path: uploadedImagePath,
        first_detected_at: timestamp,
        last_detected_at: timestamp,
      })
      .select('*')
      .single()

    if (createViolErr || !newViolation) {
      return NextResponse.json(
        errorResponse('Failed to create violation record.', createViolErr?.message),
        { status: 500 }
      )
    }
    finalViolation = newViolation
  }

  return NextResponse.json(
    {
      success: true,
      message: existingViolation ? 'Violation occurrence incremented.' : 'New violation recorded.',
      tracker: {
        id: sessionStudentId,
        tracker_label: trackerLabel,
      },
      violation: finalViolation,
    },
    { status: existingViolation ? 200 : 201 }
  )
}
