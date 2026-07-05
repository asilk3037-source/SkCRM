import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { IconLogOut } from './ui/icons'

/** Minimal chrome for the client portal — no team sidebar, just a topbar. */
export function PortalLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex items-center gap-2 border-b border-slate-800/60 bg-slate-900 px-4 py-3 sm:gap-4 sm:px-6">
        <span className="text-lg font-bold tracking-tight text-white">
          Sk<span className="text-orange-500">CRM</span>
          <span className="text-orange-500">.</span>
        </span>
        <span className="hidden rounded-full bg-white/10 px-3 py-0.5 text-xs font-medium text-slate-200 sm:inline">
          Portal do cliente
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden truncate text-xs text-slate-300 sm:inline">{user?.email}</span>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800"
          >
            <IconLogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-5xl p-4 sm:p-8">{children}</div>
      </main>
    </div>
  )
}
