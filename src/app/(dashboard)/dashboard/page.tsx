import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Exam, MonitoringSession, Alert } from '@/types'

export const dynamic = 'force-dynamic'

async function getDashboardData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get school
  const { data: school } = await supabase
    .from('schools')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!school) {
    return { school: null, stats: null, activeExams: [], recentAlerts: [], activeSessions: [], recentSessions: [] }
  }

  const schoolId = school.id

  // Parallel queries — no student queries
  const [examsRes, sessionsRes, alertsRes] = await Promise.all([
    supabase.from('exams').select('*').eq('school_id', schoolId),
    supabase.from('monitoring_sessions').select('*, exam:exams(title, room_number)').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(5),
    supabase.from('alerts').select('*').in(
      'monitoring_session_id',
      (await supabase.from('monitoring_sessions').select('id').eq('school_id', schoolId)).data?.map(s => s.id) ?? []
    ).order('created_at', { ascending: false }).limit(10),
  ])

  const exams: Exam[] = examsRes.data ?? []
  const sessions: MonitoringSession[] = sessionsRes.data ?? []
  const alerts: Alert[] = alertsRes.data ?? []
  const activeExams = exams.filter(e => e.status === 'active' || e.status === 'scheduled')
  const activeSessions = sessions.filter(s => s.status === 'active')
  const totalAlerts = alerts.length
  const flaggedAlerts = alerts.filter(a => a.status === 'FLAGGED').length

  return {
    school,
    stats: {
      totalExams: exams.length,
      activeMonitoringSessions: activeSessions.length,
      totalAlerts,
      flaggedAlerts,
    },
    activeExams: activeExams.slice(0, 5),
    recentAlerts: alerts.slice(0, 5),
    activeSessions: activeSessions.slice(0, 5),
    recentSessions: sessions.slice(0, 5),
  }
}

function StatCard({ label, value, color = 'teal', href }: { label: string; value: number; color?: string; href?: string }) {
  const colorMap: Record<string, string> = {
    teal: 'border-teal-800/40 bg-teal-950/20 text-teal-400',
    blue: 'border-blue-800/40 bg-blue-950/20 text-blue-400',
    amber: 'border-amber-800/40 bg-amber-950/20 text-amber-400',
    red: 'border-red-800/40 bg-red-950/20 text-red-400',
  }
  const card = (
    <div className={`rounded-xl border p-5 flex flex-col gap-1 ${colorMap[color]}`}>
      <span className="text-3xl font-bold text-white">{value}</span>
      <span className="text-xs text-gray-400 font-medium">{label}</span>
    </div>
  )
  if (href) return <Link href={href} className="hover:opacity-80 transition-opacity">{card}</Link>
  return card
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    scheduled: 'bg-blue-950 text-blue-300 border-blue-800',
    active: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    completed: 'bg-gray-800 text-gray-400 border-gray-700',
    archived: 'bg-gray-900 text-gray-500 border-gray-800',
    cancelled: 'bg-red-950 text-red-400 border-red-800',
    FLAGGED: 'bg-red-950 text-red-300 border-red-800',
    REVIEWED: 'bg-blue-950 text-blue-300 border-blue-800',
    DISMISSED: 'bg-gray-800 text-gray-400 border-gray-700',
    CONFIRMED: 'bg-amber-950 text-amber-300 border-amber-800',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${map[status] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
      {status}
    </span>
  )
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  if (!data.school) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400">School profile not found. Please contact support.</p>
      </div>
    )
  }

  const { stats, activeExams, recentAlerts, recentSessions } = data

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">{data.school.school_name} — Overview</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 bg-emerald-950 border border-emerald-900 px-3 py-1.5 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          System Active
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Examinations" value={stats.totalExams} color="teal" href="/exams" />
          <StatCard label="Active Sessions" value={stats.activeMonitoringSessions} color="blue" href="/monitoring" />
          <StatCard label="Total Alerts" value={stats.totalAlerts} color="amber" href="/alerts" />
          <StatCard label="Flagged Alerts" value={stats.flaggedAlerts} color="red" href="/alerts" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Exams */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-200">Active Examinations</h2>
            <Link href="/exams" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">View all →</Link>
          </div>
          {activeExams.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No active examinations.</p>
              <Link href="/exams/create" className="mt-2 inline-block text-xs text-teal-400 hover:underline">
                Create your first exam →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeExams.map((exam) => (
                <Link key={exam.id} href={`/exams/${exam.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-white">{exam.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Room {exam.room_number} · {exam.exam_date}
                        {exam.expected_students ? ` · ${exam.expected_students} expected` : ''}
                      </p>
                    </div>
                    <StatusBadge status={exam.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Monitoring Sessions */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-200">Recent Sessions</h2>
            <Link href="/monitoring" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">View all →</Link>
          </div>
          {recentSessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No monitoring sessions yet.</p>
              <p className="text-xs text-gray-600 mt-1">Start a session from an exam page.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <Link key={session.id} href={`/monitoring/${session.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {(session as MonitoringSession & { exam?: { title: string; room_number: string } }).exam?.title ?? 'Session'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Started {new Date(session.started_at).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge status={session.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-200">Recent Alerts</h2>
          <Link href="/alerts" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">View all →</Link>
        </div>
        {recentAlerts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No alerts detected yet.</p>
            <p className="text-xs text-gray-600 mt-1">Alerts will appear here during monitoring sessions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                  <th className="pb-2 pr-4 font-medium">Tracker</th>
                  <th className="pb-2 pr-4 font-medium">Event</th>
                  <th className="pb-2 pr-4 font-medium">Severity</th>
                  <th className="pb-2 pr-4 font-medium">Confidence</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {recentAlerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-2.5 pr-4 text-white font-medium font-mono text-xs">
                      {(alert as Alert & { tracker_id?: string | null }).tracker_id ?? '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-300">{alert.event_type.replace(/_/g, ' ')}</td>
                    <td className="py-2.5 pr-4"><StatusBadge status={alert.severity} /></td>
                    <td className="py-2.5 pr-4 text-gray-300">{Math.round(alert.confidence * 100)}%</td>
                    <td className="py-2.5 pr-4"><StatusBadge status={alert.status} /></td>
                    <td className="py-2.5 text-gray-500 text-xs">{new Date(alert.created_at).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { href: '/exams/create', label: 'New Examination', icon: '📋' },
          { href: '/monitoring', label: 'View Monitoring', icon: '👁' },
          { href: '/alerts', label: 'Alert History', icon: '🔔' },
        ].map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2.5 p-3.5 rounded-xl border border-gray-800 bg-gray-900/40 hover:bg-gray-800/60 hover:border-gray-700 transition-colors text-sm text-gray-300 font-medium"
          >
            <span className="text-lg">{icon}</span>
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}
