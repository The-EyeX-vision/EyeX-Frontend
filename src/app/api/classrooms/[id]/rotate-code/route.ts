/**
 * POST /api/classrooms/[id]/rotate-code
 * Generates a new hall access code for the classroom.
 * The access code belongs to the hall, not individual exam sessions.
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth/api'
import { createClient } from '@/lib/supabase/server'
import { generateHallAccessCode, errorResponse } from '@/lib/validation'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await authenticateUser()
  if (!auth.ok) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status })
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    // Body is optional
  }

  const newCode = typeof body.access_code === 'string' && body.access_code.trim() !== ''
    ? body.access_code.trim().toUpperCase()
    : generateHallAccessCode()

  const validUntil = typeof body.code_valid_until === 'string' && body.code_valid_until.trim() !== ''
    ? body.code_valid_until.trim()
    : null

  const supabase = await createClient()

  // Verify classroom belongs to authenticated school
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('id, name')
    .eq('id', id)
    .eq('school_id', auth.school.id)
    .maybeSingle()

  if (!classroom) {
    return NextResponse.json(errorResponse('Classroom not found.'), { status: 404 })
  }

  const { data: updated, error } = await supabase
    .from('classrooms')
    .update({
      access_code: newCode,
      code_valid_until: validUntil,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('school_id', auth.school.id)
    .select('*')
    .single()

  if (error || !updated) {
    return NextResponse.json(errorResponse('Failed to rotate access code.', error?.message), { status: 500 })
  }

  return NextResponse.json(
    {
      message: 'Hall access code rotated successfully.',
      classroom: updated,
    },
    { status: 200 }
  )
}
