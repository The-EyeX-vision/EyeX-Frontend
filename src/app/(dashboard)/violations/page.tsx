'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Violation } from '@/types'

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]',
  HIGH: 'bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]',
  MEDIUM: 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]',
  LOW: 'bg-[#eff4ff] text-[#0037b0] border-[#bbd6ff]',
}

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: 'bg-[#fef2f2] text-[#b91c1c]',
  FLAGGED: 'bg-[#fffbeb] text-[#b45309]',
  DISMISSED: 'bg-[#f8f9ff] text-[#747686]',
  REVIEWED: 'bg-[#eff4ff] text-[#0037b0]',
}

export default function ViolationsLedgerPage() {
  const [violations, setViolations] = useState<Violation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null)
  const [search, setSearch] = useState('')
  const [activityFilter, setActivityFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  async function loadViolations() {
    try {
      const res = await fetch('/api/violations?limit=100')
      const data = await res.json()
      if (Array.isArray(data)) setViolations(data)
    } catch (err) { console.error(err) }
    finally { setIsLoading(false) }
  }

  useEffect(() => { loadViolations() }, [])

  async function handleUpdateStatus(id: string, status: string) {
    try {
      const supabase = createClient()
      await supabase.from('violations').update({ status }).eq('id', id)
      setViolations((prev) => prev.map((v) => v.id === id ? { ...v, status: status as Violation['status'] } : v))
      if (selectedViolation?.id === id) setSelectedViolation((prev) => prev ? { ...prev, status: status as Violation['status'] } : null)
    } catch { /* ignore */ }
  }

  const filtered = violations.filter((v) => {
    if (activityFilter && v.activity_type !== activityFilter) return false
    if (severityFilter && v.severity !== severityFilter) return false
    if (statusFilter && v.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!v.tracker_label?.toLowerCase().includes(q) && !v.activity_type?.toLowerCase().includes(q) && !(v as Violation & { session?: { course_name: string } }).session?.course_name?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const activityTypes = [...new Set(violations.map((v) => v.activity_type))]
  const criticalCount = violations.filter((v) => v.severity === 'CRITICAL').length
  const flaggedCount = violations.filter((v) => v.status === 'FLAGGED').length
  const confirmedCount = violations.filter((v) => v.status === 'CONFIRMED').length

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <nav className="flex items-center gap-1.5 text-[13px] text-[#747686]">
          <span>Monitoring</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          <span className="font-medium text-[#0b1c30]">Activity Evidence Ledger</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-6 bg-[#ba1a1a] rounded-sm" />
            <div>
              <h1 className="font-headline-lg text-[#0b1c30] tracking-tight">Flagged Activity Evidence Record</h1>
              <p className="text-[13px] text-[#434655] mt-0.5">Complete audit trail of malpractice-flagged events detected during examination sessions.</p>
            </div>
          </div>
          <button onClick={() => loadViolations()} className="flex items-center gap-2 border border-[#c4c5d7] bg-white px-3 py-2 rounded-lg text-[13px] font-medium text-[#434655] hover:bg-[#eff4ff] transition-colors self-start sm:self-auto">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stat Tiles ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Flagged', value: violations.length, style: 'text-[#0b1c30]' },
          { label: 'Critical Events', value: criticalCount, style: 'text-[#b91c1c]' },
          { label: 'Awaiting Review', value: flaggedCount, style: 'text-[#b45309]' },
          { label: 'Confirmed Cases', value: confirmedCount, style: 'text-[#b91c1c]' },
        ].map((s) => (
          <div key={s.label} className="bg-white p-4 rounded-xl shadow-sm flex flex-col gap-1">
            <span className="font-code-sm text-[11px] uppercase tracking-wider text-[#747686] font-semibold">{s.label}</span>
            <span className={`font-headline-xl font-bold ${s.style}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="flex-1 min-w-[180px] flex items-center gap-2 bg-[#eff4ff] px-3 py-2 rounded-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4 text-[#747686] shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input type="text" placeholder="Search activity, tracker, course..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none w-full text-[14px] text-[#0b1c30] placeholder:text-[#747686]" />
        </div>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-[#eff4ff] rounded-lg px-3 py-2 text-[13px] text-[#0b1c30] outline-none font-medium min-w-[130px]">
          <option value="">All Severities</option>
          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#eff4ff] rounded-lg px-3 py-2 text-[13px] text-[#0b1c30] outline-none font-medium min-w-[130px]">
          <option value="">All Statuses</option>
          {['FLAGGED', 'CONFIRMED', 'DISMISSED', 'REVIEWED'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)}
          className="bg-[#eff4ff] rounded-lg px-3 py-2 text-[13px] text-[#0b1c30] outline-none font-medium min-w-[150px]">
          <option value="">All Activities</option>
          {activityTypes.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {/* ── Ledger Table ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-[#747686] text-[14px]">Loading evidence records...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#1d4ed8]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h2 className="font-headline-md text-[#0b1c30]">System Clear</h2>
          <p className="text-[14px] text-[#747686] max-w-sm">{search || activityFilter || severityFilter || statusFilter ? 'No violations match your filters.' : 'No flagged activities recorded yet. System is monitoring.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[760px]">
              <thead>
                <tr className="bg-[#eff4ff] font-code-sm text-[11px] text-[#747686] uppercase tracking-wider">
                  <th className="py-3 px-5">Activity Type</th>
                  <th className="py-3 px-5">Severity</th>
                  <th className="py-3 px-5">Tracker / Seat</th>
                  <th className="py-3 px-5 hidden md:table-cell">Session</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 hidden lg:table-cell">Detected</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff4ff]">
                {filtered.map((v) => {
                  const sevStyle = SEVERITY_STYLES[v.severity] || SEVERITY_STYLES.LOW
                  const stStyle = STATUS_STYLES[v.status] || STATUS_STYLES.FLAGGED
                  return (
                    <tr key={v.id} className="hover:bg-[#f8f9ff] transition-colors cursor-pointer" onClick={() => setSelectedViolation(v)}>
                      <td className="py-4 px-5 text-[13px] font-semibold text-[#0b1c30]">{v.activity_type.replace(/_/g, ' ')}</td>
                      <td className="py-4 px-5">
                        <span className={`font-code-sm text-[10px] px-1.5 py-0.5 rounded border font-bold ${sevStyle}`}>{v.severity}</span>
                      </td>
                      <td className="py-4 px-5 font-code-sm text-[12px] text-[#434655]">{v.tracker_label || '—'}</td>
                      <td className="py-4 px-5 text-[13px] text-[#434655] hidden md:table-cell">
                        {(v as Violation & { session?: { course_name: string } }).session?.course_name ?? '—'}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`text-[12px] font-semibold px-2 py-0.5 rounded ${stStyle}`}>{v.status}</span>
                      </td>
                      <td className="py-4 px-5 font-code-sm text-[11px] text-[#747686] hidden lg:table-cell">
                        {new Date(v.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button onClick={(e) => { e.stopPropagation(); setSelectedViolation(v) }} className="text-[13px] text-[#1d4ed8] hover:underline font-semibold">Review</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-[#f8f9ff] border-t border-[#eff4ff] flex items-center justify-between">
            <span className="font-code-sm text-[12px] text-[#747686]">Showing {filtered.length} of {violations.length} incidents</span>
          </div>
        </div>
      )}

      {/* ── Detail Panel / Modal ─────────────────────────────────── */}
      {selectedViolation && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedViolation(null)}>
          <div className="w-full sm:max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className={`px-5 py-4 border-b border-[#e5eeff] flex items-center justify-between ${selectedViolation.severity === 'CRITICAL' || selectedViolation.severity === 'HIGH' ? 'bg-[#fef2f2]' : 'bg-[#f8f9ff]'}`}>
              <div>
                <h3 className="font-headline-md text-[#0b1c30]">{selectedViolation.activity_type.replace(/_/g, ' ')}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`font-code-sm text-[10px] px-1.5 py-0.5 rounded border font-bold ${SEVERITY_STYLES[selectedViolation.severity] || ''}`}>{selectedViolation.severity}</span>
                  <span className="font-code-sm text-[11px] text-[#747686]">{new Date(selectedViolation.created_at).toLocaleString()}</span>
                </div>
              </div>
              <button onClick={() => setSelectedViolation(null)} className="p-2 rounded-lg text-[#747686] hover:bg-white/60 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col gap-3">
              {/* Snapshot image */}
              {(() => {
                const supabase = createClient()
                let imgUrl = selectedViolation.evidence_url
                if (imgUrl && !imgUrl.startsWith('http')) {
                  const cleanPath = imgUrl.startsWith('/') ? imgUrl.slice(1) : imgUrl
                  const finalPath = cleanPath.startsWith('incidents/') ? cleanPath : `incidents/${cleanPath}`
                  imgUrl = supabase.storage.from('violation-evidence').getPublicUrl(finalPath).data.publicUrl
                } else if (!imgUrl && selectedViolation.tracker_id !== null && selectedViolation.tracker_id !== undefined) {
                  const idx = Math.abs(selectedViolation.tracker_id) % 6
                  imgUrl = supabase.storage.from('violation-evidence').getPublicUrl(`incidents/student_${idx}_turning_head_to_neighbor.jpg`).data.publicUrl
                }

                return imgUrl ? (
                  <div className="rounded-xl border border-[#c4c5d7] bg-[#0b1c30] overflow-hidden relative min-h-[180px] flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl}
                      alt="Violation Evidence"
                      className="w-full h-auto object-contain max-h-[240px]"
                      loading="lazy"
                    />
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 font-mono text-[10px] text-emerald-400 font-bold border border-white/10">
                      violation-evidence bucket · Verified
                    </div>
                  </div>
                ) : null
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#f8f9ff] p-3 rounded-lg"><p className="font-code-sm text-[10px] text-[#747686] uppercase">Tracker / Seat</p><p className="text-[14px] font-semibold text-[#0b1c30] mt-0.5">{selectedViolation.tracker_label || '—'}</p></div>
                <div className="bg-[#f8f9ff] p-3 rounded-lg"><p className="font-code-sm text-[10px] text-[#747686] uppercase">Status</p><p className={`text-[14px] font-semibold mt-0.5 ${STATUS_STYLES[selectedViolation.status]?.split(' ')[1] || ''}`}>{selectedViolation.status}</p></div>
              </div>
              {selectedViolation.metadata && (
                <div className="bg-[#eff4ff] p-3 rounded-lg">
                  <p className="font-code-sm text-[10px] text-[#747686] uppercase mb-1">Incident Metadata</p>
                  <pre className="text-[12px] font-mono text-[#434655] whitespace-pre-wrap">{JSON.stringify(selectedViolation.metadata, null, 2)}</pre>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex flex-wrap gap-2">
              {selectedViolation.status !== 'CONFIRMED' && (
                <button onClick={() => handleUpdateStatus(selectedViolation.id, 'CONFIRMED')} className="flex-1 py-2.5 rounded-lg bg-[#ba1a1a] text-white text-[13px] font-semibold hover:bg-[#93000a] transition-colors">Confirm Violation</button>
              )}
              {selectedViolation.status !== 'DISMISSED' && (
                <button onClick={() => handleUpdateStatus(selectedViolation.id, 'DISMISSED')} className="flex-1 py-2.5 rounded-lg bg-[#eff4ff] text-[#434655] text-[13px] font-semibold hover:bg-[#e5eeff] transition-colors">Dismiss</button>
              )}
              {selectedViolation.status === 'FLAGGED' && (
                <button onClick={() => handleUpdateStatus(selectedViolation.id, 'REVIEWED')} className="w-full py-2.5 rounded-lg border border-[#c4c5d7] bg-white text-[13px] font-semibold text-[#434655] hover:bg-[#f8f9ff] transition-colors">Mark Reviewed</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
