-- EcoFix: banco compartilhado com leitura pública e escrita exclusiva de administradores.
-- Execute este arquivo no SQL Editor do Supabase.

create table if not exists public.ecofix_state (
    id integer primary key check (id = 1),
    data jsonb not null default '{"substituicoes":[],"producaoDiaria":88,"diasMes":22,"mesesAno":12,"versaoDados":2}'::jsonb,
    updated_at timestamptz not null default now()
);

create table if not exists public.ecofix_admins (
    user_id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

alter table public.ecofix_state enable row level security;
alter table public.ecofix_admins enable row level security;

revoke all on table public.ecofix_state from anon, authenticated;
grant select on table public.ecofix_state to anon, authenticated;
grant insert, update, delete on table public.ecofix_state to authenticated;

revoke all on table public.ecofix_admins from anon, authenticated;

create schema if not exists private;

create or replace function private.is_ecofix_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.ecofix_admins a
        where a.user_id = (select auth.uid())
    );
$$;

revoke all on function private.is_ecofix_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_ecofix_admin() to authenticated;

drop policy if exists "EcoFix: leitura publica" on public.ecofix_state;
create policy "EcoFix: leitura publica"
on public.ecofix_state
for select
to anon, authenticated
using (true);

drop policy if exists "EcoFix: administradores inserem" on public.ecofix_state;
create policy "EcoFix: administradores inserem"
on public.ecofix_state
for insert
to authenticated
with check ((select private.is_ecofix_admin()));

drop policy if exists "EcoFix: administradores atualizam" on public.ecofix_state;
create policy "EcoFix: administradores atualizam"
on public.ecofix_state
for update
to authenticated
using ((select private.is_ecofix_admin()))
with check ((select private.is_ecofix_admin()));

drop policy if exists "EcoFix: administradores excluem" on public.ecofix_state;
create policy "EcoFix: administradores excluem"
on public.ecofix_state
for delete
to authenticated
using ((select private.is_ecofix_admin()));

insert into public.ecofix_state (id)
values (1)
on conflict (id) do nothing;
