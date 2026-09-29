import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { MonitoringSession } from '@/types'

export const dynamic = 'force-dynamic'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    completed: 'bg-gray-800 text-gray-400 border-gray-700',
    scheduled: 'bg-blue-950 text-blue-300 border-blue-800',
    cancelled: 'bg-red-950 text-red-400 border-red-800',
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
        map[status] ?? 'bg-gray-800 text-gray-400 border-gray-700'
      }`}
    >
      {status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default async function MonitoringSessionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!school) redirect('/dashboard')

  // Fetch monitoring sessions with related exam details
  const { data: rawSessions } = await supabase
    .from('monitoring_sessions')
    .select('*, exam:exams(*)')
    .eq('school_id', school.id)
    .order('created_at', { ascending: false })

  const sessions = (rawSessions ?? []) as (MonitoringSession & {
    exam?: { title: string; room_number: string; exam_date: string }
  })[]

  const activeSessions = sessions.filter((s) => s.status === 'active')

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Monitoring Sessions</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Active and archived classroom proctoring streams
          </p>
        </div>
        <Link
          href="/exams"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-sm font-medium transition-colors shadow-sm"
        >
          Examinations Directory &rarr;
        </Link>
      </div>

      {/* Active Sessions Highlight */}
      {activeSessions.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">
              Currently Live Monitoring ({activeSessions.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSessions.map((session) => (
              <div
                key={session.id}
                className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-5 flex flex-col justify-between space-y-4 hover:border-emerald-700/80 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <StatusBadge status={session.status} />
                    <span className="text-xs font-mono text-gray-400">
                      ID: {session.id.slice(0, 8)}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-2">
                    {session.exam?.title ?? 'Classroom Session'}
                  </h3>
                  <p className="text-xs text-gray-300 mt-1">
                    Room: <strong className="text-white">{session.exam?.room_number ?? 'Main Hall'}</strong> • Started at{' '}
                    {new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <Link
                  href={`/monitoring/${session.id}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-xs sm:text-sm font-semibold transition-colors"
                >
                  Enter Live Monitoring Console &rarr;
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sessions Table */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
          All Sessions History ({sessions.length})
        </h2>
        {sessions.length === 0 ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-16 text-center">
            <div className="text-4xl mb-4">📹</div>
            <h3 className="text-lg font-semibold text-white mb-2">No monitoring sessions found</h3>
            <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
              Start a monitoring session from any scheduled examination to monitor students in real time.
            </p>
            <Link
              href="/exams"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-sm font-medium transition-colors"
            >
              Go to Examinations
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                  <th className="px-5 py-3.5 font-medium">Exam Title</th>
                  <th className="px-5 py-3.5 font-medium">Room</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 font-medium hidden sm:table-cell">Started</th>
                  <th className="px-5 py-3.5 font-medium hidden md:table-cell">Ended</th>
                  <th className="px-5 py-3.5 font-medium text-right">Console</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-4 text-white font-medium">
                      <Link
                        href={`/monitoring/${session.id}`}
                        className="hover:text-teal-300 transition-colors"
                      >
                        {session.exam?.title ?? 'Session'}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-gray-300">{session.exam?.room_number ?? '—'}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={session.status} />
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-xs hidden sm:table-cell">
                      {new Date(session.started_at).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-xs hidden md:table-cell">
                      {session.ended_at
                        ? new Date(session.ended_at).toLocaleString([], {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/monitoring/${session.id}`}
                        className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
                      >
                        Open Console &rarr;
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
