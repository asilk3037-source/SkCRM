import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTickets } from '../hooks/useTickets'
import { useTicketComments } from '../hooks/useTicketComments'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import type { Contact, Company, TicketStatus, TicketPriority } from '../types/database'
import { STATUS_LABEL, PRIORITY_LABEL } from '../lib/ticketMeta'

export function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: tickets, loading, update, remove } = useTickets()
  const { data: contacts } = useSupabaseTable<Contact>('contacts', 'name')
  const { data: companies } = useSupabaseTable<Company>('companies', 'name')
  const [newComment, setNewComment] = useState('')

  const ticket = tickets.find((t) => t.id === id)
  const { comments, loading: commentsLoading, addComment } = useTicketComments(id ?? '')

  if (loading) return <p className="text-sm text-slate-500">Carregando...</p>
  if (!ticket) return <Navigate to="/chamados" replace />

  const contact = contacts.find((c) => c.id === ticket.contact_id)
  const company = companies.find((c) => c.id === ticket.company_id)

  async function handleAddComment(e: FormEvent) {
    e.preventDefault()
    if (!newComment.trim()) return
    await addComment(newComment.trim())
    setNewComment('')
  }

  async function handleDelete() {
    if (!ticket) return
    await remove(ticket.id)
    navigate('/chamados')
  }

  return (
    <div>
      <Link to="/chamados" className="mb-4 inline-block text-sm text-slate-500 hover:text-slate-900">
        ← Voltar para chamados
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{ticket.subject}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {contact?.name || company?.name ? (
              <>
                {contact?.name}
                {contact?.name && company?.name ? ' · ' : ''}
                {company?.name}
              </>
            ) : (
              'Sem contato vinculado'
            )}
          </p>
        </div>
        <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700">
          Excluir chamado
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <label className="block text-sm font-medium text-slate-700">
          Status
          <select
            value={ticket.status}
            onChange={(e) => update(ticket.id, { status: e.target.value as TicketStatus })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Prioridade
          <select
            value={ticket.priority}
            onChange={(e) => update(ticket.id, { priority: e.target.value as TicketPriority })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {ticket.description && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
          {ticket.description}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
          Histórico ({comments.length})
        </h2>
        {commentsLoading ? (
          <p className="px-4 py-3 text-sm text-slate-500">Carregando...</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {comments.map((comment) => (
              <li key={comment.id} className="px-4 py-3 text-sm">
                <p className="text-slate-700">{comment.body}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(comment.created_at).toLocaleString('pt-BR')}
                </p>
              </li>
            ))}
            {comments.length === 0 && (
              <li className="px-4 py-3 text-sm text-slate-500">Nenhuma atualização registrada ainda.</li>
            )}
          </ul>
        )}
        <form onSubmit={handleAddComment} className="flex gap-2 border-t border-slate-200 p-4">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Adicionar atualização..."
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Enviar
          </button>
        </form>
      </div>
    </div>
  )
}
