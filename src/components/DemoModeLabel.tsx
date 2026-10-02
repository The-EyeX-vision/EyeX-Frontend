export function DemoModeBanner() {
  return (
    <div className="border-b border-slate-300 bg-slate-100 px-4 py-2 text-center text-sm font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
      Demo mode: simulated feed. Alerts are examples and are not evidence of real behavior.
    </div>
  )
}

export function DemoModeBadge() {
  return (
    <span className="inline-flex items-center rounded border border-slate-400 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
      Demo
    </span>
  )
}