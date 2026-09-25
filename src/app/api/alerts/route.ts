import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * GET /api/alerts
 * Returns the recent classroom alerts from public.classroom_alerts.
 * Scoped by session_id and school via Supabase RLS.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const rawLimit = parseInt(searchParams.get('limit') ?? '50', 10)
  const limit = Math.min(Math.max(rawLimit, 1), 100)
  const status = searchParams.get('status')

  const supabase = await createClient()

  let query = supabase
    .from('classroom_alerts')
    .select('id, session_id, student_id_tracker, timestamp_ms, suspicion_score, status, created_at')
    .order('timestamp_ms', { ascending: false })
    .limit(limit)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const formatted = (data ?? []).map((row) => ({
    id: row.id,
    session_id: row.session_id,
    student_id: `#${row.student_id_tracker}`,
    timestamp_ms: Number(row.timestamp_ms),
    suspicion_score: Number(row.suspicion_score),
    status: row.status,
    created_at: row.created_at,
  }))

  return NextResponse.json(formatted, { status: 200 })
}
