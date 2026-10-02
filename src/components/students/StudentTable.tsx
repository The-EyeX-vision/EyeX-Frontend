'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Student } from '@/types'

interface Props {
  initialStudents: Student[]
}

export function StudentTable({ initialStudents }: Props) {
  const [search, setSearch] = useState('')

  const filtered = initialStudents.filter((s) => {
    const term = search.toLowerCase()
    return (
      s.full_name.toLowerCase().includes(term) ||
      s.student_number.toLowerCase().includes(term) ||
      (s.email && s.email.toLowerCase().includes(term))
    )
  })

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="max-w-md">
        <div className="relative">
          <svg
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#747686]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by candidate number, name, or email…"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] placeholder-[#747686] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all font-medium"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#e5eeff] bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[650px]">
            <thead>
              <tr className="bg-[#eff4ff] font-code-sm text-[11px] text-[#747686] uppercase tracking-wider">
                <th className="py-3 px-5">Candidate ID / Number</th>
                <th className="py-3 px-5">Full Candidate Name</th>
                <th className="py-3 px-5 hidden sm:table-cell">Contact Email</th>
                <th className="py-3 px-5 hidden md:table-cell">Enrollment Date</th>
                <th className="py-3 px-5 text-right">Dossier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eff4ff]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 px-5 text-center text-[#747686] text-[13px]">
                    No candidates match &ldquo;{search}&rdquo;.
                  </td>
                </tr>
              ) : (
                filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-[#f8f9ff] transition-colors">
                    <td className="py-4 px-5 font-mono text-[13px] font-bold text-[#0037b0]">
                      {student.student_number}
                    </td>
                    <td className="py-4 px-5 text-[14px] font-semibold text-[#0b1c30]">
                      <Link
                        href={`/students/${student.id}`}
                        className="hover:text-[#1d4ed8] transition-colors"
                      >
                        {student.full_name}
                      </Link>
                    </td>
                    <td className="py-4 px-5 text-[13px] text-[#434655] hidden sm:table-cell">
                      {student.email || <span className="text-[#c4c5d7]">—</span>}
                    </td>
                    <td className="py-4 px-5 font-code-sm text-[11px] text-[#747686] hidden md:table-cell">
                      {new Date(student.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <Link
                        href={`/students/${student.id}`}
                        className="text-[13px] text-[#1d4ed8] hover:underline font-semibold"
                      >
                        Profile Dossier &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
