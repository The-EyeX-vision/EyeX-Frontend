import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * GET /api/sessions
 * Returns examination sessions (optionally filtered by classroomId or status).
 *
 * POST /api/sessions
 * Creates or schedules a new examination session for a classroom/hall.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const classroomId = searchParams.get('classroomId')
    const status = searchParams.get('status')

    const admin = createAdminClient()
    const supabase = await createClient()
    const db = admin || supabase

    let query = db
      .from('exam_hall_sessions')
      .select('*, classroom:classrooms(id, name, access_code)')
      .order('created_at', { ascending: false })

    if (classroomId) query = query.eq('classroom_id', classroomId)
    if (status) query = query.eq('status', status)

    const { data, error } = await query

    if (error) {
      // Fallback check to legacy sessions if table is not yet migrated
      const { data: legacy } = await db
        .from('monitoring_sessions')
        .select('*, exam:exams(title, room_number)')
        .order('created_at', { ascending: false })

      return NextResponse.json(legacy ?? [], { status: 200 })
    }

    return NextResponse.json(data ?? [], { status: 200 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to fetch sessions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      classroomId,
      courseName,
      courseCode,
      durationMinutes = 120,
      expectedStudents = 30,
      startImmediately = false,
    } = body

    if (!classroomId || !courseName?.trim()) {
      return NextResponse.json(
        { error: 'Classroom ID and Course Name are required.' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const supabase = await createClient()
    const db = admin || supabase

    // Find classroom to obtain school_id
    const { data: classroom } = await db
      .from('classrooms')
      .select('id, school_id, name')
      .eq('id', classroomId)
      .maybeSingle()

    let schoolId = classroom?.school_id

    if (!schoolId) {
      // Try from authenticated user if available
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: school } = await db
          .from('schools')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle()
        schoolId = school?.id
      }
    }

    if (!schoolId) {
      return NextResponse.json(
        { error: 'Classroom not found or unassociated with a valid school.' },
        { status: 404 }
      )
    }

    // Check for existing ACTIVE session in this classroom
    const { data: existingActive } = await db
      .from('exam_hall_sessions')
      .select('id')
      .eq('classroom_id', classroomId)
      .eq('status', 'ACTIVE')
      .maybeSingle()

    if (existingActive) {
      return NextResponse.json(
        { error: 'An active examination session is already in progress in this hall. Please end it first.' },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()
    const initialStatus = startImmediately ? 'ACTIVE' : 'SCHEDULED'

    const { data: newSession, error: insertError } = await db
      .from('exam_hall_sessions')
      .insert({
        school_id: schoolId,
        classroom_id: classroomId,
        course_name: courseName.trim(),
        course_code: courseCode?.trim() || null,
        duration_minutes: Number(durationMinutes) || 120,
        expected_students: Number(expectedStudents) || 0,
        status: initialStatus,
        started_at: startImmediately ? now : null,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, session: newSession }, { status: 201 })
  } catch (err: unknown) {
    console.error('[POST /api/sessions] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error creating session.' },
      { status: 500 }
    )
  }
}
