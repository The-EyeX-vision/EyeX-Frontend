'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CameraIcon, CloseIcon } from '@/components/ui/Icons'
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
      <div className="p-12 text-center text-gray-400 text-sm">
        Loading Hall Setup…
      </div>
    )
  }

  if (!classroom) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-gray-400">Hall not found.</p>
        <Link href="/classrooms" className="text-teal-400 text-xs">
          ← Back to Examination Halls
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto selection:bg-teal-900 selection:text-teal-100">
      {/* ── Top Header ── */}
      <div>
        <Link
          href="/classrooms"
          className="text-xs text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1 mb-2"
        >
          ← Back to Examination Halls
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {classroom.name}
            </h1>
            <span className="font-mono text-xs font-bold text-teal-300 bg-teal-950 px-2.5 py-1 rounded-md border border-teal-800">
              Code: {classroom.access_code}
            </span>
          </div>

          <Link
            href={`/hall/${classroom.id}`}
            className="min-h-[40px] px-3.5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5"
          >
            <span>Open Examiner Workspace</span> &rarr;
          </Link>
        </div>
      </div>

      {/* ── Hall Settings Card (Rename) ── */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 sm:p-6 space-y-4 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
          Hall Configuration
        </h2>

        <form onSubmit={handleUpdateName} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Examination Hall Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-700 bg-gray-950 text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingName || editName === classroom.name}
            className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-xs sm:text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm"
          >
            {isUpdatingName ? 'Saving…' : 'Save Name'}
          </button>
        </form>

        <div className="pt-3 border-t border-gray-800 text-xs text-gray-400 flex flex-wrap gap-4 font-mono">
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
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
              Attached Cameras &amp; Video Streams ({cameras.length})
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Live hardware cameras bound to this examination hall.
            </p>
          </div>

          <button
            onClick={() => setIsCameraModalOpen(true)}
            className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5"
          >
            <span>+</span> Add Camera
          </button>
        </div>

        {cameras.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            No cameras attached yet. Click &quot;Add Camera&quot; to configure overhead streams.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cameras.map((cam) => {
              const isOnline = cam.status === 'ACTIVE'
              return (
                <div
                  key={cam.id}
                  className="rounded-xl border border-gray-800 bg-gray-950 p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <CameraIcon className="w-5 h-5 text-teal-400 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-white leading-tight">
                        {cam.name || `Camera ${cam.camera_number}`}
                      </p>
                      <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                        Camera Number #{cam.camera_number}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleCameraStatus(cam)}
                    className={`min-h-[36px] px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border transition-colors ${
                      isOnline
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:border-emerald-600'
                        : 'bg-red-950 text-red-400 border-red-800 hover:border-red-600'
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
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 sm:p-6 space-y-4 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
          History of Examinations in this Hall ({pastSessions.length})
        </h2>

        {pastSessions.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            No examination sessions have been conducted in this hall yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 font-mono">
                  <th className="px-4 py-3">Course Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Candidates</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Console</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {pastSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-white">
                      {session.course_name}
                      {session.course_code && (
                        <span className="block text-[11px] text-gray-400 font-mono font-normal">
                          {session.course_code}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-gray-800 text-gray-300 border border-gray-700">
                        {session.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-300 font-mono">
                      {session.duration_minutes}m
                    </td>
                    <td className="px-4 py-3.5 text-gray-300 font-mono">
                      {session.expected_students}
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 font-mono">
                      {new Date(session.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/hall/session/${session.id}`}
                        className="text-teal-400 hover:text-teal-300 font-medium"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="text-base font-bold text-white">Attach Camera to Hall</h3>
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCamera} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Camera Label / Name *
                </label>
                <input
                  type="text"
                  required
                  value={cameraName}
                  onChange={(e) => setCameraName(e.target.value)}
                  placeholder="e.g. Camera 3 (Rear Diagonal)"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-700 bg-gray-950 text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Camera Number (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={cameraNumber}
                  onChange={(e) => setCameraNumber(e.target.value)}
                  placeholder="e.g. 3"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-700 bg-gray-950 text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCameraModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 text-xs font-medium text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingCamera}
                  className="min-h-[44px] px-5 py-2 rounded-lg bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-xs sm:text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm"
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
