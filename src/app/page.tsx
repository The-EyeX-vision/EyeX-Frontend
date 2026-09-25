import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ── Icons ──────────────────────────────────────────────────────────────────
function CheckIcon({ className = 'w-4 h-4 text-emerald-600' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-rose-500">
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  )
}

function ArrowUpRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
    </svg>
  )
}

function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-blue-600" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}

export default async function LandingPage() {
  let user = null
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (err) {
    console.error('[LandingPage] Auth query notice:', err)
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-800 font-sans antialiased selection:bg-teal-100 selection:text-teal-900">
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Tag */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0e5a4d] text-white text-xs font-bold shadow-sm">
                👁
              </span>
              <span className="font-bold text-slate-900 tracking-tight text-sm">The Eye X</span>
            </Link>
            <span className="hidden sm:inline-block text-[11px] text-slate-500 bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 rounded-full font-medium">
              Institutional Exam Platform
            </span>
          </div>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-medium text-slate-600">
            <a href="#philosophy" className="hover:text-slate-900 transition-colors">Philosophy</a>
            <a href="#workflow" className="hover:text-slate-900 transition-colors">How It Works</a>
            <a href="#workflow" className="hover:text-slate-900 transition-colors">The 3-Screen Rule</a>
            <a href="#governance" className="hover:text-slate-900 transition-colors">Institutional Security</a>
            <a href="#pilot" className="hover:text-slate-900 transition-colors">Pilot Program</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-md bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-xs font-semibold px-3.5 py-1.5 transition-colors shadow-sm"
              >
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
                >
                  <LockIcon />
                  Sign In to Terminal
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center rounded-md bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-xs font-semibold px-3.5 py-1.5 transition-colors shadow-sm"
                >
                  Request Pilot Access
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="pt-16 pb-12 px-6 max-w-5xl mx-auto text-center">
        {/* Compliance Badge */}
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50/80 border border-blue-200/80 rounded-full px-3.5 py-1 mb-6">
          <ShieldCheckIcon />
          GCE &amp; Formal Board Examination Standard
        </div>

        {/* Hero Editorial Heading */}
        <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-bold tracking-tight text-slate-950 leading-[1.18] max-w-4xl mx-auto">
          It does not decide if a student is cheating.<br className="hidden sm:inline" />
          <span className="text-slate-900">It points. A human reviews. A human decides.</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          The Eye X provides real-time behavioral flags to invigilators during live exam sessions—reducing false allegations, eliminating subjective bias, and safeguarding student futures.
        </p>

        {/* Call to Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-md bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-xs sm:text-sm font-semibold px-5 py-2.5 transition-all shadow-sm"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
            </svg>
            Schedule Institutional Pilot
          </Link>

          <a
            href="#workflow"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-medium px-4 py-2.5 transition-colors shadow-2xs"
          >
            Explore the 3-Screen Workflow
            <ArrowUpRightIcon />
          </a>
        </div>

        {/* 4 Feature Checklist Items */}
        <div className="mt-10 pt-6 border-t border-slate-200/80 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-1.5">
            <CheckIcon className="w-4 h-4 text-emerald-700" />
            GCE Board Protocol Compliant
          </div>
          <div className="flex items-center gap-1.5">
            <CheckIcon className="w-4 h-4 text-emerald-700" />
            Zero-Biometric / Face Recording
          </div>
          <div className="flex items-center gap-1.5">
            <CheckIcon className="w-4 h-4 text-emerald-700" />
            Real-Time 1-Hall / 1-Exam Isolation
          </div>
          <div className="flex items-center gap-1.5">
            <CheckIcon className="w-4 h-4 text-emerald-700" />
            Local Edge Offline Fallback
          </div>
        </div>
      </section>

      {/* ── The 3-Screen Terminal Preview Showcase ── */}
      <section className="px-6 py-6 max-w-6xl mx-auto">
        <div className="rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden">
          {/* Top Terminal Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50/70 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="ml-2 font-mono text-[11px] text-slate-500">
                Terminal — Hall_2_A_North_01 // Session #0937
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              AI Edge Synced
            </div>
          </div>

          {/* 3-Screen Panels */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 p-4 gap-4 md:gap-0">
            {/* Screen 01 */}
            <div className="md:px-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-2">
                  <span className="font-semibold text-slate-900">01 / Observation Feed</span>
                  <span className="font-mono text-slate-400">CAM-02-LIVE</span>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 flex flex-col items-center justify-center text-center min-h-[140px]">
                  <div className="w-8 h-8 rounded-full border border-slate-300 bg-white flex items-center justify-center text-slate-500 mb-2 shadow-2xs">
                    📹
                  </div>
                  <span className="text-xs font-semibold text-slate-800">Desk D-04</span>
                  <span className="mt-1 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                    Turned away from paper
                  </span>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-slate-500 leading-snug">
                Camera physically isolated to exam perimeter. No external stream or biometric matching.
              </p>
            </div>

            {/* Screen 02 */}
            <div className="md:px-4 flex flex-col justify-between pt-4 md:pt-0">
              <div>
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-2">
                  <span className="font-semibold text-slate-900">02 / Invigilator Review</span>
                  <span className="text-rose-600 font-semibold text-[10px] bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">3-Second Clip</span>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between min-h-[140px]">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-600">
                    <span>SEC_LOOPED_FOOTAGE</span>
                    <span className="text-[10px] text-slate-400">10:14:02</span>
                  </div>
                  <div className="my-auto text-center py-2">
                    <span className="text-xs text-slate-700 font-medium">Head turned left &gt; 8s towards adjacent desk</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button className="py-1 px-2 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium">
                      Dismiss
                    </button>
                    <button className="py-1 px-2 rounded bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-xs font-medium">
                      Confirm Flag
                    </button>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-slate-500 leading-snug">
                Algorithm proposes. Human decides. Invigilator decides in 3 seconds without disrupting hall.
              </p>
            </div>

            {/* Screen 03 */}
            <div className="md:px-4 flex flex-col justify-between pt-4 md:pt-0">
              <div>
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-2">
                  <span className="font-semibold text-slate-900">03 / Sealed Exam Ledger</span>
                  <span className="font-mono text-slate-400">ESC-204 Unit</span>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-900 text-emerald-400 font-mono text-[10.5px] p-3 leading-relaxed min-h-[140px] flex flex-col justify-between">
                  <div>
                    <p className="text-slate-400">10:14:02 | DESK D-04 (OFF-DESK_GAZE)</p>
                    <p className="text-slate-400">10:14:05 | REVIEW (CONFIRMED_HUMAN)</p>
                    <p className="text-emerald-400 font-bold mt-1">10:14:06 | INCIDENT_SEALED</p>
                  </div>
                  <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-300 flex justify-between">
                    <span>Signed: Invigilator #4</span>
                    <span className="text-slate-500">SHA-256</span>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-slate-500 leading-snug">
                Cryptographically timestamped audit log submitted directly to the board. 100% tamper-evident.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: THE CORE DILEMMA ── */}
      <section id="philosophy" className="py-16 px-6 max-w-5xl mx-auto border-t border-slate-200/80">
        <div className="mb-10 text-left">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            The Core Dilemma
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 mt-1">
            Why automated proctoring fails students — and why human-first decision support succeeds.
          </h2>
          <p className="mt-2 text-sm text-slate-600 max-w-3xl leading-relaxed">
            Algorithmic surveillance criminalizes natural physiological behaviors. The Eye X restores the role of the invigilator as the sole ethical arbiter in the examination hall.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Legacy AI */}
          <div className="rounded-xl border border-rose-200/80 bg-white p-6 shadow-2xs">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm mb-1">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-xs">
                ✕
              </span>
              The Legacy AI Approach
            </div>
            <p className="text-xs text-slate-500 mb-5 leading-normal">
              Invasive black-box algorithms that create anxiety, produce false positives, and dehumanize exam supervision.
            </p>

            <ul className="space-y-4 text-xs">
              <li className="flex items-start gap-2.5">
                <CrossIcon />
                <div>
                  <strong className="text-slate-800 block mb-0.5">Opaque Probability Scores</strong>
                  <span className="text-slate-600">Assigns automated suspicion metrics (e.g. &ldquo;82% Cheat Risk&rdquo;) without institutional accountability.</span>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <CrossIcon />
                <div>
                  <strong className="text-slate-800 block mb-0.5">Automated Penalties</strong>
                  <span className="text-slate-600">Can lock terminals or terminate sessions prematurely without an educator verifying the context.</span>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <CrossIcon />
                <div>
                  <strong className="text-slate-800 block mb-0.5">Biometric Harvesting</strong>
                  <span className="text-slate-600">Stores face scans and gaze coordinates in commercial cloud databases indefinitely.</span>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <CrossIcon />
                <div>
                  <strong className="text-slate-800 block mb-0.5">Hostile Hall Dynamics</strong>
                  <span className="text-slate-600">Fosters mutual suspicion between candidates and supervisory staff.</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Card 2: The Eye X Standard */}
          <div className="rounded-xl border border-teal-200/80 bg-white p-6 shadow-2xs">
            <div className="flex items-center gap-2 text-[#0e5a4d] font-bold text-sm mb-1">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-[#0e5a4d] text-xs">
                ✓
              </span>
              The Eye X Institutional Standard
            </div>
            <p className="text-xs text-slate-500 mb-5 leading-normal">
              Strictly assists educators; designed to preserve calm, respect privacy, and empower pedagogical leadership.
            </p>

            <ul className="space-y-4 text-xs">
              <li className="flex items-start gap-2.5">
                <CheckIcon />
                <div>
                  <strong className="text-slate-800 block mb-0.5">Plain Human Language</strong>
                  <span className="text-slate-600">Descriptive observations only (&ldquo;Looking down left&rdquo;, &ldquo;Hand below desk&rdquo;) without judgment words.</span>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckIcon />
                <div>
                  <strong className="text-slate-800 block mb-0.5">100% Invigilator Autonomy</strong>
                  <span className="text-slate-600">Zero autonomous disqualifications. The human invigilator is the sole authority who can record an incident.</span>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckIcon />
                <div>
                  <strong className="text-slate-800 block mb-0.5">Zero-Vaulted Biometrics</strong>
                  <span className="text-slate-600">No facial identification models, gaze prediction vector storage, or candidate identity matching.</span>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckIcon />
                <div>
                  <strong className="text-slate-800 block mb-0.5">Quiet Hall Preservation</strong>
                  <span className="text-slate-600">No alarms, buzzers, or blinking lights in the exam hall; unobtrusive notification to proctor tablet.</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Section: THE OPERATIONAL METHODOLOGY (3-Screen Architecture) ── */}
      <section id="workflow" className="py-16 px-6 max-w-5xl mx-auto border-t border-slate-200/80">
        <div className="mb-10 text-left">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            The Operational Methodology
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 mt-1">
            The 3-Screen Workflow Architecture
          </h2>
          <p className="mt-2 text-sm text-slate-600 max-w-3xl leading-relaxed">
            Designed specifically for the physical layout of school halls. Streamlined so that no invigilator spends more than three seconds looking at a screen instead of the students.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Step 1 */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
            <div>
              <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center mb-3">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1.5">Live Alerts Feed</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Zero-Distraction Hall Monitoring. Surfaces behavioral anomalies in real time using neutral, descriptive terminology. Never screams, never distracts.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-500">
              <span className="text-slate-800 font-semibold">Feed:</span> Desk D-04 flagged
            </div>
          </div>

          {/* Step 2 */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
            <div>
              <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center mb-3">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1.5">3-Second Evidence Review</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Instant Clip Verification. A 3-second localized loop presents the context. The invigilator chooses between &ldquo;Confirm Incident&rdquo; or &ldquo;Dismiss as normal&rdquo;.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-500">
              <span className="text-teal-700 font-semibold">CLIP_SEC_770142:</span> Ready
            </div>
          </div>

          {/* Step 3 */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
            <div>
              <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center mb-3">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1.5">Sealed Session Summary</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tamper-Proof Board Audit. Immutable event chronological log, and digitally signed invigilator certificate ready for formal examination boards.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-500">
              <span className="text-slate-800 font-semibold">Audit:</span> Signed &amp; Sealed
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: INSTITUTIONAL GOVERNANCE ── */}
      <section id="governance" className="py-16 px-6 max-w-5xl mx-auto border-t border-slate-200/80">
        <div className="mb-10 text-left">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            Institutional Governance
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 mt-1">
            Strict Architectural &amp; Ethical Guardrails
          </h2>
          <p className="mt-2 text-sm text-slate-600 max-w-3xl leading-relaxed">
            Engineered to satisfy the stringent legal, ethical, and privacy standards of national education authorities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
              📝
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">Non-Negotiable Language Standard</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Zero computational jargon like &ldquo;yaw angles&rdquo;, &ldquo;confidence metrics&rdquo;, or speculative words like &ldquo;cheating&rdquo;. Observations are recorded exclusively in clear, objective examination terminology.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mb-3">
              🔒
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">Privacy by Design Perimeter</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              All vision processing occurs on local edge hardware within school boundaries. Zero biometric templates are compiled, and all session feeds are permanently purged after verification.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3">
              ⚡
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">Fail-Safe Edge Fallback</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Continuous local hall surveillance operates without interruption if internet connectivity degrades. Local buffers synchronize cryptographically once the institutional link recovers.
            </p>
          </div>
        </div>
      </section>

      {/* ── Testimonial & Benchmark ── */}
      <section className="py-12 px-6 max-w-4xl mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-2xs">
          <span className="text-3xl text-slate-400 font-serif leading-none block mb-2">&ldquo;</span>
          <blockquote className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed italic">
            In high-stakes exams, a false accusation ruins a student&apos;s year or future. The Eye X gives us calm clarity without taking the decision out of the teacher&apos;s hands.
          </blockquote>
          <div className="mt-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
              MR
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-tight">Dr. Michael Richardson</p>
              <p className="text-[11px] text-slate-500">Senior Invigilator &amp; Examination Officer, South East Academies Trust</p>
            </div>
          </div>
        </div>

        {/* Benchmark Pill Row */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 px-6 py-4 rounded-xl border border-slate-200 bg-white text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Pilot Benchmark</span>
            <span className="font-semibold text-slate-800">1 Hall • 1 School • 1 Exam</span>
          </div>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div>
            <span className="text-xl font-bold text-slate-900">100%</span>
            <span className="ml-2 text-slate-600 font-medium">Invigilator Clarity</span>
          </div>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div>
            <span className="text-xl font-bold text-slate-900">0</span>
            <span className="ml-2 text-slate-600 font-medium">False Accusations Escalated</span>
          </div>
        </div>
      </section>

      {/* ── Section: Official Pilot Request Form ── */}
      <section id="pilot" className="py-16 px-6 max-w-3xl mx-auto text-center border-t border-slate-200/80">
        <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
          Official Secondary School &amp; Exam Centre Pilots
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 mt-4">
          Bring Ethical Integrity Monitoring to Your Next Examination Window
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          We partner directly with academic institutions, regional boards, and accredited exam centres. Request an institutional briefing and sandbox terminal access.
        </p>

        {/* Pilot Form Card */}
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-left">
          <form action="/signup" method="GET" className="space-y-4">
            <div>
              <label htmlFor="pilot-email" className="block text-xs font-medium text-slate-700 mb-1">
                Institutional Email
              </label>
              <input
                id="pilot-email"
                type="email"
                placeholder="examinations@school.com or .edu.cm"
                className="w-full text-xs px-3.5 py-2.5 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0e5a4d]/30 focus:border-[#0e5a4d]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="inst-type" className="block text-xs font-medium text-slate-700 mb-1">
                  Institution Type
                </label>
                <select id="inst-type" className="w-full text-xs px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-700">
                  <option>Secondary / GCE Centre</option>
                  <option>Higher Education / University</option>
                  <option>Accredited Vocational College</option>
                </select>
              </div>

              <div>
                <label htmlFor="exam-window" className="block text-xs font-medium text-slate-700 mb-1">
                  Target Exam Window
                </label>
                <select id="exam-window" className="w-full text-xs px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-700">
                  <option>November Mocks Session</option>
                  <option>June Official Board Exams</option>
                  <option>Ongoing Modular Assessments</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 rounded-md bg-[#0e5a4d] hover:bg-[#0b483d] text-white text-xs sm:text-sm font-semibold py-2.5 px-4 transition-colors shadow-sm"
            >
              Submit Institutional Pilot Request →
            </button>
          </form>

          <p className="mt-3 text-[11px] text-slate-400 text-center">
            Strict confidentiality. No marketing spam. Direct outreach by our Education Integrity Network.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-white px-6 py-12 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-[#0e5a4d] text-white text-xs font-bold">
                👁
              </span>
              <span className="font-bold text-slate-900 text-sm">The Eye X</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
              The decision-support platform for high-stakes examinations. Upholding integrity through human-centric autonomous computer vision.
            </p>
            <p className="text-[11px] text-slate-400">
              Compliant with Ministry of Secondary Education &amp; GCE Board protocols.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-xs mb-3">Governance &amp; Whitepapers</h4>
            <ul className="space-y-2 text-[11px] text-slate-500">
              <li><a href="#philosophy" className="hover:text-slate-800">Pilot Protocol Whitepaper (PDF)</a></li>
              <li><a href="#workflow" className="hover:text-slate-800">Invigilator Control Standard</a></li>
              <li><a href="#governance" className="hover:text-slate-800">Non-Biometric Architecture Spec</a></li>
              <li><a href="#governance" className="hover:text-slate-800">Row-Level Security Standards</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-xs mb-3">Legal &amp; Safeguarding</h4>
            <ul className="space-y-2 text-[11px] text-slate-500">
              <li><a href="#" className="hover:text-slate-800">UK/EEA GDPR Compliance Section</a></li>
              <li><a href="#" className="hover:text-slate-800">72-hr Data Retention Policies</a></li>
              <li><a href="#" className="hover:text-slate-800">Anti-Adversarial Guarantee</a></li>
              <li><a href="#" className="hover:text-slate-800">Board Audit Certifications</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-xs mb-3">Institutional Access</h4>
            <ul className="space-y-2 text-[11px] text-slate-500">
              <li><Link href="/login" className="hover:text-[#0e5a4d] font-medium">School Terminal Sign In</Link></li>
              <li><Link href="/signup" className="hover:text-[#0e5a4d] font-medium">Register Pilot Center</Link></li>
              <li><a href="#" className="hover:text-slate-800">Hardware Edge Setup</a></li>
              <li><a href="mailto:support@eyex.cm" className="hover:text-slate-800">Support Desk (24/7 Live Exam)</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
          <div>© {new Date().getFullYear()} The Eye X Systems Ltd. All Rights Reserved.</div>
          <div>ISO 27001 &amp; SOC-2 Type II Exam Certified</div>
        </div>
      </footer>
    </div>
  )
}
