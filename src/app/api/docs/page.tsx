'use client'

import { useState } from 'react'
import Link from 'next/link'

interface EndpointSpec {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  title: string
  description: string
  requestExample?: Record<string, unknown>
  responseExample?: unknown
}

const ENDPOINTS: EndpointSpec[] = [
  {
    method: 'POST',
    path: '/api/hall-access/verify',
    title: 'Verify Hall Access Code',
    description: 'Verifies an 8-character access code for an examiner, returning the classroom ID and setting a temporary session token.',
    requestExample: {
      code: '7K4P92XM',
    },
    responseExample: {
      success: true,
      classroomId: 'c4e3b120-7f9a-4c22-b0a5-8123456789ab',
      hallName: 'Main Hall A',
    },
  },
  {
    method: 'POST',
    path: '/api/sessions',
    title: 'Initialize Examination Session',
    description: 'Creates or schedules a new examination session for a specific hall.',
    requestExample: {
      classroomId: 'c4e3b120-7f9a-4c22-b0a5-8123456789ab',
      courseName: 'Pure Mathematics Paper II',
      courseCode: 'MATH-402',
      durationMinutes: 120,
      expectedStudents: 30,
      startImmediately: true,
    },
    responseExample: {
      success: true,
      session: {
        id: '992a8310-8812-42fe-9123-bc9281938210',
        status: 'ACTIVE',
        started_at: '2026-10-01T14:30:00.000Z',
      },
    },
  },
  {
    method: 'POST',
    path: '/api/sessions/{id}/end',
    title: 'End Examination Session',
    description: 'Concludes an active examination session, finalizing all incident records and marking the test COMPLETED.',
    responseExample: {
      success: true,
      session: {
        status: 'COMPLETED',
        ended_at: '2026-10-01T16:30:00.000Z',
      },
    },
  },
  {
    method: 'POST',
    path: '/api/violations',
    title: 'Ingest Real-Time Violation',
    description: 'Endpoint called by Computer Vision models and edge hardware to broadcast detected candidate anomalies.',
    requestExample: {
      sessionId: '992a8310-8812-42fe-9123-bc9281938210',
      trackerLabel: 'Tracker #4',
      trackerId: 4,
      activityType: 'PHONE_DETECTED',
      severity: 'HIGH',
      confidence: 0.94,
      evidenceUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600',
      metadata: { desk_quadrant: 'B-12' },
    },
    responseExample: {
      success: true,
      violation: {
        id: 'v7721832-1100-4bce-9221-aab123456789',
        status: 'FLAGGED',
      },
    },
  },
  {
    method: 'POST',
    path: '/api/classrooms/{id}/cameras',
    title: 'Attach Camera to Hall',
    description: 'Registers an overhead or peripheral camera feed to an examination hall.',
    requestExample: {
      name: 'Camera 2 (Overhead Wide)',
      cameraNumber: 2,
      status: 'ACTIVE',
    },
    responseExample: {
      success: true,
      camera: {
        id: 'cam-91283',
        camera_number: 2,
        status: 'ACTIVE',
      },
    },
  },
  {
    method: 'POST',
    path: '/api/classrooms/{id}/rotate-code',
    title: 'Rotate Hall Access Code',
    description: 'Generates a fresh 8-character access code for an examination hall, invalidating previous codes.',
    responseExample: {
      success: true,
      access_code: '3N8P4Z9X',
      code_expires_at: '2026-10-08T12:00:00.000Z',
    },
  },
  {
    method: 'GET',
    path: '/api/violations',
    title: 'Query Violations Ledger',
    description: 'Fetches recent behavioral violations and snapshot evidence, filterable by session ID.',
    responseExample: [
      {
        id: 'v1',
        tracker_label: 'Tracker #2',
        activity_type: 'PHONE_DETECTED',
        severity: 'HIGH',
        confidence: 0.91,
      },
    ],
  },
]

export default function ApiDocsPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointSpec>(ENDPOINTS[0])
  const [testResponse, setTestResponse] = useState<string | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  async function handleTestCall() {
    setIsTesting(true)
    setTestResponse(null)

    try {
      if (selectedEndpoint.method === 'GET') {
        const res = await fetch(selectedEndpoint.path)
        const data = await res.json()
        setTestResponse(JSON.stringify(data, null, 2))
      } else {
        // Run verification test if path is hall-access/verify
        const testPayload = selectedEndpoint.requestExample || {}
        const res = await fetch(selectedEndpoint.path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testPayload),
        })
        const data = await res.json()
        setTestResponse(JSON.stringify(data, null, 2))
      }
    } catch (err: unknown) {
      setTestResponse(JSON.stringify({ error: err instanceof Error ? err.message : 'Network error' }, null, 2))
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col selection:bg-teal-900 selection:text-teal-100">
      {/* ── Top Header ── */}
      <header className="border-b border-gray-800 bg-gray-900/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0e5a4d] text-white text-xs font-bold">
              👁
            </span>
            <span className="font-bold text-white tracking-tight text-sm">The Eye X</span>
          </Link>
          <span className="text-gray-700">/</span>
          <span className="text-xs font-mono font-bold text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-800">
            OpenAPI / Swagger Docs v2.0
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/hall-access"
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Examiner Flow &rarr;
          </Link>
          <Link
            href="/dashboard"
            className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-xs font-semibold transition-colors flex items-center gap-1"
          >
            School Portal
          </Link>
        </div>
      </header>

      {/* ── Main Docs Container ── */}
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Endpoint Selector Navigation (4 cols) */}
        <div className="lg:col-span-4 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
            Core Backend Endpoints
          </h2>
          <div className="space-y-1.5">
            {ENDPOINTS.map((ep) => {
              const isSelected = selectedEndpoint.path === ep.path && selectedEndpoint.method === ep.method
              return (
                <button
                  key={`${ep.method}-${ep.path}`}
                  onClick={() => {
                    setSelectedEndpoint(ep)
                    setTestResponse(null)
                  }}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-start gap-2.5 cursor-pointer ${
                    isSelected
                      ? 'border-teal-700 bg-teal-950/40 text-white shadow-sm'
                      : 'border-gray-800 bg-gray-900/60 text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                  }`}
                >
                  <span
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      ep.method === 'POST' ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-white">{ep.title}</p>
                    <p className="font-mono text-[10px] text-gray-500 truncate mt-0.5">{ep.path}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Endpoint Detail & Interactive Sandbox (8 cols) */}
        <div className="lg:col-span-8 rounded-2xl border border-gray-800 bg-gray-900/60 p-6 space-y-6 shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                  selectedEndpoint.method === 'POST'
                    ? 'bg-blue-950 text-blue-300 border border-blue-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                {selectedEndpoint.method}
              </span>
              <span className="font-mono text-xs text-teal-300 bg-gray-950 px-2.5 py-1 rounded border border-gray-800">
                {selectedEndpoint.path}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white">{selectedEndpoint.title}</h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 leading-relaxed">
              {selectedEndpoint.description}
            </p>
          </div>

          {/* Request Payload Example */}
          {selectedEndpoint.requestExample && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                Request JSON Body
              </h3>
              <pre className="p-4 rounded-xl bg-gray-950 border border-gray-800 text-teal-300 font-mono text-xs overflow-x-auto">
                {JSON.stringify(selectedEndpoint.requestExample, null, 2)}
              </pre>
            </div>
          )}

          {/* Expected Response */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
              Expected Response
            </h3>
            <pre className="p-4 rounded-xl bg-gray-950 border border-gray-800 text-gray-300 font-mono text-xs overflow-x-auto">
              {JSON.stringify(selectedEndpoint.responseExample, null, 2)}
            </pre>
          </div>

          {/* Interactive Test Sandbox Button */}
          <div className="pt-4 border-t border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                Live Interactive Sandbox
              </h3>
              <button
                type="button"
                onClick={handleTestCall}
                disabled={isTesting}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {isTesting ? 'Sending Request…' : 'Execute Test Call 🚀'}
              </button>
            </div>

            {testResponse && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-teal-400">Live API Response:</span>
                <pre className="p-4 rounded-xl bg-gray-950 border border-teal-900/60 text-emerald-300 font-mono text-xs overflow-x-auto">
                  {testResponse}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
