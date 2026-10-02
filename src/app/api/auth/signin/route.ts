/**
 * POST /api/auth/signin (also /api/auth/login)
 *
 * School Sign-In Endpoint.
 *
 * Steps:
 * 1. Validates email and password.
 * 2. Authenticates via Supabase Auth (signInWithPassword).
 * 3. Sets session cookies automatically via @supabase/ssr.
 * 4. Retrieves the linked school profile from public.schools.
 * 5. Returns the authenticated user, school, and session tokens.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  requireString,
  errorResponse,
  parseJsonBody,
} from '@/lib/validation'

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody<Record<string, unknown>>(request)
  if (!parsed.ok) {
    return NextResponse.json(errorResponse(parsed.error, parsed.details), { status: 400 })
  }

  const b = parsed.data

  const emailResult = requireString(b.email, 'email')
  if (!emailResult.ok) return NextResponse.json(errorResponse(emailResult.error), { status: 400 })

  const passwordResult = requireString(b.password, 'password')
  if (!passwordResult.ok) return NextResponse.json(errorResponse(passwordResult.error), { status: 400 })

  const email = emailResult.value.toLowerCase()
  const password = passwordResult.value

  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError || !authData.user) {
    const msg = authError?.message?.toLowerCase() ?? ''

    if (msg.includes('email not confirmed')) {
      return NextResponse.json(
        errorResponse(
          'Email not confirmed yet. Run in Supabase SQL: UPDATE auth.users SET email_confirmed_at = now();'
        ),
        { status: 403 }
      )
    }

    if (
      msg.includes('invalid login credentials') ||
      msg.includes('invalid_grant') ||
      msg.includes('user not found')
    ) {
      return NextResponse.json(
        errorResponse('Invalid email or password. Please verify your credentials.'),
        { status: 401 }
      )
    }

    return NextResponse.json(
      errorResponse(authError?.message || 'Authentication failed.'),
      { status: 401 }
    )
  }

  // Retrieve school record associated with this account
  const admin = createAdminClient()
  const db = admin || supabase

  let { data: school } = await db
    .from('schools')
    .select('*')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle()

  // Auto-provision school profile if missing (e.g. legacy accounts)
  if (!school) {
    const schoolName = (authData.user.user_metadata?.school_name as string) || email.split('@')[0].toUpperCase()

    const { data: createdSchool } = await db
      .from('schools')
      .insert({
        auth_user_id: authData.user.id,
        school_name: schoolName,
        email,
      })
      .select('*')
      .single()

    school = createdSchool
  }

  return NextResponse.json(
    {
      success: true,
      message: 'Signed in successfully.',
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
      school,
      session: {
        access_token: authData.session?.access_token,
        refresh_token: authData.session?.refresh_token,
        expires_at: authData.session?.expires_at,
      },
    },
    { status: 200 }
  )
}
