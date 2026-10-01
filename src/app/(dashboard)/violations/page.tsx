'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Violation, ViolationActivityType, ViolationSeverity, ViolationStatus } from '@/types'

export default function ViolationsLedgerPage() {
  const [violations, setViolations] = useState<Violation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [activityFilter, setActivityFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  async function loadViolations() {
    try {
      const res = await fetch('/api/violations?limit=100')
      const data = await res.json()
      if (Array.isArray(data)) {
        setViolations(data)
      }
    } catch (err) {
      console.error('Error fetching violations:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadViolations()
  }, [])

  // Calculate occurrence counts per tracker
  const trackerCounts = violations.reduce<Record<string, Record<string, number>>>((acc, curr) => {
    const tracker = curr.tracker_label || 'Tracker'
    if (!acc[tracker]) acc[tracker] = {}
    const act = curr.activity_type
    acc[tracker][act] = (acc[tracker][act] || 0) + 1
    return acc
  }, {})

  // Filter application
  const filtered = violations.filter((v) => {
    if (activityFilter && v.activity_type !== activityFilter) return false
    if (severityFilter && v.severity !== severityFilter) return false
    if (statusFilter && v.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const matchTracker = v.tracker_label.toLowerCase().includes(q)
      const matchActivity = v.activity_type.toLowerCase().includes(q)
      const matchCourse = v.session?.course_name?.toLowerCase().includes(q)
      if (!matchTracker && !matchActivity && !matchCourse) return false
    }
    return true
  })

  // Status Update (Confirm / Dismiss)
  async function handleUpdateStatus(id: string, newStatus: ViolationStatus) {
    const supabase = createClient()
    const { error } = await supabase
      .from('violations')
      .update({ status: newStatus })
      .eq('id', id)

    if (!error) {
      setViolations((prev) =>
        prev.map((v) => (v.id === id ? { ...v, status: newStatus } : v))
      )
      if (selectedViolation?.id === id) {
        setSelectedViolation((prev) => (prev ? { ...prev, status: newStatus } : null))
      }
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto selection:bg-teal-900 selection:text-teal-100">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Violations &amp; Evidence Ledger
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Tamper-evident archive of camera snapshots, tracker occurrences, and behavioral flags.
          </p>
        </div>

        <button
          onClick={loadViolations}
          className="min-h-[44px] px-4 py-2 rounded-xl border border-gray-700 bg-gray-900 hover:bg-gray-800 text-gray-300 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>🔄</span> Refresh Ledger
        </button>
      </div>

      {/* ── Tracker Occurrence Summary Cards ── */}
      {Object.keys(trackerCounts).length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Candidate Tracker Frequency Aggregation
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(trackerCounts).slice(0, 4).map(([tracker, counts]) => {
              const totalIncidents = Object.values(counts).reduce((a, b) => a + b, 0)
              return (
                <div
                  key={tracker}
                  className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 space-y-2 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-white">{tracker}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950 text-red-300 border border-red-800">
                      {totalIncidents} Incident{totalIncidents !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 space-y-1">
                    {Object.entries(counts).map(([type, cnt]) => (
                      <div key={type} className="flex justify-between">
                        <span>{type.replace(/_/g, ' ')}:</span>
                        <strong className="text-gray-200 font-mono">{cnt}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Filter Controls Row ── */}
      <div className="p-4 rounded-xl border border-gray-800 bg-gray-900/60 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[220px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Tracker #, Course, or Activity…"
            className="w-full px-3.5 py-2 text-xs rounded-lg border border-gray-700 bg-gray-950 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500 min-h-[40px]"
          />
        </div>

        {/* Activity Filter */}
        <select
          value={activityFilter}
          onChange={(e) => setActivityFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-1 focus:ring-teal-500 min-h-[40px]"
        >
          <option value="">All Activity Types</option>
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
          className="px-3 py-2 text-xs rounded-lg border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-1 focus:ring-teal-500 min-h-[40px]"
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-1 focus:ring-teal-500 min-h-[40px]"
        >
          <option value="">All Statuses</option>
          <option value="FLAGGED">Flagged</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="DISMISSED">Dismissed</option>
        </select>

        {(search || activityFilter || severityFilter || statusFilter) && (
          <button
            onClick={() => {
              setSearch('')
              setActivityFilter('')
              setSeverityFilter('')
              setStatusFilter('')
            }}
            className="px-3 py-2 text-xs text-gray-400 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Violations Table ── */}
      {isLoading ? (
        <div className="p-12 text-center text-gray-400 text-sm">
          Loading Violations Archive…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center space-y-2">
          <span className="text-3xl block">🛡️</span>
          <p className="text-white font-semibold text-sm">No violations match the filter criteria</p>
          <p className="text-xs text-gray-500">All examination sessions are operating within integrity bounds.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[750px]">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950/70 text-gray-400 font-mono">
                  <th className="px-5 py-4">Tracker Label</th>
                  <th className="px-5 py-4">Incident Event</th>
                  <th className="px-5 py-4">Examination / Hall</th>
                  <th className="px-5 py-4">Severity</th>
                  <th className="px-5 py-4">Confidence</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Recorded At</th>
                  <th className="px-5 py-4 text-right">Evidence Snapshot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {filtered.map((v) => {
                  const sevColor =
                    v.severity === 'CRITICAL'
                      ? 'text-red-300 bg-red-950 border-red-800'
                      : v.severity === 'HIGH'
                      ? 'text-rose-300 bg-rose-950 border-rose-800'
                      : v.severity === 'MEDIUM'
                      ? 'text-amber-300 bg-amber-950 border-amber-800'
                      : 'text-blue-300 bg-blue-950 border-blue-800'

                  return (
                    <tr key={v.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-5 py-4 font-bold text-white font-mono">
                        {v.tracker_label}
                      </td>

                      <td className="px-5 py-4 font-semibold text-gray-200">
                        {v.activity_type.replace(/_/g, ' ')}
                      </td>

                      <td className="px-5 py-4 text-gray-300">
                        {v.session?.course_name || 'Classroom Session'}
                      </td>

                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${sevColor}`}>
                          {v.severity}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-mono text-gray-300">
                        {Math.round(v.confidence * 100)}%
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                            v.status === 'CONFIRMED'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : v.status === 'FLAGGED'
                              ? 'bg-red-950 text-red-300 border-red-800'
                              : 'bg-gray-800 text-gray-400 border-gray-700'
                          }`}
                        >
                          {v.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-gray-400 font-mono">
                        {new Date(v.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedViolation(v)}
                          className="min-h-[36px] px-3 py-1.5 rounded-lg bg-teal-950 hover:bg-teal-900 border border-teal-800 text-teal-300 text-xs font-semibold transition-colors"
                        >
                          View Snapshot 📸
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Evidence Viewer Modal ── */}
      {selectedViolation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div>
                <h3 className="text-base font-bold text-white">
                  Evidence Snapshot • {selectedViolation.tracker_label}
                </h3>
                <p className="text-xs text-red-400 font-semibold mt-0.5">
                  {selectedViolation.activity_type.replace(/_/g, ' ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedViolation(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Snapshot Photo Display */}
            <div className="rounded-xl border border-gray-800 bg-gray-950 overflow-hidden relative min-h-[220px] flex items-center justify-center">
              {selectedViolation.evidence_url ? (
                <img
                  src={selectedViolation.evidence_url}
                  alt="Incident Snapshot"
                  className="w-full h-auto object-cover max-h-[300px]"
                />
              ) : (
                <div className="p-8 text-center text-gray-500 text-xs">
                  <span className="text-3xl block mb-2">📸</span>
                  Encrypted frame archived in edge hardware buffer
                </div>
              )}
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 font-mono text-[10px] text-teal-400">
                Timestamp: {new Date(selectedViolation.created_at).toISOString()}
              </div>
            </div>

            {/* Event Metadata Breakdown */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono p-3 rounded-xl bg-gray-950 border border-gray-800">
              <div>
                <span className="text-gray-500 block text-[10px]">DETECTION CONFIDENCE</span>
                <span className="text-white font-bold">{Math.round(selectedViolation.confidence * 100)}%</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px]">SEVERITY INDEX</span>
                <span className="text-red-400 font-bold">{selectedViolation.severity}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px]">CURRENT STATUS</span>
                <span className="text-teal-400 font-bold">{selectedViolation.status}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px]">EVIDENCE ID</span>
                <span className="text-gray-400 truncate block">{selectedViolation.id.slice(0, 10)}…</span>
              </div>
            </div>

            {/* Status Modification Buttons */}
            <div className="pt-2 flex items-center justify-between gap-2">
              <span className="text-xs text-gray-400">Triage Decision:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedViolation.id, 'DISMISSED')}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium"
                >
                  Dismiss Flag
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedViolation.id, 'CONFIRMED')}
                  className="min-h-[40px] px-4 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-semibold"
                >
                  Confirm Violation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
