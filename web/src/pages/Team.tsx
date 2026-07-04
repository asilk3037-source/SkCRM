import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'
import type { OrgRole } from '../types/database'

const ROLE_LABEL: Record<OrgRole, string> = { admin: 'Administrador', supervisor: 'Supervisor', suporte: 'Suporte' }

export function Team() {
  const { user } = useAuth()
  const { org, members, invites, isAdmin, invite, removeMember, setMemberRole, cancelInvite, renameOrg } = useOrg()
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível convidar')
    }
  }

  async function handleRename(e: FormEvent) {
    e.preventDefault()
    if (orgName.trim()) await renameOrg(orgName.trim())
    setEditingName(false)
  }

  if (!org) return <p className="text-sm text-slate-500">Carregando equipe...</p>

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Equipe</h1>
        {editingName ? (
          <form onSubmit={handleRename} className="flex items-center gap-2">
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              placeholder={org.name}
            />
            <button type="submit" className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700">
              Salvar
            </button>
          </form>
        ) : (
          <>
            <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-medium text-slate-700">{org.name}</span>
            {isAdmin && (
              <button
                onClick={() => {
                  setOrgName(org.name)
                  setEditingName(true)
                }}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Renomear
              </button>
            )}
          </>
        )}
      </div>

      {isAdmin && (
        <form onSubmit={handleInvite} className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-5">
          <label className="flex-1 text-sm font-medium text-slate-700">
            Convidar por e-mail
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pessoa@empresa.com"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Papel
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as OrgRole)}
              className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="suporte">Suporte</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          <button type="submit" className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700">
            Convidar
          </button>
          {error && <p className="w-full text-sm text-red-600">{error}</p>}
          <p className="w-full text-xs text-slate-400">
            Se a pessoa já tem conta no SkCRM, entra na equipe na hora. Se não tem, entra automaticamente assim que se
            cadastrar com esse e-mail.
          </p>
          <p className="w-full text-xs text-slate-400">
            <strong>Suporte</strong>: atende e responde chamados. <strong>Supervisor</strong>: além disso, pode
            excluir chamados. <strong>Administrador</strong>: além disso, gerencia a equipe e a organização.
          </p>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
          Membros ({members.length})
        </h2>
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-slate-100">
            {members.map((member) => (
              <tr key={member.user_id}>
                <td className="px-4 py-3">
                  <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white">
                    {(member.profile?.display_name ?? member.profile?.email ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                  <span className="font-medium text-slate-900">
                    {member.profile?.display_name ?? member.profile?.email}
                  </span>
                  {member.user_id === user?.id && <span className="ml-2 text-xs text-slate-400">(você)</span>}
                </td>
                <td className="px-4 py-3 text-slate-600">{member.profile?.email}</td>
                <td className="px-4 py-3">
                  {isAdmin && member.user_id !== user?.id ? (
                    <select
                      value={member.role}
                      onChange={(e) => setMemberRole(member.user_id, e.target.value as OrgRole)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    >
                      <option value="suporte">Suporte</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="admin">Administrador</option>
                    </select>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {ROLE_LABEL[member.role]}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {isAdmin && member.user_id !== user?.id && (
                    <button onClick={() => removeMember(member.user_id)} className="text-xs text-red-500 hover:text-red-700">
                      Remover
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {invites.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <h2 className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700">
            Convites pendentes ({invites.length})
          </h2>
          <ul className="divide-y divide-slate-100">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="text-slate-700">{inv.email}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{ROLE_LABEL[inv.role]}</span>
                <span className="text-xs text-slate-400">aguardando cadastro</span>
                {isAdmin && (
                  <button onClick={() => cancelInvite(inv.id)} className="ml-auto text-xs text-red-500 hover:text-red-700">
                    Cancelar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
