"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EyeXLogo } from "@/components/ui/EyeXLogo";

export default function HallAccessPage() {
  const router = useRouter();
  const [code, setCode] = useState<string[]>(Array(8).fill(""));
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState<{
    hallName: string;
    classroomId: string;
  } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const fullCode = code.join("");

  // Auto-submit when all 8 chars filled
  useEffect(() => {
    if (fullCode.length === 8 && !isVerifying && !verified) {
      handleVerify();
    }
  }, [fullCode]);

  function handleCellChange(idx: number, value: string) {
    const char = value
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase()
      .slice(-1);
    const next = [...code];
    next[idx] = char;
    setCode(next);
    setError(null);
    if (char && idx < 7) {
      inputRefs.current[idx + 1]?.focus();
    }
  }

  function handleCellKeyDown(
    idx: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && idx > 0) inputRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 7) inputRefs.current[idx + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase()
      .slice(0, 8);
    const next = Array(8).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setCode(next);
    const focusIdx = Math.min(pasted.length, 7);
    inputRefs.current[focusIdx]?.focus();
  }

  async function handleVerify() {
    if (fullCode.length < 8) {
      setError("Please enter all 8 characters of your hall access code.");
      return;
    }
    setIsVerifying(true);
    setError(null);
    try {
      const res = await fetch("/api/hall-access/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: fullCode, access_code: fullCode }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(
          data.error ||
            "Invalid or expired access code. Please check your assignment slip.",
        );
        setIsVerifying(false);
        return;
      }
      const classroomId = data.classroomId || data.classroom?.id;
      const hallName =
        data.hallName || data.classroom?.name || "Examination Hall";
      if (!classroomId) {
        setError(
          "Verification succeeded but hall ID was missing. Please try again.",
        );
        setIsVerifying(false);
        return;
      }
      setVerified({ hallName, classroomId });
    } catch {
      setError("Network error. Please try again.");
      setIsVerifying(false);
    }
  }

  function handleEnterHall() {
    if (verified?.classroomId) router.push(`/hall/${verified.classroomId}`);
  }

  function handleReset() {
    setCode(Array(8).fill(""));
    setVerified(null);
    setError(null);
    inputRefs.current[0]?.focus();
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      {/* Top header strip */}
      <header
        className="w-full bg-white border-b border-[#c4c5d7]"
        style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}
      >
        <div className="w-full px-4 sm:px-8 h-20 max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/">
            <EyeXLogo width={130} showTagline={false} />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-[14px] font-medium text-[#434655]">
            <Link href="/" className="hover:text-[#0b1c30] transition-colors">
              Home
            </Link>
            <Link
              href="/#about"
              className="hover:text-[#0b1c30] transition-colors"
            >
              About
            </Link>
            <span className="text-[#0037b0] font-semibold">
              Invigilator Hall Code
            </span>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-white border border-[#c4c5d7] px-2.5 py-1 rounded-lg">
              <span className="relative flex h-2 w-2">
                <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-code-sm text-[10px] text-[#434655] uppercase tracking-wider">
                Online · Synced
              </span>
            </div>
            <Link
              href="/login"
              className="hidden sm:inline-flex text-[14px] font-medium text-[#434655] hover:text-[#0b1c30] px-3 py-2 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="hidden sm:inline-flex bg-[#1d4ed8] text-white text-[14px] font-semibold px-4 py-2 rounded-lg hover:bg-[#0037b0] transition-colors shadow-sm"
            >
              Register
            </Link>

            {/* Mobile hamburger button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg border border-[#c4c5d7] text-[#434655] hover:bg-[#eff4ff] transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#e5eeff] bg-white px-4 py-4 space-y-3 shadow-lg">
            <div className="flex flex-col space-y-2 text-[14px] font-medium">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-[#434655] hover:bg-[#eff4ff] transition-colors"
              >
                Home
              </Link>
              <Link
                href="/#about"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-[#434655] hover:bg-[#eff4ff] transition-colors"
              >
                About
              </Link>
              <span className="px-3 py-2 rounded-lg text-[#0037b0] bg-[#eff4ff] font-semibold">
                Invigilator Hall Code
              </span>
            </div>
            <div className="pt-2 border-t border-[#eff4ff] flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg border border-[#c4c5d7] text-[14px] font-medium text-[#434655]"
              >
                Login
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg bg-[#1d4ed8] text-white text-[14px] font-semibold"
              >
                Register School
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="w-full px-4 sm:px-8 py-10 max-w-xl mx-auto flex flex-col items-center">
        {/* Centralized Fast Access Portal Card */}
        <div className="w-full flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 relative overflow-hidden text-center">
            {/* Ambient glow */}
            <div className="absolute -right-12 -top-12 w-44 h-44 bg-[#dce9ff] rounded-full blur-2xl pointer-events-none opacity-60" />

            <div className="relative z-10 flex flex-col gap-6">
              <div>
                <h2 className="font-headline-md text-xl sm:text-2xl text-[#0b1c30] tracking-tight font-bold">
                  Enter Examination Hall Access Code
                </h2>
                <p className="text-[14px] text-[#434655] mt-1.5 leading-relaxed">
                  Enter the 8-character access code issued to you by the
                  examiner.
                </p>
              </div>

              {/* 8-cell token input */}
              <div>
                <label className="font-code-sm text-[10px] text-[#747686] uppercase tracking-wider font-semibold block mb-2">
                  8-Character Access Code
                </label>
                <div
                  className="mt-1 grid grid-cols-8 gap-1 sm:gap-2 items-center"
                  onPaste={handlePaste}
                >
                  {code.map((char, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="text"
                      maxLength={1}
                      value={char}
                      onChange={(e) => handleCellChange(idx, e.target.value)}
                      onKeyDown={(e) => handleCellKeyDown(idx, e)}
                      className={`h-11 sm:h-14 w-full text-center font-code-lg text-[15px] sm:text-[18px] px-0 font-bold rounded-lg uppercase transition-all shadow-inner focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] ${
                        verified
                          ? "bg-emerald-50 text-emerald-700 ring-2 ring-emerald-400"
                          : "bg-[#eff4ff] text-[#0037b0] focus:bg-white"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Verification status */}
              {verified && (
                <div className="bg-[#eff4ff] p-3 rounded-lg flex items-center justify-between gap-2 text-left">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[13px] font-semibold text-[#0b1c30]">
                      Code Verified: {verified.hallName}
                    </span>
                  </div>
                  <span className="font-code-sm text-[11px] text-emerald-700 bg-white px-2 py-0.5 rounded font-bold">
                    MATCH
                  </span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-[#fef2f2] border border-[#fecaca] rounded-lg text-left">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="w-4 h-4 text-[#b91c1c] shrink-0"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                    />
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
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        className="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={handleReset}
                      className="w-full bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0037b0] py-3 px-4 rounded-lg text-[13px] font-semibold transition-all"
                    >
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
                        <svg
                          className="w-4 h-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                          />
                        </svg>
                        Verifying Code...
                      </>
                    ) : (
                      "Verify Hall Access Code"
                    )}
                  </button>
                )}
              </div>

              {/* Security note */}
              <div className="p-3 bg-[#eff4ff] rounded-lg flex items-center justify-center gap-2.5">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  className="w-5 h-5 text-[#0037b0] shrink-0"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
                <div className="text-left">
                  <span className="text-[13px] font-semibold text-[#0b1c30]">
                    No account required
                  </span>
                  <p className="text-[12px] text-[#434655] mt-0.5 leading-snug">
                    Your session is tied directly to the hall until the
                    examination officially concludes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Admin login link */}
          <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between gap-4">
            <div className="flex flex-col text-left">
              <span className="text-[13px] font-semibold text-[#0b1c30]">
                School Administration?
              </span>
              <span className="text-[12px] text-[#747686]">
                Access the full dashboard
              </span>
            </div>
            <Link
              href="/login"
              className="flex items-center gap-1.5 text-[13px] font-semibold text-[#1d4ed8] hover:underline"
            >
              Sign In
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
