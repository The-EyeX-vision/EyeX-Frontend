/**
 * src/lib/model/service.ts
 *
 * Model Service Abstraction Layer.
 *
 * This module is the ONLY place that communicates with the external CV model service.
 * All route handlers must call through this module — never make raw fetch() calls
 * to the model service from route.ts files.
 *
 * Configuration:
 *   MODEL_SERVICE_URL=http://... (set in .env.local — server-side only)
 *
 * Current state: Model service is NOT yet available.
 * When the model team deploys their service, set MODEL_SERVICE_URL and the methods
 * below will automatically begin communicating with it.
 *
 * The frontend uses GET /api/model/status and GET /api/model/health to check
 * whether the model service is reachable before attempting to use it.
 */

export interface ModelServiceStatus {
  reachable: boolean
  status: 'running' | 'unavailable' | 'unknown'
  camera?: string
  model?: string
  message?: string
  url_configured: boolean
}

export interface ModelStartResult {
  ok: boolean
  message: string
}

export interface ModelStopResult {
  ok: boolean
  message: string
}

/**
 * Returns the configured model service URL.
 * Returns null if MODEL_SERVICE_URL is not set.
 */
function getModelUrl(): string | null {
  return process.env.MODEL_SERVICE_URL ?? null
}

/**
 * Fetch the model service status.
 * If MODEL_SERVICE_URL is not configured, returns an 'unavailable' status.
 * If the service is unreachable, returns 'unavailable' with an error message.
 */
export async function getModelStatus(): Promise<ModelServiceStatus> {
  const url = getModelUrl()

  if (!url) {
    return {
      reachable: false,
      status: 'unavailable',
      message: 'MODEL_SERVICE_URL is not configured. Set it in .env.local to connect to the CV model.',
      url_configured: false,
    }
  }

  try {
    const response = await fetch(`${url}/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // Short timeout — don't block the user long if model is down
      signal: AbortSignal.timeout(3000),
    })

    if (!response.ok) {
      return {
        reachable: true,
        status: 'unknown',
        message: `Model service responded with HTTP ${response.status}`,
        url_configured: true,
      }
    }

    const data = await response.json()
    return {
      reachable: true,
      status: data.status ?? 'unknown',
      camera: data.camera,
      model: data.model,
      message: data.message,
      url_configured: true,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return {
      reachable: false,
      status: 'unavailable',
      message: `Cannot reach model service at ${url}: ${message}`,
      url_configured: true,
    }
  }
}

/**
 * Check whether the model service responds to a health probe.
 */
export async function checkModelHealth(): Promise<{ healthy: boolean; message: string; url_configured: boolean }> {
  const url = getModelUrl()

  if (!url) {
    return {
      healthy: false,
      message: 'MODEL_SERVICE_URL is not configured.',
      url_configured: false,
    }
  }

  try {
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    })
    return {
      healthy: response.ok,
      message: response.ok ? 'Model service is healthy.' : `HTTP ${response.status}`,
      url_configured: true,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return {
      healthy: false,
      message: `Health check failed: ${message}`,
      url_configured: true,
    }
  }
}

/**
 * Request the model service to start processing a monitoring session.
 *
 * TODO: When the model team defines the start API contract, implement the fetch here.
 * The model API key is read from MODEL_API_KEY (server-side only).
 */
export async function startModelSession(sessionId: string): Promise<ModelStartResult> {
  const url = getModelUrl()

  if (!url) {
    return {
      ok: false,
      message: 'MODEL_SERVICE_URL is not configured. Model session not started.',
    }
  }

  const apiKey = process.env.MODEL_API_KEY

  try {
    const response = await fetch(`${url}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ session_id: sessionId }),
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      return { ok: false, message: `Model service responded with HTTP ${response.status}` }
    }

    return { ok: true, message: 'Model session started.' }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, message: `Failed to start model session: ${message}` }
  }
}

/**
 * Request the model service to stop processing a monitoring session.
 */
export async function stopModelSession(sessionId: string): Promise<ModelStopResult> {
  const url = getModelUrl()

  if (!url) {
    return {
      ok: false,
      message: 'MODEL_SERVICE_URL is not configured. Model session not stopped.',
    }
  }

  const apiKey = process.env.MODEL_API_KEY

  try {
    const response = await fetch(`${url}/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ session_id: sessionId }),
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      return { ok: false, message: `Model service responded with HTTP ${response.status}` }
    }

    return { ok: true, message: 'Model session stopped.' }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, message: `Failed to stop model session: ${message}` }
  }
}
