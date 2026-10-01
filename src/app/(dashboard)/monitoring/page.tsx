import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { HallSession, Violation } from '@/types'

export const dynamic = 'force-dynamic'

interface ActiveHallCard {
  id: string
  course_name: string
  course_code?: string | null
  hall_name: string
  started_at: string
  expected_students: number
  violationsCount: number
}

export default async function GlobalMonitoringHubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: school } = await supabase
    .from('schools')
    .select('id, school_name')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!school) redirect('/dashboard')

  // Fetch hall sessions with classroom
  const { data: rawSessions } = await supabase
    .from('exam_hall_sessions')
    .select('*, classroom:classrooms(id, name, access_code)')
    .eq('school_id', school.id)
    .order('created_at', { ascending: false })

  const sessions: HallSession[] = rawSessions ?? []
  const activeSessions = sessions.filter((s) => s.status === 'ACTIVE')

  // Fetch violations for active sessions
  const activeIds = activeSessions.map((s) => s.id)
  let activeViolations: Violation[] = []
  if (activeIds.length > 0) {
    const { data: vList } = await supabase
      .from('violations')
      .select('id, session_id, status')
      .in('session_id', activeIds)
      .eq('status', 'FLAGGED')

    if (vList) activeViolations = vList as Violation[]
  }

  // Format active hall cards
  const activeHallCards: ActiveHallCard[] = activeSessions.map((s) => ({
    id: s.id,
    course_name: s.course_name,
    course_code: s.course_code,
    hall_name: s.classroom?.name || 'Main Hall',
    started_at: s.started_at || s.created_at,
    expected_students: s.expected_students || 24,
    violationsCount: activeViolations.filter((v) => v.session_id === s.id).length,
  }))

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto selection:bg-teal-900 selection:text-teal-100">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Global Live Monitoring Hub
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
              Multi-Hall Sync
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Simultaneous real-time proctoring streams across all examination halls at {school.school_name}.
          </p>
        </div>

        <Link
          href="/sessions"
          className="min-h-[44px] px-4 py-2 rounded-xl border border-gray-700 bg-gray-900 hover:bg-gray-800 text-gray-200 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <span>📅</span> All Sessions &rarr;
        </Link>
      </div>

      {/* ── Active Halls Multi-Grid (Prominent Spotlight) ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400">
              Live Examination Streams ({activeHallCards.length})
            </h2>
          </div>
          <span className="text-xs font-mono text-gray-400">
            Realtime WebSocket Connected
          </span>
        </div>

        {activeHallCards.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-12 text-center space-y-3">
            <span className="text-4xl block">📹</span>
            <h3 className="text-base font-bold text-white">No active examinations running right now</h3>
            <p className="text-xs sm:text-sm text-gray-400 max-w-sm mx-auto">
              When an examiner starts a test in any hall, its live stream, tracker count, and alerts appear here instantly.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/classrooms"
                className="min-h-[44px] px-4 py-2 rounded-lg bg-[#0e5a4d] text-white text-xs font-semibold flex items-center"
              >
                Go to Examination Halls
              </Link>
              <Link
                href="/sessions"
                className="min-h-[44px] px-4 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-300 text-xs font-semibold flex items-center"
              >
                Schedule Session
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeHallCards.map((card) => (
              <div
                key={card.id}
                className="rounded-2xl border-2 border-emerald-700/80 bg-emerald-950/20 p-5 flex flex-col justify-between space-y-4 shadow-xl hover:border-emerald-500 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-900 text-emerald-200 border border-emerald-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE PROCTORING
                    </span>
                    <span className="font-mono text-xs text-gray-400 bg-gray-950 px-2 py-0.5 rounded border border-gray-800">
                      {card.hall_name}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white mt-3 leading-tight">
                    {card.course_name}
                  </h3>
                  {card.course_code && (
                    <p className="text-xs font-mono text-emerald-300/80 mt-0.5">
                      {card.course_code}
                    </p>
                  )}

                  {/* Metrics Pill Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono">
                    <div className="p-2 rounded-lg bg-gray-950/80 border border-gray-800">
                      <span className="text-[10px] text-gray-400 block uppercase">Candidates</span>
                      <strong className="text-white text-sm">{card.expected_students} Monitored</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-gray-950/80 border border-gray-800">
                      <span className="text-[10px] text-gray-400 block uppercase">Flagged Incidents</span>
                      <strong className={card.violationsCount > 0 ? 'text-red-400 text-sm' : 'text-emerald-400 text-sm'}>
                        {card.violationsCount} Alert{card.violationsCount !== 1 ? 's' : ''}
                      </strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400 mt-2 font-mono">
                    Started at: {new Date(card.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <Link
                  href={`/hall/session/${card.id}`}
                  className="min-h-[44px] w-full rounded-xl bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-xs sm:text-sm font-semibold transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <span>Open Live Stream Console</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── All Sessions History Table ── */}
      <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
            All Sessions History ({sessions.length})
          </h2>
          <Link href="/sessions" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">
            Manage Schedule &rarr;
          </Link>
        </div>

        {sessions.length === 0 ? (
          <p className="text-xs text-gray-500 py-6 text-center">No sessions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[650px]">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 font-mono">
                  <th className="px-4 py-3">Course Title</th>
                  <th className="px-4 py-3">Hall</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Ended</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-white">
                      {s.course_name}
                      {s.course_code && (
                        <span className="block text-[11px] text-gray-400 font-mono font-normal">
                          {s.course_code}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-gray-300">
                      {s.classroom?.name || 'Classroom'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-gray-800 text-gray-300 border border-gray-700">
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 font-mono">
                      {s.started_at ? new Date(s.started_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 font-mono">
                      {s.ended_at ? new Date(s.ended_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/hall/session/${s.id}`}
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
      </section>
    </div>
  )
}
