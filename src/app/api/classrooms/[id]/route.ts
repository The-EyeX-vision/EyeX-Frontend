/**
 * GET    /api/classrooms/[id] — get single classroom with cameras and active session
 * PATCH  /api/classrooms/[id] — update classroom details
 * DELETE /api/classrooms/[id] — delete classroom
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth/api'
import { createClient } from '@/lib/supabase/server'
import { requireString, errorResponse } from '@/lib/validation'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await authenticateUser()
  if (!auth.ok) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status })
  }

  const supabase = await createClient()
  const { data: classroom, error } = await supabase
    .from('classrooms')
    .select(`
      *,
      cameras (*),
      exam_sessions (*)
    `)
    .eq('id', id)
    .eq('school_id', auth.school.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json(errorResponse('Failed to fetch classroom.', error.message), { status: 500 })
  }
  if (!classroom) {
    return NextResponse.json(errorResponse('Classroom not found.'), { status: 404 })
  }

  const activeSession = (classroom.exam_sessions ?? []).find(
    (s: { status: string }) => s.status === 'ACTIVE'
  ) ?? null

  return NextResponse.json(
    {
      classroom: {
        ...classroom,
        active_session: activeSession,
      },
    },
    { status: 200 }
  )
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
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
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (b.name !== undefined) {
    const r = requireString(b.name, 'name')
    if (!r.ok) return NextResponse.json(errorResponse(r.error), { status: 400 })
    updates.name = r.value
  }

  if (b.code_valid_until !== undefined) {
    updates.code_valid_until = typeof b.code_valid_until === 'string' && b.code_valid_until.trim() !== ''
      ? b.code_valid_until.trim()
      : null
  }

  const supabase = await createClient()

  // Verify ownership
  const { data: existing } = await supabase
    .from('classrooms')
    .select('id')
    .eq('id', id)
    .eq('school_id', auth.school.id)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json(errorResponse('Classroom not found.'), { status: 404 })
  }

  const { data: updated, error } = await supabase
    .from('classrooms')
    .update(updates)
    .eq('id', id)
    .eq('school_id', auth.school.id)
    .select('*')
    .single()

  if (error || !updated) {
    return NextResponse.json(errorResponse('Failed to update classroom.', error?.message), { status: 500 })
  }

  return NextResponse.json({ classroom: updated }, { status: 200 })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await authenticateUser()
  if (!auth.ok) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status })
  }

  const supabase = await createClient()

  // Check if classroom has an ACTIVE session
  const { data: activeSession } = await supabase
    .from('exam_sessions')
    .select('id')
    .eq('classroom_id', id)
    .eq('status', 'ACTIVE')
    .maybeSingle()

  if (activeSession) {
    return NextResponse.json(
      errorResponse('Cannot delete classroom while an examination session is ACTIVE in this hall.'),
      { status: 409 }
    )
  }

  const { error } = await supabase
    .from('classrooms')
    .delete()
    .eq('id', id)
    .eq('school_id', auth.school.id)

  if (error) {
    return NextResponse.json(errorResponse('Failed to delete classroom.', error.message), { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Classroom deleted.' }, { status: 200 })
}
