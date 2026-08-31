-- ============================================================================
-- HUB Arte — Migration FIX: ricrea quiz_errors e quiz_stats con schema corretto
-- ============================================================================
-- PROBLEMA: le tabelle esistevano già nel DB con uno schema diverso da quello
-- che il codice TypeScript si aspetta. Questo causava errori 400:
--   - PGRST204 sull'on_conflict (unique constraint mancante)
--   - 42703 sulle colonne (kind, ref_id, prompt, correct_streak, added_at,
--     last_seen, stats, updated_at non esistenti)
--
-- SOLUZIONE: DROP + CREATE delle tabelle per garantire lo schema corretto.
-- ATTENZIONE: questo eliminerà eventuali dati presenti nelle tabelle vecchie,
-- ma visto che le tabelle non erano utilizzabili (errore 400), non c'è nulla
-- di valido da preservare.
-- ============================================================================

-- ============================================================================
-- 1) DROP tabelle esistenti (se presenti)
-- ============================================================================
drop table if exists public.quiz_errors cascade;
drop table if exists public.quiz_stats cascade;

-- ============================================================================
-- 2) CREATE tabella quiz_errors con schema corretto
-- ============================================================================
-- Colonne attese dal codice TypeScript (quizStore.ts + sync.ts):
--   user_id, kind, ref_id, prompt, correct_streak, added_at, last_seen
-- Unique constraint su (user_id, kind, ref_id) per upsert onConflict
create table public.quiz_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  ref_id text not null,
  prompt text not null default '',
  correct_streak integer not null default 0,
  added_at bigint not null default 0,
  last_seen bigint not null default 0,
  constraint quiz_errors_user_kind_ref_unique unique (user_id, kind, ref_id)
);

-- Indici per performance query
create index idx_quiz_errors_user_id on public.quiz_errors(user_id);
create index idx_quiz_errors_user_kind on public.quiz_errors(user_id, kind);

-- RLS
alter table public.quiz_errors enable row level security;

create policy "Users can read own quiz_errors"
  on public.quiz_errors for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own quiz_errors"
  on public.quiz_errors for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own quiz_errors"
  on public.quiz_errors for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own quiz_errors"
  on public.quiz_errors for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================================
-- 3) CREATE tabella quiz_stats con schema corretto
-- ============================================================================
-- Colonne attese dal codice TypeScript:
--   user_id (PK), stats (jsonb), updated_at (timestamptz)
-- Unique constraint su user_id (è già la PK) per upsert onConflict
create table public.quiz_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stats jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.quiz_stats enable row level security;

create policy "Users can read own quiz_stats"
  on public.quiz_stats for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own quiz_stats"
  on public.quiz_stats for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own quiz_stats"
  on public.quiz_stats for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own quiz_stats"
  on public.quiz_stats for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================================
-- 4) Verifica (opzionale, eseguire per check)
-- ============================================================================
-- Per verificare lo schema dopo l'esecuzione:
--   \d public.quiz_errors
--   \d public.quiz_stats

-- FINE
