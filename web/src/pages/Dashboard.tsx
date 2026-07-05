import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import { useDeals } from '../hooks/useDeals'
import { useTickets } from '../hooks/useTickets'
import type { Contact, Company, Task, Ticket } from '../types/database'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { TicketListModal } from '../components/TicketListModal'
import { isTerminalStatus } from '../lib/ticketMeta'
import {
  IconUser,
  IconBuilding,
  IconTrendingUp,
  IconInbox,
  IconAlertTriangle,
  IconCheckSquare,
} from '../components/ui/icons'

function StatCard({ label, value, icon: Icon }: { label: string; value: number | string; icon: typeof IconUser }) {
  return (
    <Card className="flex items-start justify-between gap-3 p-5">
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 truncate text-xl font-semibold tabular-nums text-slate-900">{value}</p>
      </div>
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-5 w-5" />
      </span>
    </Card>
  )
}

function NotificationCard({
  value,
  label,
  onOpen,
  highlight = false,
}: {
  value: number
  label: string
  onOpen: () => void
  highlight?: boolean
}) {
  return (
    <button
      onClick={onOpen}
      className={`block w-full rounded-xl p-4 text-left transition-shadow hover:shadow-md ${
        highlight ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white'
      }`}
    >
      <p className={`text-2xl font-semibold tabular-nums ${highlight ? 'text-orange-400' : 'text-orange-600'}`}>{value}</p>
      <p className={`mt-0.5 text-xs font-medium ${highlight ? 'text-slate-200' : 'text-slate-600'}`}>{label}</p>
    </button>
  )
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

type IndicatorKey = 'responsibility' | 'critical' | 'awaitingClient' | 'stale' | 'awaitingValidation'

export function Dashboard() {
  const { user } = useAuth()
  const { data: contacts } = useSupabaseTable<Contact>('contacts')
  const { data: companies } = useSupabaseTable<Company>('companies')
  const { data: deals } = useDeals()
  const { data: tasks } = useSupabaseTable<Task>('tasks')
  const { data: tickets } = useTickets()
  const [openIndicator, setOpenIndicator] = useState<IndicatorKey | null>(null)

  const openDeals = deals.filter((d) => d.status === 'open')
  const pipelineValue = openDeals.reduce((sum, d) => sum + Number(d.value), 0)
  const pendingTasks = tasks.filter((t) => !t.done)

  const activeTickets = tickets.filter((t) => !isTerminalStatus(t.status))
  const inProgress = activeTickets.filter(
    (t) =>
      (t.status === 'analisar' || t.status === 'aberto' || t.status === 'em_andamento' || t.status === 'matriz_decisao') &&
      (t.assignee_id === user?.id || t.assignee_id === null),
  )
  const urgent = activeTickets.filter((t) => t.priority === 'urgente' || t.priority === 'alta')
  const awaitingValidation = tickets.filter((t) => t.status === 'aguardando_validacao')
  const stale = activeTickets.filter((t) => Date.now() - new Date(t.updated_at).getTime() > WEEK_MS)
  const awaitingClient = activeTickets.filter((t) => t.status === 'pendente_cliente')

  const indicators: Record<IndicatorKey, { title: string; hint: string; tickets: Ticket[] }> = {
    responsibility: { title: 'Chamados sob sua responsabilidade', hint: 'Abertos ou em andamento, atribuídos a você ou sem responsável', tickets: inProgress },
    critical: { title: 'Chamados críticos (alta/urgente)', hint: 'Prioridade alta ou urgente, ainda não fechados', tickets: urgent },
    awaitingClient: { title: 'Aguardando retorno do cliente', hint: 'Esperando resposta de quem abriu o chamado', tickets: awaitingClient },
    stale: { title: 'Sem interações há mais de 7 dias', hint: 'Chamados ativos parados há mais de uma semana', tickets: stale },
    awaitingValidation: { title: 'Aguardando validação', hint: 'Resolvidos, esperando confirmação do cliente', tickets: awaitingValidation },
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-slate-900">Painel</h1>

      {/* Notificações/Importantes — SGN-style ticket boxes */}
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Notificações / Importantes</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <NotificationCard value={inProgress.length} label="Chamados sob sua responsabilidade" onOpen={() => setOpenIndicator('responsibility')} highlight />
        <NotificationCard value={urgent.length} label="Chamados críticos (alta/urgente)" onOpen={() => setOpenIndicator('critical')} />
        <NotificationCard value={awaitingClient.length} label="Aguardando retorno do cliente" onOpen={() => setOpenIndicator('awaitingClient')} />
        <NotificationCard value={stale.length} label="Sem interações há mais de 7 dias" onOpen={() => setOpenIndicator('stale')} />
        <NotificationCard value={awaitingValidation.length} label="Aguardando validação" onOpen={() => setOpenIndicator('awaitingValidation')} />
      </div>

      {/* CRM stats */}
      <h2 className="mb-3 mt-8 text-xs font-semibold uppercase tracking-wide text-slate-400">Visão geral</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Contatos" value={contacts.length} icon={IconUser} />
        <StatCard label="Empresas" value={companies.length} icon={IconBuilding} />
        <StatCard label="Negociações em aberto" value={openDeals.length} icon={IconTrendingUp} />
        <StatCard
          label="Valor em pipeline"
          value={pipelineValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          icon={IconInbox}
        />
      </div>

      <Card className="mt-8 p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
          Tarefas pendentes
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{pendingTasks.length}</span>
        </h2>
        {pendingTasks.length === 0 ? (
          <EmptyState icon={<IconCheckSquare className="h-5 w-5" />} title="Nenhuma tarefa pendente." compact />
        ) : (
          <ul className="divide-y divide-slate-100">
            {pendingTasks.slice(0, 5).map((task) => (
              <li key={task.id} className="flex items-center gap-2 py-2 text-sm text-slate-700">
                <span className="min-w-0 flex-1 truncate">{task.title}</span>
                {task.due_date && (
                  <span className="flex flex-shrink-0 items-center gap-1 text-xs text-slate-400">
                    <IconAlertTriangle className="h-3.5 w-3.5" />
                    vence em {new Date(task.due_date).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {openIndicator && (
        <TicketListModal
          title={indicators[openIndicator].title}
          hint={indicators[openIndicator].hint}
          tickets={indicators[openIndicator].tickets}
          contacts={contacts}
          companies={companies}
          onClose={() => setOpenIndicator(null)}
        />
      )}
    </div>
  )
}
