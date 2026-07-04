# SkCRM — Pendências

Documento vivo: tudo que depende de uma ação ou decisão da Aline para o
projeto avançar. Vou atualizando conforme o desenvolvimento anda.
(Roteiro completo em [ROADMAP.md](./ROADMAP.md).)

## Bloqueiam o uso real

- [x] **Expor o schema `skcrm` na API do Supabase** *(04/07/2026)*
- [x] **Publicar o site** *(04/07/2026)* — no ar em
  [sk-crm-six.vercel.app](https://sk-crm-six.vercel.app), publicado via
  Vercel com integração automática ao GitHub (todo push na `main` gera
  um novo deploy).
- [ ] **Gerar e testar o instalador Windows** — na sua máquina:
  `cd desktop && npm install && npm start` (testar) e `npm run build:win`
  (gerar o `.exe`). Depois apontar para a URL publicada acima em
  Arquivo → Configurar servidor. *A sandbox de desenvolvimento não baixa o
  Electron, então esse teste é seu.*
- [x] **Criar sua conta real e validar login** *(04/07/2026)* — falta só
  rodar o fluxo completo (contato → chamado → responder → resolver →
  validar e concluir) pra ter certeza de ponta a ponta.

## Decisões que estão travando funcionalidades

- [x] **Provedor de e-mail para notificações** *(04/07/2026)* — configurado
  com Resend. E-mail automático já funciona para: abertura de chamado,
  nova interação (staff ↔ cliente) e convite de equipe. **Limitação
  atual**: sem domínio próprio verificado no Resend, o remetente é
  `onboarding@resend.dev` e o Resend só entrega pro e-mail dono da conta
  (o seu). Pra notificar clientes/equipe de verdade, verifique um domínio
  seu no [painel do Resend](https://resend.com/domains) e me avise pra eu
  trocar o remetente.
- [ ] **Integração WhatsApp** (Fase 4) — precisa de uma decisão de
  fornecedor antes de eu poder implementar: a API oficial do WhatsApp
  Business exige homologação com a Meta e normalmente passa por um
  parceiro (Twilio, Z-API, 360dialog etc.), o que tem custo mensal. Se
  quiser seguir com isso, me diga qual fornecedor prefere usar.

## Segurança / higiene

- [ ] **Trocar a senha do SGN** que foi compartilhada no chat
  (`SUPORTE.ALINE`) — mensagens de chat ficam em histórico.
- [ ] **Ativar proteção contra senhas vazadas** no Supabase Auth —
  Dashboard → Authentication → Settings (aviso do próprio Supabase,
  hoje desligado).
- [ ] **Confirmar política de backup** do plano atual do Supabase antes de
  colocar dados de clientes reais.

## Avisos técnicos (sem ação imediata, mas bom saber)

- **Multiusuário (Fase 2) mudou as regras de acesso**: os dados agora
  pertencem à *organização* (equipe), não mais ao usuário individual.
  Cada conta existente virou uma organização própria na migração. Convites:
  Equipe → "Convidar por e-mail"; quem já tem conta entra na hora, quem não
  tem entra ao se cadastrar com o e-mail convidado.
- **Convite já envia e-mail** *(04/07/2026)* — sujeito à limitação do
  Resend acima (só chega em caixas verificadas até você configurar um
  domínio próprio).
- **Banco compartilhado com o projeto "Tarefas"** — considerar projeto
  Supabase dedicado quando o CRM virar produção séria (migração simples
  enquanto há pouco dado).
- **Portal do cliente (Fase 3) não convida automaticamente** — hoje, um
  contato só vira cliente do portal se o e-mail dele já existir em
  `contacts` *antes* de criar a conta. Cadastrar um contato → avisar a
  pessoa (por fora) que já pode criar conta no SkCRM com esse e-mail.
- **Anexos do portal do cliente**: o cliente agora anexa arquivos direto
  no próprio chamado (mesmo limite de 40 MB da equipe). Só a equipe pode
  excluir anexos — o cliente só anexa e baixa.
- **CSV de importação de contatos** (Fase 4) — reconhece automaticamente
  colunas chamadas `nome`/`name`, `email`, `telefone`/`phone`,
  `cargo`/`job_title` e `empresa`/`company` (em qualquer ordem). Nomes de
  empresa que não existirem ainda são criados na hora.
- **TV Chamados** (`/tv`, Fase 4) — pensada pra abrir numa TV/monitor da
  sala, atualiza sozinha a cada 30s. Ainda exige login (não é uma tela
  pública) — se quiser deixá-la sem exigir login toda vez, me avise que
  eu vejo uma forma de manter a sessão mais longa nessa tela.

## Concluído (histórico)

- [x] Fase 1 — timeline do chamado, filtros avançados, anexos em
  contatos/negociações *(03/07/2026)*
- [x] Fase 2 — organizações/equipe, convites, papéis admin×atendente,
  responsável real nos chamados, página Equipe *(03/07/2026)*
- [x] Fase 3 — portal do cliente: login próprio, caixas de gestão do lado
  do cliente, abrir chamado, responder e validar/retornar conclusão
  *(03/07/2026)*
- [x] Fase 4 — relatórios, TV Chamados, importação de contatos via CSV,
  PWA instalável *(03/07/2026)*
- [x] Anexos do lado do cliente no portal *(04/07/2026)*
- [x] Notificação por e-mail (chamado aberto, nova interação, convite de
  equipe) via Resend *(04/07/2026)*
