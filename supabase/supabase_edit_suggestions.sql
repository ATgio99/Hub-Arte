-- ============================================================================
-- Schema Supabase — Tabella user_edit_suggestions
-- Suggerimenti di MODIFICA a opere esistenti inviati dagli utenti.
-- Ogni suggerimento si riferisce a un'opera già nel database e propone
-- modifiche a uno o più campi (titolo, autore, data, luogo, immagine, ecc.).
-- ============================================================================
-- Esegui questo script nel SQL Editor di Supabase:
--   https://supabase.com/dashboard/project/ddsdvcznziciqdambgom/sql/new
-- ============================================================================

create table if not exists public.user_edit_suggestions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  user_email    text not null,
  work_id       text not null,                          -- id dell'opera da modificare
  work_title    text not null,                          -- titolo dell'opera (per riferimento)
  field         text not null,                          -- campo modificato (title, summary, image_url, ...)
  current_value text,                                   -- valore attuale (per riferimento admin)
  proposed_value text not null,                         -- valore suggerito dall'utente
  reason        text,                                   -- motivazione (opzionale, max ~500 caratteri)
  status        text not null default 'pending',        -- pending | approved | rejected
  admin_note    text,                                   -- nota admin (opzionale, mostrata all'utente)
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz
);

-- Indici
create index if not exists idx_edit_sugg_user on public.user_edit_suggestions(user_id);
create index if not exists idx_edit_sugg_work on public.user_edit_suggestions(work_id);
create index if not exists idx_edit_sugg_status on public.user_edit_suggestions(status);
create index if not exists idx_edit_sugg_created on public.user_edit_suggestions(created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
alter table public.user_edit_suggestions enable row level security;

-- POLICY: utenti autenticati possono inserire suggerimenti di modifica
drop policy if exists "Users can insert their own edit suggestions" on public.user_edit_suggestions;
create policy "Users can insert their own edit suggestions"
  on public.user_edit_suggestions for insert
  to authenticated
  with check (auth.uid() = user_id);

-- POLICY: ogni utente può leggere i PROPRI suggerimenti di modifica
drop policy if exists "Users can read their own edit suggestions" on public.user_edit_suggestions;
create policy "Users can read their own edit suggestions"
  on public.user_edit_suggestions for select
  to authenticated
  using (auth.uid() = user_id);

-- POLICY: gli amministratori possono leggere TUTTI i suggerimenti di modifica
drop policy if exists "Admins can read all edit suggestions" on public.user_edit_suggestions;
create policy "Admins can read all edit suggestions"
  on public.user_edit_suggestions for select
  to authenticated
  using (
    auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me')
  );

-- POLICY: gli amministratori possono aggiornare i suggerimenti di modifica
drop policy if exists "Admins can update edit suggestions" on public.user_edit_suggestions;
create policy "Admins can update edit suggestions"
  on public.user_edit_suggestions for update
  to authenticated
  using (
    auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me')
  );

-- POLICY: gli amministratori possono eliminare i suggerimenti di modifica
drop policy if exists "Admins can delete edit suggestions" on public.user_edit_suggestions;
create policy "Admins can delete edit suggestions"
  on public.user_edit_suggestions for delete
  to authenticated
  using (
    auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me')
  );

comment on table public.user_edit_suggestions is 'Suggerimenti di modifica a opere esistenti';
comment on column public.user_edit_suggestions.field is 'Campo modificato: title, summary, analysis, date_text, year_start, year_end, type, location_city, location_place, materials, image_url, image_thumb, image_source, importance, artist, period, technique, term';
