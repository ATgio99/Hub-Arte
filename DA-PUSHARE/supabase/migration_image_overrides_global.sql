-- ============================================================================
-- HUB Art — Migration Punto 3: Immagini override GLOBALI (admin-only)
-- ============================================================================
-- Esegui questo script nel SQL Editor di Supabase:
--   https://supabase.com/dashboard/project/ddsdvcznziciqdambgom/sql/new
--
-- SCOPO:
--   Aggiunge la colonna `is_global` alla tabella `image_overrides` per distinguere:
--   - is_global = TRUE  → override visibile a TUTTI gli utenti (solo admin può creare)
--   - is_global = FALSE → override privato dell'utente (comportamento attuale)
--
--   Aggiorna le RLS policies:
--   - Tutti gli utenti autenticati possono SELECT (devono vedere i globali + i propri)
--   - Solo admin può INSERT/UPDATE/DELETE righe con is_global = TRUE
--   - Ogni utente può INSERT/UPDATE/DELETE le proprie righe (is_global = FALSE)
-- ============================================================================

-- ============================================================================
-- STEP 1: Aggiungi colonna is_global (default FALSE = privata dell'utente)
-- ============================================================================
alter table public.image_overrides
  add column if not exists is_global boolean not null default false;

-- Indice per recuperare velocemente gli override globali
create index if not exists idx_image_overrides_global
  on public.image_overrides(is_global) where is_global = true;

-- ============================================================================
-- STEP 2: Aggiorna unique constraint
--   - Per override privati:  UNIQUE (user_id, work_id)  → già esistente
--   - Per override globali:  UNIQUE (work_id) WHERE is_global = TRUE
--     (solo un override globale per opera)
-- ============================================================================
-- Rimuovi il vecchio constraint se ha il nome standard
-- (se non esiste, l'istruzione non fa nulla)
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'image_overrides_user_id_work_id_key'
  ) then
    alter table public.image_overrides drop constraint image_overrides_user_id_work_id_key;
  end if;
end $$;

-- Nuovo constraint parziale per i globali (un solo override globale per opera)
drop index if exists idx_image_overrides_global_work;
create unique index if not exists idx_image_overrides_global_work
  on public.image_overrides(work_id) where is_global = true;

-- Nuovo constraint per i privati: un utente non può avere 2 override per la stessa opera
drop index if exists idx_image_overrides_user_work;
create unique index if not exists idx_image_overrides_user_work
  on public.image_overrides(user_id, work_id) where is_global = false;

-- ============================================================================
-- STEP 3: Aggiorna colonna modified_by per tracciare chi ha fatto l'override
-- ============================================================================
alter table public.image_overrides
  add column if not exists modified_by text;

-- ============================================================================
-- STEP 4: Rimuovi TUTTE le vecchie policies e crea quelle nuove
-- ============================================================================
-- Rimuovi policies esistenti (se presenti)
drop policy if exists "Users can insert their own image overrides" on public.image_overrides;
drop policy if exists "Users can read their own image overrides" on public.image_overrides;
drop policy if exists "Users can update their own image overrides" on public.image_overrides;
drop policy if exists "Users can delete their own image overrides" on public.image_overrides;
drop policy if exists "Admins can read all image overrides" on public.image_overrides;
drop policy if exists "Admins can update all image overrides" on public.image_overrides;
drop policy if exists "Admins can delete all image overrides" on public.image_overrides;

-- Abilita RLS (se non già attivo)
alter table public.image_overrides enable row level security;

-- POLICY SELECT: utenti autenticati possono leggere
--   - i PROPRI override (is_global = false AND user_id = auth.uid())
--   - TUTTI gli override globali (is_global = true)
create policy "Users can read own and global image overrides"
  on public.image_overrides for select
  to authenticated
  using (
    is_global = true OR user_id = auth.uid()
  );

-- POLICY SELECT pubblica: anche utenti anonimi vedono i globali
-- (utile per chi naviga senza account)
create policy "Anonymous can read global image overrides"
  on public.image_overrides for select
  to anon
  using (is_global = true);

-- POLICY INSERT privati: ogni utente autenticato può inserire i PROPRI override privati
create policy "Users can insert own private image overrides"
  on public.image_overrides for insert
  to authenticated
  with check (
    user_id = auth.uid() AND (is_global = false OR is_global IS NULL)
  );

-- POLICY INSERT globali: SOLO admin può inserire override globali
create policy "Admins can insert global image overrides"
  on public.image_overrides for insert
  to authenticated
  with check (
    is_global = true AND
    auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me')
  );

-- POLICY UPDATE privati: ogni utente può aggiornare i PROPRI override privati
create policy "Users can update own private image overrides"
  on public.image_overrides for update
  to authenticated
  using (user_id = auth.uid() AND (is_global = false OR is_global IS NULL))
  with check (user_id = auth.uid() AND (is_global = false OR is_global IS NULL));

-- POLICY UPDATE globali: SOLO admin può aggiornare override globali
create policy "Admins can update global image overrides"
  on public.image_overrides for update
  to authenticated
  using (
    is_global = true AND
    auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me')
  )
  with check (
    is_global = true AND
    auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me')
  );

-- POLICY DELETE privati: ogni utente può eliminare i PROPRI override privati
create policy "Users can delete own private image overrides"
  on public.image_overrides for delete
  to authenticated
  using (user_id = auth.uid() AND (is_global = false OR is_global IS NULL));

-- POLICY DELETE globali: SOLO admin può eliminare override globali
create policy "Admins can delete global image overrides"
  on public.image_overrides for delete
  to authenticated
  using (
    is_global = true AND
    auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me')
  );

-- ============================================================================
-- STEP 5: Commenti
-- ============================================================================
comment on column public.image_overrides.is_global is 'TRUE = override visibile a tutti (solo admin). FALSE = override privato dell''utente.';
comment on column public.image_overrides.modified_by is 'Email dell''admin che ha modificato l''override globale (null per override privati).';

-- ============================================================================
-- STEP 6 (OPZIONALE): Converti gli override ESISTENTI dell'admin in globali
--   Esegui SOLO se vuoi che gli override già fatti dall'admin diventino globali
--   per tutti. Sostituisci 'hubarte@proton.me' con l'email admin effettiva.
-- ============================================================================
-- update public.image_overrides
--   set is_global = true, modified_by = user_id::text
--   where user_id in (
--     select id from auth.users where email in ('hubarte@proton.me', 'atgio@proton.me')
--   );
-- ============================================================================
