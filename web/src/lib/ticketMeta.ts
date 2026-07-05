import type { TicketCategory, TicketPriority, TicketSector, TicketStatus } from '../types/database'
import type { Tone } from '../components/ui/Badge'

export const STATUS_LABEL: Record<TicketStatus, string> = {
  analisar: 'Analisar',
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  matriz_decisao: 'Matriz de decisão',
  teste: 'Teste',
  teste_prioritario: 'Teste prioritário',
  backlog: 'Backlog',
  aguardando_validacao: 'Aguardando validação',
  pendente_cliente: 'Pendente com cliente',
  pendente_fornecedor: 'Pendente com fornecedor',
  cancelado: 'Cancelado',
  concluido: 'Concluído',
}

export const STATUS_TONE: Record<TicketStatus, Tone> = {
  analisar: 'purple',
  aberto: 'blue',
  em_andamento: 'amber',
  matriz_decisao: 'purple',
  teste: 'orange',
  teste_prioritario: 'red',
  backlog: 'slate',
  aguardando_validacao: 'emerald',
  pendente_cliente: 'blue',
  pendente_fornecedor: 'blue',
  cancelado: 'red',
  concluido: 'slate',
}

/** Status finais — um chamado nesses estados não conta como "ativo" em filas/indicadores. */
export const TERMINAL_STATUSES: TicketStatus[] = ['concluido', 'cancelado']

export function isTerminalStatus(status: TicketStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
}

export const PRIORITY_TONE: Record<TicketPriority, Tone> = {
  baixa: 'slate',
  media: 'blue',
  alta: 'orange',
  urgente: 'red',
}

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  suporte: 'Suporte',
  erro_sistema: 'Erro de sistema',
  melhoria: 'Melhoria',
  duvida: 'Dúvida',
  customizacao: 'Customização',
  outro: 'Outro',
}

export const SECTOR_LABEL: Record<TicketSector, string> = {
  suporte: 'Suporte',
  comercial: 'Comercial',
  desenvolvimento: 'Desenvolvimento',
  financeiro: 'Financeiro',
  administrativo: 'Administrativo',
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
