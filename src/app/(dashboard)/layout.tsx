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
  try {
    const { data: school } = await supabase
      .from('schools')
      .select('school_name')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (school) {
      schoolName = school.school_name
    }
  } catch {
    // Use defaults
  }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      <Sidebar schoolName={schoolName} userEmail={user.email ?? ''} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
