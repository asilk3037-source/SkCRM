import { useCallback, useEffect, useState } from 'react'
import { db, supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { TicketAttachment } from '../types/database'

const BUCKET = 'skcrm-attachments'
export const MAX_ATTACHMENT_BYTES = 40 * 1024 * 1024 // 40 MB, like SGN

export function useTicketAttachments(ticketId: string) {
  const { user } = useAuth()
  const [attachments, setAttachments] = useState<TicketAttachment[]>([])
  const [uploading, setUploading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) {
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
      if (file.size > MAX_ATTACHMENT_BYTES) {
        throw new Error('O arquivo excede o limite de 40 MB.')
      }
      setUploading(true)
      try {
        const path = `${user.id}/${ticketId}/${Date.now()}-${file.name}`
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file)
        if (uploadError) throw uploadError
        const { error: insertError } = await db.from('ticket_attachments').insert({
          ticket_id: ticketId,
          owner_id: user.id,
          file_name: file.name,
          storage_path: path,
          size_bytes: file.size,
        } as never)
        if (insertError) throw insertError
        await refresh()
      } finally {
        setUploading(false)
      }
    },
    [ticketId, user, refresh],
  )

  const download = useCallback(async (attachment: TicketAttachment) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(attachment.storage_path, 60)
    if (error || !data) throw error ?? new Error('Não foi possível gerar o link')
    window.open(data.signedUrl, '_blank')
  }, [])

  const remove = useCallback(
    async (attachment: TicketAttachment) => {
      await supabase.storage.from(BUCKET).remove([attachment.storage_path])
      const { error } = await db.from('ticket_attachments').delete().eq('id', attachment.id)
      if (error) throw error
      await refresh()
    },
    [refresh],
  )

  return { attachments, uploading, upload, download, remove }
}
