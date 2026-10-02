'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { EyeIcon, CameraIcon, CloseIcon } from '@/components/ui/Icons'
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
        // Fallback default mock representation if database table not yet populated
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
        // Default simulated cameras for this hall
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
          startImmediately: true, // Examiner creates and immediately starts
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
      <div className="min-h-screen bg-gray-950 text-gray-300 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-sm">
          <span className="w-5 h-5 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
          Loading Hall Station…
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col justify-between selection:bg-teal-900 selection:text-teal-100">
      {/* ── Top Bar ── */}
      <header className="border-b border-gray-800 bg-gray-900/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/hall-access" className="text-xs text-gray-400 hover:text-white transition-colors p-1 -ml-1">
            ← Change Hall
          </Link>
          <span className="text-gray-700">/</span>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0e5a4d] text-white text-xs font-bold shadow-sm">
              <EyeIcon className="w-4 h-4 text-white" />
            </span>
            <h1 className="text-base font-bold text-white tracking-tight">
              {classroom?.name || 'Examination Hall'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-teal-900/60 bg-teal-950/40 text-teal-400 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span>Code: {classroom?.access_code || 'ACTIVE'}</span>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="min-h-[40px] px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>+</span> New Session
          </button>
        </div>
      </header>

      {/* ── Main Station Content ── */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Active Session Spotlight Banner */}
        {activeSession ? (
          <div className="rounded-2xl border-2 border-emerald-600/80 bg-emerald-950/25 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-900/80 border border-emerald-500 text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                EXAMINATION IN PROGRESS
              </span>
            </div>

            <div className="max-w-xl">
              <p className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-bold mb-1">
                Active Session
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {activeSession.course_name}
              </h2>
              {activeSession.course_code && (
                <p className="text-sm font-mono text-emerald-300/80 mt-1">
                  Course Code: {activeSession.course_code}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-300 mt-4">
                <span>Duration: <strong>{activeSession.duration_minutes} min</strong></span>
                <span>•</span>
                <span>Expected Candidates: <strong>{activeSession.expected_students}</strong></span>
                <span>•</span>
                <span>Started: <strong>{new Date(activeSession.started_at || Date.now()).toLocaleTimeString()}</strong></span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-emerald-800/60 flex flex-wrap items-center gap-3">
              <Link
                href={`/hall/session/${activeSession.id}`}
                className="min-h-[48px] px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-950/50"
              >
                <span>Resume Live Proctoring</span>
                <span className="text-lg">&rarr;</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Idle Station Notice with Scheduled Sessions */
          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono text-gray-400 mb-2">
                <span className="w-2 h-2 rounded-full bg-gray-500" />
                STATION READY • NO ACTIVE SESSION
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Hall is Ready for Examination
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-lg">
                Start a scheduled test or initialize an immediate examination session to begin monitoring candidate desks.
              </p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="min-h-[48px] px-5 py-3 rounded-xl bg-[#0e5a4d] hover:bg-[#0b483d] text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-md w-full md:w-auto justify-center"
            >
              <span>+</span> Start New Examination Session
            </button>
          </div>
        )}

        {/* ── Scheduled Examinations for this Hall ── */}
        {scheduledSessions.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs uppercase font-bold tracking-wider text-gray-400">
              Scheduled for this Hall ({scheduledSessions.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scheduledSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 flex flex-col justify-between space-y-4 hover:border-gray-700 transition-colors"
                >
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-950 text-blue-300 border border-blue-800">
                      SCHEDULED
                    </span>
                    <h4 className="text-base font-bold text-white mt-2">
                      {session.course_name}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {session.course_code ? `${session.course_code} • ` : ''}
                      {session.duration_minutes} min • {session.expected_students} candidates
                    </p>
                  </div>

                  <button
                    onClick={() => handleStartSession(session.id)}
                    className="min-h-[44px] w-full rounded-lg bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2"
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
            <h3 className="text-xs uppercase font-bold tracking-wider text-gray-400">
              Hall Cameras &amp; Video Streams ({cameras.length})
            </h3>
            <span className="text-[11px] text-gray-500 font-mono">
              Auto-sync with CV Model
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cameras.map((cam) => {
              const isOnline = cam.status === 'ACTIVE'
              return (
                <div
                  key={cam.id}
                  className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center">
                      <CameraIcon className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white leading-tight">
                        {cam.name || `Camera ${cam.camera_number}`}
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                        Feed #{cam.camera_number} • 1080p 30fps
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border ${
                      isOnline
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : 'bg-red-950 text-red-400 border-red-800'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="text-base font-bold text-white">
                Initialize Examination Session
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-lg border border-red-800 bg-red-950/50 text-red-300 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Course / Subject Name *
                </label>
                <input
                  type="text"
                  required
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. Pure Mathematics Paper II"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-700 bg-gray-950 text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Course Code (Optional)
                </label>
                <input
                  type="text"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MATH-402"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-700 bg-gray-950 text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="360"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-700 bg-gray-950 text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Expected Students
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={expectedStudents}
                    onChange={(e) => setExpectedStudents(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-700 bg-gray-950 text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 text-xs font-medium text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] px-5 py-2 rounded-lg bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-xs sm:text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isSubmitting ? 'Starting Session…' : 'Start Live Session →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-800/80 px-6 py-4 text-center text-xs text-gray-500">
        The Eye X • Hall Station Terminal #{classroom?.id?.slice(0, 8)}
      </footer>
    </div>
  )
}
