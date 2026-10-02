'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { EyeXLogo } from '@/components/ui/EyeXLogo'
import { signOutAction } from '@/app/actions/signout'
import type { ActiveSessionData } from './TopNavbar'

interface SidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  isMobileOpen: boolean
  onCloseMobile: () => void
  schoolName: string
  schoolPrefix: string
  activeSession: ActiveSessionData | null
  flaggedCount?: number
}

interface NavItem {
  href: string
  label: string
  exact?: boolean
  badge?: string | number
  badgeColor?: string
  icon: (active: boolean) => React.ReactNode
}

interface NavGroup {
  groupLabel: string
  items: NavItem[]
}

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  schoolName,
  schoolPrefix,
  activeSession,
  flaggedCount = 0,
}: SidebarProps) {
  const pathname = usePathname()

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const navGroups: NavGroup[] = [
    {
      groupLabel: 'SUPERVISION',
      items: [
        {
          href: '/dashboard',
          label: 'Dashboard',
          exact: true,
          icon: (active) => (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={active ? 2 : 1.75}
              className="w-5 h-5 shrink-0"
            >
              <rect x="3" y="3" width="7" height="9" rx="1.5" />
              <rect x="14" y="3" width="7" height="5" rx="1.5" />
              <rect x="14" y="12" width="7" height="9" rx="1.5" />
              <rect x="3" y="16" width="7" height="5" rx="1.5" />
            </svg>
          ),
        },
        {
          href: '/monitoring',
          label: 'Live Monitoring',
          badge: activeSession ? 'LIVE' : undefined,
          badgeColor: 'bg-emerald-500 text-white',
          icon: (active) => (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={active ? 2 : 1.75}
              className="w-5 h-5 shrink-0"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          ),
        },
        {
          href: '/classrooms',
          label: 'Examination Halls',
          icon: (active) => (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={active ? 2 : 1.75}
              className="w-5 h-5 shrink-0"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m16.5-18v18M6.75 6.75h10.5M6.75 11.25h10.5m-10.5 4.5h10.5M9.75 21V15.75a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21" />
            </svg>
          ),
        },
        {
          href: '/sessions',
          label: 'Exams & Sessions',
          icon: (active) => (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={active ? 2 : 1.75}
              className="w-5 h-5 shrink-0"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
            </svg>
          ),
        },
        {
          href: '/students',
          label: 'Candidate Roster',
          icon: (active) => (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={active ? 2 : 1.75}
              className="w-5 h-5 shrink-0"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          ),
        },
      ],
    },
    {
      groupLabel: 'INTEGRITY & AUDITS',
      items: [
        {
          href: '/violations',
          label: 'Evidence Record',
          badge: flaggedCount > 0 ? flaggedCount : undefined,
          badgeColor: 'bg-[#ba1a1a] text-white',
          icon: (active) => (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={active ? 2 : 1.75}
              className="w-5 h-5 shrink-0"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
            </svg>
          ),
        },
        {
          href: '/alerts',
          label: 'Alert Center',
          icon: (active) => (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={active ? 2 : 1.75}
              className="w-5 h-5 shrink-0"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          ),
        },
      ],
    },
    {
      groupLabel: 'SYSTEM',
      items: [
        {
          href: '/settings',
          label: 'Station Settings',
          icon: (active) => (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={active ? 2 : 1.75}
              className="w-5 h-5 shrink-0"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
      ],
    },
  ]

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white text-[#0b1c30]">
      {/* ─── Header: Brand + Collapse Toggle ────────────────────────────── */}
      <div className={`h-20 flex items-center border-b border-[#c4c5d7] shrink-0 transition-all ${
        isCollapsed ? 'justify-center px-2' : 'justify-between px-5'
      }`}>
        {isCollapsed ? (
          <Link href="/dashboard" className="flex items-center justify-center p-1 rounded-lg hover:bg-[#eff4ff] transition-colors" title="EyeX Examination Monitor">
            <EyeXLogo variant="icon" width={34} />
          </Link>
        ) : (
          <>
            <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0" onClick={onCloseMobile}>
              <EyeXLogo width={128} showTagline={false} />
            </Link>
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-[#747686] hover:text-[#0b1c30] hover:bg-[#eff4ff] transition-colors cursor-pointer"
              title="Collapse sidebar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* ─── Middle: Navigation Groups ─────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.groupLabel} className="space-y-1">
            {/* Section label (expanded only) */}
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#747686] mb-1.5 select-none">
                {group.groupLabel}
              </p>
            )}

            {group.items.map((item) => {
              const active = isActive(item.href, item.exact)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  title={isCollapsed ? item.label : undefined}
                  className={`group relative flex items-center rounded-xl transition-all ${
                    isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 gap-3'
                  } ${
                    active
                      ? 'bg-[#0037b0] text-white font-semibold shadow-xs'
                      : 'text-[#434655] hover:text-[#0b1c30] hover:bg-[#eff4ff]'
                  }`}
                >
                  {/* Left active marker (when collapsed) */}
                  {isCollapsed && active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#0037b0] rounded-r-full" />
                  )}

                  {/* Icon */}
                  <span className={`${active ? 'text-white' : 'text-[#434655] group-hover:text-[#0037b0]'} transition-colors`}>
                    {item.icon(active)}
                  </span>

                  {/* Label (expanded only) */}
                  {!isCollapsed && (
                    <span className="text-[13px] leading-tight truncate flex-1">
                      {item.label}
                    </span>
                  )}

                  {/* Badges */}
                  {!isCollapsed && item.badge && (
                    <span
                      className={`font-code-sm text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                        item.badgeColor ?? 'bg-[#dce9ff] text-[#0037b0]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Collapsed dot badge */}
                  {isCollapsed && item.badge && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ba1a1a] ring-2 ring-white" />
                  )}

                  {/* Tooltip for collapsed state on hover */}
                  {isCollapsed && (
                    <div className="hidden group-hover:lg:block absolute left-full ml-3 px-2.5 py-1.5 bg-[#0b1c30] text-white text-[12px] font-medium rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none">
                      {item.label}
                      {item.badge && (
                        <span className="ml-1.5 font-code-sm text-[10px] text-amber-300">
                          ({item.badge})
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ─── Footer: School Context & Expand button ────────────────────── */}
      <div className={`border-t border-[#c4c5d7] p-3 shrink-0 bg-[#f8f9ff] ${
        isCollapsed ? 'flex flex-col items-center gap-2' : ''
      }`}>
        {isCollapsed ? (
          <>
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              className="hidden lg:flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-[#c4c5d7] text-[#0037b0] hover:bg-[#eff4ff] transition-colors cursor-pointer"
              title="Expand sidebar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            <div className="w-8 h-8 rounded-lg bg-[#dce9ff] text-[#0037b0] font-bold text-[11px] flex items-center justify-center font-code-sm" title={schoolName}>
              {schoolPrefix.slice(0, 3)}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-[#0b1c30] truncate">{schoolName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-code-sm text-[10px] font-semibold text-[#0037b0] bg-[#dce9ff] px-1.5 py-0.2 rounded">
                  {schoolPrefix}
                </span>
                <span className="text-[11px] text-[#747686]">Centre Station</span>
              </div>
            </div>

            <form action={signOutAction} className="shrink-0">
              <button
                type="submit"
                aria-label="Sign Out"
                title="Sign out of station"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#747686] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* ─── Desktop Fixed Left Sidebar ─────────────────────────────────── */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 bottom-0 z-40 bg-white border-r border-[#c4c5d7] flex-col transition-[width] duration-300 ease-in-out shadow-xs ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* ─── Mobile Slide-out Drawer ─────────────────────────────────────── */}
      {isMobileOpen && (
        <>
          {/* Overlay */}
          <div
            role="button"
            tabIndex={0}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 lg:hidden transition-opacity"
            onClick={onCloseMobile}
            onKeyDown={(e) => {
              if (e.key === 'Escape' || e.key === 'Enter') onCloseMobile()
            }}
            aria-label="Close navigation"
          />

          {/* Drawer container */}
          <aside className="fixed left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white z-50 lg:hidden shadow-2xl flex flex-col transform transition-transform duration-300 ease-out">
            <div className="flex items-center justify-between px-5 h-20 border-b border-[#c4c5d7] shrink-0">
              <EyeXLogo width={120} showTagline={false} />
              <button
                type="button"
                onClick={onCloseMobile}
                className="w-9 h-9 rounded-lg text-[#747686] hover:bg-[#eff4ff] flex items-center justify-center cursor-pointer"
                aria-label="Close menu"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {sidebarContent}
            </div>
          </aside>
        </>
      )}
    </>
  )
}
