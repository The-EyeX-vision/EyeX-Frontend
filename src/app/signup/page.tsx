'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { signUpAction, type AuthState } from '@/app/actions/auth'
import { EyeXLogo } from '@/components/ui/EyeXLogo'

const initial: AuthState = { error: null, success: null }

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpAction, initial)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <main className="min-h-screen bg-[#f8f9ff] flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="relative w-full max-w-[500px]">
        {/* Ambient glows */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#dce9ff] blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-[#bbd6ff] blur-2xl opacity-40 pointer-events-none" />

        {/* Logo */}
        <div className="flex flex-col items-center mb-6 relative z-10">
          <Link href="/"><EyeXLogo width={140} showTagline /></Link>
        </div>

        {/* Card */}
        <div className="relative bg-white rounded-2xl shadow-xl p-6 sm:p-8 z-10">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#1d4ed8] shadow-sm mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
              </svg>
            </div>
            <span className="font-code-sm text-[11px] uppercase tracking-widest text-[#466083] font-semibold mb-1">
              INSTITUTION ONBOARDING · MINESEC
            </span>
            <h1 className="font-headline-lg text-[#0b1c30] tracking-tight">Register Your School</h1>
            <p className="text-[14px] text-[#434655] mt-1.5 leading-relaxed max-w-[340px]">
              Create an institutional EyeX account to manage examination halls, schedule sessions, and monitor malpractice.
            </p>
          </div>

          {/* Success state */}
          {state.success && (
            <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-start gap-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-[13px] font-semibold text-emerald-800">{state.success}</p>
                  <p className="text-[12px] text-emerald-700 mt-1">
                    Check your email to confirm your account, then{' '}
                    <Link href="/login" className="font-semibold underline">sign in here.</Link>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {state.error && (
            <div className="mb-4 flex items-start gap-2.5 p-3 bg-[#fef2f2] border border-[#fecaca] rounded-lg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-[#b91c1c] mt-0.5 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-[13px] text-[#b91c1c]">{state.error}</p>
            </div>
          )}

          <form action={formAction} className="flex flex-col gap-4">
            {/* School Name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="school_name" className="text-[13px] font-medium text-[#0b1c30]">Official School Name</label>
              <div className="relative flex items-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="absolute left-3 w-4 h-4 text-[#747686] pointer-events-none">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                </svg>
                <input
                  id="school_name"
                  name="school_name"
                  type="text"
                  required
                  placeholder="e.g. Government Bilingual High School Yaoundé"
                  className="w-full pl-10 pr-3 py-2.5 bg-[#eff4ff] rounded-lg text-[14px] text-[#0b1c30] placeholder:text-[#747686] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Station Code Prefix */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="code_prefix" className="text-[13px] font-medium text-[#0b1c30]">Station Code Prefix</label>
                <span className="font-code-sm text-[10px] text-[#466083] uppercase tracking-wider">e.g. GBHS, SCH</span>
              </div>
              <div className="relative flex items-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="absolute left-3 w-4 h-4 text-[#747686] pointer-events-none">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />
                </svg>
                <input
                  id="code_prefix"
                  name="code_prefix"
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. GBHS"
                  className="w-full pl-10 pr-3 py-2.5 bg-[#eff4ff] rounded-lg text-[14px] text-[#0b1c30] placeholder:text-[#747686] font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Admin Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-[13px] font-medium text-[#0b1c30]">Administrator Email</label>
              <div className="relative flex items-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="absolute left-3 w-4 h-4 text-[#747686] pointer-events-none">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="e.g. principal@gbhsyaounde.cm"
                  className="w-full pl-10 pr-3 py-2.5 bg-[#eff4ff] rounded-lg text-[14px] text-[#0b1c30] placeholder:text-[#747686] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[13px] font-medium text-[#0b1c30]">Password</label>
              <div className="relative flex items-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="absolute left-3 w-4 h-4 text-[#747686] pointer-events-none">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#eff4ff] rounded-lg text-[14px] text-[#0b1c30] placeholder:text-[#747686] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 p-1 text-[#747686] hover:text-[#0b1c30] transition-colors">
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending || !!state.success}
              className="w-full bg-[#1d4ed8] hover:bg-[#0037b0] disabled:opacity-70 disabled:cursor-not-allowed text-white py-3 rounded-lg text-[14px] font-semibold tracking-wide shadow-md transition-all flex items-center justify-center gap-2 group mt-1"
            >
              {isPending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Registering Institution...
                </>
              ) : (
                <>
                  Register Institution
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 group-hover:translate-x-0.5 transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-5 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 px-6 sm:px-8 py-4 bg-[#eff4ff] rounded-b-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[#747686]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <span className="font-code-sm text-[10px] uppercase tracking-wider">TLS 1.3 Secure</span>
            </div>
            <span className="text-[13px] text-[#434655]">
              Already registered?{' '}
              <Link href="/login" className="text-[#1d4ed8] font-semibold hover:underline">Sign in →</Link>
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}
