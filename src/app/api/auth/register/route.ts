/**
 * POST /api/auth/register (also /api/auth/signup)
 *
 * School Registration Endpoint.
 *
 * Steps:
 * 1. Validates school_name, email, password.
 * 2. Creates the authenticated user in Supabase Auth (auth.users).
 * 3. Creates the corresponding school profile in public.schools.
 * 4. Links auth.users.id -> public.schools.auth_user_id.
 * 5. Establishes the session cookie so the user is immediately logged in.
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

  const schoolNameResult = requireString(b.school_name, 'school_name')
  if (!schoolNameResult.ok) {
    return NextResponse.json(errorResponse(schoolNameResult.error), { status: 400 })
  }

  const emailResult = requireString(b.email, 'email')
  if (!emailResult.ok) {
    return NextResponse.json(errorResponse(emailResult.error), { status: 400 })
  }

  const email = emailResult.value.toLowerCase()
  if (!email.includes('@') || !email.includes('.')) {
    return NextResponse.json(errorResponse('Please provide a valid email address.'), { status: 400 })
  }

  const passwordResult = requireString(b.password, 'password')
  if (!passwordResult.ok) {
    return NextResponse.json(errorResponse(passwordResult.error), { status: 400 })
  }

  if (passwordResult.value.length < 6) {
    return NextResponse.json(errorResponse('Password must be at least 6 characters long.'), { status: 400 })
  }

  const supabase = await createClient()
  const admin = createAdminClient()

  let userId: string | null = null
  let sessionData: unknown = null

  // 1. Create user in Supabase Auth
  if (admin) {
    // Admin creates pre-confirmed user (bypasses email confirmation requirement)
    const { data: adminCreated, error: adminErr } = await admin.auth.admin.createUser({
      email,
      password: passwordResult.value,
      email_confirm: true,
      user_metadata: {
        school_name: schoolNameResult.value,
        role: 'admin',
      },
    })

    if (adminErr) {
      const msg = adminErr.message?.toLowerCase() ?? ''
      if (msg.includes('already registered') || msg.includes('already exists')) {
        return NextResponse.json(
          errorResponse('An account with this email is already registered. Please sign in.'),
          { status: 409 }
        )
      }
      return NextResponse.json(errorResponse(adminErr.message || 'Registration failed.'), { status: 400 })
    }

    userId = adminCreated.user.id

    // Sign in to establish browser session cookies
    const { data: signinData } = await supabase.auth.signInWithPassword({
      email,
      password: passwordResult.value,
    })
    sessionData = signinData.session
  } else {
    // Standard sign-up (when no service role key is configured)
    const { data: signupData, error: signupErr } = await supabase.auth.signUp({
      email,
      password: passwordResult.value,
      options: {
        data: {
          school_name: schoolNameResult.value,
        },
      },
    })

    if (signupErr) {
      return NextResponse.json(errorResponse(signupErr.message || 'Registration failed.'), { status: 400 })
    }

    userId = signupData.user?.id ?? null
    sessionData = signupData.session
  }

  if (!userId) {
    return NextResponse.json(errorResponse('Failed to create authenticated user account.'), { status: 500 })
  }

  // 2. Provision school profile in public.schools
  const db = admin || supabase

  let school: Record<string, unknown> | null = null

  // Check if school already exists for this auth user
  const { data: existingSchool } = await db
    .from('schools')
    .select('*')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (existingSchool) {
    const { data: updatedSchool, error: updateErr } = await db
      .from('schools')
      .update({
        school_name: schoolNameResult.value,
        email: email,
      })
      .eq('id', existingSchool.id)
      .select('*')
      .single()

    if (updateErr) {
      return NextResponse.json(
        errorResponse('Failed to update existing school profile.', updateErr.message),
        { status: 500 }
      )
    }
    school = updatedSchool
  } else {
    const { data: newSchool, error: insertErr } = await db
      .from('schools')
      .insert({
        auth_user_id: userId,
        school_name: schoolNameResult.value,
        email: email,
      })
      .select('*')
      .single()

    if (insertErr) {
      return NextResponse.json(
        errorResponse('Account created but failed to initialize school profile.', insertErr.message),
        { status: 500 }
      )
    }
    school = newSchool
  }

  return NextResponse.json(
    {
      success: true,
      message: 'School registered successfully.',
      user: {
        id: userId,
        email,
      },
      school,
      session: sessionData,
    },
    { status: 201 }
  )
}
