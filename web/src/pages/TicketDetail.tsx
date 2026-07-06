import { useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTickets } from '../hooks/useTickets'
import { useTicketComments } from '../hooks/useTicketComments'
import { useTicketAttachments } from '../hooks/useTicketAttachments'
import { useTicketEvents } from '../hooks/useTicketEvents'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'
import { useConfirm } from '../components/ConfirmDialog'
import { can } from '../lib/permissions'
import type {
  Contact,
  Company,
  CompanySlaSetting,
  Ticket,
  TicketAttachment,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TicketSector,
} from '../types/database'
import {
  STATUS_LABEL,
  STATUS_TONE,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  CATEGORY_LABEL,
  SECTOR_LABEL,
  formatBytes,
  timeAgo,
} from '../lib/ticketMeta'
import { MAX_COMMENT_LENGTH } from '../lib/validators'
import { getTicketActionGroups, type TicketAction, type TicketActionKind } from '../lib/ticketTransitions'
import { getTicketSlaStatus, formatSlaLabel, slaTone } from '../lib/sla'
import { notify } from '../lib/notify'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Select, Textarea } from '../components/ui/Field'
import { Alert } from '../components/ui/Alert'
import { EmptyState } from '../components/ui/EmptyState'
import { PageLoading } from '../components/ui/Spinner'
import { Modal } from '../components/ui/Modal'
import { Hero } from '../components/ui/Hero'
import { useToast } from '../components/ToastProvider'
import { IconArrowRight, IconCheck, IconCornerUpLeft, IconPaperclip } from '../components/ui/icons'

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

const ACTION_ICON: Record<string, typeof IconCheck | undefined> = {
  test_passed: IconCheck,
  test_failed: IconCornerUpLeft,
  return_unresolved: IconCornerUpLeft,
  resume: IconCornerUpLeft,
}

function actionButtonProps(kind: TicketActionKind): { variant: 'primary' | 'secondary' | 'success' | 'ghost'; className?: string } {
  if (kind === 'ghost-danger') return { variant: 'ghost', className: 'text-red-600 hover:bg-red-50' }
  return { variant: kind }
}

/** Label-over-value block for the ticket/company info panels — reflows in a grid instead of scrolling like a 1-row table would. */
function InfoField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-1 break-words text-sm text-slate-700">{value}</div>
    </div>
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
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setError(null)
    try {
      await onSend(text.trim())
      setText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar')
    }
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          {title}
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">{comments.length}</span>
        </h2>
        <p className="text-xs text-slate-400">{hint}</p>
      </CardHeader>
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
        {error && (
          <div className="mb-2">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={2}
          maxLength={MAX_COMMENT_LENGTH}
        />
        <div className="mt-2 flex justify-end">
          <Button type="submit" size="sm">
            Enviar
          </Button>
        </div>
      </form>
    </Card>
  )
}

function ForwardModal({
  ticket,
  members,
  onClose,
  onForward,
}: {
  ticket: Ticket
  members: Array<{ user_id: string; label: string }>
  onClose: () => void
  onForward: (values: { sector: TicketSector; assigneeId: string; status: TicketStatus; message: string }) => Promise<void>
}) {
  const [sector, setSector] = useState<TicketSector>(ticket.sector)
  const [assigneeId, setAssigneeId] = useState(ticket.assignee_id ?? '')
  const [status, setStatus] = useState<TicketStatus>(ticket.status)
  const [message, setMessage] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await onForward({ sector, assigneeId, status, message })
  }

  return (
    <Modal
      title="Encaminhar chamado para qual setor?"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="forward-form">
            Encaminhar
          </Button>
        </>
      }
    >
      <form id="forward-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Setor
          <Select className="mt-1.5" value={sector} onChange={(e) => setSector(e.target.value as TicketSector)}>
            {Object.entries(SECTOR_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Responsável
          <Select className="mt-1.5" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">Sem responsável</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
          Informações adicionais
          <Textarea className="mt-1.5" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
        </label>
        <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
          Status
          <Select className="mt-1.5" value={status} onChange={(e) => setStatus(e.target.value as TicketStatus)}>
            {/* "Concluído" não aparece aqui de propósito — só o cliente pode concluir, pelo portal dele. */}
            {Object.entries(STATUS_LABEL)
              .filter(([value]) => value !== 'concluido')
              .map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
          </Select>
        </label>
      </form>
    </Modal>
  )
}

export function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { members, role } = useOrg()
  const confirm = useConfirm()
  const canDelete = can(role, 'tickets', 'delete')
  const { data: tickets, loading, update, remove } = useTickets()
  const toast = useToast()
  const { data: contacts } = useSupabaseTable<Contact>('contacts', 'name')
  const { data: companies } = useSupabaseTable<Company>('companies', 'name')
  const { data: slaSettings } = useSupabaseTable<CompanySlaSetting>('company_sla_settings')
  const [showForward, setShowForward] = useState(false)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ticket = tickets.find((t) => t.id === id)
  const { comments, loading: commentsLoading, addComment } = useTicketComments(id ?? '')
  const { attachments, uploading, upload, download, remove: removeAttachment } = useTicketAttachments(id ?? '')
  const { events } = useTicketEvents(id ?? '', ticket?.updated_at)

  const timeline = useMemo(() => {
    const entries = [
      ...events.map((ev) => ({
        key: `ev-${ev.id}`,
        at: ev.created_at,
        dot:
          ev.event === 'criado'
            ? 'bg-orange-500'
            : ev.event === 'encaminhado'
              ? 'bg-blue-500'
              : ev.event === 'prioridade'
                ? 'bg-amber-500'
                : 'bg-emerald-500',
        label:
          ev.event === 'criado'
            ? 'Chamado aberto'
            : ev.event === 'status'
              ? `Status: ${formatEventDetail(ev.detail)}`
              : ev.event === 'encaminhado'
                ? `Encaminhado: ${formatForward(ev.detail)}`
                : `Prioridade: ${formatEventDetail(ev.detail)}`,
        detail: null as string | null,
      })),
      ...comments.map((c) => ({
        key: `comment-${c.id}`,
        at: c.created_at,
        dot: c.internal ? 'bg-purple-500' : 'bg-slate-400',
        label: c.internal ? 'Anotação interna' : 'Interação com o cliente',
        detail: c.body,
      })),
      ...attachments.map((a) => ({
        key: `att-${a.id}`,
        at: a.created_at,
        dot: 'bg-cyan-500',
        label: `Anexo enviado: ${a.file_name}`,
        detail: null as string | null,
      })),
    ]
    return entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  }, [events, comments, attachments])

  if (loading) return <PageLoading />
  if (!ticket) return <Navigate to="/chamados" replace />

  const contact = contacts.find((c) => c.id === ticket.contact_id)
  const company = companies.find((c) => c.id === (ticket.company_id ?? contact?.company_id ?? null))
  const requester = contact?.name ?? company?.name ?? 'Solicitante não informado'
  const userEmail = user?.email ?? '—'
  const sla = getTicketSlaStatus(ticket, company?.id ?? null, slaSettings)

  const external = comments.filter((c) => !c.internal)
  const internal = comments.filter((c) => c.internal)

  const isConcluido = ticket.status === 'concluido'
  const actionGroups = getTicketActionGroups(ticket.status, { canResolveMatrix: can(role, 'tickets', 'manage') })

  async function handleDelete() {
    if (!ticket) return
    if (!(await confirm({ description: `Excluir o chamado #${ticket.number}? Essa ação não pode ser desfeita.` }))) return
    await remove(ticket.id)
    navigate('/chamados')
  }

  function changeStatus(status: TicketStatus) {
    if (!ticket) return
    update(ticket.id, { status })
    toast(`Status alterado para "${STATUS_LABEL[status]}".`)
  }

  async function handleAction(action: TicketAction) {
    if (!ticket) return
    if (action.effect === 'notifyResolved') {
      await update(ticket.id, { status: action.to })
      toast('Chamado enviado para validação do cliente.')
      notify('ticket_resolved', ticket.id)
    } else {
      changeStatus(action.to)
    }
  }

  const memberOptions = members.map((m) => ({
    user_id: m.user_id,
    label: m.profile?.display_name ?? m.profile?.email ?? m.user_id,
  }))
  const memberLabel = (userId: string | null) =>
    memberOptions.find((m) => m.user_id === userId)?.label ?? null

  async function handleForward(values: {
    sector: TicketSector
    assigneeId: string
    status: TicketStatus
    message: string
  }) {
    if (!ticket) return
    const displayName = values.assigneeId ? memberLabel(values.assigneeId) : null
    await update(ticket.id, {
      sector: values.sector,
      assignee_id: values.assigneeId || null,
      assignee: displayName,
      status: values.status,
    })
    const note = `Encaminhado para ${SECTOR_LABEL[values.sector]}${displayName ? ` (${displayName})` : ''}.${
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

  async function handleRemoveAttachment(att: TicketAttachment) {
    if (await confirm({ description: `Excluir o anexo "${att.file_name}"?` })) removeAttachment(att)
  }

  return (
    <div>
      <div className="mb-4">
        <Link to="/chamados" className="text-sm text-slate-500 hover:text-slate-900">
          ← Voltar para chamados
        </Link>
      </div>

      <Hero
        badges={
          <>
            <Badge className="!bg-white/10 !text-white">#{ticket.number}</Badge>
            <Badge tone={PRIORITY_TONE[ticket.priority]}>{PRIORITY_LABEL[ticket.priority]}</Badge>
            <Badge tone={STATUS_TONE[ticket.status]}>{STATUS_LABEL[ticket.status]}</Badge>
            <Badge className="!bg-white/10 !text-white">{CATEGORY_LABEL[ticket.category]}</Badge>
            {sla && <Badge tone={slaTone(sla)}>{formatSlaLabel(sla)}</Badge>}
          </>
        }
        title={ticket.subject}
        description={
          <>
            {requester}
            {company && contact ? ` · ${company.name}` : ''} · Aberto {timeAgo(ticket.created_at)}
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowForward(true)}>
              <IconArrowRight className="h-4 w-4" /> Encaminhar
            </Button>
            {canDelete && (
              <Button variant="danger" onClick={handleDelete}>
                Excluir chamado
              </Button>
            )}
          </>
        }
      />

      {/* Dados da empresa — like SGN's company block */}
      <Card className="mb-6 mt-6 overflow-hidden">
        <CardHeader>Dados da empresa</CardHeader>
        <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-5">
          <InfoField label="Empresa" value={<span className="font-medium text-emerald-600">{company?.name ?? '—'}</span>} />
          <InfoField label="Solicitante" value={contact?.name ?? '—'} />
          <InfoField label="Cargo" value={contact?.job_title || '—'} />
          <InfoField label="E-mail" value={contact?.email || '—'} />
          <InfoField label="Telefone" value={contact?.phone || company?.phone || '—'} />
        </div>
      </Card>

      {/* Dados do chamado */}
      <Card className="mb-6 overflow-hidden">
        <CardHeader>Dados do chamado</CardHeader>
        <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4">
          <InfoField label="Nº" value={<span className="font-semibold text-orange-600">#{ticket.number}</span>} />
          <InfoField
            label="Tipo"
            value={
              <Select
                value={ticket.category}
                onChange={(e) => update(ticket.id, { category: e.target.value as TicketCategory })}
                className="!w-auto !py-1"
              >
                {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            }
          />
          <InfoField
            label="Prioridade"
            value={
              <Select
                value={ticket.priority}
                onChange={(e) => update(ticket.id, { priority: e.target.value as TicketPriority })}
                className="!w-auto !py-1"
              >
                {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            }
          />
          <InfoField
            label="Status"
            value={
              isConcluido ? (
                <Badge tone={STATUS_TONE.concluido}>{STATUS_LABEL.concluido}</Badge>
              ) : (
                <Select
                  value={ticket.status}
                  onChange={(e) => changeStatus(e.target.value as TicketStatus)}
                  className="!w-auto !py-1"
                >
                  {/* "Concluído" não aparece aqui de propósito — só o cliente pode concluir o chamado, pelo portal dele. */}
                  {Object.entries(STATUS_LABEL)
                    .filter(([value]) => value !== 'concluido')
                    .map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                </Select>
              )
            }
          />
          <InfoField label="Setor" value={SECTOR_LABEL[ticket.sector]} />
          <InfoField label="Responsável" value={memberLabel(ticket.assignee_id) ?? ticket.assignee ?? '—'} />
          <InfoField label="Abertura" value={new Date(ticket.created_at).toLocaleString('pt-BR')} />
          <InfoField label="Atualização" value={new Date(ticket.updated_at).toLocaleString('pt-BR')} />
        </div>
        {/* Action bar — segue o fluxo Analisar → Em andamento → Aberto/Backlog → Em andamento → Teste → Aguardando validação */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50/60 px-4 py-2.5">
          {actionGroups.primaryGroups.map((group, i) => (
            <span key={i} className="contents">
              {i > 0 && <span className="mx-1 h-4 w-px bg-slate-300" />}
              {group.map((action) => {
                const { variant, className } = actionButtonProps(action.kind)
                const Icon = ACTION_ICON[action.key]
                return (
                  <Button key={action.key} size="sm" variant={variant} className={className} onClick={() => handleAction(action)}>
                    {Icon && <Icon className="h-3.5 w-3.5" />} {action.label}
                  </Button>
                )
              })}
            </span>
          ))}

          {actionGroups.message && (
            <span
              className={`flex items-center gap-1.5 text-xs font-medium ${
                actionGroups.message.tone === 'purple' ? 'text-purple-700' : 'text-amber-700'
              }`}
            >
              {actionGroups.message.icon && <IconCheck className="h-3.5 w-3.5" />} {actionGroups.message.text}
            </span>
          )}

          {actionGroups.waiting.length > 0 && (
            <>
              <span className="mx-1 h-4 w-px bg-slate-300" />
              {actionGroups.waiting.map((action) => {
                const { variant, className } = actionButtonProps(action.kind)
                return (
                  <Button key={action.key} variant={variant} size="sm" className={className} onClick={() => handleAction(action)}>
                    {action.label}
                  </Button>
                )
              })}
            </>
          )}

          <span className="mx-1 h-4 w-px bg-slate-300" />
          <Button variant="secondary" size="sm" onClick={() => setShowForward(true)}>
            <IconArrowRight className="h-3.5 w-3.5" /> Encaminhar
          </Button>
          <Button variant="secondary" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            <IconPaperclip className="h-3.5 w-3.5" /> {uploading ? 'Enviando...' : 'Anexar arquivos'}
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
        </div>
      </Card>

      {/* Assunto e descrição */}
      <Card className="mb-6">
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Assunto</p>
          <p className="mt-0.5 text-sm font-medium text-slate-900">{ticket.subject}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Descrição</p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{ticket.description || 'Sem descrição.'}</p>
        </div>
      </Card>

      {/* Timeline — histórico completo: criação, status, encaminhamentos, comentários e anexos */}
      <Card className="mb-6">
        <CardHeader>Timeline</CardHeader>
        {timeline.length === 0 ? (
          <EmptyState title="Sem eventos registrados." compact />
        ) : (
          <ol className="px-5 py-4">
            {timeline.map((entry, i) => (
              <li key={entry.key} className="relative flex gap-3 pb-4 last:pb-0">
                {i < timeline.length - 1 && (
                  <span className="absolute left-[5px] top-4 h-full w-px bg-slate-200" aria-hidden />
                )}
                <span className={`relative mt-1.5 h-[11px] w-[11px] flex-shrink-0 rounded-full ${entry.dot}`} />
                <div className="min-w-0 text-sm">
                  <span className="font-medium text-slate-800">{entry.label}</span>
                  <span className="ml-2 text-xs text-slate-400">{new Date(entry.at).toLocaleString('pt-BR')}</span>
                  {entry.detail && <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-500">{entry.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* Anexos */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-700">Anexos</h2>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">{attachments.length}</span>
          </div>
        </CardHeader>
        {attachmentError && (
          <div className="border-b border-slate-100 px-4 py-2.5">
            <Alert tone="error">{attachmentError}</Alert>
          </div>
        )}
        {attachments.length === 0 ? (
          <EmptyState
            icon={<IconPaperclip className="h-5 w-5" />}
            title="Nenhum arquivo anexado."
            hint="Anexe capturas de tela ou documentos de evidência sempre que possível — limite de 40 MB por arquivo."
            compact
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {attachments.map((att) => (
              <li key={att.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <IconPaperclip className="h-4 w-4 flex-shrink-0 text-slate-400" />
                <button onClick={() => download(att)} className="flex items-center gap-1 font-medium text-orange-600 hover:underline">
                  {att.file_name}
                </button>
                <span className="text-xs tabular-nums text-slate-400">{formatBytes(att.size_bytes)}</span>
                <span className="ml-auto text-xs text-slate-400">
                  {new Date(att.created_at).toLocaleDateString('pt-BR')}
                </span>
                <Button variant="danger" size="xs" onClick={() => handleRemoveAttachment(att)}>
                  Excluir
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Interações externas + internas, side by side like SGN */}
      {commentsLoading ? (
        <PageLoading label="Carregando interações..." />
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
        <ForwardModal
          ticket={ticket}
          members={memberOptions}
          onClose={() => setShowForward(false)}
          onForward={handleForward}
        />
      )}
    </div>
  )
}
