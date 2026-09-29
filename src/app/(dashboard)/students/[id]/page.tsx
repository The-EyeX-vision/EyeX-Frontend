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
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <Link
          href="/students"
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors mb-2 inline-flex items-center gap-1"
        >
          ← Back to Students
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-xl font-bold text-white">{typedStudent.full_name}</h1>
          <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-teal-950 border border-teal-800 text-teal-400 font-semibold">
            {typedStudent.student_number}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Enrolled {new Date(typedStudent.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Edit Info Form */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">Edit Student Information</h2>
          <EditStudentForm student={typedStudent} />
        </div>

        {/* Assigned Examinations */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-200">
            Assigned Examinations ({assignments.length})
          </h2>
          {assignments.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              Student is not currently assigned to any exams.
            </p>
          ) : (
            <div className="space-y-2">
              {assignments.map((item) => (
                <Link
                  key={item.id}
                  href={`/exams/${item.exam?.id}`}
                  className="block p-3 rounded-lg bg-gray-800/40 hover:bg-gray-800 transition-colors border border-gray-800"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">{item.exam?.title ?? 'Exam'}</p>
                    <span className="text-xs font-mono text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-900">
                      Seat: {item.seat_number || 'Unassigned'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Room {item.exam?.room_number} • {item.exam?.exam_date}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Incident / Alert History */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
        <h2 className="text-sm font-semibold text-gray-200 mb-4">
          Session Alert History ({alerts.length})
        </h2>
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm">
            <span className="text-emerald-400 mr-1.5">✓</span>
            No incident flags recorded for this student across all sessions.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                  <th className="px-4 py-2.5 font-medium">Event Type</th>
                  <th className="px-4 py-2.5 font-medium">Severity</th>
                  <th className="px-4 py-2.5 font-medium">Confidence</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Recorded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-gray-800/30">
                    <td className="px-4 py-2.5 text-white font-medium">
                      {alert.event_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-950 text-red-300 border border-red-800">
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-300">
                      {Math.round(alert.confidence * 100)}%
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">
                      {alert.status}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
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
