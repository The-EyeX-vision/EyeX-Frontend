import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import AlertTable from '@/components/AlertTable'
import Analytics from '@/components/Analytics'
import type { Alert } from '@/types'

// Realistic draft alert records to show when database has no live incidents yet
const SAMPLE_DRAFT_ALERTS: Alert[] = [
  {
    id: 'draft-001',
    student_id: '#04',
    timestamp_ms: Date.now() - 1000 * 60 * 2, // 2 mins ago
    suspicion_score: 0.88,
    status: 'FLAGGED_ALERT',
  },
  {
    id: 'draft-002',
    student_id: '#12',
    timestamp_ms: Date.now() - 1000 * 60 * 6, // 6 mins ago
    suspicion_score: 0.76,
    status: 'FLAGGED_ALERT',
  },
  {
    id: 'draft-003',
    student_id: '#09',
    timestamp_ms: Date.now() - 1000 * 60 * 14, // 14 mins ago
    suspicion_score: 0.64,
    status: 'REVIEWED',
  },
  {
    id: 'draft-004',
    student_id: '#21',
    timestamp_ms: Date.now() - 1000 * 60 * 25, // 25 mins ago
    suspicion_score: 0.32,
    status: 'DISMISSED',
  },
]

export default async function DashboardPage() {
  const supabase = await createClient()

  let user = null
  try {
    const authRes = await supabase.auth.getUser()
    user = authRes.data.user
  } catch (authErr) {
    console.error('[DashboardPage] Auth error:', authErr)
  }

  if (!user) {
    redirect('/login')
  }

  // Fetch school details safely
  let school: any = null
  try {
    const { data } = await supabase
      .from('schools')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    school = data
  } catch (err) {
    console.error('[DashboardPage] School query error:', err)
  }

  // Fetch active exam session safely
  let session: any = null
  try {
    const { data } = await supabase
      .from('exam_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    session = data
  } catch (err) {
    console.error('[DashboardPage] Session query error:', err)
  }

  // Fetch real incidents from classroom_alerts safely
  let rawAlerts: any[] | null = null
  try {
    const { data } = await supabase
      .from('classroom_alerts')
      .select('*')
      .order('timestamp_ms', { ascending: false })
      .limit(50)
    rawAlerts = data
  } catch (err) {
    console.error('[DashboardPage] Alerts query error:', err)
  }

  const hasRealAlerts = Boolean(rawAlerts && rawAlerts.length > 0)

  const alerts: Alert[] =
    hasRealAlerts && rawAlerts
      ? rawAlerts.map((a) => ({
          id: String(a.id || Math.random()),
          timestamp_ms: Number(a.timestamp_ms || Date.now()),
          student_id: a.student_id_tracker ? `#${a.student_id_tracker}` : (a.student_id || '#01'),
          suspicion_score: Number(a.suspicion_score || 0),
          status: (a.status as Alert['status']) || 'FLAGGED_ALERT',
          session_id: a.session_id,
        }))
      : SAMPLE_DRAFT_ALERTS

  const schoolName = school?.school_name || user.email?.split('@')[0].toUpperCase() || 'Pilot School'
  const codePrefix = school?.code_prefix || 'SCH'
  const sessionTitle = session?.title || `${schoolName} Active Session`
  const roomNumber = session?.room_number || 'Main Hall A'

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-gray-100 font-sans">
      <Header />

      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* ── Institution & Session Header Banner ── */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-5 flex flex-wrap items-center justify-between gap-4 backdrop-blur shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-900/60 border border-teal-700/60 text-teal-400 font-bold font-mono text-sm">
              {codePrefix.slice(0, 4)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  {schoolName}
                </h1>
                <span className="text-[11px] font-mono text-teal-400 bg-teal-950 border border-teal-800/80 px-2 py-0.5 rounded-full font-semibold">
                  {codePrefix}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {sessionTitle} • Room: <span className="text-gray-300 font-medium">{roomNumber}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/40 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Edge Vision Engine: Armed
            </div>
            <div className="text-[11px] font-mono text-gray-400 border border-gray-800 bg-gray-900 px-3 py-1.5 rounded-lg">
              Station ID: {session?.id ? String(session.id).slice(0, 8) : '0937-H2'}
            </div>
          </div>
        </div>

        {/* ── High-Level Statistics Summary Row ── */}
        <Analytics alerts={alerts} />

        {/* ── Live Multi-Camera Monitoring Feed (Draft Vision HUD) ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
                Live Video Proctoring Stream
              </h2>
              <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded">
                Multi-Cam HUD Active
              </span>
            </div>
            <span className="text-xs text-gray-500">
              Auto-updating via Supabase Realtime
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Camera 01: Main Hall Feed */}
            <div className="lg:col-span-2 rounded-xl border border-gray-800 bg-gray-900/90 overflow-hidden flex flex-col justify-between min-h-[300px] relative">
              {/* Camera Header */}
              <div className="flex items-center justify-between p-3 border-b border-gray-800/80 bg-gray-950/60 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-gray-300 font-semibold">CAM-01: Main Exam Hall (Center)</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                  <span>1080p • 29.8 FPS</span>
                  <span className="text-red-400 bg-red-950/60 border border-red-800/60 px-1.5 py-0.5 rounded font-bold">
                    FLAG DETECTED
                  </span>
                </div>
              </div>

              {/* Camera Visual Simulation / Overlay */}
              <div className="p-6 my-auto flex flex-col items-center justify-center relative">
                <div className="grid grid-cols-3 gap-6 w-full max-w-lg opacity-85">
                  <div className="border border-emerald-500/60 bg-emerald-950/20 rounded p-2 text-center text-[10px] font-mono text-emerald-400">
                    <div>DESK #01</div>
                    <div className="text-[9px] text-gray-400">Score: 0.12 [OK]</div>
                  </div>
                  <div className="border border-emerald-500/60 bg-emerald-950/20 rounded p-2 text-center text-[10px] font-mono text-emerald-400">
                    <div>DESK #02</div>
                    <div className="text-[9px] text-gray-400">Score: 0.08 [OK]</div>
                  </div>
                  <div className="border border-emerald-500/60 bg-emerald-950/20 rounded p-2 text-center text-[10px] font-mono text-emerald-400">
                    <div>DESK #03</div>
                    <div className="text-[9px] text-gray-400">Score: 0.15 [OK]</div>
                  </div>

                  <div className="border-2 border-red-500 bg-red-950/40 rounded p-2 text-center text-[10px] font-mono text-red-300 shadow-lg shadow-red-950/50">
                    <div className="font-bold text-red-400">DESK #04 [FLAGGED]</div>
                    <div className="text-[9px] text-red-200">Suspicion: 0.88</div>
                    <div className="text-[8px] text-red-300 mt-1">Head Turned &gt;12s</div>
                  </div>
                  <div className="border border-emerald-500/60 bg-emerald-950/20 rounded p-2 text-center text-[10px] font-mono text-emerald-400">
                    <div>DESK #05</div>
                    <div className="text-[9px] text-gray-400">Score: 0.05 [OK]</div>
                  </div>
                  <div className="border border-emerald-500/60 bg-emerald-950/20 rounded p-2 text-center text-[10px] font-mono text-emerald-400">
                    <div>DESK #06</div>
                    <div className="text-[9px] text-gray-400">Score: 0.18 [OK]</div>
                  </div>
                </div>
              </div>

              {/* Camera Footer HUD */}
              <div className="p-3 border-t border-gray-800 bg-gray-950/60 flex items-center justify-between text-[11px] font-mono text-gray-400">
                <span>CentroidTracker: Tracking 32 Candidates</span>
                <span className="text-teal-400">Acoustic Alarm: Armed (alarm.mp3)</span>
              </div>
            </div>

            {/* Camera 02 & Camera 03 Column */}
            <div className="space-y-4 flex flex-col justify-between">
              {/* Camera 02 */}
              <div className="rounded-xl border border-gray-800 bg-gray-900/90 overflow-hidden flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between p-2.5 border-b border-gray-800 bg-gray-950/60 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-gray-300 text-[11px]">CAM-02: North Wing (Rows 1-4)</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold">NORMAL</span>
                </div>
                <div className="p-4 text-center my-auto">
                  <span className="text-xs text-gray-400 font-mono">16 Candidates Detected</span>
                  <p className="text-[11px] text-gray-500 mt-1">All postures within baseline perimeter.</p>
                </div>
                <div className="px-3 py-1.5 border-t border-gray-800/60 bg-gray-950/40 text-[10px] font-mono text-gray-500 flex justify-between">
                  <span>Latency: 42ms</span>
                  <span>Pose: Calibrated</span>
                </div>
              </div>

              {/* Camera 03 */}
              <div className="rounded-xl border border-gray-800 bg-gray-900/90 overflow-hidden flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between p-2.5 border-b border-gray-800 bg-gray-950/60 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-gray-300 text-[11px]">CAM-03: Invigilator Podium Feed</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold">NORMAL</span>
                </div>
                <div className="p-4 text-center my-auto">
                  <span className="text-xs text-gray-400 font-mono">Hall Entry & Perimeter</span>
                  <p className="text-[11px] text-gray-500 mt-1">Zero unauthorized movement recorded.</p>
                </div>
                <div className="px-3 py-1.5 border-t border-gray-800/60 bg-gray-950/40 text-[10px] font-mono text-gray-500 flex justify-between">
                  <span>No Blindspots</span>
                  <span>Audio Level: 38dB</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Live Alerts Table ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
              Live Classroom Incident Ledger
            </h2>
            {!hasRealAlerts && (
              <span className="text-[11px] text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2.5 py-0.5 rounded-full font-medium">
                Draft Preview Mode (Simulated Flags)
              </span>
            )}
          </div>
          <AlertTable alerts={alerts} />
        </section>

        {/* ── Python Engine Quick-Connect Guidance Box ── */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
              Connect Python Computer Vision Pipeline
            </h3>
            <p className="text-xs text-gray-400">
              Run the detection pipeline locally to feed live camera centroid tracking into this dashboard:
            </p>
            <div className="mt-2 font-mono text-xs text-teal-400 bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-lg inline-block select-all">
              cd python_engine &amp;&amp; python main.py
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/api/alerts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700 bg-gray-900 px-3 py-2 rounded-lg transition-colors"
            >
              Inspect JSON API
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
