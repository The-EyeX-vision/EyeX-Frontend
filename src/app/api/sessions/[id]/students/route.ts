/**
 * GET /api/sessions/[id]/students
 *
 * Retrieves all temporary tracker identities detected by the CV model
 * for this examination session, along with their violation records.
 *
 * Note: These are NOT permanent student accounts.
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

  // Verify session belongs to authenticated school
  const { data: session } = await supabase
    .from('exam_sessions')
    .select(`
      id,
      course_name,
      course_code,
      status,
      classrooms!inner (
        id,
        name,
        school_id
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (!session) {
    return NextResponse.json(errorResponse('Session not found.'), { status: 404 })
  }

  // @ts-expect-error join typing
  if (session.classrooms.school_id !== auth.school.id) {
    return NextResponse.json(errorResponse('Access denied.'), { status: 403 })
  }

  const { data: students, error } = await supabase
    .from('session_students')
    .select(`
      *,
      student_violations (*)
    `)
    .eq('session_id', id)
    .order('first_seen_at', { ascending: true })

  if (error) {
    return NextResponse.json(errorResponse('Failed to fetch session trackers.', error.message), { status: 500 })
  }

  const formatted = (students ?? []).map((s) => {
    const violations = s.student_violations ?? []
    const totalViolationsCount = violations.reduce((acc: number, v: { count: number }) => acc + v.count, 0)
    return {
      id: s.id,
      session_id: s.session_id,
      tracker_label: s.tracker_label,
      first_seen_at: s.first_seen_at,
      last_seen_at: s.last_seen_at,
      created_at: s.created_at,
      violations_count: totalViolationsCount,
      violations,
    }
  })

  return NextResponse.json(
    {
      session_id: id,
      total_trackers: formatted.length,
      trackers: formatted,
    },
    { status: 200 }
  )
}
