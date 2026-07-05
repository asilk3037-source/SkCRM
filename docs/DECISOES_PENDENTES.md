# Decisões pendentes do produto

Criado em 05/07/2026, durante a transformação "produto comercial" do SkCRM
(design system, mobile-first, dashboard, toasts). Cada item abaixo é um
lugar onde o comportamento correto depende de uma escolha de negócio — não
é uma dúvida técnica, e por isso eu não inventei um comportamento sozinho.
Formato por item: Contexto → Impacto → Opções → Minha recomendação → Riscos.

---

## 1. Excluir empresa com chamados ou usuários do portal vinculados

**Contexto:** hoje, "Excluir empresa" (em `/empresas` e `/empresas/:id`) só
pede uma confirmação genérica ("essa ação não pode ser desfeita") e apaga a
empresa incondicionalmente, mesmo que ela tenha chamados em aberto. Conferi
o banco para ter certeza do que acontece de fato (não presumi):

- Chamados e negociações vinculados **não são apagados** — o vínculo
  (`company_id`) fica `NULL`. O chamado continua existindo, mas "solto",
  sem empresa.
- Usuários do portal dessa empresa (`company_members`) **são apagados em
  cascata**, junto com o acesso de login deles.

**Impacto:** um administrador pode excluir por engano uma empresa com
chamados em andamento e usuários ativos. Os chamados não somem, mas ficam
órfãos nas listagens (sem empresa associada) e os clientes daquela empresa
perdem acesso ao portal sem aviso prévio.

**Opções:**
1. Manter como está (exclusão direta, sem checagem).
2. Bloquear a exclusão se houver chamados em aberto ou usuários do portal
   ativos, exigindo resolver/inativar antes.
3. Adicionar "Arquivar empresa" como ação separada (oculta das listagens
   padrão, mas sem apagar nada) e reservar "Excluir" para quando não há
   mais nenhum vínculo ativo.

**Minha recomendação:** opção 3 (Arquivar). É o padrão que HubSpot/Zendesk
usam — a maioria dos "quero excluir" reais é "não quero mais ver isso no
dia a dia", não "quero apagar o histórico". Arquivar resolve isso sem
risco, e a exclusão definitiva continua disponível para quando fizer
sentido (empresa cadastrada errada, teste, duplicata).

**Riscos:** exige uma coluna nova (`archived_at` ou `status`) em
`companies` e um filtro em todas as listagens — mudança de schema, por
isso não implementei sem sua confirmação.

---

## 2. Excluir contato vinculado a chamados, negociações ou tarefas

**Contexto:** mesma situação do item 1, mas em `/contatos`. Conferido no
banco: tarefas, notas e anexos do contato são apagados em cascata; chamados
e negociações ficam com `contact_id = NULL` (o vínculo com a empresa, se
houver, é preservado separadamente).

**Impacto:** excluir um contato apaga silenciosamente o histórico de
tarefas/notas dele, e desliga chamados/negociações da pessoa que os abriu.

**Opções:** as mesmas do item 1 (manter / bloquear / arquivar).

**Minha recomendação:** tratar junto com o item 1 — mesma solução
(arquivar), para manter os dois consistentes.

**Riscos:** nenhum além do já descrito acima.

---

## 3. SLA / prazo de atendimento por prioridade

**Contexto:** o pedido de "indicadores de SLA" nos chamados foi recebido,
mas não existe hoje nenhuma definição de prazo (quantas horas um chamado
"urgente" pode ficar sem resposta antes de virar atrasado, por exemplo).
O Dashboard novo mostra "concluídos nos últimos 7 dias" e um gráfico de
chamados abertos por dia — isso é só contagem, não é SLA.

**Impacto:** sem essa definição, qualquer "atrasado"/"dentro do prazo" que
eu exibisse na tela seria um número inventado, não uma regra da empresa.

**Opções:**
1. Não ter SLA formal por enquanto (manter o indicador que já existe,
   "sem interação há mais de 7 dias", que é genérico e já cobre o caso de
   "esqueceram desse chamado").
2. Definir prazos por prioridade (ex.: urgente = 4h úteis, alta = 1 dia
   útil, média = 3 dias úteis, baixa = 5 dias úteis) e eu implemento um
   indicador visual de "dentro do prazo / atrasado" por chamado.

**Minha recomendação:** opção 2, mas só depois que você definir os prazos
reais da operação — não tenho como adivinhar o que é razoável para o seu
tipo de suporte.

**Riscos:** se os prazos forem muito rígidos e a equipe ainda não tiver
capacidade de cumprir, o indicador vira ruído (tudo aparece atrasado).
Vale validar os números com a equipe antes de ligar o indicador.

---

## 4. Permissões granulares configuráveis por perfil

**Contexto:** já detalhado em [MIGRACAO_FUTURA.md](./MIGRACAO_FUTURA.md)
— resumo aqui para não duplicar. Hoje os papéis são fixos
(admin/supervisor/suporte) com uma matriz de permissões fixa no código.

**Impacto:** qualquer ajuste fino de permissão (ex.: "suporte pode editar
mas não excluir negociações") exige alterar código, não é configurável
pela equipe.

**Opções e recomendação:** ver o documento linkado — a essência é que isso
exige uma tela de administração nova, e é uma decisão de produto (o que
cada perfil deveria poder fazer) antes de ser uma migração de banco.

**Riscos:** nenhum imediato — é um recurso novo, não uma correção.

---

## Como usar este documento

Quando você decidir algum item, me avise qual opção prefere (ou proponha
uma diferente) e eu implemento. Itens resolvidos saem daqui e, se geraram
código, passam a fazer parte do "O que já foi implementado" em
[MIGRACAO_FUTURA.md](./MIGRACAO_FUTURA.md).
