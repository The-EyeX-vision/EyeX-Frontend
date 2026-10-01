/**
 * POST /api/hall-access/verify
 *
 * Verifies a hall access code submitted by an examiner.
 *
 * Requirements:
 * 1. Receive the code.
 * 2. Find the corresponding classroom.
 * 3. Verify that the code is valid.
 * 4. Verify that it has not expired (code_valid_until).
 * 5. Return only the information required for the examiner's hall workspace:
 *    - classroom id, name
 *    - cameras in this hall
 *    - currently ACTIVE session (if any)
 *    - SCHEDULED sessions for this hall
 *
 * The hall code does NOT grant access to the entire school or other halls.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireString, errorResponse } from '@/lib/validation'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(errorResponse('Request body must be valid JSON.'), { status: 400 })
  }

  const b = body as Record<string, unknown>
  const codeResult = requireString(b.access_code, 'access_code')
  if (!codeResult.ok) {
    return NextResponse.json(errorResponse(codeResult.error), { status: 400 })
  }

  const normalizedCode = codeResult.value.toUpperCase()
  const supabase = await createClient()

  // Find classroom by access_code
  const { data: classroom, error } = await supabase
    .from('classrooms')
    .select(`
      id,
      name,
      access_code,
      code_valid_until,
      school_id,
      cameras (id, name, camera_number, status),
      exam_sessions (
        id,
        course_name,
        course_code,
        duration_minutes,
        student_count,
        status,
        started_at,
        ended_at
      )
    `)
    .eq('access_code', normalizedCode)
    .maybeSingle()

  if (error || !classroom) {
    return NextResponse.json(
      errorResponse('ACCESS_DENIED', 'Invalid hall access code.'),
      { status: 403 }
    )
  }

  // Check code expiration
  if (classroom.code_valid_until) {
    const validUntil = new Date(classroom.code_valid_until).getTime()
    if (Date.now() > validUntil) {
      return NextResponse.json(
        errorResponse('ACCESS_DENIED', 'This hall access code has expired. Please contact the administrator.'),
        { status: 403 }
      )
    }
  }

  const sessions = classroom.exam_sessions ?? []
  const activeSession = sessions.find((s: { status: string }) => s.status === 'ACTIVE') ?? null
  const scheduledSessions = sessions.filter((s: { status: string }) => s.status === 'SCHEDULED')

  return NextResponse.json(
    {
      valid: true,
      hall: {
        id: classroom.id,
        name: classroom.name,
        cameras: classroom.cameras ?? [],
      },
      active_session: activeSession,
      scheduled_sessions: scheduledSessions,
    },
    { status: 200 }
  )
}
