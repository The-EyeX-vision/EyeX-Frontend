import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * POST /api/classrooms/[id]/cameras
 * Attaches a camera to a classroom/hall.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classroomId } = await params
    const body = await request.json()
    const { cameraNumber, name = '', status = 'ACTIVE' } = body

    const admin = createAdminClient()
    const supabase = await createClient()
    const db = admin || supabase

    // Verify classroom exists
    const { data: classroom } = await db
      .from('classrooms')
      .select('id')
      .eq('id', classroomId)
      .maybeSingle()

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found.' }, { status: 404 })
    }

    // Determine camera number if not provided
    let num = Number(cameraNumber)
    if (!num) {
      const { data: existing } = await db
        .from('cameras')
        .select('camera_number')
        .eq('classroom_id', classroomId)
        .order('camera_number', { ascending: false })
        .limit(1)

      num = (existing?.[0]?.camera_number ?? 0) + 1
    }

    const camName = name?.trim() || `Camera ${num}`

    const { data: camera, error } = await db
      .from('cameras')
      .upsert(
        {
          classroom_id: classroomId,
          camera_number: num,
          name: camName,
          status: status === 'OFFLINE' ? 'OFFLINE' : 'ACTIVE',
        },
        { onConflict: 'classroom_id, camera_number' }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, camera }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error registering camera.' },
      { status: 500 }
    )
  }
}
