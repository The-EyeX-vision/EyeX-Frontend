import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
  let schoolPrefix = 'SCH'
  let activeSession: ActiveSessionData | null = null
  let initialAlerts: NavbarAlertItem[] = []

  try {
    let { data: school } = await supabase
      .from('schools')
      .select('id, school_name')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!school) {
      const admin = createAdminClient()
      const db = admin || supabase
      const fallbackName =
        (user.user_metadata?.school_name as string) ||
        (user.email ? user.email.split('@')[0].toUpperCase() : 'EyeX School')

      const { data: createdSchool } = await db
        .from('schools')
        .insert({
          auth_user_id: user.id,
          school_name: fallbackName,
          email: user.email || '',
        })
        .select('id, school_name')
        .maybeSingle()

      school = createdSchool
    }

    if (school) {
      schoolId = school.id
      schoolName = school.school_name
      schoolPrefix = 'SCH'

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
    }
  } catch (err) {
    console.error('[DashboardLayout] Data fetch notice:', err)
  }

  return (
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
  )
}
