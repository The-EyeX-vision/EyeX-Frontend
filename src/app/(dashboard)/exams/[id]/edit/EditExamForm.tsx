'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { updateExam } from '@/app/actions/exams'
import type { ActionResult } from '@/app/actions/exams'
import type { Exam } from '@/types'

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
          Saving Changes…
        </>
      ) : (
        'Save Changes'
      )}
    </button>
  )
}

export default function EditExamForm({ exam }: { exam: Exam }) {
  const updateExamWithId = updateExam.bind(null, exam.id)
  const [state, formAction] = useActionState(updateExamWithId, initial)

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/exams/${exam.id}`}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors mb-3 inline-flex items-center gap-1"
        >
          ← Back to Examination
        </Link>
        <h1 className="text-xl font-bold text-white">Edit Examination</h1>
        <p className="text-sm text-gray-400 mt-0.5">Update details for &ldquo;{exam.title}&rdquo;.</p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
        <form action={formAction} className="space-y-5">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-xs font-medium text-gray-300 mb-1.5">
              Examination Title <span className="text-red-400">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              defaultValue={exam.title}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-700 bg-gray-800 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e5a4d]/50 focus:border-[#0e5a4d] transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-xs font-medium text-gray-300 mb-1.5">
              Description <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={exam.description ?? ''}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-700 bg-gray-800 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e5a4d]/50 focus:border-[#0e5a4d] transition-colors resize-none"
            />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="exam_date" className="block text-xs font-medium text-gray-300 mb-1.5">
                Exam Date <span className="text-red-400">*</span>
              </label>
              <input
                id="exam_date"
                name="exam_date"
                type="date"
                required
                defaultValue={exam.exam_date}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-700 bg-gray-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0e5a4d]/50 focus:border-[#0e5a4d] transition-colors"
              />
            </div>
            <div>
              <label htmlFor="start_time" className="block text-xs font-medium text-gray-300 mb-1.5">
                Start Time <span className="text-red-400">*</span>
              </label>
              <input
                id="start_time"
                name="start_time"
                type="time"
                required
                defaultValue={exam.start_time}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-700 bg-gray-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0e5a4d]/50 focus:border-[#0e5a4d] transition-colors"
              />
            </div>
          </div>

          {/* Duration + Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="duration_minutes" className="block text-xs font-medium text-gray-300 mb-1.5">
                Duration (minutes) <span className="text-red-400">*</span>
              </label>
              <input
                id="duration_minutes"
                name="duration_minutes"
                type="number"
                min={1}
                max={600}
                required
                defaultValue={exam.duration_minutes}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-700 bg-gray-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0e5a4d]/50 focus:border-[#0e5a4d] transition-colors"
              />
            </div>
            <div>
              <label htmlFor="room_number" className="block text-xs font-medium text-gray-300 mb-1.5">
                Room Number <span className="text-red-400">*</span>
              </label>
              <input
                id="room_number"
                name="room_number"
                type="text"
                required
                defaultValue={exam.room_number}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-700 bg-gray-800 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e5a4d]/50 focus:border-[#0e5a4d] transition-colors"
              />
            </div>
          </div>

          {/* Error */}
          {state && 'error' in state && state.error && (
            <div className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
              {state.error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <SubmitButton />
            <Link
              href={`/exams/${exam.id}`}
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
