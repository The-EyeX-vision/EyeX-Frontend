import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Classroom, HallSession, Violation } from '@/types'
import { DemoModeBadge } from '@/components/DemoModeLabel'

export const dynamic = 'force-dynamic'

interface DashboardExecutiveData {
  schoolName: string
  totalHalls: number
  activeSessionsCount: number
  totalTrackersDetected: string
  totalViolations: number
  halls: (Classroom & { active_session?: HallSession | null })[]
  recentViolations: (Violation & { session?: { course_name: string } | null })[]
}

async function getExecutiveData(): Promise<DashboardExecutiveData> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: school } = await supabase
    .from('schools')
    .select('id, school_name')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!school) {
    return {
      schoolName: 'Institution',
      totalHalls: 0,
      activeSessionsCount: 0,
      totalTrackersDetected: 'Unavailable',
      totalViolations: 0,
      halls: [],
      recentViolations: [],
    }
  }

  const schoolId = school.id

  // 1. Fetch Classrooms (Halls)
  const { data: rawHalls } = await supabase
    .from('classrooms')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })

  const halls: Classroom[] = rawHalls ?? []

  // 2. Fetch Sessions
  const { data: sessions } = await supabase
    .from('exam_hall_sessions')
    .select('*')
    .eq('school_id', schoolId)

  const activeSessions = (sessions ?? []).filter((s) => s.status === 'ACTIVE')

  // Map active sessions to halls
  const hallsWithSession = halls.map((hall) => {
    const active = activeSessions.find((s) => s.classroom_id === hall.id)
    return {
      ...hall,
      active_session: active || null,
    }
  })

  // 3. Fetch Violations
  const sessionIds = (sessions ?? []).map((s) => s.id)
  let violations: (Violation & { session?: { course_name: string } | null })[] = []
  let totalViolations = 0

  if (sessionIds.length > 0) {
    const [{ data: vList }, { count }] = await Promise.all([
      supabase
        .from('violations')
        .select('*, session:exam_hall_sessions(course_name)')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('violations')
        .select('id', { count: 'exact', head: true })
        .in('session_id', sessionIds)
        .eq('demo_mode', false),
    ])

    if (vList) violations = vList as unknown as (Violation & { session?: { course_name: string } | null })[]
    totalViolations = count ?? 0
  }

  return {
    schoolName: school.school_name,
    totalHalls: halls.length,
    activeSessionsCount: activeSessions.filter((session) => !session.demo_mode).length,
    totalTrackersDetected: 'Unavailable',
    totalViolations,
    halls: hallsWithSession,
    recentViolations: violations,
  }
}

export default async function ExecutiveDashboardPage() {
  const data = await getExecutiveData()

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto selection:bg-teal-900 selection:text-teal-100">
      {/* ── Page Header & Quick Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Executive Dashboard
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
              System Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            {data.schoolName} — Live Examination Integrity &amp; Multi-Hall Overview
          </p>
        </div>

        {/* Quick Actions (min 44px touch targets) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/classrooms"
            className="min-h-[44px] px-4 py-2 rounded-xl border border-gray-700 bg-gray-900 hover:bg-gray-800 text-gray-200 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>+</span> Add Hall
          </Link>
          <Link
            href="/sessions"
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>📅</span> Schedule Session
          </Link>
        </div>
      </div>

      {/* ── 4 Executive Stat Counters (Responsive Grid) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: 'Total Halls',
            value: data.totalHalls,
            color: 'teal',
            href: '/classrooms',
            badge: 'Classrooms Configured',
          },
          {
            label: 'Active Sessions',
            value: data.activeSessionsCount,
            color: 'emerald',
            href: '/monitoring',
            badge: 'Live Proctoring Now',
          },
          {
            label: 'Live Trackers',
            value: data.totalTrackersDetected,
            color: 'blue',
            href: '/monitoring',
            badge: 'No detection source connected',
          },
          {
            label: 'Total Violations',
            value: data.totalViolations,
            color: 'red',
            href: '/violations',
            badge: 'Incidents Flagged',
          },
        ].map((stat) => {
          const colorStyles: Record<string, string> = {
            teal: 'border-teal-800/40 bg-teal-950/20 text-teal-400',
            emerald: 'border-emerald-800/40 bg-emerald-950/20 text-emerald-400',
            blue: 'border-blue-800/40 bg-blue-950/20 text-blue-400',
            red: 'border-red-800/40 bg-red-950/20 text-red-400',
          }

          return (
            <Link
              key={stat.label}
              href={stat.href}
              className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all hover:brightness-110 min-h-[110px] ${colorStyles[stat.color]}`}
            >
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono leading-none">
                  {stat.value}
                </span>
                <p className="text-xs text-gray-300 font-semibold mt-2">{stat.label}</p>
              </div>
              <span className="text-[10px] text-gray-400 font-mono mt-2 truncate">
                {stat.badge}
              </span>
            </Link>
          )
        })}
      </div>

      {/* ── Live Hall Grid (ACTIVE / IDLE) ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
            Live Hall Status Grid
          </h2>
          <Link href="/classrooms" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">
            Manage All Halls &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.halls.map((hall) => {
            const isActive = !!hall.active_session
            return (
              <div
                key={hall.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition-all ${
                  isActive
                    ? 'border-emerald-700/80 bg-emerald-950/20 shadow-lg shadow-emerald-950/40'
                    : 'border-gray-800 bg-gray-900/60 hover:border-gray-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-gray-400 bg-gray-950 px-2 py-0.5 rounded border border-gray-800">
                      Code: {hall.access_code}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                        isActive
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-gray-800 text-gray-400 border-gray-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
                        }`}
                      />
                      {isActive ? 'ACTIVE' : 'IDLE'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mt-3 truncate">{hall.name}</h3>

                  {isActive ? (
                    <div className="mt-2 text-xs text-emerald-300/90 space-y-1">
                      <p className="font-semibold">{hall.active_session?.course_name}</p>
                      <p className="text-[11px] font-mono text-emerald-400">
                        {hall.active_session?.expected_students || 30} Expected Candidates
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500">
                      Standby • No active examination session in progress
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs">
                  <Link
                    href={`/classrooms/${hall.id}`}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Hall Setup &amp; Cameras &rarr;
                  </Link>

                  {isActive && (
                    <Link
                      href={`/hall/session/${hall.active_session?.id}`}
                      className="px-3 py-1.5 rounded-lg bg-[#0e5a4d] hover:bg-[#0b483d] text-white font-semibold text-[11px] transition-colors"
                    >
                      View Stream →
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Recent Violations Stream ── */}
      <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
              Recent Violations Stream
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Live anomaly alerts and behavioral incident ledger
            </p>
          </div>
          <Link href="/violations" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">
            Violations Ledger &rarr;
          </Link>
        </div>

        {data.recentViolations.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-xs">
            <span className="text-3xl block mb-2">🛡️</span>
            No violations recorded yet. Examination halls are running smoothly.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 sm:mx-0">
            <table className="w-full text-xs text-left min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 font-mono">
                  <th className="px-4 py-3">Candidate Tracker</th>
                  <th className="px-4 py-3">Course / Hall</th>
                  <th className="px-4 py-3">Activity Type</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {data.recentViolations.map((v) => {
                  const sevColor =
                    v.severity === 'CRITICAL'
                      ? 'text-red-300 bg-red-950 border-red-800'
                      : v.severity === 'HIGH'
                      ? 'text-rose-300 bg-rose-950 border-rose-800'
                      : v.severity === 'MEDIUM'
                      ? 'text-amber-300 bg-amber-950 border-amber-800'
                      : 'text-blue-300 bg-blue-950 border-blue-800'

                  return (
                    <tr key={v.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-white font-mono">
                        {v.tracker_label}
                        {v.demo_mode && <span className="ml-2"><DemoModeBadge /></span>}
                      </td>
                      <td className="px-4 py-3.5 text-gray-300">
                        {v.session?.course_name || 'Exam Session'}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-gray-200">
                        {v.activity_type.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${sevColor}`}>
                          {v.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-gray-300">
                        {Math.round(v.confidence * 100)}%
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 font-mono">
                        {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href="/violations"
                          className="text-teal-400 hover:text-teal-300 font-medium"
                        >
                          Evidence &rarr;
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
