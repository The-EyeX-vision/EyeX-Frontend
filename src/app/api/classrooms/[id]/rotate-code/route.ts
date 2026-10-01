import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // exclude ambiguous chars like 0, O, 1, I
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * POST /api/classrooms/[id]/rotate-code
 * Generates and updates a fresh 8-character access code for the hall.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const admin = createAdminClient()
    const supabase = await createClient()
    const db = admin || supabase

    const newCode = generateAccessCode()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

    const { data: updated, error } = await db
      .from('classrooms')
      .update({
        access_code: newCode,
        code_expires_at: expiresAt,
      })
      .eq('id', id)
      .select('id, name, access_code, code_expires_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      access_code: updated.access_code,
      code_expires_at: updated.code_expires_at,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to rotate code.' },
      { status: 500 }
    )
  }
}
