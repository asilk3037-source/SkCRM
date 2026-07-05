import type { ReactNode } from 'react'

/**
 * Dark hero card used at the top of the Dashboard and entity detail pages
 * (Empresa, Chamado) — the "premium" identity block, badges/actions on top,
 * an optional stat row below a hairline divider.
 */
export function Hero({
  icon,
  eyebrow,
  title,
  description,
  badges,
  actions,
  children,
}: {
  icon?: ReactNode
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  badges?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-stone-900 to-stone-950 p-6 text-white shadow-lg sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          {icon}
          <div className="min-w-0">
            {badges && <div className="mb-2 flex flex-wrap items-center gap-2">{badges}</div>}
            {eyebrow && <p className="text-xs font-semibold uppercase tracking-wide text-orange-400">{eyebrow}</p>}
            <h1 className="mt-1 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            {description && <div className="mt-2 max-w-2xl text-sm text-stone-300">{description}</div>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/10 pt-5">{children}</div>}
    </div>
  )
}

export function HeroStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-white">{value}</p>
    </div>
  )
}
