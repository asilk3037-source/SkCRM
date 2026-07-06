import { describe, expect, it } from 'vitest'
import { getTicketActionGroups } from './ticketTransitions'
import type { TicketStatus } from '../types/database'

function keysOf(groups: ReturnType<typeof getTicketActionGroups>) {
  return groups.primaryGroups.flat().map((a) => a.key)
}

describe('getTicketActionGroups', () => {
  it('analisar: only "iniciar análise" -> em_andamento', () => {
    const g = getTicketActionGroups('analisar', { canResolveMatrix: false })
    expect(keysOf(g)).toEqual(['start_analysis'])
    expect(g.primaryGroups[0][0].to).toBe('em_andamento')
    expect(g.message).toBeNull()
  })

  it('aberto: only "iniciar atendimento" -> em_andamento', () => {
    const g = getTicketActionGroups('aberto', { canResolveMatrix: false })
    expect(keysOf(g)).toEqual(['start_service'])
    expect(g.primaryGroups[0][0].to).toBe('em_andamento')
  })

  it('em_andamento: two groups — encaminhar (matriz/técnico) and enviar para teste (normal/prioritário)', () => {
    const g = getTicketActionGroups('em_andamento', { canResolveMatrix: false })
    expect(g.primaryGroups).toHaveLength(2)
    expect(g.primaryGroups[0].map((a) => a.key)).toEqual(['to_matrix', 'to_technician'])
    expect(g.primaryGroups[0].map((a) => a.to)).toEqual(['matriz_decisao', 'aberto'])
    expect(g.primaryGroups[1].map((a) => a.key)).toEqual(['to_test', 'to_test_priority'])
    expect(g.primaryGroups[1].map((a) => a.to)).toEqual(['teste', 'teste_prioritario'])
  })

  it('matriz_decisao: supervisor/admin sees backlog + encaminhar técnico', () => {
    const g = getTicketActionGroups('matriz_decisao', { canResolveMatrix: true })
    expect(keysOf(g)).toEqual(['to_backlog', 'to_technician_from_matrix'])
    expect(g.primaryGroups[0].map((a) => a.to)).toEqual(['backlog', 'aberto'])
    expect(g.message).toBeNull()
  })

  it('matriz_decisao: suporte (sem permissão) só vê a mensagem de espera, nenhuma ação', () => {
    const g = getTicketActionGroups('matriz_decisao', { canResolveMatrix: false })
    expect(g.primaryGroups).toEqual([])
    expect(g.message).toEqual({ text: 'Aguardando decisão do supervisor', tone: 'purple' })
  })

  it.each(['teste', 'teste_prioritario'] as TicketStatus[])('%s: teste concluído (com efeito notifyResolved) e reprovado', (status) => {
    const g = getTicketActionGroups(status, { canResolveMatrix: false })
    expect(keysOf(g)).toEqual(['test_passed', 'test_failed'])
    const passed = g.primaryGroups[0][0]
    expect(passed.to).toBe('aguardando_validacao')
    expect(passed.effect).toBe('notifyResolved')
    const failed = g.primaryGroups[0][1]
    expect(failed.to).toBe('em_andamento')
    expect(failed.effect).toBeUndefined()
  })

  it('backlog: só "encaminhar para atendimento" -> aberto', () => {
    const g = getTicketActionGroups('backlog', { canResolveMatrix: false })
    expect(keysOf(g)).toEqual(['backlog_to_service'])
    expect(g.primaryGroups[0][0].to).toBe('aberto')
  })

  it('aguardando_validacao: mensagem de espera do cliente + ação de retornar não resolvido', () => {
    const g = getTicketActionGroups('aguardando_validacao', { canResolveMatrix: false })
    expect(keysOf(g)).toEqual(['return_unresolved'])
    expect(g.primaryGroups[0][0].to).toBe('em_andamento')
    expect(g.message).toEqual({ text: 'Aguardando o cliente confirmar a conclusão', tone: 'amber', icon: true })
  })

  it.each(['pendente_cliente', 'pendente_fornecedor'] as TicketStatus[])('%s: só "retomar atendimento" -> em_andamento', (status) => {
    const g = getTicketActionGroups(status, { canResolveMatrix: false })
    expect(keysOf(g)).toEqual(['resume'])
    expect(g.primaryGroups[0][0].to).toBe('em_andamento')
  })

  it.each(['cancelado', 'concluido'] as TicketStatus[])('%s: só "reabrir chamado" -> analisar', (status) => {
    const g = getTicketActionGroups(status, { canResolveMatrix: false })
    expect(keysOf(g)).toEqual(['reopen'])
    expect(g.primaryGroups[0][0].to).toBe('analisar')
  })

  describe('waiting actions (aguardar cliente/fornecedor, cancelar)', () => {
    it('aparecem para qualquer status não-terminal, exceto o que já é o próprio estado', () => {
      const g = getTicketActionGroups('em_andamento', { canResolveMatrix: false })
      expect(g.waiting.map((a) => a.key)).toEqual(['wait_client', 'wait_supplier', 'cancel'])
    })

    it('omite "aguardar cliente" quando o chamado já está pendente_cliente', () => {
      const g = getTicketActionGroups('pendente_cliente', { canResolveMatrix: false })
      expect(g.waiting.map((a) => a.key)).toEqual(['wait_supplier', 'cancel'])
    })

    it('omite "aguardar fornecedor" quando o chamado já está pendente_fornecedor', () => {
      const g = getTicketActionGroups('pendente_fornecedor', { canResolveMatrix: false })
      expect(g.waiting.map((a) => a.key)).toEqual(['wait_client', 'cancel'])
    })

    it.each(['cancelado', 'concluido'] as TicketStatus[])('não aparecem em status terminal (%s)', (status) => {
      const g = getTicketActionGroups(status, { canResolveMatrix: false })
      expect(g.waiting).toEqual([])
    })
  })
})
