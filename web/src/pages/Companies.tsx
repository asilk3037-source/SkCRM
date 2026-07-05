import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import { useOrg } from '../context/OrgContext'
import { useConfirm } from '../components/ConfirmDialog'
import { useToast } from '../components/ToastProvider'
import type { Company } from '../types/database'
import { formatPhoneBR, friendlyDbError, isValidPhoneBR, isValidUrl, normalizeUrl } from '../lib/validators'
import { can } from '../lib/permissions'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { FieldGroup, Input, Textarea } from '../components/ui/Field'
import { Alert } from '../components/ui/Alert'
import { EmptyState } from '../components/ui/EmptyState'
import { PageLoading } from '../components/ui/Spinner'
import { LoadError } from '../components/ui/LoadError'
import { DataCard, DataCardRow } from '../components/ui/DataCard'
import { Pagination, paginate } from '../components/ui/Pagination'
import { IconBuilding, IconPlus } from '../components/ui/icons'

const emptyForm = { name: '', website: '', phone: '', address: '', notes: '' }
const PAGE_SIZE = 20

export function Companies() {
  const { data: companies, loading, error: loadError, refresh, create, update, remove } = useSupabaseTable<Company>('companies', 'name')
  const { role } = useOrg()
  const canDelete = can(role, 'companies', 'delete')
  const confirm = useConfirm()
  const toast = useToast()
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(companies.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageItems = paginate(companies, safePage, PAGE_SIZE)

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
    setError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (form.name.trim().length < 2) {
      setError('O nome precisa ter pelo menos 2 caracteres.')
      return
    }
    if (!isValidUrl(form.website)) {
      setError('Website inválido.')
      return
    }
    if (!isValidPhoneBR(form.phone)) {
      setError('Telefone inválido — use DDD + número.')
      return
    }
    const values = { ...form, website: form.website.trim() ? normalizeUrl(form.website) : '' }
    try {
      if (editingId) {
        await update(editingId, values)
        toast('Empresa atualizada.')
      } else {
        await create(values)
        toast('Empresa adicionada.')
      }
      resetForm()
    } catch (err) {
      setError(friendlyDbError(err, 'Não foi possível salvar a empresa', 'Já existe uma empresa com esse nome.'))
    }
  }

  async function handleRemove(company: Company) {
    if (await confirm({ description: `Excluir a empresa "${company.name}"? Essa ação não pode ser desfeita.` })) {
      await remove(company.id)
      toast('Empresa excluída.')
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Carteira de clientes"
        title="Empresas"
        description={`${companies.length} empresa(s) cadastrada(s)`}
        actions={
          <Button variant={showForm ? 'secondary' : 'primary'} onClick={() => (showForm ? resetForm() : setShowForm(true))}>
            {showForm ? 'Cancelar' : (
              <>
                <IconPlus className="h-4 w-4" /> Nova empresa
              </>
            )}
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6 p-5">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Nome" className="sm:col-span-2">
              <Input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </FieldGroup>
            <FieldGroup label="Website">
              <Input placeholder="empresa.com" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </FieldGroup>
            <FieldGroup label="Telefone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhoneBR(e.target.value) })} />
            </FieldGroup>
            <FieldGroup label="Endereço" className="sm:col-span-2">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </FieldGroup>
            <FieldGroup label="Notas" className="sm:col-span-2">
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </FieldGroup>
            {error && (
              <div className="sm:col-span-2">
                <Alert tone="error">{error}</Alert>
              </div>
            )}
            <div className="sm:col-span-2">
              <Button type="submit">{editingId ? 'Salvar alterações' : 'Adicionar'}</Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <PageLoading />
      ) : loadError ? (
        <LoadError message={loadError} onRetry={refresh} />
      ) : companies.length === 0 ? (
        <Card>
          <EmptyState icon={<IconBuilding className="h-5 w-5" />} title="Nenhuma empresa cadastrada ainda." />
        </Card>
      ) : (
        <>
          <Card className="hidden overflow-hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">Website</th>
                    <th className="px-4 py-3 font-medium">Telefone</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageItems.map((company) => (
                    <tr key={company.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-medium">
                        <Link to={`/empresas/${company.id}`} className="flex items-center gap-2.5 text-slate-900 hover:text-orange-600 hover:underline">
                          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <IconBuilding className="h-3.5 w-3.5" />
                          </span>
                          {company.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {company.website ? (
                          <a href={company.website} target="_blank" rel="noreferrer" className="text-orange-600 hover:underline">
                            {company.website.replace(/^https?:\/\//, '')}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{company.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="xs" onClick={() => startEdit(company)}>
                            Editar
                          </Button>
                          {canDelete && (
                            <Button variant="danger" size="xs" onClick={() => handleRemove(company)}>
                              Excluir
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={safePage} pageCount={pageCount} totalItems={companies.length} onChange={setPage} />
          </Card>

          <div className="space-y-3 sm:hidden">
            {pageItems.map((company) => (
              <DataCard
                key={company.id}
                title={
                  <Link to={`/empresas/${company.id}`} className="text-slate-900 hover:text-orange-600 hover:underline">
                    {company.name}
                  </Link>
                }
                actions={
                  <>
                    <Button variant="ghost" size="xs" onClick={() => startEdit(company)}>
                      Editar
                    </Button>
                    {canDelete && (
                      <Button variant="danger" size="xs" onClick={() => handleRemove(company)}>
                        Excluir
                      </Button>
                    )}
                    <Link to={`/empresas/${company.id}`} className="ml-auto">
                      <Button variant="secondary" size="xs">
                        Mais ações
                      </Button>
                    </Link>
                  </>
                }
              >
                <DataCardRow label="Telefone" value={company.phone || '—'} />
                <DataCardRow
                  label="Website"
                  value={
                    company.website ? (
                      <a href={company.website} target="_blank" rel="noreferrer" className="text-orange-600 hover:underline">
                        {company.website.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      '—'
                    )
                  }
                />
              </DataCard>
            ))}
            {pageCount > 1 && (
              <Card>
                <Pagination page={safePage} pageCount={pageCount} totalItems={companies.length} onChange={setPage} />
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}
