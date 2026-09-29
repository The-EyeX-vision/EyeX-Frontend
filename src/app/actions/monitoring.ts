'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AlertEventType, AlertSeverity, AlertStatusType } from '@/types'

export type MonitoringResult = { error: string } | { success: true; sessionId: string }
export type AlertResult = { error: string } | { success: true; alertId: string }

async function getSchoolId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  return school?.id ?? null
}

// ── Start Monitoring Session ───────────────────────────────────
export async function startMonitoringSession(
  examId: string
): Promise<MonitoringResult> {
  try {
    const supabase = await createClient()
    const schoolId = await getSchoolId()
    if (!schoolId) return { error: 'Not authenticated.' }

    // Verify exam belongs to school
    const { data: exam } = await supabase
      .from('exams')
      .select('id, title, room_number, status')
      .eq('id', examId)
      .eq('school_id', schoolId)
      .maybeSingle()

    if (!exam) return { error: 'Exam not found.' }
    if (exam.status === 'archived') return { error: 'Cannot monitor an archived exam.' }

    // Check for existing active session
    const { data: existing } = await supabase
      .from('monitoring_sessions')
      .select('id')
      .eq('exam_id', examId)
      .eq('status', 'active')
      .maybeSingle()

    if (existing) {
      // Return existing active session
      revalidatePath(`/exams/${examId}`)
      redirect(`/monitoring/${existing.id}`)
    }

    // Create new monitoring session
    const { data: session, error } = await supabase
      .from('monitoring_sessions')
      .insert({
        exam_id: examId,
        school_id: schoolId,
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) return { error: error.message }
    if (!session) return { error: 'Failed to create monitoring session.' }

    // Update exam status to active
    await supabase
      .from('exams')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', examId)
      .eq('school_id', schoolId)

    revalidatePath(`/exams/${examId}`)
    revalidatePath('/monitoring')
    redirect(`/monitoring/${session.id}`)
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === 'NEXT_REDIRECT' || ('digest' in err && String((err as { digest?: unknown }).digest).includes('NEXT_REDIRECT')))) throw err
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' }
  }
}

// ── End Monitoring Session ────────────────────────────────────
export async function endMonitoringSession(
  sessionId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    const schoolId = await getSchoolId()
    if (!schoolId) return { error: 'Not authenticated.' }

    const { data: session } = await supabase
      .from('monitoring_sessions')
      .select('id, exam_id')
      .eq('id', sessionId)
      .eq('school_id', schoolId)
      .maybeSingle()

    if (!session) return { error: 'Session not found.' }

    const { error } = await supabase
      .from('monitoring_sessions')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('school_id', schoolId)

    if (error) return { error: error.message }

    // Update exam status to completed
    await supabase
      .from('exams')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', session.exam_id)
      .eq('school_id', schoolId)

    revalidatePath(`/monitoring/${sessionId}`)
    revalidatePath('/monitoring')
    revalidatePath('/dashboard')
    return { error: null }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' }
  }
}

// ── Create Alert (Detection Event Interface) ───────────────────
// This is the core interface that the CV model will call in the future.
// Currently used by the simulated detection system.
export async function createAlert({
  sessionId,
  studentId,
  eventType,
  confidence,
  severity,
  metadata,
}: {
  sessionId: string
  studentId?: string | null
  eventType: AlertEventType
  confidence: number
  severity: AlertSeverity
  metadata?: Record<string, unknown>
}): Promise<AlertResult> {
  try {
    const supabase = await createClient()
    const schoolId = await getSchoolId()
    if (!schoolId) return { error: 'Not authenticated.' }

    // Verify session belongs to school
    const { data: session } = await supabase
      .from('monitoring_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('school_id', schoolId)
      .maybeSingle()

    if (!session) return { error: 'Monitoring session not found.' }

    // Validate confidence range
    const clampedConfidence = Math.min(1, Math.max(0, confidence))

    const { data: alert, error } = await supabase
      .from('alerts')
      .insert({
        monitoring_session_id: sessionId,
        student_id: studentId ?? null,
        event_type: eventType,
        confidence: clampedConfidence,
        severity,
        status: 'FLAGGED',
        metadata: metadata ?? {},
      })
      .select('id')
      .single()

    if (error) return { error: error.message }
    if (!alert) return { error: 'Failed to create alert.' }

    revalidatePath(`/monitoring/${sessionId}`)
    revalidatePath('/alerts')
    revalidatePath('/dashboard')
    return { success: true, alertId: alert.id }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' }
  }
}

// ── Update Alert Status ───────────────────────────────────────
export async function updateAlertStatus(
  alertId: string,
  status: AlertStatusType
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    const schoolId = await getSchoolId()
    if (!schoolId) return { error: 'Not authenticated.' }

    // Verify alert belongs to school via session
    const { data: alert } = await supabase
      .from('alerts')
      .select('id, monitoring_session_id')
      .eq('id', alertId)
      .maybeSingle()

    if (!alert) return { error: 'Alert not found.' }

    const { data: session } = await supabase
      .from('monitoring_sessions')
      .select('id')
      .eq('id', alert.monitoring_session_id)
      .eq('school_id', schoolId)
      .maybeSingle()

    if (!session) return { error: 'Access denied.' }

    const { error } = await supabase
      .from('alerts')
      .update({ status })
      .eq('id', alertId)

    if (error) return { error: error.message }

    revalidatePath('/alerts')
    revalidatePath('/dashboard')
    return { error: null }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' }
  }
}

// ── Create Simulated Alert (DEV ONLY) ─────────────────────────
// This action wraps createAlert for development simulation.
// In production, this route should be disabled.
export async function createSimulatedAlert(
  sessionId: string,
  eventType: AlertEventType,
  studentId?: string | null
): Promise<AlertResult> {
  if (process.env.NODE_ENV === 'production') {
    return { error: 'Simulation not available in production.' }
  }

  const severityMap: Record<AlertEventType, AlertSeverity> = {
    PHONE_DETECTED: 'HIGH',
    SUSPICIOUS_MOVEMENT: 'MEDIUM',
    POSSIBLE_COMMUNICATION: 'HIGH',
    UNAUTHORIZED_MATERIAL: 'CRITICAL',
    OTHER: 'LOW',
  }

  const confidence = Math.round((0.6 + Math.random() * 0.39) * 100) / 100

  return createAlert({
    sessionId,
    studentId: studentId ?? null,
    eventType,
    confidence,
    severity: severityMap[eventType],
    metadata: { simulated: true, source: 'dev_panel' },
  })
}
