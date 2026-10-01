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
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!school) redirect('/dashboard')

  // Fetch school exams for filtering
  const { data: rawExams } = await supabase
    .from('exams')
    .select('id, title, room_number')
    .eq('school_id', school.id)
    .order('created_at', { ascending: false })

  const exams = (rawExams ?? []) as { id: string; title: string; room_number: string }[]

  // Fetch school monitoring sessions
  const { data: rawSessions } = await supabase
    .from('monitoring_sessions')
    .select('id, exam_id')
    .eq('school_id', school.id)

  const sessionIds = (rawSessions ?? []).map((s) => s.id)

  // Fetch alerts belonging to school's monitoring sessions
  let alerts: Alert[] = []

  if (sessionIds.length > 0) {
    const { data: rawAlerts } = await supabase
      .from('alerts')
      .select('*')
      .in('monitoring_session_id', sessionIds)
      .order('created_at', { ascending: false })
      .limit(200)

    alerts = (rawAlerts ?? []) as Alert[]
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Alert History &amp; Incident Ledger</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Review, confirm, or dismiss behavioral flags recorded across all examination sessions.
        </p>
      </div>

      <AlertsManager initialAlerts={alerts} exams={exams} />
    </div>
  )
}
