/**
 * GET  /api/classrooms/[id]/cameras — list cameras in a classroom
 * POST /api/classrooms/[id]/cameras — add a camera to a classroom
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

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await authenticateUser()
  if (!auth.ok) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status })
  }

  const supabase = await createClient()

  // Verify classroom belongs to school
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('id, name')
    .eq('id', id)
    .eq('school_id', auth.school.id)
    .maybeSingle()

  if (!classroom) {
    return NextResponse.json(errorResponse('Classroom not found.'), { status: 404 })
  }

  const { data: cameras, error } = await supabase
    .from('cameras')
    .select('*')
    .eq('classroom_id', id)
    .order('camera_number', { ascending: true })

  if (error) {
    return NextResponse.json(errorResponse('Failed to fetch cameras.', error.message), { status: 500 })
  }

  return NextResponse.json({ cameras: cameras ?? [] }, { status: 200 })
}

export async function POST(request: NextRequest, { params }: Params) {
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
  const nameResult = requireString(b.name, 'name')
  if (!nameResult.ok) return NextResponse.json(errorResponse(nameResult.error), { status: 400 })

  const cameraNumberResult = requirePositiveInt(b.camera_number, 'camera_number')
  if (!cameraNumberResult.ok) return NextResponse.json(errorResponse(cameraNumberResult.error), { status: 400 })

  let cameraStatus: CameraStatus = 'ACTIVE'
  if (b.status) {
    const statusResult = requireEnum<CameraStatus>(b.status, 'status', ['ACTIVE', 'INACTIVE', 'OFFLINE'])
    if (!statusResult.ok) return NextResponse.json(errorResponse(statusResult.error), { status: 400 })
    cameraStatus = statusResult.value
  }

  const supabase = await createClient()

  // Verify classroom belongs to school
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('id')
    .eq('id', id)
    .eq('school_id', auth.school.id)
    .maybeSingle()

  if (!classroom) {
    return NextResponse.json(errorResponse('Classroom not found.'), { status: 404 })
  }

  const { data: camera, error } = await supabase
    .from('cameras')
    .insert({
      classroom_id: id,
      name: nameResult.value,
      camera_number: cameraNumberResult.value,
      status: cameraStatus,
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        errorResponse(`Camera number ${cameraNumberResult.value} already exists in this hall.`),
        { status: 409 }
      )
    }
    return NextResponse.json(errorResponse('Failed to create camera.', error.message), { status: 500 })
  }

  return NextResponse.json({ camera }, { status: 201 })
}
