/**
 * Core domain types for EyeX — Final Backend Architecture
 */

// ── School ────────────────────────────────────────────────────
export interface School {
  id: string
  auth_user_id: string
  school_name: string
  email: string
  created_at: string
  updated_at?: string
}

// ── Classroom (Examination Hall) ──────────────────────────────
export interface Classroom {
  id: string
  school_id: string
  name: string
  access_code: string
  code_valid_until?: string | null
  created_at: string
  updated_at: string
}

// ── Camera ───────────────────────────────────────────────────
export type CameraStatus = 'ACTIVE' | 'INACTIVE' | 'OFFLINE'

export interface Camera {
  id: string
  classroom_id: string
  name: string
  camera_number: number
  status: CameraStatus
  created_at: string
  updated_at: string
}

// ── Exam Session ─────────────────────────────────────────────
export type SessionStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'

export interface ExamSession {
  id: string
  classroom_id: string
  course_name: string
  course_code: string
  duration_minutes: number
  student_count: number
  status: SessionStatus
  started_at?: string | null
  ended_at?: string | null
  created_at: string
  updated_at: string
  classroom?: Classroom
}

// ── Session Student (Temporary Tracker Identity) ──────────────
export interface SessionStudent {
  id: string
  session_id: string
  tracker_label: string
  first_seen_at: string
  last_seen_at: string
  created_at: string
  updated_at: string
  violations?: StudentViolation[]
}

// ── Student Violation ─────────────────────────────────────────
export type ViolationActivityType =
  | 'PHONE_DETECTED'
  | 'UNAUTHORIZED_MATERIAL'
  | 'SUSPICIOUS_MOVEMENT'
  | 'POSSIBLE_COMMUNICATION'
  | 'LOOKING_AWAY'
  | 'MULTIPLE_PERSONS'
  | 'UNKNOWN'

export interface StudentViolation {
  id: string
  session_student_id: string
  activity_type: ViolationActivityType
  description?: string | null
  count: number
  image_path?: string | null
  first_detected_at: string
  last_detected_at: string
  created_at: string
  updated_at: string
  session_student?: SessionStudent
}

// ── CV Model Ingestion Types ──────────────────────────────────
export interface ModelDetectionRequest {
  session_id: string
  camera_id: string
  tracker_label: string | number
  activity_type: ViolationActivityType
  description?: string
  confidence?: number
  timestamp?: string
  image?: string // Base64 or image data string
}

// ── Hall Access Verification Types ────────────────────────────
export interface HallAccessVerificationRequest {
  access_code: string
}

export interface HallAccessVerificationResponse {
  valid: boolean
  classroom: {
    id: string
    name: string
    access_code: string
    code_valid_until?: string | null
  }
  active_session?: ExamSession | null
  scheduled_sessions?: ExamSession[]
}

// ── Legacy Compatibility Types (if referenced elsewhere) ──────
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
  expected_students: number
  status: ExamStatus
  created_at: string
  updated_at: string
}

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
  tracker_id?: string | null
  event_type: AlertEventType
  confidence: number
  severity: AlertSeverity
  status: AlertStatusType
  metadata?: Record<string, unknown>
  created_at: string
}

// ── Legacy UI Convenience Types ──────────────────────────────
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

