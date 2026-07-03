import { useSupabaseTable } from './useSupabaseTable'
import type { Ticket } from '../types/database'

export function useTickets() {
  return useSupabaseTable<Ticket>('tickets')
}
