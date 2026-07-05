import { useCallback, useEffect, useState } from 'react'
import { db, supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'
import { isBlockedAttachment } from '../lib/validators'

const BUCKET = 'skcrm-attachments'
export const MAX_ATTACHMENT_BYTES = 40 * 1024 * 1024 // 40 MB, like SGN

interface AttachmentRow {
  id: string
  file_name: string
  storage_path: string
  size_bytes: number
  created_at: string
}

/**
 * Shared upload/list/download/delete logic for both ticket attachments and
 * contact/deal ("record") attachments — the two only differ in table name,
 * filter column and storage path prefix.
 */
export function useAttachments<T extends AttachmentRow>(table: string, column: string, recordId: string, pathSegment: string) {
  const { user } = useAuth()
  const { org } = useOrg()
  const [attachments, setAttachments] = useState<T[]>([])
  const [uploading, setUploading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user || !recordId) {
      setAttachments([])
      return
    }
    const { data } = await db
      .from(table)
      .select('*')
      .eq(column, recordId)
      .order('created_at', { ascending: true })
    setAttachments((data ?? []) as T[])
  }, [table, column, recordId, user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const upload = useCallback(
    async (file: File) => {
      if (!user) throw new Error('Not authenticated')
      if (!org) throw new Error('Nenhuma organização ativa')
      if (file.size > MAX_ATTACHMENT_BYTES) throw new Error('O arquivo excede o limite de 40 MB.')
      if (isBlockedAttachment(file.name)) throw new Error('Este tipo de arquivo não é permitido por segurança.')
      setUploading(true)
      try {
        const path = `${org.id}/${pathSegment}/${Date.now()}-${file.name}`
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file)
        if (uploadError) throw uploadError
        const { data: row, error: insertError } = await db
          .from(table)
          .insert({
            owner_id: user.id,
            org_id: org.id,
            [column]: recordId,
            file_name: file.name,
            storage_path: path,
            size_bytes: file.size,
          } as never)
          .select()
          .single()
        if (insertError) throw insertError
        setAttachments((prev) => [...prev, row as T])
      } finally {
        setUploading(false)
      }
    },
    [table, column, recordId, pathSegment, user, org],
  )

  const download = useCallback(async (attachment: T) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(attachment.storage_path, 60)
    if (error || !data) throw error ?? new Error('Não foi possível gerar o link')
    window.open(data.signedUrl, '_blank')
  }, [])

  const remove = useCallback(
    async (attachment: T) => {
      await supabase.storage.from(BUCKET).remove([attachment.storage_path])
      const { error } = await db.from(table).delete().eq('id', attachment.id)
      if (error) throw error
      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id))
    },
    [table],
  )

  return { attachments, uploading, upload, download, remove, refresh }
}
