'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { EyeXLogo } from '@/components/ui/EyeXLogo'

export default function HallAccessPage() {
  const router = useRouter()
  const [code, setCode] = useState<string[]>(Array(8).fill(''))
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verified, setVerified] = useState<{ hallName: string; classroomId: string } | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const fullCode = code.join('')

  // Auto-submit when all 8 chars filled
  useEffect(() => {
    if (fullCode.length === 8 && !isVerifying && !verified) {
      handleVerify()
    }
  }, [fullCode])

  function handleCellChange(idx: number, value: string) {
    const char = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(-1)
    const next = [...code]
    next[idx] = char
    setCode(next)
    setError(null)
    if (char && idx < 7) {
      inputRefs.current[idx + 1]?.focus()
    }
  }

  function handleCellKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && idx > 0) inputRefs.current[idx - 1]?.focus()
    if (e.key === 'ArrowRight' && idx < 7) inputRefs.current[idx + 1]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8)
    const next = Array(8).fill('')
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setCode(next)
    const focusIdx = Math.min(pasted.length, 7)
    inputRefs.current[focusIdx]?.focus()
  }

  async function handleVerify() {
    if (fullCode.length < 8) {
      setError('Please enter all 8 characters of your hall access code.')
      return
    }
    setIsVerifying(true)
    setError(null)
    try {
      const res = await fetch('/api/hall-access/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fullCode, access_code: fullCode }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Invalid or expired access code. Please check your assignment slip.')
        setIsVerifying(false)
        return
      }
      const classroomId = data.classroomId || data.classroom?.id
      const hallName = data.hallName || data.classroom?.name || 'Examination Hall'
      if (!classroomId) {
        setError('Verification succeeded but hall ID was missing. Please try again.')
        setIsVerifying(false)
        return
      }
      setVerified({ hallName, classroomId })
    } catch {
      setError('Network error. Please try again.')
      setIsVerifying(false)
    }
  }

  function handleEnterHall() {
    if (verified?.classroomId) router.push(`/hall/${verified.classroomId}`)
  }

  function handleReset() {
    setCode(Array(8).fill(''))
    setVerified(null)
    setError(null)
    inputRefs.current[0]?.focus()
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      {/* Top header strip */}
      <header className="w-full bg-white border-b border-[#c4c5d7]" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
        <div className="w-full px-4 sm:px-8 h-20 flex items-center justify-between">
          <Link href="/"><EyeXLogo width={120} showTagline={false} /></Link>
          <div className="flex items-center gap-2 bg-white border border-[#c4c5d7] px-2.5 py-1 rounded-lg">
            <span className="relative flex h-2 w-2">
              <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-code-sm text-[10px] text-[#434655] uppercase tracking-wider">Online · Synced</span>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-8 py-8 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#1d4ed8]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-headline-md text-[#0b1c30]">Invigilator Rapid Hall Dispatch</span>
                <span className="font-code-sm text-[10px] bg-[#dce9ff] text-[#0037b0] px-2 py-0.5 rounded uppercase tracking-wider font-semibold">Terminal Mode</span>
              </div>
              <p className="text-[13px] text-[#434655] mt-0.5">Zero-friction token gate for on-duty proctors and chief hall invigilators.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#eff4ff] px-4 py-2 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-code-sm text-[11px] text-[#0b1c30] font-semibold">GATEWAY NODE: ACTIVE</span>
            <span className="text-[#c4c5d7] font-code-sm">/</span>
            <span className="font-code-sm text-[11px] text-[#434655]">SHA-256 SECURE</span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* ── Left: Code Entry Form ─────────────────────────────────── */}
          <div className="xl:col-span-5 flex flex-col gap-4">
            <div className="bg-white rounded-xl shadow-sm p-6 relative overflow-hidden">
              {/* Ambient glow */}
              <div className="absolute -right-12 -top-12 w-44 h-44 bg-[#dce9ff] rounded-full blur-2xl pointer-events-none opacity-60" />

              <div className="relative z-10 flex flex-col gap-5">
                <div>
                  <span className="font-code-sm text-[11px] text-[#0037b0] font-bold uppercase tracking-wider">Fast Access Portal</span>
                  <h2 className="font-headline-md text-[#0b1c30] tracking-tight mt-0.5">Enter Examination Hall Access Code</h2>
                  <p className="text-[14px] text-[#434655] mt-1.5 leading-relaxed">
                    Enter the 8-character access code from your invigilator assignment slip or issued by the School Examination Officer.
                  </p>
                </div>

                {/* 8-cell token input */}
                <div>
                  <label className="font-code-sm text-[10px] text-[#747686] uppercase tracking-wider font-semibold">Token Pattern [4 - 4]</label>
                  <div className="mt-2 grid grid-cols-9 gap-1.5 items-center" onPaste={handlePaste}>
                    {code.map((char, idx) => (
                      <div key={idx} className={idx === 4 ? 'flex items-center justify-center' : ''}>
                        {idx === 4 ? (
                          <span className="text-[#747686] font-headline-md select-none text-center w-full">-</span>
                        ) : null}
                        {idx !== 4 && (
                          <input
                            ref={(el) => { inputRefs.current[idx] = el }}
                            type="text"
                            inputMode="text"
                            maxLength={1}
                            value={idx < 4 ? code[idx] : code[idx - 1 + 1]}
                            onChange={(e) => handleCellChange(idx < 4 ? idx : idx, e.target.value)}
                            onKeyDown={(e) => handleCellKeyDown(idx < 4 ? idx : idx, e)}
                            className={`h-14 w-full text-center font-code-lg text-[18px] font-bold rounded-lg uppercase transition-all shadow-inner focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] ${
                              verified
                                ? 'bg-emerald-50 text-emerald-700 ring-2 ring-emerald-400'
                                : 'bg-[#eff4ff] text-[#0037b0] focus:bg-white'
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Proper 8-box layout */}
                  <div className="mt-2 grid grid-cols-9 gap-1.5 items-center">
                    {Array.from({ length: 9 }, (_, idx) => {
                      if (idx === 4) return <span key={idx} className="text-[#747686] font-headline-md text-center select-none">-</span>
                      const realIdx = idx < 4 ? idx : idx - 1
                      return (
                        <input
                          key={idx}
                          ref={(el) => { inputRefs.current[realIdx] = el }}
                          type="text"
                          inputMode="text"
                          maxLength={1}
                          value={code[realIdx]}
                          onChange={(e) => handleCellChange(realIdx, e.target.value)}
                          onKeyDown={(e) => handleCellKeyDown(realIdx, e)}
                          onPaste={handlePaste}
                          className={`h-14 w-full text-center font-code-lg text-[18px] font-bold rounded-lg uppercase transition-all shadow-inner focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] ${
                            verified
                              ? 'bg-emerald-50 text-emerald-700 ring-2 ring-emerald-400'
                              : 'bg-[#eff4ff] text-[#0037b0] focus:bg-white'
                          }`}
                        />
                      )
                    })}
                  </div>
                </div>

                {/* Verification status */}
                {verified && (
                  <div className="bg-[#eff4ff] p-3 rounded-lg flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-[13px] font-semibold text-[#0b1c30]">Code Verified: {verified.hallName}</span>
                    </div>
                    <span className="font-code-sm text-[11px] text-emerald-700 bg-white px-2 py-0.5 rounded font-bold">MATCH</span>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-[#fef2f2] border border-[#fecaca] rounded-lg">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-[#b91c1c] shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <p className="text-[13px] text-[#b91c1c]">{error}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 pt-1">
                  {verified ? (
                    <>
                      <button
                        onClick={handleEnterHall}
                        className="w-full bg-[#1d4ed8] hover:bg-[#0037b0] text-white py-3.5 px-4 rounded-lg text-[14px] font-semibold tracking-wide shadow-sm transition-all flex items-center justify-center gap-2"
                      >
                        Enter {verified.hallName}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </button>
                      <button onClick={handleReset} className="w-full bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0037b0] py-3 px-4 rounded-lg text-[13px] font-semibold transition-all">
                        Enter Different Code
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleVerify}
                      disabled={isVerifying || fullCode.length < 8}
                      className="w-full bg-[#1d4ed8] hover:bg-[#0037b0] disabled:opacity-60 disabled:cursor-not-allowed text-white py-3.5 px-4 rounded-lg text-[14px] font-semibold tracking-wide shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                      {isVerifying ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                          </svg>
                          Verifying Code...
                        </>
                      ) : 'Verify Hall Access Code'}
                    </button>
                  )}
                </div>

                {/* Security note */}
                <div className="p-3 bg-[#eff4ff] rounded-lg flex items-start gap-2.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5 text-[#0037b0] shrink-0 mt-0.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  <div>
                    <span className="text-[13px] font-semibold text-[#0b1c30]">No account required</span>
                    <p className="text-[12px] text-[#434655] mt-0.5 leading-snug">Your session is tied directly to the hall until the examination officially concludes.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin login link */}
            <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold text-[#0b1c30]">School Administration?</span>
                <span className="text-[12px] text-[#747686]">Access the full dashboard</span>
              </div>
              <Link href="/login" className="flex items-center gap-1.5 text-[13px] font-semibold text-[#1d4ed8] hover:underline">
                Sign In
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            </div>
          </div>

          {/* ── Right: Info Panel ─────────────────────────────────────── */}
          <div className="xl:col-span-7 flex flex-col gap-4">
            <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
              <div>
                <span className="font-code-sm text-[11px] text-[#0037b0] font-bold uppercase tracking-wider">Hall Dispatch & Active Sessions</span>
                <h3 className="font-headline-md text-[#0b1c30] tracking-tight mt-1">How Hall Access Works</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    step: '01',
                    title: 'Receive Code',
                    desc: 'Get your 8-character access code from the School Examination Officer or your assignment slip.',
                    color: 'bg-[#eff4ff] text-[#0037b0]',
                  },
                  {
                    step: '02',
                    title: 'Enter Token',
                    desc: 'Type each character into the boxes above. The system verifies your code against live database records.',
                    color: 'bg-[#eff4ff] text-[#0037b0]',
                  },
                  {
                    step: '03',
                    title: 'Enter Hall',
                    desc: 'Gain instant, passwordless access to the hall dashboard for launching and supervising the examination session.',
                    color: 'bg-emerald-50 text-emerald-700',
                  },
                ].map((item) => (
                  <div key={item.step} className="flex flex-col gap-2 p-4 rounded-xl bg-[#f8f9ff] border border-[#e5eeff]">
                    <span className={`font-code-md text-[13px] px-2 py-1 rounded font-bold w-fit ${item.color}`}>{item.step}</span>
                    <h4 className="text-[14px] font-semibold text-[#0b1c30]">{item.title}</h4>
                    <p className="text-[12px] text-[#434655] leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Info callout */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-[#eff4ff] rounded-xl border border-[#bbd6ff]">
                <div className="w-10 h-10 rounded-lg bg-[#dce9ff] flex items-center justify-center text-[#1d4ed8] shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#0b1c30]">Access codes are time-limited and hall-specific</p>
                  <p className="text-[12px] text-[#434655] mt-0.5 leading-relaxed">Each code is uniquely tied to one examination hall and rotates on a scheduled cycle. If your code is expired, contact your Chief Invigilator.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
