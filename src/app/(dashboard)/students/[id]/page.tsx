import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Student, ExamStudent, Alert } from '@/types'
import { EditStudentForm } from './EditStudentForm'

export const dynamic = 'force-dynamic'

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  // Fetch student
  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .eq('school_id', school.id)
    .maybeSingle()

  if (!student) notFound()

  // Fetch assigned exams
  const { data: examAssignments } = await supabase
    .from('exam_students')
    .select('*, exam:exams(*)')
    .eq('student_id', id)

  // Fetch any alerts for this student
  const { data: studentAlerts } = await supabase
    .from('alerts')
    .select('*')
    .eq('student_id', id)
    .order('created_at', { ascending: false })

  const typedStudent = student as Student
  const assignments: (ExamStudent & { exam?: { id: string; title: string; exam_date: string; room_number: string; status: string } })[] = examAssignments ?? []
  const alerts: Alert[] = studentAlerts ?? []

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-4xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1">
        <Link
          href="/students"
          className="text-[13px] text-[#747686] hover:text-[#0b1c30] transition-colors mb-1 inline-flex items-center gap-1"
        >
          ← Back to Candidates
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="font-headline-lg text-[#0b1c30] tracking-tight">{typedStudent.full_name}</h1>
          <span className="font-mono text-[12px] px-2.5 py-0.5 rounded-full bg-[#eff4ff] border border-[#bbd6ff] text-[#0037b0] font-bold">
            {typedStudent.student_number}
          </span>
        </div>
        <p className="text-[12px] text-[#747686]">
          Enrolled {new Date(typedStudent.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Edit Info Form */}
        <div className="rounded-2xl border border-[#e5eeff] bg-white p-6 shadow-sm">
          <h2 className="font-code-sm text-[11px] font-bold uppercase tracking-wider text-[#466083] mb-4">
            Edit Candidate Information
          </h2>
          <EditStudentForm student={typedStudent} />
        </div>

        {/* Assigned Examinations */}
        <div className="rounded-2xl border border-[#e5eeff] bg-white p-6 space-y-4 shadow-sm">
          <h2 className="font-code-sm text-[11px] font-bold uppercase tracking-wider text-[#466083]">
            Assigned Examinations ({assignments.length})
          </h2>
          {assignments.length === 0 ? (
            <p className="text-[13px] text-[#747686] py-4 text-center">
              Candidate is not currently assigned to any exams.
            </p>
          ) : (
            <div className="space-y-2">
              {assignments.map((item) => (
                <Link
                  key={item.id}
                  href={`/exams/${item.exam?.id}`}
                  className="block p-3.5 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] transition-colors border border-[#bbd6ff]"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] font-bold text-[#0b1c30]">{item.exam?.title ?? 'Exam'}</p>
                    <span className="font-mono text-[11px] text-[#0037b0] bg-white px-2 py-0.5 rounded font-bold border border-[#c4c5d7]">
                      Seat: {item.seat_number || 'Unassigned'}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#434655] mt-1 font-medium">
                    Room {item.exam?.room_number} • {item.exam?.exam_date}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Incident / Alert History */}
      <div className="rounded-2xl border border-[#e5eeff] bg-white p-6 shadow-sm">
        <h2 className="font-code-sm text-[11px] font-bold uppercase tracking-wider text-[#466083] mb-4">
          Session Alert History ({alerts.length})
        </h2>
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-[#747686] text-[13px]">
            <span className="text-emerald-600 font-bold mr-1.5">✓</span>
            No incident flags recorded for this candidate across all sessions.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#e5eeff]">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-[#eff4ff] font-code-sm text-[11px] text-[#747686] uppercase tracking-wider">
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Recorded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff4ff]">
                {alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-[#f8f9ff] transition-colors">
                    <td className="py-3 px-4 text-[13px] font-bold text-[#0b1c30]">
                      {alert.event_type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-code-sm text-[10px] font-bold uppercase bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]">
                        {alert.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-code-sm text-[12px] text-[#434655]">
                      {Math.round(alert.confidence * 100)}%
                    </td>
                    <td className="py-3 px-4 font-code-sm text-[11px] text-[#747686]">
                      {alert.status}
                    </td>
                    <td className="py-3 px-4 font-code-sm text-[11px] text-[#747686]">
                      {new Date(alert.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
