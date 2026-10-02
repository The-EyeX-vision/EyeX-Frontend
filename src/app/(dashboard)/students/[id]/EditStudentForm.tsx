'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { updateStudent } from '@/app/actions/students'
import type { ActionResult } from '@/app/actions/students'
import type { Student } from '@/types'

const initial: ActionResult | null = null

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 rounded-lg bg-[#1d4ed8] hover:bg-[#0037b0] disabled:opacity-60 text-white text-[13px] font-semibold transition-colors shadow-sm"
    >
      {pending ? 'Saving…' : 'Update Details'}
    </button>
  )
}

export function EditStudentForm({ student }: { student: Student }) {
  const updateWithId = updateStudent.bind(null, student.id)
  const [state, formAction] = useActionState(updateWithId, initial)

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="student_number" className="block text-[13px] font-medium text-[#0b1c30] mb-1">
          Candidate ID / Matricule
        </label>
        <input
          id="student_number"
          name="student_number"
          type="text"
          required
          defaultValue={student.student_number}
          className="w-full px-3 py-2 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all font-semibold"
        />
      </div>

      <div>
        <label htmlFor="full_name" className="block text-[13px] font-medium text-[#0b1c30] mb-1">
          Full Legal Name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          defaultValue={student.full_name}
          className="w-full px-3 py-2 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all font-medium"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-[13px] font-medium text-[#0b1c30] mb-1">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={student.email ?? ''}
          placeholder="optional"
          className="w-full px-3 py-2 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all"
        />
      </div>

      {state && 'error' in state && state.error && (
        <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] p-2.5 text-[12px] text-[#b91c1c]">
          {state.error}
        </div>
      )}

      <div className="pt-1">
        <SubmitButton />
      </div>
    </form>
  )
}
