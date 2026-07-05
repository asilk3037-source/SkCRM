import type { ReactNode } from 'react'
import { IconAlertCircle, IconCheckCircle, IconInfo } from './icons'

type Tone = 'error' | 'success' | 'info' | 'warning'

const toneStyles: Record<Tone, { box: string; icon: string }> = {
  error: { box: 'border-red-100 bg-red-50 text-red-700', icon: 'text-red-500' },
  success: { box: 'border-emerald-100 bg-emerald-50 text-emerald-800', icon: 'text-emerald-500' },
  info: { box: 'border-blue-100 bg-blue-50 text-blue-800', icon: 'text-blue-500' },
  warning: { box: 'border-amber-100 bg-amber-50 text-amber-800', icon: 'text-amber-500' },
}

const toneIcon: Record<Tone, typeof IconInfo> = {
  error: IconAlertCircle,
  success: IconCheckCircle,
  info: IconInfo,
  warning: IconAlertCircle,
}

export function Alert({ tone = 'error', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  const Icon = toneIcon[tone]
  const styles = toneStyles[tone]
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${styles.box} ${className}`} role="alert">
      <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${styles.icon}`} />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
