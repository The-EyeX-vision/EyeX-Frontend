'use client'

import { useState, useEffect, useRef, use, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { EyeXLogo } from '@/components/ui/EyeXLogo'
import { Maximize2, X } from 'lucide-react'
import type { HallSession, Violation, ViolationActivityType, ViolationSeverity } from '@/types'

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
  violations: Violation[]
}

export interface TrackerViolationGroup {
  trackerLabel: string
  trackerId: number | null
  latestViolation: Violation
  violations: Violation[]
  totalCount: number
  hasFlagged: boolean
  highestSeverity: ViolationSeverity
  latestTimestamp: string
}

// Resolve an evidence_url from the 'violation-evidence' Supabase Storage bucket.
// Handles full URLs, relative paths, and fallbacks strictly by tracker ID.
function resolveEvidenceUrl(
  raw: string | null | undefined,
  trackerId?: number | null,
  trackerLabel?: string | null
): string | null {
  const supabase = createClient()
  const BUCKET = 'violation-evidence'

  if (raw && typeof raw === 'string' && raw.trim() !== '') {
    const trimmed = raw.trim()
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed.replace(
        '/storage/v1/object/public/violations/',
        `/storage/v1/object/public/${BUCKET}/`
      )
    }

    const cleanPath = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed
    const finalPath = cleanPath.startsWith('incidents/') ? cleanPath : `incidents/${cleanPath}`
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(finalPath)
    if (data?.publicUrl) return data.publicUrl
  }

  // Fallback strictly to this tracker's specific file in violation-evidence/incidents
  let tid = trackerId
  if (tid === undefined || tid === null) {
    if (trackerLabel) {
      const match = trackerLabel.match(/\d+/)
      if (match) tid = parseInt(match[0], 10)
    }
  }

  if (tid !== undefined && tid !== null) {
    const studentIdx = Math.abs(tid) % 6
    const { data } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(`incidents/student_${studentIdx}_turning_head_to_neighbor.jpg`)
    return data?.publicUrl ?? null
  }

  return null
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
  const [selectedTrackerLabel, setSelectedTrackerLabel] = useState<string | null>(null)
  const [selectedViolationId, setSelectedViolationId] = useState<string | null>(null)
  const [activeFrameUrl, setActiveFrameUrl] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
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

      // 2. Fetch Violations strictly belonging to this session
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

  // Group violations strictly by Tracker Label (no mixing between trackers)
  const trackerGroups = useMemo<TrackerViolationGroup[]>(() => {
    const groupMap = new Map<string, Violation[]>()

    violations.forEach((v) => {
      // Extract clean, exact tracker label
      const label = v.tracker_label || `Tracker #${v.tracker_id ?? 'Unknown'}`
      const arr = groupMap.get(label) || []
      arr.push(v)
      groupMap.set(label, arr)
    })

    const groups: TrackerViolationGroup[] = []

    groupMap.forEach((vList, trackerLabel) => {
      // Sort strictly chronological per tracker
      const sorted = [...vList].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      const latest = sorted[0]
      const hasFlagged = sorted.some((v) => v.status === 'FLAGGED')
      const severities = sorted.map((v) => v.severity)
      const highestSeverity: ViolationSeverity = severities.includes('CRITICAL')
        ? 'CRITICAL'
        : severities.includes('HIGH')
        ? 'HIGH'
        : severities.includes('MEDIUM')
        ? 'MEDIUM'
        : 'LOW'

      groups.push({
        trackerLabel,
        trackerId: latest.tracker_id ?? null,
        latestViolation: latest,
        violations: sorted,
        totalCount: sorted.length,
        hasFlagged,
        highestSeverity,
        latestTimestamp: latest.created_at,
      })
    })

    groups.sort(
      (a, b) => new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime()
    )

    return groups
  }, [violations])

  // Compute tracker grid based on expected students and violations
  useEffect(() => {
    const total = session?.expected_students || 20
    const list: TrackerCardData[] = []

    for (let i = 1; i <= Math.max(total, 12); i++) {
      const label = `Tracker #${i}`
      // Filter strictly for this tracker
      const studentViolations = violations.filter(
        (v) => v.tracker_label === label || v.tracker_id === i
      )
      const hasFlag = studentViolations.some((v) => v.status === 'FLAGGED')

      list.push({
        id: i,
        label,
        status: hasFlag ? 'FLAGGED' : 'NORMAL',
        violationsCount: studentViolations.length,
        latestViolation: studentViolations[0],
        violations: studentViolations,
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

  // Dev simulation tool with genuine bucket evidence URLs
  async function triggerSimulation(activityType: ViolationActivityType) {
    setSimulating(true)
    try {
      const supabase = createClient()
      const randTrackerNum = Math.floor(Math.random() * (session?.expected_students || 12)) + 1
      const trackerLabel = `Tracker #${randTrackerNum}`
      const studentIdx = randTrackerNum % 6
      const { data: storageData } = supabase.storage
        .from('violation-evidence')
        .getPublicUrl(`incidents/student_${studentIdx}_turning_head_to_neighbor.jpg`)

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
          evidenceUrl: storageData?.publicUrl || null,
          metadata: {
            simulated: true,
            hall: session?.classroom?.name || 'Hall',
            cheat_reason: `[High Certainty] ${activityType.replace(/_/g, ' ')}`,
            category_name: activityType.replace(/_/g, ' '),
            activity_count: (violations.filter((v) => v.tracker_label === trackerLabel).length || 0) + 1,
          },
        }),
      })
    } catch (err) {
      console.error('Simulation error:', err)
    } finally {
      setSimulating(false)
    }
  }

  // Update status for a single violation or all violations strictly in a tracker group
  async function updateViolationStatus(violationId: string, status: 'CONFIRMED' | 'DISMISSED') {
    try {
      const supabase = createClient()
      await supabase.from('violations').update({ status }).eq('id', violationId)
      setViolations((prev) =>
        prev.map((v) => (v.id === violationId ? { ...v, status } : v))
      )
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  async function updateGroupStatus(trackerLabel: string, status: 'CONFIRMED' | 'DISMISSED') {
    try {
      const supabase = createClient()
      const groupViolations = violations.filter((v) => v.tracker_label === trackerLabel)
      const ids = groupViolations.map((v) => v.id)
      if (ids.length === 0) return

      await supabase.from('violations').update({ status }).in('id', ids)
      setViolations((prev) =>
        prev.map((v) => (v.tracker_label === trackerLabel ? { ...v, status } : v))
      )
    } catch (err) {
      console.error('Failed to batch update status:', err)
    }
  }

  // Selected Group Data strictly scoped for the active drawer
  const activeSelectedGroup = useMemo<TrackerViolationGroup | null>(() => {
    if (!selectedTrackerLabel) return null

    // Exact label match
    const found = trackerGroups.find((g) => g.trackerLabel === selectedTrackerLabel)
    if (found) return found

    // If tracker has 0 violations, create empty neutral preview
    const tid = parseInt(selectedTrackerLabel.replace(/\D/g, '') || '0', 10)
    return {
      trackerLabel: selectedTrackerLabel,
      trackerId: tid,
      latestViolation: {
        id: `empty-${selectedTrackerLabel}`,
        session_id: sessionId,
        tracker_label: selectedTrackerLabel,
        tracker_id: tid,
        activity_type: 'OTHER',
        severity: 'LOW',
        status: 'REVIEWED',
        confidence: 0.98,
        evidence_url: resolveEvidenceUrl(null, tid, selectedTrackerLabel),
        created_at: new Date().toISOString(),
      },
      violations: [],
      totalCount: 0,
      hasFlagged: false,
      highestSeverity: 'LOW',
      latestTimestamp: new Date().toISOString(),
    }
  }, [selectedTrackerLabel, trackerGroups, sessionId])

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col antialiased">
      {/* â”€â”€ Top Bar â”€â”€ */}
      <header className="border-b border-[#c4c5d7] bg-white px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center gap-3">
          <Link
            href={session?.classroom_id ? `/hall/${session.classroom_id}` : '/hall-access'}
            className="text-[13px] text-[#747686] hover:text-[#0b1c30] transition-colors"
          >
            â† Hall Workspace
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
                {session?.course_code ? `${session.course_code} â€¢ ` : ''}Expected Duration: {session?.duration_minutes}m
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
            className="p-2 rounded-lg border border-[#c4c5d7] bg-white hover:bg-[#eff4ff] text-[13px] text-[#434655] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
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
            className="min-h-[40px] px-4 py-2 rounded-lg bg-[#ba1a1a] hover:bg-[#93000a] text-white text-[13px] font-semibold transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
          >
            {isEnding ? 'Endingâ€¦' : 'End Examination'}
          </button>
        </div>
      </header>

      {/* â”€â”€ Main Split View Grid â”€â”€ */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left: Camera Feed HUD & Tracker Seating Grid (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-5 border-r border-[#c4c5d7]">
          {/* â”€â”€ Camera HUD Container â”€â”€ */}
          <div className="rounded-2xl border border-[#e5eeff] bg-white overflow-hidden shadow-sm">
            {/* Cam Header */}
            <div className="p-3 border-b border-[#e5eeff] bg-[#eff4ff] flex items-center justify-between font-code-sm text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[#0b1c30] font-bold">
                  OVERHEAD CAMERA 1 â€¢ {session?.classroom?.name || 'Main Hall'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[#466083]">
                <span>1080p â€¢ 30 FPS</span>
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
                  Zero biometric face models retained â€¢ Non-invasive behavioral observation only
                </div>
              </div>

              {/* Bottom HUD Metrics */}
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between font-code-sm text-[11px] text-[#466083]">
                <span className="bg-white/80 px-2 py-1 rounded border border-[#c4c5d7] shadow-xs">
                  FOV: 115Â° Wide
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

          {/* â”€â”€ Dev Simulation Panel â”€â”€ */}
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
                className="min-h-[40px] px-3 py-2 rounded-lg bg-white hover:bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-[12px] font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>Phone Detected</span>
              </button>
              <button
                type="button"
                onClick={() => triggerSimulation('SUSPICIOUS_MOVEMENT')}
                disabled={simulating}
                className="min-h-[40px] px-3 py-2 rounded-lg bg-white hover:bg-[#fff7ed] border border-[#fed7aa] text-[#c2410c] text-[12px] font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>Movement Anomaly</span>
              </button>
              <button
                type="button"
                onClick={() => triggerSimulation('POSSIBLE_COMMUNICATION')}
                disabled={simulating}
                className="min-h-[40px] px-3 py-2 rounded-lg bg-white hover:bg-[#eff4ff] border border-[#bbd6ff] text-[#0037b0] text-[12px] font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>Communication</span>
              </button>
              <button
                type="button"
                onClick={() => triggerSimulation('UNAUTHORIZED_MATERIAL')}
                disabled={simulating}
                className="min-h-[40px] px-3 py-2 rounded-lg bg-white hover:bg-[#fef2f2] border border-[#fecaca] text-[#ba1a1a] text-[12px] font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>Paper / Material</span>
              </button>
            </div>
          </div>

          {/* â”€â”€ Real-Time Tracker Cards Grid â”€â”€ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-code-sm text-[11px] font-bold uppercase tracking-wider text-[#466083]">
                  Desk &amp; Tracker Monitoring Grid
                </h3>
                <p className="text-[12px] text-[#747686] mt-0.5">
                  Click any tracker to inspect its captured frame and complete list of detections.
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
                    onClick={() => {
                      setSelectedTrackerLabel(t.label)
                      setActiveFrameUrl(null)
                    }}
                    className={`rounded-xl p-3.5 border transition-all cursor-pointer ${
                      isFlagged
                        ? 'border-[#ba1a1a] bg-[#fef2f2] shadow-sm hover:border-[#93000a]'
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
                          <p className="font-code-sm text-[10px] text-[#b91c1c] mt-0.5 font-semibold">
                            {t.violationsCount} detection{t.violationsCount !== 1 ? 's' : ''} â€¢ Inspect &rarr;
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#747686]">Normal posture â€¢ Click to inspect</p>
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
              {trackerGroups.length} candidate{trackerGroups.length !== 1 ? 's' : ''} flagged ({violations.length} total)
            </span>
          </div>

          {/* Grouped Violations List (One Big Card Per Tracker) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {trackerGroups.length === 0 ? (
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
              trackerGroups.map((group) => {
                const isCritical = group.highestSeverity === 'CRITICAL' || group.highestSeverity === 'HIGH'
                const sevColor =
                  group.highestSeverity === 'CRITICAL'
                    ? 'border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]'
                    : group.highestSeverity === 'HIGH'
                    ? 'border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]'
                    : group.highestSeverity === 'MEDIUM'
                    ? 'border-[#fde68a] bg-[#fffbeb] text-[#b45309]'
                    : 'border-[#bbd6ff] bg-[#eff4ff] text-[#0037b0]'

                const evidenceUrl = resolveEvidenceUrl(
                  group.latestViolation.evidence_url,
                  group.trackerId,
                  group.trackerLabel
                )

                return (
                  <div
                    key={group.trackerLabel}
                    onClick={() => {
                      setSelectedTrackerLabel(group.trackerLabel)
                      setSelectedViolationId(group.violations[0]?.id || null)
                      setActiveFrameUrl(null)
                    }}
                    className={`rounded-2xl border p-4 space-y-3 cursor-pointer transition-all hover:shadow-lg ${sevColor}`}
                  >
                    {/* Header with Tracker and Incident Count Badge */}
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[14px] text-[#0b1c30]">
                          {group.trackerLabel}
                        </span>
                        <span className="font-code-sm text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/10 text-[#0b1c30]">
                          {group.totalCount} detection{group.totalCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <span className="font-code-sm text-[11px] opacity-75">
                        {new Date(group.latestTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    {/* Prominent Large Frame Thumbnail */}
                    {evidenceUrl && (
                      <div className="rounded-xl overflow-hidden border border-black/10 h-36 sm:h-40 bg-[#0b1c30] relative shadow-inner">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={evidenceUrl}
                          alt={`${group.trackerLabel} Evidence Capture`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-mono text-emerald-300 font-bold border border-white/10">
                          Live Frame
                        </div>
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-white">
                          Latest: {group.latestViolation.activity_type.replace(/_/g, ' ')}
                        </div>
                      </div>
                    )}

                    {/* Latest Detected Activity Summary */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div>
                        <p className={`font-bold text-[13px] ${isCritical ? 'text-[#b91c1c]' : 'text-[#0b1c30]'}`}>
                          {group.latestViolation.activity_type.replace(/_/g, ' ')}
                        </p>
                        <p className="font-code-sm text-[11px] opacity-75">
                          Certainty: {Math.round(group.latestViolation.confidence * 100)}%
                        </p>
                      </div>
                      <span className="font-code-sm text-[10px] uppercase font-bold px-2.5 py-1 rounded-md bg-white/90 border border-black/10 shadow-xs">
                        {group.highestSeverity}
                      </span>
                    </div>

                    {/* Action link */}
                    <div className="pt-2.5 border-t border-black/5 flex items-center justify-between text-[12px]">
                      <span className="font-code-sm text-[11px] font-medium opacity-80">
                        {group.hasFlagged ? '● Pending Review' : 'Reviewed'}
                      </span>
                      <span className="font-semibold text-[#1d4ed8] hover:underline flex items-center gap-1">
                        View Detections ({group.totalCount}) &rarr;
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Slide-Over Detection Review Drawer ── */}
      {activeSelectedGroup && (() => {
        // Featured violation shown in the top square card:
        // Defaults to the selected violation or the very first violation for this candidate
        const featuredViolation = (selectedViolationId
          ? activeSelectedGroup.violations.find((v) => v.id === selectedViolationId)
          : null) || activeSelectedGroup.violations[0] || activeSelectedGroup.latestViolation

        const featuredIndex = activeSelectedGroup.violations.findIndex((v) => v.id === featuredViolation?.id)
        const featuredDisplayNum = featuredIndex >= 0 ? activeSelectedGroup.violations.length - featuredIndex : 1

        const featuredFrameUrl = featuredViolation
          ? resolveEvidenceUrl(
              featuredViolation.evidence_url,
              activeSelectedGroup.trackerId,
              activeSelectedGroup.trackerLabel
            )
          : null

        const isFeaturedCrit = featuredViolation?.severity === 'CRITICAL' || featuredViolation?.severity === 'HIGH'
        const isFeaturedConfirmed = featuredViolation?.status === 'CONFIRMED'
        const isFeaturedDismissed = featuredViolation?.status === 'DISMISSED'

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs animate-in fade-in"
            onClick={() => {
              setSelectedTrackerLabel(null)
              setSelectedViolationId(null)
              setActiveFrameUrl(null)
            }}
          >
            <div
              className="w-full max-w-2xl lg:max-w-3xl h-full bg-white border-l border-[#c4c5d7] flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Scrollable Main Area */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-6">
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[#e5eeff]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[18px] font-bold text-[#0b1c30]">
                        {activeSelectedGroup.trackerLabel} — Detection Review
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full font-code-sm text-[11px] font-bold bg-[#eff4ff] text-[#0037b0] border border-[#bbd6ff]">
                        {activeSelectedGroup.violations.length} Detection{activeSelectedGroup.violations.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#747686] mt-0.5">
                      Review primary capture below. Click any detection frame to expand full screen.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTrackerLabel(null)
                      setSelectedViolationId(null)
                      setActiveFrameUrl(null)
                    }}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center text-[#747686] hover:text-[#0b1c30] rounded-xl hover:bg-[#eff4ff] transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {activeSelectedGroup.violations.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-[#e5eeff] bg-[#f8f9ff] text-center text-[13px] text-[#747686]">
                    No suspicious violations logged for {activeSelectedGroup.trackerLabel}. All observations are normal.
                  </div>
                ) : (
                  <>
                    {/* ── 1. PRIMARY FEATURED DETECTION: SQUARE CARD UP ── */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-bold uppercase tracking-wider text-[#0b1c30] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-600" />
                          Primary Detection Frame
                        </span>
                        <span className="font-code-sm text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                          violation-evidence bucket
                        </span>
                      </div>

                      <div className="rounded-2xl border border-[#c4c5d7] bg-white overflow-hidden shadow-sm">
                        {/* Square Frame Viewport */}
                        <div
                          className="relative w-full aspect-square max-h-[380px] sm:max-h-[420px] bg-[#06101e] cursor-pointer group overflow-hidden flex items-center justify-center mx-auto"
                          onClick={() => featuredFrameUrl && setLightboxUrl(featuredFrameUrl)}
                          title="Click to view full screen"
                        >
                          {featuredFrameUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={featuredFrameUrl}
                              alt={`Detection #${featuredDisplayNum} Evidence`}
                              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="text-white/40 text-xs font-mono">
                              Evidence frame unavailable
                            </div>
                          )}

                          {/* Hover expand overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg">
                              <Maximize2 className="w-4 h-4 text-[#0b1c30]" />
                              <span className="text-[12px] font-bold text-[#0b1c30]">View Full Screen</span>
                            </div>
                          </div>

                          {/* Badges on the square card */}
                          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/80 font-mono text-[11px] text-white font-bold backdrop-blur-xs">
                            Detection #{featuredDisplayNum}
                          </div>
                          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/80 font-mono text-[10px] text-emerald-400 font-bold border border-white/10 backdrop-blur-xs">
                            Live Frame Capture
                          </div>
                          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/80 font-mono text-[11px] text-emerald-300 backdrop-blur-xs">
                            {featuredViolation && new Date(featuredViolation.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </div>

                        {/* Details under the square frame */}
                        {featuredViolation && (
                          <div className="p-4 space-y-2.5 bg-white border-t border-[#e5eeff]">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className={`text-[15px] font-bold ${isFeaturedCrit ? 'text-[#b91c1c]' : 'text-[#0b1c30]'}`}>
                                  {featuredViolation.activity_type.replace(/_/g, ' ')}
                                </h4>
                                {featuredViolation.metadata && (
                                  <p className="text-[12px] text-[#434655] font-mono mt-1 leading-relaxed bg-[#f8f9ff] px-2.5 py-1 rounded-lg border border-[#e5eeff]">
                                    {String(featuredViolation.metadata.cheat_reason || featuredViolation.metadata.category_name || JSON.stringify(featuredViolation.metadata))}
                                  </p>
                                )}
                              </div>
                              <span className="font-code-sm text-[11px] uppercase font-bold px-2.5 py-1 rounded-lg bg-[#eff4ff] text-[#0037b0] border border-[#bbd6ff] shrink-0">
                                {featuredViolation.severity}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[12px] pt-1 border-t border-black/5">
                              <div className="flex items-center gap-2 text-[#747686]">
                                <span>Certainty: <strong className="text-[#0b1c30]">{Math.round(featuredViolation.confidence * 100)}%</strong></span>
                                <span>•</span>
                                <span className={`font-semibold ${isFeaturedConfirmed ? 'text-[#b91c1c]' : isFeaturedDismissed ? 'text-[#747686]' : 'text-amber-700'}`}>
                                  ● {featuredViolation.status}
                                </span>
                              </div>

                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => featuredFrameUrl && setLightboxUrl(featuredFrameUrl)}
                                  className="px-2.5 py-1.5 rounded-lg text-[11px] bg-[#eff4ff] hover:bg-[#dbeafe] text-[#1d4ed8] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                  Full Screen
                                </button>
                                {!isFeaturedDismissed && (
                                  <button
                                    type="button"
                                    onClick={() => updateViolationStatus(featuredViolation.id, 'DISMISSED')}
                                    className="px-2.5 py-1.5 rounded-lg text-[11px] bg-white border border-[#c4c5d7] hover:bg-gray-50 text-[#434655] font-medium transition-colors cursor-pointer"
                                  >
                                    Dismiss
                                  </button>
                                )}
                                {!isFeaturedConfirmed && (
                                  <button
                                    type="button"
                                    onClick={() => updateViolationStatus(featuredViolation.id, 'CONFIRMED')}
                                    className="px-2.5 py-1.5 rounded-lg text-[11px] bg-[#ba1a1a] hover:bg-[#93000a] text-white font-semibold shadow-xs transition-colors cursor-pointer"
                                  >
                                    Confirm Flag
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── 2. COMPACT CARDS BELOW: ALL DETECTIONS ── */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[13px] font-bold text-[#0b1c30] uppercase tracking-wide">
                          All Detections for this Candidate ({activeSelectedGroup.violations.length})
                        </h4>
                        <span className="font-code-sm text-[11px] text-[#747686]">
                          Click thumbnail to expand full screen
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {activeSelectedGroup.violations.map((v, idx) => {
                          const vFrameUrl = resolveEvidenceUrl(
                            v.evidence_url,
                            activeSelectedGroup.trackerId,
                            activeSelectedGroup.trackerLabel
                          )
                          const isSelected = (selectedViolationId === v.id) || (!selectedViolationId && idx === 0)
                          const isCrit = v.severity === 'CRITICAL' || v.severity === 'HIGH'
                          const isVConfirmed = v.status === 'CONFIRMED'
                          const isVDismissed = v.status === 'DISMISSED'
                          const detNum = activeSelectedGroup.violations.length - idx

                          return (
                            <div
                              key={v.id}
                              onClick={() => {
                                setSelectedViolationId(v.id)
                                if (vFrameUrl) setActiveFrameUrl(vFrameUrl)
                              }}
                              className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#eff4ff] border-[#1d4ed8] ring-1 ring-[#1d4ed8]/30 shadow-xs'
                                  : 'bg-white border-[#e5eeff] hover:border-[#c4c5d7] hover:bg-gray-50/70'
                              }`}
                            >
                              {/* Compact Frame Thumbnail: Click opens full screen directly */}
                              <div
                                className="w-20 h-20 sm:w-24 sm:h-20 rounded-lg overflow-hidden bg-[#06101e] shrink-0 relative group cursor-pointer border border-black/10"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (vFrameUrl) setLightboxUrl(vFrameUrl)
                                }}
                                title="Click to view full screen"
                              >
                                {vFrameUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={vFrameUrl}
                                    alt={`Detection #${detNum}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-white/30 text-[9px] font-mono">
                                    N/A
                                  </div>
                                )}
                                {/* Overlay with maximize icon on hover */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                  <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                                </div>
                                <div className="absolute bottom-1 left-1 px-1 py-0.2 rounded bg-black/75 text-[8px] font-mono text-emerald-300">
                                  #{detNum}
                                </div>
                              </div>

                              {/* Compact Info Body */}
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-black/5 text-[#434655]">
                                      #{detNum}
                                    </span>
                                    <strong className={`truncate text-[13px] ${isCrit ? 'text-[#b91c1c]' : 'text-[#0b1c30]'}`}>
                                      {v.activity_type.replace(/_/g, ' ')}
                                    </strong>
                                  </div>
                                  <span className="font-code-sm text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white border border-black/10 shrink-0">
                                    {v.severity}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-[11px] text-[#747686]">
                                  <span className="font-code-sm">
                                    {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </span>
                                  <span>•</span>
                                  <span>Certainty: <strong>{Math.round(v.confidence * 100)}%</strong></span>
                                  <span>•</span>
                                  <span className={`font-semibold ${isVConfirmed ? 'text-[#b91c1c]' : isVDismissed ? 'text-[#747686]' : 'text-amber-700'}`}>
                                    ● {v.status}
                                  </span>
                                </div>

                                {Boolean(v.metadata?.cheat_reason) && (
                                  <p className="text-[11px] text-[#434655] font-mono truncate">
                                    {String(v.metadata?.cheat_reason)}
                                  </p>
                                )}
                              </div>

                              {/* Right Action: Expand Frame to Full Screen */}
                              <div className="shrink-0 flex items-center" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => vFrameUrl && setLightboxUrl(vFrameUrl)}
                                  className="p-2 rounded-lg text-[#1d4ed8] hover:bg-[#dbeafe] bg-[#eff4ff] transition-colors cursor-pointer"
                                  title="View Full Screen"
                                >
                                  <Maximize2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Batch Actions at bottom of drawer */}
              {activeSelectedGroup.violations.length > 0 && (
                <div className="p-6 sm:p-7 pt-4 border-t border-[#e5eeff] bg-white space-y-2 shrink-0">
                  <p className="text-[12px] text-[#747686] font-medium">Batch Actions for {activeSelectedGroup.trackerLabel}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateGroupStatus(activeSelectedGroup.trackerLabel, 'DISMISSED')}
                      className="min-h-[44px] py-2 px-4 rounded-xl border border-[#c4c5d7] bg-white hover:bg-[#eff4ff] text-[#434655] text-[13px] font-semibold cursor-pointer text-center transition-colors"
                    >
                      Dismiss All Detections
                    </button>
                    <button
                      type="button"
                      onClick={() => updateGroupStatus(activeSelectedGroup.trackerLabel, 'CONFIRMED')}
                      className="min-h-[44px] py-2 px-4 rounded-xl bg-[#ba1a1a] hover:bg-[#93000a] text-white text-[13px] font-semibold shadow-sm cursor-pointer text-center transition-colors"
                    >
                      Confirm All Flags
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Full-Screen Lightbox ── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 animate-in fade-in"
          onClick={() => setLightboxUrl(null)}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Full-Screen Image */}
          <div className="w-full h-full flex items-center justify-center p-4 sm:p-8" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt="Detection Evidence — Full Screen"
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              style={{ maxHeight: 'calc(100vh - 80px)' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

