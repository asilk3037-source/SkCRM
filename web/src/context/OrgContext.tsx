import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { db } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'
import { notify } from '../lib/notify'
import type { Org, OrgInvite, OrgMember, OrgRole } from '../types/database'

interface OrgContextValue {
  org: Org | null
  role: OrgRole | null
  members: OrgMember[]
  invites: OrgInvite[]
  loading: boolean
  isAdmin: boolean
  refresh: () => Promise<void>
  invite: (email: string, role: OrgRole) => Promise<void>
  removeMember: (userId: string) => Promise<void>
  setMemberRole: (userId: string, role: OrgRole) => Promise<void>
  cancelInvite: (inviteId: string) => Promise<void>
  renameOrg: (name: string) => Promise<void>
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined)

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [org, setOrg] = useState<Org | null>(null)
  const [role, setRole] = useState<OrgRole | null>(null)
  const [members, setMembers] = useState<OrgMember[]>([])
  const [invites, setInvites] = useState<OrgInvite[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setOrg(null)
      setRole(null)
      setMembers([])
      setInvites([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data: memberships } = await db
      .from('org_members')
      .select('org_id, role, org:orgs(id, name, created_by, created_at)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)

    const membership = memberships?.[0] as unknown as { role: OrgRole; org: Org } | undefined
    if (!membership?.org) {
      setOrg(null)
      setRole(null)
      setMembers([])
      setInvites([])
      setLoading(false)
      return
    }

    setOrg(membership.org)
    setRole(membership.role)

    const [{ data: memberRows }, { data: inviteRows }] = await Promise.all([
      db
        .from('org_members')
        .select('org_id, user_id, role, created_at, profile:profiles(user_id, email, display_name, created_at)')
        .eq('org_id', membership.org.id)
        .order('created_at', { ascending: true }),
      db.from('org_invites').select('*').eq('org_id', membership.org.id).order('created_at', { ascending: true }),
    ])

    setMembers((memberRows ?? []) as unknown as OrgMember[])
    setInvites((inviteRows ?? []) as OrgInvite[])
    setLoading(false)
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const invite = useCallback(
    async (email: string, inviteRole: OrgRole) => {
      if (!org || !user) throw new Error('Sem organização ativa')
      const { data: created, error } = await db
        .from('org_invites')
        .insert({
          org_id: org.id,
          email: email.trim().toLowerCase(),
          role: inviteRole,
          created_by: user.id,
        } as never)
        .select()
        .single()
      if (error) throw error
      notify('org_invite', (created as OrgInvite).id)
      await refresh()
    },
    [org, user, refresh],
  )

  const removeMember = useCallback(
    async (userId: string) => {
      if (!org) return
      const { error } = await db.from('org_members').delete().eq('org_id', org.id).eq('user_id', userId)
      if (error) throw error
      await refresh()
    },
    [org, refresh],
  )

  const setMemberRole = useCallback(
    async (userId: string, newRole: OrgRole) => {
      if (!org) return
      const { error } = await db
        .from('org_members')
        .update({ role: newRole } as never)
        .eq('org_id', org.id)
        .eq('user_id', userId)
      if (error) throw error
      await refresh()
    },
    [org, refresh],
  )

  const cancelInvite = useCallback(
    async (inviteId: string) => {
      const { error } = await db.from('org_invites').delete().eq('id', inviteId)
      if (error) throw error
      await refresh()
    },
    [refresh],
  )

  const renameOrg = useCallback(
    async (name: string) => {
      if (!org) return
      const { error } = await db.from('orgs').update({ name } as never).eq('id', org.id)
      if (error) throw error
      await refresh()
    },
    [org, refresh],
  )

  return (
    <OrgContext.Provider
      value={{
        org,
        role,
        members,
        invites,
        loading,
        isAdmin: role === 'admin',
        refresh,
        invite,
        removeMember,
        setMemberRole,
        cancelInvite,
        renameOrg,
      }}
    >
      {children}
    </OrgContext.Provider>
  )
}

export function useOrg() {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrg must be used within an OrgProvider')
  return ctx
}
