import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { startMonitoringSession } from '@/app/actions/monitoring'
import { archiveExam } from '@/app/actions/exams'
import type { Exam, MonitoringSession } from '@/types'

export const dynamic = 'force-dynamic'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    scheduled: 'bg-blue-950 text-blue-300 border-blue-800',
    active: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    completed: 'bg-gray-800 text-gray-400 border-gray-700',
    archived: 'bg-gray-900 text-gray-500 border-gray-800',
    cancelled: 'bg-red-950 text-red-400 border-red-800',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default async function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!school) redirect('/dashboard')

  const { data: exam } = await supabase
    .from('exams')
    .select('*')
    .eq('id', id)
    .eq('school_id', school.id)
    .maybeSingle()

  if (!exam) notFound()

  // Get active monitoring session if any
  const { data: activeSession } = await supabase
    .from('monitoring_sessions')
    .select('*')
    .eq('exam_id', id)
    .eq('status', 'active')
    .maybeSingle()

  // Count alerts for this exam's sessions
  const { data: sessionIds } = await supabase
    .from('monitoring_sessions')
    .select('id')
    .eq('exam_id', id)

  const { count: alertCount } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .in('monitoring_session_id', (sessionIds ?? []).map((s) => s.id))

  const typedExam = exam as Exam

  async function handleStartAction() {
    'use server'
    await startMonitoringSession(id)
  }

  async function handleArchiveAction() {
    'use server'
    await archiveExam(id)
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/exams" className="text-xs text-gray-500 hover:text-gray-300 transition-colors mb-2 inline-flex items-center gap-1">
            ← Back to Examinations
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-xl font-bold text-white">{typedExam.title}</h1>
            <StatusBadge status={typedExam.status} />
          </div>
          {typedExam.description && (
            <p className="text-sm text-gray-400 mt-1">{typedExam.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/exams/${id}/edit`}
            className="px-3 py-2 text-xs text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-600 rounded-lg transition-colors"
          >
            Edit
          </Link>
          {typedExam.status !== 'archived' && (
            <form action={handleArchiveAction}>
              <button
                type="submit"
                className="px-3 py-2 text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 rounded-lg transition-colors"
              >
                Archive
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Exam Details */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
        <h2 className="text-sm font-semibold text-gray-200 mb-4">Exam Details</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Date', value: typedExam.exam_date },
            { label: 'Start Time', value: typedExam.start_time },
            { label: 'Duration', value: `${typedExam.duration_minutes} min` },
            { label: 'Room', value: typedExam.room_number },
            { label: 'Expected Students', value: String(typedExam.expected_students ?? '—') },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">{label}</p>
              <p className="text-sm text-white font-medium mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Monitoring Session */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Monitoring Session</h2>
            {activeSession ? (
              <p className="text-xs text-emerald-400 mt-0.5">
                Active session started {new Date((activeSession as MonitoringSession).started_at).toLocaleString()}
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">No active session</p>
            )}
          </div>
          {activeSession ? (
            <Link
              href={`/monitoring/${activeSession.id}`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-900/40 border border-emerald-700 text-emerald-300 text-sm font-medium hover:bg-emerald-900/60 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Open Live Session →
            </Link>
          ) : typedExam.status !== 'archived' && typedExam.status !== 'completed' ? (
            <form action={handleStartAction}>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-sm font-medium transition-colors shadow-sm"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm6.39-2.908a.75.75 0 01.766.027l3.5 2.25a.75.75 0 010 1.262l-3.5 2.25A.75.75 0 018 12.25v-4.5a.75.75 0 01.39-.658z" clipRule="evenodd" />
                </svg>
                Start Monitoring
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {/* Alert Summary */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Alerts</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {alertCount
                ? `${alertCount} alert${alertCount !== 1 ? 's' : ''} detected across all sessions for this exam.`
                : 'No alerts detected for this exam yet.'}
            </p>
          </div>
          <Link
            href="/alerts"
            className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
          >
            View all alerts →
          </Link>
        </div>
      </div>
    </div>
  )
}
