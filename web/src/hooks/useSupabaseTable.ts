import { useCallback, useEffect, useState } from 'react'
import { db } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

/**
 * Generic CRUD hook for `skcrm` tables that follow the owner_id convention.
 * Every row is automatically scoped to the signed-in user (RLS enforces this
 * server-side too, so this is just for convenience on inserts).
 */
export function useSupabaseTable<T extends { id: string }>(table: string, orderBy = 'created_at') {
  const { user } = useAuth()
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
      const { data: row, error: createError } = await db
        .from(table)
        .insert({ ...values, owner_id: user.id } as never)
        .select()
        .single()
      if (createError) throw createError
      await refresh()
      return row as T
    },
    [table, user, refresh],
  )

  const update = useCallback(
    async (id: string, values: Partial<T>) => {
      const { error: updateError } = await db.from(table).update(values as never).eq('id', id)
      if (updateError) throw updateError
      await refresh()
    },
    [table, refresh],
  )

  const remove = useCallback(
    async (id: string) => {
      const { error: deleteError } = await db.from(table).delete().eq('id', id)
      if (deleteError) throw deleteError
      await refresh()
    },
    [table, refresh],
  )

  return { data, loading, error, refresh, create, update, remove }
}
