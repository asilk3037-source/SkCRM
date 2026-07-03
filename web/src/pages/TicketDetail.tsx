import { useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTickets } from '../hooks/useTickets'
import { useTicketComments } from '../hooks/useTicketComments'
import { useTicketAttachments } from '../hooks/useTicketAttachments'
import { useTicketEvents } from '../hooks/useTicketEvents'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import { useAuth } from '../context/AuthContext'
import type {
  Contact,
  Company,
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TicketSector,
} from '../types/database'
import {
  STATUS_LABEL,
  STATUS_COLOR,
  PRIORITY_LABEL,
  PRIORITY_COLOR,
  CATEGORY_LABEL,
  SECTOR_LABEL,
  formatBytes,
} from '../lib/ticketMeta'

/** Turns "aberto -> resolvido" into "Aberto → Resolvido" using the label maps. */
function formatEventDetail(detail: string | null) {
  if (!detail) return ''
  const labels: Record<string, string> = { ...STATUS_LABEL, ...PRIORITY_LABEL }
  return detail
    .split(' -> ')
    .map((part) => labels[part] ?? part)
    .join(' → ')
}

/** Turns "suporte / Aline" into "Suporte / Aline". */
function formatForward(detail: string | null) {
  if (!detail) return ''
  const [sector, ...rest] = detail.split(' / ')
  const label = (SECTOR_LABEL as Record<string, string>)[sector] ?? sector
  return [label, ...rest].join(' / ')
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
      {children}
    </h2>
  )
}

function InteractionThread({
  title,
  hint,
  comments,
  authorEmail,
  onSend,
  placeholder,
}: {
  title: string
  hint: string
  comments: Array<{ id: string; body: string; created_at: string }>
  authorEmail: string
  onSend: (body: string) => Promise<void>
  placeholder: string
}) {
  const [text, setText] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    await onSend(text.trim())
    setText('')
  }

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-slate-700">
          {title} ({comments.length})
        </h2>
        <p className="text-xs text-slate-400">{hint}</p>
      </div>
      <div className="max-h-80 flex-1 space-y-3 overflow-y-auto p-4">
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white">
                {authorEmail.slice(0, 1).toUpperCase()}
              </span>
              <span className="text-xs font-medium text-slate-700">{authorEmail}</span>
              <span className="ml-auto text-xs text-slate-400">
                {new Date(comment.created_at).toLocaleString('pt-BR')}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{comment.body}</p>
          </div>
        ))}
        {comments.length === 0 && <p className="text-sm text-slate-400">Nenhuma interação ainda.</p>}
      </div>
      <form onSubmit={handleSubmit} className="border-t border-slate-200 p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-orange-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  )
}

function ForwardModal({
  ticket,
  onClose,
  onForward,
}: {
  ticket: Ticket
  onClose: () => void
  onForward: (values: { sector: TicketSector; assignee: string; status: TicketStatus; message: string }) => Promise<void>
}) {
  const [sector, setSector] = useState<TicketSector>(ticket.sector)
  const [assignee, setAssignee] = useState(ticket.assignee ?? '')
  const [status, setStatus] = useState<TicketStatus>(ticket.status)
  const [message, setMessage] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await onForward({ sector, assignee, status, message })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Encaminhar chamado para qual setor?</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-slate-700">
            Setor
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value as TicketSector)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {Object.entries(SECTOR_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Responsável
            <input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Nome do responsável"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="mt-3 block text-sm font-medium text-slate-700">
          Informações adicionais
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="mt-3 block text-sm font-medium text-slate-700">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TicketStatus)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
          >
            Encaminhar
          </button>
        </div>
      </form>
    </div>
  )
}

export function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: tickets, loading, update, remove } = useTickets()
  const { data: contacts } = useSupabaseTable<Contact>('contacts', 'name')
  const { data: companies } = useSupabaseTable<Company>('companies', 'name')
  const [showForward, setShowForward] = useState(false)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ticket = tickets.find((t) => t.id === id)
  const { comments, loading: commentsLoading, addComment } = useTicketComments(id ?? '')
  const { attachments, uploading, upload, download, remove: removeAttachment } = useTicketAttachments(id ?? '')
  const { events } = useTicketEvents(id ?? '', ticket?.updated_at)

  if (loading) return <p className="text-sm text-slate-500">Carregando...</p>
  if (!ticket) return <Navigate to="/chamados" replace />

  const contact = contacts.find((c) => c.id === ticket.contact_id)
  const company = companies.find((c) => c.id === (ticket.company_id ?? contact?.company_id ?? null))
  const requester = contact?.name ?? company?.name ?? 'Solicitante não informado'
  const userEmail = user?.email ?? '—'

  const external = comments.filter((c) => !c.internal)
  const internal = comments.filter((c) => c.internal)

  const isResolved = ticket.status === 'resolvido'
  const isClosed = ticket.status === 'fechado'

  async function handleDelete() {
    if (!ticket) return
    await remove(ticket.id)
    navigate('/chamados')
  }

  async function handleForward(values: {
    sector: TicketSector
    assignee: string
    status: TicketStatus
    message: string
  }) {
    if (!ticket) return
    await update(ticket.id, {
      sector: values.sector,
      assignee: values.assignee || null,
      status: values.status,
    })
    const note = `Encaminhado para ${SECTOR_LABEL[values.sector]}${values.assignee ? ` (${values.assignee})` : ''}.${
      values.message ? `\n${values.message}` : ''
    }`
    await addComment(note, true)
    setShowForward(false)
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return
    setAttachmentError(null)
    try {
      await upload(file)
    } catch (err) {
      setAttachmentError(err instanceof Error ? err.message : 'Falha ao enviar o arquivo')
    }
  }

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

      {/* Header — SGN style */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">
          Chamado <span className="text-orange-600">#{ticket.number}</span> aberto por {requester}
          {company && contact ? ` (${company.name})` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {contact?.phone || company?.phone ? `${contact?.phone ?? company?.phone} · ` : ''}
          {contact?.email ?? ''}
        </p>
      </div>

      {/* Dados da empresa — like SGN's company block */}
      <div className="mb-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <SectionHeader>Dados da empresa</SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 pt-3 pb-1">Empresa</th>
                <th className="px-4 pt-3 pb-1">Solicitante</th>
                <th className="px-4 pt-3 pb-1">Cargo</th>
                <th className="px-4 pt-3 pb-1">E-mail</th>
                <th className="px-4 pt-3 pb-1">Telefone</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 pt-1 pb-3 font-medium text-emerald-600">{company?.name ?? '—'}</td>
                <td className="px-4 pt-1 pb-3 text-slate-700">{contact?.name ?? '—'}</td>
                <td className="px-4 pt-1 pb-3 text-slate-600">{contact?.job_title || '—'}</td>
                <td className="px-4 pt-1 pb-3 text-slate-600">{contact?.email || '—'}</td>
                <td className="px-4 pt-1 pb-3 text-slate-600">{contact?.phone || company?.phone || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Dados do chamado */}
      <div className="mb-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <SectionHeader>Dados do chamado</SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 pt-3 pb-1">Nº</th>
                <th className="px-4 pt-3 pb-1">Tipo</th>
                <th className="px-4 pt-3 pb-1">Prioridade</th>
                <th className="px-4 pt-3 pb-1">Status</th>
                <th className="px-4 pt-3 pb-1">Setor</th>
                <th className="px-4 pt-3 pb-1">Responsável</th>
                <th className="px-4 pt-3 pb-1">Abertura</th>
                <th className="px-4 pt-3 pb-1">Atualização</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 pt-1 pb-3 font-semibold text-orange-600">#{ticket.number}</td>
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
                <td className="px-4 pt-1 pb-3 text-slate-700">{SECTOR_LABEL[ticket.sector]}</td>
                <td className="px-4 pt-1 pb-3 text-slate-700">{ticket.assignee || '—'}</td>
                <td className="px-4 pt-1 pb-3 text-slate-600">{new Date(ticket.created_at).toLocaleString('pt-BR')}</td>
                <td className="px-4 pt-1 pb-3 text-slate-600">{new Date(ticket.updated_at).toLocaleString('pt-BR')}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* Action bar — validation flow + forward + attach */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2.5">
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
          <span className="mx-1 h-4 w-px bg-slate-300" />
          <button
            onClick={() => setShowForward(true)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            ➜ Encaminhar
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {uploading ? 'Enviando...' : '📎 Anexar arquivos'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
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
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{ticket.description || 'Sem descrição.'}</p>
        </div>
      </div>

      {/* Timeline — SGN's ticket history at a glance */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white">
        <SectionHeader>Timeline</SectionHeader>
        {events.length === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-400">Sem eventos registrados.</p>
        ) : (
          <ol className="px-5 py-4">
            {events.map((ev, i) => (
              <li key={ev.id} className="relative flex gap-3 pb-4 last:pb-0">
                {i < events.length - 1 && (
                  <span className="absolute left-[5px] top-4 h-full w-px bg-slate-200" aria-hidden />
                )}
                <span
                  className={`relative mt-1.5 h-[11px] w-[11px] flex-shrink-0 rounded-full ${
                    ev.event === 'criado'
                      ? 'bg-orange-500'
                      : ev.event === 'encaminhado'
                        ? 'bg-blue-500'
                        : ev.event === 'prioridade'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                  }`}
                />
                <div className="min-w-0 text-sm">
                  <span className="font-medium text-slate-800">
                    {ev.event === 'criado' && 'Chamado aberto'}
                    {ev.event === 'status' && `Status: ${formatEventDetail(ev.detail)}`}
                    {ev.event === 'encaminhado' && `Encaminhado: ${formatForward(ev.detail)}`}
                    {ev.event === 'prioridade' && `Prioridade: ${formatEventDetail(ev.detail)}`}
                  </span>
                  <span className="ml-2 text-xs text-slate-400">
                    {new Date(ev.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Anexos */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white">
        <SectionHeader>Anexos ({attachments.length})</SectionHeader>
        {attachmentError && (
          <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">{attachmentError}</p>
        )}
        {attachments.length === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-400">
            Nenhum arquivo anexado. Anexe capturas de tela ou documentos de evidência sempre que possível — limite de
            40 MB por arquivo.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {attachments.map((att) => (
              <li key={att.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="text-slate-400">📎</span>
                <button onClick={() => download(att)} className="font-medium text-orange-600 hover:underline">
                  {att.file_name}
                </button>
                <span className="text-xs text-slate-400">{formatBytes(att.size_bytes)}</span>
                <span className="ml-auto text-xs text-slate-400">
                  {new Date(att.created_at).toLocaleDateString('pt-BR')}
                </span>
                <button onClick={() => removeAttachment(att)} className="text-xs text-red-500 hover:text-red-700">
                  Excluir
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Interações externas + internas, side by side like SGN */}
      {commentsLoading ? (
        <p className="text-sm text-slate-500">Carregando interações...</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <InteractionThread
            title="Interações externas"
            hint="Conversa com o cliente — fica registrada no histórico do chamado"
            comments={external}
            authorEmail={userEmail}
            onSend={(body) => addComment(body, false)}
            placeholder="Escreva aqui a mensagem para o cliente..."
          />
          <InteractionThread
            title="Interações internas"
            hint="Anotações internas — não fazem parte da conversa com o cliente"
            comments={internal}
            authorEmail={userEmail}
            onSend={(body) => addComment(body, true)}
            placeholder="Escreva aqui a anotação interna..."
          />
        </div>
      )}

      {showForward && (
        <ForwardModal ticket={ticket} onClose={() => setShowForward(false)} onForward={handleForward} />
      )}
    </div>
  )
}
