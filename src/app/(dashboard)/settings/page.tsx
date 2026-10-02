import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { School } from '@/types'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: school } = await supabase
    .from('schools')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const typedSchool = school as School | null

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <nav className="flex items-center gap-1.5 text-[13px] text-[#747686]">
          <span>Administration</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          <span className="font-medium text-[#0b1c30]">Station Settings</span>
        </nav>
        <div className="flex items-center gap-2.5 pt-1">
          <span className="w-2.5 h-6 bg-[#0037b0] rounded-sm" />
          <div>
            <h1 className="font-headline-lg text-[#0b1c30] tracking-tight">Station Configuration &amp; Governance</h1>
            <p className="text-[13px] text-[#434655] mt-0.5">
              Institutional configuration, school credentials, and monitoring parameters.
            </p>
          </div>
        </div>
      </div>

      {/* School Profile Card */}
      <div className="rounded-2xl border border-[#e5eeff] bg-white p-6 space-y-4 shadow-sm">
        <h2 className="font-code-sm text-[11px] font-bold text-[#466083] uppercase tracking-wider">
          School Institutional Profile
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-code-sm text-[11px] text-[#747686] uppercase font-semibold mb-1">
              Official School Name
            </label>
            <div className="px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#0b1c30] text-[14px] font-bold">
              {typedSchool?.school_name ?? 'EyeX Pilot School'}
            </div>
          </div>

          <div>
            <label className="block font-code-sm text-[11px] text-[#747686] uppercase font-semibold mb-1">
              Station Code Prefix
            </label>
            <div className="px-3.5 py-2.5 rounded-lg border border-[#bbd6ff] bg-[#eff4ff] text-[#0037b0] font-mono text-[14px] font-bold">
              {typedSchool?.code_prefix ?? 'SCH'}
            </div>
          </div>

          <div>
            <label className="block font-code-sm text-[11px] text-[#747686] uppercase font-semibold mb-1">
              Authorized Administrator Email
            </label>
            <div className="px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#434655] text-[13px] font-medium">
              {user.email}
            </div>
          </div>

          <div>
            <label className="block font-code-sm text-[11px] text-[#747686] uppercase font-semibold mb-1">
              Station System ID
            </label>
            <div className="px-3.5 py-2.5 rounded-lg border border-[#c4c5d7] bg-[#eff4ff] text-[#747686] font-mono text-[12px] truncate">
              {typedSchool?.id ?? 'Local Test ID'}
            </div>
          </div>
        </div>
      </div>

      {/* Security & Protocol Compliance */}
      <div className="rounded-2xl border border-[#e5eeff] bg-white p-6 space-y-4 shadow-sm">
        <h2 className="font-code-sm text-[11px] font-bold text-[#466083] uppercase tracking-wider">
          Security &amp; Protocol Standards
        </h2>

        <div className="space-y-3 text-[13px] text-[#434655]">
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#e5eeff] bg-[#f8f9ff]">
            <div>
              <p className="font-semibold text-[#0b1c30]">Row-Level Security (RLS)</p>
              <p className="text-[#747686] text-[12px] mt-0.5">
                Every query is cryptographically scoped to this school&apos;s authenticated credentials.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded font-code-sm bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
              Active &amp; Enforced
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#e5eeff] bg-[#f8f9ff]">
            <div>
              <p className="font-semibold text-[#0b1c30]">Supabase Realtime WebSocket</p>
              <p className="text-[#747686] text-[12px] mt-0.5">
                Bi-directional live event subscription for instant detection broadcasting.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded font-code-sm bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
              Operational
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#e5eeff] bg-[#f8f9ff]">
            <div>
              <p className="font-semibold text-[#0b1c30]">Computer Vision Bridge Interface</p>
              <p className="text-[#747686] text-[12px] mt-0.5">
                Server Action interface ready for external CV model ingestion.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded font-code-sm bg-[#eff4ff] text-[#0037b0] border border-[#bbd6ff] text-[11px] font-bold">
              Ready for Binding
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
