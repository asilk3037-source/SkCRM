# SkCRM — Diagnóstico técnico e roadmap para virar SaaS comercial

Criado em 05/07/2026, a partir de uma auditoria completa (arquitetura, segurança,
performance, testes, produto) pedida para avaliar o SkCRM como produto vendável
a dezenas/centenas de empresas — não só para uso interno da equipe. Achados
reais, extraídos do código e dos advisors do Supabase, não são recomendações
genéricas. Este documento é o ponto de retomada: o que já foi corrigido, o que
falta e em que ordem.

## Resumo executivo

| | |
| --- | --- |
| **Nota geral** | 7.2 / 10 (antes desta rodada de correções) |
| **Pronto para produção (uso único)** | Sim — já está no ar em produção |
| **Pronto para vender multi-tenant** | Ainda não |
| **Maturidade** | Produto validado, pré-comercial |

O produto já resolve o problema real (atendimento + CRM multiusuário com
portal do cliente, fluxo de 12 status de chamado, relatórios, TV Chamados,
importação CSV, PWA). O que falta não é funcionalidade — é o que separa
"funciona bem para uma equipe" de "posso vender e hospedar dezenas de empresas
com segurança".

## Achados reais (Supabase Advisor + inspeção de código)

### Segurança

- **16 funções `SECURITY DEFINER`** do schema `skcrm` (`handle_new_user`,
  `is_org_admin`, `portal_validate`, `process_invite`, etc.) são chamáveis via
  RPC por usuários anônimos e autenticados. Pendente: revisar função a função
  para confirmar que cada uma valida a organização do chamador internamente.
- **Proteção contra senha vazada desligada** no Supabase Auth (já anotado em
  `PENDENCIAS.md`).
- **Banco compartilhado** com 3 outros projetos pessoais (`trampo_certo`,
  `macrohelper`, `skmonitor`) na mesma instância — isola dados por schema, mas
  não isola plano, limites de recursos nem política de backup.

### Performance

- ~~**41 chaves estrangeiras sem índice** no schema `skcrm`~~ — **corrigido
  em 05/07/2026**, todos os 41 índices criados direto no banco de produção
  (ver `PENDENCIAS.md`).
- ~~**RLS reavalia função por linha** (7 policies em `profiles`, `orgs`,
  `org_members`, `tickets`)~~ — **corrigido em 06/07/2026**, `auth.uid()`
  trocado por `(select auth.uid())` nas 7 policies (`supabase/migrations/0002_rls_perf.sql`).
- ~~**Múltiplas policies permissivas** (24 casos em `contacts`, `tickets`,
  `ticket_attachments`, `ticket_comments`)~~ — **corrigido em 06/07/2026**,
  mescladas em uma única policy de SELECT por tabela (mesma migration).
  Confirmado via advisor de performance do Supabase: os dois alertas
  (`auth_rls_initplan`, `multiple_permissive_policies`) não aparecem mais
  para o schema `skcrm`.

### Arquitetura e qualidade

- Banco sem migrations versionadas no repositório — mudanças de schema
  aplicadas direto via SQL, sem revisão em PR nem reprodução local.
- ~~`TicketDetail.tsx` concentrava a regra dos 12 status dentro do componente
  de UI (725 linhas), sem teste~~ — **extraído em 05/07/2026** para
  `lib/ticketTransitions.ts`, com 18 testes.
- 7 páginas com tabela hand-rolled, sem componente compartilhado — 3 já
  padronizadas com ordenação de coluna (ver abaixo), 4 pendentes.

### Testes

Antes desta rodada: **zero** testes automatizados, zero CI. Depois: Vitest +
Testing Library instalados, **33 testes** passando, pipeline de CI no GitHub
Actions rodando lint + typecheck + testes em todo push/PR.

## O que foi implementado nesta rodada (commits, em ordem)

1. `205c1e3` — infraestrutura de testes (Vitest) + 13 testes (permissões,
   ordenação) + ordenação de coluna em Contatos.
2. `029dc9f` — Error Boundary global (antes, qualquer erro de render
   derrubava o app inteiro pra tela branca) + pipeline de CI.
3. `1410d01` — ordenação de coluna estendida para Empresas e Chamados.
4. `3b7c939` — documentação da criação dos 41 índices de FK (aplicados
   direto no banco de produção, fora do commit — não há migrations
   versionadas ainda).
5. `a6fe4ba` — extração da lógica de transição de status do chamado para
   `lib/ticketTransitions.ts` (18 testes), validada ao vivo com conta de
   teste descartável percorrendo os 9 status principais, sem regressão.

Total: **33 testes automatizados**, **0 → 41 índices de FK**, **1 Error
Boundary global**, **1 pipeline de CI**, **3 de 7 tabelas** com ordenação de
coluna, **1 refactor de risco alto** (status do chamado) validado ao vivo.

## O que ainda falta, priorizado

### v1.1 — fechar o que resta de risco silencioso
- [ ] Replicar ordenação de coluna em Detalhe da empresa (lista de contatos) e
  Portal do cliente. (Equipe e TV Chamados ficam de fora — baixo valor/n.a.)
- [ ] Revisar as 16 funções `SECURITY DEFINER` uma a uma.
- [x] Corrigir RLS initplan (`auth.uid()` por linha) e as policies
  permissivas duplicadas. *(06/07/2026)*
- [ ] Ativar proteção contra senha vazada no Supabase Auth (Dashboard →
  Authentication → Settings — passo manual de ~1 min).

### v1.2 — endurecer o que já existe
- [ ] Testes E2E dos fluxos críticos (login, CRUD, permissões por papel,
  portal do cliente) versionados no repo, não só ad-hoc.
- [ ] Monitoramento de erro de frontend (Sentry ou equivalente) — hoje um bug
  em produção só aparece se o usuário reclamar.
- [ ] Projeto Supabase dedicado (sair do banco compartilhado com outras apps).

### v2.0 — virar SaaS multi-tenant de verdade
- [ ] Permissões granulares configuráveis (esqueleto de tabelas já em
  `MIGRACAO_FUTURA.md`).
- [ ] Billing / planos e assinaturas.
- [ ] MFA e rate limit no login.
- [ ] SLA configurável por prioridade (depende de decisão de negócio — ver
  `DECISOES_PENDENTES.md`).
- [ ] Auditoria com IP/dispositivo (hoje `audit_log` não captura IP — precisa
  vir de uma edge function, não de trigger de banco).

### v3.0 — diferenciação competitiva
- [ ] Automações/macros, ações em lote, respostas rápidas/templates.
- [ ] Campos customizados por organização.
- [ ] API pública/webhooks, integração WhatsApp, white-label, multi-idioma.

## Funcionalidades premium classificadas

| Essencial | Importante | Diferencial | Premium |
| --- | --- | --- | --- |
| Billing/planos | Automações/macros | API pública/webhooks | Relatórios/BI avançado |
| MFA | Ações em lote | Integração WhatsApp | White-label |
| Permissões granulares | Respostas rápidas/templates | Campos customizados | Assinatura digital |
| SLA configurável | Histórico de login | Multi-idioma | Backup agendado |

## Decisões de negócio pendentes (não técnicas)

Já documentadas, sem mudança nesta rodada — ver:
- `DECISOES_PENDENTES.md` — arquivar vs. excluir empresa/contato, definição de
  SLA, permissões granulares.
- `MIGRACAO_FUTURA.md` — esqueleto de tabelas para perfis customizados.

## Como continuar

Pegue o primeiro item não marcado da lista v1.1 acima (ordem = prioridade por
risco corrigido, não por esforço). Cada item aqui pode virar um pedido direto
tipo "continua com [item]".
