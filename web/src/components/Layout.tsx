import { useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'
import { PageLoading } from './ui/Spinner'
import {
  IconHome,
  IconUser,
  IconBuilding,
  IconTrendingUp,
  IconInbox,
  IconCheckSquare,
  IconBarChart,
  IconUsers,
  IconTv,
  IconLogOut,
  IconMenu,
  IconX,
} from './ui/icons'

const linkGroups: Array<{ label: string; links: Array<{ to: string; label: string; end?: boolean; icon: typeof IconHome }> }> = [
  {
    label: 'Geral',
    links: [
      { to: '/', label: 'Painel', end: true, icon: IconHome },
      { to: '/contatos', label: 'Contatos', icon: IconUser },
      { to: '/empresas', label: 'Empresas', icon: IconBuilding },
      { to: '/negociacoes', label: 'Negociações', icon: IconTrendingUp },
      { to: '/chamados', label: 'Chamados', icon: IconInbox },
      { to: '/tarefas', label: 'Tarefas', icon: IconCheckSquare },
    ],
  },
  {
    label: 'Análises',
    links: [
      { to: '/relatorios', label: 'Relatórios', icon: IconBarChart },
      { to: '/equipe', label: 'Equipe', icon: IconUsers },
    ],
  },
]

const BREADCRUMB: Array<{ prefix: string; label: string }> = [
  { prefix: '/contatos', label: 'Contatos' },
  { prefix: '/empresas', label: 'Empresas' },
  { prefix: '/negociacoes', label: 'Negociações' },
  { prefix: '/chamados', label: 'Chamados' },
  { prefix: '/tarefas', label: 'Tarefas' },
  { prefix: '/relatorios', label: 'Relatórios' },
  { prefix: '/equipe', label: 'Equipe' },
]

export function Layout() {
  const { user, signOut } = useAuth()
  const { org, loading: orgLoading } = useOrg()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const crumb = BREADCRUMB.find((b) => location.pathname.startsWith(b.prefix))?.label ?? 'Painel'

  // Sem organização = cliente do portal (contato cadastrado por alguma equipe)
  if (!orgLoading && !org) {
    return <Navigate to="/portal" replace />
  }

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-5 py-4">
        <span className="text-lg font-bold tracking-tight text-white">
          Sk<span className="text-orange-500">CRM</span>
          <span className="text-orange-500">.</span>
        </span>
        <button
          onClick={() => setSidebarOpen(false)}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="Fechar menu"
        >
          <IconX className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-4 px-3">
        {linkGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{group.label}</p>
            <div className="space-y-0.5">
              {group.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`
                  }
                >
                  <link.icon className="h-4 w-4 flex-shrink-0" />
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-3 py-2">
        <a
          href={`${import.meta.env.BASE_URL}tv`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800/80 hover:text-white"
        >
          <IconTv className="h-4 w-4 flex-shrink-0" />
          Abrir TV Chamados
        </a>
      </div>
      <div className="mt-1 border-t border-slate-800/80 px-3 pb-3 pt-3">
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-1.5">
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-200">
            {(org?.name ?? '?').slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-200">{org?.name}</p>
            <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/80 hover:text-white"
        >
          <IconLogOut className="h-4 w-4 flex-shrink-0" />
          Sair
        </button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-slate-800/60 bg-slate-900 lg:flex">
        {sidebarContent}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-slate-900 shadow-xl">{sidebarContent}</aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            aria-label="Abrir menu"
          >
            <IconMenu className="h-5 w-5" />
          </button>
          <p className="truncate text-sm text-slate-500">
            Home <span className="mx-1.5 text-slate-300">/</span>{' '}
            <span className="font-medium text-slate-900">{crumb}</span>
          </p>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl p-4 sm:p-8">{orgLoading ? <PageLoading /> : <Outlet />}</div>
        </main>
      </div>
    </div>
  )
}
