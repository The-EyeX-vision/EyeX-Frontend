/**
 * GET /api/sessions/[id]
 * Get detailed information for an examination session.
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

  const { data: session, error } = await supabase
    .from('exam_sessions')
    .select(`
      *,
      classrooms!inner (
        id,
        name,
        access_code,
        school_id,
        cameras (id, name, camera_number, status)
      ),
      session_students (
        id,
        tracker_label,
        first_seen_at,
        last_seen_at,
        student_violations (id, activity_type, count, first_detected_at, last_detected_at)
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json(errorResponse('Failed to fetch session.', error.message), { status: 500 })
  }
  if (!session) {
    return NextResponse.json(errorResponse('Session not found.'), { status: 404 })
  }

  const classroomObj = session.classrooms as unknown as { school_id: string } | null
  if (classroomObj?.school_id !== auth.school.id) {
    return NextResponse.json(errorResponse('Access denied.'), { status: 403 })
  }

  const trackers = session.session_students ?? []
  let totalViolationsCount = 0
  trackers.forEach((t: { student_violations?: Array<{ count: number }> }) => {
    (t.student_violations ?? []).forEach((v) => {
      totalViolationsCount += v.count
    })
  })

  return NextResponse.json(
    {
      session: {
        id: session.id,
        classroom_id: session.classroom_id,
        course_name: session.course_name,
        course_code: session.course_code,
        duration_minutes: session.duration_minutes,
        student_count: session.student_count,
        status: session.status,
        started_at: session.started_at,
        ended_at: session.ended_at,
        created_at: session.created_at,
        updated_at: session.updated_at,
        classroom: session.classrooms,
        trackers_detected: trackers.length,
        violations_count: totalViolationsCount,
        trackers: trackers,
      },
    },
    { status: 200 }
  )
}
