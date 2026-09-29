import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import EditExamForm from './EditExamForm'
import type { Exam } from '@/types'

export const dynamic = 'force-dynamic'

export default async function EditExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!school) redirect('/dashboard')

  const { data: exam } = await supabase
    .from('exams')
    .select('*')
    .eq('id', id)
    .eq('school_id', school.id)
    .maybeSingle()

  if (!exam) notFound()

  return <EditExamForm exam={exam as Exam} />
}
