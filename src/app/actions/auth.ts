'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type AuthState = {
  error: string | null
  success?: string | null
}

export type LoginState = AuthState

/**
 * Helper to generate a clean, uppercase 3-6 letter code prefix for a school.
 */
function generateCodePrefix(name: string): string {
  const lettersOnly = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  const base = lettersOnly.slice(0, 4) || 'SCH'
  return `${base}_${Math.floor(100 + Math.random() * 900)}`
}

/**
 * Server Action — handles school account sign-in.
 */
export async function loginAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  try {
    const email = (formData.get('email') as string | null)?.trim() ?? ''
    const password = (formData.get('password') as string | null) ?? ''

    if (!email || !password) {
      return { error: 'Please enter both your school email and password.' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      const msg = error.message?.toLowerCase() ?? ''

      if (msg.includes('email not confirmed')) {
        return {
          error:
            'Email not confirmed yet. Run this in your Supabase SQL Editor: UPDATE auth.users SET email_confirmed_at = now(); or in Authentication -> Providers -> Email uncheck "Confirm email".',
        }
      }

      if (
        msg.includes('invalid login credentials') ||
        msg.includes('invalid_grant') ||
        msg.includes('user not found')
      ) {
        return { error: 'Email or password is incorrect. Please check your credentials.' }
      }

      if (msg.includes('banned') || msg.includes('disabled') || msg.includes('deactivated')) {
        return {
          error: 'This account has been disabled. Please contact your school administrator.',
        }
      }

      return { error: error.message || 'Login failed. Please check your credentials and try again.' }
    }

    if (!data.user) {
      return { error: 'Authentication failed. Please check credentials.' }
    }

    // Safely check or provision school record in public.schools
    try {
      const admin = createAdminClient()
      const db = admin || supabase

      const { data: school } = await db
        .from('schools')
        .select('*')
        .eq('auth_user_id', data.user.id)
        .maybeSingle()

      if (!school) {
        const schoolName =
          (data.user.user_metadata?.school_name as string) ||
          email.split('@')[0].toUpperCase()

        const codePrefix =
          (data.user.user_metadata?.code_prefix as string) ||
          generateCodePrefix(schoolName)

        // Try inserting with code_prefix
        let { data: newSchool, error: insertError } = await db.from('schools').upsert(
          {
            auth_user_id: data.user.id,
            school_name: schoolName,
            email: email,
            code_prefix: codePrefix,
          },
          { onConflict: 'auth_user_id' }
        ).select().maybeSingle()

        // Fallback without code_prefix if column does not exist
        if (insertError && insertError.message?.includes('code_prefix')) {
          const fallback = await db.from('schools').upsert(
            {
              auth_user_id: data.user.id,
              school_name: schoolName,
              email: email,
            },
            { onConflict: 'auth_user_id' }
          ).select().maybeSingle()
          newSchool = fallback.data
        }

        if (newSchool?.id) {
          await db.from('exam_sessions').insert({
            school_id: newSchool.id,
            title: `${schoolName} Main Exam Hall`,
            room_number: 'Hall 1',
            status: 'active',
            started_at: new Date().toISOString(),
          })
        }
      }
    } catch (syncErr) {
      console.error('[loginAction] Safe notice during school sync:', syncErr)
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
  } catch (err: any) {
    if (err?.message === 'NEXT_REDIRECT' || err?.digest?.includes('NEXT_REDIRECT')) {
      throw err
    }

    console.error('[loginAction] Uncaught exception:', err)
    return {
      error: err?.message || 'An unexpected error occurred during login. Please try again.',
    }
  }
}

/**
 * Server Action — handles school account sign-up.
 * Saves school details in both Supabase Auth and public.schools table.
 */
export async function signUpAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  try {
    const schoolName = (formData.get('schoolName') as string | null)?.trim() ?? ''
    const email = (formData.get('email') as string | null)?.trim() ?? ''
    const codePrefixInput = (formData.get('codePrefix') as string | null)?.trim() ?? ''
    const password = (formData.get('password') as string | null) ?? ''
    const confirmPassword = (formData.get('confirmPassword') as string | null) ?? ''

    if (!schoolName) {
      return { error: 'Please enter the official school name or institution.' }
    }

    if (!email) {
      return { error: 'Please enter a valid school email address.' }
    }

    if (!password || password.length < 6) {
      return { error: 'Password must be at least 6 characters long.' }
    }

    if (password !== confirmPassword) {
      return { error: 'Passwords do not match.' }
    }

    const codePrefix = codePrefixInput
      ? codePrefixInput.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10)
      : generateCodePrefix(schoolName)

    const supabase = await createClient()
    const admin = createAdminClient()

    let userId: string | null = null
    let autoLoggedIn = false

    // 1. If admin client is available, create user with email_confirm: true directly
    if (admin) {
      const { data: adminCreated, error: adminErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          school_name: schoolName,
          code_prefix: codePrefix,
          role: 'admin',
        },
      })

      if (adminErr) {
        const msg = adminErr.message?.toLowerCase() ?? ''
        if (msg.includes('already registered') || msg.includes('already exists')) {
          return { error: 'An account with this email is already registered. Please sign in.' }
        }
        if (msg.includes('database error saving new user')) {
          return {
            error:
              'A PostgreSQL trigger on auth.users in Supabase is failing. Please run: DROP TRIGGER IF EXISTS on_school_auth_user_created ON auth.users; in your Supabase SQL Editor.',
          }
        }
        return { error: adminErr.message || 'Unable to register school account.' }
      }

      if (adminCreated?.user) {
        userId = adminCreated.user.id
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (!signInErr) {
          autoLoggedIn = true
        }
      }
    } else {
      // Standard Supabase client registration
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            school_name: schoolName,
            code_prefix: codePrefix,
            role: 'admin',
          },
        },
      })

      if (error) {
        const msg = error.message?.toLowerCase() ?? ''
        if (msg.includes('already registered')) {
          return { error: 'An account with this email is already registered. Please sign in.' }
        }
        if (msg.includes('database error saving new user')) {
          return {
            error:
              'A PostgreSQL trigger on auth.users in Supabase is failing. Please run this in your Supabase SQL Editor: DROP TRIGGER IF EXISTS on_school_auth_user_created ON auth.users;',
          }
        }
        return { error: error.message || 'Unable to register school account. Please try again.' }
      }

      if (data.user) {
        userId = data.user.id
        if (data.session) {
          autoLoggedIn = true
        } else {
          // Attempt automatic sign-in if email confirmation is not enforced
          const { error: autoSignErr } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          if (!autoSignErr) {
            autoLoggedIn = true
          }
        }
      }
    }

    if (!userId) {
      return { error: 'Registration could not be completed. Please try again.' }
    }

    // 2. Persist the school directly into public.schools
    try {
      const db = admin || supabase

      let { data: createdSchool, error: schoolErr } = await db.from('schools').upsert(
        {
          auth_user_id: userId,
          school_name: schoolName,
          email: email,
          code_prefix: codePrefix,
        },
        { onConflict: 'auth_user_id' }
      ).select().maybeSingle()

      if (schoolErr && schoolErr.message?.includes('code_prefix')) {
        const fallback = await db.from('schools').upsert(
          {
            auth_user_id: userId,
            school_name: schoolName,
            email: email,
          },
          { onConflict: 'auth_user_id' }
        ).select().maybeSingle()
        createdSchool = fallback.data
      }

      if (createdSchool?.id) {
        await db.from('exam_sessions').insert({
          school_id: createdSchool.id,
          title: `${schoolName} Active Exam Session`,
          room_number: 'Hall A',
          status: 'active',
          started_at: new Date().toISOString(),
        })
      }
    } catch (err) {
      console.error('[signUpAction] Safe notice during school creation:', err)
    }

    // 3. If session is established, redirect directly to Dashboard!
    if (autoLoggedIn) {
      revalidatePath('/', 'layout')
      redirect('/dashboard')
    }

    return {
      error: null,
      success:
        'Registration saved in Supabase! If email confirmation is required, please check your inbox or run: UPDATE auth.users SET email_confirmed_at = now(); in Supabase SQL Editor.',
    }
  } catch (err: any) {
    if (err?.message === 'NEXT_REDIRECT' || err?.digest?.includes('NEXT_REDIRECT')) {
      throw err
    }

    console.error('[signUpAction] Uncaught exception:', err)
    return {
      error: err?.message || 'An unexpected error occurred during signup. Please try again.',
    }
  }
}
