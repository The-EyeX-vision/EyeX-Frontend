import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Exam } from '@/types'

export const dynamic = 'force-dynamic'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    scheduled: 'bg-[#eff4ff] text-[#0037b0] border-[#bbd6ff]',
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    completed: 'bg-[#f8f9ff] text-[#747686] border-[#c4c5d7]',
    archived: 'bg-[#f8f9ff] text-[#747686] border-[#c4c5d7]',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-code-sm text-[10px] font-bold border ${map[status] ?? 'bg-[#f8f9ff] text-[#747686] border-[#c4c5d7]'}`}>
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
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-6 bg-[#0037b0] rounded-sm shrink-0" />
            <div>
              <h1 className="font-headline-lg text-[#0b1c30] tracking-tight">Examinations Directory</h1>
              <p className="text-[13px] text-[#434655] mt-0.5 hidden sm:block">{exams.length} examination{exams.length !== 1 ? 's' : ''} configured across institution</p>
            </div>
          </div>
          <Link
            href="/exams/create"
            className="flex items-center gap-2 bg-[#1d4ed8] text-white font-semibold px-4 py-2 rounded-lg text-[14px] hover:bg-[#0037b0] transition-colors shadow-sm self-start sm:self-auto"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Examination
          </Link>
        </div>
      </div>

      {/* Empty state */}
      {exams.length === 0 && (
        <div className="rounded-2xl border border-[#e5eeff] bg-white p-16 text-center shadow-sm">
          <div className="w-14 h-14 rounded-xl bg-[#eff4ff] text-[#0037b0] flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <h3 className="font-headline-md text-lg font-bold text-[#0b1c30] mb-2">No examinations yet</h3>
          <p className="text-[#747686] text-[14px] mb-6 max-w-md mx-auto leading-relaxed">Create your first examination to begin candidate seating and monitoring.</p>
          <Link
            href="/exams/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1d4ed8] hover:bg-[#0037b0] text-white text-[14px] font-semibold transition-colors shadow-sm"
          >
            Create Examination
          </Link>
        </div>
      )}

      {/* Exams list */}
      {exams.length > 0 && (
        <div className="rounded-xl border border-[#e5eeff] bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="bg-[#eff4ff] font-code-sm text-[11px] text-[#747686] uppercase tracking-wider">
                  <th className="py-3 px-5">Examination</th>
                  <th className="py-3 px-5 hidden md:table-cell">Date</th>
                  <th className="py-3 px-5 hidden md:table-cell">Time</th>
                  <th className="py-3 px-5 hidden lg:table-cell">Duration</th>
                  <th className="py-3 px-5 hidden md:table-cell">Room</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff4ff]">
                {exams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-[#f8f9ff] transition-colors">
                    <td className="py-4 px-5">
                      <Link href={`/exams/${exam.id}`} className="group">
                        <p className="font-bold text-[14px] text-[#0b1c30] group-hover:text-[#1d4ed8] transition-colors">{exam.title}</p>
                        {exam.description && (
                          <p className="text-[12px] text-[#747686] mt-0.5 truncate max-w-xs">{exam.description}</p>
                        )}
                      </Link>
                    </td>
                    <td className="py-4 px-5 text-[13px] text-[#434655] hidden md:table-cell">{exam.exam_date}</td>
                    <td className="py-4 px-5 font-code-sm text-[12px] text-[#434655] hidden md:table-cell">{exam.start_time}</td>
                    <td className="py-4 px-5 font-code-sm text-[12px] text-[#434655] hidden lg:table-cell">{exam.duration_minutes} min</td>
                    <td className="py-4 px-5 font-code-sm text-[12px] text-[#434655] hidden md:table-cell">{exam.room_number}</td>
                    <td className="py-4 px-5"><StatusBadge status={exam.status} /></td>
                    <td className="py-4 px-5 text-right">
                      <Link
                        href={`/exams/${exam.id}`}
                        className="text-[13px] text-[#1d4ed8] hover:underline font-semibold"
                      >
                        Details &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
