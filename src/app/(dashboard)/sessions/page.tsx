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
          startImmediately: false,
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
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
      {/* ── Page Header & Schedule Action ── */}
      <div className="flex flex-col gap-1">
        <nav className="flex items-center gap-1.5 text-[13px] text-[#747686]">
          <span>Operations</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          <span className="font-medium text-[#0b1c30]">Exams &amp; Sessions</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-6 bg-[#1d4ed8] rounded-sm" />
            <div>
              <h1 className="font-headline-lg text-[#0b1c30] tracking-tight">
                Examination Sessions Directory
              </h1>
              <p className="text-[13px] text-[#434655] mt-0.5">
                Complete schedule, live active tests, and historical proctoring archives across all halls.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[#1d4ed8] text-white font-semibold px-4 py-2 rounded-lg text-[14px] hover:bg-[#0037b0] transition-colors shadow-sm self-start sm:self-auto"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Schedule Examination
          </button>
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex items-center gap-2 border-b border-[#e5eeff] pb-3 overflow-x-auto">
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
              className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#0037b0] text-white shadow-sm'
                  : 'text-[#434655] hover:text-[#0b1c30] hover:bg-[#eff4ff]'
              }`}
            >
              <span>{tab}</span>
              <span className={`px-1.5 py-0.2 rounded-full font-code-sm text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-[#e5eeff] text-[#466083]'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Sessions Table / Cards ── */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-[#747686] text-[14px]">
          Loading Examination Sessions…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#0037b0]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <h2 className="font-headline-md text-[#0b1c30]">No {activeTab.toLowerCase()} sessions found</h2>
          <p className="text-[14px] text-[#747686] max-w-sm">
            Schedule an upcoming examination or start one immediately from the hall workspace.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-2 flex items-center gap-2 bg-[#1d4ed8] text-white font-semibold px-4 py-2 rounded-lg text-[14px] hover:bg-[#0037b0] transition-colors"
          >
            Schedule Examination Now
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="bg-[#eff4ff] font-code-sm text-[11px] text-[#747686] uppercase tracking-wider">
                  <th className="py-3 px-5">Course Details</th>
                  <th className="py-3 px-5">Assigned Hall</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Duration</th>
                  <th className="py-3 px-5">Candidates</th>
                  <th className="py-3 px-5">Date &amp; Time</th>
                  <th className="py-3 px-5 text-right">Console</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff4ff]">
                {filtered.map((s) => {
                  const isActive = s.status === 'ACTIVE'
                  const statusBadge =
                    s.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : s.status === 'SCHEDULED'
                      ? 'bg-[#eff4ff] text-[#0037b0] border-[#bbd6ff]'
                      : 'bg-[#f8f9ff] text-[#747686] border-[#c4c5d7]'

                  return (
                    <tr key={s.id} className="hover:bg-[#f8f9ff] transition-colors">
                      <td className="py-4 px-5">
                        <Link
                          href={`/hall/session/${s.id}`}
                          className="font-bold text-[14px] text-[#0b1c30] hover:text-[#1d4ed8] transition-colors"
                        >
                          {s.course_name}
                        </Link>
                        {s.course_code && (
                          <p className="font-code-sm text-[11px] text-[#747686] mt-0.5">
                            {s.course_code}
                          </p>
                        )}
                      </td>

                      <td className="py-4 px-5 text-[14px] text-[#434655]">
                        {s.classroom?.name || 'Classroom Hall'}
                      </td>

                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-code-sm text-[10px] font-bold border ${statusBadge}`}>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                          {s.status}
                        </span>
                      </td>

                      <td className="py-4 px-5 font-code-sm text-[12px] text-[#434655]">
                        {s.duration_minutes} min
                      </td>

                      <td className="py-4 px-5 font-code-sm text-[12px] text-[#434655]">
                        {s.expected_students} Expected
                      </td>

                      <td className="py-4 px-5 font-code-sm text-[11px] text-[#747686]">
                        {s.started_at
                          ? new Date(s.started_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                          : new Date(s.created_at).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <Link
                          href={`/hall/session/${s.id}`}
                          className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors inline-flex items-center gap-1 ${
                            isActive
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0037b0]'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 sm:p-7 shadow-2xl space-y-4 border border-[#e5eeff]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5eeff]">
              <h3 className="text-[16px] font-bold text-[#0b1c30]">Schedule Examination Session</h3>
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

            <form onSubmit={handleSchedule} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg border border-[#fecaca] bg-[#fef2f2] text-[#b91c1c] text-[13px]">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[13px] font-medium text-[#0b1c30] mb-1">
                  Examination Hall *
                </label>
                <select
                  value={selectedHallId}
                  onChange={(e) => setSelectedHallId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all font-medium"
                >
                  {halls.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} (Code: {h.access_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#0b1c30] mb-1">
                  Course / Subject Title *
                </label>
                <input
                  type="text"
                  required
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. Further Mathematics Paper 1"
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
                  placeholder="e.g. FM-052"
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
                  disabled={isScheduling}
                  className="min-h-[40px] px-5 py-2 rounded-lg bg-[#1d4ed8] hover:bg-[#0037b0] text-white text-[13px] sm:text-[14px] font-semibold disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isScheduling ? 'Scheduling…' : 'Schedule Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
