/**
 * POST /api/auth/signout (also /api/auth/logout)
 *
 * School Sign-Out Endpoint.
 * Signs out from Supabase Auth and clears the browser session cookies.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  return NextResponse.json(
    {
      success: true,
      message: 'Signed out successfully.',
    },
    { status: 200 }
  )
}
