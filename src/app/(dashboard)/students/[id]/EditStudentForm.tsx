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
      className="px-4 py-2 rounded-lg bg-[#0e5a4d] hover:bg-[#0b483d] disabled:opacity-60 text-white text-xs font-semibold transition-colors"
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
        <label htmlFor="student_number" className="block text-xs font-medium text-gray-300 mb-1">
          Student ID
        </label>
        <input
          id="student_number"
          name="student_number"
          type="text"
          required
          defaultValue={student.student_number}
          className="w-full px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0e5a4d]/50"
        />
      </div>

      <div>
        <label htmlFor="full_name" className="block text-xs font-medium text-gray-300 mb-1">
          Full Name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          defaultValue={student.full_name}
          className="w-full px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#0e5a4d]/50"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-xs font-medium text-gray-300 mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={student.email ?? ''}
          placeholder="optional"
          className="w-full px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#0e5a4d]/50"
        />
      </div>

      {state && 'error' in state && state.error && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 p-2.5 text-xs text-red-300">
          {state.error}
        </div>
      )}

      <div>
        <SubmitButton />
      </div>
    </form>
  )
}
