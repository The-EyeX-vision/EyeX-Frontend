/**
 * POST /api/model/stop
 *
 * Gateway: request the CV model service to stop processing a session.
 *
 * REQUEST BODY:
 *   { "session_id": "uuid" }
 *
 * AUTHENTICATION:
 *   Standard user (cookie-based Supabase Auth). School must own the session.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticateUser } from '@/lib/auth/api'
import { requireString, errorResponse } from '@/lib/validation'
import { stopModelSession } from '@/lib/model/service'

export async function POST(request: NextRequest) {
  const auth = await authenticateUser()
  if (!auth.ok) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(errorResponse('Request body must be valid JSON.'), { status: 400 })
  }

  const b = body as Record<string, unknown>
  const sessionIdResult = requireString(b.session_id, 'session_id')
  if (!sessionIdResult.ok) {
    return NextResponse.json(errorResponse(sessionIdResult.error), { status: 400 })
  }

  const supabase = await createClient()

  // Verify session belongs to school
  const { data: session } = await supabase
    .from('monitoring_sessions')
    .select('id, status')
    .eq('id', sessionIdResult.value)
    .eq('school_id', auth.school.id)
    .maybeSingle()

  if (!session) {
    return NextResponse.json(errorResponse('Session not found.'), { status: 404 })
  }

  const result = await stopModelSession(sessionIdResult.value)

  return NextResponse.json(
    { session_id: sessionIdResult.value, model: result },
    { status: result.ok ? 200 : 503 }
  )
}
