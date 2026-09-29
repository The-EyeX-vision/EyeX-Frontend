'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { createStudent } from '@/app/actions/students'
import type { ActionResult } from '@/app/actions/students'

const initial: ActionResult | null = null

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0e5a4d] hover:bg-[#0b483d] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shadow-sm"
    >
      {pending ? (
        <>
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Saving Student…
        </>
      ) : (
        'Add Student'
      )}
    </button>
  )
}

export default function CreateStudentPage() {
  const [state, formAction] = useActionState(createStudent, initial)

  return (
    <div className="p-6 max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/students"
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors mb-3 inline-flex items-center gap-1"
        >
          ← Back to Students
        </Link>
        <h1 className="text-xl font-bold text-white">Add New Student</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Register a student record for your school to enable examination seating and monitoring.
        </p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
        <form action={formAction} className="space-y-5">
          {/* Student ID / Number */}
          <div>
            <label htmlFor="student_number" className="block text-xs font-medium text-gray-300 mb-1.5">
              Student ID / Matricule Number <span className="text-red-400">*</span>
            </label>
            <input
              id="student_number"
              name="student_number"
              type="text"
              required
              placeholder="e.g. ST-2026-001 or UB20A102"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-700 bg-gray-800 text-white placeholder-gray-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0e5a4d]/50 focus:border-[#0e5a4d] transition-colors"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Must be unique within your school. Used to match seated candidates.
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="full_name" className="block text-xs font-medium text-gray-300 mb-1.5">
              Full Legal Name <span className="text-red-400">*</span>
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              placeholder="e.g. Marie Claire Tamba"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-700 bg-gray-800 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e5a4d]/50 focus:border-[#0e5a4d] transition-colors"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-gray-300 mb-1.5">
              Email Address <span className="text-gray-500">(optional)</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="marie.tamba@school.edu"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-700 bg-gray-800 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e5a4d]/50 focus:border-[#0e5a4d] transition-colors"
            />
          </div>

          {/* Error notice */}
          {state && 'error' in state && state.error && (
            <div className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
              {state.error}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-2">
            <SubmitButton />
            <Link
              href="/students"
              className="px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
