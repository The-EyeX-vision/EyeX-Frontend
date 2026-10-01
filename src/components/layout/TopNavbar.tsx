'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSidebar } from './SidebarContext'
import { createClient } from '@/lib/supabase/client'
import { signOutAction } from '@/app/actions/signout'
import type { Alert, MonitoringSession } from '@/types'

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

interface TopNavbarProps {
  schoolId: string
  schoolName: string
  schoolPrefix: string
  userEmail: string
  initialActiveSession: ActiveSessionData | null
  initialAlerts: NavbarAlertItem[]
}

export function TopNavbar({
  schoolId,
  schoolName,
  schoolPrefix,
  userEmail,
  initialActiveSession,
  initialAlerts,
}: TopNavbarProps) {
  const { isCollapsed, toggleCollapse, toggleMobile } = useSidebar()
  const [activeSession, setActiveSession] = useState<ActiveSessionData | null>(initialActiveSession)
  const [alerts, setAlerts] = useState<NavbarAlertItem[]>(initialAlerts)
  const [isAlertsOpen, setIsAlertsOpen] = useState(false)
  const [elapsed, setElapsed] = useState<string>('00:00:00')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Timer for active session
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'active') return

    const startTime = new Date(activeSession.started_at).getTime()

    const updateTimer = () => {
      const now = Date.now()
      const diffSec = Math.max(0, Math.floor((now - startTime) / 1000))
      const hrs = String(Math.floor(diffSec / 3600)).padStart(2, '0')
      const mins = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0')
      const secs = String(diffSec % 60).padStart(2, '0')
      setElapsed(`${hrs}:${mins}:${secs}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [activeSession])

  // Close alerts dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAlertsOpen(false)
      }
    }

    if (isAlertsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isAlertsOpen])

  // Real-time listener for monitoring sessions & alerts
  useEffect(() => {
    const supabase = createClient()

    // 1. Listen for sessions changes
    const sessionsChannel = supabase
      .channel('navbar-sessions-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'monitoring_sessions',
          filter: `school_id=eq.${schoolId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updated = payload.new as MonitoringSession
            if (updated.status === 'active') {
              // Fetch exam details for the active session
              const { data: examData } = await supabase
                .from('exams')
                .select('id, title, room_number')
                .eq('id', updated.exam_id)
                .maybeSingle()

              setActiveSession({
                id: updated.id,
                exam_id: updated.exam_id,
                status: updated.status,
                started_at: updated.started_at,
                exam: examData || null,
              })
            } else if (activeSession?.id === updated.id) {
              setActiveSession(null)
            }
          } else if (payload.eventType === 'DELETE') {
            if (activeSession?.id === (payload.old as { id: string })?.id) {
              setActiveSession(null)
            }
          }
        }
      )
      .subscribe()

    // 2. Listen for alerts changes
    const alertsChannel = supabase
      .channel('navbar-alerts-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
        },
        async (payload) => {
          const newAlert = payload.new as Alert
          let studentData = null

          if (newAlert.student_id) {
            const { data: student } = await supabase
              .from('students')
              .select('full_name, student_number')
              .eq('id', newAlert.student_id)
              .maybeSingle()
            studentData = student
          }

          const alertWithStudent: NavbarAlertItem = {
            ...newAlert,
            student: studentData,
          }

          setAlerts((prev) => [alertWithStudent, ...prev.slice(0, 19)])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          const updated = payload.new as Alert
          setAlerts((prev) =>
            prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sessionsChannel)
      supabase.removeChannel(alertsChannel)
    }
  }, [schoolId, activeSession?.id])

  const flaggedAlerts = alerts.filter((a) => a.status === 'FLAGGED')
  const unreviewedCount = flaggedAlerts.length

  return (
    <header className="sticky top-0 z-30 h-16 w-full border-b border-gray-800 bg-gray-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 transition-all">
      {/* ── Left Section: Sidebar Toggle & Active Exam Indicator ── */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {/* Mobile Hamburger Toggle (< lg) */}
        <button
          type="button"
          onClick={toggleMobile}
          aria-label="Open sidebar menu"
          className="lg:hidden p-2 rounded-lg border border-gray-800 bg-gray-800/60 text-gray-300 hover:text-white hover:bg-gray-800 transition-colors focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* Desktop Collapse Toggle (>= lg) */}
        <button
          type="button"
          onClick={toggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:flex p-2 rounded-lg border border-gray-800 bg-gray-800/40 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
          </svg>
        </button>

        {/* ── Current Examination Session Display ── */}
        {activeSession ? (
          <Link
            href={`/monitoring/${activeSession.id}`}
            className="group flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-emerald-800/70 bg-emerald-950/40 hover:bg-emerald-950/70 hover:border-emerald-600 transition-all max-w-[280px] sm:max-w-md md:max-w-xl truncate"
          >
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <div className="flex items-center gap-2 truncate">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex-shrink-0">
                Live Exam:
              </span>
              <span className="text-xs font-semibold text-white truncate group-hover:text-emerald-300 transition-colors">
                {activeSession.exam?.title ?? 'Active Session'}
              </span>
              <span className="hidden sm:inline-block text-[11px] font-mono text-gray-400 bg-gray-900/80 px-1.5 py-0.5 rounded border border-gray-800 flex-shrink-0">
                Room {activeSession.exam?.room_number ?? '1'}
              </span>
              <span className="hidden md:inline-block text-[11px] font-mono text-emerald-400/90 flex-shrink-0">
                {elapsed}
              </span>
            </div>
            <span className="hidden sm:inline-block text-xs text-emerald-400 font-bold ml-1 group-hover:translate-x-0.5 transition-transform">
              →
            </span>
          </Link>
        ) : (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-800 bg-gray-900/60 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-gray-600" />
            <span className="text-[11px] text-gray-400 font-medium">Standby • No Active Exam</span>
            <Link
              href="/exams"
              className="text-[11px] text-teal-400 hover:text-teal-300 font-medium ml-1 transition-colors"
            >
              Start Session &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* ── Right Section: Alerts Widget, School Info, User Profile ── */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* ── Current Alerts Dropdown Widget ── */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsAlertsOpen((prev) => !prev)}
            aria-expanded={isAlertsOpen}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all ${
              unreviewedCount > 0
                ? 'border-red-800/80 bg-red-950/30 text-red-200 hover:bg-red-950/50'
                : 'border-gray-800 bg-gray-850 hover:bg-gray-800 text-gray-300'
            }`}
          >
            {/* Bell Icon with badge */}
            <div className="relative">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unreviewedCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
              )}
            </div>

            <span className="hidden sm:inline text-xs font-semibold">
              {unreviewedCount > 0 ? (
                <span className="text-red-300">{unreviewedCount} Flagged</span>
              ) : (
                <span className="text-gray-400">Alerts</span>
              )}
            </span>

            {unreviewedCount > 0 && (
              <span className="sm:hidden px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-600 text-white">
                {unreviewedCount}
              </span>
            )}
          </button>

          {/* Interactive Alerts Popover */}
          {isAlertsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-gray-800 bg-gray-900 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between p-3.5 border-b border-gray-800 bg-gray-950/80">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-white">
                    Current Alerts
                  </span>
                  {unreviewedCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-red-950 text-red-300 border border-red-800">
                      {unreviewedCount} Action Required
                    </span>
                  )}
                </div>
                <Link
                  href="/alerts"
                  onClick={() => setIsAlertsOpen(false)}
                  className="text-[11px] text-teal-400 hover:text-teal-300 font-medium transition-colors"
                >
                  Alert Center →
                </Link>
              </div>

              {/* Alerts Scrollable Feed */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-800/60 p-1">
                {alerts.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 text-xs">
                    <p className="text-base mb-1">🛡️</p>
                    No alerts registered. System calm.
                  </div>
                ) : (
                  alerts.slice(0, 6).map((alert) => {
                    const isFlagged = alert.status === 'FLAGGED'
                    const sevColor =
                      alert.severity === 'CRITICAL'
                        ? 'text-red-400 bg-red-950/60 border-red-800'
                        : alert.severity === 'HIGH'
                        ? 'text-rose-400 bg-rose-950/60 border-rose-800'
                        : alert.severity === 'MEDIUM'
                        ? 'text-amber-400 bg-amber-950/60 border-amber-800'
                        : 'text-blue-400 bg-blue-950/60 border-blue-800'

                    return (
                      <Link
                        key={alert.id}
                        href="/alerts"
                        onClick={() => setIsAlertsOpen(false)}
                        className={`block p-3 rounded-lg hover:bg-gray-800/60 transition-colors ${
                          isFlagged ? 'bg-red-950/15' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${sevColor}`}>
                            {alert.severity}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-white mt-1.5 truncate">
                          {alert.event_type.replace(/_/g, ' ')}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
                          <span className="truncate">
                            {alert.student?.full_name ?? 'Candidate'}{' '}
                            <span className="font-mono text-gray-500">
                              ({alert.student?.student_number ?? 'Desk Unknown'})
                            </span>
                          </span>
                          <span className={`font-semibold ${isFlagged ? 'text-red-400' : 'text-gray-500'}`}>
                            {alert.status}
                          </span>
                        </div>
                      </Link>
                    )
                  })
                )}
              </div>

              {/* Popover Footer */}
              <div className="p-2.5 border-t border-gray-800 bg-gray-950 text-center">
                <Link
                  href="/alerts"
                  onClick={() => setIsAlertsOpen(false)}
                  className="text-xs text-teal-400 hover:text-teal-300 font-medium inline-flex items-center gap-1 transition-colors"
                >
                  View all incidents &amp; actions &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── Station Code Badge ── */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-teal-900/60 bg-teal-950/30 text-teal-400 font-mono text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
          <span>{schoolPrefix}</span>
        </div>

        {/* ── User Email & Sign Out ── */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-800">
          <span className="hidden xl:inline text-xs text-gray-400 max-w-[140px] truncate" title={userEmail}>
            {userEmail}
          </span>
          <form action={signOutAction}>
            <button
              type="submit"
              title="Sign out"
              className="p-1.5 rounded-lg border border-gray-800 hover:border-red-900 bg-gray-850 hover:bg-red-950/30 text-gray-400 hover:text-red-300 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
