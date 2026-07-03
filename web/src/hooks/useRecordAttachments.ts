import { useCallback, useEffect, useState } from 'react'
import { db, supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'
import { MAX_ATTACHMENT_BYTES } from './useTicketAttachments'
import type { RecordAttachment } from '../types/database'

const BUCKET = 'skcrm-attachments'

/** Attachments linked to a contact or a deal, sharing the tickets bucket. */
export function useRecordAttachments(kind: 'contact' | 'deal', recordId: string) {
  const { user } = useAuth()
  const { org } = useOrg()
  const [attachments, setAttachments] = useState<RecordAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const column = kind === 'contact' ? 'contact_id' : 'deal_id'

  const refresh = useCallback(async () => {
    if (!user || !recordId) {
      setAttachments([])
      return
    }
    const { data } = await db
      .from('record_attachments')
      .select('*')
      .eq(column, recordId)
      .order('created_at', { ascending: true })
    setAttachments((data ?? []) as RecordAttachment[])
  }, [column, recordId, user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const upload = useCallback(
    async (file: File) => {
      if (!user) throw new Error('Not authenticated')
      if (!org) throw new Error('Nenhuma organização ativa')
      if (file.size > MAX_ATTACHMENT_BYTES) throw new Error('O arquivo excede o limite de 40 MB.')
      setUploading(true)
      try {
        const path = `${org.id}/${kind}-${recordId}/${Date.now()}-${file.name}`
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file)
        if (uploadError) throw uploadError
        const { error: insertError } = await db.from('record_attachments').insert({
          owner_id: user.id,
          org_id: org.id,
          [column]: recordId,
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
    [column, kind, recordId, user, org, refresh],
  )

  const download = useCallback(async (attachment: RecordAttachment) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(attachment.storage_path, 60)
    if (error || !data) throw error ?? new Error('Não foi possível gerar o link')
    window.open(data.signedUrl, '_blank')
  }, [])

  const remove = useCallback(
    async (attachment: RecordAttachment) => {
      await supabase.storage.from(BUCKET).remove([attachment.storage_path])
      const { error } = await db.from('record_attachments').delete().eq('id', attachment.id)
      if (error) throw error
      await refresh()
    },
    [refresh],
  )

  return { attachments, uploading, upload, download, remove }
}
