import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'
import { useConfirm } from '../components/ConfirmDialog'
import { useToast } from '../components/ToastProvider'
import type { OrgRole } from '../types/database'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { FieldGroup, Input, Select } from '../components/ui/Field'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'
import { PageLoading } from '../components/ui/Spinner'
import { Avatar } from '../components/ui/Avatar'
import { DataCard, DataCardRow } from '../components/ui/DataCard'

const ROLE_LABEL: Record<OrgRole, string> = { admin: 'Administrador', supervisor: 'Supervisor', suporte: 'Suporte' }

export function Team() {
  const { user } = useAuth()
  const { org, members, invites, isAdmin, invite, removeMember, setMemberRole, cancelInvite, renameOrg } = useOrg()
  const confirm = useConfirm()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrgRole>('suporte')
  const [error, setError] = useState<string | null>(null)
  const [orgName, setOrgName] = useState('')
  const [editingName, setEditingName] = useState(false)

  async function handleInvite(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await invite(email, role)
      setEmail('')
      toast('Convite enviado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível convidar')
    }
  }

  async function handleRename(e: FormEvent) {
    e.preventDefault()
    if (orgName.trim()) {
      await renameOrg(orgName.trim())
      toast('Organização renomeada.')
    }
    setEditingName(false)
  }

  async function handleRemoveMember(memberUserId: string, label: string) {
    if (await confirm({ description: `Remover ${label} da equipe?` })) {
      await removeMember(memberUserId)
      toast('Membro removido da equipe.')
    }
  }

  async function handleCancelInvite(inviteId: string, inviteEmail: string) {
    if (await confirm({ tone: 'default', description: `Cancelar o convite para ${inviteEmail}?` })) {
      await cancelInvite(inviteId)
      toast('Convite cancelado.')
    }
  }

  if (!org) return <PageLoading label="Carregando equipe..." />

  return (
    <div>
      <PageHeader
        eyebrow="Membros e permissões"
        title="Equipe"
        actions={
          editingName ? (
            <form onSubmit={handleRename} className="flex items-center gap-2">
              <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder={org.name} className="!py-1.5" autoFocus />
              <Button type="submit" size="sm">
                Salvar
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <Badge tone="slate" className="px-3 py-1 text-sm">
                {org.name}
              </Badge>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setOrgName(org.name)
                    setEditingName(true)
                  }}
                >
                  Renomear
                </Button>
              )}
            </div>
          )
        }
      />

      {isAdmin && (
        <Card className="mb-6 p-5">
          <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
            <FieldGroup label="Convidar por e-mail" className="min-w-[220px] flex-1">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@empresa.com" />
            </FieldGroup>
            <FieldGroup label="Papel">
              <Select value={role} onChange={(e) => setRole(e.target.value as OrgRole)} className="!w-auto">
                <option value="suporte">Suporte</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Administrador</option>
              </Select>
            </FieldGroup>
            <Button type="submit">Convidar</Button>
            {error && (
              <div className="w-full">
                <Alert tone="error">{error}</Alert>
              </div>
            )}
            <p className="w-full text-xs text-slate-400">
              Se a pessoa já tem conta no SkCRM, entra na equipe na hora. Se não tem, entra automaticamente assim que se
              cadastrar com esse e-mail.
            </p>
            <p className="w-full text-xs text-slate-400">
              <strong className="text-slate-500">Suporte</strong>: atende e responde chamados.{' '}
              <strong className="text-slate-500">Supervisor</strong>: além disso, pode excluir chamados.{' '}
              <strong className="text-slate-500">Administrador</strong>: além disso, gerencia a equipe e a organização.
            </p>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-700">Membros</h2>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">{members.length}</span>
          </div>
        </CardHeader>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-slate-100">
              {members.map((member) => (
                <tr key={member.user_id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={member.profile?.display_name ?? member.profile?.email ?? '?'} size="sm" />
                      <span className="font-medium text-slate-900">
                        {member.profile?.display_name ?? member.profile?.email}
                      </span>
                      {member.user_id === user?.id && <span className="text-xs text-slate-400">(você)</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{member.profile?.email}</td>
                  <td className="px-4 py-3">
                    {isAdmin && member.user_id !== user?.id ? (
                      <Select
                        value={member.role}
                        onChange={(e) => setMemberRole(member.user_id, e.target.value as OrgRole)}
                        className="!w-auto !py-1"
                      >
                        <option value="suporte">Suporte</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="admin">Administrador</option>
                      </Select>
                    ) : (
                      <Badge>{ROLE_LABEL[member.role]}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isAdmin && member.user_id !== user?.id && (
                      <Button
                        variant="danger"
                        size="xs"
                        onClick={() => handleRemoveMember(member.user_id, member.profile?.display_name ?? member.profile?.email ?? 'este membro')}
                      >
                        Remover
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 p-3 sm:hidden">
          {members.map((member) => (
            <DataCard
              key={member.user_id}
              title={
                <span className="flex items-center gap-2.5">
                  <Avatar name={member.profile?.display_name ?? member.profile?.email ?? '?'} size="sm" />
                  {member.profile?.display_name ?? member.profile?.email}
                  {member.user_id === user?.id && <span className="text-xs font-normal text-slate-400">(você)</span>}
                </span>
              }
              badge={!isAdmin || member.user_id === user?.id ? <Badge>{ROLE_LABEL[member.role]}</Badge> : undefined}
              actions={
                isAdmin && member.user_id !== user?.id ? (
                  <>
                    <Select
                      value={member.role}
                      onChange={(e) => setMemberRole(member.user_id, e.target.value as OrgRole)}
                      className="!w-auto !py-1"
                    >
                      <option value="suporte">Suporte</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="admin">Administrador</option>
                    </Select>
                    <Button
                      variant="danger"
                      size="xs"
                      className="ml-auto"
                      onClick={() => handleRemoveMember(member.user_id, member.profile?.display_name ?? member.profile?.email ?? 'este membro')}
                    >
                      Remover
                    </Button>
                  </>
                ) : undefined
              }
            >
              <DataCardRow label="E-mail" value={member.profile?.email} />
            </DataCard>
          ))}
        </div>
      </Card>

      {invites.length > 0 && (
        <Card className="mt-6 overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-700">Convites pendentes</h2>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">{invites.length}</span>
            </div>
          </CardHeader>
          <ul className="divide-y divide-slate-100">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="text-slate-700">{inv.email}</span>
                <Badge>{ROLE_LABEL[inv.role]}</Badge>
                <span className="text-xs text-slate-400">aguardando cadastro</span>
                {isAdmin && (
                  <Button variant="danger" size="xs" className="ml-auto" onClick={() => handleCancelInvite(inv.id, inv.email)}>
                    Cancelar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
