import { useState, type FormEvent } from 'react'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import type { Contact, Company } from '../types/database'

const emptyForm = { name: '', email: '', phone: '', job_title: '', company_id: '', notes: '' }

export function Contacts() {
  const { data: contacts, loading, create, update, remove } = useSupabaseTable<Contact>('contacts', 'name')
  const { data: companies } = useSupabaseTable<Company>('companies', 'name')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const companyName = (id: string | null) => companies.find((c) => c.id === id)?.name ?? '—'

  function startEdit(contact: Contact) {
    setEditingId(contact.id)
    setForm({
      name: contact.name,
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      job_title: contact.job_title ?? '',
      company_id: contact.company_id ?? '',
      notes: contact.notes ?? '',
    })
    setShowForm(true)
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const values = { ...form, company_id: form.company_id || null }
    if (editingId) {
      await update(editingId, values)
    } else {
      await create(values)
    }
    resetForm()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Contatos</h1>
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
        >
          {showForm ? 'Cancelar' : 'Novo contato'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-5">
          <input
            required
            placeholder="Nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="email"
            placeholder="E-mail"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Telefone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Cargo"
            value={form.job_title}
            onChange={(e) => setForm({ ...form, job_title: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={form.company_id}
            onChange={(e) => setForm({ ...form, company_id: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Sem empresa</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Notas"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="col-span-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700">
            {editingId ? 'Salvar alterações' : 'Adicionar'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : contacts.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum contato cadastrado ainda.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{contact.name}</td>
                  <td className="px-4 py-3 text-slate-600">{companyName(contact.company_id)}</td>
                  <td className="px-4 py-3 text-slate-600">{contact.email}</td>
                  <td className="px-4 py-3 text-slate-600">{contact.phone}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(contact)} className="mr-3 text-slate-500 hover:text-slate-900">
                      Editar
                    </button>
                    <button onClick={() => remove(contact.id)} className="text-red-500 hover:text-red-700">
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
