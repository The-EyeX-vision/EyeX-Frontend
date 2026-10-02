'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { EyeIcon } from '@/components/ui/Icons'

export default function HallAccessPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const cleanCode = code.trim().toUpperCase()

    if (!cleanCode) {
      setError('Please enter your 8-character Hall Access Code.')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/hall-access/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid or expired Hall Access Code.')
        setIsLoading(false)
        return
      }

      // Route directly to the examiner workspace for this hall
      router.push(`/hall/${data.classroomId}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error during verification.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 selection:bg-teal-900 selection:text-teal-100">
      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-lg p-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0e5a4d] text-white text-base font-bold shadow-sm">
            <EyeIcon className="w-5 h-5 text-white" />
          </span>
          <span className="text-base font-bold tracking-tight text-white">The Eye X</span>
        </Link>
        <Link
          href="/login"
          className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors min-h-[44px] flex items-center px-3 rounded-lg border border-gray-800 hover:border-gray-700 bg-gray-900/60"
        >
          School Admin Login &rarr;
        </Link>
      </header>

      {/* Main Focus Area */}
      <main className="w-full max-w-md mx-auto my-auto py-8">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-400">
              Invigilator Terminal
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Hall Access Code
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-400 leading-relaxed">
            Enter the 8-character terminal code provided by your School Administrator to unlock live hall proctoring.
          </p>

          <form onSubmit={handleVerify} className="mt-6 space-y-4">
            <div>
              <label htmlFor="hall-code" className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Access Code
              </label>
              <input
                id="hall-code"
                type="text"
                autoComplete="off"
                spellCheck="false"
                maxLength={12}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase())
                  if (error) setError(null)
                }}
                placeholder="e.g. 7K4P92XM"
                className="w-full text-center font-mono text-xl sm:text-2xl font-bold tracking-widest px-4 py-3.5 rounded-xl border border-gray-700 bg-gray-950 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all min-h-[52px]"
                disabled={isLoading}
                autoFocus
              />
            </div>

            {error && (
              <div role="alert" className="p-3 rounded-lg border border-red-800 bg-red-950/60 text-red-200 text-xs flex items-start gap-2 animate-in fade-in">
                <span className="text-red-400 font-bold">✕</span>
                <span className="flex-1">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !code.trim()}
              className="w-full mt-2 min-h-[48px] rounded-xl bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-sm font-semibold py-3 px-4 transition-all shadow-md hover:shadow-teal-950/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying Terminal Code…
                </>
              ) : (
                'Unlock Hall Workspace →'
              )}
            </button>
          </form>

          {/* Quick Notice */}
          <div className="mt-6 pt-5 border-t border-gray-800/80 text-[11px] text-gray-500 space-y-1">
            <p>• Zero registration required for examiners.</p>
            <p>• Access expires automatically after examination window.</p>
            <p>• Need a code? Contact your Chief Invigilator or School Admin.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto py-4 text-center text-xs text-gray-500">
        The Eye X • Institutional Examination Supervision &amp; Proctoring Standard
      </footer>
    </div>
  )
}
