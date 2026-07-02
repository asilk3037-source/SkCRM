import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTickets } from '../hooks/useTickets'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import type { Contact, Company, Ticket, TicketStatus } from '../types/database'
import { STATUS_LABEL, STATUS_COLOR, PRIORITY_LABEL, PRIORITY_COLOR, CATEGORY_LABEL } from '../lib/ticketMeta'

const emptyForm = {
  subject: '',
  description: '',
  contact_id: '',
  company_id: '',
  priority: 'media' as const,
  category: 'suporte' as const,
}

/** SGN-style management boxes: each groups tickets by "who needs to act". */
const BOXES: Array<{ key: string; title: string; hint: string; match: (t: Ticket) => boolean }> = [
  {
    key: 'atendimento',
    title: 'Em atendimento',
    hint: 'Chamados abertos ou em andamento com você',
    match: (t) => t.status === 'aberto' || t.status === 'em_andamento',
  },
  {
    key: 'cliente',
    title: 'Aguardando cliente',
    hint: 'Esperando retorno de quem abriu o chamado',
    match: (t) => t.status === 'aguardando_cliente',
  },
  {
    key: 'validacao',
    title: 'Aguardando validação',
    hint: 'Resolvidos, aguardando confirmação para encerrar',
    match: (t) => t.status === 'resolvido',
  },
]

export function Tickets() {
  const navigate = useNavigate()
  const { data: tickets, loading, create } = useTickets()
  const { data: contacts } = useSupabaseTable<Contact>('contacts', 'name')
  const { data: companies } = useSupabaseTable<Company>('companies', 'name')
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)

  // "Outros chamados" filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'todos'>('todos')

  const contactName = (id: string | null) => contacts.find((c) => c.id === id)?.name
  const companyName = (id: string | null) => companies.find((c) => c.id === id)?.name
  const requesterOf = (t: Ticket) => contactName(t.contact_id) || companyName(t.company_id) || '—'

  const sorted = useMemo(
    () => [...tickets].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [tickets],
  )

  const others = sorted.filter((t) => {
    if (statusFilter !== 'todos' && t.status !== statusFilter) return false
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
    const created = await create({
      subject: form.subject,
      description: form.description || null,
      contact_id: form.contact_id || null,
      company_id: form.company_id || null,
      priority: form.priority,
      category: form.category,
      status: 'aberto',
    })
    setForm(emptyForm)
    setShowForm(false)
    navigate(`/chamados/${created.id}`)
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Chamados</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {showForm ? 'Cancelar' : '+ Novo chamado'}
        </button>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        Acompanhe seus chamados pelas caixas abaixo — cada uma mostra com quem está a próxima ação.
      </p>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-5">
          <input
            required
            placeholder="Assunto"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={form.contact_id}
            onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Sem contato</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={form.company_id}
            onChange={(e) => setForm({ ...form, company_id: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Sem empresa</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as typeof form.category })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                Tipo: {label}
              </option>
            ))}
          </select>
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value as typeof form.priority })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                Prioridade: {label}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Descreva a solicitação com detalhes — quanto mais contexto, mais rápido o atendimento."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="col-span-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Abrir chamado
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {BOXES.map((box) => {
              const items = sorted.filter(box.match)
              return (
                <div key={box.key} className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 bg-slate-900 px-4 py-2.5">
                    <p className="text-sm font-semibold text-white">
                      {box.title} <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">{items.length}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-300">{box.hint}</p>
                  </div>
                  {items.length === 0 ? (
                    <p className="flex flex-1 items-center justify-center px-4 py-8 text-sm text-slate-400">Sem chamados</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {items.slice(0, 6).map((t) => (
                        <li key={t.id}>
                          <Link to={`/chamados/${t.id}`} className="block px-4 py-2.5 hover:bg-slate-50">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-blue-700">#{t.number}</span>
                              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_COLOR[t.priority]}`}>
                                {PRIORITY_LABEL[t.priority]}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-sm font-medium text-slate-800">{t.subject}</p>
                            <p className="truncate text-xs text-slate-400">{requesterOf(t)}</p>
                          </Link>
                        </li>
                      ))}
                      {items.length > 6 && (
                        <li className="px-4 py-2 text-center text-xs text-slate-400">+ {items.length - 6} chamados</li>
                      )}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-8 rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-700">Outros chamados ({others.length})</h2>
              <div className="ml-auto flex items-center gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nº, assunto ou solicitante..."
                  className="w-64 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'todos')}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                >
                  <option value="todos">Todos os status</option>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {others.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">Nenhum chamado encontrado com esses filtros.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Nº</th>
                      <th className="px-4 py-3">Assunto</th>
                      <th className="px-4 py-3">Solicitante</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Prioridade</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Abertura</th>
                      <th className="px-4 py-3">Atualizado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {others.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Link to={`/chamados/${t.id}`} className="font-semibold text-blue-700 hover:underline">
                            #{t.number}
                          </Link>
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 font-medium text-slate-900">{t.subject}</td>
                        <td className="px-4 py-3 text-slate-600">{requesterOf(t)}</td>
                        <td className="px-4 py-3 text-slate-600">{CATEGORY_LABEL[t.category]}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLOR[t.priority]}`}>
                            {PRIORITY_LABEL[t.priority]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[t.status]}`}>
                            {STATUS_LABEL[t.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">{new Date(t.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{new Date(t.updated_at).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
