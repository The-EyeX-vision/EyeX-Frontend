/**
 * GET   /api/alerts/[id]   — get one alert
 * PATCH /api/alerts/[id]   — update alert status
 *
 * PATCH only allows updating `status`.
 * Allowed status values: FLAGGED | REVIEWED | DISMISSED | CONFIRMED
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticateUser } from '@/lib/auth/api'
import { requireEnum, errorResponse } from '@/lib/validation'
import type { AlertStatusType } from '@/types'

const ALLOWED_STATUSES: AlertStatusType[] = ['FLAGGED', 'REVIEWED', 'DISMISSED', 'CONFIRMED']

type Params = { params: Promise<{ id: string }> }

/** Verify an alert belongs to the authenticated school (via monitoring_session ownership) */
async function verifyAlertOwnership(alertId: string, schoolId: string) {
  const supabase = await createClient()

  const { data: alert } = await supabase
    .from('alerts')
    .select('id, monitoring_session_id')
    .eq('id', alertId)
    .maybeSingle()

  if (!alert) return { ok: false as const, reason: 'not_found' as const }

  const { data: session } = await supabase
    .from('monitoring_sessions')
    .select('id')
    .eq('id', alert.monitoring_session_id)
    .eq('school_id', schoolId)
    .maybeSingle()

  if (!session) return { ok: false as const, reason: 'forbidden' as const }

  return { ok: true as const, alert }
}

// ── GET /api/alerts/[id] ───────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const auth = await authenticateUser()
  if (!auth.ok) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status })
  }

  const ownership = await verifyAlertOwnership(id, auth.school.id)
  if (!ownership.ok) {
    if (ownership.reason === 'not_found') {
      return NextResponse.json(errorResponse('Alert not found.'), { status: 404 })
    }
    return NextResponse.json(errorResponse('Access denied.'), { status: 403 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json(errorResponse('Failed to fetch alert.'), { status: 500 })
  }

  return NextResponse.json({ alert: data }, { status: 200 })
}

// ── PATCH /api/alerts/[id] ─────────────────────────────────────
export async function PATCH(request: NextRequest, { params }: Params) {
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
  const statusResult = requireEnum<AlertStatusType>(b.status, 'status', ALLOWED_STATUSES)
  if (!statusResult.ok) {
    return NextResponse.json(errorResponse(statusResult.error), { status: 400 })
  }

  const ownership = await verifyAlertOwnership(id, auth.school.id)
  if (!ownership.ok) {
    if (ownership.reason === 'not_found') {
      return NextResponse.json(errorResponse('Alert not found.'), { status: 404 })
    }
    return NextResponse.json(errorResponse('Access denied.'), { status: 403 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('alerts')
    .update({ status: statusResult.value })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json(errorResponse('Failed to update alert.', error.message), { status: 500 })
  }

  return NextResponse.json({ alert: data }, { status: 200 })
}
