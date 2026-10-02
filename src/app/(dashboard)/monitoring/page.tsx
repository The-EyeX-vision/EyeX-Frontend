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
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col gap-1">
        <nav className="flex items-center gap-1.5 text-[13px] text-[#747686]">
          <span>Supervision</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          <span className="font-medium text-[#0b1c30]">Live Monitoring</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-6 bg-[#0037b0] rounded-sm" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline-lg text-[#0b1c30] tracking-tight">
                  Global Live Monitoring Hub
                </h1>
                <span className="px-2.5 py-0.5 rounded font-code-sm text-[10px] font-bold bg-[#eff4ff] text-[#0037b0] border border-[#bbd6ff]">
                  Multi-Hall Sync
                </span>
              </div>
              <p className="text-[13px] text-[#434655] mt-0.5">
                Simultaneous real-time proctoring streams across all examination halls at {school.school_name}.
              </p>
            </div>
          </div>

          <Link
            href="/sessions"
            className="flex items-center gap-2 border border-[#c4c5d7] bg-white px-4 py-2 rounded-lg text-[13px] font-semibold text-[#434655] hover:bg-[#eff4ff] transition-colors self-start sm:self-auto shadow-xs"
          >
            <span>All Sessions &rarr;</span>
          </Link>
        </div>
      </div>

      {/* ── Active Halls Multi-Grid (Prominent Spotlight) ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h2 className="font-code-sm text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Live Examination Streams ({activeHallCards.length})
            </h2>
          </div>
          <span className="font-code-sm text-[11px] text-[#747686]">
            Realtime WebSocket Connected
          </span>
        </div>

        {activeHallCards.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e5eeff] p-12 text-center space-y-3 shadow-sm">
            <div className="w-14 h-14 rounded-xl bg-[#eff4ff] text-[#0037b0] flex items-center justify-center mx-auto">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-7.5A2.25 2.25 0 0013.5 6.75h-9a2.25 2.25 0 00-2.25 2.25v7.5A2.25 2.25 0 004.5 18.75z" />
              </svg>
            </div>
            <h3 className="text-[16px] font-bold text-[#0b1c30]">No active examinations running right now</h3>
            <p className="text-[13px] text-[#434655] max-w-sm mx-auto leading-relaxed">
              When an examiner starts a test in any hall, its live stream, tracker count, and alerts appear here instantly.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/classrooms"
                className="px-4 py-2 rounded-lg bg-[#1d4ed8] text-white text-[13px] font-semibold hover:bg-[#0037b0] transition-colors shadow-sm"
              >
                Go to Examination Halls
              </Link>
              <Link
                href="/sessions"
                className="px-4 py-2 rounded-lg border border-[#c4c5d7] bg-white text-[#434655] text-[13px] font-semibold hover:bg-[#eff4ff] transition-colors"
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
                className="bg-white rounded-2xl border-2 border-emerald-500 p-5 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full font-code-sm text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      LIVE PROCTORING
                    </span>
                    <span className="font-code-sm text-[11px] text-[#466083] bg-[#eff4ff] px-2 py-0.5 rounded border border-[#bbd6ff]">
                      {card.hall_name}
                    </span>
                  </div>

                  <h3 className="text-[17px] font-bold text-[#0b1c30] mt-3 leading-tight">
                    {card.course_name}
                  </h3>
                  {card.course_code && (
                    <p className="font-code-sm text-[11px] text-[#0037b0] mt-0.5 font-semibold">
                      {card.course_code}
                    </p>
                  )}

                  {/* Metrics Pill Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono">
                    <div className="p-2.5 rounded-lg bg-[#eff4ff] border border-[#bbd6ff]">
                      <span className="font-code-sm text-[10px] text-[#747686] block uppercase">Candidates</span>
                      <strong className="text-[#0b1c30] text-[14px]">{card.expected_students} Monitored</strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#eff4ff] border border-[#bbd6ff]">
                      <span className="font-code-sm text-[10px] text-[#747686] block uppercase">Flagged Incidents</span>
                      <strong className={card.violationsCount > 0 ? 'text-[#b91c1c] text-[14px]' : 'text-emerald-700 text-[14px]'}>
                        {card.violationsCount} Alert{card.violationsCount !== 1 ? 's' : ''}
                      </strong>
                    </div>
                  </div>

                  <p className="font-code-sm text-[11px] text-[#747686] mt-2">
                    Started at: {new Date(card.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <Link
                  href={`/hall/session/${card.id}`}
                  className="w-full py-2.5 rounded-lg bg-[#1d4ed8] hover:bg-[#0037b0] text-white text-[13px] font-semibold transition-all shadow-sm flex items-center justify-center gap-2"
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
      <section className="bg-white rounded-2xl border border-[#e5eeff] p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-code-sm text-[11px] font-bold uppercase tracking-wider text-[#466083]">
            All Sessions History ({sessions.length})
          </h2>
          <Link href="/sessions" className="text-[13px] text-[#0037b0] hover:underline font-semibold transition-colors">
            Manage Schedule &rarr;
          </Link>
        </div>

        {sessions.length === 0 ? (
          <p className="text-[13px] text-[#747686] py-6 text-center">No sessions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[650px]">
              <thead>
                <tr className="bg-[#eff4ff] font-code-sm text-[11px] text-[#747686] uppercase tracking-wider">
                  <th className="px-4 py-3">Course Title</th>
                  <th className="px-4 py-3">Hall</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Ended</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff4ff]">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-[#f8f9ff] transition-colors">
                    <td className="px-4 py-3.5 font-bold text-[14px] text-[#0b1c30]">
                      {s.course_name}
                      {s.course_code && (
                        <span className="block font-code-sm text-[11px] text-[#747686] font-normal">
                          {s.course_code}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-[14px] text-[#434655]">
                      {s.classroom?.name || 'Classroom'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded font-code-sm text-[10px] font-bold uppercase bg-[#eff4ff] text-[#0037b0] border border-[#bbd6ff]">
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-code-sm text-[11px] text-[#747686]">
                      {s.started_at ? new Date(s.started_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                    <td className="px-4 py-3.5 font-code-sm text-[11px] text-[#747686]">
                      {s.ended_at ? new Date(s.ended_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/hall/session/${s.id}`}
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
      </section>
    </div>
  )
}
