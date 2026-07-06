import { useState, type FormEvent } from 'react'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import { useOrg } from '../context/OrgContext'
import { useConfirm } from '../components/ConfirmDialog'
import { useToast } from '../components/ToastProvider'
import { AttachmentsModal } from '../components/AttachmentsModal'
import { ImportContactsModal } from '../components/ImportContactsModal'
import type { Contact, Company } from '../types/database'
import { formatPhoneBR, friendlyDbError, isValidPhoneBR } from '../lib/validators'
import { can } from '../lib/permissions'
import { toCsv, downloadCsv } from '../lib/csv'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { FieldGroup, Input, Select, Textarea } from '../components/ui/Field'
import { Alert } from '../components/ui/Alert'
import { EmptyState } from '../components/ui/EmptyState'
import { PageLoading } from '../components/ui/Spinner'
import { LoadError } from '../components/ui/LoadError'
import { DataCard, DataCardRow } from '../components/ui/DataCard'
import { Avatar } from '../components/ui/Avatar'
import { Pagination, paginate } from '../components/ui/Pagination'
import { SortableTh } from '../components/ui/SortableTh'
import { useSort } from '../lib/useSort'
import { IconDownload, IconPaperclip, IconPlus, IconUser } from '../components/ui/icons'

type ContactSortKey = 'name' | 'company' | 'email' | 'phone'

const PAGE_SIZE = 20

const EXPORT_HEADERS = [
  { key: 'name', label: 'Nome' },
  { key: 'email', label: 'E-mail' },
  { key: 'phone', label: 'Telefone' },
  { key: 'job_title', label: 'Cargo' },
  { key: 'company', label: 'Empresa' },
]

const emptyForm = { name: '', email: '', phone: '', job_title: '', company_id: '', notes: '' }

export function Contacts() {
  const { data: contacts, loading, error: loadError, refresh, create, update, remove } = useSupabaseTable<Contact>('contacts', 'name')
  const { data: companies } = useSupabaseTable<Company>('companies', 'name')
  const { role } = useOrg()
  const canDelete = can(role, 'contacts', 'delete')
  const confirm = useConfirm()
  const toast = useToast()
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [attachFor, setAttachFor] = useState<Contact | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  const companyName = (id: string | null) => companies.find((c) => c.id === id)?.name ?? '—'
  const { sorted, sortKey, sortDir, toggleSort } = useSort<Contact, ContactSortKey>(
    contacts,
    (contact, key) => {
      if (key === 'company') return companyName(contact.company_id)
      if (key === 'email') return contact.email ?? ''
      if (key === 'phone') return contact.phone ?? ''
      return contact.name
    },
    'name',
  )
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageItems = paginate(sorted, safePage, PAGE_SIZE)

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
    setError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (form.name.trim().length < 2) {
      setError('O nome precisa ter pelo menos 2 caracteres.')
      return
    }
    if (!isValidPhoneBR(form.phone)) {
      setError('Telefone inválido — use DDD + número.')
      return
    }
    const values = { ...form, company_id: form.company_id || null }
    try {
      if (editingId) {
        await update(editingId, values)
        toast('Contato atualizado.')
      } else {
        await create(values)
        toast('Contato adicionado.')
      }
      resetForm()
    } catch (err) {
      setError(friendlyDbError(err, 'Não foi possível salvar o contato', 'Já existe um contato com esse e-mail.'))
    }
  }

  async function handleRemove(contact: Contact) {
    if (await confirm({ description: `Excluir o contato "${contact.name}"? Essa ação não pode ser desfeita.` })) {
      await remove(contact.id)
      toast('Contato excluído.')
    }
  }

  function handleExport() {
    const rows = contacts.map((c) => ({
      name: c.name,
      email: c.email ?? '',
      phone: c.phone ?? '',
      job_title: c.job_title ?? '',
      company: companyName(c.company_id),
    }))
    downloadCsv(`contatos-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows, EXPORT_HEADERS))
  }

  return (
    <div>
      <PageHeader
        eyebrow="Base de relacionamento"
        title="Contatos"
        description={`${contacts.length} contato(s) cadastrado(s)`}
        actions={
          <>
            <Button variant="secondary" onClick={handleExport} disabled={contacts.length === 0}>
              <IconDownload className="h-4 w-4" /> Exportar CSV
            </Button>
            <Button variant="secondary" onClick={() => setShowImport(true)}>
              Importar CSV
            </Button>
            <Button variant={showForm ? 'secondary' : 'primary'} onClick={() => (showForm ? resetForm() : setShowForm(true))}>
              {showForm ? 'Cancelar' : (
                <>
                  <IconPlus className="h-4 w-4" /> Novo contato
                </>
              )}
            </Button>
          </>
        }
      />

      {showForm && (
        <Card className="mb-6 p-5">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup label="Nome" className="sm:col-span-2">
              <Input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </FieldGroup>
            <FieldGroup label="E-mail">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </FieldGroup>
            <FieldGroup label="Telefone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhoneBR(e.target.value) })} />
            </FieldGroup>
            <FieldGroup label="Cargo">
              <Input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
            </FieldGroup>
            <FieldGroup label="Empresa">
              <Select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                <option value="">Sem empresa</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>
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
      ) : contacts.length === 0 ? (
        <Card>
          <EmptyState icon={<IconUser className="h-5 w-5" />} title="Nenhum contato cadastrado ainda." hint="Adicione um contato manualmente ou importe uma lista via CSV." />
        </Card>
      ) : (
        <>
          <Card className="hidden overflow-hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <SortableTh label="Nome" sortKey="name" active={sortKey === 'name'} dir={sortDir} onClick={toggleSort} />
                    <SortableTh label="Empresa" sortKey="company" active={sortKey === 'company'} dir={sortDir} onClick={toggleSort} />
                    <SortableTh label="E-mail" sortKey="email" active={sortKey === 'email'} dir={sortDir} onClick={toggleSort} />
                    <SortableTh label="Telefone" sortKey="phone" active={sortKey === 'phone'} dir={sortDir} onClick={toggleSort} />
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageItems.map((contact) => (
                    <tr key={contact.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={contact.name} size="sm" />
                          {contact.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{companyName(contact.company_id)}</td>
                      <td className="px-4 py-3 text-slate-600">{contact.email || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{contact.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="xs" onClick={() => setAttachFor(contact)}>
                            <IconPaperclip className="h-3.5 w-3.5" /> Anexos
                          </Button>
                          <Button variant="ghost" size="xs" onClick={() => startEdit(contact)}>
                            Editar
                          </Button>
                          {canDelete && (
                            <Button variant="danger" size="xs" onClick={() => handleRemove(contact)}>
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
            <Pagination page={safePage} pageCount={pageCount} totalItems={contacts.length} onChange={setPage} />
          </Card>

          <div className="space-y-3 sm:hidden">
            {pageItems.map((contact) => (
              <DataCard
                key={contact.id}
                title={
                  <span className="flex items-center gap-2">
                    <Avatar name={contact.name} size="sm" />
                    {contact.name}
                  </span>
                }
                actions={
                  <>
                    <Button variant="ghost" size="xs" onClick={() => setAttachFor(contact)}>
                      <IconPaperclip className="h-3.5 w-3.5" /> Anexos
                    </Button>
                    <Button variant="ghost" size="xs" onClick={() => startEdit(contact)}>
                      Editar
                    </Button>
                    {canDelete && (
                      <Button variant="danger" size="xs" onClick={() => handleRemove(contact)}>
                        Excluir
                      </Button>
                    )}
                  </>
                }
              >
                <DataCardRow label="Empresa" value={companyName(contact.company_id)} />
                <DataCardRow label="E-mail" value={contact.email || '—'} />
                <DataCardRow label="Telefone" value={contact.phone || '—'} />
              </DataCard>
            ))}
            {pageCount > 1 && (
              <Card>
                <Pagination page={safePage} pageCount={pageCount} totalItems={contacts.length} onChange={setPage} />
              </Card>
            )}
          </div>
        </>
      )}
      {attachFor && (
        <AttachmentsModal
          kind="contact"
          recordId={attachFor.id}
          title={attachFor.name}
          onClose={() => setAttachFor(null)}
        />
      )}
      {showImport && <ImportContactsModal onClose={() => setShowImport(false)} />}
    </div>
  )
}
