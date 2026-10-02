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
      <div className="relative w-full max-w-[440px]">
        {/* Ambient blur glows */}
        <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-[#dce9ff] blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-44 h-44 rounded-full bg-[#bbd6ff] blur-2xl opacity-40 pointer-events-none" />

        {/* Login Card */}
        <div className="relative w-full bg-white rounded-2xl shadow-xl p-6 sm:p-8 z-10 border border-[#e5eeff]">
          {/* Card header with EyeX logo */}
          <div className="flex flex-col items-center text-center mb-6">
            <Link href="/" className="mb-3 inline-block">
              <EyeXLogo width={160} showTagline={true} />
            </Link>
            <h1 className="text-2xl font-bold text-[#0b1c30] tracking-tight">Login as Administration</h1>
            <p className="text-[14px] text-[#434655] mt-1">
              Sign in to manage your school examination sessions
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
              <label htmlFor="email" className="text-[13px] font-medium text-[#0b1c30]">
                Email
              </label>
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
                  placeholder="admin@school.cm"
                  className="w-full pl-10 pr-3 py-2.5 bg-[#eff4ff] rounded-lg text-[14px] text-[#0b1c30] placeholder:text-[#747686] focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-[13px] font-medium text-[#0b1c30]">
                  Password
                </label>
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
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#1d4ed8] hover:bg-[#0037b0] disabled:opacity-70 disabled:cursor-not-allowed text-white py-3 rounded-lg text-[14px] font-semibold tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          {/* Do you have a school? Register */}
          <div className="mt-6 pt-5 border-t border-[#e5eeff] text-center text-[14px] text-[#434655]">
            Do you have a school?{' '}
            <Link
              href="/signup"
              className="text-[#1d4ed8] hover:text-[#0037b0] font-semibold underline underline-offset-2 ml-1"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
