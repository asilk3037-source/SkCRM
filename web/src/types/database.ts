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
