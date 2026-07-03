import { useState, type FormEvent } from 'react'
import { useDeals, usePipelineStages } from '../hooks/useDeals'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import { AttachmentsModal } from '../components/AttachmentsModal'
import type { Contact, Company, Deal } from '../types/database'

const emptyForm = { title: '', value: '', contact_id: '', company_id: '', stage_id: '', expected_close_date: '' }

export function Deals() {
  const { data: deals, loading, create, update, remove } = useDeals()
  const { data: stages } = usePipelineStages()
  const { data: contacts } = useSupabaseTable<Contact>('contacts', 'name')
  const { data: companies } = useSupabaseTable<Company>('companies', 'name')
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [attachFor, setAttachFor] = useState<Deal | null>(null)

  const contactName = (id: string | null) => contacts.find((c) => c.id === id)?.name
  const companyName = (id: string | null) => companies.find((c) => c.id === id)?.name

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await create({
      title: form.title,
      value: Number(form.value) || 0,
      contact_id: form.contact_id || null,
      company_id: form.company_id || null,
      stage_id: form.stage_id || stages[0]?.id || null,
      expected_close_date: form.expected_close_date || null,
      status: 'open',
    })
    setForm(emptyForm)
    setShowForm(false)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Negociações</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
        >
          {showForm ? 'Cancelar' : 'Nova negociação'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-5">
          <input
            required
            placeholder="Título"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Valor (R$)"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={form.expected_close_date}
            onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            value={form.stage_id}
            onChange={(e) => setForm({ ...form, stage_id: e.target.value })}
            className="col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Primeira etapa do funil</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button type="submit" className="col-span-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700">
            Adicionar
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage_id === stage.id && d.status === 'open')
            return (
              <div key={stage.id} className="w-64 flex-shrink-0 rounded-lg bg-slate-50 p-3">
                <h2 className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-700">
                  {stage.name}
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs">{stageDeals.length}</span>
                </h2>
                <div className="space-y-2">
                  {stageDeals.map((deal) => (
                    <div key={deal.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm">
                      <p className="font-medium text-slate-900">{deal.title}</p>
                      {(contactName(deal.contact_id) || companyName(deal.company_id)) && (
                        <p className="mt-1 text-xs text-slate-500">
                          {contactName(deal.contact_id)}
                          {contactName(deal.contact_id) && companyName(deal.company_id) ? ' · ' : ''}
                          {companyName(deal.company_id)}
                        </p>
                      )}
                      <p className="mt-1 text-sm font-semibold text-emerald-600">
                        {Number(deal.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                      <select
                        value={deal.stage_id ?? ''}
                        onChange={(e) => update(deal.id, { stage_id: e.target.value })}
                        className="mt-2 w-full rounded border border-slate-200 px-2 py-1 text-xs"
                      >
                        {stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <div className="mt-2 flex gap-2 text-xs">
                        <button onClick={() => setAttachFor(deal)} className="text-slate-500 hover:text-slate-900">
                          📎
                        </button>
                        <button onClick={() => update(deal.id, { status: 'won' })} className="text-emerald-600 hover:underline">
                          Ganhou
                        </button>
                        <button onClick={() => update(deal.id, { status: 'lost' })} className="text-red-500 hover:underline">
                          Perdeu
                        </button>
                        <button onClick={() => remove(deal.id)} className="ml-auto text-slate-400 hover:text-red-500">
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
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
