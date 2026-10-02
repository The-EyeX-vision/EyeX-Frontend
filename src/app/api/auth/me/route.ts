/**
 * GET /api/auth/me
 * Returns the currently authenticated user and their linked school profile.
 */
import { NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth/api'
import { errorResponse } from '@/lib/validation'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const auth = await authenticateUser()
  if (!auth.ok) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return NextResponse.json(
    {
      user: {
        id: user?.id,
        email: user?.email,
      },
      school: auth.school,
    },
    { status: 200 }
  )
}
