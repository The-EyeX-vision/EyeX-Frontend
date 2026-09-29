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
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student ID, name, or email…"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-800 bg-gray-900/60 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e5a4d]/50 focus:border-[#0e5a4d] transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
              <th className="px-5 py-3.5 font-medium">Student Number</th>
              <th className="px-5 py-3.5 font-medium">Full Name</th>
              <th className="px-5 py-3.5 font-medium hidden sm:table-cell">Email</th>
              <th className="px-5 py-3.5 font-medium hidden md:table-cell">Enrolled On</th>
              <th className="px-5 py-3.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                  No students match &ldquo;{search}&rdquo;.
                </td>
              </tr>
            ) : (
              filtered.map((student) => (
                <tr key={student.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-4 font-mono font-semibold text-teal-400">
                    {student.student_number}
                  </td>
                  <td className="px-5 py-4 text-white font-medium">
                    <Link
                      href={`/students/${student.id}`}
                      className="hover:text-teal-300 transition-colors"
                    >
                      {student.full_name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-gray-400 hidden sm:table-cell">
                    {student.email || <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs hidden md:table-cell">
                    {new Date(student.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/students/${student.id}`}
                      className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
                    >
                      View &rarr;
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
