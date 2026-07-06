/** Empresas/contatos arquivados não devem aparecer como opção em formulários de criação (chamado, contato, negociação). */
export function activeOnly<T extends { archived_at: string | null }>(items: T[]): T[] {
  return items.filter((item) => !item.archived_at)
}
