import { useCallback, useEffect, useState } from 'react'
import { db } from '../lib/supabaseClient'
import { useOrg } from '../context/OrgContext'
import type { CompanySlaSetting, TicketPriority } from '../types/database'

/**
 * `company_sla_settings` não tem `owner_id` (não segue a convenção das outras
 * tabelas), por isso usa um hook dedicado em vez do `useSupabaseTable`
 * genérico — que sempre grava `owner_id` no insert. Também busca só as
 * linhas da empresa em questão, não a tabela inteira da organização.
 */
export function useCompanySlaSettings(companyId: string) {
  const { org } = useOrg()
  const [settings, setSettings] = useState<CompanySlaSetting[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!companyId) {
      setSettings([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await db.from('company_sla_settings').select('*').eq('company_id', companyId)
    setSettings((data ?? []) as CompanySlaSetting[])
    setLoading(false)
  }, [companyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const upsert = useCallback(
    async (priority: TicketPriority, hoursLimit: number) => {
      if (!org) throw new Error('Nenhuma organização ativa')
      const existing = settings.find((s) => s.priority === priority)
      if (existing) {
        const { data, error } = await db
          .from('company_sla_settings')
          .update({ hours_limit: hoursLimit })
          .eq('id', existing.id)
          .select()
          .single()
        if (error) throw error
        const updated = data as CompanySlaSetting
        setSettings((prev) => prev.map((s) => (s.id === existing.id ? updated : s)))
      } else {
        const { data, error } = await db
          .from('company_sla_settings')
          .insert({ org_id: org.id, company_id: companyId, priority, hours_limit: hoursLimit })
          .select()
          .single()
        if (error) throw error
        setSettings((prev) => [...prev, data as CompanySlaSetting])
      }
    },
    [org, companyId, settings],
  )

  const remove = useCallback(
    async (priority: TicketPriority) => {
      const existing = settings.find((s) => s.priority === priority)
      if (!existing) return
      const { error } = await db.from('company_sla_settings').delete().eq('id', existing.id)
      if (error) throw error
      setSettings((prev) => prev.filter((s) => s.id !== existing.id))
    },
    [settings],
  )

  return { settings, loading, upsert, remove }
}
