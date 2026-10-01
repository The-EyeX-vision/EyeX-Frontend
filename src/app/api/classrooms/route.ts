/**
 * GET  /api/classrooms — list classrooms for authenticated school
 * POST /api/classrooms — create a new examination hall (classroom)
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth/api'
import { createClient } from '@/lib/supabase/server'
import {
  requireString,
  generateHallAccessCode,
  errorResponse,
} from '@/lib/validation'

export async function GET() {
  const auth = await authenticateUser()
  if (!auth.ok) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status })
  }

  const supabase = await createClient()
  const { data: classrooms, error } = await supabase
    .from('classrooms')
    .select(`
      *,
      cameras (id, name, camera_number, status),
      exam_sessions (id, course_name, course_code, status, started_at, student_count)
    `)
    .eq('school_id', auth.school.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(errorResponse('Failed to fetch classrooms.', error.message), { status: 500 })
  }

  // Format to clearly indicate any currently active session in each hall
  const formatted = (classrooms ?? []).map((c) => {
    const activeSession = (c.exam_sessions ?? []).find(
      (s: { status: string }) => s.status === 'ACTIVE'
    ) ?? null
    return {
      id: c.id,
      school_id: c.school_id,
      name: c.name,
      access_code: c.access_code,
      code_valid_until: c.code_valid_until,
      created_at: c.created_at,
      updated_at: c.updated_at,
      camera_count: (c.cameras ?? []).length,
      cameras: c.cameras ?? [],
      active_session: activeSession,
    }
  })

  return NextResponse.json({ classrooms: formatted }, { status: 200 })
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
  const nameResult = requireString(b.name, 'name')
  if (!nameResult.ok) {
    return NextResponse.json(errorResponse(nameResult.error), { status: 400 })
  }

  // Optional custom access code or auto-generated 8-character code
  let accessCode = typeof b.access_code === 'string' && b.access_code.trim() !== ''
    ? b.access_code.trim().toUpperCase()
    : generateHallAccessCode()

  const codeValidUntil = typeof b.code_valid_until === 'string' && b.code_valid_until.trim() !== ''
    ? b.code_valid_until.trim()
    : null

  const supabase = await createClient()

  const { data: classroom, error } = await supabase
    .from('classrooms')
    .insert({
      school_id: auth.school.id,
      name: nameResult.value,
      access_code: accessCode,
      code_valid_until: codeValidUntil,
    })
    .select('*')
    .single()

  if (error) {
    // If collision on generated access code, retry once
    if (error.code === '23505' && !b.access_code) {
      accessCode = generateHallAccessCode(10)
      const { data: retryData, error: retryErr } = await supabase
        .from('classrooms')
        .insert({
          school_id: auth.school.id,
          name: nameResult.value,
          access_code: accessCode,
          code_valid_until: codeValidUntil,
        })
        .select('*')
        .single()

      if (retryErr) {
        return NextResponse.json(errorResponse('Failed to create classroom.', retryErr.message), { status: 500 })
      }
      return NextResponse.json({ classroom: retryData }, { status: 201 })
    }

    return NextResponse.json(errorResponse('Failed to create classroom.', error.message), { status: 500 })
  }

  return NextResponse.json({ classroom }, { status: 201 })
}
