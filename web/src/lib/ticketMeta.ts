import type { TicketPriority, TicketStatus } from '../types/database'

export const STATUS_LABEL: Record<TicketStatus, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  aguardando_cliente: 'Aguardando cliente',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
}

export const STATUS_COLOR: Record<TicketStatus, string> = {
  aberto: 'bg-blue-100 text-blue-700',
  em_andamento: 'bg-amber-100 text-amber-700',
  aguardando_cliente: 'bg-purple-100 text-purple-700',
  resolvido: 'bg-emerald-100 text-emerald-700',
  fechado: 'bg-slate-200 text-slate-600',
}

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
}

export const PRIORITY_COLOR: Record<TicketPriority, string> = {
  baixa: 'bg-slate-100 text-slate-600',
  media: 'bg-blue-100 text-blue-700',
  alta: 'bg-orange-100 text-orange-700',
  urgente: 'bg-red-100 text-red-700',
}
