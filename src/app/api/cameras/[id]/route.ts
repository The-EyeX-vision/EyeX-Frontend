/**
 * PATCH  /api/cameras/[id] — update camera name, camera_number, status
 * DELETE /api/cameras/[id] — remove camera
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth/api'
import { createClient } from '@/lib/supabase/server'
import {
  requireString,
  requirePositiveInt,
  requireEnum,
  errorResponse,
} from '@/lib/validation'
import type { CameraStatus } from '@/types'

type Params = { params: Promise<{ id: string }> }

async function verifyCameraOwnership(cameraId: string, schoolId: string) {
  const supabase = await createClient()
  const { data: camera } = await supabase
    .from('cameras')
    .select(`
      id,
      classroom_id,
      classrooms!inner (
        id,
        school_id
      )
    `)
    .eq('id', cameraId)
    .maybeSingle()

  if (!camera) return { ok: false as const, reason: 'not_found' as const }
  const classroom = camera.classrooms as unknown as { school_id: string } | null
  if (classroom?.school_id !== schoolId) return { ok: false as const, reason: 'forbidden' as const }

  return { ok: true as const, camera }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await authenticateUser()
  if (!auth.ok) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status })
  }

  const check = await verifyCameraOwnership(id, auth.school.id)
  if (!check.ok) {
    return NextResponse.json(
      errorResponse(check.reason === 'not_found' ? 'Camera not found.' : 'Access denied.'),
      { status: check.reason === 'not_found' ? 404 : 403 }
    )
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

  if (b.camera_number !== undefined) {
    const r = requirePositiveInt(b.camera_number, 'camera_number')
    if (!r.ok) return NextResponse.json(errorResponse(r.error), { status: 400 })
    updates.camera_number = r.value
  }

  if (b.status !== undefined) {
    const r = requireEnum<CameraStatus>(b.status, 'status', ['ACTIVE', 'INACTIVE', 'OFFLINE'])
    if (!r.ok) return NextResponse.json(errorResponse(r.error), { status: 400 })
    updates.status = r.value
  }

  const supabase = await createClient()
  const { data: updated, error } = await supabase
    .from('cameras')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !updated) {
    if (error?.code === '23505') {
      return NextResponse.json(errorResponse('Camera number conflict in this hall.'), { status: 409 })
    }
    return NextResponse.json(errorResponse('Failed to update camera.', error?.message), { status: 500 })
  }

  return NextResponse.json({ camera: updated }, { status: 200 })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await authenticateUser()
  if (!auth.ok) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status })
  }

  const check = await verifyCameraOwnership(id, auth.school.id)
  if (!check.ok) {
    return NextResponse.json(
      errorResponse(check.reason === 'not_found' ? 'Camera not found.' : 'Access denied.'),
      { status: check.reason === 'not_found' ? 404 : 403 }
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.from('cameras').delete().eq('id', id)

  if (error) {
    return NextResponse.json(errorResponse('Failed to delete camera.', error.message), { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Camera deleted.' }, { status: 200 })
}
