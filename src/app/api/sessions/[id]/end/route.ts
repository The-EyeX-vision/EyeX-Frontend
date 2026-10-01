import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * POST /api/sessions/[id]/end
 * Concludes an active examination session, setting status to COMPLETED and ended_at to now.
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
        status: 'COMPLETED',
        ended_at: now,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      // Also attempt update on monitoring_sessions if legacy
      await db
        .from('monitoring_sessions')
        .update({ status: 'completed', ended_at: now })
        .eq('id', id)

      return NextResponse.json({ success: true, ended_at: now }, { status: 200 })
    }

    return NextResponse.json({ success: true, session }, { status: 200 })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to end session.' },
      { status: 500 }
    )
  }
}
