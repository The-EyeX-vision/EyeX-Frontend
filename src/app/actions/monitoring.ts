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

// ── Send Hierarchy Escalation Email ───────────────────────────

/** Supabase Storage bucket prefix — only URLs from this origin are embedded as evidence. */
const ALLOWED_EVIDENCE_ORIGIN = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

/** Strip CR/LF from any value that will be placed into an email header. */
function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

/** Return only evidence URLs that start with the trusted Supabase Storage origin. */
function filterEvidenceUrls(urls: string[]): string[] {
  if (!ALLOWED_EVIDENCE_ORIGIN) return []
  return urls.filter((u) => {
    try {
      return u.startsWith(ALLOWED_EVIDENCE_ORIGIN)
    } catch {
      return false
    }
  })
}

export interface EscalationPayload {
  to: string
  subject?: string
  schoolName: string
  schoolEmail?: string
  schoolCode?: string
  schoolId?: string          // used for ownership verification
  candidateName: string
  candidateNumber?: string
  activityType: string
  confidence?: number
  severity?: string
  timestamp?: string
  remarks?: string
  evidenceUrls?: string[]
}

export async function sendHierarchyEscalationEmail(payload: EscalationPayload): Promise<{
  success: boolean
  delivered: boolean
  messageId?: string
  error?: string
}> {
  try {
    // ── 1. Auth + school-ownership check ─────────────────────────
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, delivered: false, error: 'Unauthorised: you must be signed in to escalate an incident.' }
    }

    if (payload.schoolId) {
      const { data: schoolRecord } = await supabase
        .from('schools')
        .select('id')
        .eq('id', payload.schoolId)
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (!schoolRecord) {
        return { success: false, delivered: false, error: 'Forbidden: you do not have permission to escalate on behalf of this school.' }
      }
    }

    const {
      to,
      subject,
      schoolName,
      schoolEmail,
      schoolCode,
      candidateName,
      candidateNumber,
      activityType,
      confidence = 0.9,
      severity = 'HIGH',
      timestamp,
      remarks,
      evidenceUrls = [],
    } = payload

    if (!to || !to.trim()) {
      return { success: false, delivered: false, error: 'Recipient authority email is required.' }
    }

    // ── 2. Sanitise all header values (prevent header injection) ──
    const safeSubject = sanitizeHeader(
      subject || `[URGENT] Irregularity Incident Flag - ${schoolName || 'Center'} - ${candidateName || 'Candidate'}`
    )
    const safeTo = sanitizeHeader(to)

    // ── 4. Validate evidence URLs against trusted storage origin ──
    const safeEvidenceUrls = filterEvidenceUrls(evidenceUrls)

    const nodemailer = (await import('nodemailer')).default

    const host = process.env.SMTP_HOST || 'smtp.gmail.com'
    const port = parseInt(process.env.SMTP_PORT || '587', 10)
    const user_smtp = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS

    // ── 2. DMARC-safe from: header ────────────────────────────────
    // "From" uses the SMTP account only — the school appears in Reply-To.
    // Using the school name in From with a different smtp domain would fail DMARC.
    const senderDisplay = `"EyeX Platform" <${user_smtp || 'surveillance@eyex.cm'}>`

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8f9ff; margin: 0; padding: 24px; color: #0b1c30; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #c4c5d7; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #ba1a1a; color: #ffffff; padding: 20px 24px; }
    .header h1 { margin: 0; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .header p { margin: 4px 0 0 0; font-size: 12px; opacity: 0.9; }
    .body { padding: 24px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 11px; text-transform: uppercase; background: #fef2f2; color: #ba1a1a; border: 1px solid #fecaca; }
    .info-table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 20px; font-size: 13px; }
    .info-table td { padding: 8px 12px; border-bottom: 1px solid #eff4ff; }
    .info-table td.label { color: #747686; font-weight: 600; width: 38%; }
    .info-table td.value { color: #0b1c30; font-weight: 600; }
    .remarks-box { background: #eff4ff; border-left: 4px solid #0037b0; padding: 12px 16px; border-radius: 4px; font-size: 13px; margin-top: 12px; font-style: italic; color: #1c274c; }
    .footer { background: #f8f9ff; border-top: 1px solid #e5eeff; padding: 16px 24px; font-size: 11px; color: #747686; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>OFFICIAL EXAMINATION IRREGULARITY DOCKET</h1>
      <p>Autonomous AI Behavioral Verification &amp; Invigilator Flag</p>
    </div>
    <div class="body">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span class="badge">${activityType ? activityType.replace(/_/g, ' ') : 'SUSPICIOUS_BEHAVIOR'}</span>
        <span style="font-size: 12px; color: #747686;">Severity: <strong>${severity}</strong> (${Math.round(Number(confidence) * 100)}% Confidence)</span>
      </div>

      <table class="info-table">
        <tr>
          <td class="label">Originating Center:</td>
          <td class="value">${schoolName || 'Authorized Examination Center'} (${schoolCode || 'SCH'})</td>
        </tr>
        <tr>
          <td class="label">Center Registry Email:</td>
          <td class="value">${schoolEmail || 'center-records@eyex.cm'}</td>
        </tr>
        <tr>
          <td class="label">Candidate Name:</td>
          <td class="value">${candidateName || 'Unassigned / Tracked Desk'}</td>
        </tr>
        <tr>
          <td class="label">Candidate / Desk ID:</td>
          <td class="value" style="font-family: monospace; color: #0037b0;">${candidateNumber || 'N/A'}</td>
        </tr>
        <tr>
          <td class="label">Time of Incident:</td>
          <td class="value">${timestamp ? new Date(timestamp).toUTCString() : new Date().toUTCString()}</td>
        </tr>
      </table>

      ${remarks ? `
        <div style="margin-top: 16px;">
          <strong style="font-size: 12px; color: #0b1c30; text-transform: uppercase;">Chief Examiner Remarks:</strong>
          <div class="remarks-box">"${remarks}"</div>
        </div>
      ` : ''}

      ${safeEvidenceUrls.length > 0 ? `
        <div style="margin-top: 20px;">
          <strong style="font-size: 12px; color: #0b1c30; text-transform: uppercase;">Attached Evidence Captures:</strong>
          <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
            ${safeEvidenceUrls.map((url: string, i: number) => `<img src="${url}" style="width: 140px; height: 90px; object-fit: cover; border-radius: 6px; border: 1px solid #c4c5d7;" alt="Evidence ${i + 1}" />`).join('')}
          </div>
        </div>
      ` : ''}
    </div>
    <div class="footer">
      Sent via EyeX Surveillance &amp; AI Examination Proctorship Platform.<br/>
      Certified dispatch from ${schoolName || 'Examination Center'} to GCE Board / Regional Inspectorate.
    </div>
  </div>
</body>
</html>
`

    let delivered = false
    let messageId = `EYEX-DISPATCH-${Date.now()}`

    if (user_smtp && pass) {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user: user_smtp, pass },
      })

      const info = await transporter.sendMail({
        from: senderDisplay,
        to: safeTo,
        replyTo: schoolEmail || user_smtp,
        subject: safeSubject,
        html: htmlBody,
      })

      delivered = true
      messageId = info.messageId
    } else {
      // ── 3. Production-safe fallback ───────────────────────────────
      // In production, missing SMTP credentials is a hard failure — we must
      // NOT show a success screen when no email was dispatched.
      if (process.env.NODE_ENV === 'production') {
        return {
          success: false,
          delivered: false,
          error: 'Email service is not configured. Contact your system administrator to set SMTP credentials.',
        }
      }

      // Dev/staging: log to console so developers can inspect the docket.
      console.log('---------------------------------------------------------')
      console.log('--- [EYEX SURVEILLANCE EMAIL DISPATCH — DEV AUDIT LOG] --')
      console.log('From:', senderDisplay)
      console.log('To:', safeTo)
      console.log('Reply-To:', schoolEmail)
      console.log('Subject:', safeSubject)
      console.log('Candidate:', candidateName, candidateNumber)
      console.log('Evidence URLs (safe):', safeEvidenceUrls)
      console.log('Status: Audit log only — set SMTP_USER & SMTP_PASS in .env.local to send live emails.')
      console.log('---------------------------------------------------------')
    }

    return {
      success: true,
      delivered,
      messageId,
    }
  } catch (err: unknown) {
    console.error('[sendHierarchyEscalationEmail error]:', err)
    return {
      success: false,
      delivered: false,
      error: err instanceof Error ? err.message : 'Failed to send email to hierarchy.',
    }
  }
}
