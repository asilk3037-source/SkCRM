import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'

const links = [
  { to: '/', label: 'Painel', end: true },
  { to: '/contatos', label: 'Contatos' },
  { to: '/empresas', label: 'Empresas' },
  { to: '/negociacoes', label: 'Negociações' },
  { to: '/chamados', label: 'Chamados' },
  { to: '/tarefas', label: 'Tarefas' },
  { to: '/equipe', label: 'Equipe' },
]

const BREADCRUMB: Array<{ prefix: string; label: string }> = [
  { prefix: '/contatos', label: 'Contatos' },
  { prefix: '/empresas', label: 'Empresas' },
  { prefix: '/negociacoes', label: 'Negociações' },
  { prefix: '/chamados', label: 'Chamados' },
  { prefix: '/tarefas', label: 'Tarefas' },
  { prefix: '/equipe', label: 'Equipe' },
]

export function Layout() {
  const { user, signOut } = useAuth()
  const { org, loading: orgLoading } = useOrg()
  const location = useLocation()
  const crumb = BREADCRUMB.find((b) => location.pathname.startsWith(b.prefix))?.label ?? 'Painel'

  return (
    <div className="flex h-screen bg-slate-100">
      {/* SGN-style dark sidebar with orange accent */}
      <aside className="flex w-60 flex-col bg-slate-900">
        <div className="border-b border-slate-800 px-5 py-4">
          <span className="text-lg font-bold text-white">
            Sk<span className="text-orange-500">CRM</span><span className="text-orange-500">.</span>
          </span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
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
          <p className="truncate px-3 text-xs font-medium text-slate-300">{org?.name}</p>
          <p className="truncate px-3 text-xs text-slate-400">{user?.email}</p>
          <button
            onClick={() => signOut()}
            className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            Sair
          </button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar with breadcrumb, like SGN's "Home / Chamado 71302" */}
        <header className="flex items-center border-b border-slate-200 bg-white px-6 py-3">
          <p className="text-sm text-slate-500">
            Home <span className="mx-1 text-slate-300">/</span>{' '}
            <span className="font-medium text-orange-600">{crumb}</span>
          </p>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl p-8">
            {orgLoading ? <p className="text-sm text-slate-500">Carregando...</p> : <Outlet />}
          </div>
        </main>
      </div>
    </div>
  )
}
