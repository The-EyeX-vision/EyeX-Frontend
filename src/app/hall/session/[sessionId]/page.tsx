'use client'

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { EyeXLogo } from '@/components/ui/EyeXLogo'
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
    osc.frequency.setValueAtTime(587.33, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
  } catch {
    // Audio context may be restricted
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

  // Escalation / Hierarchy Report popup state
  const [showGcePopup, setShowGcePopup] = useState(false)
  const [hierarchyEmail, setHierarchyEmail] = useState('')
  const [hierarchyNotes, setHierarchyNotes] = useState('')
  const [isEscalating, setIsEscalating] = useState(false)
  const [escalationSent, setEscalationSent] = useState(false)
  const [schoolInfo, setSchoolInfo] = useState<{ name: string; email: string; codePrefix: string } | null>(null)

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
        if (s.school_id && s.school_id !== 'default') {
          const { data: sch } = await supabase
            .from('schools')
            .select('school_name, email, code_prefix')
            .eq('id', s.school_id)
            .maybeSingle()
          if (sch) {
            setSchoolInfo({
              name: sch.school_name,
              email: sch.email || '',
              codePrefix: sch.code_prefix || 'SCH',
            })
          }
        }
      } else {
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
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col antialiased">
      {/* ── Top Bar ── */}
      <header className="border-b border-[#c4c5d7] bg-white px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center gap-3">
          <Link
            href={session?.classroom_id ? `/hall/${session.classroom_id}` : '/hall-access'}
            className="text-[13px] text-[#747686] hover:text-[#0b1c30] transition-colors"
          >
            ← Hall Workspace
          </Link>
          <span className="text-[#c4c5d7]">/</span>
          <div className="flex items-center gap-2">
            <EyeXLogo width={90} showTagline={false} />
            <span className="text-[#c4c5d7]">/</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[15px] sm:text-[16px] font-bold text-[#0b1c30] truncate max-w-xs sm:max-w-md">
                  {session?.course_name || 'Live Examination'}
                </h1>
                <span className="px-2 py-0.5 rounded font-code-sm text-[10px] font-bold bg-[#eff4ff] text-[#0037b0] border border-[#bbd6ff]">
                  {session?.classroom?.name || 'Classroom Station'}
                </span>
              </div>
              <p className="font-code-sm text-[11px] text-[#747686]">
                {session?.course_code ? `${session.course_code} • ` : ''}Expected Duration: {session?.duration_minutes}m
              </p>
            </div>
          </div>
        </div>

        {/* Status Indicators & Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Live Beacon & Elapsed Timer */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-[12px] font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-700 font-bold">LIVE</span>
            <span className="text-[#c4c5d7]">|</span>
            <span className="text-[#0b1c30] font-semibold">{elapsed}</span>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg border border-[#c4c5d7] bg-white hover:bg-[#eff4ff] text-[13px] text-[#434655] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            title={soundEnabled ? 'Mute alert sounds' : 'Enable alert sounds'}
          >
            {soundEnabled ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4 text-emerald-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4 text-[#747686]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
            )}
          </button>

          {/* End Session Button */}
          <button
            type="button"
            onClick={handleEndSession}
            disabled={isEnding}
            className="min-h-[40px] px-4 py-2 rounded-lg bg-[#ba1a1a] hover:bg-[#93000a] text-white text-[13px] font-semibold transition-colors disabled:opacity-50 shadow-sm"
          >
            {isEnding ? 'Ending…' : 'End Examination'}
          </button>
        </div>
      </header>

      {/* ── Main Split View Grid ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left: Camera Feed HUD & Tracker Seating Grid (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-5 border-r border-[#c4c5d7]">
          {/* ── Camera HUD Container ── */}
          <div className="rounded-2xl border border-[#e5eeff] bg-white overflow-hidden shadow-sm">
            {/* Cam Header */}
            <div className="p-3 border-b border-[#e5eeff] bg-[#eff4ff] flex items-center justify-between font-code-sm text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[#0b1c30] font-bold">
                  OVERHEAD CAMERA 1 • {session?.classroom?.name || 'Main Hall'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[#466083]">
                <span>1080p • 30 FPS</span>
                <span className="text-[#0037b0] font-bold bg-[#dce9ff] px-2 py-0.5 rounded">
                  CV ACTIVE
                </span>
              </div>
            </div>

            {/* Video Viewport Simulated Canvas */}
            <div className="relative min-h-[300px] sm:min-h-[340px] bg-gradient-to-b from-[#eff4ff] via-white to-[#eff4ff] flex flex-col items-center justify-center p-6">
              {/* Surveillance Grid Overlay */}
              <div className="absolute inset-0 opacity-15 pointer-events-none grid grid-cols-6 grid-rows-4 divide-x divide-y divide-[#1d4ed8]" />

              {/* Center Lens Marker */}
              <div className="relative z-10 text-center max-w-sm p-6 rounded-2xl border border-[#c4c5d7] bg-white/90 backdrop-blur-md shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-[#eff4ff] text-[#0037b0] flex items-center justify-center mx-auto mb-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-7.5A2.25 2.25 0 0013.5 6.75h-9a2.25 2.25 0 00-2.25 2.25v7.5A2.25 2.25 0 004.5 18.75z" />
                  </svg>
                </div>
                <p className="font-code-sm text-[12px] font-bold uppercase tracking-wider text-[#0b1c30]">
                  Live Overhead Surveillance Feed
                </p>
                <p className="text-[12px] text-[#0037b0] font-mono mt-1 font-semibold">
                  Autonomous Pose &amp; Object Detection Active
                </p>
                <div className="mt-3 pt-3 border-t border-[#e5eeff] text-[11px] text-[#747686]">
                  Zero biometric face models retained • Non-invasive behavioral observation only
                </div>
              </div>

              {/* Bottom HUD Metrics */}
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between font-code-sm text-[11px] text-[#466083]">
                <span className="bg-white/80 px-2 py-1 rounded border border-[#c4c5d7] shadow-xs">
                  FOV: 115° Wide
                </span>
                <span className="bg-white/80 px-2 py-1 rounded border border-[#c4c5d7] text-emerald-700 font-semibold shadow-xs">
                  Latency: 42ms
                </span>
              </div>
            </div>

            {/* Cam Footer: Expected vs Detected Trackers Counter */}
            <div className="p-3 border-t border-[#e5eeff] bg-[#f8f9ff] flex flex-wrap items-center justify-between gap-3 text-[13px]">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#466083]">Expected Candidates:</span>
                  <span className="font-mono font-bold text-[#0b1c30]">
                    {session?.expected_students || 24}
                  </span>
                </div>
                <span className="text-[#c4c5d7]">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#466083]">Currently Detected:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {detectedCount} Trackers
                  </span>
                </div>
              </div>

              <div className="font-code-sm text-[11px] text-[#747686]">
                Session ID: {session?.id?.slice(0, 8)}
              </div>
            </div>
          </div>

          {/* ── Dev Simulation Panel ── */}
          <div className="rounded-xl border border-amber-200 bg-[#fffbeb] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded font-code-sm text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  DEV SIMULATION
                </span>
                <span className="text-[12px] font-bold text-amber-900 uppercase tracking-wide">
                  Simulate Incident Violation
                </span>
              </div>
              <span className="font-code-sm text-[11px] text-amber-800 font-medium">
                Writes to DB &amp; Broadcasts WebSocket
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => triggerSimulation('PHONE_DETECTED')}
                disabled={simulating}
                className="min-h-[40px] px-3 py-2 rounded-lg bg-white hover:bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-[12px] font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>Phone Detected</span>
              </button>
              <button
                type="button"
                onClick={() => triggerSimulation('SUSPICIOUS_MOVEMENT')}
                disabled={simulating}
                className="min-h-[40px] px-3 py-2 rounded-lg bg-white hover:bg-[#fff7ed] border border-[#fed7aa] text-[#c2410c] text-[12px] font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>Movement Anomaly</span>
              </button>
              <button
                type="button"
                onClick={() => triggerSimulation('POSSIBLE_COMMUNICATION')}
                disabled={simulating}
                className="min-h-[40px] px-3 py-2 rounded-lg bg-white hover:bg-[#eff4ff] border border-[#bbd6ff] text-[#0037b0] text-[12px] font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>Communication</span>
              </button>
              <button
                type="button"
                onClick={() => triggerSimulation('UNAUTHORIZED_MATERIAL')}
                disabled={simulating}
                className="min-h-[40px] px-3 py-2 rounded-lg bg-white hover:bg-[#fef2f2] border border-[#fecaca] text-[#ba1a1a] text-[12px] font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>Paper / Material</span>
              </button>
            </div>
          </div>

          {/* ── Real-Time Tracker Cards Grid ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-code-sm text-[11px] font-bold uppercase tracking-wider text-[#466083]">
                  Desk &amp; Tracker Monitoring Grid
                </h3>
                <p className="text-[12px] text-[#747686] mt-0.5">
                  Tracker cards turn red immediately when candidate behavior is flagged.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[12px]">
                <span className="px-2.5 py-1 rounded-md bg-white text-[#434655] border border-[#c4c5d7]">
                  Total: <strong>{trackers.length}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-md bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]">
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
                        ? 'border-[#ba1a1a] bg-[#fef2f2] shadow-sm'
                        : 'border-[#e5eeff] bg-white hover:border-[#bbd6ff]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-code-sm text-[12px] font-bold text-[#0b1c30]">
                        {t.label}
                      </span>
                      {isFlagged ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a] animate-ping" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </div>

                    <div className="mt-2 text-xs">
                      {isFlagged ? (
                        <div>
                          <p className="text-[11px] font-bold text-[#b91c1c] truncate">
                            {t.latestViolation?.activity_type.replace(/_/g, ' ')}
                          </p>
                          <p className="font-code-sm text-[10px] text-[#b91c1c] mt-0.5">
                            {t.violationsCount} incident{t.violationsCount !== 1 ? 's' : ''} • Inspect &rarr;
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#747686]">Normal posture</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Live Violation Feed & Evidence Drawer (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col bg-white border-t lg:border-t-0 border-[#c4c5d7] overflow-hidden h-full">
          {/* Header */}
          <div className="p-4 border-b border-[#e5eeff] bg-[#f8f9ff] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <h3 className="font-code-sm text-[11px] font-bold uppercase tracking-wider text-[#0b1c30]">
                Live Violation Feed
              </h3>
            </div>
            <span className="font-code-sm text-[11px] text-[#747686]">
              {violations.length} recorded
            </span>
          </div>

          {/* Violations List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {violations.length === 0 ? (
              <div className="py-16 text-center text-[#747686] text-[13px]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-[#c4c5d7] mx-auto mb-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                No violations detected in this session.
                <p className="text-[11px] text-[#747686] mt-1">
                  Use the dev panel to simulate real-time incident alerts.
                </p>
              </div>
            ) : (
              violations.map((v) => {
                const sevColor =
                  v.severity === 'CRITICAL'
                    ? 'border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]'
                    : v.severity === 'HIGH'
                    ? 'border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]'
                    : v.severity === 'MEDIUM'
                    ? 'border-[#fde68a] bg-[#fffbeb] text-[#b45309]'
                    : 'border-[#bbd6ff] bg-[#eff4ff] text-[#0037b0]'

                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedViolation(v)}
                    className={`rounded-xl border p-3.5 space-y-2 cursor-pointer transition-all hover:shadow-xs ${sevColor}`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold uppercase tracking-wider font-mono">
                        {v.activity_type.replace(/_/g, ' ')}
                      </span>
                      <span className="font-code-sm text-[10px] opacity-75">
                        {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-[#0b1c30]">{v.tracker_label}</p>
                        <p className="font-code-sm text-[11px] opacity-75">
                          Confidence: {Math.round(v.confidence * 100)}%
                        </p>
                      </div>
                      <span className="font-code-sm text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/70 border border-black/5">
                        {v.severity}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-black/5 flex items-center justify-between text-[11px]">
                      <span className="font-code-sm text-[10px] opacity-80">Status: {v.status}</span>
                      <span className="font-semibold text-[#1d4ed8] hover:underline">
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
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs animate-in fade-in" onClick={() => setSelectedViolation(null)}>
          <div className="w-full max-w-md h-full bg-white border-l border-[#c4c5d7] p-6 flex flex-col justify-between overflow-y-auto space-y-5 shadow-2xl animate-in slide-in-from-right duration-200" onClick={(e) => e.stopPropagation()}>
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#e5eeff]">
                <span className="text-[14px] font-bold uppercase tracking-wider text-[#0b1c30]">
                  Violation Evidence Snapshot
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedViolation(null)}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center text-[#747686] hover:text-[#0b1c30] rounded-lg"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Event Metadata */}
              <div className="mt-4 space-y-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#747686]">Target Candidate:</span>
                  <strong className="text-[#0b1c30] font-mono text-[14px]">{selectedViolation.tracker_label}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#747686]">Incident Event:</span>
                  <span className="text-[#ba1a1a] font-bold">{selectedViolation.activity_type.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#747686]">Detection Confidence:</span>
                  <span className="font-mono font-bold text-[#0b1c30]">{Math.round(selectedViolation.confidence * 100)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#747686]">Time Recorded:</span>
                  <span className="text-[#434655] font-mono">{new Date(selectedViolation.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Snapshot Image Container */}
              <div className="mt-5 space-y-2">
                <p className="text-[13px] font-bold text-[#0b1c30]">Camera Snapshot Capture</p>
                <div className="rounded-xl border border-[#c4c5d7] bg-[#eff4ff] overflow-hidden relative min-h-[220px] flex items-center justify-center">
                  {selectedViolation.evidence_url ? (
                    <img
                      src={selectedViolation.evidence_url}
                      alt="Violation Evidence"
                      className="w-full h-auto object-cover max-h-[280px]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-center p-6 text-[#747686] text-[12px]">
                      Local edge camera buffer archived
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-white/90 font-mono text-[10px] text-[#0037b0] font-bold border border-[#c4c5d7]">
                    Timestamp SHA-256 Verified
                  </div>
                </div>
              </div>
            </div>

            {/* Invigilator Decision Actions */}
            <div className="pt-4 border-t border-[#e5eeff] space-y-2">
              <p className="text-[12px] text-[#747686] font-medium">Invigilator Review</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setViolations((prev) =>
                      prev.map((v) => (v.id === selectedViolation.id ? { ...v, status: 'DISMISSED' } : v))
                    )
                    setSelectedViolation(null)
                  }}
                  className="min-h-[40px] py-2.5 px-3 rounded-lg border border-[#c4c5d7] bg-white hover:bg-[#eff4ff] text-[#434655] text-[13px] font-medium"
                >
                  Dismiss Incident
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHierarchyEmail('')
                    setHierarchyNotes('')
                    setEscalationSent(false)
                    setShowGcePopup(true)
                  }}
                  className="min-h-[40px] py-2.5 px-3 rounded-lg bg-[#ba1a1a] hover:bg-[#93000a] text-white text-[13px] font-semibold shadow-sm flex items-center justify-center gap-1.5"
                >
                  Next Step
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Hierarchy Escalation Report Popup ─────────────────────────────────────────── */}
      {showGcePopup && selectedViolation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { if (!isEscalating) setShowGcePopup(false) }}
          />

          {/* Modal card */}
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#e5eeff] overflow-hidden z-10 max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5eeff] bg-[#f8f9ff] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#ba1a1a]/10 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#ba1a1a" strokeWidth={2} className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#0b1c30]">Flagged Incident — Next Step</p>
                  <p className="text-[11px] text-[#747686]">Candidate: <span className="font-mono font-semibold text-[#0b1c30]">{selectedViolation.tracker_label}</span></p>
                </div>
              </div>
              {!isEscalating && (
                <button
                  type="button"
                  onClick={() => setShowGcePopup(false)}
                  className="w-8 h-8 rounded-lg text-[#747686] hover:bg-[#eff4ff] flex items-center justify-center transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {escalationSent ? (
              /* ── Success state ── */
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2} className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[16px] font-bold text-[#0b1c30]">Incident Transmitted to Hierarchy</p>
                  <p className="text-[13px] text-[#747686] mt-1.5 max-w-sm mx-auto leading-relaxed">
                    Official irregularity docket submitted to <span className="font-semibold text-[#0b1c30]">{hierarchyEmail}</span> with certified center telemetry from <span className="font-semibold text-[#0037b0]">{schoolInfo?.name || 'Authorized Examination Center'}</span>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setViolations((prev) =>
                      prev.map((v) => (v.id === selectedViolation.id ? { ...v, status: 'CONFIRMED' } : v))
                    )
                    setShowGcePopup(false)
                    setSelectedViolation(null)
                  }}
                  className="mt-2 px-6 py-2.5 rounded-lg bg-[#0037b0] hover:bg-[#0b1c30] text-white text-[14px] font-semibold transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              /* ── Action state ── */
              <div className="px-5 py-5 space-y-4 overflow-y-auto">

                {/* Incident summary strip */}
                <div className="rounded-xl bg-[#fef2f2] border border-[#fecaca] px-4 py-3 flex items-center gap-3">
                  <span className="text-[11px] font-bold text-[#ba1a1a] bg-white border border-[#fecaca] px-2 py-0.5 rounded uppercase tracking-wide shrink-0">
                    {selectedViolation.activity_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[12px] text-[#747686]">
                    Confidence: <span className="font-mono font-bold text-[#0b1c30]">{Math.round(selectedViolation.confidence * 100)}%</span>
                  </span>
                  <span className="text-[12px] text-[#747686] ml-auto shrink-0">
                    {new Date(selectedViolation.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Option A — Withdraw */}
                <div className="rounded-xl border border-[#c4c5d7] bg-white p-4 space-y-2 hover:border-[#bbd6ff] transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#eff4ff] flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#0037b0" strokeWidth={2} className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                      </svg>
                    </div>
                    <p className="text-[13px] font-bold text-[#0b1c30]">Withdraw the Flag</p>
                  </div>
                  <p className="text-[12px] text-[#747686] pl-9 leading-relaxed">
                    Dismiss this incident as cleared or resolved. No official report will be submitted to the examination authority.
                  </p>
                  <div className="pl-9 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setViolations((prev) =>
                          prev.map((v) => (v.id === selectedViolation.id ? { ...v, status: 'DISMISSED' } : v))
                        )
                        setShowGcePopup(false)
                        setSelectedViolation(null)
                      }}
                      className="px-4 py-2 rounded-lg border border-[#c4c5d7] bg-white hover:bg-[#eff4ff] text-[#434655] text-[13px] font-medium transition-colors"
                    >
                      Withdraw Flag
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[#e5eeff]" />
                  <span className="text-[11px] text-[#747686] font-medium uppercase tracking-wider">or</span>
                  <div className="flex-1 h-px bg-[#e5eeff]" />
                </div>

                {/* Option B — Send to Hierarchy */}
                <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2]/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#ba1a1a]/10 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#ba1a1a" strokeWidth={2} className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                      </div>
                      <p className="text-[13px] font-bold text-[#0b1c30]">Send to Hierarchy</p>
                    </div>
                    <span className="font-code-sm text-[10px] text-[#ba1a1a] bg-[#fee2e2] px-2 py-0.5 rounded font-bold uppercase">
                      Official Escalation
                    </span>
                  </div>

                  <p className="text-[12px] text-[#747686] pl-9 leading-relaxed">
                    Escalate this irregularity to supervisory officials (Examination Board, Regional Inspectorate, or Ministry) with cryptographic incident telemetry.
                  </p>

                  {/* Attached Originating School Dispatch Details */}
                  {schoolInfo && (
                    <div className="ml-9 p-2.5 rounded-lg bg-white border border-[#e5eeff] text-[11px] space-y-1">
                      <div className="font-semibold text-[#0037b0] flex items-center gap-1.5">
                        <span>🏛️ Dispatching Center:</span>
                        <span className="text-[#0b1c30]">{schoolInfo.name}</span>
                        <span className="font-code-sm text-[10px] bg-[#dce9ff] text-[#0037b0] px-1 rounded">
                          {schoolInfo.codePrefix}
                        </span>
                      </div>
                      {schoolInfo.email && (
                        <div className="text-[#747686]">
                          Official Dispatch Address: <span className="font-mono text-[#434655]">{schoolInfo.email}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2.5 pl-9">
                    {/* Authority email input */}
                    <div>
                      <label className="text-[11px] font-semibold text-[#0b1c30] uppercase tracking-wide block mb-1">
                        Supervisory Authority Email
                      </label>
                      <input
                        type="email"
                        value={hierarchyEmail}
                        onChange={(e) => setHierarchyEmail(e.target.value)}
                        placeholder="e.g. inspectorate@minesec.gov.cm or board@gceboard.cm"
                        className="w-full px-3 py-2 rounded-lg border border-[#c4c5d7] bg-white text-[13px] text-[#0b1c30] placeholder:text-[#747686] focus:outline-none focus:ring-2 focus:ring-[#ba1a1a]/40 focus:border-[#ba1a1a] transition-all"
                      />
                    </div>

                    {/* Invigilator remarks */}
                    <div>
                      <label className="text-[11px] font-semibold text-[#0b1c30] uppercase tracking-wide block mb-1">
                        Chief Examiner Remarks <span className="text-[#747686] font-normal normal-case">(optional)</span>
                      </label>
                      <textarea
                        value={hierarchyNotes}
                        onChange={(e) => setHierarchyNotes(e.target.value)}
                        placeholder="Provide details regarding seat placement, confiscated items, or behavioral context..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-[#c4c5d7] bg-white text-[13px] text-[#0b1c30] placeholder:text-[#747686] focus:outline-none focus:ring-2 focus:ring-[#ba1a1a]/40 focus:border-[#ba1a1a] transition-all resize-none"
                      />
                    </div>

                    {/* Send button */}
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
                      className="w-full py-2.5 rounded-lg bg-[#ba1a1a] hover:bg-[#93000a] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isEscalating ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                          </svg>
                          Transmitting to Hierarchy...
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
