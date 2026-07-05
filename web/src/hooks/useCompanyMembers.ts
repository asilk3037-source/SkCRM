import { useCallback, useEffect, useState } from 'react'
import { db, supabase } from '../lib/supabaseClient'
import type { CompanyMember } from '../types/database'

export type CompanyMemberWithAccess = CompanyMember & { last_sign_in_at?: string | null }

/**
 * Usuários do portal vinculados a uma empresa (múltiplos por empresa).
 * Toda escrita passa pela edge function `manage-company-user`, que roda com
 * a chave de serviço — criar/resetar senha/excluir usuário exige a Admin API
 * do Supabase Auth, que nunca pode ser chamada com a chave pública.
 */
export function useCompanyMembers(companyId: string) {
  const [members, setMembers] = useState<CompanyMemberWithAccess[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!companyId) {
      setMembers([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await db
      .from('company_members')
      .select('id, org_id, company_id, user_id, contact_id, active, created_at, profile:profiles(user_id, email, display_name, created_at)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })
    const rows = (data ?? []) as unknown as CompanyMember[]
    setMembers(rows)
    setLoading(false)

    if (rows.length > 0) {
      try {
        const { data: accessData, error } = await supabase.functions.invoke('manage-company-user', {
          body: { action: 'last_sign_in', company_id: companyId, user_ids: rows.map((r) => r.user_id) },
        })
        if (!error && accessData?.users) {
          const byId = new Map<string, string | null>(
            (accessData.users as Array<{ user_id: string; last_sign_in_at: string | null }>).map((u) => [u.user_id, u.last_sign_in_at]),
          )
          setMembers(rows.map((r) => ({ ...r, last_sign_in_at: byId.get(r.user_id) ?? null })))
        }
      } catch {
        // "Último acesso" é informativo — sem ele, a lista de usuários continua funcionando normalmente.
      }
    }
  }, [companyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function call(body: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke('manage-company-user', { body })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return data
  }

  const create = useCallback(
    async (values: { name: string; email: string; password: string }) => {
      await call({ action: 'create', company_id: companyId, ...values })
      await refresh()
    },
    [companyId, refresh],
  )

  const edit = useCallback(
    async (userId: string, name: string) => {
      await call({ action: 'edit', company_id: companyId, user_id: userId, name })
      await refresh()
    },
    [companyId, refresh],
  )

  const resetPassword = useCallback(
    async (userId: string) => {
      await call({ action: 'reset_password', company_id: companyId, user_id: userId })
    },
    [companyId],
  )

  const setActive = useCallback(
    async (userId: string, active: boolean) => {
      await call({ action: 'set_active', company_id: companyId, user_id: userId, active })
      await refresh()
    },
    [companyId, refresh],
  )

  const remove = useCallback(
    async (userId: string) => {
      await call({ action: 'delete', company_id: companyId, user_id: userId })
      await refresh()
    },
    [companyId, refresh],
  )

  return { members, loading, refresh, create, edit, resetPassword, setActive, remove }
}
