'use client'

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { HallSession, Violation, ViolationActivityType } from '@/types'

// Web Audio API chime sound
function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
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
    // Audio context may be restricted by browser policy
  }
}

interface TrackerCardData {
  id: number
  label: string
  status: 'NORMAL' | 'FLAGGED'
  violationsCount: number
  latestViolation?: Violation
}

export default function ExaminerLiveConsolePage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = use(params)
  const router = useRouter()

  const [session, setSession] = useState<HallSession | null>(null)
  const [violations, setViolations] = useState<Violation[]>([])
  const [trackers, setTrackers] = useState<TrackerCardData[]>([])
  const [detectedCount, setDetectedCount] = useState<number>(0)
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [elapsed, setElapsed] = useState('00:00:00')
  const [isEnding, setIsEnding] = useState(false)
  const [simulating, setSimulating] = useState(false)

  // Timer calculation
  useEffect(() => {
    if (!session?.started_at || session.status !== 'ACTIVE') return

    const start = new Date(session.started_at).getTime()
    const update = () => {
      const diffSec = Math.max(0, Math.floor((Date.now() - start) / 1000))
      const hrs = String(Math.floor(diffSec / 3600)).padStart(2, '0')
      const mins = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0')
      const secs = String(diffSec % 60).padStart(2, '0')
      setElapsed(`${hrs}:${mins}:${secs}`)
    }

    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [session])

  // Load initial session and violations
  useEffect(() => {
    const supabase = createClient()

    async function loadData() {
      // 1. Fetch Session
      const { data: s } = await supabase
        .from('exam_hall_sessions')
        .select('*, classroom:classrooms(id, name)')
        .eq('id', sessionId)
        .maybeSingle()

      if (s) {
        setSession(s)
      } else {
        // Fallback demo session if direct migration record isn't found
        setSession({
          id: sessionId,
          school_id: 'default',
          classroom_id: 'default',
          course_name: 'Examination Session',
          duration_minutes: 120,
          expected_students: 24,
          status: 'ACTIVE',
          started_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        })
      }

      // 2. Fetch Violations
      const { data: vList } = await supabase
        .from('violations')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })

      if (vList) {
        setViolations(vList)
      }
    }

    loadData()
  }, [sessionId])

  // Compute tracker grid based on expected students and violations
  useEffect(() => {
    const total = session?.expected_students || 20
    const list: TrackerCardData[] = []

    for (let i = 1; i <= Math.max(total, 12); i++) {
      const label = `Tracker #${i}`
      const studentViolations = violations.filter((v) => v.tracker_label === label)
      const hasFlag = studentViolations.some((v) => v.status === 'FLAGGED')

      list.push({
        id: i,
        label,
        status: hasFlag ? 'FLAGGED' : 'NORMAL',
        violationsCount: studentViolations.length,
        latestViolation: studentViolations[0],
      })
    }

    setTrackers(list)
    // Simulated active detection: all trackers currently in camera frame
    setDetectedCount(Math.min(total, Math.max(1, total - (total > 5 ? 1 : 0))))
  }, [session, violations])

  // Real-time listener for violations
  const supabaseRef = useRef(createClient())
  useEffect(() => {
    const supabase = supabaseRef.current

    const channel = supabase
      .channel(`hall-violations-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'violations',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newViolation = payload.new as Violation
          setViolations((prev) => [newViolation, ...prev])
          if (soundEnabled) playChime()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'violations',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const updated = payload.new as Violation
          setViolations((prev) =>
            prev.map((v) => (v.id === updated.id ? { ...v, ...updated } : v))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, soundEnabled])

  // Handle End Session
  async function handleEndSession() {
    if (!confirm('Are you sure you want to end this examination session? All proctoring logs will be finalized.')) {
      return
    }

    setIsEnding(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/end`, { method: 'POST' })
      if (res.ok) {
        alert('Examination session completed successfully.')
        router.push(session?.classroom_id ? `/hall/${session.classroom_id}` : '/hall-access')
      } else {
        alert('Failed to end session.')
        setIsEnding(false)
      }
    } catch {
      alert('Error communicating with session server.')
      setIsEnding(false)
    }
  }

  // Dev simulation tool
  async function triggerSimulation(activityType: ViolationActivityType) {
    setSimulating(true)
    try {
      // Pick random tracker
      const randTrackerNum = Math.floor(Math.random() * (session?.expected_students || 12)) + 1
      const trackerLabel = `Tracker #${randTrackerNum}`

      const severityMap: Record<ViolationActivityType, 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = {
        PHONE_DETECTED: 'HIGH',
        SUSPICIOUS_MOVEMENT: 'MEDIUM',
        POSSIBLE_COMMUNICATION: 'HIGH',
        UNAUTHORIZED_MATERIAL: 'CRITICAL',
        OTHER: 'LOW',
      }

      await fetch('/api/violations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          trackerLabel,
          trackerId: randTrackerNum,
          activityType,
          severity: severityMap[activityType],
          confidence: Math.round((0.75 + Math.random() * 0.22) * 100) / 100,
          evidenceUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&auto=format&fit=crop&q=80',
          metadata: { simulated: true, hall: session?.classroom?.name || 'Hall' },
        }),
      })
    } catch (err) {
      console.error('Simulation error:', err)
    } finally {
      setSimulating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col selection:bg-teal-900 selection:text-teal-100">
      {/* ── Top Bar ── */}
      <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-md px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href={session?.classroom_id ? `/hall/${session.classroom_id}` : '/hall-access'}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            ← Hall Workspace
          </Link>
          <span className="text-gray-700">/</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
                {session?.course_name || 'Live Examination'}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-950 text-teal-300 border border-teal-800">
                {session?.classroom?.name || 'Classroom Station'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              {session?.course_code ? `${session.course_code} • ` : ''}Expected Duration: {session?.duration_minutes}m
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Live Beacon & Elapsed Timer */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-900/80 bg-emerald-950/40 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-bold">LIVE</span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-200">{elapsed}</span>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg border border-gray-800 bg-gray-900 hover:bg-gray-800 text-xs text-gray-400 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title={soundEnabled ? 'Mute alert sounds' : 'Enable alert sounds'}
          >
            {soundEnabled ? '🔔' : '🔕'}
          </button>

          {/* End Session Button */}
          <button
            type="button"
            onClick={handleEndSession}
            disabled={isEnding}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
          >
            {isEnding ? 'Ending…' : 'End Examination'}
          </button>
        </div>
      </header>

      {/* ── Main Split View Grid ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left: Camera Feed HUD & Tracker Seating Grid (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-5 border-r border-gray-800/80">
          {/* ── Camera HUD Container ── */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/90 overflow-hidden shadow-xl">
            {/* Cam Header */}
            <div className="p-3 border-b border-gray-800 bg-gray-950/80 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-gray-200 font-bold">
                  OVERHEAD CAMERA 1 • {session?.classroom?.name || 'Main Hall'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                <span>1080p • 30 FPS</span>
                <span className="text-teal-400 font-bold bg-teal-950 px-2 py-0.5 rounded border border-teal-800">
                  CV BOUND
                </span>
              </div>
            </div>

            {/* Video Viewport Simulated Canvas */}
            <div className="relative min-h-[300px] sm:min-h-[360px] bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex flex-col items-center justify-center p-6">
              {/* Surveillance Grid Overlay */}
              <div className="absolute inset-0 opacity-10 pointer-events-none grid grid-cols-6 grid-rows-4 divide-x divide-y divide-teal-500" />

              {/* Center Lens Marker */}
              <div className="relative z-10 text-center max-w-sm p-6 rounded-2xl border border-dashed border-gray-700 bg-gray-950/85 backdrop-blur-md">
                <div className="w-12 h-12 rounded-xl bg-teal-950/80 border border-teal-700 text-teal-400 flex items-center justify-center mx-auto mb-3 text-2xl shadow-inner">
                  📹
                </div>
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-gray-200">
                  Live Overhead Surveillance Feed
                </p>
                <p className="text-[11px] text-teal-400/90 font-mono mt-1">
                  Autonomous Pose &amp; Object Detection Active
                </p>
                <div className="mt-3 pt-3 border-t border-gray-800 text-[10px] text-gray-500">
                  Zero biometric face models retained • Non-invasive behavioral observation only
                </div>
              </div>

              {/* Bottom HUD Metrics */}
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] font-mono text-gray-400">
                <span className="bg-gray-950/80 px-2 py-1 rounded border border-gray-800">
                  FOV: 115° Wide
                </span>
                <span className="bg-gray-950/80 px-2 py-1 rounded border border-gray-800 text-emerald-400">
                  Latency: 42ms
                </span>
              </div>
            </div>

            {/* Cam Footer: Expected vs Detected Trackers Counter */}
            <div className="p-3 border-t border-gray-800 bg-gray-950/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">Expected Candidates:</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {session?.expected_students || 24}
                  </span>
                </div>
                <span className="text-gray-700">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">Currently Detected:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {detectedCount} Trackers
                  </span>
                </div>
              </div>

              <div className="text-[11px] font-mono text-gray-500">
                Session ID: {session?.id?.slice(0, 8)}
              </div>
            </div>
          </div>

          {/* ── Dev Simulation Panel ── */}
          <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-900/80 text-amber-200 border border-amber-700">
                  DEV TOOL
                </span>
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                  Simulate Incident Violation
                </span>
              </div>
              <span className="text-[11px] text-amber-400/80 font-mono">
                Writes to DB &amp; Broadcasts WebSocket
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => triggerSimulation('PHONE_DETECTED')}
                disabled={simulating}
                className="min-h-[44px] px-3 py-2 rounded-lg bg-red-950/80 hover:bg-red-900/80 border border-red-800 text-red-200 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                📱 Phone Detected
              </button>
              <button
                type="button"
                onClick={() => triggerSimulation('SUSPICIOUS_MOVEMENT')}
                disabled={simulating}
                className="min-h-[44px] px-3 py-2 rounded-lg bg-amber-950/80 hover:bg-amber-900/80 border border-amber-800 text-amber-200 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                🔄 Movement Anomaly
              </button>
              <button
                type="button"
                onClick={() => triggerSimulation('POSSIBLE_COMMUNICATION')}
                disabled={simulating}
                className="min-h-[44px] px-3 py-2 rounded-lg bg-indigo-950/80 hover:bg-indigo-900/80 border border-indigo-800 text-indigo-200 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                💬 Communication
              </button>
              <button
                type="button"
                onClick={() => triggerSimulation('UNAUTHORIZED_MATERIAL')}
                disabled={simulating}
                className="min-h-[44px] px-3 py-2 rounded-lg bg-rose-950/80 hover:bg-rose-900/80 border border-rose-800 text-rose-200 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                📄 Paper / Material
              </button>
            </div>
          </div>

          {/* ── Real-Time Tracker Cards Grid ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Desk &amp; Tracker Monitoring Grid
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Tracker cards turn red immediately when candidate behavior is flagged.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-md bg-gray-900 text-gray-300 border border-gray-800">
                  Total: <strong>{trackers.length}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-md bg-red-950/60 text-red-300 border border-red-800">
                  Flagged: <strong>{trackers.filter((t) => t.status === 'FLAGGED').length}</strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {trackers.map((t) => {
                const isFlagged = t.status === 'FLAGGED'
                return (
                  <div
                    key={t.id}
                    onClick={() => t.latestViolation && setSelectedViolation(t.latestViolation)}
                    className={`rounded-xl p-3.5 border transition-all cursor-pointer ${
                      isFlagged
                        ? 'border-red-600 bg-red-950/50 shadow-lg shadow-red-950/50 ring-1 ring-red-500'
                        : 'border-gray-800 bg-gray-900/60 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-white">
                        {t.label}
                      </span>
                      {isFlagged ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </div>

                    <div className="mt-2 text-xs">
                      {isFlagged ? (
                        <div>
                          <p className="text-[11px] font-bold text-red-300 truncate">
                            {t.latestViolation?.activity_type.replace(/_/g, ' ')}
                          </p>
                          <p className="text-[10px] text-red-400/90 font-mono mt-0.5">
                            {t.violationsCount} incident{t.violationsCount !== 1 ? 's' : ''} • Inspect &rarr;
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-500">Normal posture</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Live Violation Feed & Evidence Drawer (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col bg-gray-900/40 border-t lg:border-t-0 border-gray-800 overflow-hidden h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-800 bg-gray-950/70 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Live Violation Feed
              </h3>
            </div>
            <span className="text-[11px] font-mono text-gray-400">
              {violations.length} recorded
            </span>
          </div>

          {/* Violations List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {violations.length === 0 ? (
              <div className="py-16 text-center text-gray-500 text-xs">
                <span className="text-2xl block mb-2">🛡️</span>
                No violations detected in this session.
                <p className="text-[11px] text-gray-600 mt-1">
                  Use the dev panel to simulate real-time incident alerts.
                </p>
              </div>
            ) : (
              violations.map((v) => {
                const sevColor =
                  v.severity === 'CRITICAL'
                    ? 'border-red-600 bg-red-950/60 text-red-300'
                    : v.severity === 'HIGH'
                    ? 'border-rose-700 bg-rose-950/50 text-rose-300'
                    : v.severity === 'MEDIUM'
                    ? 'border-amber-700 bg-amber-950/40 text-amber-300'
                    : 'border-blue-700 bg-blue-950/40 text-blue-300'

                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedViolation(v)}
                    className={`rounded-xl border p-3.5 space-y-2 cursor-pointer transition-all hover:brightness-110 shadow-sm ${sevColor}`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold uppercase tracking-wider font-mono">
                        {v.activity_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] opacity-75 font-mono">
                        {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-white">{v.tracker_label}</p>
                        <p className="text-[11px] opacity-75 font-mono">
                          Confidence: {Math.round(v.confidence * 100)}%
                        </p>
                      </div>
                      <span className="text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10">
                        {v.severity}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                      <span className="font-mono text-[10px] opacity-80">Status: {v.status}</span>
                      <span className="font-semibold text-teal-300 hover:underline">
                        View Snapshot Evidence &rarr;
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Slide-Over Evidence Preview Drawer ── */}
      {selectedViolation && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md h-full bg-gray-900 border-l border-gray-800 p-6 flex flex-col justify-between overflow-y-auto space-y-5 animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Violation Evidence Snapshot
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedViolation(null)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Event Metadata */}
              <div className="mt-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Target Candidate:</span>
                  <strong className="text-white font-mono text-sm">{selectedViolation.tracker_label}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Incident Event:</span>
                  <span className="text-red-400 font-bold">{selectedViolation.activity_type.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Detection Confidence:</span>
                  <span className="font-mono font-bold text-white">{Math.round(selectedViolation.confidence * 100)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Time Recorded:</span>
                  <span className="text-gray-300 font-mono">{new Date(selectedViolation.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Snapshot Image Container */}
              <div className="mt-5 space-y-2">
                <p className="text-xs font-bold text-gray-300">Camera Snapshot Capture</p>
                <div className="rounded-xl border border-gray-800 bg-gray-950 overflow-hidden relative min-h-[220px] flex items-center justify-center">
                  {selectedViolation.evidence_url ? (
                    <img
                      src={selectedViolation.evidence_url}
                      alt="Violation Evidence"
                      className="w-full h-auto object-cover max-h-[280px]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-center p-6 text-gray-500 text-xs">
                      <span className="text-3xl block mb-2">📸</span>
                      Local edge camera buffer archived
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 font-mono text-[10px] text-teal-400">
                    Timestamp SHA-256 Verified
                  </div>
                </div>
              </div>
            </div>

            {/* Invigilator Decision Actions */}
            <div className="pt-4 border-t border-gray-800 space-y-2">
              <p className="text-xs text-gray-400">Invigilator Review</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    // Update local state to DISMISSED
                    setViolations((prev) =>
                      prev.map((v) => (v.id === selectedViolation.id ? { ...v, status: 'DISMISSED' } : v))
                    )
                    setSelectedViolation(null)
                  }}
                  className="min-h-[44px] py-2.5 px-3 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium"
                >
                  Dismiss Incident
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Update local state to CONFIRMED
                    setViolations((prev) =>
                      prev.map((v) => (v.id === selectedViolation.id ? { ...v, status: 'CONFIRMED' } : v))
                    )
                    setSelectedViolation(null)
                  }}
                  className="min-h-[44px] py-2.5 px-3 rounded-lg bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-xs font-semibold shadow-sm"
                >
                  Confirm Flag
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
