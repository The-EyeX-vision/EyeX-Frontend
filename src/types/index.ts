/**
 * Core domain types for EyeX — full application types.
 */

// ── School ────────────────────────────────────────────────────
export interface School {
  id: string
  auth_user_id: string
  school_name: string
  email: string
  code_prefix: string
  created_at: string
}

// ── Exam ─────────────────────────────────────────────────────
export type ExamStatus = 'scheduled' | 'active' | 'completed' | 'archived'

export interface Exam {
  id: string
  school_id: string
  title: string
  description?: string | null
  exam_date: string
  start_time: string
  duration_minutes: number
  room_number: string
  status: ExamStatus
  created_at: string
  updated_at: string
}

// ── Student ───────────────────────────────────────────────────
export interface Student {
  id: string
  school_id: string
  student_number: string
  full_name: string
  email?: string | null
  created_at: string
}

// ── ExamStudent ───────────────────────────────────────────────
export interface ExamStudent {
  id: string
  exam_id: string
  student_id: string
  seat_number?: string | null
  created_at: string
  student?: Student
}

// ── Monitoring Session ────────────────────────────────────────
export type MonitoringStatus = 'scheduled' | 'active' | 'completed' | 'cancelled'

export interface MonitoringSession {
  id: string
  exam_id: string
  school_id: string
  status: MonitoringStatus
  started_at: string
  ended_at?: string | null
  created_at: string
  exam?: Exam
}

// ── Alert ─────────────────────────────────────────────────────
export type AlertEventType =
  | 'PHONE_DETECTED'
  | 'SUSPICIOUS_MOVEMENT'
  | 'POSSIBLE_COMMUNICATION'
  | 'UNAUTHORIZED_MATERIAL'
  | 'OTHER'

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type AlertStatusType = 'FLAGGED' | 'REVIEWED' | 'DISMISSED' | 'CONFIRMED'

export interface Alert {
  id: string
  monitoring_session_id: string
  student_id?: string | null
  event_type: AlertEventType
  confidence: number
  severity: AlertSeverity
  status: AlertStatusType
  metadata?: Record<string, unknown>
  created_at: string
  student?: Student
}

// ── Legacy types (for existing classroom_alerts table) ────────
export type SessionStatus = 'scheduled' | 'active' | 'completed' | 'archived'

export interface ExamSession {
  id: string
  school_id: string
  invigilator_id?: string | null
  title: string
  room_number: string
  status: SessionStatus
  started_at?: string | null
  ended_at?: string | null
  exam_id?: string | null
  created_at: string
}

export interface ClassroomAlert {
  id: string
  session_id: string
  student_id_tracker: number
  timestamp_ms: number
  suspicion_score: number
  status: string
  created_at: string
}

// ── UI convenience types ──────────────────────────────────────
export type AlertStatus = 'FLAGGED_ALERT' | 'REVIEWED' | 'DISMISSED' | 'pending' | 'reviewed' | 'dismissed'

export interface LegacyAlert {
  id: string
  timestamp_ms: number
  student_id: string
  suspicion_score: number
  status: AlertStatus
  session_id?: string
}

export interface AnalyticsSummary {
  total: number
  pending: number
  reviewed: number
  dismissed: number
  avgSuspicionScore: number
}
