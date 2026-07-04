import { useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'

const links = [
  { to: '/', label: 'Painel', end: true },
  { to: '/contatos', label: 'Contatos' },
  { to: '/empresas', label: 'Empresas' },
  { to: '/negociacoes', label: 'Negociações' },
  { to: '/chamados', label: 'Chamados' },
  { to: '/tarefas', label: 'Tarefas' },
  { to: '/relatorios', label: 'Relatórios' },
  { to: '/equipe', label: 'Equipe' },
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
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <span className="text-lg font-bold text-white">
          Sk<span className="text-orange-500">CRM</span><span className="text-orange-500">.</span>
        </span>
        <button
          onClick={() => setSidebarOpen(false)}
          className="text-slate-400 hover:text-white lg:hidden"
          aria-label="Fechar menu"
        >
          ✕
        </button>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-orange-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-800 p-3">
        <a
          href={`${import.meta.env.BASE_URL}tv`}
          target="_blank"
          rel="noreferrer"
          className="block rounded-md px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          📺 Abrir TV Chamados
        </a>
      </div>
      <div className="border-t border-slate-800 p-3">
        <p className="truncate px-3 text-xs font-medium text-slate-300">{org?.name}</p>
        <p className="truncate px-3 text-xs text-slate-400">{user?.email}</p>
        <button
          onClick={() => signOut()}
          className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          Sair
        </button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-slate-100">
      {/* SGN-style dark sidebar with orange accent — fixed on desktop, slide-over drawer on mobile */}
      <aside className="hidden w-60 flex-col bg-slate-900 lg:flex">{sidebarContent}</aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-slate-900 shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar with breadcrumb, like SGN's "Home / Chamado 71302" */}
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-500 hover:text-slate-900 lg:hidden"
            aria-label="Abrir menu"
          >
            ☰
          </button>
          <p className="truncate text-sm text-slate-500">
            Home <span className="mx-1 text-slate-300">/</span>{' '}
            <span className="font-medium text-orange-600">{crumb}</span>
          </p>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl p-4 sm:p-8">
            {orgLoading ? <p className="text-sm text-slate-500">Carregando...</p> : <Outlet />}
          </div>
        </main>
      </div>
    </div>
  )
}
