-- ============================================================================
-- Schema Supabase per HUB Art — tabelle utente + suggerimenti opere
-- ============================================================================
-- Esegui questo script nel SQL Editor di Supabase:
--   https://supabase.com/dashboard/project/ddsdvcznziciqdambgom/sql/new
-- ============================================================================

-- ============================================================================
-- TABELLA: user_suggestions
-- Suggerimenti di nuove opere inviati dagli utenti registrati.
-- Visti solo dagli amministratori.
-- ============================================================================
create table if not exists public.user_suggestions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  user_email    text not null,
  title         text not null,
  year          text,                              -- datazione testuale libera (es. "1495-1498")
  image_url     text,                              -- link immagine (Wikimedia Commons, ecc.)
  description   text,                              -- breve descrizione (max ~500 caratteri)
  artist        text,                              -- autore (opzionale)
  location      text,                              -- luogo (opzionale)
  status        text not null default 'pending',   -- pending | approved | rejected
  admin_note    text,                              -- nota admin (opzionale)
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz
);

-- Indici
create index if not exists idx_suggestions_user on public.user_suggestions(user_id);
create index if not exists idx_suggestions_status on public.user_suggestions(status);
create index if not exists idx_suggestions_created on public.user_suggestions(created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
alter table public.user_suggestions enable row level security;

-- POLICY: gli utenti possono inserire suggerimenti (serve essere autenticati)
drop policy if exists "Users can insert their own suggestions" on public.user_suggestions;
create policy "Users can insert their own suggestions"
  on public.user_suggestions for insert
  to authenticated
  with check (auth.uid() = user_id);

-- POLICY: ogni utente può leggere i PROPRI suggerimenti
drop policy if exists "Users can read their own suggestions" on public.user_suggestions;
create policy "Users can read their own suggestions"
  on public.user_suggestions for select
  to authenticated
  using (auth.uid() = user_id);

-- POLICY: gli amministratori possono leggere TUTTI i suggerimenti
-- (verifica tramite email nell'array di admin)
drop policy if exists "Admins can read all suggestions" on public.user_suggestions;
create policy "Admins can read all suggestions"
  on public.user_suggestions for select
  to authenticated
  using (
    auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me')
  );

-- POLICY: gli amministratori possono aggiornare i suggerimenti (status, nota)
drop policy if exists "Admins can update suggestions" on public.user_suggestions;
create policy "Admins can update suggestions"
  on public.user_suggestions for update
  to authenticated
  using (
    auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me')
  );

-- POLICY: gli amministratori possono eliminare i suggerimenti
drop policy if exists "Admins can delete suggestions" on public.user_suggestions;
create policy "Admins can delete suggestions"
  on public.user_suggestions for delete
  to authenticated
  using (
    auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me')
  );

-- ============================================================================
-- COMMENTI
-- ============================================================================
comment on table public.user_suggestions is 'Suggerimenti opere inviati dagli utenti';
comment on column public.user_suggestions.status is 'pending | approved | rejected';
