import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Company, Contact, Ticket, TicketPriority } from '../types/database'
import { STATUS_LABEL, STATUS_TONE, PRIORITY_LABEL, PRIORITY_TONE } from '../lib/ticketMeta'
import { Modal } from './ui/Modal'
import { Input, Select } from './ui/Field'
import { Badge } from './ui/Badge'
import { EmptyState } from './ui/EmptyState'
import { IconChevronDown, IconInbox, IconSearch } from './ui/icons'

const PAGE_SIZE = 8

type SortKey = 'number' | 'subject' | 'priority' | 'status' | 'updated_at'

const PRIORITY_ORDER: Record<TicketPriority, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 }

export function TicketListModal({
  title,
  hint,
  tickets,
  contacts,
  companies,
  onClose,
}: {
  title: string
  hint?: string
  tickets: Ticket[]
  contacts: Contact[]
  companies: Company[]
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'todas'>('todas')
  const [sortKey, setSortKey] = useState<SortKey>('updated_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)

  const requesterOf = (t: Ticket) =>
    contacts.find((c) => c.id === t.contact_id)?.name ?? companies.find((c) => c.id === t.company_id)?.name ?? '—'

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  const filtered = useMemo(() => {
    let rows = tickets
    if (priorityFilter !== 'todas') rows = rows.filter((t) => t.priority === priorityFilter)
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (t) => String(t.number).includes(q) || t.subject.toLowerCase().includes(q) || requesterOf(t).toLowerCase().includes(q),
      )
    }
    const sorted = [...rows].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'number') cmp = a.number - b.number
      else if (sortKey === 'subject') cmp = a.subject.localeCompare(b.subject)
      else if (sortKey === 'priority') cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status)
      else cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, search, priorityFilter, sortKey, sortDir, contacts, companies])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)

  function Th({ label, sortableKey }: { label: string; sortableKey?: SortKey }) {
    const active = sortableKey && sortKey === sortableKey
    return (
      <th className="px-4 py-3 font-medium">
        {sortableKey ? (
          <button
            onClick={() => toggleSort(sortableKey)}
            className={`flex items-center gap-1 hover:text-slate-700 ${active ? 'text-slate-700' : ''}`}
          >
            {label}
            <IconChevronDown
              className={`h-3 w-3 transition-transform ${active && sortDir === 'asc' ? 'rotate-180' : ''} ${active ? 'opacity-100' : 'opacity-30'}`}
            />
          </button>
        ) : (
          label
        )}
      </th>
    )
  }

  return (
    <Modal title={title} onClose={onClose} size="lg">
      <div className="border-b border-slate-200 p-4">
        {hint && <p className="mb-3 text-xs text-slate-400">{hint}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              placeholder="Buscar por nº, assunto ou solicitante..."
              className="!py-1.5 pl-8"
            />
          </div>
          <Select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value as TicketPriority | 'todas')
              setPage(0)
            }}
            className="!w-auto !py-1.5"
          >
            <option value="todas">Todas as prioridades</option>
            {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<IconInbox className="h-5 w-5" />} title="Nenhum chamado encontrado." compact />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <Th label="Nº" sortableKey="number" />
                <Th label="Assunto" sortableKey="subject" />
                <Th label="Solicitante" />
                <Th label="Prioridade" sortableKey="priority" />
                <Th label="Status" sortableKey="status" />
                <Th label="Atualizado" sortableKey="updated_at" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <Link to={`/chamados/${t.id}`} onClick={onClose} className="font-semibold text-orange-600 hover:underline">
                      #{t.number}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 font-medium text-slate-900">{t.subject}</td>
                  <td className="px-4 py-3 text-slate-600">{requesterOf(t)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums text-slate-400">
                    {new Date(t.updated_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
          <span>
            Página {currentPage + 1} de {pageCount} · {filtered.length} chamado(s)
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="rounded-md border border-slate-300 px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={currentPage >= pageCount - 1}
              className="rounded-md border border-slate-300 px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
