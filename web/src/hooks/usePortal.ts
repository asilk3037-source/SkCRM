import { useCallback, useEffect, useState } from 'react'
import { db } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { Ticket, TicketComment } from '../types/database'

/**
 * Client-portal data access. RLS only exposes tickets linked to a contact
 * whose e-mail matches the signed-in user, and writes go through the
 * portal_* database functions (security definer).
 */
export function usePortalTickets() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setTickets([])
      setLoading(false)
      return
    }
    const { data } = await db.from('tickets').select('*').order('updated_at', { ascending: false })
    setTickets((data ?? []) as Ticket[])
    setLoading(false)
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const openTicket = useCallback(
    async (values: { subject: string; description: string; category: string; priority: string }) => {
      const { data, error } = await db.rpc('portal_open_ticket', {
        p_subject: values.subject,
        p_description: values.description || null,
        p_category: values.category,
        p_priority: values.priority,
      })
      if (error) throw error
      await refresh()
      return data as string
    },
    [refresh],
  )

  const addComment = useCallback(
    async (ticketId: string, body: string) => {
      const { error } = await db.rpc('portal_add_comment', { p_ticket: ticketId, p_body: body })
      if (error) throw error
      await refresh()
    },
    [refresh],
  )

  const validate = useCallback(
    async (ticketId: string, approve: boolean) => {
      const { error } = await db.rpc('portal_validate', { p_ticket: ticketId, p_approve: approve })
      if (error) throw error
      await refresh()
    },
    [refresh],
  )

  return { tickets, loading, refresh, openTicket, addComment, validate }
}

export function usePortalComments(ticketId: string, dep?: string) {
  const { user } = useAuth()
  const [comments, setComments] = useState<TicketComment[]>([])

  const refresh = useCallback(async () => {
    if (!user || !ticketId) {
      setComments([])
      return
    }
    const { data } = await db
      .from('ticket_comments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
    setComments((data ?? []) as TicketComment[])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, user, dep])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { comments, refresh }
}
