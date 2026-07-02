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

export function Dashboard() {
  const { data: contacts } = useSupabaseTable<Contact>('contacts')
  const { data: companies } = useSupabaseTable<Company>('companies')
  const { data: deals } = useDeals()
  const { data: tasks } = useSupabaseTable<Task>('tasks')
  const { data: tickets } = useTickets()

  const openDeals = deals.filter((d) => d.status === 'open')
  const pipelineValue = openDeals.reduce((sum, d) => sum + Number(d.value), 0)
  const pendingTasks = tasks.filter((t) => !t.done)
  const openTickets = tickets.filter((t) => t.status !== 'resolvido' && t.status !== 'fechado')

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Painel</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Contatos" value={contacts.length} />
        <StatCard label="Empresas" value={companies.length} />
        <StatCard label="Negociações em aberto" value={openDeals.length} />
        <StatCard
          label="Valor em pipeline"
          value={pipelineValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        />
        <StatCard label="Chamados em aberto" value={openTickets.length} />
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
