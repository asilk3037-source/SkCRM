import { Link } from 'react-router-dom'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import { useDeals } from '../hooks/useDeals'
import { useTickets } from '../hooks/useTickets'
import type { Contact, Company, Task } from '../types/database'

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 break-words text-xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function NotificationCard({
  value,
  label,
  to,
  highlight = false,
}: {
  value: number
  label: string
  to: string
  highlight?: boolean
}) {
  return (
    <Link
      to={to}
      className={`block rounded-lg p-4 transition-shadow hover:shadow-md ${
        highlight ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white'
      }`}
    >
      <p className={`text-2xl font-bold ${highlight ? 'text-orange-400' : 'text-orange-600'}`}>{value}</p>
      <p className={`mt-0.5 text-xs font-medium ${highlight ? 'text-slate-200' : 'text-slate-600'}`}>{label}</p>
    </Link>
  )
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function Dashboard() {
  const { data: contacts } = useSupabaseTable<Contact>('contacts')
  const { data: companies } = useSupabaseTable<Company>('companies')
  const { data: deals } = useDeals()
  const { data: tasks } = useSupabaseTable<Task>('tasks')
  const { data: tickets } = useTickets()

  const openDeals = deals.filter((d) => d.status === 'open')
  const pipelineValue = openDeals.reduce((sum, d) => sum + Number(d.value), 0)
  const pendingTasks = tasks.filter((t) => !t.done)

  const activeTickets = tickets.filter((t) => t.status !== 'fechado')
  const inProgress = activeTickets.filter((t) => t.status === 'aberto' || t.status === 'em_andamento')
  const urgent = activeTickets.filter((t) => t.priority === 'urgente' || t.priority === 'alta')
  const awaitingValidation = tickets.filter((t) => t.status === 'resolvido')
  const stale = activeTickets.filter((t) => Date.now() - new Date(t.updated_at).getTime() > WEEK_MS)
  const awaitingClient = activeTickets.filter((t) => t.status === 'aguardando_cliente')

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Painel</h1>

      {/* Notificações/Importantes — SGN-style ticket boxes */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Notificações / Importantes
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <NotificationCard value={inProgress.length} label="Chamados sob sua responsabilidade" to="/chamados" highlight />
        <NotificationCard value={urgent.length} label="Chamados críticos (alta/urgente)" to="/chamados" />
        <NotificationCard value={awaitingClient.length} label="Aguardando retorno do cliente" to="/chamados" />
        <NotificationCard value={stale.length} label="Sem interações há mais de 7 dias" to="/chamados" />
        <NotificationCard value={awaitingValidation.length} label="Aguardando validação" to="/chamados" />
      </div>

      {/* CRM stats */}
      <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Visão geral</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Contatos" value={contacts.length} />
        <StatCard label="Empresas" value={companies.length} />
        <StatCard label="Negociações em aberto" value={openDeals.length} />
        <StatCard
          label="Valor em pipeline"
          value={pipelineValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        />
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-medium text-slate-900">Tarefas pendentes ({pendingTasks.length})</h2>
        {pendingTasks.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma tarefa pendente.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pendingTasks.slice(0, 5).map((task) => (
              <li key={task.id} className="py-2 text-sm text-slate-700">
                {task.title}
                {task.due_date && (
                  <span className="ml-2 text-xs text-slate-400">
                    vence em {new Date(task.due_date).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
