import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import type { MonitoringSession, Exam, ExamStudent, Alert } from '@/types'
import { LiveMonitoringConsole } from '@/components/monitoring/LiveMonitoringConsole'

export const dynamic = 'force-dynamic'

export default async function MonitoringSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: school } = await supabase
    .from('schools')
    .select('id, school_name')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!school) redirect('/dashboard')

  // Fetch session
  const { data: session } = await supabase
    .from('monitoring_sessions')
    .select('*, exam:exams(*)')
    .eq('id', sessionId)
    .eq('school_id', school.id)
    .maybeSingle()

  if (!session) notFound()

  const exam = session.exam as Exam

  // Fetch assigned students for this exam
  const { data: rawExamStudents } = await supabase
    .from('exam_students')
    .select('*, student:students(*)')
    .eq('exam_id', session.exam_id)
    .order('seat_number', { ascending: true })

  const examStudents = (rawExamStudents ?? []) as ExamStudent[]

  // Fetch initial alerts for this monitoring session
  const { data: rawAlerts } = await supabase
    .from('alerts')
    .select('*, student:students(*)')
    .eq('monitoring_session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(50)

  const initialAlerts = (rawAlerts ?? []) as Alert[]

  return (
    <LiveMonitoringConsole
      session={session as MonitoringSession}
      exam={exam}
      examStudents={examStudents}
      initialAlerts={initialAlerts}
      schoolName={school.school_name}
    />
  )
}
