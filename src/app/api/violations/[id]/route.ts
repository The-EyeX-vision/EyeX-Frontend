/**
 * GET /api/violations/[id]
 * Retrieves a single violation record with evidence image URL and tracker context.
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth/api'
import { createClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/validation'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await authenticateUser()
  if (!auth.ok) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status })
  }

  const supabase = await createClient()

  const { data: violation, error } = await supabase
    .from('student_violations')
    .select(`
      *,
      session_students!inner (
        id,
        tracker_label,
        first_seen_at,
        last_seen_at,
        exam_sessions!inner (
          id,
          course_name,
          course_code,
          status,
          classrooms!inner (
            id,
            name,
            school_id
          )
        )
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json(errorResponse('Failed to fetch violation.', error.message), { status: 500 })
  }
  if (!violation) {
    return NextResponse.json(errorResponse('Violation not found.'), { status: 404 })
  }

  type NestedClassroom = { school_id: string; name: string }
  type NestedSession = { id: string; course_name: string; course_code: string; status: string; classrooms: NestedClassroom }
  type NestedStudent = { id: string; tracker_label: string; first_seen_at: string; last_seen_at: string; exam_sessions: NestedSession }

  const tracker = violation.session_students as unknown as NestedStudent
  const session = tracker?.exam_sessions
  const classroom = session?.classrooms

  const schoolId = classroom?.school_id
  if (schoolId !== auth.school.id) {
    return NextResponse.json(errorResponse('Access denied.'), { status: 403 })
  }

  // Generate signed evidence URL if image_path exists
  let evidenceUrl: string | null = null
  if (violation.image_path) {
    const { data: signedData } = await supabase.storage
      .from('violation-evidence')
      .createSignedUrl(violation.image_path, 3600) // 1 hour validity

    evidenceUrl = signedData?.signedUrl ?? null
  }

  return NextResponse.json(
    {
      violation: {
        id: violation.id,
        activity_type: violation.activity_type,
        description: violation.description,
        count: violation.count,
        image_path: violation.image_path,
        evidence_url: evidenceUrl,
        first_detected_at: violation.first_detected_at,
        last_detected_at: violation.last_detected_at,
        created_at: violation.created_at,
        tracker: {
          id: tracker.id,
          tracker_label: tracker.tracker_label,
          first_seen_at: tracker.first_seen_at,
          last_seen_at: tracker.last_seen_at,
        },
        session: {
          id: session.id,
          course_name: session.course_name,
          course_code: session.course_code,
          status: session.status,
          hall_name: classroom.name,
        },
      },
    },
    { status: 200 }
  )
}
