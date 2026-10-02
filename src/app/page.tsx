import Link from 'next/link'
import { EyeXLogo } from '@/components/ui/EyeXLogo'

export const dynamic = 'force-dynamic'

export default function LandingPage() {

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] antialiased">
      {/* ── Fixed Top Header ── */}
      <header className="fixed top-0 left-0 w-full z-50 bg-white border-b border-[#c4c5d7]" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
        <div className="h-20 w-full px-4 sm:px-8 max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <EyeXLogo width={130} showTagline={false} />
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-[14px] font-medium text-[#434655]">
            <Link href="/" className="text-[#0037b0] font-semibold">Home</Link>
            <Link href="#about" className="hover:text-[#0b1c30] transition-colors">About</Link>
            <Link href="/hall-access" className="hover:text-[#0b1c30] transition-colors">Invigilator Hall Code</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center text-[14px] font-medium text-[#434655] hover:text-[#0b1c30] px-3 py-2 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center bg-[#1d4ed8] text-white text-[14px] font-semibold px-4 py-2 rounded-lg hover:bg-[#0037b0] transition-colors shadow-sm"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Canvas ── */}
      <main className="pt-20">
        {/* HERO SECTION */}
        <div className="relative w-full overflow-hidden">
          {/* Subtle top glow */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[850px] h-[340px] bg-gradient-to-b from-[#dce1ff]/50 via-[#eff4ff]/30 to-transparent blur-3xl pointer-events-none -z-10" />

          <section className="w-full px-4 sm:px-8 py-16 sm:py-20 max-w-7xl mx-auto flex flex-col items-center text-center">
            {/* Tag */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#dce9ff] shadow-sm mb-6">
              <span className="w-2 h-2 rounded-full bg-[#1d4ed8] animate-pulse" />
              <span className="font-code-sm text-[11px] text-[#004870] uppercase tracking-wider font-semibold">
                Cameroon Secondary Education • GCE Board Protocol Ready
              </span>
            </div>

            {/* Title */}
            <h1 className="font-headline-xl text-3xl sm:text-5xl lg:text-6xl text-[#0b1c30] max-w-4xl tracking-tight leading-tight font-bold">
              Smarter Examination Monitoring for Cameroonian Schools
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-[16px] sm:text-[18px] text-[#434655] max-w-3xl leading-relaxed">
              EyeX helps schools monitor examination halls in real time, identify unusual activities, and preserve evidence for authorised human review. The system detects, the invigilator reviews, the school remains in control.
            </p>

            {/* Trust Highlights */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[#466083] text-[13px] font-medium">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-[#0037b0]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <span className="font-code-sm">GCE Board Protocol 2025</span>
              </div>
              <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-[#c4c5d7]" />
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-[#0037b0]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span className="font-code-sm">Offline-Edge Resilient</span>
              </div>
              <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-[#c4c5d7]" />
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-[#0037b0]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <span className="font-code-sm">Tamper-Proof Audit Vault</span>
              </div>
            </div>

            {/* Dual Primary Action Gate */}
            <div className="w-full mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
              {/* Card A: Invigilator Quick Access */}
              <div className="relative bg-white rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between border border-[#e5eeff]">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#1d4ed8] rounded-t-2xl" />
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-lg bg-[#eff4ff] text-[#0037b0] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                        </svg>
                      </span>
                      <span className="font-code-sm text-[11px] uppercase tracking-wider text-[#466083] font-semibold">
                        Field Invigilator Portal
                      </span>
                    </div>
                    <span className="font-code-sm text-[11px] px-2 py-0.5 rounded bg-[#dce9ff] text-[#004870] font-semibold">
                      Direct Session
                    </span>
                  </div>

                  <h2 className="font-headline-lg text-[#0b1c30] tracking-tight">
                    Enter Examination Hall
                  </h2>
                  <p className="mt-1.5 text-[14px] text-[#434655] leading-relaxed">
                    Conduct scheduled supervision. Enter the 8-character terminal code generated by your Chief Invigilator.
                  </p>

                  <div className="mt-5 bg-[#eff4ff] rounded-xl p-4">
                    <label className="block font-code-sm text-[11px] text-[#466083] uppercase font-semibold mb-2">
                      Active Hall Token Code
                    </label>
                    <div className="flex items-center gap-3">
                      <Link
                        href="/hall-access"
                        className="flex-1 bg-white text-[#0b1c30] font-code-lg text-[16px] font-semibold tracking-widest px-4 py-2.5 rounded-lg border border-[#c4c5d7] hover:border-[#1d4ed8] transition-colors flex items-center justify-between"
                      >
                        <span className="text-[#0037b0]">7K4P-92XM</span>
                        <span className="text-[12px] font-sans font-normal text-[#747686]">Click to enter</span>
                      </Link>
                      <Link
                        href="/hall-access"
                        className="inline-flex items-center gap-1.5 bg-[#1d4ed8] text-white text-[14px] font-semibold px-4 py-2.5 rounded-lg hover:bg-[#0037b0] transition-colors shadow-sm"
                      >
                        <span>Enter Hall</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[#eff4ff] flex items-center gap-2 text-[#434655] text-[13px]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-emerald-600 shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>No password required for on-duty invigilators. Instant token access.</span>
                </div>
              </div>

              {/* Card B: School Administration Command Portal */}
              <div className="relative bg-white rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between border border-[#e5eeff]">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#006194] rounded-t-2xl" />
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-lg bg-[#eff4ff] text-[#006194] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.75a1.5 1.5 0 011.5-1.5h1.5a1.5 1.5 0 011.5 1.5V21m6-9.75h.75m-.75 3h.75m-.75 3h.75" />
                        </svg>
                      </span>
                      <span className="font-code-sm text-[11px] uppercase tracking-wider text-[#466083] font-semibold">
                        Institutional Governance
                      </span>
                    </div>
                    <span className="font-code-sm text-[11px] px-2 py-0.5 rounded bg-[#dce9ff] text-[#004870] font-semibold">
                      Chief Examiners
                    </span>
                  </div>

                  <h2 className="font-headline-lg text-[#0b1c30] tracking-tight">
                    School Command Portal
                  </h2>
                  <p className="mt-1.5 text-[14px] text-[#434655] leading-relaxed">
                    Centralized telemetry hub for Principals, Vice Principals, Examination Officers, and GCE Center Superintendents.
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#eff4ff] flex flex-col justify-between">
                      <span className="font-code-sm text-[10px] text-[#747686] uppercase font-semibold">Verified Centers</span>
                      <span className="font-headline-md text-2xl text-[#0b1c30] font-bold mt-1">100%</span>
                      <span className="text-[12px] text-[#466083]">Accredited Protocol</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#eff4ff] flex flex-col justify-between">
                      <span className="font-code-sm text-[10px] text-[#747686] uppercase font-semibold">Tamper Audits</span>
                      <span className="font-headline-md text-2xl text-[#0037b0] font-bold mt-1">SHA-256</span>
                      <span className="text-[12px] text-[#466083]">Cryptographic Vault</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 border-t border-[#eff4ff]">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 bg-[#0b1c30] text-white text-[14px] font-semibold px-4 py-2.5 rounded-lg hover:bg-[#213145] transition-colors shadow-sm"
                  >
                    <span>Sign In to Dashboard</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center gap-1.5 bg-[#eff4ff] text-[#0037b0] text-[14px] font-semibold px-4 py-2.5 rounded-lg hover:bg-[#e5eeff] transition-colors"
                  >
                    <span>Register Institution</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* SECTION 2: CORE PLATFORM PILLARS (ABOUT) */}
        <section id="about" className="w-full px-4 sm:px-8 py-16 max-w-7xl mx-auto scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <span className="font-code-sm text-[11px] uppercase tracking-wider text-[#0037b0] font-semibold">
                Architectural Tenets
              </span>
              <h2 className="mt-1 font-headline-xl text-2xl sm:text-4xl text-[#0b1c30] font-bold tracking-tight">
                Purpose-Built for High-Stakes African Examination Environments
              </h2>
            </div>
            <p className="text-[14px] text-[#434655] max-w-md leading-relaxed">
              Designed from the ground up to respect human judgment, survive unstable power infrastructure, and protect student privacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col justify-between border border-[#e5eeff]">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#eff4ff] text-[#0037b0] flex items-center justify-center mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <span className="font-code-sm text-[11px] text-[#466083] font-semibold uppercase tracking-wider">
                  Pillar 01
                </span>
                <h3 className="mt-1 font-headline-md text-xl text-[#0b1c30] font-semibold tracking-tight">
                  Zero-Friction Hall Access
                </h3>
                <p className="mt-2 text-[14px] text-[#434655] leading-relaxed">
                  Invigilators enter via temporary 8-character hall tokens without complex passwords or IT overhead. Temporary delegations prevent account sharing while keeping audit trails linked to specific schedules.
                </p>
              </div>
              <div className="mt-6 pt-3 bg-[#eff4ff] rounded-lg p-3 flex items-center justify-between">
                <span className="font-code-sm text-[11px] text-[#466083]">Authentication overhead</span>
                <span className="font-code-sm text-[11px] text-[#0037b0] font-bold">&lt; 15 seconds</span>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col justify-between border border-[#e5eeff]">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#eff4ff] text-[#0037b0] flex items-center justify-center mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="font-code-sm text-[11px] text-[#466083] font-semibold uppercase tracking-wider">
                  Pillar 02
                </span>
                <h3 className="mt-1 font-headline-md text-xl text-[#0b1c30] font-semibold tracking-tight">
                  Real-Time Edge Computer Vision
                </h3>
                <p className="mt-2 text-[14px] text-[#434655] leading-relaxed">
                  Localized camera detection of prohibited materials and communication with zero permanent biometrics stored. Candidate privacy is enforced by redaction algorithms right on the hall edge device.
                </p>
              </div>
              <div className="mt-6 pt-3 bg-[#eff4ff] rounded-lg p-3 flex items-center justify-between">
                <span className="font-code-sm text-[11px] text-[#466083]">Data storage policy</span>
                <span className="font-code-sm text-[11px] text-[#0037b0] font-bold">Ephemeral / No Biometrics</span>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col justify-between border border-[#e5eeff]">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#eff4ff] text-[#0037b0] flex items-center justify-center mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </div>
                <span className="font-code-sm text-[11px] text-[#466083] font-semibold uppercase tracking-wider">
                  Pillar 03
                </span>
                <h3 className="mt-1 font-headline-md text-xl text-[#0b1c30] font-semibold tracking-tight">
                  Offline-Resilient Supervision
                </h3>
                <p className="mt-2 text-[14px] text-[#434655] leading-relaxed">
                  Continues local edge logging during internet fluctuations, automatically synchronising when restored. Hall operations run uninterrupted even during localized power or cellular blackouts.
                </p>
              </div>
              <div className="mt-6 pt-3 bg-[#eff4ff] rounded-lg p-3 flex items-center justify-between">
                <span className="font-code-sm text-[11px] text-[#466083]">Local buffer capacity</span>
                <span className="font-code-sm text-[11px] text-[#0037b0] font-bold">Up to 72 Hours Offline</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: HUMAN-IN-THE-LOOP INTEGRITY PROTOCOL */}
        <section className="w-full px-4 sm:px-8 py-16 max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl p-6 sm:p-10 shadow-sm border border-[#e5eeff]">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="font-code-sm text-[11px] uppercase tracking-wider text-[#0037b0] font-semibold">
                Certified Supervision Protocol
              </span>
              <h2 className="mt-1 font-headline-xl text-2xl sm:text-4xl text-[#0b1c30] font-bold tracking-tight">
                Human-in-the-Loop Integrity Architecture
              </h2>
              <p className="mt-2 text-[15px] text-[#434655] leading-relaxed">
                EyeX empowers human decision-makers rather than automating disciplinary sanctions. AI assists vigilance; educators retain sovereignty.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { stage: 'STAGE 01', title: 'Detection', desc: 'Edge vision triggers telemetry flag when unauthorized physical artifacts or atypical gaze angles appear.', footer: 'Passive Inference' },
                { stage: 'STAGE 02', title: 'Real-Time Evidence', desc: 'System encapsulates an un-editable 3-second frame clip with time-stamp and camera hardware signature.', footer: 'SHA-256 Checksum' },
                { stage: 'STAGE 03', title: 'Human Review', desc: 'Floor Invigilator receives subtle notification on hall tablet to discreetly assess candidate behavior on-site.', footer: 'Hall Invigilator Step' },
                { stage: 'STAGE 04', title: 'Discipline Confirmation', desc: 'Discipline Master and Center Chief countersign or dismiss incidents before submission to the GCE Board.', footer: 'Final Human Authority' },
              ].map((step, idx) => (
                <div key={step.stage} className="bg-[#eff4ff] rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-code-sm text-[11px] text-[#466083] font-bold">{step.stage}</span>
                      <span className="font-code-sm text-[12px] text-[#0037b0] font-bold">0{idx + 1}</span>
                    </div>
                    <h4 className="font-headline-md text-lg text-[#0b1c30] font-semibold mb-2">{step.title}</h4>
                    <p className="text-[13px] text-[#434655] leading-relaxed">{step.desc}</p>
                  </div>
                  <div className="mt-5 pt-2 flex items-center gap-1.5 font-code-sm text-[11px] text-[#004870] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8]" />
                    <span>{step.footer}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 4: CALL TO ACTION */}
        <section className="w-full px-4 sm:px-8 py-12 max-w-7xl mx-auto mb-12">
          <div className="bg-[#eff4ff] rounded-2xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-6 border border-[#bbd6ff]">
            <div className="max-w-2xl">
              <span className="font-code-sm text-[11px] uppercase tracking-wider text-[#0037b0] font-semibold">
                Session Initialization 2025
              </span>
              <h3 className="mt-1 font-headline-lg text-2xl sm:text-3xl text-[#0b1c30] font-bold">
                Ready to equip your examination center with EyeX?
              </h3>
              <p className="mt-2 text-[15px] text-[#434655] leading-relaxed">
                Register your secondary school today for administrative credentials and certified invigilator terminal provisioning.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center bg-[#1d4ed8] text-white text-[14px] font-semibold px-5 py-3 rounded-lg hover:bg-[#0037b0] transition-colors shadow-sm"
              >
                Register School Now
              </Link>
              <Link
                href="/api/docs"
                className="inline-flex items-center justify-center bg-white text-[#0b1c30] text-[14px] font-semibold px-5 py-3 rounded-lg hover:bg-[#e5eeff] transition-colors border border-[#c4c5d7]"
              >
                Documentation
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Institutional Footer ── */}
      <footer className="w-full bg-white border-t border-[#c4c5d7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-[#eff4ff]">
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-3">
                <EyeXLogo width={120} showTagline={false} />
                <span className="px-2 py-0.5 rounded bg-[#dce9ff] font-code-sm text-[11px] text-[#004870] font-semibold">
                  v4.8 Institutional
                </span>
              </div>
              <p className="text-[14px] text-[#434655] max-w-lg leading-relaxed">
                Certified national digital examination telemetry platform powering high-integrity invigilation and script tracking across Anglophone Cameroon Secondary Examination Centers.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-1 font-code-sm text-[11px] text-[#466083]">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8]" />
                  GCE Board Certified Specification
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8]" />
                  MINESEC Accredited Framework
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-code-sm text-[11px] text-[#0b1c30] font-bold uppercase tracking-wider">
                Supervision Portals
              </div>
              <ul className="space-y-1.5 text-[14px] text-[#434655]">
                <li><Link href="/hall-access" className="hover:text-[#0037b0] transition-colors">Invigilator Hall Code Access</Link></li>
                <li><Link href="/login" className="hover:text-[#0037b0] transition-colors">Center Chief Admin Login</Link></li>
                <li><Link href="/signup" className="hover:text-[#0037b0] transition-colors">New Examination Center Registry</Link></li>
                <li><Link href="/api/docs" className="hover:text-[#0037b0] transition-colors">Hardware Driver API Docs</Link></li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="font-code-sm text-[11px] text-[#0b1c30] font-bold uppercase tracking-wider">
                Institutional Protocol
              </div>
              <ul className="space-y-1.5 text-[13px] text-[#747686]">
                <li>General Certificate of Education (GCE) Board</li>
                <li>Ministry of Secondary Education (MINESEC)</li>
                <li>South West &amp; North West Regional Inspectorates</li>
                <li>Irregularity Incident Escrow &amp; Audit Logs</li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 font-code-sm text-[11px] text-[#747686]">
            <div>
              © 2025 Republic of Cameroon • Ministry of Secondary Education (MINESEC) &amp; GCE Board.
            </div>
            <div className="flex items-center gap-4">
              <span>EN 29001 Identity Assurance</span>
              <span>AES-256 Telemetry</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
