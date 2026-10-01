/**
 * GET /api/model/status
 *
 * Returns the current status of the CV model service.
 *
 * This endpoint is user-facing (called by the dashboard to show
 * model connection status). It proxies through to the model service
 * via the model service abstraction layer.
 *
 * When MODEL_SERVICE_URL is not set, returns a clear "unavailable" response
 * rather than faking success.
 */
import { NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth/api'
import { getModelStatus } from '@/lib/model/service'
import { errorResponse } from '@/lib/validation'

export async function GET() {
  // Dashboard users must be authenticated to check model status
  const auth = await authenticateUser()
  if (!auth.ok) {
    return NextResponse.json(errorResponse(auth.error), { status: auth.status })
  }

  const status = await getModelStatus()

  return NextResponse.json(
    {
      status: status.status,
      reachable: status.reachable,
      camera: status.camera ?? null,
      model: status.model ?? null,
      message: status.message ?? null,
      url_configured: status.url_configured,
    },
    {
      // 200 even if unavailable — the status field conveys the actual state.
      // Use 503 only if the response itself couldn't be constructed.
      status: 200,
    }
  )
}
