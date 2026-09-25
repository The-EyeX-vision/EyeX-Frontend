'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { loginAction, type LoginState } from '@/app/actions/auth'

const initial: LoginState = { error: null }

// ── Icons ──────────────────────────────────────────────────────────────────
function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-slate-400" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-slate-400" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  )
}

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, initial)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-[#fafbfc] text-slate-800 font-sans antialiased">
      {/* ── Minimalist Top Nav ── */}
      <header className="px-6 py-3.5 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0e5a4d] text-white text-xs font-bold shadow-sm">
              👁
            </span>
            <span className="font-bold text-slate-900 tracking-tight text-sm">The Eye X</span>
            <span className="text-[11px] text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full font-medium ml-1">
              Terminal Sign In
            </span>
          </Link>

          <Link
            href="/signup"
            className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Register School &rarr;
          </Link>
        </div>
      </header>

      {/* ── Main Login Card ── */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-8">
            <div className="text-center mb-6">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200/80 rounded-full px-3 py-0.5 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                Institutional Station Access
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                School Account Sign In
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                Enter your authorized school credentials for active exam hall monitoring.
              </p>
            </div>

            <form action={formAction} className="space-y-4">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  School Email or Authorized ID
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <MailIcon />
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="exam-officer@school.cm"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0e5a4d]/30 focus:border-[#0e5a4d] transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <LockIcon />
                  </span>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0e5a4d]/30 focus:border-[#0e5a4d] transition-colors"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {state.error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 leading-relaxed"
                >
                  <p className="font-semibold mb-0.5">Authentication Notice</p>
                  <p>{state.error}</p>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#0e5a4d] hover:bg-[#0b483d] active:bg-[#08362e] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold py-2.5 px-4 transition-colors shadow-sm"
              >
                {isPending ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In to Hall Session
                    <ArrowRightIcon />
                  </>
                )}
              </button>

              {/* Registration Link */}
              <div className="pt-2 text-center text-xs text-slate-500">
                New examination center?{' '}
                <Link
                  href="/signup"
                  className="font-semibold text-[#0e5a4d] hover:underline"
                >
                  Register your school station
                </Link>
              </div>
            </form>
          </div>

          {/* Security note footer */}
          <div className="mt-4 text-center text-[11px] text-slate-400 flex items-center justify-center gap-2">
            <span>🔒 256-bit Encrypted</span>
            <span>•</span>
            <span>Row-Level Security (RLS) Active</span>
            <span>•</span>
            <span>4-Hour Proctor Tokens</span>
          </div>
        </div>
      </main>
    </div>
  )
}
