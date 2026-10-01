/**
 * POST /api/model/start
 *
 * Gateway: request the CV model service to begin processing a session.
 *
 * REQUEST BODY:
 *   { "session_id": "uuid" }
 *
 * The model service URL is read from MODEL_SERVICE_URL (server-side only).
 * If the model service is not yet available, returns a clean 503 response.
 *
 * AUTHENTICATION:
 *   Standard user (cookie-based Supabase Auth). The user's school must
 *   own the session. The Next.js server then communicates with the model
 *   using MODEL_API_KEY — the user never sees or touches the model API key.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticateUser } from '@/lib/auth/api'
import { requireString, errorResponse } from '@/lib/validation'
import { startModelSession } from '@/lib/model/service'

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
  if (session.status !== 'active') {
    return NextResponse.json(
      errorResponse(`Session must be active before starting the model. Current status: "${session.status}".`),
      { status: 409 }
    )
  }

  const result = await startModelSession(sessionIdResult.value)

  return NextResponse.json(
    { session_id: sessionIdResult.value, model: result },
    { status: result.ok ? 200 : 503 }
  )
}
