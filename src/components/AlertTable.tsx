'use client'

import { useState, useTransition } from 'react'
import type { Alert, AlertStatus } from '@/types'

interface AlertTableProps {
  alerts: Alert[]
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300 ring-yellow-500/30',
  reviewed: 'bg-blue-500/20 text-blue-300 ring-blue-500/30',
  dismissed: 'bg-gray-500/20 text-gray-400 ring-gray-500/30',
  FLAGGED_ALERT: 'bg-red-500/20 text-red-400 ring-red-500/30',
  REVIEWED: 'bg-blue-500/20 text-blue-300 ring-blue-500/30',
  DISMISSED: 'bg-gray-500/20 text-gray-400 ring-gray-500/30',
}

function SuspicionBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color =
    pct >= 75 ? 'bg-red-500' : pct >= 50 ? 'bg-orange-400' : 'bg-green-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 rounded-full bg-gray-700 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 tabular-nums">{pct}%</span>
    </div>
  )
}

/**
 * AlertTable — Client Component.
 * Renders a live grid of flagged student alerts.
 * Accepts initial data from the Server Component parent and supports
 * local status filtering without a full page reload.
 */
export default function AlertTable({ alerts }: AlertTableProps) {
  const [filter, setFilter] = useState<AlertStatus | 'all'>('all')
  const [, startTransition] = useTransition()

  const visible =
    filter === 'all' ? alerts : alerts.filter((a) => a.status === filter)

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
      {/* Filter bar */}
      <div className="flex gap-2 p-4 border-b border-gray-800">
        {(['all', 'pending', 'reviewed', 'dismissed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => startTransition(() => setFilter(s))}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === s
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-500 self-center">
          {visible.length} record{visible.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
              <th className="px-4 py-3">Student ID</th>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Suspicion</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-600">
                  No alerts to display.
                </td>
              </tr>
            ) : (
              visible.map((alert) => (
                <tr
                  key={alert.id}
                  className="hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-gray-200">
                    {alert.student_id}
                  </td>
                  <td className="px-4 py-3 text-gray-400 tabular-nums">
                    {new Date(alert.timestamp_ms).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <SuspicionBar score={alert.suspicion_score} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_COLORS[alert.status]}`}
                    >
                      {alert.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
