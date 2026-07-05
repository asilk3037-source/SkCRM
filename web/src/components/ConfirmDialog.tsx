import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { IconAlertTriangle } from './ui/icons'

interface ConfirmOptions {
  title?: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'default'
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<(value: boolean) => void>(undefined)

  const confirm = useCallback<ConfirmFn>((options) => {
    setState(typeof options === 'string' ? { description: options } : options)
    return new Promise((resolve) => {
      resolver.current = resolve
    })
  }, [])

  function respond(value: boolean) {
    resolver.current?.(value)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <Modal
          title={state.title ?? 'Confirmar ação'}
          onClose={() => respond(false)}
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => respond(false)}>
                {state.cancelLabel ?? 'Cancelar'}
              </Button>
              <Button variant={state.tone === 'default' ? 'primary' : 'danger'} onClick={() => respond(true)} autoFocus>
                {state.confirmLabel ?? 'Confirmar'}
              </Button>
            </>
          }
        >
          <div className="flex items-start gap-3 px-5 py-4">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
              <IconAlertTriangle className="h-4 w-4" />
            </div>
            <p className="text-sm text-slate-600">{state.description}</p>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  )
}

/** Promise-based replacement for window.confirm, styled like the rest of the app. */
export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider')
  return ctx
}
