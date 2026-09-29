'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { assignStudentToExam, removeStudentFromExam, updateSeatNumber } from '@/app/actions/students'
import type { ExamStudent, Student } from '@/types'

interface Props {
  examId: string
  examStudents: ExamStudent[]
  allStudents: Student[]
  assignedStudentIds: string[]
}

export function AssignStudentsPanel({ examId, examStudents, allStudents, assignedStudentIds }: Props) {
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [editingSeat, setEditingSeat] = useState<string | null>(null)
  const [seatValue, setSeatValue] = useState('')

  const unassigned = allStudents.filter(
    s => !assignedStudentIds.includes(s.id) &&
    (search === '' ||
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.student_number.toLowerCase().includes(search.toLowerCase()))
  )

  function handleAssign(studentId: string) {
    setError(null)
    startTransition(async () => {
      const result = await assignStudentToExam(examId, studentId, null)
      if (result.error) setError(result.error)
    })
  }

  function handleRemove(studentId: string) {
    setError(null)
    startTransition(async () => {
      const result = await removeStudentFromExam(examId, studentId)
      if (result.error) setError(result.error)
    })
  }

  function handleSeatSave(studentId: string) {
    setError(null)
    startTransition(async () => {
      const result = await updateSeatNumber(examId, studentId, seatValue)
      if (result.error) setError(result.error)
      else setEditingSeat(null)
    })
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-200">
          Assigned Students
          <span className="ml-2 text-xs text-gray-500 font-normal">({examStudents.length})</span>
        </h2>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Assigned students table */}
      {examStudents.length === 0 ? (
        <div className="text-center py-6 text-gray-500 text-sm">
          No students assigned yet. Search and assign students below.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                <th className="px-4 py-2.5 font-medium">Student #</th>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Seat</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {examStudents.map((es) => (
                <tr key={es.id} className="hover:bg-gray-800/20 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-teal-400 text-xs">
                    {es.student?.student_number ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-white">{es.student?.full_name ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    {editingSeat === es.student_id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={seatValue}
                          onChange={e => setSeatValue(e.target.value)}
                          placeholder="A01"
                          className="w-20 px-2 py-1 rounded border border-gray-700 bg-gray-800 text-white text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                        <button
                          onClick={() => handleSeatSave(es.student_id)}
                          disabled={isPending}
                          className="text-xs text-teal-400 hover:text-teal-300 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingSeat(null)}
                          className="text-xs text-gray-500 hover:text-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingSeat(es.student_id); setSeatValue(es.seat_number ?? '') }}
                        className="text-xs text-gray-400 hover:text-white transition-colors font-mono"
                      >
                        {es.seat_number ?? <span className="text-gray-600 italic">Set seat</span>}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => handleRemove(es.student_id)}
                      disabled={isPending}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign new students */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Add Students</p>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or student number…"
          className="w-full px-3.5 py-2 rounded-lg border border-gray-700 bg-gray-800 text-white placeholder-gray-500 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#0e5a4d]/50 focus:border-[#0e5a4d] transition-colors"
        />
        {unassigned.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            {allStudents.length === 0
              ? 'No students in your school yet. '
              : search
              ? 'No students match your search.'
              : 'All students are already assigned.'}
            {allStudents.length === 0 && (
              <Link href="/students/create" className="text-teal-400 hover:underline">Add students →</Link>
            )}
          </p>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {unassigned.map(student => (
              <div
                key={student.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800/40 hover:bg-gray-800 transition-colors"
              >
                <div>
                  <span className="font-mono text-teal-400 text-xs mr-2">{student.student_number}</span>
                  <span className="text-sm text-white">{student.full_name}</span>
                  {student.email && <span className="text-xs text-gray-500 ml-2">{student.email}</span>}
                </div>
                <button
                  onClick={() => handleAssign(student.id)}
                  disabled={isPending}
                  className="text-xs text-teal-400 hover:text-teal-300 disabled:opacity-50 transition-colors border border-teal-900 hover:border-teal-700 px-2 py-1 rounded"
                >
                  Assign
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
