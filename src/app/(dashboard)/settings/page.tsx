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
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Station Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Institutional configuration, school credentials, and monitoring parameters.
        </p>
      </div>

      {/* School Profile Card */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          School Institutional Profile
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Official School Name
            </label>
            <div className="px-3.5 py-2.5 rounded-lg border border-gray-800 bg-gray-950 text-white text-sm font-semibold">
              {typedSchool?.school_name ?? 'EyeX Pilot School'}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Authorized Administrator Email
            </label>
            <div className="px-3.5 py-2.5 rounded-lg border border-gray-800 bg-gray-950 text-gray-300 text-sm">
              {user.email}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Station System ID
            </label>
            <div className="px-3.5 py-2.5 rounded-lg border border-gray-800 bg-gray-950 text-gray-400 font-mono text-xs truncate">
              {typedSchool?.id ?? 'Local Test ID'}
            </div>
          </div>
        </div>
      </div>

      {/* Security & Protocol Compliance */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Security &amp; Protocol Standards
        </h2>

        <div className="space-y-3 text-xs text-gray-300">
          <div className="flex items-center justify-between p-3 rounded-lg border border-gray-800 bg-gray-950">
            <div>
              <p className="font-semibold text-white">Row-Level Security (RLS)</p>
              <p className="text-gray-500 text-[11px] mt-0.5">
                Every query is cryptographically scoped to this school&apos;s authenticated credentials.
              </p>
            </div>
            <span className="px-2 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[11px] font-semibold">
              Active &amp; Enforced
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-gray-800 bg-gray-950">
            <div>
              <p className="font-semibold text-white">Supabase Realtime WebSocket</p>
              <p className="text-gray-500 text-[11px] mt-0.5">
                Bi-directional live event subscription for instant detection broadcasting.
              </p>
            </div>
            <span className="px-2 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[11px] font-semibold">
              Operational
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-gray-800 bg-gray-950">
            <div>
              <p className="font-semibold text-white">Computer Vision Bridge Interface</p>
              <p className="text-gray-500 text-[11px] mt-0.5">
                Server Action interface ready for external CV model ingestion.
              </p>
            </div>
            <span className="px-2 py-1 rounded bg-teal-950 text-teal-400 border border-teal-800 text-[11px] font-semibold">
              Ready for Binding
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
