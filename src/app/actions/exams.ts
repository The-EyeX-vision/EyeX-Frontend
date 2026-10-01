'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { ExamStatus } from '@/types'

export type ActionResult = { error: string } | { success: true; id: string }

async function getSchoolId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  return school?.id ?? null
}

// ── Create Exam ────────────────────────────────────────────────
export async function createExam(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const schoolId = await getSchoolId()
    if (!schoolId) return { error: 'Not authenticated.' }

    const title = (formData.get('title') as string)?.trim()
    const description = (formData.get('description') as string)?.trim() || null
    const examDate = (formData.get('exam_date') as string)?.trim()
    const startTime = (formData.get('start_time') as string)?.trim()
    const durationMinutes = parseInt(formData.get('duration_minutes') as string, 10)
    const roomNumber = (formData.get('room_number') as string)?.trim()
    const expectedStudents = parseInt(formData.get('expected_students') as string, 10)

    if (!title) return { error: 'Exam title is required.' }
    if (!examDate) return { error: 'Exam date is required.' }
    if (!startTime) return { error: 'Start time is required.' }
    if (!durationMinutes || durationMinutes < 1) return { error: 'Duration must be at least 1 minute.' }
    if (!roomNumber) return { error: 'Room number is required.' }
    if (!expectedStudents || expectedStudents < 1 || !Number.isInteger(expectedStudents)) {
      return { error: 'Expected students must be a whole number greater than 0.' }
    }

    const { data, error } = await supabase
      .from('exams')
      .insert({
        school_id: schoolId,
        title,
        description,
        exam_date: examDate,
        start_time: startTime,
        duration_minutes: durationMinutes,
        room_number: roomNumber,
        expected_students: expectedStudents,
        status: 'scheduled',
      })
      .select('id')
      .single()

    if (error) return { error: error.message }
    if (!data) return { error: 'Failed to create exam.' }

    revalidatePath('/exams')
    redirect(`/exams/${data.id}`)
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === 'NEXT_REDIRECT' || ('digest' in err && String((err as { digest?: unknown }).digest).includes('NEXT_REDIRECT')))) throw err
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' }
  }
}

// ── Update Exam ────────────────────────────────────────────────
export async function updateExam(
  examId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const schoolId = await getSchoolId()
    if (!schoolId) return { error: 'Not authenticated.' }

    const title = (formData.get('title') as string)?.trim()
    const description = (formData.get('description') as string)?.trim() || null
    const examDate = (formData.get('exam_date') as string)?.trim()
    const startTime = (formData.get('start_time') as string)?.trim()
    const durationMinutes = parseInt(formData.get('duration_minutes') as string, 10)
    const roomNumber = (formData.get('room_number') as string)?.trim()
    const expectedStudents = parseInt(formData.get('expected_students') as string, 10)

    if (!title) return { error: 'Exam title is required.' }
    if (!examDate) return { error: 'Exam date is required.' }
    if (!startTime) return { error: 'Start time is required.' }
    if (!durationMinutes || durationMinutes < 1) return { error: 'Duration must be at least 1 minute.' }
    if (!roomNumber) return { error: 'Room number is required.' }
    if (!expectedStudents || expectedStudents < 1 || !Number.isInteger(expectedStudents)) {
      return { error: 'Expected students must be a whole number greater than 0.' }
    }

    const { error } = await supabase
      .from('exams')
      .update({
        title,
        description,
        exam_date: examDate,
        start_time: startTime,
        duration_minutes: durationMinutes,
        room_number: roomNumber,
        expected_students: expectedStudents,
        updated_at: new Date().toISOString(),
      })
      .eq('id', examId)
      .eq('school_id', schoolId)

    if (error) return { error: error.message }

    revalidatePath(`/exams/${examId}`)
    revalidatePath('/exams')
    redirect(`/exams/${examId}`)
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === 'NEXT_REDIRECT' || ('digest' in err && String((err as { digest?: unknown }).digest).includes('NEXT_REDIRECT')))) throw err
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' }
  }
}

// ── Archive Exam ───────────────────────────────────────────────
export async function archiveExam(examId: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    const schoolId = await getSchoolId()
    if (!schoolId) return { error: 'Not authenticated.' }

    const { error } = await supabase
      .from('exams')
      .update({ status: 'archived' as ExamStatus, updated_at: new Date().toISOString() })
      .eq('id', examId)
      .eq('school_id', schoolId)

    if (error) return { error: error.message }

    revalidatePath(`/exams/${examId}`)
    revalidatePath('/exams')
    return { error: null }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' }
  }
}

// ── Update Exam Status ─────────────────────────────────────────
export async function updateExamStatus(examId: string, status: ExamStatus): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    const schoolId = await getSchoolId()
    if (!schoolId) return { error: 'Not authenticated.' }

    const { error } = await supabase
      .from('exams')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', examId)
      .eq('school_id', schoolId)

    if (error) return { error: error.message }

    revalidatePath(`/exams/${examId}`)
    revalidatePath('/exams')
    return { error: null }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' }
  }
}
