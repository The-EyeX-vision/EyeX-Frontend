import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

const decisions = ['CONFIRM', 'DISMISS', 'ESCALATE'] as const
type ReviewDecision = (typeof decisions)[number]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const hallSessionId = typeof body.hallSessionId === 'string' ? body.hallSessionId : ''
    const decision = body.decision as ReviewDecision
    const note = typeof body.note === 'string' ? body.note.trim() : ''

    if (!hallSessionId || !decisions.includes(decision)) {
      return NextResponse.json({ error: 'Hall session and valid decision are required.' }, { status: 400 })
    }

    if (note.length > 2000) {
      return NextResponse.json({ error: 'Review note must be 2000 characters or fewer.' }, { status: 400 })
    }
    if (decision === 'ESCALATE' && !note) {
      return NextResponse.json({ error: 'An escalation note is required.' }, { status: 400 })
    }

    const admin = createAdminClient()
    if (!admin) {
      return NextResponse.json({ error: 'Review service is not configured.' }, { status: 503 })
    }

    const { data, error } = await admin.rpc('review_violation', {
      p_violation_id: id,
      p_hall_session_id: hallSessionId,
      p_decision: decision,
      p_note: note || null,
    })

    if (error) {
      const notFound = error.message.includes('Violation not found')
      const sessionMismatch = error.message.includes('Hall session does not match')
      return NextResponse.json(
        { error: notFound ? 'Alert not found.' : sessionMismatch ? 'Alert does not belong to this hall session.' : 'Could not save the review decision.' },
        { status: notFound ? 404 : sessionMismatch ? 403 : 500 }
      )
    }

    return NextResponse.json({ success: true, violation: data }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Could not save the review decision.' }, { status: 400 })
  }
}