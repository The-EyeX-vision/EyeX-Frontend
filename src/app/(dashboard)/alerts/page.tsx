import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Alert } from '@/types'
import { AlertsManager } from '@/components/alerts/AlertsManager'

export const dynamic = 'force-dynamic'

export default async function AlertsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: school } = await supabase
    .from('schools')
    .select('id, school_name, email')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  // Fetch school exams for filtering (or empty if no school profile yet)
  let exams: { id: string; title: string; room_number: string }[] = []
  if (school?.id) {
    const { data: rawExams } = await supabase
      .from('exams')
      .select('id, title, room_number')
      .eq('school_id', school.id)
      .order('created_at', { ascending: false })

    exams = (rawExams ?? []) as typeof exams
  }

  // Fetch school monitoring sessions
  let sessionIds: string[] = []
  if (school?.id) {
    const { data: rawSessions } = await supabase
      .from('monitoring_sessions')
      .select('id, exam_id')
      .eq('school_id', school.id)

    sessionIds = (rawSessions ?? []).map((s) => s.id)
  }

  // Fetch alerts belonging to school's monitoring sessions
  let alerts: (Alert & { student?: { full_name: string; student_number: string } })[] = []

  if (sessionIds.length > 0) {
    const { data: rawAlerts } = await supabase
      .from('alerts')
      .select('*, student:students(full_name, student_number)')
      .in('monitoring_session_id', sessionIds)
      .order('created_at', { ascending: false })
      .limit(200)

    alerts = (rawAlerts ?? []) as typeof alerts
  } else {
    // Fallback: If no monitoring_sessions or no school record, fetch recent alerts directly
    const { data: rawAlerts } = await supabase
      .from('alerts')
      .select('*, student:students(full_name, student_number)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (rawAlerts && rawAlerts.length > 0) {
      alerts = rawAlerts as typeof alerts
    }
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5 pt-1">
          <span className="w-2.5 h-6 bg-[#ba1a1a] rounded-sm shrink-0" />
          <div>
            <h1 className="font-headline-lg text-[#0b1c30] tracking-tight">Alert History &amp; Incident Ledger</h1>
            <p className="text-[13px] text-[#434655] mt-0.5 hidden sm:block">
              Review, confirm, or dismiss behavioral flags recorded across all examination sessions.
            </p>
          </div>
        </div>
      </div>

      <AlertsManager
        initialAlerts={alerts}
        exams={exams}
        school={
          school
            ? {
                id: school.id,
                school_name: school.school_name,
                email: school.email || '',
                code_prefix: (school as { code_prefix?: string }).code_prefix || 'SCH',
              }
            : {
                id: 'default',
                school_name: 'Examination Center',
                email: user.email || '',
                code_prefix: 'SCH',
              }
        }
      />
    </div>
  )
}
