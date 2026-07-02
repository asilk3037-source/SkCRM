import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTickets } from '../hooks/useTickets'
import { useTicketComments } from '../hooks/useTicketComments'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import { useAuth } from '../context/AuthContext'
import type { Contact, Company, TicketStatus, TicketPriority, TicketCategory } from '../types/database'
import { STATUS_LABEL, STATUS_COLOR, PRIORITY_LABEL, PRIORITY_COLOR, CATEGORY_LABEL } from '../lib/ticketMeta'

export function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: tickets, loading, update, remove } = useTickets()
  const { data: contacts } = useSupabaseTable<Contact>('contacts', 'name')
  const { data: companies } = useSupabaseTable<Company>('companies', 'name')
  const [newComment, setNewComment] = useState('')

  const ticket = tickets.find((t) => t.id === id)
  const { comments, loading: commentsLoading, addComment } = useTicketComments(id ?? '')

  if (loading) return <p className="text-sm text-slate-500">Carregando...</p>
  if (!ticket) return <Navigate to="/chamados" replace />

  const contact = contacts.find((c) => c.id === ticket.contact_id)
  const company = companies.find(
    (c) => c.id === (ticket.company_id ?? contact?.company_id ?? null),
  )
  const requester = contact?.name ?? company?.name ?? 'Solicitante não informado'

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

  const isResolved = ticket.status === 'resolvido'
  const isClosed = ticket.status === 'fechado'

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link to="/chamados" className="text-sm text-slate-500 hover:text-slate-900">
          ← Voltar para chamados
        </Link>
        <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700">
          Excluir chamado
        </button>
      </div>

      {/* Header — SGN style: "Chamado #N aberto por Fulano (Empresa) | telefone" */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">
          Chamado <span className="text-blue-700">#{ticket.number}</span> aberto por {requester}
          {company && contact ? ` (${company.name})` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {contact?.phone || company?.phone ? `${contact?.phone ?? company?.phone} · ` : ''}
          {contact?.email ?? ''}
        </p>
      </div>

      {/* Dados do chamado */}
      <div className="mb-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
          Dados do chamado
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 pt-3 pb-1">Nº</th>
                <th className="px-4 pt-3 pb-1">Tipo</th>
                <th className="px-4 pt-3 pb-1">Prioridade</th>
                <th className="px-4 pt-3 pb-1">Status</th>
                <th className="px-4 pt-3 pb-1">Abertura</th>
                <th className="px-4 pt-3 pb-1">Última atualização</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 pt-1 pb-3 font-semibold text-blue-700">#{ticket.number}</td>
                <td className="px-4 pt-1 pb-3">
                  <select
                    value={ticket.category}
                    onChange={(e) => update(ticket.id, { category: e.target.value as TicketCategory })}
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                  >
                    {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 pt-1 pb-3">
                  <select
                    value={ticket.priority}
                    onChange={(e) => update(ticket.id, { priority: e.target.value as TicketPriority })}
                    className={`rounded-md border border-slate-300 px-2 py-1 text-sm ${PRIORITY_COLOR[ticket.priority]}`}
                  >
                    {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 pt-1 pb-3">
                  <select
                    value={ticket.status}
                    onChange={(e) => update(ticket.id, { status: e.target.value as TicketStatus })}
                    className={`rounded-md border border-slate-300 px-2 py-1 text-sm ${STATUS_COLOR[ticket.status]}`}
                  >
                    {Object.entries(STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 pt-1 pb-3 text-slate-600">
                  {new Date(ticket.created_at).toLocaleString('pt-BR')}
                </td>
                <td className="px-4 pt-1 pb-3 text-slate-600">
                  {new Date(ticket.updated_at).toLocaleString('pt-BR')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* Quick actions bar — the SGN validation flow */}
        <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2.5">
          {!isResolved && !isClosed && (
            <>
              <button
                onClick={() => update(ticket.id, { status: 'resolvido' })}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              >
                ✓ Marcar como resolvido
              </button>
              <button
                onClick={() => update(ticket.id, { status: 'aguardando_cliente' })}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Aguardar retorno do cliente
              </button>
            </>
          )}
          {isResolved && (
            <>
              <button
                onClick={() => update(ticket.id, { status: 'fechado' })}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              >
                ✓ Validar e concluir
              </button>
              <button
                onClick={() => update(ticket.id, { status: 'em_andamento' })}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                ↩ Retornar (não resolvido)
              </button>
              <span className="self-center text-xs text-slate-500">
                Valide a solução antes de concluir — se algo ficou pendente, retorne o chamado.
              </span>
            </>
          )}
          {isClosed && (
            <button
              onClick={() => update(ticket.id, { status: 'aberto' })}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Reabrir chamado
            </button>
          )}
        </div>
      </div>

      {/* Assunto e descrição */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-xs font-semibold uppercase text-slate-400">Assunto</p>
          <p className="mt-0.5 text-sm font-medium text-slate-900">{ticket.subject}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs font-semibold uppercase text-slate-400">Descrição</p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">
            {ticket.description || 'Sem descrição.'}
          </p>
        </div>
      </div>

      {/* Interações — conversation thread, SGN style */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
          Interações ({comments.length})
        </h2>
        {commentsLoading ? (
          <p className="px-4 py-3 text-sm text-slate-500">Carregando...</p>
        ) : (
          <div className="space-y-3 p-4">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                    {(user?.email ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                  <span className="text-xs font-medium text-slate-700">{user?.email}</span>
                  <span className="ml-auto text-xs text-slate-400">
                    {new Date(comment.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-700">{comment.body}</p>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-sm text-slate-500">Nenhuma interação registrada ainda.</p>
            )}
          </div>
        )}
        <form onSubmit={handleAddComment} className="border-t border-slate-200 p-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escreva aqui a mensagem — ela fica registrada no histórico do chamado."
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="mt-2 flex justify-end">
            <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              Enviar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
