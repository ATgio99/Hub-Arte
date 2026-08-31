-- ============================================================================
-- HUB Art — Migration RETROATTIVA: immagini admin diventano globali
-- ============================================================================
-- Esegui questo script nel SQL Editor di Supabase:
--   https://supabase.com/dashboard/project/ddsdvcznziciqdambgom/sql/new
--
-- SCOPO:
--   1. Assicura che la colonna is_global esista (idempotente)
--   2. Aggiunge updated_at se manca (per tracciare le modifiche)
--   3. Converte TUTTI gli override fatti in passato dall'admin (anche quando
--      il codice li aveva salvati come privati con is_global=false) in
--      override GLOBALI (is_global=true).
--   4. Aggiorna la tabella `works` con gli URL delle immagini overriding,
--      così sono visibili a TUTTI gli utenti (anche anonimi) direttamente
--      dal fetch dei works, senza dover passare per image_overrides.
--   5. Elimina eventuali duplicati (se due admin avevano settato la stessa
--      opera, tiene solo il più recente).
-- ============================================================================

-- ============================================================================
-- STEP 1: Assicura che esista la colonna is_global e modified_by (idempotente)
-- ============================================================================
alter table public.image_overrides
  add column if not exists is_global boolean not null default false;

alter table public.image_overrides
  add column if not exists modified_by text;

-- Aggiungi updated_at se manca, con trigger che lo aggiorna automaticamente
-- ad ogni UPDATE (così sync.ts può leggerlo).
alter table public.image_overrides
  add column if not exists updated_at timestamptz not null default now();

-- Crea la funzione touch_updated_at se non esiste
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Crea/ricrea il trigger su image_overrides
drop trigger if exists trg_image_overrides_touch on public.image_overrides;
create trigger trg_image_overrides_touch
  before update on public.image_overrides
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- STEP 2: Elimina duplicati tra admin per la stessa work_id
--   Se due admin hanno settato override per la stessa opera, tiene solo il
--   più recente (updated_at DESC, fallback created_at, fallback modified_by).
-- ============================================================================
with ranked as (
  select id,
         row_number() over (
           partition by work_id
           order by
             updated_at desc nulls last,
             created_at desc nulls last,
             modified_by desc
         ) as rn
  from public.image_overrides io
  where io.user_id in (
    select id from auth.users
    where lower(email) in ('hubarte@proton.me', 'atgio@proton.me')
  )
    and (io.is_global = false or io.is_global is null)
)
delete from public.image_overrides
where id in (select id from ranked where rn > 1);

-- ============================================================================
-- STEP 3: Converti TUTTI gli override dell'admin in GLOBALI
--   Imposta is_global=true e modified_by=email dell'admin
-- ============================================================================
update public.image_overrides as io
  set is_global = true,
      modified_by = lower(au.email)
  from auth.users au
  where io.user_id = au.id
    and lower(au.email) in ('hubarte@proton.me', 'atgio@proton.me')
    and (io.is_global = false or io.is_global is null);

-- ============================================================================
-- STEP 4: Aggiorna la tabella `works` con gli URL degli override globali
--   COSÌ È RETROATTIVA: anche le opere che l'admin aveva già cambiato
--   in passato ora hanno image_url/image_thumb aggiornati nel DB works,
--   visibili a TUTTI gli utenti (anche anonimi) al primo fetch.
-- ============================================================================
update public.works as w
  set image_url   = io.url,
      image_thumb = io.url,
      modified_by = io.modified_by
  from public.image_overrides io
  where io.work_id = w.id
    and io.is_global = true
    and io.url is not null
    and io.url <> '';

-- ============================================================================
-- STEP 5: Crea/aggiorna l'indice unico parziale per i globali
--   (un solo override globale per work_id)
-- ============================================================================
drop index if exists idx_image_overrides_global_work;
create unique index if not exists idx_image_overrides_global_work
  on public.image_overrides(work_id) where is_global = true;

drop index if exists idx_image_overrides_user_work;
create unique index if not exists idx_image_overrides_user_work
  on public.image_overrides(user_id, work_id) where is_global = false;

-- ============================================================================
-- STEP 6: Verifica — mostra cosa è stato fatto (decommenta per report)
-- ============================================================================
-- select
--   (select count(*) from public.image_overrides where is_global = true) as globali,
--   (select count(*) from public.image_overrides where is_global = false) as privati,
--   (select count(*) from public.works where modified_by in
--      ('hubarte@proton.me','atgio@proton.me')) as works_modificati_admin;
-- ============================================================================

-- FINE
