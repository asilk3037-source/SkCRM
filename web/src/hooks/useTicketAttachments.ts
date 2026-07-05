import { useAttachments, MAX_ATTACHMENT_BYTES } from './useAttachments'
import type { TicketAttachment } from '../types/database'

export { MAX_ATTACHMENT_BYTES }

export function useTicketAttachments(ticketId: string) {
  return useAttachments<TicketAttachment>('ticket_attachments', 'ticket_id', ticketId, ticketId)
}
