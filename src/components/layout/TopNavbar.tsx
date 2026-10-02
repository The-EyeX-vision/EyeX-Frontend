'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { signOutAction } from '@/app/actions/signout'
import { EyeXLogo } from '@/components/ui/EyeXLogo'
import type { Alert } from '@/types'

export interface ActiveSessionData {
  id: string
  exam_id: string
  status: string
  started_at: string
  exam?: {
    id: string
    title: string
    room_number: string
  } | null
}

export interface NavbarAlertItem extends Omit<Alert, 'student'> {
  student?: {
    full_name: string
    student_number: string
  } | null
}

export interface TopNavbarProps {
  schoolId: string
  schoolName: string
  schoolPrefix: string
  userEmail: string
  activeSession: ActiveSessionData | null
  alerts: NavbarAlertItem[]
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
  onOpenMobileMenu: () => void
}

export function TopNavbar({
  schoolName,
  schoolPrefix,
  userEmail,
  activeSession,
  alerts,
  isSidebarCollapsed,
  onToggleSidebar,
  onOpenMobileMenu,
}: TopNavbarProps) {
  const [isAlertsOpen, setIsAlertsOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [elapsed, setElapsed] = useState<string>('00:00:00')
  const alertsRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Timer for active session
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'active') return
    const startTime = new Date(activeSession.started_at).getTime()
    const updateTimer = () => {
      const diffSec = Math.max(0, Math.floor((Date.now() - startTime) / 1000))
      const hrs = String(Math.floor(diffSec / 3600)).padStart(2, '0')
      const mins = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0')
      const secs = String(diffSec % 60).padStart(2, '0')
      setElapsed(`${hrs}:${mins}:${secs}`)
    }
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [activeSession])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) setIsAlertsOpen(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setIsUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const flaggedCount = alerts.filter((a) => a.status === 'FLAGGED').length
  const initials = userEmail?.slice(0, 2).toUpperCase() ?? 'EX'

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-20 bg-white border-b border-[#c4c5d7] transition-[left] duration-300 ease-in-out left-0 ${
        isSidebarCollapsed ? 'lg:left-20' : 'lg:left-64'
      }`}
      style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.03)' }}
    >
      <div className="w-full h-full px-4 sm:px-6 lg:px-8">
        <div className="h-full flex items-center justify-between gap-4">

          {/* ── LEFT: Mobile hamburger + Desktop toggle + Station Ticker ─── */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {/* Mobile drawer hamburger */}
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 rounded-lg border border-[#c4c5d7] bg-white text-[#434655] hover:bg-[#eff4ff] transition-colors cursor-pointer shrink-0"
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            {/* Mobile Logo (visible only on mobile where sidebar is hidden) */}
            <div className="lg:hidden shrink-0">
              <Link href="/dashboard">
                <EyeXLogo width={96} showTagline={false} />
              </Link>
            </div>

            {/* Desktop collapse toggle button */}
            <button
              type="button"
              onClick={onToggleSidebar}
              className="hidden lg:flex items-center justify-center w-9 h-9 rounded-lg border border-[#c4c5d7] bg-white text-[#434655] hover:text-[#0037b0] hover:bg-[#eff4ff] transition-colors cursor-pointer shrink-0"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className={`w-4 h-4 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h10.5m-10.5 5.25h16.5" />
              </svg>
            </button>

            <div className="hidden sm:block w-px h-6 bg-[#c4c5d7] shrink-0" />

            {/* School identity & Active session ticker */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[#0b1c30] truncate max-w-[180px] sm:max-w-[260px]">
                  {schoolName}
                </span>
                <span className="font-code-sm bg-[#dce9ff] text-[#0037b0] px-1.5 py-0.2 rounded text-[11px] font-semibold shrink-0">
                  {schoolPrefix}
                </span>
              </div>
              {activeSession ? (
                <Link href={`/monitoring/${activeSession.id}`} className="flex items-center gap-1.5 group">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  <span className="text-[11px] text-emerald-700 font-semibold truncate max-w-[180px] sm:max-w-[280px] group-hover:underline">
                    Live: {activeSession.exam?.title ?? 'Active Session'} · {elapsed}
                  </span>
                </Link>
              ) : (
                <span className="text-[11px] text-[#747686] hidden sm:inline">Station Online · Supervision Ready</span>
              )}
            </div>
          </div>

          {/* ── RIGHT: Telemetry + Alerts + Emergency + User ──────────── */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">

            {/* Live telemetry indicator */}
            <div className="hidden md:flex items-center gap-2 bg-[#f8f9ff] border border-[#c4c5d7] px-2.5 py-1.5 rounded-lg">
              <span className="relative flex h-2 w-2">
                <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-code-sm text-[#434655] text-[10px] uppercase tracking-wider font-semibold">Online • Synced</span>
            </div>

            {/* Alerts bell */}
            <div className="relative" ref={alertsRef}>
              <button
                type="button"
                onClick={() => setIsAlertsOpen((p) => !p)}
                aria-expanded={isAlertsOpen}
                className={`relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[13px] font-medium transition-all cursor-pointer ${
                  flaggedCount > 0
                    ? 'border-[#fecaca] bg-[#fef2f2] text-[#ba1a1a]'
                    : 'border-[#c4c5d7] bg-white text-[#434655] hover:bg-[#eff4ff]'
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                {flaggedCount > 0 ? (
                  <span className="hidden sm:inline text-[#ba1a1a] font-semibold">{flaggedCount} Flagged</span>
                ) : (
                  <span className="hidden sm:inline">Alerts</span>
                )}
                {flaggedCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                )}
              </button>

              {/* Alerts Dropdown */}
              {isAlertsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-[#c4c5d7] bg-white shadow-xl overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5eeff] bg-[#f8f9ff]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[13px] text-[#0b1c30]">Current Alerts</span>
                      {flaggedCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#fef2f2] text-[#ba1a1a] border border-[#fecaca]">
                          {flaggedCount} Action Required
                        </span>
                      )}
                    </div>
                    <Link href="/alerts" onClick={() => setIsAlertsOpen(false)} className="text-[12px] text-[#0037b0] hover:underline font-medium">
                      Alert Center →
                    </Link>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#eff4ff]">
                    {alerts.length === 0 ? (
                      <div className="py-8 text-center text-[#747686] text-[13px]">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 mx-auto mb-2 text-[#c4c5d7]">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                        System clear. No active alerts.
                      </div>
                    ) : (
                      alerts.slice(0, 7).map((alert) => {
                        const isFlagged = alert.status === 'FLAGGED'
                        const sevBg = alert.severity === 'CRITICAL' ? 'bg-[#fef2f2] text-[#ba1a1a] border-[#fecaca]'
                          : alert.severity === 'HIGH' ? 'bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]'
                          : alert.severity === 'MEDIUM' ? 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]'
                          : 'bg-[#eff4ff] text-[#0037b0] border-[#bbd6ff]'
                        return (
                          <Link
                            key={alert.id}
                            href="/alerts"
                            onClick={() => setIsAlertsOpen(false)}
                            className={`block px-4 py-3 hover:bg-[#f8f9ff] transition-colors ${isFlagged ? 'bg-[#fef2f2]/30' : ''}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className={`font-code-sm text-[10px] px-1.5 py-0.5 rounded border font-bold ${sevBg}`}>
                                {alert.severity}
                              </span>
                              <span className="font-code-sm text-[11px] text-[#747686]">
                                {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[13px] font-semibold text-[#0b1c30] truncate">{alert.event_type.replace(/_/g, ' ')}</p>
                            <p className="text-[11px] text-[#747686] mt-0.5 truncate">
                              {alert.student?.full_name ?? 'Unknown Candidate'} · {alert.status}
                            </p>
                          </Link>
                        )
                      })
                    )}
                  </div>
                  <div className="px-4 py-2.5 border-t border-[#eff4ff] bg-[#f8f9ff] text-center">
                    <Link href="/alerts" onClick={() => setIsAlertsOpen(false)} className="text-[12px] text-[#0037b0] hover:underline font-medium">
                      View all incidents & actions →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-7 bg-[#c4c5d7] shrink-0" />

            {/* User profile dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((p) => !p)}
                className="flex items-center gap-2 pl-1 cursor-pointer"
              >
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-[13px] font-semibold text-[#0b1c30] leading-snug truncate max-w-[120px]">{userEmail?.split('@')[0] ?? 'Admin'}</span>
                  <span className="font-code-sm text-[11px] text-[#434655]">Chief Exam Officer</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#0037b0] flex items-center justify-center text-white text-[12px] font-bold">
                  {initials}
                </div>
              </button>
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-[#c4c5d7] bg-white shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-[#eff4ff]">
                    <p className="text-[13px] font-semibold text-[#0b1c30] truncate">{userEmail}</p>
                    <p className="text-[11px] text-[#747686] mt-0.5">{schoolName}</p>
                  </div>
                  <Link href="/settings" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-[#434655] hover:bg-[#eff4ff] hover:text-[#0037b0] transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Station Settings
                  </Link>
                  <div className="border-t border-[#eff4ff]">
                    <form action={signOutAction}>
                      <button type="submit" className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-[#ba1a1a] hover:bg-[#fef2f2] transition-colors cursor-pointer">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                        </svg>
                        Sign Out
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
