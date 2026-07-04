# SkCRM — Relatório de Próximos Passos

*03 de julho de 2026 · branch `claude/lightweight-crm-app-xjna1b`*

## Onde o projeto está

O SkCRM já é um app funcional: site (React + Supabase) e programa Windows
(Electron) apontando para o mesmo acesso, com o módulo de chamados seguindo
o modelo do SGN da Netview.

Pronto: login/cadastro · contatos · empresas · negociações (kanban) ·
tarefas · chamados com nº curto (#1001...) · caixas de gestão ·
encaminhamento por setor · interações externas/internas · anexos até 40 MB ·
fluxo de validação · painel de notificações · visual SGN · timeline do
chamado · filtros avançados · organizações/equipe com papéis admin×atendente
· portal do cliente (login próprio, abrir/responder/validar chamado) ·
relatórios (funil, tempo de resolução, produção por pessoa) · TV Chamados ·
importação de contatos via CSV · PWA instalável.

## Pendências imediatas

1. **Expor o schema `skcrm` na API do Supabase** *(bloqueia tudo)* —
   Dashboard → Settings → API → "Exposed schemas" → adicionar `skcrm`.
   Passo manual de ~2 minutos que o Supabase não permite automatizar.
   Sem ele o app não conversa com o banco (erro PGRST106).
2. **Publicar o site** *(bloqueia o desktop)* — Vercel/Netlify/Cloudflare
   Pages apontando para `web/`, com as variáveis do `.env.example`.
3. **Gerar e testar o instalador Windows** — `cd desktop && npm install &&
   npm start` para testar, `npm run build:win` para o `.exe`. Apontar para a
   URL publicada em Arquivo → Configurar servidor.
4. **Criar conta real e rodar o fluxo completo** — cadastro → contato →
   chamado → responder → resolver → validar e concluir.
5. **Higiene de segurança** — trocar a senha do SGN que circulou em chat;
   ativar proteção contra senhas vazadas no Supabase Auth.

## Roteiro por fases

### Fase 1 — Completar o dia a dia dos chamados ✅
Objetivo: operar 100% do suporte dentro do SkCRM.
- [x] Timeline do chamado (linha do tempo de mudanças de status, como no SGN)
- [ ] Notificação por e-mail ao abrir/atualizar chamado *(depende de provedor de e-mail — ver PENDENCIAS.md)*
- [x] Filtros avançados em "Outros chamados": intervalo de datas, tipo, setor
- [x] Anexos também em contatos e negociações

### Fase 2 — Equipe (multiusuário) ✅
Objetivo: mais de uma pessoa atendendo no mesmo CRM. Mudança estrutural
mais importante do projeto — melhor fazer cedo.
- [x] Organizações: dados compartilhados por equipe (migrar RLS de `owner_id`
  para organização)
- [x] Encaminhar para uma pessoa real (hoje "responsável" é texto livre)
- [x] "Chamados sob sua responsabilidade" por pessoa
- [x] Permissões: administrador × atendente

### Fase 3 — Portal do cliente ✅
Objetivo: o lado que o guia do SGN mostra — o cliente abre e acompanha os
próprios chamados.
- [x] Login do cliente com as caixas dele (responder, aguardando validação...)
- [x] Cliente abre chamado e valida a conclusão
- [x] Anexos do lado do cliente
- [ ] E-mail que vira chamado automaticamente *(fica pra depois — canal alternativo do SGN, baixa prioridade)*

### Fase 4 — Crescimento e relatórios
- [x] Relatórios: funil de vendas, tempo de resolução, produção por pessoa, chamados ativos por prioridade
- [x] TV Chamados (telão de acompanhamento, atualiza sozinho a cada 30s)
- [x] Importação de contatos via CSV (com preview antes de confirmar)
- [x] PWA instalável no celular (ícone, tela cheia, abre offline a última tela vista)
- [ ] Integração WhatsApp *(precisa de decisão: WhatsApp Business API tem custo e homologação — ver PENDENCIAS.md)*

## Ordem sugerida

| Item | Esforço | Quando | Depende de |
| --- | --- | --- | --- |
| Expor schema + publicar site + testar .exe | P | agora | — |
| Timeline + notificações por e-mail | M | agora | site publicado |
| Filtros avançados e anexos gerais | P | em breve | — |
| Multiusuário (organizações) | G | em breve | fluxo validado |
| Portal do cliente | G | depois | multiusuário |
| Relatórios, TV, CSV, WhatsApp, PWA | M–G | depois | uso real |

*Esforço: P = até 1 dia · M = alguns dias · G = uma semana ou mais.*

## Riscos e pontos de cuidado

- **Banco compartilhado com o projeto "Tarefas"** — o schema `skcrm` é
  isolado, mas divide plano/limites/backups. Migrar para projeto dedicado
  quando virar produção séria (simples enquanto há pouco dado).
- **Multiusuário muda a fundação** — a troca de `owner_id` por organização
  toca todas as tabelas e políticas; fazer cedo, antes de acumular volume.
- **Backups** — confirmar a política do plano atual do Supabase antes de
  colocar dados de clientes reais.
