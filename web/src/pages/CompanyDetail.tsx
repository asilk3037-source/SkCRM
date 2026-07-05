import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import { useOrg } from '../context/OrgContext'
import { useConfirm } from '../components/ConfirmDialog'
import { useToast } from '../components/ToastProvider'
import { CompanyUsersCard } from '../components/CompanyUsersCard'
import type { Company, Contact, Ticket } from '../types/database'
import { STATUS_LABEL, STATUS_TONE, isTerminalStatus } from '../lib/ticketMeta'
import { formatPhoneBR, friendlyDbError, isValidPhoneBR, isValidUrl, normalizeUrl } from '../lib/validators'
import { can } from '../lib/permissions'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { FieldGroup, Input, Textarea } from '../components/ui/Field'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'
import { EmptyState } from '../components/ui/EmptyState'
import { PageLoading } from '../components/ui/Spinner'
import { DataCard, DataCardRow } from '../components/ui/DataCard'
import { Avatar } from '../components/ui/Avatar'
import { Hero } from '../components/ui/Hero'
import { StatChip } from '../components/ui/StatChip'
import {
  IconBuilding,
  IconInbox,
  IconPlus,
  IconUser,
  IconGlobe,
  IconPhone,
  IconMapPin,
  IconFileText,
  IconClock,
  IconCheckCircle,
  IconUsers,
} from '../components/ui/icons'

function InfoRow({ icon: Icon, label, value }: { icon: typeof IconGlobe; label: string; value: ReactNode }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <div className="mt-0.5 break-words text-sm text-slate-700">{value}</div>
      </div>
    </div>
  )
}

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { role } = useOrg()
  const canEdit = can(role, 'companies', 'edit')
  const canDelete = can(role, 'companies', 'delete')
  const confirm = useConfirm()
  const toast = useToast()

  const { data: companies, loading, update, remove } = useSupabaseTable<Company>('companies', 'name')
  const { data: contacts } = useSupabaseTable<Contact>('contacts', 'name')
  const { data: tickets } = useSupabaseTable<Ticket>('tickets')

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', website: '', phone: '', address: '', notes: '' })
  const [error, setError] = useState<string | null>(null)

  if (loading) return <PageLoading />
  const company = companies.find((c) => c.id === id)
  if (!company) return <Navigate to="/empresas" replace />

  const companyContacts = contacts.filter((c) => c.company_id === company.id)
  const contactIds = new Set(companyContacts.map((c) => c.id))
  const companyTickets = tickets.filter((t) => t.company_id === company.id || (t.contact_id && contactIds.has(t.contact_id)))
  const openTickets = companyTickets.filter((t) => !isTerminalStatus(t.status))
  const closedTickets = companyTickets.filter((t) => isTerminalStatus(t.status))

  function startEdit() {
    setForm({
      name: company!.name,
      website: company!.website ?? '',
      phone: company!.phone ?? '',
      address: company!.address ?? '',
      notes: company!.notes ?? '',
    })
    setEditing(true)
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
    try {
      await update(company!.id, { ...form, website: form.website.trim() ? normalizeUrl(form.website) : '' })
      setEditing(false)
      toast('Empresa atualizada.')
    } catch (err) {
      setError(friendlyDbError(err, 'Não foi possível salvar a empresa', 'Já existe uma empresa com esse nome.'))
    }
  }

  async function handleDelete() {
    if (!company) return
    if (await confirm({ description: `Excluir a empresa "${company.name}"? Essa ação não pode ser desfeita.` })) {
      await remove(company.id)
      toast('Empresa excluída.')
      navigate('/empresas')
    }
  }

  return (
    <div>
      <div className="mb-4">
        <Link to="/empresas" className="text-sm text-slate-500 hover:text-slate-900">
          ← Voltar para empresas
        </Link>
      </div>

      <Hero
        icon={
          <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-orange-400">
            <IconBuilding className="h-6 w-6" />
          </span>
        }
        title={company.name}
        description="Painel administrativo da empresa"
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(`/chamados?empresa=${company.id}`)}>
              <IconPlus className="h-4 w-4" /> Abrir chamado interno
            </Button>
            {canEdit && (
              <Button variant="secondary" onClick={() => (editing ? setEditing(false) : startEdit())}>
                {editing ? 'Cancelar' : 'Editar dados'}
              </Button>
            )}
            {canDelete && (
              <Button variant="danger" onClick={handleDelete}>
                Excluir empresa
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatChip label="Chamados no total" value={companyTickets.length} icon={IconInbox} tone="orange" />
        <StatChip label="Em aberto" value={openTickets.length} icon={IconClock} tone="blue" />
        <StatChip label="Concluídos" value={closedTickets.length} icon={IconCheckCircle} tone="emerald" />
        <StatChip label="Contatos vinculados" value={companyContacts.length} icon={IconUsers} tone="purple" />
      </div>

      <Card className="mb-6">
        <CardHeader>Dados da empresa</CardHeader>
        {editing ? (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <FieldGroup label="Nome" className="sm:col-span-2">
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
              <Button type="submit">Salvar alterações</Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
            <InfoRow
              icon={IconGlobe}
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
            <InfoRow icon={IconPhone} label="Telefone" value={company.phone || '—'} />
            <InfoRow icon={IconMapPin} label="Endereço" value={company.address || '—'} />
            <InfoRow icon={IconFileText} label="Notas" value={<span className="whitespace-pre-wrap">{company.notes || '—'}</span>} />
          </div>
        )}
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-700">Contatos desta empresa</h2>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">{companyContacts.length}</span>
          </div>
        </CardHeader>
        {companyContacts.length === 0 ? (
          <EmptyState icon={<IconUser className="h-5 w-5" />} title="Nenhum contato vinculado a esta empresa ainda." compact />
        ) : (
          <ul className="divide-y divide-slate-100">
            {companyContacts.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                <Avatar name={c.name} size="sm" />
                <span className="font-medium text-slate-900">{c.name}</span>
                {c.job_title && <span className="text-xs text-slate-400">{c.job_title}</span>}
                <span className="ml-auto text-slate-500">{c.email || '—'}</span>
                <span className="text-slate-400">{c.phone || '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-700">Chamados</h2>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">{companyTickets.length}</span>
          </div>
        </CardHeader>
        {companyTickets.length === 0 ? (
          <EmptyState icon={<IconInbox className="h-5 w-5" />} title="Nenhum chamado relacionado a esta empresa ainda." compact />
        ) : (
          (() => {
            const recentTickets = companyTickets
              .slice()
              .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
              .slice(0, 10)
            return (
              <>
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Nº</th>
                        <th className="px-4 py-2.5 font-medium">Assunto</th>
                        <th className="px-4 py-2.5 font-medium">Status</th>
                        <th className="px-4 py-2.5 font-medium">Atualizado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentTickets.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-2.5">
                            <Link to={`/chamados/${t.id}`} className="font-semibold text-orange-600 hover:underline">
                              #{t.number}
                            </Link>
                          </td>
                          <td className="max-w-xs truncate px-4 py-2.5 font-medium text-slate-900">{t.subject}</td>
                          <td className="px-4 py-2.5">
                            <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                          </td>
                          <td className="px-4 py-2.5 text-xs tabular-nums text-slate-400">
                            {new Date(t.updated_at).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-3 p-3 sm:hidden">
                  {recentTickets.map((t) => (
                    <DataCard
                      key={t.id}
                      title={
                        <Link to={`/chamados/${t.id}`} className="text-slate-900 hover:text-orange-600 hover:underline">
                          #{t.number} — {t.subject}
                        </Link>
                      }
                      badge={<Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>}
                    >
                      <DataCardRow label="Atualizado" value={new Date(t.updated_at).toLocaleDateString('pt-BR')} />
                    </DataCard>
                  ))}
                </div>
              </>
            )
          })()
        )}
      </Card>

      <CompanyUsersCard companyId={company.id} />
    </div>
  )
}
