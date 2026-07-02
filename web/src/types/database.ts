export interface Company {
  id: string
  owner_id: string
  name: string
  website: string | null
  phone: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  owner_id: string
  company_id: string | null
  name: string
  email: string | null
  phone: string | null
  job_title: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PipelineStage {
  id: string
  owner_id: string
  name: string
  position: number
  created_at: string
}

export type DealStatus = 'open' | 'won' | 'lost'

export interface Deal {
  id: string
  owner_id: string
  title: string
  contact_id: string | null
  company_id: string | null
  stage_id: string | null
  value: number
  status: DealStatus
  expected_close_date: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  owner_id: string
  title: string
  description: string | null
  due_date: string | null
  done: boolean
  contact_id: string | null
  deal_id: string | null
  created_at: string
  updated_at: string
}

export type TicketStatus = 'aberto' | 'em_andamento' | 'aguardando_cliente' | 'resolvido' | 'fechado'
export type TicketPriority = 'baixa' | 'media' | 'alta' | 'urgente'
export type TicketCategory = 'suporte' | 'erro_sistema' | 'melhoria' | 'duvida' | 'outro'

export interface Ticket {
  id: string
  owner_id: string
  number: number
  contact_id: string | null
  company_id: string | null
  subject: string
  description: string | null
  status: TicketStatus
  priority: TicketPriority
  category: TicketCategory
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export interface TicketComment {
  id: string
  owner_id: string
  ticket_id: string
  body: string
  created_at: string
}
