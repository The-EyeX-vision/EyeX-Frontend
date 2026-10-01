/**
 * GET   /api/exams/[id]   — get one exam
 * PATCH /api/exams/[id]   — update an exam
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticateUser } from '@/lib/auth/api'
import {
  requireString,
  requirePositiveInt,
  errorResponse,
} from '@/lib/validation'

type Params = { params: Promise<{ id: string }> }

// ── GET /api/exams/[id] ────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await authenticateUser()
  if (!auth.ok) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('id', id)
    .eq('school_id', auth.school.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json(errorResponse('Failed to fetch exam.', error.message), { status: 500 })
  }
  if (!data) {
    return NextResponse.json(errorResponse('Exam not found.'), { status: 404 })
  }

  return NextResponse.json({ exam: data }, { status: 200 })
}

// ── PATCH /api/exams/[id] ──────────────────────────────────────
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

  // Only include provided fields
  if (b.title !== undefined) {
    const r = requireString(b.title, 'title')
    if (!r.ok) return NextResponse.json(errorResponse(r.error), { status: 400 })
    updates.title = r.value
  }
  if (b.exam_date !== undefined) {
    const r = requireString(b.exam_date, 'exam_date')
    if (!r.ok) return NextResponse.json(errorResponse(r.error), { status: 400 })
    updates.exam_date = r.value
  }
  if (b.start_time !== undefined) {
    const r = requireString(b.start_time, 'start_time')
    if (!r.ok) return NextResponse.json(errorResponse(r.error), { status: 400 })
    updates.start_time = r.value
  }
  if (b.room_number !== undefined) {
    const r = requireString(b.room_number, 'room_number')
    if (!r.ok) return NextResponse.json(errorResponse(r.error), { status: 400 })
    updates.room_number = r.value
  }
  if (b.duration_minutes !== undefined) {
    const r = requirePositiveInt(b.duration_minutes, 'duration_minutes')
    if (!r.ok) return NextResponse.json(errorResponse(r.error), { status: 400 })
    updates.duration_minutes = r.value
  }
  if (b.expected_students !== undefined) {
    const r = requirePositiveInt(b.expected_students, 'expected_students')
    if (!r.ok) return NextResponse.json(errorResponse(r.error), { status: 400 })
    updates.expected_students = r.value
  }
  if (b.description !== undefined) {
    updates.description = typeof b.description === 'string' ? b.description.trim() || null : null
  }

  const supabase = await createClient()

  // Verify ownership before update
  const { data: existing } = await supabase
    .from('exams')
    .select('id')
    .eq('id', id)
    .eq('school_id', auth.school.id)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json(errorResponse('Exam not found.'), { status: 404 })
  }

  const { data, error } = await supabase
    .from('exams')
    .update(updates)
    .eq('id', id)
    .eq('school_id', auth.school.id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json(errorResponse('Failed to update exam.', error.message), { status: 500 })
  }

  return NextResponse.json({ exam: data }, { status: 200 })
}
