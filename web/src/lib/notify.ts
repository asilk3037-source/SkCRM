import { supabase } from './supabaseClient'

type NotifyEvent = 'ticket_created' | 'ticket_comment' | 'ticket_resolved' | 'org_invite'

/** Fires the send-email edge function in the background; never blocks or throws on the caller. */
export function notify(event: NotifyEvent, id: string) {
  supabase.functions.invoke('send-email', { body: { event, id } }).catch(() => {
    // notificação por e-mail é best-effort — falha aqui não deve travar o fluxo do usuário
  })
}
