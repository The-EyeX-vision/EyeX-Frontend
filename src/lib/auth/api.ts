/**
 * src/lib/auth/api.ts
 *
 * Shared authentication helpers for API route handlers.
 *
 * Two authentication paths exist:
 *
 * 1. authenticateUser()  — standard Supabase Auth (cookie-based)
 *    Used by all user-facing endpoints: /api/exams, /api/sessions, /api/alerts
 *    Returns the authenticated user's school record.
 *
 * 2. authenticateModelRequest()  — server-side API key
 *    Used by model-facing endpoints: /api/model/detections
 *    The key is read from MODEL_API_KEY (server-side only, never NEXT_PUBLIC_*).
 *    The model must send:  Authorization: Bearer <MODEL_API_KEY>
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export interface AuthenticatedSchool {
  id: string
  school_name: string
  auth_user_id: string
}

export type AuthResult =
  | { ok: true; school: AuthenticatedSchool }
  | { ok: false; status: 401 | 403; error: string }

/**
 * Authenticate a standard user request via Supabase session cookies.
 * Returns the school record associated with the authenticated user.
 */
export async function authenticateUser(): Promise<AuthResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ok: false, status: 401, error: 'Authentication required.' }
  }

  const { data: school, error: schoolError } = await supabase
    .from('schools')
    .select('id, school_name, auth_user_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (schoolError || !school) {
    return {
      ok: false,
      status: 403,
      error: 'No school record associated with this account.',
    }
  }

  return { ok: true, school }
}

/**
 * Authenticate a model service request via a static API key.
 *
 * The model must include:
 *   Authorization: Bearer <MODEL_API_KEY>
 *
 * MODEL_API_KEY is configured in .env.local (server-side only).
 * If MODEL_API_KEY is not configured, model auth is disabled and returns 503.
 */
export type ModelAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string }

export function authenticateModelRequest(request: NextRequest): ModelAuthResult {
  const modelApiKey = process.env.MODEL_API_KEY

  if (!modelApiKey) {
    return {
      ok: false,
      status: 503,
      error:
        'Model API key not configured on the server. Set MODEL_API_KEY in environment variables.',
    }
  }

  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      ok: false,
      status: 401,
      error: 'Missing or invalid Authorization header. Expected: Bearer <MODEL_API_KEY>',
    }
  }

  const providedKey = authHeader.slice(7) // Remove "Bearer "
  if (providedKey !== modelApiKey) {
    return { ok: false, status: 401, error: 'Invalid model API key.' }
  }

  return { ok: true }
}
