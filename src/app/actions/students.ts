'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

// ── Create Student ─────────────────────────────────────────────
export async function createStudent(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const schoolId = await getSchoolId()
    if (!schoolId) return { error: 'Not authenticated.' }

    const studentNumber = (formData.get('student_number') as string)?.trim()
    const fullName = (formData.get('full_name') as string)?.trim()
    const email = (formData.get('email') as string)?.trim() || null

    if (!studentNumber) return { error: 'Student number is required.' }
    if (!fullName) return { error: 'Full name is required.' }

    const { data, error } = await supabase
      .from('students')
      .insert({ school_id: schoolId, student_number: studentNumber, full_name: fullName, email })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') return { error: `Student number "${studentNumber}" already exists.` }
      return { error: error.message }
    }
    if (!data) return { error: 'Failed to create student.' }

    revalidatePath('/students')
    redirect('/students')
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === 'NEXT_REDIRECT' || ('digest' in err && String((err as { digest?: unknown }).digest).includes('NEXT_REDIRECT')))) throw err
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' }
  }
}

// ── Update Student ─────────────────────────────────────────────
export async function updateStudent(
  studentId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const schoolId = await getSchoolId()
    if (!schoolId) return { error: 'Not authenticated.' }

    const studentNumber = (formData.get('student_number') as string)?.trim()
    const fullName = (formData.get('full_name') as string)?.trim()
    const email = (formData.get('email') as string)?.trim() || null

    if (!studentNumber) return { error: 'Student number is required.' }
    if (!fullName) return { error: 'Full name is required.' }

    const { error } = await supabase
      .from('students')
      .update({ student_number: studentNumber, full_name: fullName, email })
      .eq('id', studentId)
      .eq('school_id', schoolId)

    if (error) return { error: error.message }

    revalidatePath('/students')
    redirect('/students')
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === 'NEXT_REDIRECT' || ('digest' in err && String((err as { digest?: unknown }).digest).includes('NEXT_REDIRECT')))) throw err
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' }
  }
}

// ── Assign Student to Exam ────────────────────────────────────
export async function assignStudentToExam(
  examId: string,
  studentId: string,
  seatNumber: string | null
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    const schoolId = await getSchoolId()
    if (!schoolId) return { error: 'Not authenticated.' }

    // Verify exam belongs to school
    const { data: exam } = await supabase
      .from('exams')
      .select('id')
      .eq('id', examId)
      .eq('school_id', schoolId)
      .maybeSingle()
    if (!exam) return { error: 'Exam not found.' }

    // Verify student belongs to school
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('id', studentId)
      .eq('school_id', schoolId)
      .maybeSingle()
    if (!student) return { error: 'Student not found.' }

    const { error } = await supabase
      .from('exam_students')
      .insert({ exam_id: examId, student_id: studentId, seat_number: seatNumber })

    if (error) {
      if (error.code === '23505') return { error: 'Student is already assigned to this exam.' }
      return { error: error.message }
    }

    revalidatePath(`/exams/${examId}`)
    return { error: null }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' }
  }
}

// ── Remove Student from Exam ──────────────────────────────────
export async function removeStudentFromExam(
  examId: string,
  studentId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    const schoolId = await getSchoolId()
    if (!schoolId) return { error: 'Not authenticated.' }

    // Verify exam belongs to school
    const { data: exam } = await supabase
      .from('exams')
      .select('id')
      .eq('id', examId)
      .eq('school_id', schoolId)
      .maybeSingle()
    if (!exam) return { error: 'Exam not found.' }

    const { error } = await supabase
      .from('exam_students')
      .delete()
      .eq('exam_id', examId)
      .eq('student_id', studentId)

    if (error) return { error: error.message }

    revalidatePath(`/exams/${examId}`)
    return { error: null }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' }
  }
}

// ── Update Seat Number ────────────────────────────────────────
export async function updateSeatNumber(
  examId: string,
  studentId: string,
  seatNumber: string
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    const schoolId = await getSchoolId()
    if (!schoolId) return { error: 'Not authenticated.' }

    const { data: exam } = await supabase
      .from('exams')
      .select('id')
      .eq('id', examId)
      .eq('school_id', schoolId)
      .maybeSingle()
    if (!exam) return { error: 'Exam not found.' }

    const { error } = await supabase
      .from('exam_students')
      .update({ seat_number: seatNumber })
      .eq('exam_id', examId)
      .eq('student_id', studentId)

    if (error) return { error: error.message }

    revalidatePath(`/exams/${examId}`)
    return { error: null }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' }
  }
}
