/**
 * POST /api/sessions/[id]/end
 *
 * Ends an active examination monitoring session.
 *
 * Requirements:
 * 1. Authenticate user.
 * 2. Verify school ownership.
 * 3. Verify session is currently ACTIVE.
 * 4. Change status to COMPLETED and set ended_at = now().
 * 5. Freeing this hall allows another scheduled session in the hall to become ACTIVE.
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

  // Verify session belongs to school
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

  if (session.status !== 'ACTIVE') {
    return NextResponse.json(
      {
        error: 'SESSION_NOT_ACTIVE',
        message: `Cannot end session because its current status is "${session.status}". Only ACTIVE sessions can be ended.`,
      },
      { status: 409 }
    )
  }

  const now = new Date().toISOString()
  const { data: updatedSession, error: updateError } = await supabase
    .from('exam_sessions')
    .update({
      status: 'COMPLETED',
      ended_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .select('*, classrooms(id, name, access_code)')
    .single()

  if (updateError) {
    return NextResponse.json(errorResponse('Failed to end session.', updateError.message), { status: 500 })
  }

  return NextResponse.json(
    {
      message: 'Examination session ended successfully.',
      session: updatedSession,
    },
    { status: 200 }
  )
}
