import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'

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

  // Get school info for sidebar
  let schoolName = 'EyeX'
  let schoolPrefix = 'SCH'
  try {
    const { data: school } = await supabase
      .from('schools')
      .select('school_name, code_prefix')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (school) {
      schoolName = school.school_name
      schoolPrefix = school.code_prefix || 'SCH'
    }
  } catch {
    // Use defaults
  }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      <Sidebar schoolName={schoolName} schoolPrefix={schoolPrefix} userEmail={user.email ?? ''} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
