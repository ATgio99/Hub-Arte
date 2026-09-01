-- ============================================================================
-- HUB Arte — Migration: tabelle quiz_errors e quiz_stats per sync cloud
-- ============================================================================
-- Permette di sincronizzare errori quiz e statistiche su tutti i dispositivi.
-- ============================================================================

-- Tabella errori quiz (banca errori da ripassare)
create table if not exists public.quiz_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  ref_id text not null,
  prompt text not null default '',
  correct_streak integer not null default 0,
  added_at bigint not null default 0,
  last_seen bigint not null default 0,
  unique(user_id, kind, ref_id)
);

alter table public.quiz_errors enable row level security;
drop policy if exists "Users can read own quiz_errors" on public.quiz_errors;
create policy "Users can read own quiz_errors" on public.quiz_errors
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can insert own quiz_errors" on public.quiz_errors;
create policy "Users can insert own quiz_errors" on public.quiz_errors
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update own quiz_errors" on public.quiz_errors;
create policy "Users can update own quiz_errors" on public.quiz_errors
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own quiz_errors" on public.quiz_errors;
create policy "Users can delete own quiz_errors" on public.quiz_errors
  for delete to authenticated using (auth.uid() = user_id);

-- Tabella statistiche quiz (una riga per utente con JSON delle stats)
create table if not exists public.quiz_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stats jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.quiz_stats enable row level security;
drop policy if exists "Users can read own quiz_stats" on public.quiz_stats;
create policy "Users can read own quiz_stats" on public.quiz_stats
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can upsert own quiz_stats" on public.quiz_stats;
create policy "Users can upsert own quiz_stats" on public.quiz_stats
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update own quiz_stats" on public.quiz_stats;
create policy "Users can update own quiz_stats" on public.quiz_stats
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own quiz_stats" on public.quiz_stats;
create policy "Users can delete own quiz_stats" on public.quiz_stats
  for delete to authenticated using (auth.uid() = user_id);

-- FINE
