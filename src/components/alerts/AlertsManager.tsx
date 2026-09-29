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
      CRITICAL: 'bg-red-950 text-red-300 border-red-800',
      HIGH: 'bg-rose-950 text-rose-300 border-rose-800',
      MEDIUM: 'bg-amber-950 text-amber-300 border-amber-800',
      LOW: 'bg-blue-950 text-blue-300 border-blue-800',
    }
    return (
      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${map[severity]}`}>
        {severity}
      </span>
    )
  }

  function getStatusBadge(status: AlertStatusType) {
    const map: Record<AlertStatusType, string> = {
      FLAGGED: 'bg-red-950 text-red-400 border-red-800',
      REVIEWED: 'bg-blue-950 text-blue-300 border-blue-800',
      DISMISSED: 'bg-gray-800 text-gray-400 border-gray-700',
      CONFIRMED: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    }
    return (
      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${map[status]}`}>
        {status}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Filter Controls Row ── */}
      <div className="p-4 rounded-xl border border-gray-800 bg-gray-900/60 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate name or student #…"
            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Examination Filter */}
        {exams.length > 0 && (
          <select
            value={examFilter}
            onChange={(e) => setExamFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-gray-700 bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
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
          className="px-3 py-2 text-xs rounded-lg border border-gray-700 bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
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
          className="px-3 py-2 text-xs rounded-lg border border-gray-700 bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
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
          className="px-3 py-2 text-xs rounded-lg border border-gray-700 bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
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
            className="px-3 py-2 text-xs text-gray-400 hover:text-white transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {statusMessage && (
        <div className="p-3 text-xs rounded-lg border border-teal-800 bg-teal-950/40 text-teal-300">
          {statusMessage}
        </div>
      )}

      {/* ── Table of Alerts ── */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
              <th className="px-5 py-3.5 font-medium">Candidate</th>
              <th className="px-5 py-3.5 font-medium">Event Type</th>
              <th className="px-5 py-3.5 font-medium">Severity</th>
              <th className="px-5 py-3.5 font-medium">Confidence</th>
              <th className="px-5 py-3.5 font-medium">Status</th>
              <th className="px-5 py-3.5 font-medium">Time Recorded</th>
              <th className="px-5 py-3.5 font-medium text-right">Invigilator Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-gray-500">
                  No alerts match your filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((alert) => (
                <tr key={alert.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-white">
                      {alert.student?.full_name ?? 'Unassigned Candidate'}
                    </p>
                    <p className="text-xs font-mono text-teal-400 mt-0.5">
                      {alert.student?.student_number ?? 'Desk #—'}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-gray-200 font-medium">
                    {alert.event_type.replace(/_/g, ' ')}
                  </td>
                  <td className="px-5 py-4">{getSeverityBadge(alert.severity)}</td>
                  <td className="px-5 py-4 font-mono text-gray-300 text-xs">
                    {Math.round(alert.confidence * 100)}%
                  </td>
                  <td className="px-5 py-4">{getStatusBadge(alert.status)}</td>
                  <td className="px-5 py-4 text-xs text-gray-400">
                    {new Date(alert.created_at).toLocaleString([], {
                      dateStyle: 'short',
                      timeStyle: 'medium',
                    })}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {alert.status !== 'CONFIRMED' && (
                        <button
                          onClick={() => handleStatusUpdate(alert.id, 'CONFIRMED')}
                          disabled={isPending}
                          title="Confirm as valid incident"
                          className="px-2 py-1 text-xs rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-medium disabled:opacity-50 transition-colors"
                        >
                          Confirm
                        </button>
                      )}
                      {alert.status !== 'REVIEWED' && (
                        <button
                          onClick={() => handleStatusUpdate(alert.id, 'REVIEWED')}
                          disabled={isPending}
                          title="Mark as reviewed by invigilator"
                          className="px-2 py-1 text-xs rounded bg-blue-950 hover:bg-blue-900 border border-blue-800 text-blue-300 font-medium disabled:opacity-50 transition-colors"
                        >
                          Review
                        </button>
                      )}
                      {alert.status !== 'DISMISSED' && (
                        <button
                          onClick={() => handleStatusUpdate(alert.id, 'DISMISSED')}
                          disabled={isPending}
                          title="Dismiss as false positive"
                          className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white font-medium disabled:opacity-50 transition-colors"
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
  )
}
