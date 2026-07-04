import { useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { PortalLayout } from '../components/PortalLayout'
import { usePortalTickets, usePortalComments, usePortalAttachments } from '../hooks/usePortal'
import { useAuth } from '../context/AuthContext'
import { STATUS_LABEL, STATUS_COLOR, CATEGORY_LABEL, PRIORITY_LABEL, formatBytes } from '../lib/ticketMeta'

export function PortalTicket() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { tickets, loading, addComment, validate } = usePortalTickets()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ticket = tickets.find((t) => t.id === id)
  const { comments, refresh: refreshComments } = usePortalComments(id ?? '', ticket?.updated_at)
  const { attachments, uploading, upload, download } = usePortalAttachments(id ?? '')

  if (loading) {
    return (
      <PortalLayout>
        <p className="text-sm text-slate-500">Carregando...</p>
      </PortalLayout>
    )
  }
  if (!ticket) return <Navigate to="/portal" replace />

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!ticket || !text.trim()) return
    setError(null)
    try {
      await addComment(ticket.id, text.trim())
      await refreshComments()
      setText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar')
    }
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

  const isResolved = ticket.status === 'resolvido'

  return (
    <PortalLayout>
      <Link to="/portal" className="mb-4 inline-block text-sm text-slate-500 hover:text-slate-900">
        ← Voltar para meus chamados
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">
          Chamado <span className="text-orange-600">#{ticket.number}</span> — {ticket.subject}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[ticket.status]}`}>
            {STATUS_LABEL[ticket.status]}
          </span>
          <span>{CATEGORY_LABEL[ticket.category]}</span>·
          <span>Prioridade {PRIORITY_LABEL[ticket.priority]}</span>·
          <span>aberto em {new Date(ticket.created_at).toLocaleDateString('pt-BR')}</span>
        </p>
      </div>

      {isResolved && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">
            A equipe concluiu o atendimento. Teste a solução e confirme a conclusão — ou retorne o chamado caso algo
            não corresponda ao solicitado.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => validate(ticket.id, true)}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              ✓ Confirmar conclusão
            </button>
            <button
              onClick={() => validate(ticket.id, false)}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              ↩ Retornar (não resolvido)
            </button>
          </div>
        </div>
      )}

      {ticket.description && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase text-slate-400">Descrição</p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{ticket.description}</p>
        </div>
      )}

      <div className="mb-6 rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Anexos ({attachments.length})</h2>
            <p className="text-xs text-slate-400">Envie capturas de tela ou documentos — limite de 40 MB por arquivo</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {uploading ? 'Enviando...' : '📎 Anexar arquivo'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
        </div>
        {attachmentError && (
          <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">{attachmentError}</p>
        )}
        {attachments.length === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-400">Nenhum arquivo anexado ainda.</p>
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
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-slate-700">Interações ({comments.length})</h2>
          <p className="text-xs text-slate-400">Sua conversa com a equipe de atendimento</p>
        </div>
        <div className="space-y-3 p-4">
          {comments.map((comment) => {
            const mine = comment.owner_id === user?.id
            return (
              <div
                key={comment.id}
                className={`max-w-[85%] rounded-lg border p-3 ${
                  mine ? 'ml-auto border-orange-200 bg-orange-50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">{mine ? 'Você' : 'Equipe'}</span>
                  <span className="ml-auto text-xs text-slate-400">
                    {new Date(comment.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-700">{comment.body}</p>
              </div>
            )
          })}
          {comments.length === 0 && <p className="text-sm text-slate-400">Nenhuma interação ainda.</p>}
        </div>
        <form onSubmit={handleSend} className="border-t border-slate-200 p-4">
          {error && <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva aqui a mensagem — a equipe será notificada e o chamado volta para a fila de atendimento."
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="mt-2 flex justify-end">
            <button type="submit" className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700">
              Enviar
            </button>
          </div>
        </form>
      </div>
    </PortalLayout>
  )
}
