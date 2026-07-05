# Migração futura — o que ainda depende de decisão sua

Atualizado em 05/07/2026. As seções já implementadas (usuários por empresa, RLS de
exclusão/conclusão, auditoria persistida, os 11 status de chamado) saíram deste
documento — o código e as migrações já estão em produção. O que resta aqui é só
o que **ainda não foi feito**, porque envolve uma decisão de negócio que só
você pode tomar (não é uma questão técnica).

---

## Permissões granulares configuráveis + perfis customizados

**Pedido:** telas de permissão por módulo (visualizar/inserir/editar/excluir/exportar/importar/aprovar/
cancelar/administrar), perfis configuráveis (Administrador, Supervisor, Coordenador, Analista,
Atendente, Cliente, perfil personalizado), permissões por usuário sobrescrevendo o perfil.

**O que existe hoje:** `org_members.role` continua um enum fixo de 3 valores (`admin`, `supervisor`,
`suporte`). A matriz de permissões do frontend (`web/src/lib/permissions.ts`) é hard-coded no
código — não é editável pela equipe, e não tem override por usuário.

**Por que ainda depende de você:** perfis configuráveis e overrides por usuário exigem uma tela de
administração nova (quem pode criar perfil, o que cada permissão realmente significa em cada tela)
— isso é uma decisão de produto, não só uma migração de banco. O esqueleto de tabelas seria:

```sql
create table skcrm.roles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references skcrm.orgs(id) on delete cascade,
  name text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table skcrm.permissions (
  id uuid primary key default gen_random_uuid(),
  screen text not null,
  action text not null,
  unique (screen, action)
);

create table skcrm.role_permissions (
  role_id uuid not null references skcrm.roles(id) on delete cascade,
  permission_id uuid not null references skcrm.permissions(id) on delete cascade,
  allowed boolean not null default true,
  primary key (role_id, permission_id)
);

create table skcrm.user_permission_overrides (
  org_id uuid not null references skcrm.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  permission_id uuid not null references skcrm.permissions(id) on delete cascade,
  allowed boolean not null,
  primary key (org_id, user_id, permission_id)
);
```

Avise quando quiser seguir com isso — dá para migrar os 3 papéis atuais para linhas em `roles` sem
quebrar nada (a matriz atual vira o dado inicial de `role_permissions`).

---

## O que já foi implementado (histórico)

Para referência — já em produção, não precisa de nenhuma ação sua:

- **Usuários por empresa**: tabela `skcrm.company_members`, edge function `manage-company-user`
  (criar/editar/resetar senha/ativar-inativar/excluir, com último acesso via Admin API), painel em
  `/empresas/:id`.
- **RLS de exclusão por papel**: `contacts`, `companies`, `deals`, `tasks` só permitem exclusão para
  `admin`/`supervisor` (chamados já tinham essa regra desde antes).
- **Conclusão de chamado só pelo cliente**: trigger `tickets_prevent_direct_close` bloqueia
  qualquer `UPDATE status = 'concluido'` que não venha de `portal_validate`.
- **Auditoria persistida**: tabela `skcrm.audit_log`, populada por trigger em `tickets`, `contacts`,
  `companies`, `deals` e `company_members`. IP não é capturado — não há como ler o IP do cliente a
  partir de um trigger de banco.
- **Novo fluxo de status dos chamados (12 status)**: Analisar → Em andamento (análise) →
  Matriz de decisão (supervisor) ou Aberto (direto para um técnico) → Em andamento (atendimento) →
  Teste/Teste prioritário → Aguardando validação → Concluído (só o cliente confirma). Mais Backlog
  (customização, só admin/supervisor decide), Pendente com cliente, Pendente com fornecedor e
  Cancelado, disponíveis a qualquer momento enquanto o chamado está ativo. Categoria "Customização"
  adicionada para sustentar a regra do Backlog. A tela de Chamados tem uma caixa dedicada "Matriz de
  decisão" para o supervisor ver o que está esperando decisão dele.
