import type { ReactNode } from 'react'

/**
 * Mobile replacement for a table row. Used below the `sm` breakpoint so lists
 * never need horizontal scroll — every field wraps instead of being cut off.
 */
export function DataCard({ title, badge, children, actions }: { title: ReactNode; badge?: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 break-words font-medium text-slate-900">{title}</p>
        {badge}
      </div>
      {children && <div className="mt-2.5 space-y-1.5">{children}</div>}
      {actions && <div className="mt-3 flex flex-wrap gap-1 border-t border-slate-100 pt-3">{actions}</div>}
    </div>
  )
}

export function DataCardRow({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex flex-col text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <span className="break-words text-slate-700 sm:text-right">{value}</span>
    </div>
  )
}
