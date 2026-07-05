import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import { useDeals } from '../hooks/useDeals'
import { useTickets } from '../hooks/useTickets'
import type { Contact, Company, Task, Ticket } from '../types/database'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { TicketListModal } from '../components/TicketListModal'
import { isTerminalStatus, CATEGORY_LABEL } from '../lib/ticketMeta'
import {
  IconUser,
  IconBuilding,
  IconTrendingUp,
  IconInbox,
  IconAlertTriangle,
  IconCheckSquare,
  IconBarChart,
  IconCheckCircle,
} from '../components/ui/icons'

const STAT_TONE: Record<string, string> = {
  orange: 'bg-orange-50 text-orange-600',
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  purple: 'bg-purple-50 text-purple-600',
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'orange',
}: {
  label: string
  value: number | string
  icon: typeof IconUser
  tone?: keyof typeof STAT_TONE
}) {
  return (
    <Card className="flex items-start justify-between gap-3 p-5">
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 truncate text-xl font-semibold tabular-nums text-slate-900">{value}</p>
      </div>
      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${STAT_TONE[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
    </Card>
  )
}

const DAY_MS = 24 * 60 * 60 * 1000

/** 7-day bar sparkline — no charting library, just SVG, kept tiny for a dashboard card. */
function WeekSparkline({ counts }: { counts: number[] }) {
  const max = Math.max(1, ...counts)
  const w = 240
  const h = 64
  const barW = w / counts.length
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full overflow-visible">
      <line x1="0" y1={h - 0.5} x2={w} y2={h - 0.5} stroke="currentColor" strokeWidth="1" className="text-slate-200" />
      {counts.map((c, i) => {
        const barH = (c / max) * (h - 12)
        const isLast = i === counts.length - 1
        return (
          <rect
            key={i}
            x={i * barW + barW * 0.22}
            y={h - barH}
            width={barW * 0.56}
            height={Math.max(barH, c > 0 ? 3 : 0)}
            rx={3}
            className={isLast ? 'fill-orange-600' : 'fill-orange-200'}
          />
        )
      })}
    </svg>
  )
}

interface ActivityItem {
  id: string
  date: string
  icon: typeof IconUser
  tone: keyof typeof STAT_TONE
  text: ReactNode
  href: string
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'agora mesmo'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `há ${days}d`
  return new Date(iso).toLocaleDateString('pt-BR')
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

  const weekCounts = useMemo(() => {
    const startOfToday = new Date().setHours(0, 0, 0, 0)
    return Array.from({ length: 7 }, (_, i) => {
      const dayStart = startOfToday - (6 - i) * DAY_MS
      const dayEnd = dayStart + DAY_MS
      return tickets.filter((t) => {
        const created = new Date(t.created_at).getTime()
        return created >= dayStart && created < dayEnd
      }).length
    })
  }, [tickets])

  const concludedThisWeek = tickets.filter(
    (t) => t.status === 'concluido' && Date.now() - new Date(t.updated_at).getTime() <= WEEK_MS,
  ).length

  const recentActivity = useMemo(() => {
    const items: ActivityItem[] = []
    for (const t of tickets) {
      items.push({
        id: `ticket-${t.id}`,
        date: t.updated_at,
        icon: IconInbox,
        tone: 'orange',
        text: (
          <>
            Chamado <span className="font-medium text-slate-900">#{t.number} {t.subject}</span> — {CATEGORY_LABEL[t.category]}
          </>
        ),
        href: `/chamados/${t.id}`,
      })
    }
    for (const d of deals) {
      items.push({
        id: `deal-${d.id}`,
        date: d.created_at,
        icon: IconTrendingUp,
        tone: 'purple',
        text: (
          <>
            Negociação criada — <span className="font-medium text-slate-900">{d.title}</span>
          </>
        ),
        href: '/negociacoes',
      })
    }
    for (const c of companies) {
      items.push({
        id: `company-${c.id}`,
        date: c.created_at,
        icon: IconBuilding,
        tone: 'blue',
        text: (
          <>
            Nova empresa cadastrada — <span className="font-medium text-slate-900">{c.name}</span>
          </>
        ),
        href: `/empresas/${c.id}`,
      })
    }
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8)
  }, [tickets, deals, companies])

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
        <StatCard label="Contatos" value={contacts.length} icon={IconUser} tone="blue" />
        <StatCard label="Empresas" value={companies.length} icon={IconBuilding} tone="blue" />
        <StatCard label="Negociações em aberto" value={openDeals.length} icon={IconTrendingUp} tone="purple" />
        <StatCard
          label="Valor em pipeline"
          value={pipelineValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          icon={IconInbox}
          tone="emerald"
        />
      </div>

      {/* Atividade recente + resumo da semana */}
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Atividade recente</h2>
          {recentActivity.length === 0 ? (
            <EmptyState icon={<IconInbox className="h-5 w-5" />} title="Nenhuma atividade ainda." compact />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentActivity.map((item) => (
                <li key={item.id}>
                  <Link to={item.href} className="flex items-center gap-3 py-2.5 text-sm transition-colors hover:bg-slate-50">
                    <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${STAT_TONE[item.tone]}`}>
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-slate-700">{item.text}</span>
                    <span className="flex-shrink-0 text-xs text-slate-400">{timeAgo(item.date)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
            <IconBarChart className="h-4 w-4 text-slate-400" /> Resumo da semana
          </h2>
          <p className="text-xs text-slate-500">Chamados abertos por dia</p>
          <div className="mt-2 text-orange-600">
            <WeekSparkline counts={weekCounts} />
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <IconCheckCircle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-semibold tabular-nums text-slate-900">{concludedThisWeek}</p>
              <p className="text-xs text-slate-500">concluído(s) nos últimos 7 dias</p>
            </div>
          </div>
        </Card>
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
