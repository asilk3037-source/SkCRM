import { useState, type FormEvent } from 'react'
import { useDeals, usePipelineStages } from '../hooks/useDeals'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import { useOrg } from '../context/OrgContext'
import { useConfirm } from '../components/ConfirmDialog'
import { useToast } from '../components/ToastProvider'
import { AttachmentsModal } from '../components/AttachmentsModal'
import type { Contact, Company, Deal } from '../types/database'
import { can } from '../lib/permissions'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { FieldGroup, Input, Select } from '../components/ui/Field'
import { Alert } from '../components/ui/Alert'
import { PageLoading } from '../components/ui/Spinner'
import { LoadError } from '../components/ui/LoadError'
import { IconPaperclip, IconPlus } from '../components/ui/icons'

const emptyForm = { title: '', value: '', contact_id: '', company_id: '', stage_id: '', expected_close_date: '' }

export function Deals() {
  const { data: deals, loading, error: loadError, refresh, create, update, remove } = useDeals()
  const { data: stages } = usePipelineStages()
  const { role } = useOrg()
  const canDelete = can(role, 'deals', 'delete')
  const { data: contacts } = useSupabaseTable<Contact>('contacts', 'name')
  const { data: companies } = useSupabaseTable<Company>('companies', 'name')
  const confirm = useConfirm()
  const toast = useToast()
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [attachFor, setAttachFor] = useState<Deal | null>(null)
  const [error, setError] = useState<string | null>(null)

  const contactName = (id: string | null) => contacts.find((c) => c.id === id)?.name
  const companyName = (id: string | null) => companies.find((c) => c.id === id)?.name
  const todayStr = new Date().toISOString().slice(0, 10)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    let value = 0
    if (form.value.trim()) {
      value = Number(form.value)
      if (Number.isNaN(value) || value < 0) {
        setError('Valor inválido — informe um número maior ou igual a zero.')
        return
      }
    }

    const stageId = form.stage_id || stages[0]?.id || ''
    if (!stageId) {
      setError('Selecione uma etapa do funil.')
      return
    }

    if (form.expected_close_date && form.expected_close_date < todayStr) {
      setError('A data prevista de fechamento não pode estar no passado.')
      return
    }

    await create({
      title: form.title,
      value,
      contact_id: form.contact_id || null,
      company_id: form.company_id || null,
      stage_id: stageId,
      expected_close_date: form.expected_close_date || null,
      status: 'open',
    })
    setForm(emptyForm)
    setShowForm(false)
    toast('Negociação adicionada.')
  }

  async function handleRemove(deal: Deal) {
    if (await confirm({ description: `Excluir a negociação "${deal.title}"? Essa ação não pode ser desfeita.` })) {
      await remove(deal.id)
      toast('Negociação excluída.')
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Funil de vendas"
        title="Negociações"
        actions={
          <Button variant={showForm ? 'secondary' : 'primary'} onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancelar' : (
              <>
                <IconPlus className="h-4 w-4" /> Nova negociação
              </>
            )}
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6 p-5">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Título" className="sm:col-span-2">
              <Input required autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </FieldGroup>
            <FieldGroup label="Valor (R$)">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            </FieldGroup>
            <FieldGroup label="Previsão de fechamento">
              <Input
                type="date"
                min={todayStr}
                value={form.expected_close_date}
                onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })}
              />
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
            <FieldGroup label="Etapa do funil" className="sm:col-span-2">
              <Select value={form.stage_id} onChange={(e) => setForm({ ...form, stage_id: e.target.value })}>
                <option value="">Primeira etapa do funil</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            {error && (
              <div className="sm:col-span-2">
                <Alert tone="error">{error}</Alert>
              </div>
            )}
            <div className="sm:col-span-2">
              <Button type="submit">Adicionar</Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <PageLoading />
      ) : loadError ? (
        <LoadError message={loadError} onRetry={refresh} />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {stages.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage_id === stage.id && d.status === 'open')
            return (
              <div key={stage.id} className="w-64 flex-shrink-0 rounded-xl bg-slate-100/70 p-3">
                <h2 className="mb-3 flex items-center justify-between px-1 text-sm font-semibold text-slate-700">
                  {stage.name}
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">{stageDeals.length}</span>
                </h2>
                <div className="space-y-2">
                  {stageDeals.map((deal) => (
                    <Card key={deal.id} className="p-3 text-sm shadow-sm transition-shadow hover:shadow-md">
                      <p className="font-medium text-slate-900">{deal.title}</p>
                      {(contactName(deal.contact_id) || companyName(deal.company_id)) && (
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {contactName(deal.contact_id)}
                          {contactName(deal.contact_id) && companyName(deal.company_id) ? ' · ' : ''}
                          {companyName(deal.company_id)}
                        </p>
                      )}
                      <p className="mt-1.5 text-sm font-semibold tabular-nums text-emerald-600">
                        {Number(deal.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                      <Select
                        value={deal.stage_id ?? ''}
                        onChange={(e) => update(deal.id, { stage_id: e.target.value })}
                        className="mt-2 !py-1 !text-xs"
                      >
                        {stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </Select>
                      <div className="mt-2 flex items-center gap-1 text-xs">
                        <Button variant="ghost" size="xs" onClick={() => setAttachFor(deal)} aria-label="Anexos">
                          <IconPaperclip className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          onClick={() => {
                            update(deal.id, { status: 'won' })
                            toast('Negociação marcada como ganha.', 'success')
                          }}
                        >
                          Ganhou
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-slate-500"
                          onClick={() => {
                            update(deal.id, { status: 'lost' })
                            toast('Negociação marcada como perdida.', 'info')
                          }}
                        >
                          Perdeu
                        </Button>
                        {canDelete && (
                          <Button variant="danger" size="xs" className="ml-auto" onClick={() => handleRemove(deal)}>
                            Excluir
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                  {stageDeals.length === 0 && (
                    <p className="px-1 py-3 text-center text-xs text-slate-400">Sem negociações</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {attachFor && (
        <AttachmentsModal
          kind="deal"
          recordId={attachFor.id}
          title={attachFor.title}
          onClose={() => setAttachFor(null)}
        />
      )}
    </div>
  )
}
