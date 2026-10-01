import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * POST /api/sessions/[id]/start
 * Starts a scheduled exam session, setting status to ACTIVE and started_at to now.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const admin = createAdminClient()
    const supabase = await createClient()
    const db = admin || supabase

    const now = new Date().toISOString()

    const { data: session, error } = await db
      .from('exam_hall_sessions')
      .update({
        status: 'ACTIVE',
        started_at: now,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, session }, { status: 200 })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start session.' },
      { status: 500 }
    )
  }
}
