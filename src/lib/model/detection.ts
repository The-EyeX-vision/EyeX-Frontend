/**
 * src/lib/model/detection.ts
 *
 * Converts raw CV model detections into EyeX alert records.
 *
 * This is the translation layer between the model's output format
 * and the EyeX database schema.
 *
 * Adding new event types: add to MODEL_EVENT_TYPES and severityMap below.
 * No other files need to change.
 */

import type { AlertEventType, AlertSeverity } from '@/types'

/**
 * All event types the model may report.
 * This is the authoritative list — validated in the detection endpoint.
 * Add new types here as the model supports them.
 */
export const MODEL_EVENT_TYPES = [
  'PHONE_DETECTED',
  'UNAUTHORIZED_MATERIAL',
  'SUSPICIOUS_MOVEMENT',
  'POSSIBLE_COMMUNICATION',
  'LOOKING_AWAY',
  'MULTIPLE_PERSONS',
  'UNKNOWN',
] as const

export type ModelEventType = (typeof MODEL_EVENT_TYPES)[number]

/**
 * Map model event types → alert severity levels.
 * Severity determines how urgently the invigilator is notified.
 */
const severityMap: Record<ModelEventType, AlertSeverity> = {
  PHONE_DETECTED: 'HIGH',
  UNAUTHORIZED_MATERIAL: 'CRITICAL',
  SUSPICIOUS_MOVEMENT: 'MEDIUM',
  POSSIBLE_COMMUNICATION: 'HIGH',
  LOOKING_AWAY: 'LOW',
  MULTIPLE_PERSONS: 'HIGH',
  UNKNOWN: 'LOW',
}

/**
 * Map model event type → canonical AlertEventType stored in the DB.
 * Model types that don't map to a dedicated DB enum fall back to 'OTHER'.
 */
const eventTypeMap: Record<ModelEventType, AlertEventType> = {
  PHONE_DETECTED: 'PHONE_DETECTED',
  UNAUTHORIZED_MATERIAL: 'UNAUTHORIZED_MATERIAL',
  SUSPICIOUS_MOVEMENT: 'SUSPICIOUS_MOVEMENT',
  POSSIBLE_COMMUNICATION: 'POSSIBLE_COMMUNICATION',
  LOOKING_AWAY: 'OTHER',
  MULTIPLE_PERSONS: 'OTHER',
  UNKNOWN: 'OTHER',
}

export interface DetectionPayload {
  session_id: string
  tracker_id: number | string
  event_type: ModelEventType
  confidence: number
  timestamp: string
  /** Optional extra data from the model (bounding box, frame number, etc.) */
  metadata?: Record<string, unknown>
}

export interface AlertInsertPayload {
  monitoring_session_id: string
  tracker_id: string
  event_type: AlertEventType
  confidence: number
  severity: AlertSeverity
  status: 'FLAGGED'
  metadata: Record<string, unknown>
}

/**
 * Convert a raw model detection payload into an EyeX alert DB row.
 */
export function detectionToAlert(detection: DetectionPayload): AlertInsertPayload {
  const eventType = eventTypeMap[detection.event_type]
  const severity = severityMap[detection.event_type]

  return {
    monitoring_session_id: detection.session_id,
    // Normalise tracker_id to "Tracker 17" format for display consistency
    tracker_id: `Tracker ${detection.tracker_id}`,
    event_type: eventType,
    confidence: detection.confidence,
    severity,
    status: 'FLAGGED',
    metadata: {
      raw_event_type: detection.event_type,
      model_timestamp: detection.timestamp,
      ...(detection.metadata ?? {}),
    },
  }
}
