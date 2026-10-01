/**
 * POST /api/sessions/[id]/start
 *
 * Starts an examination monitoring session.
 *
 * CRITICAL BUSINESS RULE (MANDATORY):
 * ONE HALL CAN HAVE ONLY ONE ACTIVE SESSION AT A TIME.
 *
 * Concurrency & Collision Enforcement:
 * 1. Checks if another session in the same classroom has status = 'ACTIVE'.
 * 2. If an active session exists in this hall, rejects with HTTP 409 Conflict:
 *    {
 *      "error": "CLASSROOM_SESSION_CONFLICT",
 *      "message": "This hall already has an active examination session."
 *    }
 * 3. Even under race conditions where two requests arrive at the exact same millisecond,
 *    the PostgreSQL unique partial index (idx_one_active_session_per_classroom)
 *    guarantees that only one can succeed, returning 409 Conflict on the second.
 * 4. Different halls CAN run active sessions simultaneously.
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth/api'
import { createClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/validation'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await authenticateUser()
  if (!auth.ok) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status })
  }

  const supabase = await createClient()

  // 1. Fetch target session and verify school ownership
  const { data: session, error: fetchError } = await supabase
    .from('exam_sessions')
    .select(`
      id,
      classroom_id,
      status,
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

  if (fetchError) {
    return NextResponse.json(errorResponse('Failed to fetch session.', fetchError.message), { status: 500 })
  }
  if (!session) {
    return NextResponse.json(errorResponse('Session not found.'), { status: 404 })
  }

  const classroom = session.classrooms as unknown as { school_id: string } | null
  if (classroom?.school_id !== auth.school.id) {
    return NextResponse.json(errorResponse('Access denied.'), { status: 403 })
  }

  // 2. If this session is already ACTIVE, return current state or conflict
  if (session.status === 'ACTIVE') {
    return NextResponse.json(
      {
        error: 'SESSION_ALREADY_ACTIVE',
        message: 'This examination session is already active.',
        session_id: id,
      },
      { status: 409 }
    )
  }

  // If already COMPLETED or CANCELLED, cannot be restarted
  if (session.status === 'COMPLETED' || session.status === 'CANCELLED') {
    return NextResponse.json(
      {
        error: 'SESSION_FINALIZED',
        message: `This session cannot be started because its status is ${session.status}.`,
      },
      { status: 409 }
    )
  }

  // 3. MANDATORY CONCURRENCY CHECK: Check if ANY session in this classroom is currently ACTIVE
  const { data: existingActiveSession } = await supabase
    .from('exam_sessions')
    .select('id, course_name, course_code, started_at')
    .eq('classroom_id', session.classroom_id)
    .eq('status', 'ACTIVE')
    .neq('id', id)
    .maybeSingle()

  if (existingActiveSession) {
    return NextResponse.json(
      {
        error: 'CLASSROOM_SESSION_CONFLICT',
        message: 'This hall already has an active examination session.',
        active_session: {
          id: existingActiveSession.id,
          course_name: existingActiveSession.course_name,
          course_code: existingActiveSession.course_code,
          started_at: existingActiveSession.started_at,
        },
      },
      { status: 409 }
    )
  }

  // 4. Update session to ACTIVE and record started_at
  const now = new Date().toISOString()
  const { data: updatedSession, error: updateError } = await supabase
    .from('exam_sessions')
    .update({
      status: 'ACTIVE',
      started_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .select('*, classrooms(id, name, access_code)')
    .single()

  if (updateError) {
    // Check if failure is due to database-level unique index collision (race condition)
    if (updateError.code === '23505' || updateError.message?.includes('idx_one_active_session_per_classroom')) {
      return NextResponse.json(
        {
          error: 'CLASSROOM_SESSION_CONFLICT',
          message: 'This hall already has an active examination session.',
        },
        { status: 409 }
      )
    }
    return NextResponse.json(errorResponse('Failed to start session.', updateError.message), { status: 500 })
  }

  return NextResponse.json(
    {
      message: 'Examination session started successfully.',
      session: updatedSession,
    },
    { status: 200 }
  )
}
