'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { EyeXLogo } from '@/components/ui/EyeXLogo'
import type { Classroom, Camera, HallSession } from '@/types'

export default function HallWorkspacePage({
  params,
}: {
  params: Promise<{ classroomId: string }>
}) {
  const { classroomId } = use(params)
  const router = useRouter()

  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [cameras, setCameras] = useState<Camera[]>([])
  const [activeSession, setActiveSession] = useState<HallSession | null>(null)
  const [scheduledSessions, setScheduledSessions] = useState<HallSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // New Session Form State
  const [courseName, setCourseName] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('120')
  const [expectedStudents, setExpectedStudents] = useState('30')

  async function loadHallData() {
    try {
      const supabase = createClient()

      // 1. Fetch Classroom
      const { data: hall } = await supabase
        .from('classrooms')
        .select('*')
        .eq('id', classroomId)
        .maybeSingle()

      if (hall) {
        setClassroom(hall)
      } else {
        setClassroom({
          id: classroomId,
          school_id: 'default',
          name: 'Examination Hall',
          access_code: 'ACTIVE',
          created_at: new Date().toISOString(),
        })
      }

      // 2. Fetch Cameras
      const { data: cams } = await supabase
        .from('cameras')
        .select('*')
        .eq('classroom_id', classroomId)
        .order('camera_number', { ascending: true })

      if (cams && cams.length > 0) {
        setCameras(cams)
      } else {
        setCameras([
          {
            id: 'c1',
            classroom_id: classroomId,
            camera_number: 1,
            name: 'Camera 1 (Front Wide)',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
          },
          {
            id: 'c2',
            classroom_id: classroomId,
            camera_number: 2,
            name: 'Camera 2 (Overhead Desk Grid)',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
          },
        ])
      }

      // 3. Fetch Sessions
      const { data: sessions } = await supabase
        .from('exam_hall_sessions')
        .select('*')
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: false })

      if (sessions && sessions.length > 0) {
        const active = sessions.find((s) => s.status === 'ACTIVE')
        const scheduled = sessions.filter((s) => s.status === 'SCHEDULED')
        setActiveSession(active || null)
        setScheduledSessions(scheduled)
      }
    } catch (err) {
      console.error('[HallWorkspace] Error loading data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadHallData()
  }, [classroomId])

  // Handle Starting a Scheduled Session
  async function handleStartSession(sessionId: string) {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/start`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        router.push(`/hall/session/${sessionId}`)
      } else {
        alert(data.error || 'Failed to start examination session.')
      }
    } catch {
      alert('Error communicating with session server.')
    }
  }

  // Handle Creating a New Session from Modal
  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!courseName.trim()) {
      setFormError('Course Name is required.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId,
          courseName,
          courseCode,
          durationMinutes: parseInt(durationMinutes, 10) || 120,
          expectedStudents: parseInt(expectedStudents, 10) || 0,
          startImmediately: true,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setFormError(data.error || 'Failed to initialize session.')
        setIsSubmitting(false)
        return
      }

      setIsModalOpen(false)
      router.push(`/hall/session/${data.session.id}`)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create session.')
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] text-[#434655] flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-[14px]">
          <span className="w-5 h-5 border-2 border-[#1d4ed8]/30 border-t-[#1d4ed8] rounded-full animate-spin" />
          Loading Hall Station…
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col justify-between antialiased">
      {/* ── Top Bar ── */}
      <header className="border-b border-[#c4c5d7] bg-white px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-30" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link
            href="/hall-access"
            className="p-1.5 sm:p-2 rounded-lg text-[#434655] hover:text-[#0b1c30] hover:bg-[#eff4ff] transition-colors border border-[#c4c5d7] bg-white flex items-center justify-center shrink-0 shadow-xs"
            title="Change Hall"
            aria-label="Back to hall access"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} className="w-4 h-4 sm:w-4.5 sm:h-4.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <EyeXLogo width={85} showTagline={false} />
          <div className="h-4 w-[1px] bg-[#c4c5d7] hidden sm:block shrink-0" />
          <h1 className="text-[14px] sm:text-[16px] font-bold text-[#0b1c30] tracking-tight truncate">
            {classroom?.name || 'Examination Hall'}
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-[#bbd6ff] bg-[#eff4ff] text-[#0037b0] text-[12px] font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Code: {classroom?.access_code || 'ACTIVE'}</span>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="min-h-[40px] px-4 py-2 rounded-lg bg-[#1d4ed8] hover:bg-[#0037b0] text-white text-[13px] sm:text-[14px] font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>+</span> New Session
          </button>
        </div>
      </header>

      {/* ── Main Station Content ── */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Active Session Spotlight Banner */}
        {activeSession ? (
          <div className="rounded-2xl border-2 border-emerald-500 bg-white p-6 sm:p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-mono bg-emerald-50 border border-emerald-200 text-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    EXAMINATION IN PROGRESS
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] tracking-tight">
                  {activeSession.course_name}
                </h2>
                {activeSession.course_code && (
                  <p className="text-[13px] font-mono text-[#0037b0] mt-1 font-semibold">
                    Course Code: {activeSession.course_code}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-[13px] text-[#434655] mt-3">
                  <span>Duration: <strong>{activeSession.duration_minutes} min</strong></span>
                  <span>•</span>
                  <span>Expected Candidates: <strong>{activeSession.expected_students}</strong></span>
                  <span>•</span>
                  <span>Started: <strong>{new Date(activeSession.started_at || Date.now()).toLocaleTimeString()}</strong></span>
                </div>
              </div>

              <div className="shrink-0">
                <Link
                  href={`/hall/session/${activeSession.id}`}
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[14px] sm:text-[15px] transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <span>Resume Live Proctoring</span>
                  <span className="text-lg">&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Idle Station Notice with Scheduled Sessions */
          <div className="rounded-2xl border border-[#e5eeff] bg-white p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] font-mono text-[#466083] mb-2 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                STATION READY • NO ACTIVE SESSION
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0b1c30]">
                Hall is Ready for Examination
              </h2>
              <p className="text-[14px] text-[#434655] mt-1 max-w-lg leading-relaxed">
                Start a scheduled test or initialize an immediate examination session to begin monitoring candidate desks.
              </p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="min-h-[48px] px-5 py-3 rounded-xl bg-[#1d4ed8] hover:bg-[#0037b0] text-white font-semibold text-[14px] transition-all flex items-center gap-2 shadow-sm w-full md:w-auto justify-center"
            >
              <span>+</span> Start New Examination Session
            </button>
          </div>
        )}

        {/* ── Scheduled Examinations for this Hall ── */}
        {scheduledSessions.length > 0 && (
          <section className="space-y-3">
            <h3 className="font-code-sm text-[11px] uppercase font-bold tracking-wider text-[#466083]">
              Scheduled for this Hall ({scheduledSessions.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scheduledSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-xl border border-[#e5eeff] bg-white p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-[#bbd6ff] transition-colors"
                >
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#eff4ff] text-[#0037b0] border border-[#bbd6ff]">
                      SCHEDULED
                    </span>
                    <h4 className="text-[16px] font-bold text-[#0b1c30] mt-2">
                      {session.course_name}
                    </h4>
                    <p className="text-[13px] text-[#434655] mt-0.5">
                      {session.course_code ? `${session.course_code} • ` : ''}
                      {session.duration_minutes} min • {session.expected_students} candidates
                    </p>
                  </div>

                  <button
                    onClick={() => handleStartSession(session.id)}
                    className="min-h-[40px] w-full rounded-lg bg-[#1d4ed8] hover:bg-[#0037b0] text-white text-[13px] font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>Start Examination</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Camera Feeds Status for this Hall ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-code-sm text-[11px] uppercase font-bold tracking-wider text-[#466083]">
              Hall Cameras &amp; Video Streams ({cameras.length})
            </h3>
            <span className="font-code-sm text-[11px] text-[#747686]">
              Auto-sync with CV Model
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cameras.map((cam) => {
              const isOnline = cam.status === 'ACTIVE'
              return (
                <div
                  key={cam.id}
                  className="rounded-xl border border-[#e5eeff] bg-white p-4 flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#eff4ff] text-[#0037b0] flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-7.5A2.25 2.25 0 0013.5 6.75h-9a2.25 2.25 0 00-2.25 2.25v7.5A2.25 2.25 0 004.5 18.75z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-[#0b1c30] leading-tight">
                        {cam.name || `Camera ${cam.camera_number}`}
                      </p>
                      <p className="font-code-sm text-[11px] text-[#747686] mt-0.5">
                        Feed #{cam.camera_number} • 1080p 30fps
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-code-sm text-[10px] font-bold border ${
                      isOnline
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-[#ba1a1a]'
                      }`}
                    />
                    {cam.status}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      </main>

      {/* ── New Session Quick-Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 sm:p-7 shadow-2xl space-y-4 border border-[#e5eeff] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5eeff]">
              <h3 className="text-[16px] font-bold text-[#0b1c30]">
                Initialize Examination Session
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#747686] hover:text-[#0b1c30] p-1 rounded-lg"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-lg border border-[#fecaca] bg-[#fef2f2] text-[#b91c1c] text-[13px]">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-[13px] font-medium text-[#0b1c30] mb-1">
                  Course / Subject Name *
                </label>
                <input
                  type="text"
                  required
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. Pure Mathematics Paper II"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#0b1c30] mb-1">
                  Course Code (Optional)
                </label>
                <input
                  type="text"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MATH-402"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[14px] font-mono focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-[#0b1c30] mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="360"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#0b1c30] mb-1">
                    Expected Students
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={expectedStudents}
                    onChange={(e) => setExpectedStudents(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-[40px] px-4 py-2 text-[13px] font-medium text-[#434655] hover:text-[#0b1c30]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[40px] px-5 py-2 rounded-lg bg-[#1d4ed8] hover:bg-[#0037b0] text-white text-[13px] sm:text-[14px] font-semibold disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isSubmitting ? 'Starting Session…' : 'Start Live Session →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#c4c5d7] bg-white px-6 py-4 text-center font-code-sm text-[11px] text-[#747686]">
        EyeX • Hall Station Terminal #{classroom?.id?.slice(0, 8)}
      </footer>
    </div>
  )
}
