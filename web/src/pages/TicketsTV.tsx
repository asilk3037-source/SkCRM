import { useEffect, useState } from 'react'
import { useTickets } from '../hooks/useTickets'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import { useOrg } from '../context/OrgContext'
import type { Contact, Company } from '../types/database'
import { PRIORITY_LABEL, PRIORITY_TONE, STATUS_LABEL, isTerminalStatus } from '../lib/ticketMeta'
import { Badge } from '../components/ui/Badge'

const REFRESH_MS = 30_000

/** Big-screen, auto-refreshing view of the queue — meant for a TV in the office, like SGN's TV Chamados. */
export function TicketsTV() {
  const { data: tickets, refresh } = useTickets()
  const { data: contacts } = useSupabaseTable<Contact>('contacts', 'name')
  const { data: companies } = useSupabaseTable<Company>('companies', 'name')
  const { org, members } = useOrg()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      refresh()
      setNow(new Date())
    }, REFRESH_MS)
    return () => clearInterval(interval)
  }, [refresh])

  const requesterOf = (contactId: string | null, companyId: string | null) =>
    contacts.find((c) => c.id === contactId)?.name ?? companies.find((c) => c.id === companyId)?.name ?? '—'

  const memberLabel = (userId: string | null) =>
    userId ? (members.find((m) => m.user_id === userId)?.profile?.display_name ?? '—') : '—'

  const active = tickets
    .filter((t) => !isTerminalStatus(t.status))
    .sort((a, b) => {
      const order = { urgente: 0, alta: 1, media: 2, baixa: 3 }
      return order[a.priority] - order[b.priority] || new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
    })

  const urgentCount = active.filter((t) => t.priority === 'urgente').length

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            TV <span className="text-orange-500">Chamados</span>
          </h1>
          <p className="text-sm text-slate-400">{org?.name}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums">{now.toLocaleTimeString('pt-BR')}</p>
          <p className="text-sm tabular-nums text-slate-400">{active.length} chamados ativos · {urgentCount} urgentes</p>
        </div>
      </div>

      {active.length === 0 ? (
        <p className="mt-20 text-center text-2xl text-slate-500">Nenhum chamado ativo — fila em dia.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-sm uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Nº</th>
                  <th className="px-4 py-3 font-medium">Assunto</th>
                  <th className="px-4 py-3 font-medium">Solicitante</th>
                  <th className="px-4 py-3 font-medium">Responsável</th>
                  <th className="px-4 py-3 font-medium">Prioridade</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Atualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {active.map((t) => (
                  <tr key={t.id} className={t.priority === 'urgente' ? 'bg-red-950/40' : undefined}>
                    <td className="px-4 py-3 font-semibold tabular-nums text-orange-400">#{t.number}</td>
                    <td className="max-w-md truncate px-4 py-3 text-lg">{t.subject}</td>
                    <td className="px-4 py-3 text-slate-300">{requesterOf(t.contact_id, t.company_id)}</td>
                    <td className="px-4 py-3 text-slate-300">{memberLabel(t.assignee_id)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={PRIORITY_TONE[t.priority]} className="!text-sm">
                        {PRIORITY_LABEL[t.priority]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{STATUS_LABEL[t.status]}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-400">
                      {new Date(t.updated_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
