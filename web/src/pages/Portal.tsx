import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PortalLayout } from '../components/PortalLayout'
import { usePortalTickets } from '../hooks/usePortal'
import type { Ticket } from '../types/database'
import { STATUS_LABEL, STATUS_TONE, PRIORITY_LABEL, CATEGORY_LABEL, isTerminalStatus } from '../lib/ticketMeta'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { FieldGroup, Input, Select, Textarea } from '../components/ui/Field'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'
import { EmptyState } from '../components/ui/EmptyState'
import { PageLoading } from '../components/ui/Spinner'
import { IconInbox, IconPlus } from '../components/ui/icons'

const emptyForm = { subject: '', description: '', category: 'suporte', priority: 'media' }

/** SGN client-portal boxes: where is the ball, from the client's side. */
const BOXES: Array<{ key: string; title: string; hint: string; match: (t: Ticket) => boolean }> = [
  {
    key: 'responder',
    title: 'Responder à equipe',
    hint: 'A equipe aguarda uma informação sua',
    match: (t) => t.status === 'pendente_cliente',
  },
  {
    key: 'validar',
    title: 'Aguardando sua validação',
    hint: 'Testado — confirme a conclusão ou retorne',
    match: (t) => t.status === 'aguardando_validacao',
  },
  {
    key: 'andamento',
    title: 'Em atendimento',
    hint: 'A equipe está trabalhando nestes chamados',
    match: (t) => !isTerminalStatus(t.status) && t.status !== 'pendente_cliente' && t.status !== 'aguardando_validacao',
  },
]

export function Portal() {
  const navigate = useNavigate()
  const { tickets, loading, openTicket } = usePortalTickets()
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (form.category === 'erro_sistema' && !form.description.trim()) {
      setError('Descreva o erro — obrigatório para esse tipo de chamado.')
      return
    }
    try {
      const id = await openTicket(form)
      setForm(emptyForm)
      setShowForm(false)
      navigate(`/portal/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível abrir o chamado')
    }
  }

  const closed = tickets.filter((t) => isTerminalStatus(t.status))

  return (
    <PortalLayout>
      <PageHeader
        title="Meus chamados"
        description="Estamos aguardando seu retorno nos chamados listados nas caixas abaixo."
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
            {error && (
              <div className="sm:col-span-2">
                <Alert tone="error">{error}</Alert>
              </div>
            )}
            <FieldGroup label="Assunto" className="sm:col-span-2">
              <Input required autoFocus value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </FieldGroup>
            <FieldGroup label="Tipo">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup label="Prioridade">
              <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup label="Descrição" className="sm:col-span-2">
              <Textarea
                placeholder="Descreva a solicitação com riqueza de detalhes — quanto mais contexto, mais rápido o atendimento."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
              />
            </FieldGroup>
            <div className="sm:col-span-2">
              <Button type="submit">Criar chamado</Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <PageLoading />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {BOXES.map((box) => {
              const items = tickets.filter(box.match)
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
                          <Link to={`/portal/${t.id}`} className="block px-4 py-2.5 transition-colors hover:bg-slate-50">
                            <span className="text-xs font-semibold text-orange-600">#{t.number}</span>
                            <p className="mt-0.5 truncate text-sm font-medium text-slate-800">{t.subject}</p>
                            <p className="text-xs text-slate-400">
                              atualizado em {new Date(t.updated_at).toLocaleDateString('pt-BR')}
                            </p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              )
            })}
          </div>

          <Card className="mt-8 overflow-hidden">
            <CardHeader>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-700">Todos os chamados</h2>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">{tickets.length}</span>
              </div>
            </CardHeader>
            {tickets.length === 0 ? (
              <EmptyState
                icon={<IconInbox className="h-5 w-5" />}
                title="Você ainda não tem chamados."
                hint='Clique em "Novo chamado" para abrir o primeiro.'
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Nº</th>
                      <th className="px-4 py-3 font-medium">Assunto</th>
                      <th className="px-4 py-3 font-medium">Tipo</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Abertura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <Link to={`/portal/${t.id}`} className="font-semibold text-orange-600 hover:underline">
                            #{t.number}
                          </Link>
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 font-medium text-slate-900">{t.subject}</td>
                        <td className="px-4 py-3 text-slate-600">{CATEGORY_LABEL[t.category]}</td>
                        <td className="px-4 py-3">
                          <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums text-slate-400">
                          {new Date(t.created_at).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {closed.length > 0 && (
              <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
                {closed.length} chamado(s) encerrado(s) no histórico.
              </p>
            )}
          </Card>
        </>
      )}
    </PortalLayout>
  )
}
