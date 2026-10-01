/**
 * GET   /api/school  — get current school information
 * PATCH /api/school  — update current school information
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth/api'
import { createClient } from '@/lib/supabase/server'
import { requireString, errorResponse, parseJsonBody } from '@/lib/validation'

export async function GET() {
  const auth = await authenticateUser()
  if (!auth.ok) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status })
  }

  const supabase = await createClient()
  const { data: school, error } = await supabase
    .from('schools')
    .select('*')
    .eq('id', auth.school.id)
    .single()

  if (error || !school) {
    return NextResponse.json(errorResponse('Failed to fetch school details.', error?.message), { status: 500 })
  }

  return NextResponse.json({ school }, { status: 200 })
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateUser()
  if (!auth.ok) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status })
  }

  const parsed = await parseJsonBody<Record<string, unknown>>(request)
  if (!parsed.ok) {
    return NextResponse.json(errorResponse(parsed.error, parsed.details), { status: 400 })
  }

  const b = parsed.data
  const updates: Record<string, unknown> = {}

  if (b.school_name !== undefined) {
    const r = requireString(b.school_name, 'school_name')
    if (!r.ok) return NextResponse.json(errorResponse(r.error), { status: 400 })
    updates.school_name = r.value
  }

  if (b.email !== undefined) {
    const r = requireString(b.email, 'email')
    if (!r.ok) return NextResponse.json(errorResponse(r.error), { status: 400 })
    updates.email = r.value
  }

  const supabase = await createClient()
  const { data: updatedSchool, error } = await supabase
    .from('schools')
    .update(updates)
    .eq('id', auth.school.id)
    .select('*')
    .single()

  if (error || !updatedSchool) {
    return NextResponse.json(errorResponse('Failed to update school.', error?.message), { status: 500 })
  }

  return NextResponse.json({ school: updatedSchool }, { status: 200 })
}
