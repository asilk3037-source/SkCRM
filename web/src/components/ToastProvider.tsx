import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { IconAlertCircle, IconCheckCircle, IconInfo } from './ui/icons'

type ToastTone = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  tone: ToastTone
  message: string
}

type ToastFn = (message: string, tone?: ToastTone) => void

const ToastContext = createContext<ToastFn | undefined>(undefined)

const TONE_STYLES: Record<ToastTone, { box: string; icon: typeof IconInfo }> = {
  success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-800', icon: IconCheckCircle },
  error: { box: 'border-red-200 bg-red-50 text-red-700', icon: IconAlertCircle },
  info: { box: 'border-blue-200 bg-blue-50 text-blue-800', icon: IconInfo },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const showToast = useCallback<ToastFn>((message, tone = 'success') => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, tone, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3200)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
        {toasts.map((t) => {
          const { box, icon: Icon } = TONE_STYLES[t.tone]
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg animate-[toast-in_0.2s_ease-out] ${box}`}
            >
              <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span className="min-w-0 break-words">{t.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

/** Fire-and-forget success/error/info banner in the corner — replaces silent successes. */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
