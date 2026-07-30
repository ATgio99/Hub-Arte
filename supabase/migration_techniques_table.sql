-- ============================================================================
-- HUB Art — Migration: crea la tabella techniques se mancante
-- ============================================================================
-- Esegui questo script nel SQL Editor di Supabase se ottieni l'errore:
--   "Could not find the table 'public.techniques' in the schema cache"
--
-- Cosa fa:
--   1. Crea la tabella public.techniques se non esiste
--   2. Abilita RLS con SELECT pubblica e INSERT/UPDATE/DELETE admin-only
--   3. Crea trigger per updated_at
--   4. Forza refresh dello schema cache (le policy changes richiedono
--      qualche secondo per propagarsi ai client Supabase)
-- ============================================================================

-- ============================================================================
-- STEP 1: Crea la tabella techniques se non esiste
-- ============================================================================
create table if not exists public.techniques (
  id                text primary key,
  name              text not null,
  definition        text,
  introduced_by     text,
  first_period_id   text,
  evolution         text,
  category          text not null default 'altra',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  modified_by       text
);

-- Indice su nome (utile per ricerca)
create index if not exists idx_techniques_name on public.techniques(name);
-- Indice su categoria (utile per filtro)
create index if not exists idx_techniques_category on public.techniques(category);

-- ============================================================================
-- STEP 2: Funzione trigger touch_updated_at (idempotente)
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger su techniques
drop trigger if exists trg_techniques_touch on public.techniques;
create trigger trg_techniques_touch
  before update on public.techniques
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- STEP 3: Abilita RLS e crea policies
-- ============================================================================
alter table public.techniques enable row level security;

-- Rimuovi policies esistenti (se presenti)
drop policy if exists "Anyone can read techniques" on public.techniques;
drop policy if exists "Admins can insert techniques" on public.techniques;
drop policy if exists "Admins can update techniques" on public.techniques;
drop policy if exists "Admins can delete techniques" on public.techniques;

-- SELECT pubblica (anon + authenticated)
create policy "Anyone can read techniques"
  on public.techniques for select
  to anon, authenticated
  using (true);

-- INSERT admin-only
create policy "Admins can insert techniques"
  on public.techniques for insert
  to authenticated
  with check (auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me'));

-- UPDATE admin-only
create policy "Admins can update techniques"
  on public.techniques for update
  to authenticated
  using (auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me'))
  with check (auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me'));

-- DELETE admin-only
create policy "Admins can delete techniques"
  on public.techniques for delete
  to authenticated
  using (auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me'));

-- ============================================================================
-- STEP 4: Commenti
-- ============================================================================
comment on table public.techniques is 'Tecniche artistiche del catalogo HUB Art. Le righe qui presenti sovrascrivono quelle del file JSON statico.';
comment on column public.techniques.category is 'Categoria: pittorica | scultorea | architettonica | musiva | altra';

-- ============================================================================
-- STEP 5: Verifica (decommenta per report)
-- ============================================================================
-- select count(*) as totale_tecniche from public.techniques;
-- select * from public.techniques limit 5;
-- ============================================================================

-- FINE
