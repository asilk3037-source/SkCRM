import type { Company, CompanyMember, Contact, Deal, Ticket } from '../types/database'
import { isTerminalStatus } from './ticketMeta'

/** Vínculos ativos que fazem sentido resolver antes de excluir de vez — ver docs/DECISOES_PENDENTES.md item 1. */
export function companyHasActiveLinks(
  company: Company,
  contacts: Contact[],
  tickets: Ticket[],
  deals: Deal[],
  members: CompanyMember[],
): boolean {
  const companyContactIds = new Set(contacts.filter((c) => c.company_id === company.id).map((c) => c.id))
  const openTicket = tickets.some(
    (t) => (t.company_id === company.id || (t.contact_id && companyContactIds.has(t.contact_id))) && !isTerminalStatus(t.status),
  )
  const openDeal = deals.some(
    (d) => (d.company_id === company.id || (d.contact_id && companyContactIds.has(d.contact_id))) && d.status === 'open',
  )
  const activeMember = members.some((m) => m.company_id === company.id && m.active)
  return openTicket || openDeal || activeMember
}

/** Mesma ideia do item 2 de docs/DECISOES_PENDENTES.md, mas para contatos. */
export function contactHasActiveLinks(contact: Contact, tickets: Ticket[], deals: Deal[]): boolean {
  const openTicket = tickets.some((t) => t.contact_id === contact.id && !isTerminalStatus(t.status))
  const openDeal = deals.some((d) => d.contact_id === contact.id && d.status === 'open')
  return openTicket || openDeal
}
