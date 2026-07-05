import { useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { PortalLayout } from '../components/PortalLayout'
import { usePortalTickets, usePortalComments, usePortalAttachments } from '../hooks/usePortal'
import { useAuth } from '../context/AuthContext'
import { STATUS_LABEL, STATUS_TONE, CATEGORY_LABEL, PRIORITY_LABEL, formatBytes } from '../lib/ticketMeta'
import { MAX_COMMENT_LENGTH } from '../lib/validators'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Textarea } from '../components/ui/Field'
import { Alert } from '../components/ui/Alert'
import { EmptyState } from '../components/ui/EmptyState'
import { PageLoading } from '../components/ui/Spinner'
import { IconCheck, IconCornerUpLeft, IconPaperclip } from '../components/ui/icons'

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
        <PageLoading />
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

  const isResolved = ticket.status === 'aguardando_validacao'

  return (
    <PortalLayout>
      <Link to="/portal" className="mb-4 inline-block text-sm text-slate-500 hover:text-slate-900">
        ← Voltar para meus chamados
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Chamado <span className="text-orange-600">#{ticket.number}</span> — {ticket.subject}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Badge tone={STATUS_TONE[ticket.status]}>{STATUS_LABEL[ticket.status]}</Badge>
          <span>{CATEGORY_LABEL[ticket.category]}</span>·
          <span>Prioridade {PRIORITY_LABEL[ticket.priority]}</span>·
          <span>aberto em {new Date(ticket.created_at).toLocaleDateString('pt-BR')}</span>
        </p>
      </div>

      {isResolved && (
        <Card className="mb-6 border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">
            A equipe concluiu o atendimento. Teste a solução e confirme a conclusão — ou retorne o chamado caso algo
            não corresponda ao solicitado.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" className="!bg-emerald-600 hover:!bg-emerald-700" onClick={() => validate(ticket.id, true)}>
              <IconCheck className="h-3.5 w-3.5" /> Confirmar conclusão
            </Button>
            <Button variant="secondary" size="sm" onClick={() => validate(ticket.id, false)}>
              <IconCornerUpLeft className="h-3.5 w-3.5" /> Retornar (não resolvido)
            </Button>
          </div>
        </Card>
      )}

      {ticket.description && (
        <Card className="mb-6 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Descrição</p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{ticket.description}</p>
        </Card>
      )}

      <Card className="mb-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/60 px-4 py-2.5">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              Anexos
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">{attachments.length}</span>
            </h2>
            <p className="text-xs text-slate-400">Envie capturas de tela ou documentos — limite de 40 MB por arquivo</p>
          </div>
          <Button variant="secondary" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            <IconPaperclip className="h-3.5 w-3.5" /> {uploading ? 'Enviando...' : 'Anexar arquivo'}
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
        </div>
        {attachmentError && (
          <div className="border-b border-slate-100 px-4 py-2.5">
            <Alert tone="error">{attachmentError}</Alert>
          </div>
        )}
        {attachments.length === 0 ? (
          <EmptyState icon={<IconPaperclip className="h-5 w-5" />} title="Nenhum arquivo anexado ainda." compact />
        ) : (
          <ul className="divide-y divide-slate-100">
            {attachments.map((att) => (
              <li key={att.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <IconPaperclip className="h-4 w-4 flex-shrink-0 text-slate-400" />
                <button onClick={() => download(att)} className="font-medium text-orange-600 hover:underline">
                  {att.file_name}
                </button>
                <span className="text-xs tabular-nums text-slate-400">{formatBytes(att.size_bytes)}</span>
                <span className="ml-auto text-xs text-slate-400">
                  {new Date(att.created_at).toLocaleDateString('pt-BR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            Interações
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">{comments.length}</span>
          </h2>
          <p className="text-xs text-slate-400">Sua conversa com a equipe de atendimento</p>
        </CardHeader>
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
          {error && (
            <div className="mb-2">
              <Alert tone="error">{error}</Alert>
            </div>
          )}
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva aqui a mensagem — a equipe será notificada e o chamado volta para a fila de atendimento."
            rows={3}
            maxLength={MAX_COMMENT_LENGTH}
          />
          <div className="mt-2 flex justify-end">
            <Button type="submit">Enviar</Button>
          </div>
        </form>
      </Card>
    </PortalLayout>
  )
}
