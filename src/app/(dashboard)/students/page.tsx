import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Student } from '@/types'
import { StudentTable } from '@/components/students/StudentTable'

export const dynamic = 'force-dynamic'

export default async function StudentsPage() {
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

  const students: Student[] = []

  if (school) {
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('school_id', school.id)
      .order('created_at', { ascending: false })

    if (data) students.push(...data)
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-6 bg-[#0037b0] rounded-sm shrink-0" />
            <div>
              <h1 className="font-headline-lg text-[#0b1c30] tracking-tight">Candidate Roster &amp; Enrollment</h1>
              <p className="text-[13px] text-[#434655] mt-0.5 hidden sm:block">
                {students.length} candidate{students.length !== 1 ? 's' : ''} enrolled in institution supervision database.
              </p>
            </div>
          </div>

          <Link
            href="/students/create"
            className="flex items-center gap-2 bg-[#1d4ed8] text-white font-semibold px-4 py-2 rounded-lg text-[14px] hover:bg-[#0037b0] transition-colors shadow-sm self-start sm:self-auto"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Candidate
          </Link>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e5eeff] p-16 text-center shadow-sm">
          <div className="w-14 h-14 rounded-xl bg-[#eff4ff] text-[#0037b0] flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <h3 className="font-headline-md text-lg font-bold text-[#0b1c30] mb-2">No candidates added yet</h3>
          <p className="text-[#747686] text-[14px] mb-6 max-w-md mx-auto leading-relaxed">
            Add candidate records to your institution so you can assign them to examination sessions and monitor seating.
          </p>
          <Link
            href="/students/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1d4ed8] hover:bg-[#0037b0] text-white text-[14px] font-semibold transition-colors shadow-sm"
          >
            Add First Candidate
          </Link>
        </div>
      ) : (
        <StudentTable initialStudents={students} />
      )}
    </div>
  )
}
