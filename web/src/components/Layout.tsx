import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/', label: 'Painel', end: true },
  { to: '/contatos', label: 'Contatos' },
  { to: '/empresas', label: 'Empresas' },
  { to: '/negociacoes', label: 'Negociações' },
  { to: '/chamados', label: 'Chamados' },
  { to: '/tarefas', label: 'Tarefas' },
]

export function Layout() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex h-screen bg-slate-100">
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <span className="text-lg font-semibold text-slate-900">SkCRM</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <p className="truncate px-3 text-xs text-slate-500">{user?.email}</p>
          <button
            onClick={() => signOut()}
            className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
