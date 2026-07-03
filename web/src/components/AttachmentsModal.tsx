import { useRef, useState } from 'react'
import { useRecordAttachments } from '../hooks/useRecordAttachments'
import { formatBytes } from '../lib/ticketMeta'

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-900">Anexos — {title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>
        {error && <p className="border-b border-red-100 bg-red-50 px-5 py-2 text-sm text-red-700">{error}</p>}
        {attachments.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-400">Nenhum arquivo anexado — limite de 40 MB por arquivo.</p>
        ) : (
          <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
            {attachments.map((att) => (
              <li key={att.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span className="text-slate-400">📎</span>
                <button onClick={() => download(att)} className="font-medium text-orange-600 hover:underline">
                  {att.file_name}
                </button>
                <span className="text-xs text-slate-400">{formatBytes(att.size_bytes)}</span>
                <button
                  onClick={() => remove(att)}
                  className="ml-auto text-xs text-red-500 hover:text-red-700"
                >
                  Excluir
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {uploading ? 'Enviando...' : '📎 Anexar arquivo'}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
        </div>
      </div>
    </div>
  )
}
