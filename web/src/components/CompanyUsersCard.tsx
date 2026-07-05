import { useState, type FormEvent } from 'react'
import { useOrg } from '../context/OrgContext'
import { useConfirm } from './ConfirmDialog'
import { useCompanyMembers, type CompanyMemberWithAccess } from '../hooks/useCompanyMembers'
import { can } from '../lib/permissions'
import { Button } from './ui/Button'
import { Card, CardHeader } from './ui/Card'
import { FieldGroup, Input } from './ui/Field'
import { Badge } from './ui/Badge'
import { Alert } from './ui/Alert'
import { EmptyState } from './ui/EmptyState'
import { PageLoading } from './ui/Spinner'
import { IconPlus, IconUsers } from './ui/icons'

const emptyForm = { name: '', email: '', password: '' }

export function CompanyUsersCard({ companyId }: { companyId: string }) {
  const { role } = useOrg()
  const canManage = can(role, 'companyUsers', 'manage')
  const confirm = useConfirm()
  const { members, loading, create, edit, resetPassword, setActive, remove } = useCompanyMembers(companyId)

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [resetSentFor, setResetSentFor] = useState<string | null>(null)

  function memberLabel(m: CompanyMemberWithAccess) {
    return m.profile?.display_name ?? m.profile?.email ?? 'Usuário'
  }

  async function handleCreateSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (form.name.trim().length < 2) return setError('O nome precisa ter pelo menos 2 caracteres.')
    if (!form.email.trim()) return setError('E-mail é obrigatório.')
    if (form.password.length < 8) return setError('A senha provisória precisa ter pelo menos 8 caracteres.')
    try {
      await create(form)
      setForm(emptyForm)
      setShowCreate(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o usuário.')
    }
  }

  async function handleEditSubmit(e: FormEvent, userId: string) {
    e.preventDefault()
    setError(null)
    if (editName.trim().length < 2) return setError('O nome precisa ter pelo menos 2 caracteres.')
    setBusy(userId)
    try {
      await edit(userId, editName.trim())
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setBusy(null)
    }
  }

  async function handleResetPassword(m: CompanyMemberWithAccess) {
    setError(null)
    setBusy(m.user_id)
    try {
      await resetPassword(m.user_id)
      setResetSentFor(m.user_id)
      setTimeout(() => setResetSentFor(null), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o link.')
    } finally {
      setBusy(null)
    }
  }

  async function handleToggleActive(m: CompanyMemberWithAccess) {
    setError(null)
    setBusy(m.user_id)
    try {
      await setActive(m.user_id, !m.active)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar.')
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete(m: CompanyMemberWithAccess) {
    if (!(await confirm({ description: `Excluir o acesso de "${memberLabel(m)}"? A conta de login será removida definitivamente.` }))) return
    setError(null)
    setBusy(m.user_id)
    try {
      await remove(m.user_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível excluir.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconUsers className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700">Usuários do portal</h2>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">{members.length}</span>
          </div>
          {canManage && (
            <Button size="sm" variant={showCreate ? 'secondary' : 'primary'} onClick={() => setShowCreate((v) => !v)}>
              {showCreate ? 'Cancelar' : (
                <>
                  <IconPlus className="h-3.5 w-3.5" /> Novo usuário
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      {showCreate && (
        <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 gap-3 border-b border-slate-100 p-5 sm:grid-cols-3">
          <FieldGroup label="Nome">
            <Input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="E-mail">
            <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Senha provisória" hint="Mínimo 8 caracteres — a pessoa pode trocar depois.">
            <Input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </FieldGroup>
          {error && (
            <div className="sm:col-span-3">
              <Alert tone="error">{error}</Alert>
            </div>
          )}
          <div className="sm:col-span-3">
            <Button type="submit">Criar usuário</Button>
          </div>
        </form>
      )}

      {!showCreate && error && (
        <div className="border-b border-slate-100 p-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <PageLoading />
      ) : members.length === 0 ? (
        <EmptyState
          icon={<IconUsers className="h-5 w-5" />}
          title="Nenhum usuário do portal ainda."
          hint={canManage ? 'Clique em "Novo usuário" para criar o primeiro acesso desta empresa.' : undefined}
          compact
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-sm">
              {editingId === m.user_id ? (
                <form onSubmit={(e) => handleEditSubmit(e, m.user_id)} className="flex flex-1 flex-wrap items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    className="!w-auto !py-1"
                  />
                  <Button type="submit" size="xs" disabled={busy === m.user_id}>
                    Salvar
                  </Button>
                  <Button type="button" variant="secondary" size="xs" onClick={() => setEditingId(null)}>
                    Cancelar
                  </Button>
                </form>
              ) : (
                <>
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white">
                    {memberLabel(m).slice(0, 1).toUpperCase()}
                  </span>
                  <span className="font-medium text-slate-900">{memberLabel(m)}</span>
                  <span className="text-slate-500">{m.profile?.email}</span>
                  <Badge tone={m.active ? 'emerald' : 'slate'}>{m.active ? 'Ativo' : 'Inativo'}</Badge>
                  <span className="text-xs text-slate-400">
                    {m.last_sign_in_at
                      ? `último acesso em ${new Date(m.last_sign_in_at).toLocaleDateString('pt-BR')}`
                      : 'nunca acessou'}
                  </span>
                  {resetSentFor === m.user_id && <span className="text-xs font-medium text-emerald-600">Link enviado ✓</span>}
                  {canManage && (
                    <div className="ml-auto flex flex-wrap gap-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={busy === m.user_id}
                        onClick={() => {
                          setEditingId(m.user_id)
                          setEditName(m.profile?.display_name ?? '')
                        }}
                      >
                        Editar
                      </Button>
                      <Button variant="ghost" size="xs" disabled={busy === m.user_id} onClick={() => handleResetPassword(m)}>
                        Resetar senha
                      </Button>
                      <Button variant="ghost" size="xs" disabled={busy === m.user_id} onClick={() => handleToggleActive(m)}>
                        {m.active ? 'Inativar' : 'Ativar'}
                      </Button>
                      <Button variant="danger" size="xs" disabled={busy === m.user_id} onClick={() => handleDelete(m)}>
                        Excluir
                      </Button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
