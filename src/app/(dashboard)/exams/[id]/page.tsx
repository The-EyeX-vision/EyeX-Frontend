import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { startMonitoringSession } from '@/app/actions/monitoring'
import { archiveExam } from '@/app/actions/exams'
import { AssignStudentsPanel } from '@/components/exams/AssignStudentsPanel'
import type { Exam, ExamStudent, MonitoringSession } from '@/types'

export const dynamic = 'force-dynamic'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    scheduled: 'bg-[#eff4ff] text-[#0037b0] border-[#bbd6ff]',
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    completed: 'bg-[#f8f9ff] text-[#747686] border-[#c4c5d7]',
    archived: 'bg-[#f8f9ff] text-[#747686] border-[#c4c5d7]',
    cancelled: 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-code-sm text-[10px] font-bold border ${map[status] ?? 'bg-[#f8f9ff] text-[#747686] border-[#c4c5d7]'}`}>
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

  // Get assigned students
  const { data: examStudents } = await supabase
    .from('exam_students')
    .select('*, student:students(*)')
    .eq('exam_id', id)
    .order('seat_number', { ascending: true })

  // Get all school students for assignment panel
  const { data: allStudents } = await supabase
    .from('students')
    .select('*')
    .eq('school_id', school.id)
    .order('student_number', { ascending: true })

  // Get active monitoring session if any
  const { data: activeSession } = await supabase
    .from('monitoring_sessions')
    .select('*')
    .eq('exam_id', id)
    .eq('status', 'active')
    .maybeSingle()

  const typedExam = exam as Exam
  const typedExamStudents: ExamStudent[] = examStudents ?? []
  const assignedStudentIds = typedExamStudents.map(es => es.student_id)

  async function handleStartAction() {
    'use server'
    await startMonitoringSession(id)
  }

  async function handleArchiveAction() {
    'use server'
    await archiveExam(id)
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link href="/exams" className="text-[13px] text-[#747686] hover:text-[#0b1c30] transition-colors mb-1 inline-flex items-center gap-1">
            ← Back to Examinations
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="font-headline-lg text-[#0b1c30] tracking-tight">{typedExam.title}</h1>
            <StatusBadge status={typedExam.status} />
          </div>
          {typedExam.description && (
            <p className="text-[14px] text-[#434655] mt-1">{typedExam.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/exams/${id}/edit`}
            className="px-3.5 py-2 text-[13px] font-semibold text-[#434655] hover:text-[#0b1c30] border border-[#c4c5d7] bg-white hover:bg-[#eff4ff] rounded-lg transition-colors"
          >
            Edit
          </Link>
          {typedExam.status !== 'archived' && (
            <form action={handleArchiveAction}>
              <button
                type="submit"
                className="px-3.5 py-2 text-[13px] font-semibold text-[#b91c1c] hover:text-[#93000a] border border-[#fecaca] bg-white hover:bg-[#fef2f2] rounded-lg transition-colors"
              >
                Archive
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Exam Details */}
      <div className="rounded-2xl border border-[#e5eeff] bg-white p-6 shadow-sm">
        <h2 className="font-code-sm text-[11px] font-bold uppercase tracking-wider text-[#466083] mb-4">
          Exam Configuration Parameters
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Exam Date', value: typedExam.exam_date },
            { label: 'Start Time', value: typedExam.start_time },
            { label: 'Duration', value: `${typedExam.duration_minutes} min` },
            { label: 'Room / Hall', value: typedExam.room_number },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 bg-[#eff4ff] rounded-xl border border-[#bbd6ff]">
              <p className="font-code-sm text-[10px] text-[#747686] uppercase tracking-wider font-semibold">{label}</p>
              <p className="text-[15px] text-[#0b1c30] font-bold mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Monitoring Session */}
      <div className="rounded-2xl border border-[#e5eeff] bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-code-sm text-[11px] font-bold uppercase tracking-wider text-[#466083]">Live Proctoring Status</h2>
            {activeSession ? (
              <p className="text-[13px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active session started {new Date((activeSession as MonitoringSession).started_at).toLocaleString()}
              </p>
            ) : (
              <p className="text-[13px] text-[#747686] mt-0.5">No active monitoring session running right now.</p>
            )}
          </div>
          {activeSession ? (
            <Link
              href={`/monitoring/${activeSession.id}`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold transition-colors shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Open Live Stream Console →
            </Link>
          ) : typedExam.status !== 'archived' && typedExam.status !== 'completed' ? (
            <form action={handleStartAction}>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1d4ed8] hover:bg-[#0037b0] text-white text-[13px] font-semibold transition-colors shadow-sm"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm6.39-2.908a.75.75 0 01.766.027l3.5 2.25a.75.75 0 010 1.262l-3.5 2.25A.75.75 0 018 12.25v-4.5a.75.75 0 01.39-.658z" clipRule="evenodd" />
                </svg>
                Start Monitoring Session
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {/* Assigned Students */}
      <AssignStudentsPanel
        examId={id}
        examStudents={typedExamStudents}
        allStudents={allStudents ?? []}
        assignedStudentIds={assignedStudentIds}
      />
    </div>
  )
}
