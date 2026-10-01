'use client'

import React from 'react'
import { SidebarProvider } from './SidebarContext'
import { Sidebar } from './Sidebar'
import { TopNavbar, type ActiveSessionData, type NavbarAlertItem } from './TopNavbar'

interface DashboardShellProps {
  schoolId: string
  schoolName: string
  schoolPrefix: string
  userEmail: string
  initialActiveSession: ActiveSessionData | null
  initialAlerts: NavbarAlertItem[]
  children: React.ReactNode
}

export function DashboardShell({
  schoolId,
  schoolName,
  schoolPrefix,
  userEmail,
  initialActiveSession,
  initialAlerts,
  children,
}: DashboardShellProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden selection:bg-teal-900 selection:text-teal-100">
        {/* Responsive Collapsible Sidebar */}
        <Sidebar
          schoolName={schoolName}
          schoolPrefix={schoolPrefix}
          userEmail={userEmail}
        />

        {/* Main Content Area with Top Navbar */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopNavbar
            schoolId={schoolId}
            schoolName={schoolName}
            schoolPrefix={schoolPrefix}
            userEmail={userEmail}
            initialActiveSession={initialActiveSession}
            initialAlerts={initialAlerts}
          />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
