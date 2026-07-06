-- Corrige os dois achados de performance de RLS do diagnóstico técnico
-- (docs/DIAGNOSTICO_SAAS.md, seção "RLS reavalia função por linha" e
-- "Múltiplas policies permissivas"). Nenhuma mudança de permissão efetiva —
-- só reescreve as policies pra Postgres avaliar auth.uid() uma vez por
-- query (em vez de por linha) e ter uma única policy permissiva de SELECT
-- por tabela (em vez de duas OR'd automaticamente pelo Postgres).

-- 1) auth.uid() sem sub-select — reavaliado linha a linha.
-- Trocado por `(select auth.uid())`, que o planner consegue resolver uma
-- única vez por statement (mesmo padrão já usado nas outras policies do
-- schema, ex.: companies.org_member_delete).

drop policy "creator_insert" on skcrm.orgs;
create policy "creator_insert" on skcrm.orgs
  for insert
  with check (created_by = (select auth.uid()));

drop policy "member_select" on skcrm.orgs;
create policy "member_select" on skcrm.orgs
  for select
  using (id in (select skcrm.user_org_ids()) or created_by = (select auth.uid()));

drop policy "admin_or_self_delete" on skcrm.org_members;
create policy "admin_or_self_delete" on skcrm.org_members
  for delete
  using (skcrm.is_org_admin(org_id) or user_id = (select auth.uid()));

drop policy "self_or_admin_insert" on skcrm.org_members;
create policy "self_or_admin_insert" on skcrm.org_members
  for insert
  with check (
    skcrm.is_org_admin(org_id)
    or (
      user_id = (select auth.uid())
      and (select o.created_by from skcrm.orgs o where o.id = org_members.org_id) = (select auth.uid())
    )
  );

drop policy "same_org_select" on skcrm.profiles;
create policy "same_org_select" on skcrm.profiles
  for select
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from skcrm.org_members m
      where m.user_id = profiles.user_id
        and m.org_id in (select skcrm.user_org_ids())
    )
  );

drop policy "self_update" on skcrm.profiles;
create policy "self_update" on skcrm.profiles
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy "org_member_delete" on skcrm.tickets;
create policy "org_member_delete" on skcrm.tickets
  for delete
  using (
    org_id in (select skcrm.user_org_ids())
    and exists (
      select 1 from skcrm.org_members m
      where m.org_id = tickets.org_id
        and m.user_id = (select auth.uid())
        and m.role = any (array['admin'::text, 'supervisor'::text])
    )
  );

-- 2) Policies de SELECT duplicadas — equipe (org_member) e cliente do
-- portal (client_*) cada um com sua própria policy permissiva de SELECT,
-- avaliadas as duas em toda consulta. Mescladas em uma só por tabela.
-- As tabelas ticket_attachments/ticket_comments tinham a parte de
-- staff dentro de uma policy "ALL" (insert/update/delete/select) — dividida
-- em policies por comando pra isolar só o SELECT na fusão com o cliente.

drop policy "org_member_select" on skcrm.contacts;
drop policy "client_self_select" on skcrm.contacts;
create policy "org_member_or_client_select" on skcrm.contacts
  for select
  using (
    org_id in (select skcrm.user_org_ids())
    or id in (select skcrm.client_contact_ids())
  );

drop policy "org_member_select" on skcrm.tickets;
drop policy "client_select" on skcrm.tickets;
create policy "org_member_or_client_select" on skcrm.tickets
  for select
  using (
    org_id in (select skcrm.user_org_ids())
    or id in (select skcrm.client_ticket_ids())
  );

drop policy "org_member_access" on skcrm.ticket_attachments;
drop policy "client_select" on skcrm.ticket_attachments;
create policy "org_member_insert" on skcrm.ticket_attachments
  for insert
  with check (org_id in (select skcrm.user_org_ids()));
create policy "org_member_update" on skcrm.ticket_attachments
  for update
  using (org_id in (select skcrm.user_org_ids()))
  with check (org_id in (select skcrm.user_org_ids()));
create policy "org_member_delete" on skcrm.ticket_attachments
  for delete
  using (org_id in (select skcrm.user_org_ids()));
create policy "org_member_or_client_select" on skcrm.ticket_attachments
  for select
  using (
    org_id in (select skcrm.user_org_ids())
    or ticket_id in (select skcrm.client_ticket_ids())
  );

drop policy "org_member_access" on skcrm.ticket_comments;
drop policy "client_select" on skcrm.ticket_comments;
create policy "org_member_insert" on skcrm.ticket_comments
  for insert
  with check (org_id in (select skcrm.user_org_ids()));
create policy "org_member_update" on skcrm.ticket_comments
  for update
  using (org_id in (select skcrm.user_org_ids()))
  with check (org_id in (select skcrm.user_org_ids()));
create policy "org_member_delete" on skcrm.ticket_comments
  for delete
  using (org_id in (select skcrm.user_org_ids()));
create policy "org_member_or_client_select" on skcrm.ticket_comments
  for select
  using (
    org_id in (select skcrm.user_org_ids())
    or (internal = false and ticket_id in (select skcrm.client_ticket_ids()))
  );
