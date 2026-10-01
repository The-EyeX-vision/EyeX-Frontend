'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { endMonitoringSession, createSimulatedAlert } from '@/app/actions/monitoring'
import type { MonitoringSession, Exam, Alert, AlertEventType } from '@/types'

interface Props {
  session: MonitoringSession
  exam: Exam
  initialAlerts: Alert[]
  schoolName: string
}

// Play pleasant web audio chime on alert
function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15) // A5
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
  initialAlerts,
  schoolName,
}: Props) {
  const router = useRouter()
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts)
  const [sessionStatus, setSessionStatus] = useState(session.status)
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
        (payload) => {
          const newAlert = payload.new as Alert
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
          const updatedAlert = payload.new as Alert
          setAlerts((prev) =>
            prev.map((a) => (a.id === updatedAlert.id ? { ...a, ...updatedAlert } : a))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.id, soundEnabled])

  // Build a deduplicated tracker map: trackerId → latest FLAGGED alert
  const trackerAlertMap = new Map<string, Alert>()
  alerts.forEach((alert) => {
    const key = alert.tracker_id ?? `unknown-${alert.id}`
    if (!trackerAlertMap.has(key) && alert.status === 'FLAGGED') {
      trackerAlertMap.set(key, alert)
    }
  })

  const uniqueTrackerIds = Array.from(
    new Set(alerts.map((a) => a.tracker_id).filter(Boolean) as string[])
  )

  const totalDetected = uniqueTrackerIds.length
  const flaggedCount = trackerAlertMap.size
  const expectedStudents = exam.expected_students ?? 0

  // Simulation handler — no student targeting; uses tracker IDs from CV
  async function triggerSimulation(eventType: AlertEventType) {
    setSimError(null)
    setSimulating(true)
    try {
      const res = await createSimulatedAlert(session.id, eventType, null)
      if ('error' in res && res.error) {
        setSimError(res.error)
      }
    } catch (err: unknown) {
      setSimError(err instanceof Error ? err.message : 'Simulation failed')
    } finally {
      setSimulating(false)
    }
  }

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
    <div className="flex flex-col h-full bg-gray-950 text-gray-100">
      {/* ── TOP BAR ── */}
      <header className="flex-shrink-0 border-b border-gray-800 bg-gray-900/90 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/monitoring"
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            ← Monitoring
          </Link>
          <span className="text-gray-700">/</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white">{exam.title}</h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-gray-800 text-teal-300 border border-gray-700">
                Room {exam.room_number}
              </span>
            </div>
            <p className="text-xs text-gray-400">{schoolName}</p>
          </div>
        </div>

        {/* Live status & elapsed time */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-800 bg-gray-950 text-xs font-mono">
            {sessionStatus === 'active' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-semibold">LIVE</span>
                <span className="text-gray-600">|</span>
                <span className="text-gray-300 font-medium">Elapsed: {elapsed}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-gray-500" />
                <span className="text-gray-400 uppercase font-semibold">{sessionStatus}</span>
              </>
            )}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute alert sounds' : 'Enable alert sounds'}
            className="p-1.5 rounded-lg border border-gray-800 hover:border-gray-700 bg-gray-950 text-gray-400 hover:text-white transition-colors text-xs flex items-center gap-1"
          >
            {soundEnabled ? '🔔 Sound ON' : '🔕 Muted'}
          </button>

          {/* End Session Button */}
          {sessionStatus === 'active' && (
            <button
              onClick={handleEndSession}
              disabled={isEnding}
              className="px-3.5 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm"
            >
              {isEnding ? 'Ending Session…' : 'End Session'}
            </button>
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left / Center: Camera HUD & Detection Summary (8 cols) */}
        <div className="lg:col-span-8 flex flex-col border-r border-gray-800 overflow-y-auto p-5 space-y-5">
          {/* CAMERA FEED PLACEHOLDER */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/90 overflow-hidden flex flex-col justify-between shadow-lg">
            {/* Cam Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-gray-950/80 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-gray-200 font-semibold">
                  CAM-01 • {exam.title} (Overhead Wide)
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                <span>1080p • 30 FPS</span>
                <span className="text-teal-400 font-bold bg-teal-950/60 border border-teal-800 px-2 py-0.5 rounded">
                  FEED ACTIVE
                </span>
              </div>
            </div>

            {/* Video Canvas Simulation Area */}
            <div className="relative min-h-[340px] flex flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
              {/* Surveillance Grid Lines Overlay */}
              <div className="absolute inset-0 opacity-10 pointer-events-none grid grid-cols-6 grid-rows-4 divide-x divide-y divide-teal-500" />

              {/* Center Camera Placeholder Box */}
              <div className="relative z-10 text-center max-w-md p-6 rounded-2xl border border-dashed border-gray-700 bg-gray-950/80 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-full bg-teal-950/80 border border-teal-700/80 text-teal-400 flex items-center justify-center mx-auto mb-3 text-xl shadow-inner">
                  📹
                </div>
                <h3 className="font-mono text-sm font-bold tracking-widest text-gray-200 uppercase">
                  LIVE CAMERA
                </h3>
                <p className="mt-1 text-xs text-teal-400/90 font-mono tracking-wide">
                  Model integration pending
                </p>
                <div className="mt-4 pt-3 border-t border-gray-800/80 text-[11px] text-gray-500 leading-relaxed font-sans">
                  The Computer Vision engine will attach directly to this stream. When anomalies are detected, alerts broadcast instantly to this console via tracker IDs.
                </div>
              </div>

              {/* Simulated HUD elements */}
              <div className="absolute bottom-3 left-4 text-[10px] font-mono text-gray-500 flex items-center gap-4">
                <span>Centroid Tracker: v2.4</span>
                <span>Pose: Standard Baseline</span>
              </div>
              <div className="absolute bottom-3 right-4 text-[10px] font-mono text-gray-500">
                FOV: 110° Hall Wide
              </div>
            </div>

            {/* Cam Footer */}
            <div className="p-2.5 border-t border-gray-800 bg-gray-950/60 flex items-center justify-between text-[11px] font-mono text-gray-400">
              <span>Station ID: {session.id.slice(0, 8)}</span>
              <span className="text-emerald-400">Realtime Channel: Connected</span>
            </div>
          </div>

          {/* ── SIMULATED DETECTION SYSTEM (DEV ONLY) ── */}
          <div className="rounded-xl border border-amber-900/60 bg-amber-950/15 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-900/60 border border-amber-700 text-amber-300 text-[10px] font-mono font-bold">
                  DEV MODE
                </span>
                <h3 className="text-xs font-bold text-amber-200 tracking-wide uppercase">
                  Simulated Detection System
                </h3>
              </div>
              <span className="text-[11px] text-amber-400/70">
                Writes genuine records to Supabase &amp; triggers Realtime
              </span>
            </div>

            {simError && (
              <div className="rounded-lg border border-red-800 bg-red-950/50 p-2.5 text-xs text-red-300">
                {simError}
              </div>
            )}

            {/* Simulation Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => triggerSimulation('PHONE_DETECTED')}
                disabled={simulating || sessionStatus !== 'active'}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-950/60 hover:bg-red-900/70 border border-red-800/80 text-red-200 text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                📱 Phone Detection
              </button>

              <button
                type="button"
                onClick={() => triggerSimulation('SUSPICIOUS_MOVEMENT')}
                disabled={simulating || sessionStatus !== 'active'}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-950/60 hover:bg-amber-900/70 border border-amber-800/80 text-amber-200 text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                🔄 Movement Anomaly
              </button>

              <button
                type="button"
                onClick={() => triggerSimulation('POSSIBLE_COMMUNICATION')}
                disabled={simulating || sessionStatus !== 'active'}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/70 border border-indigo-800/80 text-indigo-200 text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                💬 Communication
              </button>

              <button
                type="button"
                onClick={() => triggerSimulation('UNAUTHORIZED_MATERIAL')}
                disabled={simulating || sessionStatus !== 'active'}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-800/80 text-rose-200 text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                📄 Unauthorized Material
              </button>
            </div>
          </div>

          {/* ── DETECTION SUMMARY ── */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide uppercase">
                  Detection Summary
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  CV tracker IDs detected by the model. Flags update in real time.
                </p>
              </div>

              {/* Counters */}
              <div className="flex items-center gap-3 text-xs">
                <div className="px-3 py-1.5 rounded-lg border border-gray-800 bg-gray-900/80 text-gray-300">
                  Expected: <strong className="text-white">{expectedStudents}</strong>
                </div>
                <div className="px-3 py-1.5 rounded-lg border border-teal-900/60 bg-teal-950/30 text-teal-400">
                  Currently Detected: <strong className="text-white">{totalDetected}</strong>
                </div>
                <div className="px-3 py-1.5 rounded-lg border border-red-900/60 bg-red-950/40 text-red-300">
                  Flagged: <strong className="text-white">{flaggedCount}</strong>
                </div>
              </div>
            </div>

            {/* Active Tracker Cards */}
            {uniqueTrackerIds.length === 0 ? (
              <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-8 text-center text-gray-500 text-xs">
                No tracker IDs detected yet.
                <div className="mt-2 text-gray-600">
                  Tracker IDs will appear here once the CV model is connected and detects people in the examination room.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {uniqueTrackerIds.map((trackerId) => {
                  const activeAlert = trackerAlertMap.get(trackerId)
                  const isFlagged = !!activeAlert

                  return (
                    <div
                      key={trackerId}
                      className={`rounded-xl p-3 border transition-all ${
                        isFlagged
                          ? 'border-red-500 bg-red-950/40 shadow-lg shadow-red-950/60'
                          : 'border-gray-800 bg-gray-900/60 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-mono text-[11px] text-teal-400 bg-teal-950 px-1.5 py-0.5 rounded border border-teal-900">
                          {trackerId}
                        </span>
                        {isFlagged ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-950 px-2 py-0.5 rounded-full border border-red-700 animate-pulse">
                            🔴 FLAGGED
                          </span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Normal" />
                        )}
                      </div>

                      {isFlagged && (
                        <div className="mt-2.5 pt-2 border-t border-red-800/60 text-[10px] text-red-200">
                          <p className="font-semibold text-red-300">
                            {activeAlert.event_type.replace(/_/g, ' ')}
                          </p>
                          <p className="text-red-400/90 font-mono mt-0.5">
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
        <div className="lg:col-span-4 flex flex-col bg-gray-900/40 overflow-hidden h-full">
          {/* Panel Header */}
          <div className="p-4 border-b border-gray-800 bg-gray-950/60 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-200">
                Live Alerts Stream
              </h2>
            </div>
            <span className="text-[11px] font-mono text-gray-400">
              {alerts.length} incident{alerts.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Alerts List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {alerts.length === 0 ? (
              <div className="py-16 text-center text-gray-500 text-xs">
                <span className="text-2xl block mb-2">🛡️</span>
                No alerts detected for this session yet.
                <p className="text-[11px] text-gray-600 mt-1">
                  Use the DEV MODE panel on the left to simulate incident detections.
                </p>
              </div>
            ) : (
              alerts.map((alert) => {
                const sevColor =
                  alert.severity === 'CRITICAL'
                    ? 'border-red-600 bg-red-950/50 text-red-300'
                    : alert.severity === 'HIGH'
                    ? 'border-rose-700 bg-rose-950/40 text-rose-300'
                    : alert.severity === 'MEDIUM'
                    ? 'border-amber-700 bg-amber-950/40 text-amber-300'
                    : 'border-blue-700 bg-blue-950/40 text-blue-300'

                return (
                  <div
                    key={alert.id}
                    className={`rounded-xl border p-3.5 space-y-2 transition-all shadow-sm ${sevColor}`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold uppercase tracking-wider font-mono">
                        {alert.event_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] opacity-75 font-mono">
                        {new Date(alert.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-white font-mono">
                          {alert.tracker_id ?? 'Tracker Unknown'}
                        </p>
                        <p className="text-[11px] opacity-75 uppercase tracking-wide">
                          CV Tracker ID
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-xs">
                          {Math.round(alert.confidence * 100)}%
                        </span>
                        <p className="text-[10px] uppercase opacity-75">{alert.severity}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
                      <span className="font-mono uppercase opacity-75">Status: {alert.status}</span>
                      <Link
                        href="/alerts"
                        className="hover:underline font-semibold"
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
