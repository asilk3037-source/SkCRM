import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTickets } from '../hooks/useTickets'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import type { Contact, Company, Ticket, TicketCategory, TicketPriority, TicketSector, TicketStatus } from '../types/database'
import { STATUS_LABEL, STATUS_TONE, PRIORITY_LABEL, PRIORITY_TONE, CATEGORY_LABEL, SECTOR_LABEL, isTerminalStatus } from '../lib/ticketMeta'
import { notify } from '../lib/notify'
import { toCsv, downloadCsv } from '../lib/csv'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { FieldGroup, Input, Select, Textarea } from '../components/ui/Field'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'
import { EmptyState } from '../components/ui/EmptyState'
import { PageLoading } from '../components/ui/Spinner'
import { LoadError } from '../components/ui/LoadError'
import { IconAlertTriangle, IconDownload, IconInbox, IconPlus, IconSearch } from '../components/ui/icons'

const TICKET_EXPORT_HEADERS = [
  { key: 'number', label: 'Número' },
  { key: 'subject', label: 'Assunto' },
  { key: 'requester', label: 'Solicitante' },
  { key: 'category', label: 'Tipo' },
  { key: 'priority', label: 'Prioridade' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Abertura' },
  { key: 'updated_at', label: 'Atualizado' },
]

const emptyForm: {
  subject: string
  description: string
  contact_id: string
  company_id: string
  priority: TicketPriority
  category: TicketCategory
} = {
  subject: '',
  description: '',
  contact_id: '',
  company_id: '',
  priority: 'media',
  category: 'suporte',
}

/** SGN-style management boxes: each groups tickets by "who needs to act". */
const BOXES: Array<{ key: string; title: string; hint: string; match: (t: Ticket) => boolean }> = [
  {
    key: 'atendimento',
    title: 'Em atendimento',
    hint: 'Da análise inicial até o teste — com a equipe',
    match: (t) =>
      !isTerminalStatus(t.status) &&
      t.status !== 'pendente_cliente' &&
      t.status !== 'aguardando_validacao' &&
      t.status !== 'matriz_decisao',
  },
  {
    key: 'matriz',
    title: 'Matriz de decisão',
    hint: 'Aguardando o supervisor decidir: Backlog ou técnico',
    match: (t) => t.status === 'matriz_decisao',
  },
  {
    key: 'cliente',
    title: 'Pendente com cliente',
    hint: 'Esperando retorno de quem abriu o chamado',
    match: (t) => t.status === 'pendente_cliente',
  },
  {
    key: 'validacao',
    title: 'Aguardando validação',
    hint: 'Testado, aguardando confirmação do cliente para concluir',
    match: (t) => t.status === 'aguardando_validacao',
  },
]

export function Tickets() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: tickets, loading, error: loadError, refresh, create } = useTickets()
  const { data: contacts } = useSupabaseTable<Contact>('contacts', 'name')
  const { data: companies } = useSupabaseTable<Company>('companies', 'name')
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Chegando do painel de uma empresa ("Abrir chamado interno") — pré-seleciona a empresa e já abre o formulário.
  useEffect(() => {
    const empresaId = searchParams.get('empresa')
    if (empresaId) {
      setForm((f) => ({ ...f, company_id: empresaId }))
      setShowForm(true)
      searchParams.delete('empresa')
      setSearchParams(searchParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // "Outros chamados" filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'todos'>('todos')
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'todos'>('todos')
  const [sectorFilter, setSectorFilter] = useState<TicketSector | 'todos'>('todos')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const contactName = (id: string | null) => contacts.find((c) => c.id === id)?.name
  const companyName = (id: string | null) => companies.find((c) => c.id === id)?.name
  const requesterOf = (t: Ticket) => contactName(t.contact_id) || companyName(t.company_id) || '—'

  const sorted = useMemo(
    () => [...tickets].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [tickets],
  )

  const hasFilters =
    search.trim() !== '' ||
    statusFilter !== 'todos' ||
    categoryFilter !== 'todos' ||
    sectorFilter !== 'todos' ||
    dateFrom !== '' ||
    dateTo !== ''

  function clearFilters() {
    setSearch('')
    setStatusFilter('todos')
    setCategoryFilter('todos')
    setSectorFilter('todos')
    setDateFrom('')
    setDateTo('')
  }

  const others = sorted.filter((t) => {
    if (statusFilter !== 'todos' && t.status !== statusFilter) return false
    if (categoryFilter !== 'todos' && t.category !== categoryFilter) return false
    if (sectorFilter !== 'todos' && t.sector !== sectorFilter) return false
    const opened = t.created_at.slice(0, 10)
    if (dateFrom && opened < dateFrom) return false
    if (dateTo && opened > dateTo) return false
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      String(t.number).includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      requesterOf(t).toLowerCase().includes(q)
    )
  })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!form.contact_id && !form.company_id) {
      setFormError('Selecione um contato ou uma empresa.')
      return
    }
    if (form.category === 'erro_sistema' && !form.description.trim()) {
      setFormError('Descreva o erro — obrigatório para chamados desse tipo.')
      return
    }
    const created = await create({
      subject: form.subject,
      description: form.description || null,
      contact_id: form.contact_id || null,
      company_id: form.company_id || null,
      priority: form.priority,
      category: form.category,
      status: 'analisar',
    })
    notify('ticket_created', created.id)
    setForm(emptyForm)
    setShowForm(false)
    navigate(`/chamados/${created.id}`)
  }

  return (
    <div>
      <PageHeader
        title="Chamados"
        description="Acompanhe seus chamados pelas caixas abaixo — cada uma mostra com quem está a próxima ação."
        actions={
          <Button variant={showForm ? 'secondary' : 'primary'} onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancelar' : (
              <>
                <IconPlus className="h-4 w-4" /> Novo chamado
              </>
            )}
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6 p-5">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Assunto" className="sm:col-span-2">
              <Input required autoFocus value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </FieldGroup>
            <FieldGroup label="Contato">
              <Select value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })}>
                <option value="">Sem contato</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup label="Empresa">
              <Select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                <option value="">Sem empresa</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup label="Tipo">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as typeof form.category })}>
                {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup label="Prioridade">
              <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as typeof form.priority })}>
                {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup label="Descrição" className="sm:col-span-2">
              <Textarea
                placeholder="Descreva a solicitação com detalhes — quanto mais contexto, mais rápido o atendimento."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </FieldGroup>
            {formError && (
              <div className="sm:col-span-2">
                <Alert tone="error">{formError}</Alert>
              </div>
            )}
            <div className="sm:col-span-2">
              <Button type="submit">Abrir chamado</Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <PageLoading />
      ) : loadError ? (
        <LoadError message={loadError} onRetry={refresh} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {BOXES.map((box) => {
              const items = sorted.filter(box.match)
              return (
                <Card key={box.key} className="flex flex-col overflow-hidden">
                  <div className="border-b border-orange-700/20 bg-orange-600 px-4 py-2.5">
                    <p className="flex items-center gap-2 text-sm font-semibold text-white">
                      {box.title}
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs tabular-nums">{items.length}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-orange-100">{box.hint}</p>
                  </div>
                  {items.length === 0 ? (
                    <EmptyState title="Sem chamados" compact />
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {items.slice(0, 6).map((t) => (
                        <li key={t.id}>
                          <Link to={`/chamados/${t.id}`} className="block px-4 py-2.5 transition-colors hover:bg-slate-50">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-orange-600">#{t.number}</span>
                              <Badge tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge>
                              {t.priority === 'urgente' && !t.assignee_id && (
                                <span
                                  title="Urgente sem responsável"
                                  className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700"
                                >
                                  <IconAlertTriangle className="h-3 w-3" /> sem responsável
                                </span>
                              )}
                            </div>
                            <p className="mt-1 truncate text-sm font-medium text-slate-800">{t.subject}</p>
                            <p className="truncate text-xs text-slate-400">{requesterOf(t)}</p>
                          </Link>
                        </li>
                      ))}
                      {items.length > 6 && (
                        <li className="px-4 py-2 text-center text-xs text-slate-400">+ {items.length - 6} chamados</li>
                      )}
                    </ul>
                  )}
                </Card>
              )
            })}
          </div>

          <Card className="mt-8 overflow-hidden">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  Outros chamados
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">{others.length}</span>
                </h2>
                {hasFilters && (
                  <button onClick={clearFilters} className="text-xs font-medium text-orange-600 hover:underline">
                    Limpar filtros
                  </button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="ml-auto sm:ml-0"
                  disabled={others.length === 0}
                  onClick={() => {
                    const rows = others.map((t) => ({
                      number: String(t.number),
                      subject: t.subject,
                      requester: requesterOf(t),
                      category: CATEGORY_LABEL[t.category],
                      priority: PRIORITY_LABEL[t.priority],
                      status: STATUS_LABEL[t.status],
                      created_at: new Date(t.created_at).toLocaleDateString('pt-BR'),
                      updated_at: new Date(t.updated_at).toLocaleDateString('pt-BR'),
                    }))
                    downloadCsv(`chamados-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows, TICKET_EXPORT_HEADERS))
                  }}
                >
                  <IconDownload className="h-3.5 w-3.5" /> Exportar CSV
                </Button>
                <div className="relative w-full sm:w-64">
                  <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nº, assunto ou solicitante..."
                    className="!py-1.5 pl-8"
                  />
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'todos')}
                  className="!w-auto !py-1.5"
                >
                  <option value="todos">Todos os status</option>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as TicketCategory | 'todos')}
                  className="!w-auto !py-1.5"
                >
                  <option value="todos">Todos os tipos</option>
                  {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <Select
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value as TicketSector | 'todos')}
                  className="!w-auto !py-1.5"
                >
                  <option value="todos">Todos os setores</option>
                  {Object.entries(SECTOR_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <label className="flex items-center gap-1.5 text-xs text-slate-500">
                  Abertura de
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="!w-auto !py-1.5" />
                  até
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="!w-auto !py-1.5" />
                </label>
              </div>
            </CardHeader>
            {others.length === 0 ? (
              <EmptyState icon={<IconInbox className="h-5 w-5" />} title="Nenhum chamado encontrado com esses filtros." compact />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Nº</th>
                      <th className="px-4 py-3 font-medium">Assunto</th>
                      <th className="px-4 py-3 font-medium">Solicitante</th>
                      <th className="px-4 py-3 font-medium">Tipo</th>
                      <th className="px-4 py-3 font-medium">Prioridade</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Abertura</th>
                      <th className="px-4 py-3 font-medium">Atualizado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {others.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <Link to={`/chamados/${t.id}`} className="font-semibold text-orange-600 hover:underline">
                            #{t.number}
                          </Link>
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 font-medium text-slate-900">{t.subject}</td>
                        <td className="px-4 py-3 text-slate-600">{requesterOf(t)}</td>
                        <td className="px-4 py-3 text-slate-600">{CATEGORY_LABEL[t.category]}</td>
                        <td className="px-4 py-3">
                          <Badge tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums text-slate-400">{new Date(t.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="px-4 py-3 text-xs tabular-nums text-slate-400">{new Date(t.updated_at).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
