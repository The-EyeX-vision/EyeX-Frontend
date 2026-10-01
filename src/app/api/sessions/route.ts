/**
 * GET  /api/sessions — list exam sessions for authenticated school
 * POST /api/sessions — create a new exam session in a classroom
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth/api'
import { createClient } from '@/lib/supabase/server'
import {
  requireString,
  requirePositiveInt,
  requireUUID,
  errorResponse,
} from '@/lib/validation'

export async function GET(request: NextRequest) {
  const auth = await authenticateUser()
  if (!auth.ok) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const classroomId = searchParams.get('classroom_id')
  const status = searchParams.get('status')

  const supabase = await createClient()

  // Get school's classrooms
  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('id')
    .eq('school_id', auth.school.id)

  const classroomIds = (classrooms ?? []).map((c) => c.id)
  if (classroomIds.length === 0) {
    return NextResponse.json({ sessions: [] }, { status: 200 })
  }

  let query = supabase
    .from('exam_sessions')
    .select(`
      *,
      classrooms (id, name, access_code),
      session_students (id)
    `)
    .in('classroom_id', classroomId ? [classroomId] : classroomIds)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status.toUpperCase())
  }

  const { data: sessions, error } = await query

  if (error) {
    return NextResponse.json(errorResponse('Failed to fetch sessions.', error.message), { status: 500 })
  }

  const formatted = (sessions ?? []).map((s) => ({
    id: s.id,
    classroom_id: s.classroom_id,
    course_name: s.course_name,
    course_code: s.course_code,
    duration_minutes: s.duration_minutes,
    student_count: s.student_count,
    status: s.status,
    started_at: s.started_at,
    ended_at: s.ended_at,
    created_at: s.created_at,
    updated_at: s.updated_at,
    classroom: s.classrooms,
    detected_trackers_count: (s.session_students ?? []).length,
  }))

  return NextResponse.json({ sessions: formatted }, { status: 200 })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateUser()
  if (!auth.ok) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(errorResponse('Request body must be valid JSON.'), { status: 400 })
  }

  const b = body as Record<string, unknown>

  const classroomResult = requireUUID(b.classroom_id, 'classroom_id')
  if (!classroomResult.ok) return NextResponse.json(errorResponse(classroomResult.error), { status: 400 })

  const courseNameResult = requireString(b.course_name, 'course_name')
  if (!courseNameResult.ok) return NextResponse.json(errorResponse(courseNameResult.error), { status: 400 })

  const courseCodeResult = requireString(b.course_code, 'course_code')
  if (!courseCodeResult.ok) return NextResponse.json(errorResponse(courseCodeResult.error), { status: 400 })

  const durationResult = requirePositiveInt(b.duration_minutes, 'duration_minutes')
  if (!durationResult.ok) return NextResponse.json(errorResponse(durationResult.error), { status: 400 })

  const studentCount = Number(b.student_count ?? 0)
  if (!Number.isInteger(studentCount) || studentCount < 0) {
    return NextResponse.json(errorResponse('student_count must be a non-negative integer.'), { status: 400 })
  }

  const supabase = await createClient()

  // Verify classroom belongs to authenticated school
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('id, name')
    .eq('id', classroomResult.value)
    .eq('school_id', auth.school.id)
    .maybeSingle()

  if (!classroom) {
    return NextResponse.json(errorResponse('Classroom not found or does not belong to your school.'), { status: 404 })
  }

  const { data: session, error } = await supabase
    .from('exam_sessions')
    .insert({
      classroom_id: classroomResult.value,
      course_name: courseNameResult.value,
      course_code: courseCodeResult.value.toUpperCase(),
      duration_minutes: durationResult.value,
      student_count: studentCount,
      status: 'SCHEDULED',
    })
    .select('*, classrooms(id, name, access_code)')
    .single()

  if (error) {
    return NextResponse.json(errorResponse('Failed to create examination session.', error.message), { status: 500 })
  }

  return NextResponse.json({ session }, { status: 201 })
}
