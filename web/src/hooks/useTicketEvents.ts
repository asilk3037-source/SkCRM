import { useCallback, useEffect, useState } from 'react'
import { db } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { TicketEvent } from '../types/database'

/** `dep` re-fetches the timeline whenever it changes (e.g. ticket.updated_at). */
export function useTicketEvents(ticketId: string, dep?: string) {
  const { user } = useAuth()
  const [events, setEvents] = useState<TicketEvent[]>([])

  const refresh = useCallback(async () => {
    if (!user) {
      setEvents([])
      return
    }
    const { data } = await db
      .from('ticket_events')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
    setEvents((data ?? []) as TicketEvent[])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, user, dep])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { events, refresh }
}
