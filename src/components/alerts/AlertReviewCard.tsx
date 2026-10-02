'use client'

import { useState } from 'react'
import type { Violation } from '@/types'
import { DemoModeBadge } from '@/components/DemoModeLabel'

type Decision = 'CONFIRM' | 'DISMISS' | 'ESCALATE'

interface Props {
  violation: Violation
  hallSessionId: string
  onClose: () => void
  onUpdated: (violation: Violation) => void
}

const reasonByBehavior: Record<string, string> = {
  phone_like_object_visible: 'An object resembling a phone was visible in the monitored area.',
  repeated_head_turn_toward_adjacent_seat: 'Repeated head turns toward an adjacent seat were observed.',
  hand_movement_below_desk: 'Repeated hand movement below the desk was observed.',
  possible_item_transfer: 'Movement consistent with a possible item transfer was observed.',
  object_on_workspace: 'An additional object was visible on the workspace.',
}

function ReviewIcon({ kind }: { kind: 'confirm' | 'dismiss' | 'escalate' | 'flag' }) {
  const paths = {
    confirm: <path d="m5 12 4 4L19 6" />,
    dismiss: <path d="m6 6 12 12M18 6 6 18" />,
    escalate: <path d="M12 19V5m-7 7 7-7 7 7" />,
    flag: <><path d="M5 21V5" /><path d="M5 5c5-4 9 4 14 0v10c-5 4-9-4-14 0" /></>,
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      {paths[kind]}
    </svg>
  )
}

function readFrameRegion(metadata: Violation['metadata']) {
  const value = metadata?.frame_region
  if (!value || typeof value !== 'object') return null

  const region = value as Record<string, unknown>
  const coordinates = ['x', 'y', 'width', 'height'].map((key) => Number(region[key]))
  if (coordinates.some((coordinate) => !Number.isFinite(coordinate))) return null

  const [x, y, width, height] = coordinates
  const toPercent = (coordinate: number) => Math.max(0, Math.min(100, coordinate <= 1 ? coordinate * 100 : coordinate))
  const left = toPercent(x)
  const top = toPercent(y)
  const right = toPercent(x + width)
  const bottom = toPercent(y + height)

  return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) }
}

function readReasons(violation: Violation): string[] {
  const behaviors = violation.metadata?.contributing_behaviors
  if (Array.isArray(behaviors)) {
    const reasons = behaviors
      .filter((behavior): behavior is string => typeof behavior === 'string')
      .map((behavior) => reasonByBehavior[behavior] ?? `Observed behavior: ${behavior.replace(/[_-]+/g, ' ')}.`)
    if (reasons.length > 0) return reasons.slice(0, 4)
  }

  return ['No contributing behavior details were attached to this alert.']
}

export function AlertReviewCard({ violation, hallSessionId, onClose, onUpdated }: Props) {
  const [note, setNote] = useState(violation.review_note ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const threshold = violation.threshold_score ?? 0.75
  const region = readFrameRegion(violation.metadata)
  const reasons = readReasons(violation)
  const isDemo = violation.demo_mode === true
  const zoneValue = violation.metadata?.zone ?? violation.metadata?.seat_zone
  const seatZone = typeof zoneValue === 'string' ? zoneValue : violation.tracker_label

  async function saveDecision(decision: Decision) {
    if (decision === 'ESCALATE' && !note.trim()) {
      setErrorMessage('Add a short note before escalating this alert.')
      return
    }

    setIsSaving(true)
    setErrorMessage(null)
    setSavedMessage(null)

    try {
      const response = await fetch(`/api/violations/${violation.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hallSessionId, decision, note }),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        setErrorMessage(result.error || 'The decision could not be saved.')
        return
      }

      onUpdated(result.violation as Violation)
      setSavedMessage(`${decision === 'DISMISS' ? 'Dismissed as a false alarm' : decision === 'ESCALATE' ? 'Escalated for further review' : 'Confirmed for follow-up'} and recorded.`)
    } catch {
      setErrorMessage('Unable to reach the review service. Your decision was not saved.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="alert-review-title" className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden border border-gray-700 bg-gray-950 text-gray-100 shadow-2xl sm:rounded-xl">
        {isDemo && <div className="border-b border-gray-700 bg-gray-800 px-4 py-2 text-center text-sm font-semibold text-gray-100">DEMO ALERT · simulated feed · not a real incident</div>}
        <header className="flex items-start justify-between gap-4 border-b border-gray-800 px-5 py-4 sm:px-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-gray-400"><ReviewIcon kind="flag" /></span>
              <h2 id="alert-review-title" className="text-lg font-bold">Suspicious behavior detected</h2>
              {isDemo && <DemoModeBadge />}
            </div>
            <p className="mt-1 text-sm text-gray-400">Review the captured moment; this is a prompt for human review, not a conclusion.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close alert review" className="min-h-12 min-w-12 rounded-lg border border-gray-700 text-xl text-gray-300 hover:bg-gray-800">×</button>
        </header>

        <div className="overflow-y-auto px-5 py-4 sm:px-6">
          <div className="grid gap-4 md:grid-cols-[1.25fr_0.75fr]">
            <div>
              <div className="relative flex min-h-56 items-center justify-center overflow-hidden rounded-lg border border-gray-700 bg-gray-900">
                {violation.evidence_url ? (
                  <img src={violation.evidence_url} alt="Captured frame for human review" className="max-h-[360px] w-full object-contain" />
                ) : (
                  <p className="max-w-xs px-6 text-center text-sm text-gray-400">No captured frame is attached to this alert.</p>
                )}
                {region && violation.evidence_url && (
                  <div aria-label="Highlighted region of interest" className="pointer-events-none absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.12)]" style={{ left: `${region.left}%`, top: `${region.top}%`, width: `${region.width}%`, height: `${region.height}%` }}>
                    <span className="absolute -top-6 left-0 whitespace-nowrap bg-white px-1.5 py-0.5 text-[10px] font-bold text-gray-950">Review region</span>
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-gray-200">Seat / zone: {seatZone}</span>
                <time className="text-gray-400" dateTime={violation.created_at}>{new Date(violation.created_at).toLocaleString()}</time>
              </div>
              {!region && <p className="mt-1 text-xs text-gray-500">No region coordinates were attached to the frame.</p>}
            </div>

            <div className="space-y-4">
              <section className="rounded-lg border border-gray-800 bg-gray-900/70 p-4">
                <h3 className="text-sm font-bold text-gray-200">Why this was flagged</h3>
                <ul className="mt-2 space-y-2 text-sm text-gray-300">
                  {reasons.map((reason) => <li key={reason} className="flex gap-2"><span aria-hidden="true" className="mt-0.5 text-gray-400">•</span><span>{reason}</span></li>)}
                </ul>
              </section>
              <section className="rounded-lg border border-gray-800 bg-gray-900/70 p-4">
                <h3 className="text-sm font-bold text-gray-200">Model score vs review threshold</h3>
                <div className="mt-3 flex items-baseline justify-between gap-3">
                  <span className="text-2xl font-bold tabular-nums">{Math.round(violation.confidence * 100)}%</span>
                  <span className="text-sm text-gray-400">Threshold {Math.round(threshold * 100)}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded bg-gray-700" aria-label={`Score ${Math.round(violation.confidence * 100)} percent; threshold ${Math.round(threshold * 100)} percent`}>
                  <div className="h-full bg-gray-300" style={{ width: `${Math.max(0, Math.min(100, violation.confidence * 100))}%` }} />
                </div>
              </section>
              {violation.reviewed_at && (
                <p className="text-xs text-gray-400">Last action: {violation.review_action} by examiner for hall session {violation.reviewed_by_session_id?.slice(0, 8)} at {new Date(violation.reviewed_at).toLocaleString()}</p>
              )}
            </div>
          </div>

          <label htmlFor="review-note" className="mt-4 block text-sm font-semibold text-gray-200">Invigilator note (optional)</label>
          <textarea id="review-note" value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Add context for the audit trail" className="mt-2 min-h-24 w-full resize-y rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500" />

          {errorMessage && <p role="alert" className="mt-3 rounded-lg border border-gray-700 bg-gray-900 p-3 text-sm text-gray-200">{errorMessage}</p>}
          {savedMessage && <p role="status" className="mt-3 rounded-lg border border-gray-700 bg-gray-900 p-3 text-sm text-gray-200">{savedMessage}</p>}
        </div>

        <footer className="grid gap-2 border-t border-gray-800 bg-gray-950 p-4 sm:grid-cols-3 sm:px-6">
          <button type="button" disabled={isSaving} onClick={() => saveDecision('CONFIRM')} className="flex min-h-14 items-center justify-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-4 text-sm font-bold text-white hover:bg-gray-700 disabled:opacity-50"><ReviewIcon kind="confirm" /> Confirm for follow-up</button>
          <button type="button" disabled={isSaving} onClick={() => saveDecision('DISMISS')} className="flex min-h-14 items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-4 text-sm font-bold text-gray-200 hover:bg-gray-800 disabled:opacity-50"><ReviewIcon kind="dismiss" /> Dismiss (false alarm)</button>
          <button type="button" disabled={isSaving} onClick={() => saveDecision('ESCALATE')} className="flex min-h-14 items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-4 text-sm font-bold text-gray-200 hover:bg-gray-800 disabled:opacity-50"><ReviewIcon kind="escalate" /> Escalate / add note</button>
        </footer>
      </section>
    </div>
  )
}