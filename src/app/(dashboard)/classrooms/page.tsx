'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Classroom } from '@/types'

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [hallName, setHallName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rotatingId, setRotatingId] = useState<string | null>(null)

  async function loadHalls() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data: school } = await supabase
        .from('schools')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (school) {
        const { data: halls } = await supabase
          .from('classrooms')
          .select('*, cameras(id)')
          .eq('school_id', school.id)
          .order('created_at', { ascending: false })

        if (halls) {
          const formatted = halls.map((h) => ({
            ...h,
            cameras_count: h.cameras ? h.cameras.length : 0,
          }))
          setClassrooms(formatted)
        }
      }
    } catch (err) {
      console.error('Error fetching classrooms:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadHalls()
  }, [])

  // Rotate Code Handler
  async function handleRotateCode(classroomId: string) {
    setRotatingId(classroomId)
    try {
      const res = await fetch(`/api/classrooms/${classroomId}/rotate-code`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setClassrooms((prev) =>
          prev.map((c) =>
            c.id === classroomId
              ? { ...c, access_code: data.access_code, code_expires_at: data.code_expires_at }
              : c
          )
        )
      } else {
        alert(data.error || 'Failed to rotate code.')
      }
    } catch {
      alert('Error rotating code.')
    } finally {
      setRotatingId(null)
    }
  }

  // Add Hall Form Submission
  async function handleAddHall(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!hallName.trim()) return

    setIsCreating(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: school } = await supabase
        .from('schools')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (!school) {
        setError('School record not found.')
        setIsCreating(false)
        return
      }

      // Generate random 8-character access code
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      let code = ''
      for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))

      const { data: newHall, error: insertError } = await supabase
        .from('classrooms')
        .insert({
          school_id: school.id,
          name: hallName.trim(),
          access_code: code,
          code_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single()

      if (insertError) {
        setError(insertError.message)
        setIsCreating(false)
        return
      }

      // Auto-attach default Camera 1
      if (newHall) {
        await supabase.from('cameras').insert({
          classroom_id: newHall.id,
          camera_number: 1,
          name: 'Camera 1 (Front Wide)',
          status: 'ACTIVE',
        })
      }

      setIsModalOpen(false)
      setHallName('')
      loadHalls()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add hall.')
    } finally {
      setIsCreating(false)
    }
  }

  // Delete Hall Handler
  async function handleDeleteHall(id: string) {
    if (!confirm('Are you sure you want to remove this examination hall?')) return

    const supabase = createClient()
    const { error } = await supabase.from('classrooms').delete().eq('id', id)
    if (error) {
      alert(error.message)
    } else {
      setClassrooms((prev) => prev.filter((c) => c.id !== id))
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto selection:bg-teal-900 selection:text-teal-100">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Examination Halls (Classrooms)
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Manage halls, generate rotating access codes, and configure attached cameras.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <span>+</span> Add New Hall
        </button>
      </div>

      {/* ── Halls List Table / Cards ── */}
      {isLoading ? (
        <div className="p-12 text-center text-gray-400 text-sm">
          Loading Examination Halls…
        </div>
      ) : classrooms.length === 0 ? (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center space-y-3">
          <span className="text-4xl block">🏛️</span>
          <h2 className="text-base font-bold text-white">No examination halls configured</h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-sm mx-auto">
            Create your first examination hall to produce 8-character access codes for examiners.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-2 min-h-[44px] px-4 py-2 rounded-lg bg-[#0e5a4d] text-white text-xs font-semibold"
          >
            Add Hall Now
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950/70 text-gray-400 font-mono">
                  <th className="px-5 py-4">Hall Name</th>
                  <th className="px-5 py-4">Terminal Access Code</th>
                  <th className="px-5 py-4">Expiration Status</th>
                  <th className="px-5 py-4">Cameras</th>
                  <th className="px-5 py-4 text-center">Rotate Code</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {classrooms.map((hall) => {
                  const isRotating = rotatingId === hall.id
                  const isExpired = hall.code_expires_at && new Date(hall.code_expires_at) < new Date()

                  return (
                    <tr key={hall.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <Link
                          href={`/classrooms/${hall.id}`}
                          className="font-bold text-sm text-white hover:text-teal-300 transition-colors"
                        >
                          {hall.name}
                        </Link>
                        <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                          ID: {hall.id.slice(0, 8)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-bold text-teal-300 bg-teal-950/80 px-2.5 py-1 rounded-md border border-teal-800/80 tracking-widest">
                          {hall.access_code}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            isExpired
                              ? 'bg-red-950 text-red-400 border-red-800'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          }`}
                        >
                          {isExpired ? 'EXPIRED' : 'ACTIVE & VALID'}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-mono text-gray-300">
                        {hall.cameras_count || 1} Camera{hall.cameras_count !== 1 ? 's' : ''}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRotateCode(hall.id)}
                          disabled={isRotating}
                          className="min-h-[36px] px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                          title="Generate a fresh 8-character access code"
                        >
                          <span>🔄</span>
                          <span>{isRotating ? 'Rotating…' : 'Rotate Code'}</span>
                        </button>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/classrooms/${hall.id}`}
                            className="min-h-[36px] px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium transition-colors flex items-center"
                          >
                            Setup &rarr;
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteHall(hall.id)}
                            className="min-h-[36px] p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-950/20 transition-colors"
                            title="Delete Hall"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add Hall Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="text-base font-bold text-white">Create Examination Hall</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddHall} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg border border-red-800 bg-red-950/50 text-red-300 text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Hall / Classroom Name *
                </label>
                <input
                  type="text"
                  required
                  value={hallName}
                  onChange={(e) => setHallName(e.target.value)}
                  placeholder="e.g. Hall B (Science Wing) or Main Auditorium"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-700 bg-gray-950 text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                  autoFocus
                />
              </div>

              <p className="text-[11px] text-gray-500">
                An 8-character terminal access code and default Camera 1 will be generated automatically.
              </p>

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
                  disabled={isCreating}
                  className="min-h-[44px] px-5 py-2 rounded-lg bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-xs sm:text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isCreating ? 'Creating…' : 'Create Hall →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
