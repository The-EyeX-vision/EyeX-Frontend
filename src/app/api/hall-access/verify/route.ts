import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * POST /api/hall-access/verify
 * Examiner Hall Code Verification Endpoint.
 * Validates the 8-character hall access code and returns the classroom ID.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rawCode = body.code ? String(body.code).trim().toUpperCase() : ''

    if (!rawCode || rawCode.length < 6) {
      return NextResponse.json(
        { error: 'Please enter a valid 8-character Hall Access Code.' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const supabase = await createClient()
    const db = admin || supabase

    // 1. Look up in public.classrooms table
    let { data: classroom } = await db
      .from('classrooms')
      .select('id, name, school_id, access_code, code_expires_at')
      .eq('access_code', rawCode)
      .maybeSingle()

    // 2. If no classroom found, check if code matches an existing school's code_prefix or active session
    if (!classroom) {
      // Check if code matches school code_prefix (e.g. SCH_123 or SCH123)
      const sanitized = rawCode.replace(/[^A-Z0-9]/g, '')
      const { data: school } = await db
        .from('schools')
        .select('id, school_name, code_prefix')
        .or(`code_prefix.ilike.%${sanitized}%,code_prefix.ilike.%${rawCode}%`)
        .maybeSingle()

      if (school) {
        // Auto-provision a default Hall for this school if needed
        const { data: newHall } = await db
          .from('classrooms')
          .insert({
            school_id: school.id,
            name: `${school.school_name} - Main Hall`,
            access_code: rawCode.slice(0, 8),
          })
          .select('id, name, school_id, access_code, code_expires_at')
          .single()

        if (newHall) {
          classroom = newHall
        }
      }
    }

    if (!classroom) {
      return NextResponse.json(
        { error: 'Invalid Hall Access Code. Please verify with your School Administrator.' },
        { status: 404 }
      )
    }

    // Check expiration if set
    if (classroom.code_expires_at && new Date(classroom.code_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This Hall Access Code has expired. Please request a new code from the administrator.' },
        { status: 403 }
      )
    }

    // Prepare response with auth cookie for examiner
    const response = NextResponse.json({
      success: true,
      classroomId: classroom.id,
      hallName: classroom.name,
    })

    // Store verified classroom in cookie for seamless proctoring session access
    response.cookies.set('eyex_examiner_hall', classroom.id, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 12, // 12 hours
    })

    return response
  } catch (err: unknown) {
    console.error('[hall-access/verify] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal verification failure.' },
      { status: 500 }
    )
  }
}
