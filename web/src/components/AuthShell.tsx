import type { ReactNode } from 'react'
import { IconBarChart, IconCheckSquare, IconInbox } from './ui/icons'

const HIGHLIGHTS = [
  { icon: IconInbox, text: 'Chamados com fluxo de validação, no estilo SGN' },
  { icon: IconCheckSquare, text: 'Contatos, empresas e negociações em um só lugar' },
  { icon: IconBarChart, text: 'Relatórios de funil e produção por pessoa' },
]

/** Shared two-column shell for the login/signup screens: brand panel + form card. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="hidden w-[42%] flex-col justify-between bg-slate-900 p-10 text-white lg:flex">
        <span className="text-xl font-bold tracking-tight">
          Sk<span className="text-orange-500">CRM</span>
          <span className="text-orange-500">.</span>
        </span>
        <div>
          <p className="text-2xl font-semibold leading-snug text-balance">
            Um CRM leve para atender clientes sem perder nada pelo caminho.
          </p>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map((h) => (
              <li key={h.text} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-orange-400">
                  <h.icon className="h-4 w-4" />
                </span>
                {h.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-500">© {new Date().getFullYear()} SkCRM</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 lg:hidden">
            <span className="text-lg font-bold tracking-tight text-slate-900">
              Sk<span className="text-orange-600">CRM</span>
              <span className="text-orange-600">.</span>
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 text-balance">{title}</h1>
          <p className="mt-1.5 mb-7 text-sm text-slate-500">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
