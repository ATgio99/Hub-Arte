-- ============================================================================
-- HUB Arte — Migration: tabella hidden_entities per nascondere record JSON
-- ============================================================================
-- Permette di "eliminare" record che esistono solo nel JSON statico.
-- Invece di eliminare dal DB (che non li contiene), salviamo l'ID in questa
-- tabella. loadDataset() poi filtra via questi ID dal dataset finale.
-- ============================================================================

create table if not exists public.hidden_entities (
  id text primary key,
  table_name text not null,
  hidden_at timestamptz not null default now(),
  hidden_by text
);

alter table public.hidden_entities enable row level security;

drop policy if exists "Anyone can read hidden_entities" on public.hidden_entities;
create policy "Anyone can read hidden_entities"
  on public.hidden_entities for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can insert hidden_entities" on public.hidden_entities;
create policy "Admins can insert hidden_entities"
  on public.hidden_entities for insert
  to authenticated
  with check (auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me'));

drop policy if exists "Admins can delete hidden_entities" on public.hidden_entities;
create policy "Admins can delete hidden_entities"
  on public.hidden_entities for delete
  to authenticated
  using (auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me'));

-- FINE
