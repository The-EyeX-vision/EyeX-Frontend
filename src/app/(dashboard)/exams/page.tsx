import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClipboardIcon } from '@/components/ui/Icons'
import type { Exam } from '@/types'

export const dynamic = 'force-dynamic'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    scheduled: 'bg-blue-950 text-blue-300 border-blue-800',
    active: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    completed: 'bg-gray-800 text-gray-400 border-gray-700',
    archived: 'bg-gray-900 text-gray-500 border-gray-800',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${map[status] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default async function ExamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const exams: Exam[] = []

  if (school) {
    const { data } = await supabase
      .from('exams')
      .select('*')
      .eq('school_id', school.id)
      .order('created_at', { ascending: false })
    if (data) exams.push(...data)
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Examinations</h1>
          <p className="text-sm text-gray-400 mt-0.5">{exams.length} examination{exams.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/exams/create"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-sm font-medium transition-colors shadow-sm"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          New Examination
        </Link>
      </div>

      {/* Empty state */}
      {exams.length === 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-16 text-center">
          <ClipboardIcon className="w-10 h-10 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No examinations yet</h3>
          <p className="text-gray-400 text-sm mb-6">Create your first examination to begin monitoring.</p>
          <Link
            href="/exams/create"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-sm font-medium transition-colors"
          >
            Create Examination
          </Link>
        </div>
      )}

      {/* Exams list */}
      {exams.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                <th className="px-5 py-3.5 font-medium">Examination</th>
                <th className="px-5 py-3.5 font-medium hidden md:table-cell">Date</th>
                <th className="px-5 py-3.5 font-medium hidden md:table-cell">Time</th>
                <th className="px-5 py-3.5 font-medium hidden lg:table-cell">Duration</th>
                <th className="px-5 py-3.5 font-medium hidden md:table-cell">Room</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
                <th className="px-5 py-3.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {exams.map((exam) => (
                <tr key={exam.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <Link href={`/exams/${exam.id}`} className="group">
                      <p className="font-medium text-white group-hover:text-teal-300 transition-colors">{exam.title}</p>
                      {exam.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{exam.description}</p>
                      )}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-gray-300 hidden md:table-cell">{exam.exam_date}</td>
                  <td className="px-5 py-4 text-gray-300 hidden md:table-cell">{exam.start_time}</td>
                  <td className="px-5 py-4 text-gray-300 hidden lg:table-cell">{exam.duration_minutes} min</td>
                  <td className="px-5 py-4 text-gray-300 hidden md:table-cell">{exam.room_number}</td>
                  <td className="px-5 py-4"><StatusBadge status={exam.status} /></td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/exams/${exam.id}`}
                      className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
