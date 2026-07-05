import type { ReactNode } from 'react'
import { IconX } from './icons'

/** Slide-over panel from the right — used for filters/secondary panels instead of a full modal. */
export function Drawer({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-[fade-in_0.15s_ease-out]" role="presentation">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-sm flex-col overflow-hidden bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  )
}
