/**
 * GET /api/alerts          — list alerts (filterable by session_id)
 *
 * Replaces/extends the original legacy route which queried classroom_alerts.
 * This version queries the modern `alerts` table using tracker_id.
 *
 * Query params:
 *   session_id   — filter by monitoring_session_id (recommended)
 *   status       — filter by alert status
 *   limit        — max results (default 50, max 200)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticateUser } from '@/lib/auth/api'
import { errorResponse } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const auth = await authenticateUser()
  if (!auth.ok) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')
  const status = searchParams.get('status')
  const rawLimit = parseInt(searchParams.get('limit') ?? '50', 10)
  const limit = Math.min(Math.max(isNaN(rawLimit) ? 50 : rawLimit, 1), 200)

  const supabase = await createClient()

  // Always scope to sessions that belong to this school
  if (sessionId) {
    // Verify session belongs to school before returning its alerts
    const { data: session } = await supabase
      .from('monitoring_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('school_id', auth.school.id)
      .maybeSingle()

    if (!session) {
      return NextResponse.json(
        errorResponse('Session not found or does not belong to your school.'),
        { status: 404 }
      )
    }
  }

  // Get all school session IDs to scope alerts if no specific session provided
  let sessionIds: string[] = sessionId ? [sessionId] : []

  if (!sessionId) {
    const { data: sessions } = await supabase
      .from('monitoring_sessions')
      .select('id')
      .eq('school_id', auth.school.id)

    sessionIds = (sessions ?? []).map((s) => s.id)
    if (sessionIds.length === 0) {
      return NextResponse.json({ alerts: [], total: 0 }, { status: 200 })
    }
  }

  let query = supabase
    .from('alerts')
    .select('*', { count: 'exact' })
    .in('monitoring_session_id', sessionIds)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json(errorResponse('Failed to fetch alerts.', error.message), { status: 500 })
  }

  return NextResponse.json({ alerts: data ?? [], total: count ?? 0 }, { status: 200 })
}
