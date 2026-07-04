import { useCallback, useEffect, useState } from 'react'
import { db, supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { notify } from '../lib/notify'
import { isBlockedAttachment, MAX_COMMENT_LENGTH } from '../lib/validators'
import type { Ticket, TicketComment, TicketAttachment } from '../types/database'

const ATTACHMENTS_BUCKET = 'skcrm-attachments'
export const MAX_PORTAL_ATTACHMENT_BYTES = 40 * 1024 * 1024 // 40 MB, same limit as staff side

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
      notify('ticket_created', data as string)
      await refresh()
      return data as string
    },
    [refresh],
  )

  const addComment = useCallback(
    async (ticketId: string, body: string) => {
      if (body.length > MAX_COMMENT_LENGTH) {
        throw new Error(`Mensagem muito longa (limite de ${MAX_COMMENT_LENGTH} caracteres).`)
      }
      const { data, error } = await db.rpc('portal_add_comment', { p_ticket: ticketId, p_body: body })
      if (error) throw error
      if (data) notify('ticket_comment', data as string)
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

/**
 * Client-portal attachments. Reading uses the client_select RLS policy on
 * ticket_attachments; uploads register through portal_add_attachment
 * (security definer) instead of a direct INSERT grant.
 */
export function usePortalAttachments(ticketId: string) {
  const { user } = useAuth()
  const [attachments, setAttachments] = useState<TicketAttachment[]>([])
  const [uploading, setUploading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user || !ticketId) {
      setAttachments([])
      return
    }
    const { data } = await db
      .from('ticket_attachments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
    setAttachments((data ?? []) as TicketAttachment[])
  }, [ticketId, user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const upload = useCallback(
    async (file: File) => {
      if (!user) throw new Error('Not authenticated')
      if (file.size > MAX_PORTAL_ATTACHMENT_BYTES) {
        throw new Error('O arquivo excede o limite de 40 MB.')
      }
      if (isBlockedAttachment(file.name)) {
        throw new Error('Este tipo de arquivo não é permitido por segurança.')
      }
      setUploading(true)
      try {
        const path = `client/${ticketId}/${Date.now()}-${file.name}`
        const { error: uploadError } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, file)
        if (uploadError) throw uploadError
        const { error: rpcError } = await db.rpc('portal_add_attachment', {
          p_ticket: ticketId,
          p_file_name: file.name,
          p_storage_path: path,
          p_size_bytes: file.size,
        })
        if (rpcError) throw rpcError
        await refresh()
      } finally {
        setUploading(false)
      }
    },
    [ticketId, user, refresh],
  )

  const download = useCallback(async (attachment: TicketAttachment) => {
    const { data, error } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .createSignedUrl(attachment.storage_path, 60)
    if (error || !data) throw error ?? new Error('Não foi possível gerar o link')
    window.open(data.signedUrl, '_blank')
  }, [])

  return { attachments, uploading, upload, download }
}
