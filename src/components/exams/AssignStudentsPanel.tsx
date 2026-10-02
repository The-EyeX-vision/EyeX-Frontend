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
    <div className="rounded-2xl border border-[#e5eeff] bg-white p-6 space-y-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-code-sm text-[11px] font-bold uppercase tracking-wider text-[#466083]">
          Assigned Candidates Roster
          <span className="ml-2 text-[12px] text-[#747686] font-normal">({examStudents.length} Assigned)</span>
        </h2>
      </div>

      {error && (
        <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] p-3 text-[13px] text-[#b91c1c]">
          {error}
        </div>
      )}

      {/* Assigned students table */}
      {examStudents.length === 0 ? (
        <div className="text-center py-6 text-[#747686] text-[13px]">
          No candidates assigned yet. Search and assign candidates below.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#e5eeff]">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="bg-[#eff4ff] font-code-sm text-[11px] text-[#747686] uppercase tracking-wider">
                <th className="py-2.5 px-4 font-medium">Candidate #</th>
                <th className="py-2.5 px-4 font-medium">Name</th>
                <th className="py-2.5 px-4 font-medium">Seat</th>
                <th className="py-2.5 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eff4ff]">
              {examStudents.map((es) => (
                <tr key={es.id} className="hover:bg-[#f8f9ff] transition-colors">
                  <td className="py-2.5 px-4 font-mono text-[#0037b0] font-bold text-xs">
                    {es.student?.student_number ?? '—'}
                  </td>
                  <td className="py-2.5 px-4 text-[#0b1c30] font-semibold">{es.student?.full_name ?? '—'}</td>
                  <td className="py-2.5 px-4">
                    {editingSeat === es.student_id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={seatValue}
                          onChange={e => setSeatValue(e.target.value)}
                          placeholder="A01"
                          className="w-20 px-2 py-1 rounded border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#1d4ed8]"
                        />
                        <button
                          onClick={() => handleSeatSave(es.student_id)}
                          disabled={isPending}
                          className="px-2 py-1 text-xs bg-[#1d4ed8] text-white rounded font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingSeat(null)}
                          className="text-xs text-[#747686]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingSeat(es.student_id)
                          setSeatValue(es.seat_number ?? '')
                        }}
                        className="font-mono text-xs text-[#434655] hover:text-[#0037b0] underline"
                      >
                        {es.seat_number ? `Seat: ${es.seat_number}` : 'Set Seat'}
                      </button>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => handleRemove(es.student_id)}
                      disabled={isPending}
                      className="text-xs text-[#b91c1c] hover:underline font-semibold disabled:opacity-50"
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

      {/* Unassigned search and add */}
      <div className="pt-4 border-t border-[#e5eeff] space-y-3">
        <h3 className="font-code-sm text-[11px] font-bold uppercase tracking-wider text-[#466083]">
          Assign Additional Candidates
        </h3>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search unassigned candidates by name or number…"
          className="w-full px-3.5 py-2 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] placeholder-[#747686] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all font-medium"
        />

        {unassigned.length === 0 ? (
          <p className="text-xs text-[#747686] py-2">
            {allStudents.length === 0
              ? 'No candidates enrolled in school yet.'
              : search
              ? 'No matching unassigned candidates.'
              : 'All candidates are already assigned to this examination.'}
          </p>
        ) : (
          <div className="max-h-48 overflow-y-auto divide-y divide-[#eff4ff] rounded-xl border border-[#e5eeff]">
            {unassigned.slice(0, 10).map((student) => (
              <div key={student.id} className="flex items-center justify-between p-2.5 hover:bg-[#f8f9ff] text-[13px]">
                <div>
                  <span className="font-mono text-xs text-[#0037b0] font-semibold mr-2">
                    {student.student_number}
                  </span>
                  <span className="font-semibold text-[#0b1c30]">{student.full_name}</span>
                </div>
                <button
                  onClick={() => handleAssign(student.id)}
                  disabled={isPending}
                  className="px-3 py-1 rounded bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0037b0] text-xs font-semibold disabled:opacity-50 transition-colors"
                >
                  + Assign
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
