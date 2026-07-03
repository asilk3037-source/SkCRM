import { useState, type FormEvent } from 'react'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import type { Company } from '../types/database'

const emptyForm = { name: '', website: '', phone: '', address: '', notes: '' }

export function Companies() {
  const { data: companies, loading, create, update, remove } = useSupabaseTable<Company>('companies', 'name')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  function startEdit(company: Company) {
    setEditingId(company.id)
    setForm({
      name: company.name,
      website: company.website ?? '',
      phone: company.phone ?? '',
      address: company.address ?? '',
      notes: company.notes ?? '',
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
    if (editingId) {
      await update(editingId, form)
    } else {
      await create(form)
    }
    resetForm()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Empresas</h1>
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
        >
          {showForm ? 'Cancelar' : 'Nova empresa'}
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
            placeholder="Website"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Telefone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Endereço"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
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
      ) : companies.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma empresa cadastrada ainda.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Website</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((company) => (
                <tr key={company.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{company.name}</td>
                  <td className="px-4 py-3 text-slate-600">{company.website}</td>
                  <td className="px-4 py-3 text-slate-600">{company.phone}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(company)} className="mr-3 text-slate-500 hover:text-slate-900">
                      Editar
                    </button>
                    <button onClick={() => remove(company.id)} className="text-red-500 hover:text-red-700">
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
