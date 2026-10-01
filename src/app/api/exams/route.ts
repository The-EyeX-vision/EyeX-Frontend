/**
 * GET  /api/exams       — list exams for authenticated school
 * POST /api/exams       — create a new exam
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticateUser } from '@/lib/auth/api'
import {
  requireString,
  requirePositiveInt,
  errorResponse,
} from '@/lib/validation'

// ── GET /api/exams ─────────────────────────────────────────────
export async function GET() {
  const auth = await authenticateUser()
  if (!auth.ok) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('school_id', auth.school.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(errorResponse('Failed to fetch exams.', error.message), { status: 500 })
  }

  return NextResponse.json({ exams: data ?? [] }, { status: 200 })
}

// ── POST /api/exams ────────────────────────────────────────────
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

  // Validate fields
  const titleResult = requireString(b.title, 'title')
  if (!titleResult.ok) return NextResponse.json(errorResponse(titleResult.error), { status: 400 })

  const examDateResult = requireString(b.exam_date, 'exam_date')
  if (!examDateResult.ok) return NextResponse.json(errorResponse(examDateResult.error), { status: 400 })

  const startTimeResult = requireString(b.start_time, 'start_time')
  if (!startTimeResult.ok) return NextResponse.json(errorResponse(startTimeResult.error), { status: 400 })

  const roomResult = requireString(b.room_number, 'room_number')
  if (!roomResult.ok) return NextResponse.json(errorResponse(roomResult.error), { status: 400 })

  const durationResult = requirePositiveInt(b.duration_minutes, 'duration_minutes')
  if (!durationResult.ok) return NextResponse.json(errorResponse(durationResult.error), { status: 400 })

  const expectedResult = requirePositiveInt(b.expected_students, 'expected_students')
  if (!expectedResult.ok) return NextResponse.json(errorResponse(expectedResult.error), { status: 400 })

  const description = typeof b.description === 'string' ? b.description.trim() || null : null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exams')
    .insert({
      school_id: auth.school.id,
      title: titleResult.value,
      description,
      exam_date: examDateResult.value,
      start_time: startTimeResult.value,
      duration_minutes: durationResult.value,
      room_number: roomResult.value,
      expected_students: expectedResult.value,
      status: 'scheduled',
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json(errorResponse('Failed to create exam.', error.message), { status: 500 })
  }

  return NextResponse.json({ exam: data }, { status: 201 })
}
