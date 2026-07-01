import { useSupabaseTable } from './useSupabaseTable'
import type { Deal, PipelineStage } from '../types/database'

export function usePipelineStages() {
  return useSupabaseTable<PipelineStage>('pipeline_stages', 'position')
}

export function useDeals() {
  return useSupabaseTable<Deal>('deals')
}
