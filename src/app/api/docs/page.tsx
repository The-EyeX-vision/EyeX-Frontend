'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { EyeXLogo } from '@/components/ui/EyeXLogo'
import { openApiSpec } from '@/lib/openapi-spec'

export default function SwaggerDocsPage() {
  const [SwaggerUI, setSwaggerUI] = useState<React.ComponentType<{ spec: object }> | null>(null)

  useEffect(() => {
    // Dynamically import swagger-ui-react only on client to avoid SSR issues
    import('swagger-ui-react').then((mod) => {
      setSwaggerUI(() => mod.default)
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-30 w-full bg-white border-b border-[#c4c5d7]"
        style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}
      >
        <div className="h-16 w-full px-4 sm:px-8 max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <EyeXLogo width={110} showTagline={false} />
            </Link>
            <span className="text-[#c4c5d7]">/</span>
            <span className="font-mono text-[12px] font-bold text-[#0037b0] bg-[#eff4ff] px-2.5 py-1 rounded-md border border-[#bbd6ff]">
              API v2.0 — Swagger UI
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/hall-access"
              className="text-[13px] text-[#434655] hover:text-[#0b1c30] transition-colors"
            >
              Examiner Flow →
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg bg-[#1d4ed8] hover:bg-[#0037b0] text-white text-[13px] font-semibold transition-colors shadow-sm"
            >
              School Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Swagger UI */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-6 py-6">
        {SwaggerUI ? (
          <>
            {/* Inject swagger-ui default styles */}
            {/* eslint-disable-next-line @next/next/no-css-tags */}
            <link
              rel="stylesheet"
              href="https://unpkg.com/swagger-ui-dist/swagger-ui.css"
            />
            <div className="swagger-wrapper rounded-xl overflow-hidden border border-[#e5eeff] shadow-sm">
              <SwaggerUI spec={openApiSpec as object} />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-8 h-8 border-2 border-[#1d4ed8] border-t-transparent rounded-full animate-spin" />
            <p className="text-[14px] text-[#434655]">Loading Swagger UI…</p>
          </div>
        )}
      </main>

      <style>{`
        .swagger-wrapper .swagger-ui .topbar { display: none; }
        .swagger-wrapper .swagger-ui .info { padding: 24px 20px 12px; }
        .swagger-wrapper .swagger-ui .info .title { font-size: 22px; }
        .swagger-wrapper .swagger-ui { background: #f8f9ff; }
        .swagger-wrapper .swagger-ui .opblock-tag { font-size: 15px; font-weight: 700; }
        .swagger-wrapper .swagger-ui .opblock { border-radius: 10px; margin-bottom: 8px; }
        .swagger-wrapper .swagger-ui .btn.execute { background-color: #1d4ed8; border-color: #1d4ed8; }
        .swagger-wrapper .swagger-ui .btn.execute:hover { background-color: #0037b0; }
      `}</style>
    </div>
  )
}
