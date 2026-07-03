import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PortalLayout } from '../components/PortalLayout'
import { usePortalTickets } from '../hooks/usePortal'
import type { Ticket } from '../types/database'
import { STATUS_LABEL, STATUS_COLOR, PRIORITY_LABEL, CATEGORY_LABEL } from '../lib/ticketMeta'

const emptyForm = { subject: '', description: '', category: 'suporte', priority: 'media' }

/** SGN client-portal boxes: where is the ball, from the client's side. */
const BOXES: Array<{ key: string; title: string; hint: string; match: (t: Ticket) => boolean }> = [
  {
    key: 'responder',
    title: 'Responder à equipe',
    hint: 'A equipe aguarda uma informação sua',
    match: (t) => t.status === 'aguardando_cliente',
  },
  {
    key: 'validar',
    title: 'Aguardando sua validação',
    hint: 'Resolvidos — confirme a conclusão ou retorne',
    match: (t) => t.status === 'resolvido',
  },
  {
    key: 'andamento',
    title: 'Em atendimento',
    hint: 'A equipe está trabalhando nestes chamados',
    match: (t) => t.status === 'aberto' || t.status === 'em_andamento',
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
    try {
      const id = await openTicket(form)
      setForm(emptyForm)
      setShowForm(false)
      navigate(`/portal/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível abrir o chamado')
    }
  }

  const closed = tickets.filter((t) => t.status === 'fechado')

  return (
    <PortalLayout>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Meus chamados</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
        >
          {showForm ? 'Cancelar' : '+ Novo chamado'}
        </button>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        Olá! Estamos aguardando seu retorno nos chamados listados nas caixas abaixo.
      </p>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-5">
          {error && <p className="col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <input
            required
            placeholder="Assunto"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                Tipo: {label}
              </option>
            ))}
          </select>
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                Prioridade: {label}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Descreva a solicitação com riqueza de detalhes — quanto mais contexto, mais rápido o atendimento."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            className="col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="col-span-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700">
            Criar chamado
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {BOXES.map((box) => {
              const items = tickets.filter(box.match)
              return (
                <div key={box.key} className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="border-b border-orange-700 bg-orange-600 px-4 py-2.5">
                    <p className="text-sm font-semibold text-white">
                      {box.title} <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">{items.length}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-orange-100">{box.hint}</p>
                  </div>
                  {items.length === 0 ? (
                    <p className="flex flex-1 items-center justify-center px-4 py-8 text-sm text-slate-400">Sem chamados</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {items.slice(0, 6).map((t) => (
                        <li key={t.id}>
                          <Link to={`/portal/${t.id}`} className="block px-4 py-2.5 hover:bg-slate-50">
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
                </div>
              )
            })}
          </div>

          <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <h2 className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
              Todos os chamados ({tickets.length})
            </h2>
            {tickets.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">
                Você ainda não tem chamados. Clique em "+ Novo chamado" para abrir o primeiro.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Nº</th>
                      <th className="px-4 py-3">Assunto</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Abertura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Link to={`/portal/${t.id}`} className="font-semibold text-orange-600 hover:underline">
                            #{t.number}
                          </Link>
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 font-medium text-slate-900">{t.subject}</td>
                        <td className="px-4 py-3 text-slate-600">{CATEGORY_LABEL[t.category]}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[t.status]}`}>
                            {STATUS_LABEL[t.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
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
          </div>
        </>
      )}
    </PortalLayout>
  )
}
