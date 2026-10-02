import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/layout/DashboardShell'
import type { ActiveSessionData, NavbarAlertItem } from '@/components/layout/TopNavbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get school info
  let schoolId = ''
  let schoolName = 'EyeX'
<<<<<<< HEAD
  try {
    const { data: school } = await supabase
      .from('schools')
      .select('school_name')
=======
  let schoolPrefix = 'SCH'
  let activeSession: ActiveSessionData | null = null
  let initialAlerts: NavbarAlertItem[] = []

  try {
    const { data: school } = await supabase
      .from('schools')
      .select('id, school_name, code_prefix')
>>>>>>> 7f32904aba66315e849f854d16535d1fff7fa4a9
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (school) {
      schoolId = school.id
      schoolName = school.school_name
<<<<<<< HEAD
=======
      schoolPrefix = school.code_prefix || 'SCH'

      // 1. Fetch current active examination session
      const { data: sessionData } = await supabase
        .from('monitoring_sessions')
        .select('id, exam_id, status, started_at, exam:exams(id, title, room_number)')
        .eq('school_id', school.id)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (sessionData) {
        activeSession = sessionData as unknown as ActiveSessionData
      }

      // 2. Fetch current alerts for school sessions
      const { data: sessions } = await supabase
        .from('monitoring_sessions')
        .select('id')
        .eq('school_id', school.id)

      const sessionIds = (sessions ?? []).map((s) => s.id)

      if (sessionIds.length > 0) {
        const { data: alertsData } = await supabase
          .from('alerts')
          .select('id, monitoring_session_id, student_id, event_type, confidence, severity, status, metadata, created_at, student:students(full_name, student_number)')
          .in('monitoring_session_id', sessionIds)
          .order('created_at', { ascending: false })
          .limit(20)

        if (alertsData) {
          initialAlerts = alertsData as unknown as NavbarAlertItem[]
        }
      }
>>>>>>> 7f32904aba66315e849f854d16535d1fff7fa4a9
    }
  } catch (err) {
    console.error('[DashboardLayout] Data fetch notice:', err)
  }

  return (
<<<<<<< HEAD
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      <Sidebar schoolName={schoolName} userEmail={user.email ?? ''} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
=======
    <DashboardShell
      schoolId={schoolId}
      schoolName={schoolName}
      schoolPrefix={schoolPrefix}
      userEmail={user.email ?? ''}
      initialActiveSession={activeSession}
      initialAlerts={initialAlerts}
    >
      {children}
    </DashboardShell>
>>>>>>> 7f32904aba66315e849f854d16535d1fff7fa4a9
  )
}
