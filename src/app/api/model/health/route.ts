/**
 * GET /api/model/health
 *
 * Simple health probe for the CV model service.
 * Returns whether the model service can be reached.
 *
 * This endpoint is unauthenticated — it is intended for
 * infrastructure monitoring, not user-facing data.
 */
import { NextResponse } from 'next/server'
import { checkModelHealth } from '@/lib/model/service'

export async function GET() {
  const health = await checkModelHealth()

  return NextResponse.json(
    {
      healthy: health.healthy,
      message: health.message,
      url_configured: health.url_configured,
    },
    { status: health.healthy ? 200 : 503 }
  )
}
