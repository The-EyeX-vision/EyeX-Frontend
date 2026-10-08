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
    // Accept either body.code or body.access_code and normalize
    const rawInput = body.code || body.access_code || ''
    const rawCode = String(rawInput).trim().toUpperCase().replace(/[\s-]/g, '')

    if (!rawCode || rawCode.length < 4) {
      return NextResponse.json(
        { error: 'Please enter a valid 8-character Hall Access Code.' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const supabase = await createClient()
    const db = admin || supabase

    // 1. Look up in public.classrooms table (with graceful fallback if code_expires_at column is missing)
    let classroom: {
      id: string
      name: string
      school_id?: string
      access_code?: string
      code_expires_at?: string | null
    } | null = null

    const { data: cData, error: cErr } = await db
      .from('classrooms')
      .select('id, name, school_id, access_code, code_expires_at')
      .eq('access_code', rawCode)
      .maybeSingle()

    if (cErr && (cErr.message?.includes('code_expires_at') || cErr.code === '42703')) {
      const { data: fallbackData } = await db
        .from('classrooms')
        .select('id, name, school_id, access_code')
        .eq('access_code', rawCode)
        .maybeSingle()
      classroom = fallbackData
    } else {
      classroom = cData
    }

    // 2. If no direct classroom found, check if code matches an existing school's code_prefix
    if (!classroom) {
      try {
        const sanitized = rawCode.replace(/[^A-Z0-9]/g, '')
        const { data: school } = await db
          .from('schools')
          .select('id, school_name')
          .ilike('school_name', `%${sanitized}%`)
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
          .select('id, name, school_id, access_code')
          .single()

        if (newHall) {
          classroom = newHall
        }
      }
    } catch {
      // Ignored if school table or match fails
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
      classroom: {
        id: classroom.id,
        name: classroom.name,
        access_code: classroom.access_code,
      },
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
