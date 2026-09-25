import type { Alert, AnalyticsSummary } from '@/types'

interface AnalyticsProps {
  alerts: Alert[]
}

function computeSummary(alerts: Alert[]): AnalyticsSummary {
  const total = alerts.length
  const pending = alerts.filter((a) => a.status === 'pending').length
  const reviewed = alerts.filter((a) => a.status === 'reviewed').length
  const dismissed = alerts.filter((a) => a.status === 'dismissed').length
  const avgSuspicionScore =
    total > 0
      ? alerts.reduce((sum, a) => sum + a.suspicion_score, 0) / total
      : 0

  return { total, pending, reviewed, dismissed, avgSuspicionScore }
}

interface StatCardProps {
  label: string
  value: string | number
  accent?: string
}

function StatCard({ label, value, accent = 'text-white' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
        {label}
      </p>
      <p className={`text-3xl font-bold tabular-nums ${accent}`}>{value}</p>
    </div>
  )
}

/**
 * Analytics — Server Component.
 * Computes and displays summary statistics from the alerts array.
 * No client-side JavaScript required.
 */
export default function Analytics({ alerts }: AnalyticsProps) {
  const summary = computeSummary(alerts)
  const avgPct = Math.round(summary.avgSuspicionScore * 100)

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-200 mb-4">Overview</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Alerts" value={summary.total} />
        <StatCard
          label="Pending"
          value={summary.pending}
          accent="text-yellow-400"
        />
        <StatCard
          label="Reviewed"
          value={summary.reviewed}
          accent="text-blue-400"
        />
        <StatCard
          label="Dismissed"
          value={summary.dismissed}
          accent="text-gray-400"
        />
        <StatCard
          label="Avg Suspicion"
          value={`${avgPct}%`}
          accent={avgPct >= 75 ? 'text-red-400' : avgPct >= 50 ? 'text-orange-400' : 'text-green-400'}
        />
      </div>
    </section>
  )
}
