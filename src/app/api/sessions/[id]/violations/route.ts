/**
 * GET /api/sessions/[id]/violations
 * Returns all suspicious activities / violations recorded during an exam session.
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

  // Get all session students for this session
  const { data: trackers } = await supabase
    .from('session_students')
    .select('id, tracker_label')
    .eq('session_id', id)

  const trackerMap = new Map((trackers ?? []).map((t) => [t.id, t.tracker_label]))
  const trackerIds = Array.from(trackerMap.keys())

  if (trackerIds.length === 0) {
    return NextResponse.json({ violations: [], total_count: 0 }, { status: 200 })
  }

  const { data: violations, error } = await supabase
    .from('student_violations')
    .select('*')
    .in('session_student_id', trackerIds)
    .order('last_detected_at', { ascending: false })

  if (error) {
    return NextResponse.json(errorResponse('Failed to fetch violations.', error.message), { status: 500 })
  }

  const formatted = (violations ?? []).map((v) => ({
    id: v.id,
    session_id: id,
    session_student_id: v.session_student_id,
    tracker_label: trackerMap.get(v.session_student_id) ?? 'Unknown Tracker',
    activity_type: v.activity_type,
    description: v.description,
    count: v.count,
    image_path: v.image_path,
    first_detected_at: v.first_detected_at,
    last_detected_at: v.last_detected_at,
  }))

  const totalIncidentOccurrences = formatted.reduce((acc, curr) => acc + curr.count, 0)

  return NextResponse.json(
    {
      session_id: id,
      total_unique_violations: formatted.length,
      total_occurrences: totalIncidentOccurrences,
      violations: formatted,
    },
    { status: 200 }
  )
}
