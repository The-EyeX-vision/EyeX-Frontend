import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Radio, Building2, Shield, Users } from "lucide-react";
import type { Classroom, HallSession, Violation } from "@/types";

export const dynamic = "force-dynamic";

interface DashboardData {
  schoolName: string;
  totalHalls: number;
  activeSessionsCount: number;
  totalViolationsToday: number;
  totalViolations: number;
  halls: (Classroom & { active_session?: HallSession | null })[];
  recentViolations: (Violation & {
    session?: { course_name: string } | null;
  })[];
}

async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: school } = await supabase
    .from("schools")
    .select("id, school_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!school) {
    return {
      schoolName: "Institution",
      totalHalls: 0,
      activeSessionsCount: 0,
      totalViolationsToday: 0,
      totalViolations: 0,
      halls: [],
      recentViolations: [],
    };
  }

  const { data: rawHalls } = await supabase
    .from("classrooms")
    .select("*")
    .eq("school_id", school.id)
    .order("created_at", { ascending: false });

  let halls: Classroom[] = rawHalls ?? [];

  if (halls.length === 0) {
    const demoHalls = [
      { school_id: school.id, name: "Main Hall A", access_code: "7K4P92XM" },
      {
        school_id: school.id,
        name: "Science Auditorium",
        access_code: "9X2M4K7P",
      },
    ];
    const { data: inserted } = await supabase
      .from("classrooms")
      .insert(demoHalls)
      .select();
    if (inserted) halls = inserted;
  }

  const { data: sessions } = await supabase
    .from("exam_hall_sessions")
    .select("*")
    .eq("school_id", school.id);

  const activeSessions = (sessions ?? []).filter((s) => s.status === "ACTIVE");

  const hallsWithSession = halls.map((hall) => ({
    ...hall,
    active_session:
      activeSessions.find((s) => s.classroom_id === hall.id) || null,
  }));

  const sessionIds = (sessions ?? []).map((s) => s.id);
  let violations: (Violation & { session?: { course_name: string } | null })[] =
    [];

  if (sessionIds.length > 0) {
    const { data: vList } = await supabase
      .from("violations")
      .select("*, session:exam_hall_sessions(course_name)")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false })
      .limit(8);
    if (vList) violations = vList as unknown as typeof violations;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayViolations = violations.filter(
    (v) => new Date(v.created_at) >= today,
  );

  return {
    schoolName: school.school_name,
    totalHalls: halls.length,
    activeSessionsCount: activeSessions.length,
    totalViolationsToday: todayViolations.length,
    totalViolations: violations.length,
    halls: hallsWithSession,
    recentViolations: violations,
  };
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE")
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        IN PROGRESS
      </span>
    );
  if (status === "SCHEDULED")
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#eff4ff] text-[#0037b0]">
        SCHEDULED
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#f8f9ff] text-[#747686] border border-[#c4c5d7]">
      READY
    </span>
  );
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  const metrics = [
    {
      label: "Examination Halls",
      value: data.totalHalls,
      sublabel: "Configured",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.75a1.5 1.5 0 011.5-1.5h1.5a1.5 1.5 0 011.5 1.5V21m6-9.75h.75m-.75 3h.75m-.75 3h.75"
          />
        </svg>
      ),
      iconBg: "bg-[#eff4ff] text-[#0037b0]",
      progress: 100,
      progressColor: "bg-[#1d4ed8]",
      href: "/classrooms",
    },
    {
      label: "Exams In Progress",
      value: data.activeSessionsCount,
      sublabel: "Active Sessions",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      iconBg: "bg-emerald-100 text-emerald-700",
      progress:
        data.totalHalls > 0
          ? Math.round((data.activeSessionsCount / data.totalHalls) * 100)
          : 0,
      progressColor: "bg-emerald-500",
      href: "/monitoring",
    },
    {
      label: "Today's Violations",
      value: data.totalViolationsToday,
      sublabel: "Detected Today",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3l1.664 1.664M21 21l-1.5-1.5m-5.485-1.242L12 17.25 4.5 21V8.742m.164-4.078a2.15 2.15 0 011.743-1.342 48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185V19.5M4.664 4.664L19.5 19.5"
          />
        </svg>
      ),
      iconBg: "bg-[#fef2f2] text-[#b91c1c]",
      progress: 0,
      progressColor: "bg-[#ba1a1a]",
      href: "/violations",
    },
    {
      label: "All Violations",
      value: data.totalViolations,
      sublabel: "Total Logged",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      ),
      iconBg: "bg-[#fffbeb] text-[#b45309]",
      progress: 0,
      progressColor: "bg-amber-400",
      href: "/violations",
    },
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <section className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-code-sm text-[11px] text-[#0037b0] uppercase tracking-widest bg-[#e5eeff] px-2 py-0.5 rounded">
              {data.schoolName}
            </span>
          </div>
          <h1 className="font-headline-xl text-[#0b1c30] tracking-tight">
            School Examination Overview
          </h1>
          {/* <p className="text-[14px] text-[#434655]">
            Real-time hall status, active session monitoring, and violation
            intelligence.
          </p> */}
          <div className="flex items-center gap-2 mt-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#dce9ff] rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-code-sm text-[11px] text-[#0b1c30] font-semibold">
                {data.totalHalls} Halls · {data.activeSessionsCount} Active
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto">
          <Link
            href="/classrooms"
            className="flex items-center gap-2 bg-[#eff4ff] text-[#0037b0] font-medium px-4 py-2.5 rounded-lg text-[14px] hover:bg-[#e5eeff] transition-colors shadow-sm"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Manage Halls
          </Link>
          <Link
            href="/sessions"
            className="flex items-center gap-2 bg-[#1d4ed8] text-white font-medium px-4 py-2.5 rounded-lg text-[14px] hover:bg-[#0037b0] transition-colors shadow-sm"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Schedule New Examination
          </Link>
        </div>
      </section>

      {/* ── 4 Metric Tiles ──────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Link
            key={m.label}
            href={m.href}
            className="bg-white p-4 rounded-xl shadow-sm flex flex-col justify-between gap-3 hover:shadow-md transition-shadow group"
          >
            {/* Top row: icon + label */}
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.iconBg}`}>
                {m.icon}
              </div>
              <span className="font-code-sm text-[11px] uppercase tracking-wider text-[#466083] font-semibold">
                {m.label}
              </span>
            </div>
            {/* Bottom row: figures on left, circular ring on right */}
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="font-headline-xl text-[#0b1c30]">
                  {m.value}
                </span>
                <span className="font-code-sm text-[12px] text-[#466083] font-semibold">
                  {m.sublabel}
                </span>
              </div>
              {/* Circular Progress Ring */}
              <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90 shrink-0">
                {/* Track */}
                <circle
                  cx="24" cy="24" r="18"
                  fill="none"
                  stroke="#eff4ff"
                  strokeWidth="5"
                />
                {/* Progress */}
                <circle
                  cx="24" cy="24" r="18"
                  fill="none"
                  strokeWidth="5"
                  strokeLinecap="round"
                  style={{
                    stroke: m.progressColor.startsWith('bg-[#') ? m.progressColor.replace('bg-[#', '#').replace(']', '') : undefined,
                    strokeDasharray: `${2 * Math.PI * 18}`,
                    strokeDashoffset: `${2 * Math.PI * 18 * (1 - (m.progress || (m.value > 0 ? 60 : 5)) / 100)}`,
                    transition: 'stroke-dashoffset 0.5s ease',
                  }}
                />
              </svg>
            </div>
          </Link>
        ))}
      </section>

      {/* ── Live Hall Status ─────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              className="w-5 h-5 text-[#0037b0]"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-7.5A2.25 2.25 0 0013.5 6.75h-9a2.25 2.25 0 00-2.25 2.25v7.5A2.25 2.25 0 004.5 18.75z"
              />
            </svg>
            <h2 className="font-headline-md text-[#0b1c30]">
              Live Examination Halls Status
            </h2>
            <span className="font-code-sm text-[11px] bg-[#e5eeff] text-[#0037b0] px-2 py-0.5 rounded font-semibold">
              Active Roster
            </span>
          </div>
          <Link
            href="/classrooms"
            className="text-[13px] text-[#0037b0] hover:underline font-semibold flex items-center gap-1"
          >
            Manage Halls
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
          </Link>
        </div>

        {data.halls.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <p className="text-[14px] text-[#747686]">
              No halls configured yet.
            </p>
            <Link
              href="/classrooms"
              className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-[#1d4ed8] font-semibold hover:underline"
            >
              Register your first hall →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.halls.map((hall) => {
              const session = hall.active_session;
              const isActive = session?.status === "ACTIVE";
              return (
                <div
                  key={hall.id}
                  className="bg-white rounded-xl shadow-sm p-4 flex flex-col justify-between gap-4"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-headline-md text-[#0b1c30]">
                          {hall.name}
                        </span>
                        <StatusBadge status={isActive ? "ACTIVE" : "READY"} />
                      </div>
                      <span className="font-code-sm text-[11px] text-[#747686]">
                        {hall.access_code}
                      </span>
                    </div>
                    {session ? (
                      <p className="text-[14px] font-semibold text-[#1d4ed8] mt-1">
                        {session.course_name}
                      </p>
                    ) : (
                      <p className="text-[14px] text-[#747686] mt-1">
                        No active examination
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between bg-[#f8f9ff] p-2.5 rounded-lg">
                    {session ? (
                      <>
                        <span className="font-code-sm text-[11px] text-[#434655]">
                          {session.expected_students} candidates expected
                        </span>
                        <Link
                          href={`/monitoring`}
                          className="font-code-sm text-[11px] text-[#0037b0] font-semibold hover:underline"
                        >
                          Monitor →
                        </Link>
                      </>
                    ) : (
                      <>
                        <span className="font-code-sm text-[11px] text-[#747686]">
                          Ready for examination
                        </span>
                        <Link
                          href="/sessions"
                          className="font-code-sm text-[11px] text-[#0037b0] font-semibold hover:underline"
                        >
                          Schedule →
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Recent Violations ────────────────────────────────────────── */}
      {data.recentViolations.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                className="w-5 h-5 text-[#b91c1c]"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3l1.664 1.664M21 21l-1.5-1.5m-5.485-1.242L12 17.25 4.5 21V8.742m.164-4.078a2.15 2.15 0 011.743-1.342 48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185V19.5M4.664 4.664L19.5 19.5"
                />
              </svg>
              <h2 className="font-headline-md text-[#0b1c30]">
                Recent Flagged Activities
              </h2>
            </div>
            <Link
              href="/violations"
              className="text-[13px] text-[#0037b0] hover:underline font-semibold"
            >
              View Full Ledger →
            </Link>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#eff4ff]">
                <tr className="font-code-sm text-[11px] text-[#747686] uppercase tracking-wider">
                  <th className="py-3 px-4">Activity</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Session</th>
                  <th className="py-3 px-4 hidden md:table-cell">Status</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff4ff]">
                {data.recentViolations.map((v) => {
                  const sevColor =
                    v.severity === "CRITICAL"
                      ? "bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]"
                      : v.severity === "HIGH"
                        ? "bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]"
                        : v.severity === "MEDIUM"
                          ? "bg-[#fffbeb] text-[#b45309] border-[#fde68a]"
                          : "bg-[#eff4ff] text-[#0037b0] border-[#bbd6ff]";
                  const statusColor =
                    v.status === "CONFIRMED"
                      ? "text-[#b91c1c]"
                      : v.status === "DISMISSED"
                        ? "text-[#747686]"
                        : "text-amber-600";
                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-[#f8f9ff] transition-colors"
                    >
                      <td className="py-3 px-4 text-[13px] font-medium text-[#0b1c30] truncate max-w-[180px]">
                        {v.activity_type.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-code-sm text-[10px] px-1.5 py-0.5 rounded border font-bold ${sevColor}`}
                        >
                          {v.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[13px] text-[#434655] hidden sm:table-cell truncate max-w-[140px]">
                        {v.session?.course_name ?? "—"}
                      </td>
                      <td
                        className={`py-3 px-4 text-[13px] font-semibold hidden md:table-cell ${statusColor}`}
                      >
                        {v.status}
                      </td>
                      <td className="py-3 px-4 font-code-sm text-[11px] text-[#747686] hidden lg:table-cell">
                        {new Date(v.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Quick Links Footer ───────────────────────────────────────── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/monitoring", label: "Live Monitoring", icon: <Radio className="w-5 h-5" /> },
          { href: "/classrooms", label: "Examination Halls", icon: <Building2 className="w-5 h-5" /> },
          { href: "/violations", label: "Evidence Record", icon: <Shield className="w-5 h-5" /> },
          { href: "/students", label: "Candidate Roster", icon: <Users className="w-5 h-5" /> },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-white border border-[#e5eeff] rounded-xl p-4 flex flex-col items-center gap-2 text-center hover:bg-[#eff4ff] hover:border-[#bbd6ff] transition-all shadow-sm group"
          >
            <span className="text-[#0037b0]">{link.icon}</span>
            <p className="text-[13px] font-semibold text-[#0037b0] group-hover:underline">
              {link.label}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
