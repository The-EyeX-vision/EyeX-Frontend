/**
 * src/lib/validation/index.ts
 *
 * Lightweight, zero-dependency validation helpers used by all API route handlers.
 * Returns a typed { ok, error } result rather than throwing, so routes stay clean.
 */

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

/** Assert a value is a non-empty string */
export function requireString(val: unknown, field: string): ValidationResult<string> {
  if (typeof val !== 'string' || val.trim() === '') {
    return { ok: false, error: `${field} is required and must be a non-empty string.` }
  }
  return { ok: true, value: val.trim() }
}

/** Assert a value is a positive integer */
export function requirePositiveInt(val: unknown, field: string): ValidationResult<number> {
  const n = Number(val)
  if (!Number.isInteger(n) || n < 1) {
    return { ok: false, error: `${field} must be a positive integer.` }
  }
  return { ok: true, value: n }
}

/** Assert a value is a number in [min, max] */
export function requireNumberInRange(
  val: unknown,
  field: string,
  min: number,
  max: number
): ValidationResult<number> {
  const n = Number(val)
  if (isNaN(n) || n < min || n > max) {
    return { ok: false, error: `${field} must be a number between ${min} and ${max}.` }
  }
  return { ok: true, value: n }
}

/** Assert a value is one of the allowed enum values */
export function requireEnum<T extends string>(
  val: unknown,
  field: string,
  allowed: readonly T[]
): ValidationResult<T> {
  if (!allowed.includes(val as T)) {
    return {
      ok: false,
      error: `${field} must be one of: ${allowed.join(', ')}. Got: "${val}".`,
    }
  }
  return { ok: true, value: val as T }
}

/** Assert a value is a valid ISO 8601 date string */
export function requireISODate(val: unknown, field: string): ValidationResult<string> {
  if (typeof val !== 'string') {
    return { ok: false, error: `${field} must be an ISO 8601 date string.` }
  }
  const d = new Date(val)
  if (isNaN(d.getTime())) {
    return { ok: false, error: `${field} is not a valid ISO 8601 date: "${val}".` }
  }
  return { ok: true, value: val }
}

/** Assert a value is a valid UUID v4 */
export function requireUUID(val: unknown, field: string): ValidationResult<string> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (typeof val !== 'string' || !uuidRegex.test(val)) {
    return { ok: false, error: `${field} must be a valid UUID.` }
  }
  return { ok: true, value: val }
}

/** Standard JSON error response shape */
export function errorResponse(message: string, details?: unknown) {
  return { error: message, ...(details !== undefined ? { details } : {}) }
}

/** Generate an 8-character uppercase alphanumeric hall access code (e.g. 7K4P92XM) */
export function generateHallAccessCode(length = 8): string {
  // Exclude ambiguous characters (0, O, 1, I)
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/** Safely parse Request body as JSON with helpful diagnostic messages and form fallback */
export async function parseJsonBody<T = Record<string, unknown>>(
  request: Request
): Promise<{ ok: true; data: T } | { ok: false; error: string; details?: string }> {
  try {
    const contentType = request.headers.get('content-type') || ''
    if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const formData = await request.formData()
      const data: Record<string, unknown> = {}
      formData.forEach((value, key) => {
        data[key] = value
      })
      return { ok: true, data: data as T }
    }

    const text = await request.text()
    if (!text || text.trim() === '') {
      return {
        ok: false,
        error: 'Request body is empty.',
        details:
          'Please provide a JSON payload in the request body (e.g., {"school_name":"...","email":"...","password":"..."}).',
      }
    }

    try {
      const data = JSON.parse(text)
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return {
          ok: false,
          error: 'Request body must be a JSON object.',
          details: `Expected a JSON object (e.g. { ... }), received ${
            Array.isArray(data) ? 'array' : typeof data
          }.`,
        }
      }
      return { ok: true, data: data as T }
    } catch (parseErr: unknown) {
      return {
        ok: false,
        error: 'Request body must be valid JSON.',
        details: parseErr instanceof Error ? parseErr.message : 'Invalid JSON syntax.',
      }
    }
  } catch (err: unknown) {
    return {
      ok: false,
      error: 'Failed to read request body.',
      details: err instanceof Error ? err.message : String(err),
    }
  }
}

