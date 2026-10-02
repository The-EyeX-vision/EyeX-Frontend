'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOutAction } from '@/app/actions/signout'
import { useSidebar } from './SidebarContext'
import { EyeIcon } from '@/components/ui/Icons'

interface SidebarProps {
  schoolName: string
  schoolPrefix: string
  userEmail: string
}

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5 flex-shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    exact: true,
  },
  {
    href: '/classrooms',
    label: 'Examination Halls',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5 flex-shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.75a1.5 1.5 0 011.5-1.5h1.5a1.5 1.5 0 011.5 1.5V21m6-9.75h.75m-.75 3h.75m-.75 3h.75" />
      </svg>
    ),
  },
  {
    href: '/sessions',
    label: 'Exam Sessions',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5 flex-shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    href: '/monitoring',
    label: 'Live Monitoring',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5 flex-shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: '/violations',
    label: 'Violations & Evidence',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5 flex-shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5 flex-shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export function Sidebar({ schoolName, schoolPrefix, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const { isCollapsed, isMobileOpen, closeMobile, toggleCollapse } = useSidebar()

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* ── Mobile Backdrop Overlay ── */}
      {isMobileOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close sidebar menu"
          onClick={closeMobile}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter') closeMobile()
          }}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
        />
      )}

      {/* ── Sidebar Container ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 lg:static flex flex-col border-r border-gray-800 bg-gray-900/95 lg:bg-gray-900/80 h-full transition-all duration-300 ease-in-out ${
          isMobileOpen
            ? 'translate-x-0 w-64 shadow-2xl'
            : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-60'}`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0e5a4d] text-white shadow-sm flex-shrink-0"
              title="The Eye X"
            >
              <EyeIcon className="w-5 h-5 text-white" />
            </span>
            {(!isCollapsed || isMobileOpen) && (
              <div className="min-w-0 overflow-hidden">
                <p className="text-sm font-bold text-white leading-none truncate">EyeX</p>
                <p className="text-[10px] text-gray-500 leading-none mt-1 truncate" title={schoolName}>
                  {schoolName}
                </p>
              </div>
            )}
          </div>

          {/* Close button on Mobile */}
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close sidebar"
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* School Prefix Pill (expanded only) */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="px-4 py-2 border-b border-gray-800/60 bg-gray-950/40">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-teal-400 bg-teal-950/80 border border-teal-900 px-2 py-0.5 rounded w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              <span>{schoolPrefix}</span>
            </div>
          </div>
        )}

        {/* Navigation items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                title={isCollapsed && !isMobileOpen ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isCollapsed && !isMobileOpen ? 'justify-center' : ''
                } ${
                  active
                    ? 'bg-[#0e5a4d]/25 text-teal-300 border border-teal-800/60 shadow-xs'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/50'
                }`}
              >
                <span className={active ? 'text-teal-400' : 'text-gray-400'}>
                  {item.icon}
                </span>
                {(!isCollapsed || isMobileOpen) && (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-800 space-y-2 bg-gray-950/30">
          {(!isCollapsed || isMobileOpen) && (
            <div className="px-2 py-1">
              <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Invigilator</p>
              <p className="text-xs text-gray-400 truncate mt-0.5" title={userEmail}>
                {userEmail}
              </p>
            </div>
          )}

          {/* Desktop mini toggle button */}
          <div className="hidden lg:flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={toggleCollapse}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={`w-full flex items-center gap-2 py-1.5 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors border border-gray-800/80 ${
                isCollapsed ? 'justify-center' : ''
              }`}
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
              {!isCollapsed && <span>Collapse Sidebar</span>}
            </button>
          </div>

          <form action={signOutAction}>
            <button
              type="submit"
              title={isCollapsed && !isMobileOpen ? 'Sign Out' : undefined}
              className={`w-full flex items-center gap-2 py-2 px-3 text-xs text-gray-400 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors border border-gray-800/80 hover:border-red-900 ${
                isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4 flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              {(!isCollapsed || isMobileOpen) && <span>Sign Out</span>}
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
