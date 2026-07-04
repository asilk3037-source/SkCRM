import { useMemo } from 'react'
import { useDeals, usePipelineStages } from '../hooks/useDeals'
import { useTickets } from '../hooks/useTickets'
import { useOrg } from '../context/OrgContext'

function Bar({ label, value, max, tone = 'orange', suffix = '' }: { label: string; value: number; max: number; tone?: 'orange' | 'emerald'; suffix?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="font-medium text-slate-900">
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${tone === 'orange' ? 'bg-orange-500' : 'bg-emerald-500'}`}
          style={{ width: `${Math.max(pct, value > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  )
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {hint && <p className="mb-4 mt-0.5 text-xs text-slate-400">{hint}</p>}
      {!hint && <div className="mb-4" />}
      <div className="space-y-3">{children}</div>
    </div>
  )
}

export function Reports() {
  const { data: deals } = useDeals()
  const { data: stages } = usePipelineStages()
  const { data: tickets } = useTickets()
  const { members } = useOrg()

  const funnel = useMemo(
    () =>
      stages.map((stage) => {
        const stageDeals = deals.filter((d) => d.stage_id === stage.id && d.status === 'open')
        return {
          name: stage.name,
          count: stageDeals.length,
          value: stageDeals.reduce((sum, d) => sum + Number(d.value), 0),
        }
      }),
    [stages, deals],
  )
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.count))

  const wonDeals = deals.filter((d) => d.status === 'won')
  const lostDeals = deals.filter((d) => d.status === 'lost')
  const conversionRate =
    wonDeals.length + lostDeals.length > 0
      ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
      : null

  const resolvedTickets = tickets.filter((t) => t.resolved_at)
  const avgResolutionDays = useMemo(() => {
    if (resolvedTickets.length === 0) return null
    const totalMs = resolvedTickets.reduce(
      (sum, t) => sum + (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()),
      0,
    )
    return totalMs / resolvedTickets.length / (1000 * 60 * 60 * 24)
  }, [resolvedTickets])

  const memberLabel = (userId: string) =>
    members.find((m) => m.user_id === userId)?.profile?.display_name ??
    members.find((m) => m.user_id === userId)?.profile?.email ??
    'Sem responsável'

  const production = useMemo(() => {
    const closed = tickets.filter((t) => t.status === 'fechado' || t.status === 'resolvido')
    const byAssignee = new Map<string, number>()
    for (const t of closed) {
      const key = t.assignee_id ?? '—'
      byAssignee.set(key, (byAssignee.get(key) ?? 0) + 1)
    }
    return [...byAssignee.entries()]
      .map(([id, count]) => ({ label: id === '—' ? 'Sem responsável' : memberLabel(id), count }))
      .sort((a, b) => b.count - a.count)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, members])
  const maxProduction = Math.max(1, ...production.map((p) => p.count))

  const priorityBreakdown = useMemo(() => {
    const active = tickets.filter((t) => t.status !== 'fechado')
    const counts: Record<string, number> = { baixa: 0, media: 0, alta: 0, urgente: 0 }
    for (const t of active) counts[t.priority] = (counts[t.priority] ?? 0) + 1
    return counts
  }, [tickets])
  const maxPriority = Math.max(1, ...Object.values(priorityBreakdown))

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Relatórios</h1>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Funil de vendas" hint="Negociações em aberto por etapa">
          {funnel.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma etapa cadastrada.</p>
          ) : (
            funnel.map((f) => <Bar key={f.name} label={f.name} value={f.count} max={maxFunnel} />)
          )}
          {(wonDeals.length > 0 || lostDeals.length > 0) && (
            <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
              Taxa de conversão: <span className="font-semibold text-slate-700">{conversionRate}%</span> (
              {wonDeals.length} ganhas, {lostDeals.length} perdidas)
            </p>
          )}
        </Card>

        <Card title="Tempo de resolução de chamados" hint="Média entre abertura e conclusão">
          {avgResolutionDays === null ? (
            <p className="text-sm text-slate-400">Nenhum chamado resolvido ainda.</p>
          ) : (
            <>
              <p className="text-3xl font-semibold text-slate-900">
                {avgResolutionDays < 1
                  ? `${Math.round(avgResolutionDays * 24)}h`
                  : `${avgResolutionDays.toFixed(1)} dias`}
              </p>
              <p className="text-xs text-slate-500">
                com base em {resolvedTickets.length} chamado(s) já resolvido(s) ou concluído(s)
              </p>
            </>
          )}
        </Card>

        <Card title="Produção por pessoa" hint="Chamados resolvidos ou concluídos, por responsável">
          {production.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum chamado concluído ainda.</p>
          ) : (
            production.map((p) => <Bar key={p.label} label={p.label} value={p.count} max={maxProduction} tone="emerald" />)
          )}
        </Card>

        <Card title="Chamados ativos por prioridade" hint="Aberto, em andamento ou aguardando cliente">
          <Bar label="Baixa" value={priorityBreakdown.baixa} max={maxPriority} />
          <Bar label="Média" value={priorityBreakdown.media} max={maxPriority} />
          <Bar label="Alta" value={priorityBreakdown.alta} max={maxPriority} />
          <Bar label="Urgente" value={priorityBreakdown.urgente} max={maxPriority} />
        </Card>
      </div>
    </div>
  )
}
