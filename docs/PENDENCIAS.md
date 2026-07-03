# SkCRM — Pendências

Documento vivo: tudo que depende de uma ação ou decisão da Aline para o
projeto avançar. Vou atualizando conforme o desenvolvimento anda.
(Roteiro completo em [ROADMAP.md](./ROADMAP.md).)

## Bloqueiam o uso real

- [ ] **Expor o schema `skcrm` na API do Supabase** — Dashboard do projeto
  → Settings → API → "Exposed schemas" → adicionar `skcrm`. ~2 minutos,
  manual (o Supabase não permite automatizar). Sem isso o app não conversa
  com o banco (erro PGRST106). *Bloqueia tudo, inclusive testar qualquer
  coisa que já foi construída.*
- [ ] **Publicar o site** — Vercel/Netlify/Cloudflare Pages apontando para
  a pasta `web/`, com as variáveis do `web/.env.example`. *Bloqueia o
  programa Windows e o uso fora da sua máquina.*
- [ ] **Gerar e testar o instalador Windows** — na sua máquina:
  `cd desktop && npm install && npm start` (testar) e `npm run build:win`
  (gerar o `.exe`). Depois apontar para a URL publicada em
  Arquivo → Configurar servidor. *A sandbox de desenvolvimento não baixa o
  Electron, então esse teste é seu.*
- [ ] **Criar sua conta real e validar o fluxo completo** — cadastro →
  contato → empresa → chamado → responder → resolver → validar e concluir.
  Com a Fase 2, o cadastro já cria sua organização automaticamente.

## Decisões que estão travando funcionalidades

- [ ] **Provedor de e-mail para notificações** — sugestão: criar conta
  gratuita no [Resend](https://resend.com) e me passar a chave da API. Com
  ela eu configuro o envio de e-mail ao abrir/atualizar chamado (como o
  SGN faz), além do convite de equipe (Fase 2) e do aviso pro cliente do
  portal (Fase 3) — hoje os três ficam só registrados no sistema, sem
  avisar ninguém por fora.
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
- **Convite não envia e-mail ainda** — o convite fica registrado e ativa no
  cadastro, mas a pessoa precisa ser avisada por fora (WhatsApp etc.).
  O envio automático entra junto com o provedor de e-mail acima.
- **Banco compartilhado com o projeto "Tarefas"** — considerar projeto
  Supabase dedicado quando o CRM virar produção séria (migração simples
  enquanto há pouco dado).
- **Portal do cliente (Fase 3) não convida automaticamente** — hoje, um
  contato só vira cliente do portal se o e-mail dele já existir em
  `contacts` *antes* de criar a conta. Cadastrar um contato → avisar a
  pessoa (por fora) que já pode criar conta no SkCRM com esse e-mail.
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
