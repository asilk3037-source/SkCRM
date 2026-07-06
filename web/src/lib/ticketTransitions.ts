import type { TicketStatus } from '../types/database'
import { isTerminalStatus } from './ticketMeta'

export type TicketActionKind = 'primary' | 'secondary' | 'success' | 'ghost' | 'ghost-danger'

export interface TicketAction {
  key: string
  label: string
  to: TicketStatus
  kind: TicketActionKind
  /** Side effect beyond the plain status update, handled by the caller (TicketDetail). */
  effect?: 'notifyResolved'
}

export interface TicketActionMessage {
  text: string
  tone: 'purple' | 'amber'
  icon?: boolean
}

export interface TicketActionGroups {
  /** Buttons specific to the current status. Each inner array is a visual cluster separated by a divider. */
  primaryGroups: TicketAction[][]
  /** A status message shown instead of, or alongside, the primary actions. */
  message: TicketActionMessage | null
  /** Always available while the ticket isn't terminal: aguardar cliente/fornecedor, cancelar. */
  waiting: TicketAction[]
}

/**
 * Pure description of which action buttons/messages apply to a ticket's current status.
 * Mirrors the flow: Analisar → Em andamento → Matriz de decisão/Aberto → Em andamento →
 * Teste → Aguardando validação (só o cliente conclui) — plus Backlog, Pendente com
 * cliente/fornecedor e Cancelado, disponíveis a qualquer momento enquanto ativo.
 */
export function getTicketActionGroups(status: TicketStatus, opts: { canResolveMatrix: boolean }): TicketActionGroups {
  let primaryGroups: TicketAction[][] = []
  let message: TicketActionMessage | null = null

  switch (status) {
    case 'analisar':
      primaryGroups = [[{ key: 'start_analysis', label: 'Iniciar análise', to: 'em_andamento', kind: 'primary' }]]
      break
    case 'aberto':
      primaryGroups = [[{ key: 'start_service', label: 'Iniciar atendimento', to: 'em_andamento', kind: 'primary' }]]
      break
    case 'em_andamento':
      primaryGroups = [
        [
          { key: 'to_matrix', label: 'Encaminhar para matriz de decisão', to: 'matriz_decisao', kind: 'secondary' },
          { key: 'to_technician', label: 'Encaminhar para técnico', to: 'aberto', kind: 'secondary' },
        ],
        [
          { key: 'to_test', label: 'Enviar para teste', to: 'teste', kind: 'primary' },
          { key: 'to_test_priority', label: 'Enviar para teste prioritário', to: 'teste_prioritario', kind: 'secondary' },
        ],
      ]
      break
    case 'matriz_decisao':
      if (opts.canResolveMatrix) {
        primaryGroups = [
          [
            { key: 'to_backlog', label: 'Enviar para Backlog (customização)', to: 'backlog', kind: 'primary' },
            { key: 'to_technician_from_matrix', label: 'Encaminhar para técnico', to: 'aberto', kind: 'secondary' },
          ],
        ]
      } else {
        message = { text: 'Aguardando decisão do supervisor', tone: 'purple' }
      }
      break
    case 'teste':
    case 'teste_prioritario':
      primaryGroups = [
        [
          {
            key: 'test_passed',
            label: 'Teste concluído — aguardar validação',
            to: 'aguardando_validacao',
            kind: 'success',
            effect: 'notifyResolved',
          },
          { key: 'test_failed', label: 'Reprovado no teste, voltar para atendimento', to: 'em_andamento', kind: 'secondary' },
        ],
      ]
      break
    case 'backlog':
      primaryGroups = [[{ key: 'backlog_to_service', label: 'Encaminhar para atendimento', to: 'aberto', kind: 'primary' }]]
      break
    case 'aguardando_validacao':
      primaryGroups = [[{ key: 'return_unresolved', label: 'Retornar (não resolvido)', to: 'em_andamento', kind: 'secondary' }]]
      message = { text: 'Aguardando o cliente confirmar a conclusão', tone: 'amber', icon: true }
      break
    case 'pendente_cliente':
    case 'pendente_fornecedor':
      primaryGroups = [[{ key: 'resume', label: 'Retomar atendimento', to: 'em_andamento', kind: 'secondary' }]]
      break
    case 'cancelado':
    case 'concluido':
      primaryGroups = [[{ key: 'reopen', label: 'Reabrir chamado', to: 'analisar', kind: 'secondary' }]]
      break
  }

  const waiting: TicketAction[] = []
  if (!isTerminalStatus(status)) {
    if (status !== 'pendente_cliente') {
      waiting.push({ key: 'wait_client', label: 'Aguardar cliente', to: 'pendente_cliente', kind: 'ghost' })
    }
    if (status !== 'pendente_fornecedor') {
      waiting.push({ key: 'wait_supplier', label: 'Aguardar fornecedor', to: 'pendente_fornecedor', kind: 'ghost' })
    }
    waiting.push({ key: 'cancel', label: 'Cancelar chamado', to: 'cancelado', kind: 'ghost-danger' })
  }

  return { primaryGroups, message, waiting }
}
