import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * POST /api/violations
 * Ingests a real-time violation detected by computer vision model or simulation console.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sessionId,
      trackerLabel = 'Tracker #1',
      trackerId,
      activityType = 'PHONE_DETECTED',
      severity = 'MEDIUM',
      confidence = 0.88,
      thresholdScore = 0.75,
      evidenceUrl,
      metadata = {},
    } = body

    const safeMetadata = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? metadata as Record<string, unknown>
      : {}

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const supabase = await createClient()
    const db = admin || supabase

    const { data: session, error: sessionError } = await db
      .from('exam_hall_sessions')
      .select('id, demo_mode')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Examination session not found.' }, { status: 404 })
    }

    const demoMode = session.demo_mode === true
    if (safeMetadata.simulated === true && !demoMode) {
      return NextResponse.json({ error: 'Simulated alerts are only allowed in demo sessions.' }, { status: 409 })
    }

    const clampedConfidence = Math.min(1, Math.max(0, Number(confidence) || 0))
    const clampedThreshold = Math.min(1, Math.max(0, Number(thresholdScore) || 0.75))

    const { data: violation, error } = await db
      .from('violations')
      .insert({
        session_id: sessionId,
        tracker_label: trackerLabel,
        tracker_id: trackerId ? Number(trackerId) : null,
        activity_type: activityType,
        severity,
        status: 'FLAGGED',
        confidence: clampedConfidence,
        threshold_score: clampedThreshold,
        demo_mode: demoMode,
        evidence_url: evidenceUrl || null,
        metadata: { ...safeMetadata, demo_mode: demoMode },
      })
      .select()
      .single()

    if (error) {
      // Fallback to legacy alerts table if needed
      const { data: legacyAlert, error: legErr } = await db
        .from('alerts')
        .insert({
          monitoring_session_id: sessionId,
          event_type: activityType,
          severity,
          status: 'FLAGGED',
          confidence: clampedConfidence,
          metadata: { ...safeMetadata, tracker_label: trackerLabel, evidence_url: evidenceUrl, demo_mode: demoMode },
        })
        .select()
        .single()

      if (legErr) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, violation: legacyAlert }, { status: 201 })
    }

    return NextResponse.json({ success: true, violation }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error recording violation.' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/violations
 * List violations with optional filtering.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '50', 10), 1), 100)

    const admin = createAdminClient()
    const supabase = await createClient()
    const db = admin || supabase

    let query = db
      .from('violations')
      .select('*, session:exam_hall_sessions(id, course_name, classroom:classrooms(name))')
      .order('created_at', { ascending: false })
      .limit(limit)

    const demoMode = searchParams.get('demoMode')
    if (demoMode === 'true' || demoMode === 'false') {
      query = query.eq('demo_mode', demoMode === 'true')
    }

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    const { data, error } = await query

    if (error) {
      // Fallback to legacy alerts
      const { data: legacy } = await db
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      return NextResponse.json(legacy ?? [], { status: 200 })
    }

    return NextResponse.json(data ?? [], { status: 200 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to query violations' }, { status: 500 })
  }
}
