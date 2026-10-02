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
      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1d4ed8] hover:bg-[#0037b0] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[14px] font-semibold transition-colors shadow-sm"
    >
      {pending ? (
        <>
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
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
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <Link
          href={`/exams/${exam.id}`}
          className="text-[13px] text-[#747686] hover:text-[#0b1c30] transition-colors mb-1 inline-flex items-center gap-1"
        >
          ← Back to Examination
        </Link>
        <h1 className="font-headline-lg text-[#0b1c30] tracking-tight">Edit Examination</h1>
        <p className="text-[13px] text-[#434655] mt-0.5">Update configuration for &ldquo;{exam.title}&rdquo;.</p>
      </div>

      <div className="rounded-2xl border border-[#e5eeff] bg-white p-6 shadow-sm">
        <form action={formAction} className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-[13px] font-medium text-[#0b1c30] mb-1.5">
              Examination Title <span className="text-[#b91c1c]">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              defaultValue={exam.title}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all font-medium"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-[13px] font-medium text-[#0b1c30] mb-1.5">
              Description <span className="text-[#747686] text-[11px] font-normal">(Optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={exam.description ?? ''}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="exam_date" className="block text-[13px] font-medium text-[#0b1c30] mb-1.5">
                Exam Date <span className="text-[#b91c1c]">*</span>
              </label>
              <input
                id="exam_date"
                name="exam_date"
                type="date"
                required
                defaultValue={exam.exam_date}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all"
              />
            </div>
            <div>
              <label htmlFor="start_time" className="block text-[13px] font-medium text-[#0b1c30] mb-1.5">
                Start Time <span className="text-[#b91c1c]">*</span>
              </label>
              <input
                id="start_time"
                name="start_time"
                type="time"
                required
                defaultValue={exam.start_time}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Duration + Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="duration_minutes" className="block text-[13px] font-medium text-[#0b1c30] mb-1.5">
                Duration (minutes) <span className="text-[#b91c1c]">*</span>
              </label>
              <input
                id="duration_minutes"
                name="duration_minutes"
                type="number"
                min={1}
                max={600}
                required
                defaultValue={exam.duration_minutes}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all font-medium"
              />
            </div>
            <div>
              <label htmlFor="room_number" className="block text-[13px] font-medium text-[#0b1c30] mb-1.5">
                Room / Hall Number <span className="text-[#b91c1c]">*</span>
              </label>
              <input
                id="room_number"
                name="room_number"
                type="text"
                required
                defaultValue={exam.room_number}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          {/* Error */}
          {state && 'error' in state && state.error && (
            <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] p-3 text-[13px] text-[#b91c1c]">
              {state.error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-3 border-t border-[#e5eeff]">
            <SubmitButton />
            <Link href={`/exams/${exam.id}`} className="px-4 py-2.5 text-[13px] text-[#434655] hover:text-[#0b1c30] transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
