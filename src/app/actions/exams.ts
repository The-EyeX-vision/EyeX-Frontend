'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ExamStatus } from '@/types'

export type ActionResult = { error: string } | { success: true; id: string }

async function getSchoolId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 1. Try standard user client
  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (school?.id) return school.id

  // 2. Try admin client if RLS blocked or record needs sync
  const admin = createAdminClient()
  if (admin) {
    const { data: adminSchool } = await admin
      .from('schools')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (adminSchool?.id) return adminSchool.id

    // 3. Auto-provision school record if missing for this user
    const schoolName =
      (user.user_metadata?.school_name as string) ||
      (user.email ? user.email.split('@')[0].toUpperCase() : 'EyeX School')

    const { data: newSchool } = await admin
      .from('schools')
      .insert({
        auth_user_id: user.id,
        school_name: schoolName,
        email: user.email || '',
      })
      .select('id')
      .maybeSingle()

    if (newSchool?.id) return newSchool.id
  }

  return null
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

    if (!title) return { error: 'Exam title is required.' }
    if (!examDate) return { error: 'Exam date is required.' }
    if (!startTime) return { error: 'Start time is required.' }
    if (!durationMinutes || durationMinutes < 1) return { error: 'Duration must be at least 1 minute.' }
    if (!roomNumber) return { error: 'Room number is required.' }

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

    if (!title) return { error: 'Exam title is required.' }
    if (!examDate) return { error: 'Exam date is required.' }
    if (!startTime) return { error: 'Start time is required.' }
    if (!durationMinutes || durationMinutes < 1) return { error: 'Duration must be at least 1 minute.' }
    if (!roomNumber) return { error: 'Room number is required.' }

    const { error } = await supabase
      .from('exams')
      .update({
        title,
        description,
        exam_date: examDate,
        start_time: startTime,
        duration_minutes: durationMinutes,
        room_number: roomNumber,
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
