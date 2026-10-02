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
      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1d4ed8] hover:bg-[#0037b0] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[14px] font-semibold transition-colors shadow-sm"
    >
      {pending ? (
        <>
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Saving Candidate…
        </>
      ) : (
        'Add Candidate'
      )}
    </button>
  )
}

export default function CreateStudentPage() {
  const [state, formAction] = useActionState(createStudent, initial)

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <Link
          href="/students"
          className="text-[13px] text-[#747686] hover:text-[#0b1c30] transition-colors mb-1 inline-flex items-center gap-1"
        >
          ← Back to Candidates
        </Link>
        <h1 className="font-headline-lg text-[#0b1c30] tracking-tight">Add New Candidate</h1>
        <p className="text-[13px] text-[#434655] mt-0.5">
          Register an official candidate record for your institution to enable examination seating and monitoring.
        </p>
      </div>

      <div className="rounded-2xl border border-[#e5eeff] bg-white p-6 shadow-sm">
        <form action={formAction} className="space-y-4">
          {/* Error Banner */}
          {state && 'error' in state && state.error && (
            <div className="p-3 rounded-lg border border-[#fecaca] bg-[#fef2f2] text-[#b91c1c] text-[13px]">
              {state.error}
            </div>
          )}

          {/* Student ID / Number */}
          <div>
            <label htmlFor="student_number" className="block text-[13px] font-medium text-[#0b1c30] mb-1.5">
              Candidate Number / Matricule <span className="text-[#b91c1c]">*</span>
            </label>
            <input
              id="student_number"
              name="student_number"
              type="text"
              required
              placeholder="e.g. GBHS-2025-0042"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] placeholder-[#747686] text-[14px] font-mono focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all"
            />
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="full_name" className="block text-[13px] font-medium text-[#0b1c30] mb-1.5">
              Full Legal Name <span className="text-[#b91c1c]">*</span>
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              placeholder="e.g. Marie Claire Ngono"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] placeholder-[#747686] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all font-medium"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-[13px] font-medium text-[#0b1c30] mb-1.5">
              Contact Email <span className="text-[#747686] text-[11px] font-normal">(Optional)</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="e.g. candidate@example.cm"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] placeholder-[#747686] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#e5eeff] flex items-center justify-end gap-3">
            <Link
              href="/students"
              className="px-4 py-2 text-[13px] font-medium text-[#434655] hover:text-[#0b1c30] transition-colors"
            >
              Cancel
            </Link>
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  )
}
