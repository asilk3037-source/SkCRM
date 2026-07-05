import { useCallback, useEffect, useState } from 'react'
import { db } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'

function sortByKey<T>(rows: T[], key: string): T[] {
  return [...rows].sort((a, b) => {
    const av = (a as Record<string, unknown>)[key] as string | number | null | undefined
    const bv = (b as Record<string, unknown>)[key] as string | number | null | undefined
    if (av == null && bv == null) return 0
    if (av == null) return -1
    if (bv == null) return 1
    if (av < bv) return -1
    if (av > bv) return 1
    return 0
  })
}

/**
 * Generic CRUD hook for `skcrm` tables that follow the owner_id convention.
 * Every row is automatically scoped to the signed-in user (RLS enforces this
 * server-side too, so this is just for convenience on inserts).
 *
 * Writes patch local state from the row Supabase returns instead of
 * refetching the whole table — avoids an O(n) reload on every single
 * create/update/delete once a table has any meaningful amount of data.
 */
export function useSupabaseTable<T extends { id: string }>(table: string, orderBy = 'created_at') {
  const { user } = useAuth()
  const { org } = useOrg()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data: rows, error: fetchError } = await db
      .from(table)
      .select('*')
      .order(orderBy, { ascending: true })

    if (fetchError) setError(fetchError.message)
    else {
      setError(null)
      setData((rows ?? []) as T[])
    }
    setLoading(false)
  }, [table, orderBy, user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const create = useCallback(
    async (values: Partial<T>) => {
      if (!user) throw new Error('Not authenticated')
      if (!org) throw new Error('Nenhuma organização ativa')
      const { data: row, error: createError } = await db
        .from(table)
        .insert({ ...values, owner_id: user.id, org_id: org.id } as never)
        .select()
        .single()
      if (createError) throw createError
      const created = row as T
      setData((prev) => sortByKey([...prev, created], orderBy))
      return created
    },
    [table, user, org, orderBy],
  )

  const update = useCallback(
    async (id: string, values: Partial<T>) => {
      const { data: row, error: updateError } = await db
        .from(table)
        .update(values as never)
        .eq('id', id)
        .select()
        .single()
      if (updateError) throw updateError
      const updated = row as T
      setData((prev) => sortByKey(prev.map((item) => (item.id === id ? updated : item)), orderBy))
    },
    [table, orderBy],
  )

  const remove = useCallback(async (id: string) => {
    const { error: deleteError } = await db.from(table).delete().eq('id', id)
    if (deleteError) throw deleteError
    setData((prev) => prev.filter((item) => item.id !== id))
  }, [table])

  return { data, loading, error, refresh, create, update, remove }
}
