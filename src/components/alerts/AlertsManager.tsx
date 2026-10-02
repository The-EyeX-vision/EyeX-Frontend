'use client'

import { useState, useTransition } from 'react'
import { updateAlertStatus } from '@/app/actions/monitoring'
import type { Alert, AlertStatusType, AlertSeverity } from '@/types'

interface Props {
  initialAlerts: (Alert & { student?: { full_name: string; student_number: string } })[]
  exams: { id: string; title: string; room_number: string }[]
}

export function AlertsManager({ initialAlerts, exams }: Props) {
  const [alerts, setAlerts] = useState(initialAlerts)
  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

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
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="bg-[#eff4ff] font-code-sm text-[11px] text-[#747686] uppercase tracking-wider">
                <th className="py-3 px-5">Candidate</th>
                <th className="py-3 px-5">Event Type</th>
                <th className="py-3 px-5">Severity</th>
                <th className="py-3 px-5">Confidence</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Time Recorded</th>
                <th className="py-3 px-5 text-right">Invigilator Action</th>
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
                filtered.map((alert) => (
                  <tr key={alert.id} className="hover:bg-[#f8f9ff] transition-colors">
                    <td className="py-4 px-5">
                      <p className="font-semibold text-[14px] text-[#0b1c30]">
                        {alert.student?.full_name ?? 'Unassigned Candidate'}
                      </p>
                      <p className="font-code-sm text-[11px] text-[#0037b0] font-bold mt-0.5">
                        {alert.student?.student_number ?? 'Desk #—'}
                      </p>
                    </td>
                    <td className="py-4 px-5 text-[13px] text-[#434655] font-medium">
                      {alert.event_type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-4 px-5">{getSeverityBadge(alert.severity)}</td>
                    <td className="py-4 px-5 font-code-sm text-[#434655] text-[12px]">
                      {Math.round(alert.confidence * 100)}%
                    </td>
                    <td className="py-4 px-5">{getStatusBadge(alert.status)}</td>
                    <td className="py-4 px-5 font-code-sm text-[11px] text-[#747686]">
                      {new Date(alert.created_at).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {alert.status !== 'CONFIRMED' && (
                          <button
                            onClick={() => handleStatusUpdate(alert.id, 'CONFIRMED')}
                            disabled={isPending}
                            title="Confirm as valid incident"
                            className="px-2.5 py-1 text-xs rounded bg-[#fef2f2] hover:bg-[#fee2e2] border border-[#fecaca] text-[#b91c1c] font-semibold disabled:opacity-50 transition-colors"
                          >
                            Confirm
                          </button>
                        )}
                        {alert.status !== 'REVIEWED' && (
                          <button
                            onClick={() => handleStatusUpdate(alert.id, 'REVIEWED')}
                            disabled={isPending}
                            title="Mark as reviewed by invigilator"
                            className="px-2.5 py-1 text-xs rounded bg-[#eff4ff] hover:bg-[#e5eeff] border border-[#bbd6ff] text-[#0037b0] font-semibold disabled:opacity-50 transition-colors"
                          >
                            Review
                          </button>
                        )}
                        {alert.status !== 'DISMISSED' && (
                          <button
                            onClick={() => handleStatusUpdate(alert.id, 'DISMISSED')}
                            disabled={isPending}
                            title="Dismiss as false positive"
                            className="px-2.5 py-1 text-xs rounded bg-white hover:bg-[#eff4ff] border border-[#c4c5d7] text-[#434655] font-medium disabled:opacity-50 transition-colors"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
