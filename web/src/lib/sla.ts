import type { CompanySlaSetting, Ticket, TicketPriority } from '../types/database'
import type { Tone } from '../components/ui/Badge'

export interface SlaStatus {
  hoursLimit: number
  deadline: Date
  overdue: boolean
  /** Negative once the deadline has passed. */
  hoursRemaining: number
}

export function getSlaSetting(
  settings: CompanySlaSetting[],
  companyId: string | null,
  priority: TicketPriority,
): CompanySlaSetting | null {
  if (!companyId) return null
  return settings.find((s) => s.company_id === companyId && s.priority === priority) ?? null
}

/**
 * SLA sempre parte da abertura do chamado. Para chamados concluídos, a
 * referência é o momento em que foram finalizados (`resolved_at`, gravado
 * pelo trigger `set_ticket_resolved_at` no banco) — assim o indicador não
 * muda de "no prazo" pra "atrasado" depois que o chamado já foi encerrado.
 * Chamados cancelados não têm `resolved_at` (o trigger só grava esse campo
 * ao entrar em "aguardando_validacao"/"concluido") e SLA não faz sentido
 * pra um chamado que não chegou a ser resolvido, então não mostramos badge.
 */
export function getTicketSlaStatus(
  ticket: Ticket,
  companyId: string | null,
  settings: CompanySlaSetting[],
): SlaStatus | null {
  if (ticket.status === 'cancelado') return null
  const setting = getSlaSetting(settings, companyId, ticket.priority)
  if (!setting) return null
  const deadline = new Date(new Date(ticket.created_at).getTime() + setting.hours_limit * 3_600_000)
  const reference = ticket.status === 'concluido' ? new Date(ticket.resolved_at ?? ticket.updated_at) : new Date()
  const hoursRemaining = (deadline.getTime() - reference.getTime()) / 3_600_000
  return { hoursLimit: setting.hours_limit, deadline, overdue: hoursRemaining < 0, hoursRemaining }
}

export function formatSlaLabel(status: SlaStatus): string {
  const absHours = Math.abs(status.hoursRemaining)
  const unit = absHours >= 24 ? `${Math.round(absHours / 24)}d` : `${Math.round(absHours)}h`
  return status.overdue ? `Atrasado há ${unit}` : `Vence em ${unit}`
}

export function slaTone(status: SlaStatus): Tone {
  return status.overdue ? 'red' : 'emerald'
}
