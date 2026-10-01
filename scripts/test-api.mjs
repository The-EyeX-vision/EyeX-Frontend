#!/usr/bin/env node
/**
 * EyeX API Test Script
 * 
 * Tests all API endpoints with realistic examples.
 * Run AFTER: npm run dev
 *
 * Usage:
 *   node scripts/test-api.mjs
 *
 * Prerequisites:
 * 1. npm run dev must be running
 * 2. You must be logged in at http://localhost:3000 in your browser (for cookie-based tests)
 *    OR set SESSION_COOKIE below from browser DevTools → Application → Cookies
 * 3. MODEL_API_KEY must be set in .env.local
 * 4. SUPABASE_SERVICE_ROLE_KEY must be set in .env.local
 *
 * For model detection tests, the script uses MODEL_API_KEY directly.
 * Set it here or in the shell: MODEL_API_KEY=your-key node scripts/test-api.mjs
 */

const BASE = 'http://localhost:3000'

// ── Configuration ────────────────────────────────────────────────
// Set these before running. Get cookie from browser DevTools.
const SESSION_COOKIE = process.env.SESSION_COOKIE ?? ''
const MODEL_API_KEY  = process.env.MODEL_API_KEY  ?? 'set-this-in-env'

let passCount = 0
let failCount = 0
let examId = ''
let sessionId = ''
let alertId = ''

// ── Helpers ──────────────────────────────────────────────────────
async function req(method, path, body, headers = {}) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(SESSION_COOKIE ? { Cookie: SESSION_COOKIE } : {}),
      ...headers,
    },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  let data
  try { data = await res.json() } catch { data = {} }
  return { status: res.status, data }
}

function pass(label) {
  console.log(`  ✅ ${label}`)
  passCount++
}

function fail(label, detail) {
  console.log(`  ❌ ${label}`)
  if (detail) console.log(`     → ${JSON.stringify(detail)}`)
  failCount++
}

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(50 - title.length)}`)
}

// ── Tests ────────────────────────────────────────────────────────

async function testExams() {
  section('EXAMS')

  // 1. Create exam with expected_students
  {
    const { status, data } = await req('POST', '/api/exams', {
      title: 'Test Mathematics Final',
      exam_date: '2026-11-01',
      start_time: '09:00',
      duration_minutes: 120,
      room_number: 'Hall A',
      expected_students: 45,
      description: 'API test exam',
    })
    if (status === 201 && data.exam?.id) {
      examId = data.exam.id
      pass(`POST /api/exams — created exam (id: ${examId.slice(0,8)}…)`)
    } else {
      fail('POST /api/exams', data)
    }
  }

  // 2. Retrieve exams list
  {
    const { status, data } = await req('GET', '/api/exams')
    if (status === 200 && Array.isArray(data.exams)) {
      pass(`GET /api/exams — returned ${data.exams.length} exam(s)`)
    } else {
      fail('GET /api/exams', data)
    }
  }

  // 3. Get single exam
  if (examId) {
    const { status, data } = await req('GET', `/api/exams/${examId}`)
    if (status === 200 && data.exam?.expected_students === 45) {
      pass('GET /api/exams/[id] — correct expected_students')
    } else {
      fail('GET /api/exams/[id]', data)
    }
  }

  // 4. Patch exam
  if (examId) {
    const { status, data } = await req('PATCH', `/api/exams/${examId}`, {
      expected_students: 50,
    })
    if (status === 200 && data.exam?.expected_students === 50) {
      pass('PATCH /api/exams/[id] — updated expected_students')
    } else {
      fail('PATCH /api/exams/[id]', data)
    }
  }

  // 5. Invalid expected_students
  {
    const { status } = await req('POST', '/api/exams', {
      title: 'Bad Exam',
      exam_date: '2026-11-01',
      start_time: '09:00',
      duration_minutes: 60,
      room_number: 'B1',
      expected_students: 0,
    })
    if (status === 400) {
      pass('POST /api/exams — rejects expected_students=0 with 400')
    } else {
      fail('POST /api/exams — should reject expected_students=0', { status })
    }
  }
}

async function testSessions() {
  section('SESSIONS')

  if (!examId) {
    console.log('  ⚠ Skipping — no exam created')
    return
  }

  // Create a monitoring session via Supabase directly would need admin,
  // so we test retrieval against an existing session if available.

  // 6. List alerts to find a session_id (indirect test)
  {
    const { status, data } = await req('GET', '/api/alerts?limit=1')
    if (status === 200) {
      if (data.alerts.length > 0) {
        sessionId = data.alerts[0].monitoring_session_id
        pass(`GET /api/alerts — found session_id: ${sessionId?.slice(0,8)}…`)
      } else {
        pass('GET /api/alerts — no alerts yet (ok for fresh DB)')
      }
    } else {
      fail('GET /api/alerts', data)
    }
  }

  // 7. Get session (if we have one)
  if (sessionId) {
    const { status, data } = await req('GET', `/api/sessions/${sessionId}`)
    if (status === 200 && data.session?.id) {
      pass(`GET /api/sessions/[id] — session status: ${data.session.status}`)
    } else {
      fail('GET /api/sessions/[id]', data)
    }
  }

  // 8. Try starting a non-existent session
  {
    const { status } = await req('POST', '/api/sessions/00000000-0000-0000-0000-000000000000/start')
    if (status === 404) {
      pass('POST /api/sessions/[id]/start — 404 for non-existent session')
    } else {
      fail('POST start — should be 404', { status })
    }
  }
}

async function testAlerts() {
  section('ALERTS')

  // 9. Get alerts
  {
    const { status, data } = await req('GET', '/api/alerts')
    if (status === 200) {
      pass(`GET /api/alerts — ${data.total ?? 0} total alerts`)
      if (data.alerts.length > 0) alertId = data.alerts[0].id
    } else {
      fail('GET /api/alerts', data)
    }
  }

  // 10. Filter by session
  if (sessionId) {
    const { status, data } = await req('GET', `/api/alerts?session_id=${sessionId}`)
    if (status === 200) {
      pass(`GET /api/alerts?session_id — ${data.alerts.length} alerts for session`)
    } else {
      fail('GET /api/alerts?session_id', data)
    }
  }

  // 11. Get single alert
  if (alertId) {
    const { status, data } = await req('GET', `/api/alerts/${alertId}`)
    if (status === 200 && data.alert?.id) {
      pass(`GET /api/alerts/[id] — event_type: ${data.alert.event_type}`)
    } else {
      fail('GET /api/alerts/[id]', data)
    }
  }

  // 12. Update alert status
  if (alertId) {
    const { status, data } = await req('PATCH', `/api/alerts/${alertId}`, { status: 'REVIEWED' })
    if (status === 200 && data.alert?.status === 'REVIEWED') {
      pass('PATCH /api/alerts/[id] — status updated to REVIEWED')
    } else {
      fail('PATCH /api/alerts/[id]', data)
    }
  }

  // 13. Invalid status value
  if (alertId) {
    const { status } = await req('PATCH', `/api/alerts/${alertId}`, { status: 'INVALID_STATUS' })
    if (status === 400) {
      pass('PATCH /api/alerts/[id] — rejects invalid status with 400')
    } else {
      fail('PATCH invalid status — should be 400', { status })
    }
  }
}

async function testModelDetections() {
  section('MODEL DETECTIONS — POST /api/model/detections')

  const modelHeaders = { Authorization: `Bearer ${MODEL_API_KEY}` }
  const targetSessionId = sessionId || '00000000-0000-0000-0000-000000000001'

  // 14. Submit a valid detection (will 404 if session not active — that's expected for test DB)
  {
    const { status, data } = await req(
      'POST', '/api/model/detections',
      {
        session_id: targetSessionId,
        tracker_id: 17,
        event_type: 'PHONE_DETECTED',
        confidence: 0.94,
        timestamp: new Date().toISOString(),
        metadata: { bbox: [100, 200, 150, 300], frame: 1024 },
      },
      modelHeaders
    )
    if (status === 201) {
      const newAlertId = data.alert?.id
      pass(`POST /api/model/detections — alert created (tracker_id: ${data.alert?.tracker_id})`)
      if (newAlertId) alertId = newAlertId
    } else if (status === 409) {
      pass('POST /api/model/detections — 409 (session not active, expected for test)')
    } else if (status === 404) {
      pass('POST /api/model/detections — 404 (session not found, expected for test)')
    } else {
      fail('POST /api/model/detections', data)
    }
  }

  // 15. Invalid confidence
  {
    const { status } = await req(
      'POST', '/api/model/detections',
      { session_id: targetSessionId, tracker_id: 5, event_type: 'PHONE_DETECTED', confidence: 1.5, timestamp: new Date().toISOString() },
      modelHeaders
    )
    if (status === 400) {
      pass('POST /api/model/detections — rejects confidence=1.5 with 400')
    } else {
      fail('Invalid confidence should be 400', { status })
    }
  }

  // 16. Invalid event_type
  {
    const { status } = await req(
      'POST', '/api/model/detections',
      { session_id: targetSessionId, tracker_id: 5, event_type: 'CHEAT_DETECTED', confidence: 0.9, timestamp: new Date().toISOString() },
      modelHeaders
    )
    if (status === 400) {
      pass('POST /api/model/detections — rejects unknown event_type with 400')
    } else {
      fail('Invalid event_type should be 400', { status })
    }
  }

  // 17. Missing tracker_id
  {
    const { status } = await req(
      'POST', '/api/model/detections',
      { session_id: targetSessionId, event_type: 'PHONE_DETECTED', confidence: 0.9, timestamp: new Date().toISOString() },
      modelHeaders
    )
    if (status === 400) {
      pass('POST /api/model/detections — rejects missing tracker_id with 400')
    } else {
      fail('Missing tracker_id should be 400', { status })
    }
  }

  // 18. Wrong API key
  {
    const { status } = await req(
      'POST', '/api/model/detections',
      { session_id: targetSessionId, tracker_id: 5, event_type: 'PHONE_DETECTED', confidence: 0.9, timestamp: new Date().toISOString() },
      { Authorization: 'Bearer wrong-key' }
    )
    if (status === 401) {
      pass('POST /api/model/detections — rejects wrong API key with 401')
    } else {
      fail('Wrong API key should be 401', { status })
    }
  }

  // 19. No auth header
  {
    const { status } = await req(
      'POST', '/api/model/detections',
      { session_id: targetSessionId, tracker_id: 5, event_type: 'PHONE_DETECTED', confidence: 0.9, timestamp: new Date().toISOString() }
    )
    if (status === 401 || status === 503) {
      pass('POST /api/model/detections — rejects missing auth header')
    } else {
      fail('No auth header should be 401 or 503', { status })
    }
  }

  // 20. Invalid session_id
  {
    const { status } = await req(
      'POST', '/api/model/detections',
      { session_id: '00000000-0000-0000-0000-000000000000', tracker_id: 5, event_type: 'PHONE_DETECTED', confidence: 0.9, timestamp: new Date().toISOString() },
      modelHeaders
    )
    if (status === 404) {
      pass('POST /api/model/detections — 404 for invalid session_id')
    } else {
      fail('Invalid session should be 404', { status })
    }
  }
}

async function testModelService() {
  section('MODEL SERVICE ENDPOINTS')

  // 21. Model health (unauthenticated)
  {
    const { status, data } = await req('GET', '/api/model/health')
    if (status === 200 || status === 503) {
      pass(`GET /api/model/health — healthy: ${data.healthy}, url_configured: ${data.url_configured}`)
    } else {
      fail('GET /api/model/health', data)
    }
  }

  // 22. Model status (authenticated)
  {
    const { status, data } = await req('GET', '/api/model/status')
    if (status === 200) {
      pass(`GET /api/model/status — status: "${data.status}", reachable: ${data.reachable}`)
    } else {
      fail('GET /api/model/status', data)
    }
  }

  // 23. Unauthorized model status
  {
    const { status } = await fetch(`${BASE}/api/model/status`).then(r => ({ status: r.status }))
    if (status === 401) {
      pass('GET /api/model/status — 401 without session')
    } else {
      fail('Model status without session should be 401', { status })
    }
  }
}

async function testUnauthorizedAccess() {
  section('UNAUTHORIZED ACCESS')

  // 24. No session — exams
  {
    const res = await fetch(`${BASE}/api/exams`)
    if (res.status === 401) {
      pass('GET /api/exams — 401 without session')
    } else {
      fail('Should be 401 without session', { status: res.status })
    }
  }

  // 25. No session — alerts
  {
    const res = await fetch(`${BASE}/api/alerts`)
    if (res.status === 401) {
      pass('GET /api/alerts — 401 without session')
    } else {
      fail('Should be 401 without session', { status: res.status })
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║           EyeX API Test Suite                        ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  console.log(`Base URL:       ${BASE}`)
  console.log(`SESSION_COOKIE: ${SESSION_COOKIE ? '✅ set' : '⚠ not set — auth tests will fail'}`)
  console.log(`MODEL_API_KEY:  ${MODEL_API_KEY !== 'set-this-in-env' ? '✅ set' : '⚠ not set'}`)

  try {
    await testUnauthorizedAccess()
    await testExams()
    await testSessions()
    await testAlerts()
    await testModelDetections()
    await testModelService()
  } catch (err) {
    console.error('\n⚠ Unexpected error:', err.message)
  }

  console.log('\n══════════════════════════════════════════════════════')
  console.log(`Results: ${passCount} passed, ${failCount} failed`)
  console.log('══════════════════════════════════════════════════════')
  process.exit(failCount > 0 ? 1 : 0)
}

main()
