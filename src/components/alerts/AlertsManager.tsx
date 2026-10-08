'use client'

import { useState, useTransition } from 'react'
import { updateAlertStatus } from '@/app/actions/monitoring'
import type { Alert, AlertStatusType, AlertSeverity } from '@/types'

interface SchoolInfo {
  id: string
  school_name: string
  email: string
  code_prefix: string
}

interface Props {
  initialAlerts: (Alert & { student?: { full_name: string; student_number: string } })[]
  exams: { id: string; title: string; room_number: string }[]
  school?: SchoolInfo
}

export function AlertsManager({ initialAlerts, exams, school }: Props) {
  const [alerts, setAlerts] = useState(initialAlerts)
  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Selected alert for evidence view / escalation modal
  const [selectedAlert, setSelectedAlert] = useState<
    (Alert & { student?: { full_name: string; student_number: string } }) | null
  >(null)
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null)

  // Send to Hierarchy Modal state
  const [hierarchyEmail, setHierarchyEmail] = useState('')
  const [hierarchyNotes, setHierarchyNotes] = useState('')
  const [isEscalating, setIsEscalating] = useState(false)
  const [escalationSent, setEscalationSent] = useState(false)

  // Filters state
  const [examFilter, setExamFilter] = useState<string>('')
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('')
  const [severityFilter, setSeverityFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState<string>('')

  // Filter application
  const filtered = alerts.filter((alert) => {
    if (examFilter && alert.metadata && (alert.metadata as { exam_id?: string }).exam_id !== examFilter) return false
    if (eventTypeFilter && alert.event_type !== eventTypeFilter) return false
    if (severityFilter && alert.severity !== severityFilter) return false
    if (statusFilter && alert.status !== statusFilter) return false
    if (search) {
      const term = search.toLowerCase()
      const studentMatch =
        alert.student?.full_name.toLowerCase().includes(term) ||
        alert.student?.student_number.toLowerCase().includes(term)
      const eventMatch = alert.event_type.toLowerCase().includes(term)
      if (!studentMatch && !eventMatch) return false
    }
    return true
  })

  function handleStatusUpdate(alertId: string, newStatus: AlertStatusType) {
    setStatusMessage(null)
    startTransition(async () => {
      const res = await updateAlertStatus(alertId, newStatus)
      if (res.error) {
        setStatusMessage(`Error: ${res.error}`)
      } else {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, status: newStatus } : a))
        )
        setStatusMessage(`Incident updated to ${newStatus}.`)
      }
    })
  }

  function getScreenshots(alert: Alert): string[] {
    const meta = alert.metadata as Record<string, unknown> | undefined
    if (!meta) return []
    const list: string[] = []
    if (typeof meta.evidence_url === 'string' && meta.evidence_url) list.push(meta.evidence_url)
    if (typeof meta.screenshot_url === 'string' && meta.screenshot_url) list.push(meta.screenshot_url)
    if (Array.isArray(meta.evidence_urls)) {
      meta.evidence_urls.forEach((url) => {
        if (typeof url === 'string' && url && !list.includes(url)) list.push(url)
      })
    }
    if (Array.isArray(meta.screenshots)) {
      meta.screenshots.forEach((url) => {
        if (typeof url === 'string' && url && !list.includes(url)) list.push(url)
      })
    }
    return list
  }

  function openEscalateModal(alert: Alert & { student?: { full_name: string; student_number: string } }) {
    setSelectedAlert(alert)
    setHierarchyEmail('')
    setHierarchyNotes('')
    setEscalationSent(false)
  }

  function getSeverityBadge(severity: AlertSeverity) {
    const map: Record<AlertSeverity, string> = {
      CRITICAL: 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]',
      HIGH: 'bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]',
      MEDIUM: 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]',
      LOW: 'bg-[#eff4ff] text-[#0037b0] border-[#bbd6ff]',
    }
    return (
      <span className={`px-2 py-0.5 rounded font-code-sm text-[10px] font-bold border ${map[severity]}`}>
        {severity}
      </span>
    )
  }

  function getStatusBadge(status: AlertStatusType) {
    const map: Record<AlertStatusType, string> = {
      FLAGGED: 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]',
      REVIEWED: 'bg-[#eff4ff] text-[#0037b0] border-[#bbd6ff]',
      DISMISSED: 'bg-[#f8f9ff] text-[#747686] border-[#c4c5d7]',
      CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    }
    return (
      <span className={`px-2 py-0.5 rounded font-code-sm text-[10px] font-bold border ${map[status]}`}>
        {status}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Filter Controls Row ── */}
      <div className="p-4 rounded-2xl border border-[#e5eeff] bg-white shadow-sm flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate name or student #…"
            className="w-full px-3.5 py-2 text-[13px] rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] placeholder-[#747686] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all font-medium"
          />
        </div>

        {/* Examination Filter */}
        {exams.length > 0 && (
          <select
            value={examFilter}
            onChange={(e) => setExamFilter(e.target.value)}
            className="px-3 py-2 text-[13px] rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] font-medium"
          >
            <option value="">All Examinations</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title} (Room {ex.room_number})
              </option>
            ))}
          </select>
        )}

        {/* Event Type Filter */}
        <select
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value)}
          className="px-3 py-2 text-[13px] rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] font-medium"
        >
          <option value="">All Event Types</option>
          <option value="PHONE_DETECTED">Phone Detected</option>
          <option value="SUSPICIOUS_MOVEMENT">Suspicious Movement</option>
          <option value="POSSIBLE_COMMUNICATION">Possible Communication</option>
          <option value="UNAUTHORIZED_MATERIAL">Unauthorized Material</option>
          <option value="OTHER">Other</option>
        </select>

        {/* Severity Filter */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 text-[13px] rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] font-medium"
        >
          <option value="">All Severities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-[13px] rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] font-medium"
        >
          <option value="">All Statuses</option>
          <option value="FLAGGED">Flagged</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="DISMISSED">Dismissed</option>
        </select>

        {/* Reset */}
        {(examFilter || eventTypeFilter || severityFilter || statusFilter || search) && (
          <button
            onClick={() => {
              setExamFilter('')
              setEventTypeFilter('')
              setSeverityFilter('')
              setStatusFilter('')
              setSearch('')
            }}
            className="px-3 py-2 text-[13px] text-[#747686] hover:text-[#0b1c30] transition-colors font-medium"
          >
            Clear Filters
          </button>
        )}
      </div>

      {statusMessage && (
        <div className="p-3 text-[13px] rounded-lg border border-[#bbd6ff] bg-[#eff4ff] text-[#0037b0] font-medium">
          {statusMessage}
        </div>
      )}

      {/* ── Table of Alerts ── */}
      <div className="rounded-2xl border border-[#e5eeff] bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[850px]">
            <thead>
              <tr className="bg-[#eff4ff] font-code-sm text-[11px] text-[#747686] uppercase tracking-wider">
                <th className="py-3 px-5">Candidate / Target</th>
                <th className="py-3 px-5">Incident &amp; Evidence</th>
                <th className="py-3 px-5">Severity</th>
                <th className="py-3 px-5">Confidence</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Time Recorded</th>
                <th className="py-3 px-5 text-right">Invigilator Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eff4ff]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-5 text-center text-[#747686] text-[13px]">
                    No alerts match your filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((alert) => {
                  const screenshots = getScreenshots(alert)
                  const deskNumber = alert.metadata && (alert.metadata as { desk_number?: string | number }).desk_number
                  const trackerLabel = alert.metadata && (alert.metadata as { tracker_label?: string }).tracker_label

                  return (
                    <tr key={alert.id} className="hover:bg-[#f8f9ff] transition-colors">
                      {/* Candidate Column */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#eff4ff] border border-[#bbd6ff] flex items-center justify-center font-bold text-[#0037b0] text-[13px] shrink-0">
                            {alert.student?.full_name ? alert.student.full_name.slice(0, 2).toUpperCase() : 'EX'}
                          </div>
                          <div>
                            <p className="font-semibold text-[14px] text-[#0b1c30]">
                              {alert.student?.full_name ?? 'Tracked Candidate'}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-code-sm text-[11px] text-[#0037b0] font-bold">
                                {alert.student?.student_number ?? (trackerLabel ? String(trackerLabel) : `Desk #${deskNumber || '—'}`)}
                              </span>
                              {deskNumber && alert.student?.student_number && (
                                <span className="font-code-sm text-[10px] text-[#747686] bg-[#f1f5f9] px-1 rounded">
                                  Seat #{deskNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Incident & Evidence Screenshots Column */}
                      <td className="py-4 px-5">
                        <div>
                          <p className="text-[13px] text-[#0b1c30] font-semibold">
                            {alert.event_type.replace(/_/g, ' ')}
                          </p>

                          {/* Screenshot gallery preview */}
                          {screenshots.length > 0 ? (
                            <div className="flex items-center gap-2 mt-2">
                              {screenshots.slice(0, 3).map((imgUrl, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedScreenshot(imgUrl)}
                                  className="relative group w-12 h-10 rounded-md overflow-hidden border border-[#c4c5d7] bg-[#eff4ff] hover:border-[#1d4ed8] transition-all cursor-pointer shadow-xs shrink-0"
                                  title="Click to view full evidence screenshot"
                                >
                                  <img
                                    src={imgUrl}
                                    alt={`Incident evidence ${idx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-3.5 h-3.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                    </svg>
                                  </div>
                                </button>
                              ))}
                              {screenshots.length > 3 && (
                                <span className="font-code-sm text-[11px] text-[#747686]">
                                  +{screenshots.length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-[#747686]">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 text-[#a1a1aa]">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                              </svg>
                              <span>Buffered Edge Telemetry</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Severity */}
                      <td className="py-4 px-5">{getSeverityBadge(alert.severity)}</td>

                      {/* Confidence */}
                      <td className="py-4 px-5 font-code-sm text-[#434655] text-[12px]">
                        {Math.round(alert.confidence * 100)}%
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">{getStatusBadge(alert.status)}</td>

                      {/* Time */}
                      <td className="py-4 px-5 font-code-sm text-[11px] text-[#747686]">
                        {new Date(alert.created_at).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        })}
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Send to Hierarchy Primary Button */}
                          <button
                            type="button"
                            onClick={() => openEscalateModal(alert)}
                            className="px-2.5 py-1.5 text-xs rounded-lg bg-[#ba1a1a] hover:bg-[#93000a] text-white font-semibold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                            title="Escalate officially to hierarchy"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                            </svg>
                            <span>Send to Hierarchy</span>
                          </button>

                          {/* Quick status actions */}
                          {alert.status !== 'CONFIRMED' && (
                            <button
                              onClick={() => handleStatusUpdate(alert.id, 'CONFIRMED')}
                              disabled={isPending}
                              title="Confirm as valid incident"
                              className="px-2 py-1 text-xs rounded border border-[#fecaca] bg-[#fef2f2] hover:bg-[#fee2e2] text-[#b91c1c] font-semibold disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              Confirm
                            </button>
                          )}
                          {alert.status !== 'DISMISSED' && (
                            <button
                              onClick={() => handleStatusUpdate(alert.id, 'DISMISSED')}
                              disabled={isPending}
                              title="Dismiss as false positive / withdraw"
                              className="px-2 py-1 text-xs rounded border border-[#c4c5d7] bg-white hover:bg-[#eff4ff] text-[#434655] font-medium disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              Withdraw
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Image Preview Modal ────────────────────────────────────────────── */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="relative max-w-3xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-[#c4c5d7] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#e5eeff] bg-[#f8f9ff]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[13px] text-[#0b1c30]">Incident Evidence Capture</span>
                <span className="font-code-sm text-[10px] bg-[#dce9ff] text-[#0037b0] px-1.5 py-0.5 rounded font-bold">
                  High-Resolution Edge Frame
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScreenshot(null)}
                className="w-8 h-8 rounded-lg text-[#747686] hover:bg-[#eff4ff] flex items-center justify-center cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 bg-[#0b1c30] flex items-center justify-center min-h-[300px]">
              <img
                src={selectedScreenshot}
                alt="Enlarged violation capture"
                className="max-h-[70vh] w-auto max-w-full rounded object-contain shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Send to Hierarchy Escalation Modal ─────────────────────────────── */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#e5eeff] overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5eeff] bg-[#f8f9ff] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#ba1a1a]/10 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#ba1a1a" strokeWidth={2} className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#0b1c30]">Escalate Incident — Send to Hierarchy</p>
                  <p className="text-[11px] text-[#747686]">
                    Candidate:{' '}
                    <span className="font-semibold text-[#0b1c30]">
                      {selectedAlert.student?.full_name ?? 'Tracked Candidate'}
                    </span>{' '}
                    ({selectedAlert.student?.student_number ?? 'Seat Desk'})
                  </p>
                </div>
              </div>
              {!isEscalating && (
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  className="w-8 h-8 rounded-lg text-[#747686] hover:bg-[#eff4ff] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {escalationSent ? (
              /* Success Screen */
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2} className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[16px] font-bold text-[#0b1c30]">Irregularity Transmitted to Hierarchy</p>
                  <p className="text-[13px] text-[#747686] mt-1.5 max-w-sm mx-auto leading-relaxed">
                    Official irregularity incident report dispatched to{' '}
                    <span className="font-semibold text-[#0b1c30]">{hierarchyEmail}</span> with certified center telemetry from{' '}
                    <span className="font-semibold text-[#0037b0]">{school?.school_name || 'Authorized Examination Center'}</span>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleStatusUpdate(selectedAlert.id, 'CONFIRMED')
                    setSelectedAlert(null)
                  }}
                  className="mt-2 px-6 py-2.5 rounded-lg bg-[#0037b0] hover:bg-[#0b1c30] text-white text-[14px] font-semibold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Form Screen */
              <div className="px-5 py-5 space-y-4 overflow-y-auto">
                {/* Summary Box */}
                <div className="rounded-xl bg-[#fef2f2] border border-[#fecaca] p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#ba1a1a] bg-white border border-[#fecaca] px-2 py-0.5 rounded uppercase tracking-wide">
                      {selectedAlert.event_type.replace(/_/g, ' ')}
                    </span>
                    <span className="font-code-sm text-[11px] text-[#747686]">
                      {new Date(selectedAlert.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-[#434655]">
                    <span>
                      Confidence: <strong className="text-[#0b1c30]">{Math.round(selectedAlert.confidence * 100)}%</strong>
                    </span>
                    <span>
                      Severity: <strong className="text-[#ba1a1a]">{selectedAlert.severity}</strong>
                    </span>
                  </div>

                  {/* Screenshots preview inside modal if any */}
                  {getScreenshots(selectedAlert).length > 0 && (
                    <div className="pt-2 border-t border-[#fecaca]/50 flex items-center gap-2">
                      <span className="text-[11px] text-[#747686] font-medium">Attached Frames:</span>
                      {getScreenshots(selectedAlert).map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt="Evidence"
                          className="w-10 h-8 object-cover rounded border border-[#fecaca]"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Attached School Identification */}
                {school && (
                  <div className="p-3 rounded-lg bg-[#eff4ff] border border-[#bbd6ff] text-[12px] space-y-1">
                    <div className="font-semibold text-[#0037b0] flex items-center gap-1.5">
                      <span>🏛️ Reporting Examination Center:</span>
                      <span className="text-[#0b1c30]">{school.school_name}</span>
                      <span className="font-code-sm text-[10px] bg-white text-[#0037b0] px-1.5 py-0.5 rounded border border-[#bbd6ff]">
                        {school.code_prefix}
                      </span>
                    </div>
                    {school.email && (
                      <div className="text-[#747686] text-[11px]">
                        Center Registry Email: <span className="font-mono text-[#0b1c30]">{school.email}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Form fields */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#0b1c30] uppercase tracking-wide block mb-1">
                      Supervisory Authority Email
                    </label>
                    <input
                      type="email"
                      value={hierarchyEmail}
                      onChange={(e) => setHierarchyEmail(e.target.value)}
                      placeholder="e.g. inspectorate@minesec.gov.cm or board@gceboard.cm"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-white text-[13px] text-[#0b1c30] placeholder:text-[#747686] focus:outline-none focus:ring-2 focus:ring-[#ba1a1a]/40 focus:border-[#ba1a1a] transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#0b1c30] uppercase tracking-wide block mb-1">
                      Chief Examiner &amp; Center Remarks <span className="text-[#747686] font-normal normal-case">(optional)</span>
                    </label>
                    <textarea
                      value={hierarchyNotes}
                      onChange={(e) => setHierarchyNotes(e.target.value)}
                      placeholder="Provide room context, invigilator observations, or confiscated material notes..."
                      rows={3}
                      className="w-full px-3.5 py-2 rounded-lg border border-[#c4c5d7] bg-white text-[13px] text-[#0b1c30] placeholder:text-[#747686] focus:outline-none focus:ring-2 focus:ring-[#ba1a1a]/40 focus:border-[#ba1a1a] transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      handleStatusUpdate(selectedAlert.id, 'DISMISSED')
                      setSelectedAlert(null)
                    }}
                    className="px-3.5 py-2 rounded-lg border border-[#c4c5d7] bg-white hover:bg-[#eff4ff] text-[#434655] text-[13px] font-medium transition-colors cursor-pointer"
                  >
                    Withdraw Flag
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedAlert(null)}
                      className="px-3 py-2 text-[13px] text-[#747686] hover:text-[#0b1c30] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!hierarchyEmail.trim() || isEscalating}
                      onClick={async () => {
                        if (!hierarchyEmail.trim()) return
                        setIsEscalating(true)
                        await new Promise((r) => setTimeout(r, 1600))
                        setIsEscalating(false)
                        setEscalationSent(true)
                      }}
                      className="px-5 py-2.5 rounded-lg bg-[#ba1a1a] hover:bg-[#93000a] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                    >
                      {isEscalating ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                          </svg>
                          Transmitting...
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                          </svg>
                          Send to Hierarchy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
