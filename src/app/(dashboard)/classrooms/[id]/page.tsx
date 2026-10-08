'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Classroom, Camera, HallSession, Exam } from '@/types'

export default function ClassroomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [cameras, setCameras] = useState<Camera[]>([])
  const [sessions, setSessions] = useState<HallSession[]>([])
  const [availableExams, setAvailableExams] = useState<Exam[]>([])
  const [activeSession, setActiveSession] = useState<HallSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Feedback notifications
  const [copiedCode, setCopiedCode] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Edit Hall State
  const [editName, setEditName] = useState('')
  const [isUpdatingName, setIsUpdatingName] = useState(false)
  const [isRotatingCode, setIsRotatingCode] = useState(false)

  // Add Camera State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false)
  const [cameraName, setCameraName] = useState('')
  const [cameraNumber, setCameraNumber] = useState('')
  const [isAddingCamera, setIsAddingCamera] = useState(false)

  // Direct Session Creation Modal State
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const [sessionMode, setSessionMode] = useState<'from_exam' | 'custom'>('custom')
  const [selectedExamId, setSelectedExamId] = useState('')
  const [sessionCourseName, setSessionCourseName] = useState('')
  const [sessionCourseCode, setSessionCourseCode] = useState('')
  const [sessionDuration, setSessionDuration] = useState(120)
  const [sessionStudents, setSessionStudents] = useState(30)
  const [startImmediately, setStartImmediately] = useState(true)
  const [isCreatingSession, setIsCreatingSession] = useState(false)

  // Load classroom and related entities
  async function loadData() {
    try {
      const supabase = createClient()

      // 1. Fetch Hall
      const { data: hall } = await supabase
        .from('classrooms')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (hall) {
        setClassroom(hall)
        setEditName(hall.name)

        // 2. Fetch Cameras
        const { data: cams } = await supabase
          .from('cameras')
          .select('*')
          .eq('classroom_id', id)
          .order('camera_number', { ascending: true })

        if (cams) setCameras(cams)

        // 3. Fetch Sessions for this hall
        const { data: hallSessions } = await supabase
          .from('exam_hall_sessions')
          .select('*')
          .eq('classroom_id', id)
          .order('created_at', { ascending: false })

        if (hallSessions) {
          setSessions(hallSessions)
          const currentActive = hallSessions.find((s) => s.status === 'ACTIVE')
          setActiveSession(currentActive || null)
        }

        // 4. Fetch available scheduled exams for this school
        if (hall.school_id) {
          const { data: examsData } = await supabase
            .from('exams')
            .select('*')
            .eq('school_id', hall.school_id)
            .order('created_at', { ascending: false })

          if (examsData) setAvailableExams(examsData)
        }
      }
    } catch (err) {
      console.error('Error loading classroom details:', err)
      setActionMessage({ type: 'error', text: 'Failed to load examination hall data.' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  // Copy Access Code
  function handleCopyCode() {
    if (!classroom?.access_code) return
    navigator.clipboard.writeText(classroom.access_code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  // Rotate Access Code
  async function handleRotateCode() {
    if (!confirm('Are you sure you want to generate a new Hall Access Code? The previous code will stop working.')) return
    setIsRotatingCode(true)
    try {
      const res = await fetch(`/api/classrooms/${id}/rotate-code`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        setClassroom((prev) => (prev ? { ...prev, access_code: data.access_code, code_expires_at: data.code_expires_at } : null))
        setActionMessage({ type: 'success', text: `Access code rotated successfully to: ${data.access_code}` })
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to rotate access code.' })
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Error rotating access code.' })
    } finally {
      setIsRotatingCode(false)
      setTimeout(() => setActionMessage(null), 4000)
    }
  }

  // Update Hall Name
  async function handleUpdateName(e: React.FormEvent) {
    e.preventDefault()
    if (!editName.trim() || editName === classroom?.name) return

    setIsUpdatingName(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('classrooms')
      .update({ name: editName.trim() })
      .eq('id', id)

    if (error) {
      setActionMessage({ type: 'error', text: error.message })
    } else {
      setClassroom((prev) => (prev ? { ...prev, name: editName.trim() } : null))
      setActionMessage({ type: 'success', text: 'Hall name updated successfully.' })
    }
    setIsUpdatingName(false)
    setTimeout(() => setActionMessage(null), 3000)
  }

  // Add Camera
  async function handleAddCamera(e: React.FormEvent) {
    e.preventDefault()
    setIsAddingCamera(true)

    try {
      const res = await fetch(`/api/classrooms/${id}/cameras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cameraName.trim(),
          cameraNumber: cameraNumber ? parseInt(cameraNumber, 10) : undefined,
          status: 'ACTIVE',
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setIsCameraModalOpen(false)
        setCameraName('')
        setCameraNumber('')
        setActionMessage({ type: 'success', text: 'Camera attached successfully.' })
        loadData()
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to add camera.' })
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Error registering camera.' })
    } finally {
      setIsAddingCamera(false)
      setTimeout(() => setActionMessage(null), 3000)
    }
  }

  // Toggle Camera Status
  async function handleToggleCameraStatus(camera: Camera) {
    const nextStatus = camera.status === 'ACTIVE' ? 'OFFLINE' : 'ACTIVE'
    const supabase = createClient()
    const { error } = await supabase
      .from('cameras')
      .update({ status: nextStatus })
      .eq('id', camera.id)

    if (!error) {
      setCameras((prev) =>
        prev.map((c) => (c.id === camera.id ? { ...c, status: nextStatus } : c))
      )
    }
  }

  // Delete Camera
  async function handleDeleteCamera(cameraId: string) {
    if (!confirm('Are you sure you want to remove this camera from the hall?')) return
    try {
      const res = await fetch(`/api/classrooms/${id}/cameras?cameraId=${cameraId}`, { method: 'DELETE' })
      if (res.ok) {
        setCameras((prev) => prev.filter((c) => c.id !== cameraId))
        setActionMessage({ type: 'success', text: 'Camera removed.' })
      } else {
        const data = await res.json()
        setActionMessage({ type: 'error', text: data.error || 'Failed to delete camera.' })
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Error removing camera.' })
    } finally {
      setTimeout(() => setActionMessage(null), 3000)
    }
  }

  // Handle Exam Selection in Session Creator
  function handleSelectExam(examId: string) {
    setSelectedExamId(examId)
    const found = availableExams.find((e) => e.id === examId)
    if (found) {
      setSessionCourseName(found.title)
      setSessionDuration(found.duration_minutes || 120)
    }
  }

  // Direct Session Creation Handler
  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault()
    if (!sessionCourseName.trim()) {
      alert('Please enter or select a Course / Examination name.')
      return
    }

    setIsCreatingSession(true)
    try {
      const payload = {
        classroomId: id,
        courseName: sessionCourseName.trim(),
        courseCode: sessionCourseCode.trim() || undefined,
        durationMinutes: sessionDuration,
        expectedStudents: sessionStudents,
        startImmediately: startImmediately,
      }

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok && data.success && data.session) {
        setIsSessionModalOpen(false)
        if (startImmediately) {
          // Immediately enter the examination terminal workspace!
          router.push(`/hall/session/${data.session.id}`)
        } else {
          setActionMessage({ type: 'success', text: 'Session scheduled successfully!' })
          loadData()
        }
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to create session.' })
      }
    } catch (err: unknown) {
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error creating session.' })
    } finally {
      setIsCreatingSession(false)
      setTimeout(() => setActionMessage(null), 4000)
    }
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto p-12 text-center text-[#747686]">
        <div className="inline-block w-8 h-8 border-3 border-[#1d4ed8] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-[14px] font-medium">Loading Hall Workspace…</p>
      </div>
    )
  }

  if (!classroom) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center space-y-3 max-w-md mx-auto my-12 border border-[#e5eeff]">
        <p className="text-[#0b1c30] font-bold text-lg">Examination Hall Not Found</p>
        <p className="text-[13px] text-[#747686]">This hall may have been deleted or moved.</p>
        <Link href="/classrooms" className="inline-block px-4 py-2 bg-[#1d4ed8] text-white rounded-lg text-[13px] font-semibold hover:bg-[#0037b0] transition-colors">
          ← Back to Examination Halls
        </Link>
      </div>
    )
  }

  const activeCamerasCount = cameras.filter((c) => c.status === 'ACTIVE').length

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto space-y-6">
      {/* ── Notification Banner ── */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-[13px] font-semibold transition-all ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-[#fef2f2] border-[#fecaca] text-[#b91c1c]'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="ml-3 underline text-[12px] opacity-80 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* ── Active Session Alert Banner (If Live Now) ── */}
      {activeSession && (
        <div className="rounded-2xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-500/10 via-emerald-50 to-white p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-pulse">
          <div className="flex items-center gap-3.5">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-600" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-600 text-white font-mono">
                  LIVE IN PROGRESS
                </span>
                <h3 className="font-bold text-[#0b1c30] text-[15px]">{activeSession.course_name}</h3>
              </div>
              <p className="text-[12px] text-[#434655] mt-0.5">
                Surveillance cameras active • Expected: {activeSession.expected_students} candidates • Started: {activeSession.started_at ? new Date(activeSession.started_at).toLocaleTimeString() : 'Recently'}
              </p>
            </div>
          </div>

          <Link
            href={`/hall/session/${activeSession.id}`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-bold shadow-md transition-all self-stretch sm:self-auto justify-center"
          >
            <span>Resume Invigilator Console</span> &rarr;
          </Link>
        </div>
      )}

      {/* ── Main Header ── */}
      <div className="flex flex-col gap-2">
        <Link
          href="/classrooms"
          className="text-[13px] text-[#747686] hover:text-[#0b1c30] transition-colors inline-flex items-center gap-1.5 font-medium"
        >
          ← Back to Examination Halls
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-3">
            <span className="w-3 h-8 bg-[#0037b0] rounded-sm shrink-0" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-[#0b1c30] tracking-tight">
                  {classroom.name}
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#eff4ff] text-[#0037b0] border border-[#bbd6ff]">
                  Hall Terminal
                </span>
              </div>
              <p className="text-[13px] text-[#747686] mt-0.5">
                Central management, direct session launcher, and video feed configuration
              </p>
            </div>
          </div>

          {/* Direct Session & Workspace Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsSessionModalOpen(true)}
              className="flex items-center gap-2 bg-[#1d4ed8] hover:bg-[#0037b0] text-white px-4 py-2.5 rounded-xl text-[14px] font-semibold transition-all shadow-sm"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
              <span>Launch / Create Session</span>
            </button>

            <Link
              href={`/hall/${classroom.id}`}
              className="flex items-center gap-1.5 bg-white border border-[#c4c5d7] hover:border-[#0037b0] hover:text-[#0037b0] text-[#0b1c30] px-4 py-2.5 rounded-xl text-[14px] font-semibold transition-all shadow-xs"
            >
              <span>Kiosk Terminal</span> &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* ── Key Metrics & Credentials Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Hall Access Code */}
        <div className="bg-white rounded-2xl border border-[#e5eeff] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <span className="font-code-sm text-[11px] font-bold uppercase tracking-wider text-[#747686]">
              Hall Access Code
            </span>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-mono text-xl sm:text-2xl font-black text-[#0037b0] tracking-wider">
                {classroom.access_code}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-1.5 text-[#434655] hover:text-[#1d4ed8] hover:bg-[#eff4ff] rounded-lg transition-colors"
                title="Copy Access Code"
              >
                {copiedCode ? (
                  <span className="text-[11px] font-bold text-emerald-600">Copied!</span>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#f0f4fd] flex items-center justify-between">
            <span className="text-[11px] text-[#747686]">For room kiosk terminal</span>
            <button
              type="button"
              onClick={handleRotateCode}
              disabled={isRotatingCode}
              className="text-[11px] font-bold text-[#1d4ed8] hover:underline disabled:opacity-50"
            >
              {isRotatingCode ? 'Rotating…' : 'Rotate Code'}
            </button>
          </div>
        </div>

        {/* Card 2: Attached Cameras */}
        <div className="bg-white rounded-2xl border border-[#e5eeff] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <span className="font-code-sm text-[11px] font-bold uppercase tracking-wider text-[#747686]">
              Surveillance Feeds
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#0b1c30]">{cameras.length}</span>
              <span className="text-[13px] text-[#747686]">camera{cameras.length !== 1 ? 's' : ''} bound</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#f0f4fd] flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {activeCamerasCount} Online
            </span>
            {cameras.length - activeCamerasCount > 0 && (
              <span className="text-[#b91c1c] font-semibold">
                {cameras.length - activeCamerasCount} Offline
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Session Activity */}
        <div className="bg-white rounded-2xl border border-[#e5eeff] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <span className="font-code-sm text-[11px] font-bold uppercase tracking-wider text-[#747686]">
              Total Examinations Run
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#0b1c30]">{sessions.length}</span>
              <span className="text-[13px] text-[#747686]">sessions</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#f0f4fd] text-[11px] text-[#747686]">
            {activeSession ? 'Session active right now' : 'Hall ready for new session'}
          </div>
        </div>

        {/* Card 4: Quick Launch Terminal Link */}
        <div className="bg-gradient-to-br from-[#eff4ff] to-[#f8f9ff] rounded-2xl border border-[#bbd6ff] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <span className="font-code-sm text-[11px] font-bold uppercase tracking-wider text-[#0037b0]">
              Direct Kiosk Access
            </span>
            <p className="text-[12px] text-[#434655] mt-1.5 leading-relaxed">
              Launch full-screen kiosk without entering admin password in public hall.
            </p>
          </div>
          <Link
            href={`/hall/${classroom.id}`}
            className="mt-3 text-[12px] font-bold text-[#1d4ed8] hover:text-[#0037b0] inline-flex items-center gap-1"
          >
            Open Hall Kiosk Terminal &rarr;
          </Link>
        </div>
      </div>

      {/* ── Two-Column Layout: Left (Cameras & Sessions) | Right (Settings & Direct Actions) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Attached Cameras & Session History */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Attached Cameras */}
          <div className="bg-white rounded-2xl border border-[#e5eeff] p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline-md text-base sm:text-lg font-bold text-[#0b1c30]">
                  Overhead Cameras &amp; Feeds ({cameras.length})
                </h2>
                <p className="text-[13px] text-[#747686] mt-0.5">
                  Cameras streaming into the computer vision monitoring model
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1d4ed8] hover:bg-[#0037b0] text-white text-[13px] font-semibold transition-colors shadow-xs"
              >
                <span>+</span> Add Camera
              </button>
            </div>

            {cameras.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#c4c5d7] p-8 text-center bg-[#f8f9ff]">
                <p className="text-[#0b1c30] font-semibold text-[14px]">No cameras configured yet</p>
                <p className="text-[#747686] text-[12px] mt-1 max-w-sm mx-auto">
                  Attach at least one wide-angle or overhead camera to enable AI detection and tracking.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCameraModalOpen(true)}
                  className="mt-3.5 px-4 py-2 bg-[#1d4ed8] text-white text-[13px] font-semibold rounded-lg hover:bg-[#0037b0] transition-colors"
                >
                  + Add First Camera
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {cameras.map((cam) => {
                  const isOnline = cam.status === 'ACTIVE'
                  return (
                    <div
                      key={cam.id}
                      className="rounded-xl border border-[#e5eeff] bg-[#fcfdff] hover:bg-[#f8faff] p-4 flex flex-col justify-between transition-all gap-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${
                            isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]'
                          }`}>
                            #{cam.camera_number}
                          </div>
                          <div>
                            <p className="text-[14px] font-bold text-[#0b1c30] leading-tight">
                              {cam.name || `Camera ${cam.camera_number}`}
                            </p>
                            <p className="text-[11px] text-[#747686] mt-0.5">
                              Hardware Feed #{cam.camera_number}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isOnline
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]'
                          }`}
                        >
                          {isOnline ? 'ONLINE' : 'OFFLINE'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#f0f4fd] text-[12px]">
                        <button
                          type="button"
                          onClick={() => handleToggleCameraStatus(cam)}
                          className="text-[#1d4ed8] hover:underline font-semibold"
                        >
                          {isOnline ? 'Switch to Offline' : 'Mark as Online'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCamera(cam.id)}
                          className="text-[#b91c1c] hover:underline font-medium text-[11px]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 2. Examinations History in this Hall */}
          <div className="bg-white rounded-2xl border border-[#e5eeff] p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline-md text-base sm:text-lg font-bold text-[#0b1c30]">
                  Examination History ({sessions.length})
                </h2>
                <p className="text-[13px] text-[#747686] mt-0.5">
                  Past and scheduled exam sessions conducted in this hall
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsSessionModalOpen(true)}
                className="text-[13px] font-semibold text-[#1d4ed8] hover:underline"
              >
                + New Session
              </button>
            </div>

            {sessions.length === 0 ? (
              <div className="p-8 text-center text-[#747686] text-[13px] border border-dashed border-[#e5eeff] rounded-xl bg-[#fafcff]">
                No sessions have been scheduled or completed in this hall yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[550px]">
                  <thead>
                    <tr className="bg-[#eff4ff] font-code-sm text-[11px] text-[#747686] uppercase tracking-wider">
                      <th className="px-4 py-3 rounded-l-lg">Course / Exam</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3">Candidates</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right rounded-r-lg">Console</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eff4ff]">
                    {sessions.map((sess) => {
                      const isActive = sess.status === 'ACTIVE'
                      return (
                        <tr key={sess.id} className="hover:bg-[#f8f9ff] transition-colors">
                          <td className="px-4 py-3.5 font-bold text-[14px] text-[#0b1c30]">
                            {sess.course_name}
                            {sess.course_code && (
                              <span className="block font-code-sm text-[11px] text-[#747686] font-normal">
                                {sess.course_code}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse'
                                  : sess.status === 'COMPLETED'
                                  ? 'bg-[#f8f9ff] text-[#747686] border-[#c4c5d7]'
                                  : 'bg-[#eff4ff] text-[#0037b0] border-[#bbd6ff]'
                              }`}
                            >
                              {sess.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-code-sm text-[12px] text-[#434655]">
                            {sess.duration_minutes}m
                          </td>
                          <td className="px-4 py-3.5 font-code-sm text-[12px] text-[#434655]">
                            {sess.expected_students}
                          </td>
                          <td className="px-4 py-3.5 font-code-sm text-[11px] text-[#747686]">
                            {new Date(sess.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <Link
                              href={`/hall/session/${sess.id}`}
                              className="text-[#1d4ed8] hover:underline font-semibold text-[13px]"
                            >
                              {isActive ? 'Live Console →' : 'Review →'}
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Fast Session Starter & Hall Settings */}
        <div className="space-y-6">
          {/* Quick Launch Card */}
          <div className="bg-gradient-to-b from-[#eff4ff] to-white rounded-2xl border border-[#bbd6ff] p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-[#0037b0] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                ⚡
              </span>
              <div>
                <h3 className="font-bold text-[#0b1c30] text-[15px]">Direct Session Launcher</h3>
                <p className="text-[12px] text-[#434655]">Start an invigilation session instantly</p>
              </div>
            </div>

            <p className="text-[13px] text-[#434655] leading-relaxed">
              Initiate a live session directly in this hall. Camera feeds will activate and start logging real-time anomaly detection.
            </p>

            <button
              type="button"
              onClick={() => setIsSessionModalOpen(true)}
              className="w-full bg-[#1d4ed8] hover:bg-[#0037b0] text-white py-3 rounded-xl text-[14px] font-bold shadow-md transition-all flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
              <span>Create Session Now</span>
            </button>
          </div>

          {/* Hall Configuration & Rename */}
          <div className="bg-white rounded-2xl border border-[#e5eeff] p-5 sm:p-6 space-y-4 shadow-sm">
            <h3 className="font-code-sm text-[11px] font-bold uppercase tracking-wider text-[#466083]">
              Hall Profile &amp; Settings
            </h3>

            <form onSubmit={handleUpdateName} className="space-y-3">
              <div>
                <label className="block text-[13px] font-medium text-[#0b1c30] mb-1">
                  Examination Hall Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingName || editName === classroom.name}
                className="w-full py-2.5 rounded-lg bg-[#0b1c30] hover:bg-black text-white text-[13px] font-semibold disabled:opacity-50 transition-colors shadow-xs"
              >
                {isUpdatingName ? 'Saving…' : 'Update Hall Name'}
              </button>
            </form>

            <div className="pt-3 border-t border-[#f0f4fd] space-y-2 text-[12px] text-[#747686]">
              <div className="flex items-center justify-between">
                <span>Hall Identifier:</span>
                <span className="font-mono text-[11px]">{classroom.id.slice(0, 13)}…</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Created:</span>
                <span>{new Date(classroom.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Code Expiry:</span>
                <span>{classroom.code_expires_at ? new Date(classroom.code_expires_at).toLocaleDateString() : '7 Days'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Direct Session Creation Modal ── */}
      {isSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 sm:p-7 shadow-2xl border border-[#e5eeff] space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5eeff]">
              <div>
                <h3 className="text-lg font-bold text-[#0b1c30]">Launch Examination Session</h3>
                <p className="text-[12px] text-[#747686]">For Hall: <strong className="text-[#0b1c30]">{classroom.name}</strong></p>
              </div>
              <button
                type="button"
                onClick={() => setIsSessionModalOpen(false)}
                className="text-[#747686] hover:text-[#0b1c30] p-1 rounded-lg"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              {/* Mode Selector */}
              {availableExams.length > 0 && (
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#eff4ff] rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSessionMode('custom')}
                    className={`py-2 text-[12px] font-bold rounded-lg transition-all ${
                      sessionMode === 'custom' ? 'bg-white text-[#0037b0] shadow-xs' : 'text-[#434655]'
                    }`}
                  >
                    Custom Examination
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionMode('from_exam')}
                    className={`py-2 text-[12px] font-bold rounded-lg transition-all ${
                      sessionMode === 'from_exam' ? 'bg-white text-[#0037b0] shadow-xs' : 'text-[#434655]'
                    }`}
                  >
                    Pick Scheduled Exam ({availableExams.length})
                  </button>
                </div>
              )}

              {/* Pick from existing exams */}
              {sessionMode === 'from_exam' && availableExams.length > 0 && (
                <div>
                  <label className="block text-[13px] font-medium text-[#0b1c30] mb-1.5">
                    Select Scheduled Examination *
                  </label>
                  <select
                    value={selectedExamId}
                    onChange={(e) => handleSelectExam(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all font-medium"
                  >
                    <option value="">-- Choose an Examination --</option>
                    {availableExams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.title} ({ex.exam_date} • {ex.duration_minutes}m)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Course Title */}
              <div>
                <label className="block text-[13px] font-medium text-[#0b1c30] mb-1.5">
                  Examination / Course Title *
                </label>
                <input
                  type="text"
                  required
                  value={sessionCourseName}
                  onChange={(e) => setSessionCourseName(e.target.value)}
                  placeholder="e.g. Mathematics Paper 2 (Pure & Mechanics)"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all font-medium"
                />
              </div>

              {/* Course Code (Optional) */}
              <div>
                <label className="block text-[13px] font-medium text-[#0b1c30] mb-1.5">
                  Course Code <span className="text-[#747686] text-[11px] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={sessionCourseCode}
                  onChange={(e) => setSessionCourseCode(e.target.value)}
                  placeholder="e.g. MATH-402"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all font-medium font-mono"
                />
              </div>

              {/* Duration & Presets */}
              <div>
                <label className="block text-[13px] font-medium text-[#0b1c30] mb-1.5">
                  Duration (Minutes) *
                </label>
                <div className="flex items-center gap-2 mb-2">
                  {[30, 60, 90, 120, 180].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setSessionDuration(mins)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                        sessionDuration === mins
                          ? 'bg-[#1d4ed8] text-white border-[#1d4ed8]'
                          : 'bg-[#eff4ff] text-[#434655] border-[#c4c5d7] hover:bg-[#e0ecff]'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={5}
                  max={600}
                  required
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(parseInt(e.target.value, 10) || 60)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all font-medium"
                />
              </div>

              {/* Expected Students */}
              <div>
                <label className="block text-[13px] font-medium text-[#0b1c30] mb-1.5">
                  Expected Candidate Count
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  required
                  value={sessionStudents}
                  onChange={(e) => setSessionStudents(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all font-medium"
                />
              </div>

              {/* Start Immediately checkbox */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#eff4ff] border border-[#bbd6ff] cursor-pointer">
                <input
                  type="checkbox"
                  checked={startImmediately}
                  onChange={(e) => setStartImmediately(e.target.checked)}
                  className="w-4 h-4 text-[#1d4ed8] rounded accent-[#1d4ed8]"
                />
                <span className="text-[13px] font-semibold text-[#0b1c30]">
                  Start session immediately &amp; navigate to live invigilation console
                </span>
              </label>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-[#e5eeff] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSessionModalOpen(false)}
                  className="px-4 py-2 text-[13px] font-medium text-[#434655] hover:text-[#0b1c30]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSession}
                  className="px-6 py-2.5 rounded-xl bg-[#1d4ed8] hover:bg-[#0037b0] text-white text-[14px] font-bold disabled:opacity-50 transition-colors shadow-md flex items-center gap-2"
                >
                  {isCreatingSession ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Launching…
                    </>
                  ) : (
                    <>
                      {startImmediately ? 'Launch Live Console →' : 'Schedule Session'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Camera Modal ── */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 sm:p-7 shadow-2xl space-y-4 border border-[#e5eeff]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5eeff]">
              <div>
                <h3 className="text-[16px] font-bold text-[#0b1c30]">Attach Camera to Hall</h3>
                <p className="text-[12px] text-[#747686]">{classroom.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(false)}
                className="text-[#747686] hover:text-[#0b1c30] p-1 rounded-lg"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddCamera} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#0b1c30] mb-1">
                  Camera Label / Position *
                </label>
                <input
                  type="text"
                  required
                  value={cameraName}
                  onChange={(e) => setCameraName(e.target.value)}
                  placeholder="e.g. Camera 1 (Front Wide Angle)"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#0b1c30] mb-1">
                  Camera Sequence Number (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  max="32"
                  value={cameraNumber}
                  onChange={(e) => setCameraNumber(e.target.value)}
                  placeholder={`e.g. ${cameras.length + 1}`}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCameraModalOpen(false)}
                  className="px-4 py-2 text-[13px] font-medium text-[#434655] hover:text-[#0b1c30]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingCamera}
                  className="px-5 py-2.5 rounded-xl bg-[#1d4ed8] hover:bg-[#0037b0] text-white text-[13px] sm:text-[14px] font-semibold disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isAddingCamera ? 'Attaching…' : 'Attach Camera →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
