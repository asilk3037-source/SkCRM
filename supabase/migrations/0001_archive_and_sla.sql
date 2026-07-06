-- Arquivamento (soft-delete) de empresas e contatos, e SLA configurável por
-- empresa/prioridade. Primeira migration versionada do schema `skcrm` — o
-- schema já existia no banco antes desta pasta existir, então este arquivo
-- só descreve as mudanças a partir de agora (ver docs/DIAGNOSTICO_SAAS.md).

alter table skcrm.companies
  add column if not exists archived_at timestamptz;

alter table skcrm.contacts
  add column if not exists archived_at timestamptz;

create table if not exists skcrm.company_sla_settings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references skcrm.orgs (id) on delete cascade,
  company_id uuid not null references skcrm.companies (id) on delete cascade,
  priority text not null check (priority in ('baixa', 'media', 'alta', 'urgente')),
  hours_limit integer not null check (hours_limit > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, priority)
);

create index if not exists company_sla_settings_company_id_idx on skcrm.company_sla_settings (company_id);
create index if not exists company_sla_settings_org_id_idx on skcrm.company_sla_settings (org_id);

alter table skcrm.company_sla_settings enable row level security;

create policy "org_member_select" on skcrm.company_sla_settings
  for select
  using (org_id in (select skcrm.user_org_ids()));

create policy "staff_insert" on skcrm.company_sla_settings
  for insert
  with check (
    org_id in (select skcrm.user_org_ids())
    and exists (
      select 1 from skcrm.org_members m
      where m.org_id = company_sla_settings.org_id
        and m.user_id = (select auth.uid())
        and m.role = any (array['admin'::text, 'supervisor'::text])
    )
  );

create policy "staff_update" on skcrm.company_sla_settings
  for update
  using (
    org_id in (select skcrm.user_org_ids())
    and exists (
      select 1 from skcrm.org_members m
      where m.org_id = company_sla_settings.org_id
        and m.user_id = (select auth.uid())
        and m.role = any (array['admin'::text, 'supervisor'::text])
    )
  )
  with check (
    org_id in (select skcrm.user_org_ids())
    and exists (
      select 1 from skcrm.org_members m
      where m.org_id = company_sla_settings.org_id
        and m.user_id = (select auth.uid())
        and m.role = any (array['admin'::text, 'supervisor'::text])
    )
  );

create policy "staff_delete" on skcrm.company_sla_settings
  for delete
  using (
    org_id in (select skcrm.user_org_ids())
    and exists (
      select 1 from skcrm.org_members m
      where m.org_id = company_sla_settings.org_id
        and m.user_id = (select auth.uid())
        and m.role = any (array['admin'::text, 'supervisor'::text])
    )
  );
