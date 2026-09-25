import { createClient } from '@supabase/supabase-js'

/**
 * Supabase Admin Client.
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass Row-Level Security (RLS).
 * MUST only be called on the server, never exposed to the browser.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
