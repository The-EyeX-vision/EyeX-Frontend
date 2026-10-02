'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Classroom, Camera, HallSession } from '@/types'

export default function ClassroomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [cameras, setCameras] = useState<Camera[]>([])
  const [pastSessions, setPastSessions] = useState<HallSession[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Edit Hall State
  const [editName, setEditName] = useState('')
  const [isUpdatingName, setIsUpdatingName] = useState(false)

  // Add Camera State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false)
  const [cameraName, setCameraName] = useState('')
  const [cameraNumber, setCameraNumber] = useState('')
  const [isAddingCamera, setIsAddingCamera] = useState(false)

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
      }

      // 2. Fetch Cameras
      const { data: cams } = await supabase
        .from('cameras')
        .select('*')
        .eq('classroom_id', id)
        .order('camera_number', { ascending: true })

      if (cams) setCameras(cams)

      // 3. Fetch past sessions
      const { data: sessions } = await supabase
        .from('exam_hall_sessions')
        .select('*')
        .eq('classroom_id', id)
        .order('created_at', { ascending: false })

      if (sessions) setPastSessions(sessions)
    } catch (err) {
      console.error('Error loading classroom details:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

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
      alert(error.message)
    } else {
      setClassroom((prev) => (prev ? { ...prev, name: editName.trim() } : null))
      alert('Hall name updated successfully.')
    }
    setIsUpdatingName(false)
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
        loadData()
      } else {
        alert(data.error || 'Failed to add camera.')
      }
    } catch {
      alert('Error registering camera.')
    } finally {
      setIsAddingCamera(false)
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center text-[#747686] text-[14px]">
        Loading Hall Setup…
      </div>
    )
  }

  if (!classroom) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center space-y-3">
        <p className="text-[#434655]">Hall not found.</p>
        <Link href="/classrooms" className="text-[#1d4ed8] text-[13px] font-semibold hover:underline">
          ← Back to Examination Halls
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col gap-1">
        <nav className="flex items-center gap-1.5 text-[13px] text-[#747686]">
          <Link href="/classrooms" className="hover:text-[#0037b0] transition-colors">Examination Halls</Link>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          <span className="font-medium text-[#0b1c30]">{classroom.name}</span>
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-3">
            <h1 className="font-headline-lg text-[#0b1c30] tracking-tight">
              {classroom.name}
            </h1>
            <span className="font-mono text-[13px] font-bold text-[#0037b0] bg-[#eff4ff] px-3 py-1 rounded-lg border border-[#bbd6ff]">
              Code: {classroom.access_code}
            </span>
          </div>

          <Link
            href={`/hall/${classroom.id}`}
            className="flex items-center gap-1.5 bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0037b0] px-4 py-2 rounded-lg text-[14px] font-semibold transition-colors"
          >
            <span>Open Examiner Workspace</span> &rarr;
          </Link>
        </div>
      </div>

      {/* ── Hall Settings Card (Rename) ── */}
      <div className="bg-white rounded-2xl border border-[#e5eeff] p-5 sm:p-6 space-y-4 shadow-sm">
        <h2 className="font-code-sm text-[11px] font-bold uppercase tracking-wider text-[#466083]">
          Hall Configuration
        </h2>

        <form onSubmit={handleUpdateName} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1">
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
            className="min-h-[42px] px-5 py-2 rounded-lg bg-[#1d4ed8] hover:bg-[#0037b0] text-white text-[14px] font-semibold disabled:opacity-50 transition-colors shadow-sm"
          >
            {isUpdatingName ? 'Saving…' : 'Save Name'}
          </button>
        </form>

        <div className="pt-3 border-t border-[#e5eeff] text-[12px] text-[#747686] flex flex-wrap gap-4 font-mono">
          <span>Terminal ID: {classroom.id}</span>
          <span>•</span>
          <span>
            Access Code Expiration:{' '}
            {classroom.code_expires_at
              ? new Date(classroom.code_expires_at).toLocaleDateString()
              : 'Rolling 7-Day Window'}
          </span>
        </div>
      </div>

      {/* ── Cameras Attached to this Hall ── */}
      <div className="bg-white rounded-2xl border border-[#e5eeff] p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-code-sm text-[11px] font-bold uppercase tracking-wider text-[#466083]">
              Attached Cameras &amp; Video Streams ({cameras.length})
            </h2>
            <p className="text-[13px] text-[#747686] mt-0.5">
              Live hardware cameras bound to this examination hall.
            </p>
          </div>

          <button
            onClick={() => setIsCameraModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1d4ed8] hover:bg-[#0037b0] text-white text-[13px] font-semibold transition-colors shadow-sm"
          >
            <span>+</span> Add Camera
          </button>
        </div>

        {cameras.length === 0 ? (
          <div className="p-8 text-center text-[#747686] text-[13px]">
            No cameras attached yet. Click &quot;Add Camera&quot; to configure overhead streams.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cameras.map((cam) => {
              const isOnline = cam.status === 'ACTIVE'
              return (
                <div
                  key={cam.id}
                  className="rounded-xl border border-[#e5eeff] bg-[#eff4ff] p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white text-[#0037b0] flex items-center justify-center shadow-xs">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-7.5A2.25 2.25 0 0013.5 6.75h-9a2.25 2.25 0 00-2.25 2.25v7.5A2.25 2.25 0 004.5 18.75z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-[#0b1c30] leading-tight">
                        {cam.name || `Camera ${cam.camera_number}`}
                      </p>
                      <p className="font-code-sm text-[11px] text-[#747686] mt-0.5">
                        Camera Number #{cam.camera_number}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleCameraStatus(cam)}
                    className={`px-3 py-1 rounded-full font-code-sm text-[10px] font-bold border transition-colors ${
                      isOnline
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca] hover:bg-[#fee2e2]'
                    }`}
                    title="Click to toggle camera status"
                  >
                    {cam.status} (Toggle)
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Past Examinations History ── */}
      <div className="bg-white rounded-2xl border border-[#e5eeff] p-5 sm:p-6 space-y-4 shadow-sm">
        <h2 className="font-code-sm text-[11px] font-bold uppercase tracking-wider text-[#466083]">
          History of Examinations in this Hall ({pastSessions.length})
        </h2>

        {pastSessions.length === 0 ? (
          <div className="p-8 text-center text-[#747686] text-[13px]">
            No examination sessions have been conducted in this hall yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-[#eff4ff] font-code-sm text-[11px] text-[#747686] uppercase tracking-wider">
                  <th className="px-4 py-3">Course Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Candidates</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Console</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff4ff]">
                {pastSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-[#f8f9ff] transition-colors">
                    <td className="px-4 py-3.5 font-bold text-[14px] text-[#0b1c30]">
                      {session.course_name}
                      {session.course_code && (
                        <span className="block font-code-sm text-[11px] text-[#747686] font-normal">
                          {session.course_code}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded font-code-sm text-[10px] font-bold uppercase bg-[#eff4ff] text-[#0037b0] border border-[#bbd6ff]">
                        {session.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-code-sm text-[12px] text-[#434655]">
                      {session.duration_minutes}m
                    </td>
                    <td className="px-4 py-3.5 font-code-sm text-[12px] text-[#434655]">
                      {session.expected_students}
                    </td>
                    <td className="px-4 py-3.5 font-code-sm text-[11px] text-[#747686]">
                      {new Date(session.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/hall/session/${session.id}`}
                        className="text-[#1d4ed8] hover:underline font-semibold text-[13px]"
                      >
                        Inspect &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Camera Modal ── */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 sm:p-7 shadow-2xl space-y-4 border border-[#e5eeff]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5eeff]">
              <h3 className="text-[16px] font-bold text-[#0b1c30]">Attach Camera to Hall</h3>
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
                  Camera Label / Name *
                </label>
                <input
                  type="text"
                  required
                  value={cameraName}
                  onChange={(e) => setCameraName(e.target.value)}
                  placeholder="e.g. Camera 3 (Rear Diagonal)"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#0b1c30] mb-1">
                  Camera Number (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={cameraNumber}
                  onChange={(e) => setCameraNumber(e.target.value)}
                  placeholder="e.g. 3"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCameraModalOpen(false)}
                  className="min-h-[40px] px-4 py-2 text-[13px] font-medium text-[#434655] hover:text-[#0b1c30]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingCamera}
                  className="min-h-[40px] px-5 py-2 rounded-lg bg-[#1d4ed8] hover:bg-[#0037b0] text-white text-[13px] sm:text-[14px] font-semibold disabled:opacity-50 transition-colors shadow-sm"
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
