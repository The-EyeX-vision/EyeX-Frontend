'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { endMonitoringSession, createSimulatedAlert } from '@/app/actions/monitoring'
import type { MonitoringSession, Exam, ExamStudent, Alert, AlertEventType } from '@/types'

interface Props {
  session: MonitoringSession
  exam: Exam
  examStudents: ExamStudent[]
  initialAlerts: Alert[]
  schoolName: string
}

// Play pleasant web audio chime on alert
function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
  } catch {
    // Ignore audio context errors if blocked by browser policy
  }
}

export function LiveMonitoringConsole({
  session,
  exam,
  examStudents,
  initialAlerts,
  schoolName,
}: Props) {
  const router = useRouter()
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts)
  const [sessionStatus, setSessionStatus] = useState(session.status)
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [simError, setSimError] = useState<string | null>(null)
  const [simulating, setSimulating] = useState(false)
  const [isEnding, startEnding] = useTransition()
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Track elapsed time
  const [elapsed, setElapsed] = useState<string>(
    sessionStatus === 'active' ? '00:00:00' : 'Completed'
  )

  useEffect(() => {
    if (sessionStatus !== 'active') return

    const start = new Date(session.started_at).getTime()

    const updateTimer = () => {
      const now = Date.now()
      const diffSec = Math.max(0, Math.floor((now - start) / 1000))
      const hrs = String(Math.floor(diffSec / 3600)).padStart(2, '0')
      const mins = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0')
      const secs = String(diffSec % 60).padStart(2, '0')
      setElapsed(`${hrs}:${mins}:${secs}`)
    }

    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [session.started_at, sessionStatus])

  // Real-time alerts subscription
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current

    const channel = supabase
      .channel(`session-alerts-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `monitoring_session_id=eq.${session.id}`,
        },
        async (payload) => {
          const newAlert = payload.new as Alert

          if (newAlert.student_id) {
            const { data: student } = await supabase
              .from('students')
              .select('*')
              .eq('id', newAlert.student_id)
              .maybeSingle()

            newAlert.student = student ?? undefined
          }

          setAlerts((prev) => [newAlert, ...prev])
          if (soundEnabled) playChime()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts',
          filter: `monitoring_session_id=eq.${session.id}`,
        },
        (payload) => {
          const updated = payload.new as Alert
          setAlerts((prev) =>
            prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.id, soundEnabled])

  // Simulation handler
  async function triggerSimulation(eventType: AlertEventType) {
    if (sessionStatus !== 'active') return
    setSimulating(true)
    setSimError(null)

    const randomStudent =
      examStudents.length > 0
        ? examStudents[Math.floor(Math.random() * examStudents.length)]
        : null

    const studentIdToUse = selectedStudentId || randomStudent?.student_id || null

    const res = await createSimulatedAlert(session.id, eventType, studentIdToUse)

    if ('error' in res) setSimError(res.error)
    setSimulating(false)
  }

  // Calculate stats
  const totalStudents = examStudents.length
  const studentAlertMap = new Map<string, Alert>()
  alerts.forEach((alert) => {
    if (alert.student_id && !studentAlertMap.has(alert.student_id)) {
      studentAlertMap.set(alert.student_id, alert)
    }
  })

  const flaggedStudentsCount = Array.from(studentAlertMap.values()).filter(
    (a) => a.status === 'FLAGGED'
  ).length
  const activeStudents = Math.max(0, totalStudents - flaggedStudentsCount)

  // End session handler
  function handleEndSession() {
    if (!confirm('Are you sure you want to end this monitoring session? This will mark the session as completed.')) {
      return
    }

    startEnding(async () => {
      const res = await endMonitoringSession(session.id)
      if (res.error) {
        alert(res.error)
      } else {
        setSessionStatus('completed')
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col h-full bg-[#f8f9ff] text-[#0b1c30] antialiased">
      {/* ── TOP BAR ── */}
      <header className="flex-shrink-0 border-b border-[#c4c5d7] bg-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-4" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center gap-3">
          <Link
            href="/monitoring"
            className="text-[13px] text-[#747686] hover:text-[#0b1c30] transition-colors"
          >
            ← Monitoring Hub
          </Link>
          <span className="text-[#c4c5d7]">/</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[16px] font-bold text-[#0b1c30]">{exam.title}</h1>
              <span className="px-2 py-0.5 rounded font-code-sm text-[11px] font-bold bg-[#eff4ff] text-[#0037b0] border border-[#bbd6ff]">
                Room {exam.room_number}
              </span>
            </div>
            <p className="text-[12px] text-[#747686]">{schoolName}</p>
          </div>
        </div>

        {/* Live status & elapsed time */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#c4c5d7] bg-white text-[12px] font-mono">
            {sessionStatus === 'active' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700 font-bold">LIVE</span>
                <span className="text-[#c4c5d7]">|</span>
                <span className="text-[#0b1c30] font-semibold">Elapsed: {elapsed}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-[#747686] uppercase font-semibold">{sessionStatus}</span>
              </>
            )}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute alert sounds' : 'Enable alert sounds'}
            className="p-2 rounded-lg border border-[#c4c5d7] hover:bg-[#eff4ff] bg-white text-[#434655] transition-colors text-[12px] flex items-center gap-1.5"
          >
            {soundEnabled ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4 text-emerald-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <span>Sound ON</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4 text-[#747686]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
                <span>Muted</span>
              </>
            )}
          </button>

          {/* End Session Button */}
          {sessionStatus === 'active' && (
            <button
              onClick={handleEndSession}
              disabled={isEnding}
              className="px-4 py-2 rounded-lg bg-[#ba1a1a] hover:bg-[#93000a] text-white text-[13px] font-semibold disabled:opacity-50 transition-colors shadow-sm"
            >
              {isEnding ? 'Ending Session…' : 'End Session'}
            </button>
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT (Split View: Camera + Live Alerts) ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left / Center: Camera HUD & Student Seating (8 cols) */}
        <div className="lg:col-span-8 flex flex-col border-r border-[#c4c5d7] overflow-y-auto p-5 space-y-5">
          {/* CAMERA FEED PLACEHOLDER */}
          <div className="rounded-2xl border border-[#e5eeff] bg-white overflow-hidden flex flex-col justify-between shadow-sm">
            {/* Cam Header */}
            <div className="flex items-center justify-between p-3 border-b border-[#e5eeff] bg-[#eff4ff] font-code-sm text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[#0b1c30] font-bold">
                  CAM-01 • {exam.title} (Overhead Wide)
                </span>
              </div>
              <div className="flex items-center gap-3 text-[#466083]">
                <span>1080p • 30 FPS</span>
                <span className="text-[#0037b0] font-bold bg-[#dce9ff] px-2 py-0.5 rounded">
                  FEED ACTIVE
                </span>
              </div>
            </div>

            {/* Video Canvas Simulation Area */}
            <div className="relative min-h-[320px] flex flex-col items-center justify-center p-8 bg-gradient-to-b from-[#eff4ff] via-white to-[#eff4ff]">
              {/* Surveillance Grid Lines Overlay */}
              <div className="absolute inset-0 opacity-15 pointer-events-none grid grid-cols-6 grid-rows-4 divide-x divide-y divide-[#1d4ed8]" />

              {/* Center Camera Placeholder Box */}
              <div className="relative z-10 text-center max-w-md p-6 rounded-2xl border border-[#c4c5d7] bg-white/90 backdrop-blur-sm shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-[#eff4ff] text-[#0037b0] flex items-center justify-center mx-auto mb-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-7.5A2.25 2.25 0 0013.5 6.75h-9a2.25 2.25 0 00-2.25 2.25v7.5A2.25 2.25 0 004.5 18.75z" />
                  </svg>
                </div>
                <h3 className="font-code-sm text-[12px] font-bold tracking-widest text-[#0b1c30] uppercase">
                  LIVE EXAMINATION CAMERA
                </h3>
                <p className="mt-1 text-[12px] text-[#0037b0] font-mono tracking-wide font-semibold">
                  Autonomous Pose &amp; Object Detection Active
                </p>
                <div className="mt-4 pt-3 border-t border-[#e5eeff] text-[11px] text-[#747686] leading-relaxed font-sans">
                  The Computer Vision engine monitors this stream passively. When behavioral flags are raised, incidents broadcast immediately to this dashboard.
                </div>
              </div>

              {/* Simulated HUD elements */}
              <div className="absolute bottom-3 left-4 font-code-sm text-[10px] text-[#747686] flex items-center gap-4">
                <span>Centroid Tracker: v2.4</span>
                <span>Pose: Standard Baseline</span>
              </div>
              <div className="absolute bottom-3 right-4 font-code-sm text-[10px] text-[#747686]">
                FOV: 110° Hall Wide
              </div>
            </div>

            {/* Cam Footer */}
            <div className="p-2.5 border-t border-[#e5eeff] bg-[#f8f9ff] flex items-center justify-between font-code-sm text-[11px] text-[#747686]">
              <span>Station ID: {session.id.slice(0, 8)}</span>
              <span className="text-emerald-700 font-semibold">Realtime Channel: Connected</span>
            </div>
          </div>

          {/* ── SIMULATED DETECTION SYSTEM (DEV ONLY) ── */}
          <div className="rounded-2xl border border-amber-200 bg-[#fffbeb] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-800 font-code-sm text-[10px] font-bold">
                  DEV MODE
                </span>
                <h3 className="text-[12px] font-bold text-amber-900 tracking-wide uppercase">
                  Simulated Detection System
                </h3>
              </div>
              <span className="font-code-sm text-[11px] text-amber-800">
                Writes genuine records to Supabase &amp; triggers Realtime
              </span>
            </div>

            {simError && (
              <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] p-2.5 text-[12px] text-[#b91c1c]">
                {simError}
              </div>
            )}

            {/* Target Student Selection */}
            {examStudents.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <label htmlFor="target-student" className="text-[#466083] text-[12px] flex-shrink-0 font-medium">
                  Target candidate:
                </label>
                <select
                  id="target-student"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-[#c4c5d7] bg-white text-[12px] text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#1d4ed8]"
                >
                  <option value="">Random Assigned Student</option>
                  {examStudents.map((es) => (
                    <option key={es.student_id} value={es.student_id}>
                      {es.student?.student_number} — {es.student?.full_name} ({es.seat_number || 'No Seat'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Simulation Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => triggerSimulation('PHONE_DETECTED')}
                disabled={simulating || sessionStatus !== 'active'}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-[12px] font-semibold disabled:opacity-50 transition-colors shadow-xs"
              >
                <span>Phone Detection</span>
              </button>

              <button
                type="button"
                onClick={() => triggerSimulation('SUSPICIOUS_MOVEMENT')}
                disabled={simulating || sessionStatus !== 'active'}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-[#fff7ed] border border-[#fed7aa] text-[#c2410c] text-[12px] font-semibold disabled:opacity-50 transition-colors shadow-xs"
              >
                <span>Movement Anomaly</span>
              </button>

              <button
                type="button"
                onClick={() => triggerSimulation('POSSIBLE_COMMUNICATION')}
                disabled={simulating || sessionStatus !== 'active'}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-[#eff4ff] border border-[#bbd6ff] text-[#0037b0] text-[12px] font-semibold disabled:opacity-50 transition-colors shadow-xs"
              >
                <span>Communication</span>
              </button>

              <button
                type="button"
                onClick={() => triggerSimulation('UNAUTHORIZED_MATERIAL')}
                disabled={simulating || sessionStatus !== 'active'}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-[#fef2f2] border border-[#fecaca] text-[#ba1a1a] text-[12px] font-semibold disabled:opacity-50 transition-colors shadow-xs"
              >
                <span>Unauthorized Material</span>
              </button>
            </div>
          </div>

          {/* ── STUDENT MONITORING SUMMARY & SEATING GRID ── */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-code-sm text-[11px] font-bold text-[#466083] tracking-wide uppercase">
                  Candidate Seating &amp; Proctor Matrix
                </h2>
                <p className="text-[12px] text-[#747686] mt-0.5">
                  Visual flags update instantaneously when incidents occur.
                </p>
              </div>

              {/* Counters */}
              <div className="flex items-center gap-3 text-xs">
                <div className="px-3 py-1 rounded-lg border border-[#c4c5d7] bg-white text-[#434655]">
                  Total: <strong className="text-[#0b1c30]">{totalStudents}</strong>
                </div>
                <div className="px-3 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800">
                  Active: <strong className="text-emerald-900">{activeStudents}</strong>
                </div>
                <div className="px-3 py-1 rounded-lg border border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]">
                  Flagged: <strong className="text-[#b91c1c]">{flaggedStudentsCount}</strong>
                </div>
              </div>
            </div>

            {/* Students Cards */}
            {examStudents.length === 0 ? (
              <div className="rounded-xl border border-[#e5eeff] bg-white p-8 text-center text-[#747686] text-[13px] shadow-sm">
                No students currently assigned to this examination.
                <div className="mt-2">
                  <Link href={`/exams/${exam.id}`} className="text-[#1d4ed8] hover:underline font-semibold">
                    Assign candidates on Exam Details page &rarr;
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {examStudents.map((es) => {
                  const student = es.student
                  const activeAlert = studentAlertMap.get(es.student_id)
                  const isFlagged = activeAlert && activeAlert.status === 'FLAGGED'

                  return (
                    <div
                      key={es.id}
                      className={`rounded-xl p-3 border transition-all ${
                        isFlagged
                          ? 'border-[#ba1a1a] bg-[#fef2f2] shadow-sm'
                          : 'border-[#e5eeff] bg-white hover:border-[#bbd6ff]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-mono text-[10px] text-[#0037b0] bg-[#eff4ff] px-1.5 py-0.5 rounded border border-[#bbd6ff]">
                          {es.seat_number ? `Seat ${es.seat_number}` : 'No Seat'}
                        </span>
                        {isFlagged ? (
                          <span className="flex items-center gap-1 font-code-sm text-[10px] font-bold text-[#b91c1c] bg-[#fef2f2] px-2 py-0.5 rounded-full border border-[#fecaca] animate-pulse">
                            FLAGGED
                          </span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Normal" />
                        )}
                      </div>

                      <p className="text-[13px] font-bold text-[#0b1c30] mt-2 truncate">
                        {student?.full_name ?? 'Candidate'}
                      </p>
                      <p className="font-code-sm text-[11px] text-[#747686] truncate">
                        {student?.student_number ?? '—'}
                      </p>

                      {isFlagged && (
                        <div className="mt-2.5 pt-2 border-t border-[#fecaca] text-[10px]">
                          <p className="font-semibold text-[#b91c1c]">
                            {activeAlert.event_type.replace(/_/g, ' ')}
                          </p>
                          <p className="text-[#b91c1c]/80 font-mono mt-0.5">
                            {Math.round(activeAlert.confidence * 100)}% confidence
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Alerts Panel (4 cols) */}
        <div className="lg:col-span-4 flex flex-col bg-white border-t lg:border-t-0 border-[#c4c5d7] overflow-hidden h-full">
          {/* Panel Header */}
          <div className="p-4 border-b border-[#e5eeff] bg-[#f8f9ff] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <h2 className="font-code-sm text-[11px] font-bold uppercase tracking-wider text-[#0b1c30]">
                Live Alerts Stream
              </h2>
            </div>
            <span className="font-code-sm text-[11px] text-[#747686]">
              {alerts.length} incident{alerts.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Alerts List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {alerts.length === 0 ? (
              <div className="py-16 text-center text-[#747686] text-[13px]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-[#c4c5d7] mx-auto mb-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                No alerts detected for this session yet.
                <p className="text-[11px] text-[#747686] mt-1">
                  Use the DEV MODE panel on the left to simulate incident detections.
                </p>
              </div>
            ) : (
              alerts.map((alert) => {
                const sevColor =
                  alert.severity === 'CRITICAL'
                    ? 'border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]'
                    : alert.severity === 'HIGH'
                    ? 'border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]'
                    : alert.severity === 'MEDIUM'
                    ? 'border-[#fde68a] bg-[#fffbeb] text-[#b45309]'
                    : 'border-[#bbd6ff] bg-[#eff4ff] text-[#0037b0]'

                return (
                  <div
                    key={alert.id}
                    className={`rounded-xl border p-3.5 space-y-2 transition-all shadow-xs ${sevColor}`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold uppercase tracking-wider font-mono">
                        {alert.event_type.replace(/_/g, ' ')}
                      </span>
                      <span className="font-code-sm text-[10px] opacity-75">
                        {new Date(alert.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-[#0b1c30]">
                          {alert.student?.full_name ?? 'Unassigned Student'}
                        </p>
                        <p className="font-code-sm text-[11px] opacity-75">
                          {alert.student?.student_number ?? 'Desk Unknown'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-code-sm font-bold text-[12px]">
                          {Math.round(alert.confidence * 100)}%
                        </span>
                        <p className="font-code-sm text-[10px] uppercase opacity-75">{alert.severity}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-black/5 flex items-center justify-between text-[11px]">
                      <span className="font-code-sm uppercase opacity-75">Status: {alert.status}</span>
                      <Link
                        href="/alerts"
                        className="hover:underline font-semibold text-[#1d4ed8]"
                      >
                        Inspect Details &rarr;
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
