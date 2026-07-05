import { useRef, useState } from 'react'
import { useRecordAttachments } from '../hooks/useRecordAttachments'
import { useConfirm } from './ConfirmDialog'
import { formatBytes } from '../lib/ticketMeta'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Alert } from './ui/Alert'
import { EmptyState } from './ui/EmptyState'
import { IconPaperclip } from './ui/icons'

export function AttachmentsModal({
  kind,
  recordId,
  title,
  onClose,
}: {
  kind: 'contact' | 'deal'
  recordId: string
  title: string
  onClose: () => void
}) {
  const { attachments, uploading, upload, download, remove } = useRecordAttachments(kind, recordId)
  const confirm = useConfirm()
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(file: File | undefined) {
    if (!file) return
    setError(null)
    try {
      await upload(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar o arquivo')
    }
  }

  async function handleRemove(att: (typeof attachments)[number]) {
    if (await confirm({ description: `Excluir o anexo "${att.file_name}"?` })) remove(att)
  }

  return (
    <Modal
      title={`Anexos — ${title}`}
      onClose={onClose}
      footer={
        <>
          <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
          <Button disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            <IconPaperclip className="h-4 w-4" /> {uploading ? 'Enviando...' : 'Anexar arquivo'}
          </Button>
        </>
      }
    >
      {error && (
        <div className="px-5 pt-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      {attachments.length === 0 ? (
        <EmptyState
          icon={<IconPaperclip className="h-5 w-5" />}
          title="Nenhum arquivo anexado"
          hint="Limite de 40 MB por arquivo."
        />
      ) : (
        <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
          {attachments.map((att) => (
            <li key={att.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
              <IconPaperclip className="h-4 w-4 flex-shrink-0 text-slate-400" />
              <button onClick={() => download(att)} className="truncate font-medium text-orange-600 hover:underline">
                {att.file_name}
              </button>
              <span className="flex-shrink-0 text-xs tabular-nums text-slate-400">{formatBytes(att.size_bytes)}</span>
              <Button variant="danger" size="xs" className="ml-auto flex-shrink-0" onClick={() => handleRemove(att)}>
                Excluir
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
