import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTickets } from '../hooks/useTickets'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import type { Contact, Company, TicketStatus } from '../types/database'
import { STATUS_LABEL, STATUS_COLOR, PRIORITY_LABEL, PRIORITY_COLOR } from '../lib/ticketMeta'

const emptyForm = { subject: '', description: '', contact_id: '', company_id: '', priority: 'media' as const }
const statusFilters: Array<TicketStatus | 'todos'> = [
  'todos',
  'aberto',
  'em_andamento',
  'aguardando_cliente',
  'resolvido',
  'fechado',
]

export function Tickets() {
  const { data: tickets, loading, create } = useTickets()
  const { data: contacts } = useSupabaseTable<Contact>('contacts', 'name')
  const { data: companies } = useSupabaseTable<Company>('companies', 'name')
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<TicketStatus | 'todos'>('todos')

  const contactName = (id: string | null) => contacts.find((c) => c.id === id)?.name
  const companyName = (id: string | null) => companies.find((c) => c.id === id)?.name

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await create({
      subject: form.subject,
      description: form.description || null,
      contact_id: form.contact_id || null,
      company_id: form.company_id || null,
      priority: form.priority,
      status: 'aberto',
    })
    setForm(emptyForm)
    setShowForm(false)
  }

  const visible = tickets
    .filter((t) => filter === 'todos' || t.status === filter)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Chamados</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {showForm ? 'Cancelar' : 'Novo chamado'}
        </button>
      </div>

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
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value as typeof form.priority })}
            className="col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="baixa">Prioridade baixa</option>
            <option value="media">Prioridade média</option>
            <option value="alta">Prioridade alta</option>
            <option value="urgente">Prioridade urgente</option>
          </select>
          <textarea
            placeholder="Descrição do problema/solicitação"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="col-span-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Abrir chamado
          </button>
        </form>
      )}

      <div className="mb-4 flex gap-2">
        {statusFilters.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === status ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            }`}
          >
            {status === 'todos' ? 'Todos' : STATUS_LABEL[status]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum chamado por aqui.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Assunto</th>
                <th className="px-4 py-3">Contato / Empresa</th>
                <th className="px-4 py-3">Prioridade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Atualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((ticket) => (
                <tr key={ticket.id} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/chamados/${ticket.id}`} className="font-medium text-slate-900 hover:underline">
                      {ticket.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {contactName(ticket.contact_id) || companyName(ticket.company_id) || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLOR[ticket.priority]}`}>
                      {PRIORITY_LABEL[ticket.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[ticket.status]}`}>
                      {STATUS_LABEL[ticket.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(ticket.updated_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
