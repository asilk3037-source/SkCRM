# SkCRM

Um CRM leve, sem a complexidade de ferramentas gigantes (tipo GLPI). O foco é
facilidade de uso e de configuração. O mesmo login e os mesmos dados valem
tanto pelo site quanto pelo programa Windows — é a mesma aplicação nos dois
casos.

## Como é organizado

- **`web/`** — a aplicação em si: React + Vite + TypeScript + Tailwind,
  usando o [Supabase](https://supabase.com) como backend (autenticação +
  banco de dados Postgres). É o que roda no site.
- **`desktop/`** — um empacotador Electron para Windows que simplesmente abre
  essa mesma aplicação web dentro de uma janela nativa. Não existe uma
  segunda versão do app: o `.exe` aponta para o mesmo endereço que o site,
  então login e dados ficam sempre sincronizados.

## Backend (Supabase)

O projeto usa o Supabase existente da organização (`Tarefas`,
`pygyunefyowmbfyhbajg`), mas com um schema Postgres dedicado chamado
`skcrm` — totalmente isolado das tabelas de outros apps que moram nesse
mesmo projeto.

Tabelas: `companies`, `contacts`, `pipeline_stages`, `deals`, `tasks`,
`notes`. Todas têm Row Level Security: cada usuário só vê e edita os
próprios dados (`owner_id = auth.uid()`). Ao criar uma conta, um funil de
vendas padrão (6 etapas) é criado automaticamente.

**Passo manual pendente:** por segurança, o Supabase exige que schemas
customizados sejam expostos manualmente pelo painel — isso não pode ser
feito por API. Antes de rodar o app:

1. Abra as configurações da API do projeto: `Settings > API` no [dashboard
   do Supabase](https://supabase.com/dashboard/project/pygyunefyowmbfyhbajg/settings/api).
2. Em **Exposed schemas**, adicione `skcrm` à lista (normalmente já vem com
   `public` e `graphql_public`).
3. Salve. Sem isso, a API retorna erro `PGRST106` dizendo que o schema não
   está exposto.

## Rodando o site (`web/`)

```bash
cd web
cp .env.example .env   # já vem preenchido com a URL e a chave pública do projeto
npm install
npm run dev
```

Abre em `http://localhost:5173`. `npm run build` gera a versão de produção
em `web/dist`, pronta para publicar em qualquer host estático (Vercel,
Netlify, Cloudflare Pages etc).

## Rodando o programa Windows (`desktop/`)

O Electron simplesmente carrega uma URL — por padrão `http://localhost:5173`
(útil durante o desenvolvimento). Depois que o site estiver publicado, edite
`desktop/config.json` (ou use o menu **Arquivo > Configurar servidor** dentro
do próprio programa) para apontar para a URL pública.

```bash
cd desktop
npm install       # baixa o Electron — precisa de acesso à internet liberado
npm start         # abre a janela do app
npm run build:win # gera o instalador .exe (electron-builder)
```

> Nesta sandbox de desenvolvimento o download do binário do Electron foi
> bloqueado pela política de rede do ambiente, então o app Electron não foi
> executado nem empacotado aqui — só escrito e revisado. Rode `npm install`
> e `npm start`/`npm run build:win` numa máquina com acesso normal à
> internet (a sua, ou um runner de CI) para testar e gerar o instalador.

## Estado atual / próximos passos

Já funciona: login/cadastro, contatos, empresas, negociações (kanban por
etapa do funil), chamados e tarefas — tudo com CRUD completo, compartilhado
por equipe (organizações com papéis admin×atendente).

O módulo de chamados segue o modelo do SGN (Netview): caixas de gestão
por "com quem está a próxima ação", número curto (#1001...), tipo,
setor/responsável real (membro da equipe) com encaminhamento, timeline
automática, fluxo de validação antes de concluir, interações externas
(cliente) separadas das internas (anotações) e anexos de até 40 MB por
arquivo (bucket privado `skcrm-attachments` no Supabase Storage).

**Portal do cliente** (`/portal`): um contato cadastrado pode criar a
própria conta e acompanhar, abrir e validar os próprios chamados — sem
acesso ao resto do CRM.

**Relatórios e acompanhamento** (`/relatorios`, `/tv`): funil de vendas,
tempo médio de resolução de chamados, produção por pessoa e um telão
("TV Chamados") pra deixar aberto na sala, atualizando sozinho a cada
30 segundos.

**Importação e instalação**: contatos em massa via CSV (`/contatos` →
Importar CSV, reconhece colunas em português ou inglês) e o site é uma
PWA instalável — "Adicionar à tela inicial" no celular funciona como um
app nativo, com ícone próprio.

Veja [`docs/ROADMAP.md`](docs/ROADMAP.md) para o plano completo por fases e
[`docs/PENDENCIAS.md`](docs/PENDENCIAS.md) para o que depende de você.
