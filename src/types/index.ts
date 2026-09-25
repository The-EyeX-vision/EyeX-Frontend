/**
 * Core domain types for EyeX matching the official PostgreSQL schema.
 */

export interface School {
  id: string
  auth_user_id: string
  school_name: string
  email: string
  code_prefix: string
  created_at: string
}

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

// UI Alert representation for components
export type AlertStatus = 'FLAGGED_ALERT' | 'REVIEWED' | 'DISMISSED' | 'pending' | 'reviewed' | 'dismissed'

export interface Alert {
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
