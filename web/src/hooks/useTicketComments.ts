import { useCallback, useEffect, useState } from 'react'
import { db } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'
import { notify } from '../lib/notify'
import { MAX_COMMENT_LENGTH } from '../lib/validators'
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
      if (body.length > MAX_COMMENT_LENGTH) {
        throw new Error(`Mensagem muito longa (limite de ${MAX_COMMENT_LENGTH} caracteres).`)
      }
      const { data: comment, error } = await db
        .from('ticket_comments')
        .insert({
          ticket_id: ticketId,
          owner_id: user.id,
          org_id: org.id,
          body,
          internal,
        } as never)
        .select()
        .single()
      if (error) throw error
      if (!internal) notify('ticket_comment', (comment as TicketComment).id)
      await refresh()
    },
    [ticketId, user, org, refresh],
  )

  return { comments, loading, addComment }
}
