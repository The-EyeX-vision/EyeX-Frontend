'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { HallSession, Classroom } from '@/types'

export default function SessionsManagementPage() {
  const [sessions, setSessions] = useState<HallSession[]>([])
  const [halls, setHalls] = useState<Classroom[]>([])
  const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Scheduled' | 'Completed'>('All')
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Schedule Exam Form State
  const [selectedHallId, setSelectedHallId] = useState('')
  const [courseName, setCourseName] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('120')
  const [expectedStudents, setExpectedStudents] = useState('30')

  async function loadData() {
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
        // Fetch Halls
        const { data: hList } = await supabase
          .from('classrooms')
          .select('*')
          .eq('school_id', school.id)

        if (hList) {
          setHalls(hList)
          if (hList.length > 0 && !selectedHallId) {
            setSelectedHallId(hList[0].id)
          }
        }

        // Fetch Sessions with Hall details
        const { data: sList } = await supabase
          .from('exam_hall_sessions')
          .select('*, classroom:classrooms(id, name, access_code)')
          .eq('school_id', school.id)
          .order('created_at', { ascending: false })

        if (sList) setSessions(sList)
      }
    } catch (err) {
      console.error('Error fetching sessions:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Schedule Session Handler
  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!selectedHallId || !courseName.trim()) {
      setError('Please select a hall and provide a Course Name.')
      return
    }

    setIsScheduling(true)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId: selectedHallId,
          courseName,
          courseCode,
          durationMinutes: parseInt(durationMinutes, 10) || 120,
          expectedStudents: parseInt(expectedStudents, 10) || 30,
          startImmediately: false, // Scheduled
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setIsModalOpen(false)
        setCourseName('')
        setCourseCode('')
        loadData()
      } else {
        setError(data.error || 'Failed to schedule exam session.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error submitting schedule.')
    } finally {
      setIsScheduling(false)
    }
  }

  // Filtered Sessions
  const filtered = sessions.filter((s) => {
    if (activeTab === 'All') return true
    if (activeTab === 'Active') return s.status === 'ACTIVE'
    if (activeTab === 'Scheduled') return s.status === 'SCHEDULED'
    if (activeTab === 'Completed') return s.status === 'COMPLETED'
    return true
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto selection:bg-teal-900 selection:text-teal-100">
      {/* ── Page Header & Schedule Action ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Examination Sessions
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Complete schedule, live active tests, and historical proctoring archives across all halls.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <span>📅</span> Schedule Examination
        </button>
      </div>

      {/* ── Filter Tabs (Accessible Touch Targets) ── */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-3 overflow-x-auto">
        {(['All', 'Active', 'Scheduled', 'Completed'] as const).map((tab) => {
          const isActive = activeTab === tab
          const count =
            tab === 'All'
              ? sessions.length
              : tab === 'Active'
              ? sessions.filter((s) => s.status === 'ACTIVE').length
              : tab === 'Scheduled'
              ? sessions.filter((s) => s.status === 'SCHEDULED').length
              : sessions.filter((s) => s.status === 'COMPLETED').length

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-teal-950 text-teal-300 border border-teal-800 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <span>{tab}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isActive ? 'bg-teal-900 text-teal-200' : 'bg-gray-800 text-gray-400'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Sessions Table / Cards ── */}
      {isLoading ? (
        <div className="p-12 text-center text-gray-400 text-sm">
          Loading Examination Sessions…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center space-y-3">
          <span className="text-4xl block">📋</span>
          <h2 className="text-base font-bold text-white">No {activeTab.toLowerCase()} sessions found</h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-sm mx-auto">
            Schedule an upcoming examination or start one immediately from the hall workspace.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-2 min-h-[44px] px-4 py-2 rounded-lg bg-[#0e5a4d] text-white text-xs font-semibold"
          >
            Schedule Examination Now
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950/70 text-gray-400 font-mono">
                  <th className="px-5 py-4">Course Details</th>
                  <th className="px-5 py-4">Assigned Hall</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Duration</th>
                  <th className="px-5 py-4">Candidates</th>
                  <th className="px-5 py-4">Date &amp; Time</th>
                  <th className="px-5 py-4 text-right">Console</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {filtered.map((s) => {
                  const isActive = s.status === 'ACTIVE'
                  const statusColor =
                    s.status === 'ACTIVE'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : s.status === 'SCHEDULED'
                      ? 'bg-blue-950 text-blue-300 border-blue-800'
                      : 'bg-gray-800 text-gray-400 border-gray-700'

                  return (
                    <tr key={s.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <Link
                          href={`/hall/session/${s.id}`}
                          className="font-bold text-sm text-white hover:text-teal-300 transition-colors"
                        >
                          {s.course_name}
                        </Link>
                        {s.course_code && (
                          <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                            {s.course_code}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-gray-300">
                        {s.classroom?.name || 'Classroom Hall'}
                      </td>

                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${statusColor}`}>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                          {s.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-mono text-gray-300">
                        {s.duration_minutes} min
                      </td>

                      <td className="px-5 py-4 font-mono text-gray-300">
                        {s.expected_students} Expected
                      </td>

                      <td className="px-5 py-4 text-gray-400 font-mono">
                        {s.started_at
                          ? new Date(s.started_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                          : new Date(s.created_at).toLocaleDateString()}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/hall/session/${s.id}`}
                          className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1 ${
                            isActive
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                          }`}
                        >
                          {isActive ? 'Enter Live →' : 'View →'}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Schedule Exam Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="text-base font-bold text-white">Schedule Examination Session</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSchedule} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg border border-red-800 bg-red-950/50 text-red-300 text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Examination Hall / Room *
                </label>
                <select
                  required
                  value={selectedHallId}
                  onChange={(e) => setSelectedHallId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-700 bg-gray-950 text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {halls.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} (Code: {h.access_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Course / Subject Title *
                </label>
                <input
                  type="text"
                  required
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. Cambridge Biology A-Level"
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
                  placeholder="e.g. BIO-9700"
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
                  disabled={isScheduling}
                  className="min-h-[44px] px-5 py-2 rounded-lg bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-xs sm:text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isScheduling ? 'Scheduling…' : 'Schedule Session →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
