import { Card } from './Card'
import type { IconUser } from './icons'

export const STAT_TONE = {
  orange: 'bg-orange-50 text-orange-600',
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  purple: 'bg-purple-50 text-purple-600',
} as const

export type StatTone = keyof typeof STAT_TONE

/** Stat card with a colored icon chip — the small "Visão geral" metric block reused across Dashboard and entity detail pages. */
export function StatChip({
  label,
  value,
  icon: Icon,
  tone = 'orange',
  hint,
}: {
  label: string
  value: number | string
  icon: typeof IconUser
  tone?: StatTone
  hint?: string
}) {
  return (
    <Card className="flex items-start justify-between gap-3 p-5">
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 truncate text-xl font-semibold tabular-nums text-slate-900">{value}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-slate-400">{hint}</p>}
      </div>
      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${STAT_TONE[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
    </Card>
  )
}
