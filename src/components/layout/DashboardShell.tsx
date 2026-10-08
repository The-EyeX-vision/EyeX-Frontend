"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "./Sidebar";
import {
  TopNavbar,
  type ActiveSessionData,
  type NavbarAlertItem,
} from "./TopNavbar";
import type { Alert, MonitoringSession } from "@/types";

interface DashboardShellProps {
  schoolId: string;
  schoolName: string;
  schoolPrefix: string;
  userEmail: string;
  initialActiveSession: ActiveSessionData | null;
  initialAlerts: NavbarAlertItem[];
  children: React.ReactNode;
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
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [activeSession, setActiveSession] = useState<ActiveSessionData | null>(
    initialActiveSession,
  );
  const [alerts, setAlerts] = useState<NavbarAlertItem[]>(initialAlerts);

  // Initialize and persist sidebar collapse preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("eyex_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // localStorage may be restricted in private browsing
    }
  }, []);

  function toggleSidebarCollapse() {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("eyex_sidebar_collapsed", String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }

  // Real-time Supabase channels for sessions and alerts
  useEffect(() => {
    if (!schoolId) return;
    const supabase = createClient();

    const sessionsChannel = supabase
      .channel("dashboard-shell-sessions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "monitoring_sessions",
          filter: `school_id=eq.${schoolId}`,
        },
        async (payload) => {
          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            const updated = payload.new as MonitoringSession;
            if (updated.status === "active") {
              const { data: examData } = await supabase
                .from("exams")
                .select("id, title, room_number")
                .eq("id", updated.exam_id)
                .maybeSingle();
              setActiveSession({
                id: updated.id,
                exam_id: updated.exam_id,
                status: updated.status,
                started_at: updated.started_at,
                exam: examData || null,
              });
            } else if (activeSession?.id === updated.id) {
              setActiveSession(null);
            }
          } else if (payload.eventType === "DELETE") {
            if (activeSession?.id === (payload.old as { id: string })?.id) {
              setActiveSession(null);
            }
          }
        },
      )
      .subscribe();

    const alertsChannel = supabase
      .channel("dashboard-shell-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        async (payload) => {
          const newAlert = payload.new as Alert;
          let studentData = null;
          if (newAlert.student_id) {
            const { data: student } = await supabase
              .from("students")
              .select("full_name, student_number")
              .eq("id", newAlert.student_id)
              .maybeSingle();
            studentData = student;
          }
          setAlerts((prev) => [
            { ...newAlert, student: studentData },
            ...prev.slice(0, 19),
          ]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "alerts" },
        (payload) => {
          const updated = payload.new as Alert;
          setAlerts((prev) =>
            prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(alertsChannel);
    };
  }, [schoolId, activeSession?.id]);

  const flaggedCount = alerts.filter((a) => a.status === "FLAGGED").length;

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      {/* ─── Collapsible Institutional Sidebar ──────────────────────── */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        schoolName={schoolName}
        schoolPrefix={schoolPrefix}
        activeSession={activeSession}
        flaggedCount={flaggedCount}
      />

      {/* ─── Streamlined Top Navigation Header ──────────────────────── */}
      <TopNavbar
        schoolId={schoolId}
        schoolName={schoolName}
        schoolPrefix={schoolPrefix}
        userEmail={userEmail}
        activeSession={activeSession}
        alerts={alerts}
        isSidebarCollapsed={isCollapsed}
        onToggleSidebar={toggleSidebarCollapse}
        onOpenMobileMenu={() => setIsMobileOpen(true)}
      />

      {/* ─── Main Content Canvas (dynamically offset by sidebar width) ── */}
      <main
        className={`pt-20 min-h-screen transition-[padding-left] duration-300 ease-in-out ${
          isCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
