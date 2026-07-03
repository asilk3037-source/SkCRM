import { useCallback, useEffect, useState } from 'react'
import { db } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'
import type { TicketComment } from '../types/database'

export function useTicketComments(ticketId: string) {
  const { user } = useAuth()
  const { org } = useOrg()
  const [comments, setComments] = useState<TicketComment[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setComments([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await db
      .from('ticket_comments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
    setComments((data ?? []) as TicketComment[])
    setLoading(false)
  }, [ticketId, user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addComment = useCallback(
    async (body: string, internal = false) => {
      if (!user) throw new Error('Not authenticated')
      if (!org) throw new Error('Nenhuma organização ativa')
      const { error } = await db.from('ticket_comments').insert({
        ticket_id: ticketId,
        owner_id: user.id,
        org_id: org.id,
        body,
        internal,
      } as never)
      if (error) throw error
      await refresh()
    },
    [ticketId, user, org, refresh],
  )

  return { comments, loading, addComment }
}
