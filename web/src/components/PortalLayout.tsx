import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

/** Minimal chrome for the client portal — no team sidebar, just a topbar. */
export function PortalLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="flex items-center gap-4 bg-slate-900 px-6 py-3">
        <span className="text-lg font-bold text-white">
          Sk<span className="text-orange-500">CRM</span><span className="text-orange-500">.</span>
        </span>
        <span className="rounded-full bg-white/10 px-3 py-0.5 text-xs font-medium text-slate-200">
          Portal do cliente
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-300">{user?.email}</span>
          <button
            onClick={() => signOut()}
            className="rounded-md border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800"
          >
            Sair
          </button>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-5xl p-6 sm:p-8">{children}</div>
      </main>
    </div>
  )
}
