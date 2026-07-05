import { useAttachments } from './useAttachments'
import type { RecordAttachment } from '../types/database'

/** Attachments linked to a contact or a deal, sharing the tickets bucket. */
export function useRecordAttachments(kind: 'contact' | 'deal', recordId: string) {
  const column = kind === 'contact' ? 'contact_id' : 'deal_id'
  return useAttachments<RecordAttachment>('record_attachments', column, recordId, `${kind}-${recordId}`)
}
