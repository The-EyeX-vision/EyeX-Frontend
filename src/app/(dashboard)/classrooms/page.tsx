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
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function loadHalls() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: school } = await supabase.from('schools').select('id').eq('auth_user_id', user.id).maybeSingle()
      if (school) {
        const { data: halls } = await supabase
          .from('classrooms')
          .select('*, cameras(id)')
          .eq('school_id', school.id)
          .order('created_at', { ascending: false })
        if (halls) {
          setClassrooms(halls.map((h) => ({ ...h, cameras_count: h.cameras ? h.cameras.length : 0 })))
        }
      }
    } catch (err) { console.error(err) }
    finally { setIsLoading(false) }
  }

  useEffect(() => { loadHalls() }, [])

  async function handleRotateCode(classroomId: string) {
    setRotatingId(classroomId)
    try {
      const res = await fetch(`/api/classrooms/${classroomId}/rotate-code`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        setClassrooms((prev) => prev.map((c) => c.id === classroomId ? { ...c, access_code: data.access_code, code_expires_at: data.code_expires_at } : c))
      } else { alert(data.error || 'Failed to rotate code.') }
    } catch { alert('Error rotating code.') }
    finally { setRotatingId(null) }
  }

  async function handleAddHall(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!hallName.trim()) return
    setIsCreating(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      let { data: school } = await supabase.from('schools').select('id').eq('auth_user_id', user.id).maybeSingle()
      if (!school) {
        const fallbackName =
          (user.user_metadata?.school_name as string) ||
          (user.email ? user.email.split('@')[0].toUpperCase() : 'EyeX School')
        const { data: created } = await supabase
          .from('schools')
          .insert({
            auth_user_id: user.id,
            school_name: fallbackName,
            email: user.email || '',
          })
          .select('id')
          .maybeSingle()
        if (created) school = created
      }
      if (!school) { setError('School record not found. Please reload or sign in again.'); setIsCreating(false); return }
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      let code = ''
      for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
      const { data: newHall, error: insertError } = await supabase
        .from('classrooms')
        .insert({ school_id: school.id, name: hallName.trim(), access_code: code, code_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
        .select().single()
      if (insertError) { setError(insertError.message); setIsCreating(false); return }
      if (newHall) await supabase.from('cameras').insert({ classroom_id: newHall.id, camera_number: 1, name: 'Camera 1 (Front Wide)', status: 'ACTIVE' })
      setIsModalOpen(false)
      setHallName('')
      loadHalls()
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to add hall.') }
    finally { setIsCreating(false) }
  }

  async function handleDeleteHall(id: string) {
    if (!confirm('Are you sure you want to remove this examination hall? All cameras and session data will be deleted.')) return
    const supabase = createClient()
    const { error } = await supabase.from('classrooms').delete().eq('id', id)
    if (error) { alert(error.message) } else { setClassrooms((prev) => prev.filter((c) => c.id !== id)) }
  }

  function copyCode(hall: Classroom) {
    navigator.clipboard.writeText(hall.access_code).then(() => {
      setCopiedId(hall.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const filtered = classrooms.filter((h) =>
    !search || h.name.toLowerCase().includes(search.toLowerCase()) || h.access_code.toLowerCase().includes(search.toLowerCase())
  )

  const totalCameras = classrooms.reduce((acc, h) => acc + ((h as Classroom & { cameras_count?: number }).cameras_count ?? 0), 0)

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">

      {/* ── Page Header ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-6 bg-[#1d4ed8] rounded-sm shrink-0" />
              <h1 className="font-headline-lg text-[#0b1c30] tracking-tight">
                <span className="sm:hidden">Examination Halls</span>
                <span className="hidden sm:inline">Examination Halls &amp; Hall Terminals</span>
              </h1>
            </div>
            <p className="text-[14px] text-[#434655] pl-5 leading-relaxed hidden sm:block">
              Configure examination halls, manage 8-character invigilator access codes, and monitor camera rig connections.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-[#1d4ed8] text-white font-semibold px-3.5 py-2 sm:px-4 sm:py-2 rounded-lg text-[13px] sm:text-[14px] hover:bg-[#0037b0] transition-colors shadow-sm"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Register New Hall</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Configured Halls', value: classrooms.length, sub: 'Halls Calibrated', iconColor: 'text-[#0037b0] bg-[#eff4ff]' },
          { label: 'Active Cameras', value: totalCameras, sub: 'Total Feeds', iconColor: 'text-[#0037b0] bg-[#eff4ff]' },
          { label: 'Access Tokens', value: classrooms.length, sub: 'Active Passkeys', iconColor: 'text-[#0037b0] bg-[#eff4ff]' },
          { label: 'Expired Codes', value: classrooms.filter((h) => h.code_expires_at && new Date(h.code_expires_at) < new Date()).length, sub: 'Need Rotation', iconColor: 'text-[#b91c1c] bg-[#fef2f2]' },
        ].map((s) => (
          <div key={s.label} className="bg-white p-3 sm:p-4 rounded-xl shadow-sm flex flex-col gap-1.5 sm:gap-2">
            <span className="font-code-sm text-[10px] sm:text-[11px] uppercase tracking-wider text-[#747686] font-semibold">{s.label}</span>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-xl text-[#0b1c30] font-bold text-xl sm:text-2xl">{s.value}</span>
              <span className="text-[11px] sm:text-[12px] text-[#466083] font-medium hidden sm:inline">{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + Filter Bar ───────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-[#eff4ff] px-3 py-2 rounded-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4 text-[#747686] shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search by hall name or access token..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-0 outline-none w-full text-[14px] text-[#0b1c30] placeholder:text-[#747686]"
          />
        </div>
      </div>

      {/* ── Halls Table ───────────────────────────────────────────── */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-[#747686] text-[14px]">
          Loading examination halls...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#1d4ed8]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.75a1.5 1.5 0 011.5-1.5h1.5a1.5 1.5 0 011.5 1.5V21m6-9.75h.75m-.75 3h.75m-.75 3h.75" />
            </svg>
          </div>
          <h2 className="font-headline-md text-[#0b1c30]">{search ? 'No halls match your search' : 'No examination halls configured'}</h2>
          <p className="text-[14px] text-[#747686] max-w-sm">
            {search ? 'Try a different search term.' : 'Create your first examination hall to generate 8-character access codes for invigilators.'}
          </p>
          {!search && (
            <button onClick={() => setIsModalOpen(true)} className="mt-2 flex items-center gap-2 bg-[#1d4ed8] text-white font-semibold px-4 py-2 rounded-lg text-[14px] hover:bg-[#0037b0] transition-colors">
              Register First Hall
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[340px] sm:min-w-[650px]">
              <thead>
                <tr className="bg-[#eff4ff] font-code-sm text-[11px] text-[#747686] uppercase tracking-wider">
                  <th className="py-3 px-3 sm:px-5">Hall</th>
                  <th className="py-3 px-3 sm:px-5">Access Code</th>
                  <th className="py-3 px-4 hidden md:table-cell">Camera Feeds</th>
                  <th className="py-3 px-3 sm:px-5">Status</th>
                  <th className="py-3 px-3 sm:px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff4ff]">
                {filtered.map((hall) => {
                  const isRotating = rotatingId === hall.id
                  const isExpired = hall.code_expires_at && new Date(hall.code_expires_at) < new Date()
                  const isCopied = copiedId === hall.id
                  const camCount = (hall as Classroom & { cameras_count?: number }).cameras_count ?? 0

                  return (
                    <tr key={hall.id} className="hover:bg-[#f8f9ff] transition-colors">
                      <td className="py-3.5 sm:py-4 px-3 sm:px-5">
                        <Link href={`/classrooms/${hall.id}`} className="font-semibold text-[13px] sm:text-[14px] text-[#0b1c30] hover:text-[#1d4ed8] transition-colors">
                          {hall.name}
                        </Link>
                        <p className="font-code-sm text-[10px] sm:text-[11px] text-[#747686] mt-0.5 hidden sm:block">ID: {hall.id.slice(0, 8)}…</p>
                      </td>

                      <td className="py-3.5 sm:py-4 px-3 sm:px-5">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="font-code-md text-[12px] sm:text-[13px] font-bold text-[#0037b0] bg-[#eff4ff] px-2 sm:px-3 py-1 rounded-lg tracking-wider sm:tracking-widest border border-[#bbd6ff]">
                            {hall.access_code}
                          </span>
                          <button
                            onClick={() => copyCode(hall)}
                            title="Copy access code"
                            className="p-1 sm:p-1.5 rounded-lg text-[#747686] hover:bg-[#eff4ff] hover:text-[#0037b0] transition-colors"
                          >
                            {isCopied ? (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-emerald-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleRotateCode(hall.id)}
                            disabled={isRotating}
                            title="Rotate access code"
                            className="p-1 sm:p-1.5 rounded-lg text-[#747686] hover:bg-[#eff4ff] hover:text-[#0037b0] transition-colors disabled:opacity-50"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                          </button>
                        </div>
                        {hall.code_expires_at && (
                          <p className="font-code-sm text-[10px] text-[#747686] mt-1 hidden sm:block">
                            Expires: {new Date(hall.code_expires_at).toLocaleDateString()}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 sm:py-4 px-4 hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                          <span className="text-[13px] text-[#434655]">{camCount} Camera{camCount !== 1 ? 's' : ''}</span>
                        </div>
                      </td>

                      <td className="py-3.5 sm:py-4 px-3 sm:px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-code-sm text-[10px] font-bold ${
                          isExpired
                            ? 'bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {isExpired ? 'EXPIRED' : 'ACTIVE'}
                        </span>
                      </td>

                      <td className="py-3.5 sm:py-4 px-3 sm:px-5">
                        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                          <Link
                            href={`/classrooms/${hall.id}`}
                            className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[#eff4ff] text-[#0037b0] text-[12px] sm:text-[13px] font-semibold hover:bg-[#e5eeff] transition-colors"
                          >
                            Manage →
                          </Link>
                          <button
                            onClick={() => handleDeleteHall(hall.id)}
                            className="p-1.5 rounded-lg text-[#747686] hover:text-[#b91c1c] hover:bg-[#fef2f2] transition-colors"
                            title="Delete Hall"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
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

      {/* ── Add Hall Modal ───────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5eeff]">
              <div>
                <h3 className="font-headline-md text-[#0b1c30]">Register New Examination Hall</h3>
                <p className="text-[12px] text-[#747686] mt-0.5">An 8-character access code and Camera 1 will be auto-generated.</p>
              </div>
              <button onClick={() => { setIsModalOpen(false); setError(null) }} className="p-2 text-[#747686] hover:bg-[#eff4ff] hover:text-[#0b1c30] rounded-lg transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddHall} className="p-6 flex flex-col gap-4">
              {error && (
                <div className="p-3 bg-[#fef2f2] border border-[#fecaca] rounded-lg text-[13px] text-[#b91c1c]">{error}</div>
              )}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="hall_name" className="text-[13px] font-medium text-[#0b1c30]">Hall / Classroom Name *</label>
                <input
                  id="hall_name"
                  type="text"
                  required
                  autoFocus
                  value={hallName}
                  onChange={(e) => setHallName(e.target.value)}
                  placeholder="e.g. Hall B (Science Wing) or Main Auditorium"
                  className="w-full px-3.5 py-2.5 bg-[#eff4ff] rounded-lg text-[14px] text-[#0b1c30] placeholder:text-[#747686] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setIsModalOpen(false); setError(null) }} className="px-4 py-2 text-[14px] text-[#434655] hover:text-[#0b1c30] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isCreating} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1d4ed8] hover:bg-[#0037b0] disabled:opacity-60 text-white text-[14px] font-semibold transition-colors shadow-sm">
                  {isCreating ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      Creating...
                    </>
                  ) : 'Create Hall →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
