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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Students</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {students.length} student{students.length !== 1 ? 's' : ''} enrolled in monitoring system
          </p>
        </div>
        <Link
          href="/students/create"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-sm font-medium transition-colors shadow-sm"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Add Student
        </Link>
      </div>

      {students.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-16 text-center">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-semibold text-white mb-2">No students added yet</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
            Add student records to your school so you can assign them to examination sessions and monitor them.
          </p>
          <Link
            href="/students/create"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-sm font-medium transition-colors"
          >
            Add First Student
          </Link>
        </div>
      ) : (
        <StudentTable initialStudents={students} />
      )}
    </div>
  )
}
