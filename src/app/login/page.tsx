'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { EyeXLogo } from '@/components/ui/EyeXLogo'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        setError(authError.message)
        setIsLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f9ff] flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="relative w-full max-w-[460px]">
        {/* Ambient blur glows */}
        <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-[#dce9ff] blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-44 h-44 rounded-full bg-[#bbd6ff] blur-2xl opacity-40 pointer-events-none" />

        {/* Logo + back to home */}
        <div className="flex flex-col items-center mb-6 relative z-10">
          <Link href="/" className="mb-4">
            <EyeXLogo width={140} showTagline />
          </Link>
        </div>

        {/* Login Card */}
        <div className="relative w-full bg-white rounded-2xl shadow-xl p-6 sm:p-8 z-10">
          {/* Card header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#1d4ed8] shadow-sm mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span className="font-code-sm text-[11px] uppercase tracking-widest text-[#466083] font-semibold mb-1">
              MINESEC · GCE BOARD CAMEROON
            </span>
            <h1 className="font-headline-lg text-[#0b1c30] tracking-tight">School Administration Login</h1>
            <p className="text-[14px] text-[#434655] mt-1.5 leading-relaxed max-w-[320px]">
              Sign in to access your examination centre dashboard, schedule sessions, and inspect evidence.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 flex items-start gap-2.5 p-3 bg-[#fef2f2] border border-[#fecaca] rounded-lg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-[#b91c1c] mt-0.5 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-[13px] text-[#b91c1c]">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="email" className="text-[13px] font-medium text-[#0b1c30]">School Administrator Email</label>
                <span className="font-code-sm text-[10px] text-[#466083] uppercase tracking-wider">OFFICIAL ID</span>
              </div>
              <div className="relative flex items-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="absolute left-3 w-4 h-4 text-[#747686] pointer-events-none">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. principal@gbhsyaounde.cm"
                  className="w-full pl-10 pr-3 py-2.5 bg-[#eff4ff] rounded-lg text-[14px] text-[#0b1c30] placeholder:text-[#747686] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-[13px] font-medium text-[#0b1c30]">Password</label>
                <Link href="/forgot-password" className="text-[13px] text-[#1d4ed8] hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative flex items-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="absolute left-3 w-4 h-4 text-[#747686] pointer-events-none">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#eff4ff] rounded-lg text-[14px] text-[#0b1c30] placeholder:text-[#747686] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 p-1 text-[#747686] hover:text-[#0b1c30] transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#1d4ed8] hover:bg-[#0037b0] disabled:opacity-70 disabled:cursor-not-allowed text-white py-3 rounded-lg text-[14px] font-semibold tracking-wide shadow-md transition-all flex items-center justify-center gap-2 group"
              >
                {isLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Verifying Credentials...
                  </>
                ) : (
                  <>
                    Sign In to Dashboard
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 group-hover:translate-x-0.5 transition-transform">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer inside card */}
          <div className="mt-5 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 px-6 sm:px-8 py-4 bg-[#eff4ff] rounded-b-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-[#1d4ed8] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1d4ed8]" />
              </span>
              <span className="font-code-sm text-[10px] text-[#434655] uppercase tracking-wider">Server: Online</span>
            </div>
            <div className="flex items-center gap-1.5 font-code-sm text-[10px] text-[#466083]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              TLS 1.3 SECURE
            </div>
          </div>
        </div>

        {/* Invigilator CTA card */}
        <div className="mt-4 w-full bg-white border border-[#e5eeff] rounded-xl p-4 shadow-sm relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#1d4ed8] shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#0b1c30]">Are you an Invigilator supervising an active hall?</p>
                <p className="text-[12px] text-[#747686]">Instant session verification — no password required</p>
              </div>
            </div>
            <Link
              href="/hall-access"
              className="inline-flex items-center justify-center gap-1.5 font-medium text-[13px] text-[#1d4ed8] hover:text-white hover:bg-[#1d4ed8] px-3 py-2 rounded-lg bg-[#eff4ff] transition-all whitespace-nowrap"
            >
              Enter 8-Character Hall Code
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Security note */}
        <div className="mt-4 flex items-start gap-2.5 px-2 relative z-10">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4 text-[#466083] mt-0.5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <p className="text-[12px] text-[#747686] leading-relaxed">
            Secured with SHA-256 session encryption. Monitored under Republic of Cameroon MINESEC digital standards.{' '}
            <Link href="/signup" className="text-[#1d4ed8] hover:underline font-medium">Register your institution →</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
