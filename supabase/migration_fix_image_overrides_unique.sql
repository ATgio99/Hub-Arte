-- ============================================================================
-- HUB Arte — Migration FIX: UNIQUE constraint completo su image_overrides
-- ============================================================================
-- PROBLEMA: la migration migration_image_overrides_global.sql aveva sostituito
-- il constraint UNIQUE(user_id, work_id) con un constraint PARZIALE:
--   create unique index idx_image_overrides_user_work
--     on public.image_overrides(user_id, work_id) where is_global = false;
--
-- PostgreSQL NON può usare un indice parziale per risolvere
-- ON CONFLICT ("user_id", "work_id") — richiede un constraint UNIQUE completo.
-- Risultato: errore 42P10 "there is no unique or exclusion constraint matching
-- the ON CONFLICT specification" su ogni upsert di image_overrides.
--
-- SOLUZIONE: sostituire il constraint parziale con uno completo (senza WHERE).
-- I record globali (user_id = NULL) non violano il constraint perché in SQL
-- NULL != NULL. Il constraint parziale idx_image_overrides_global_work
-- impedisce comunque duplicati globali (un solo override globale per opera).
-- ============================================================================

-- 1) Rimuovi il vecchio indice parziale (se esiste)
drop index if exists idx_image_overrides_user_work;

-- 2) Crea il nuovo UNIQUE constraint completo su (user_id, work_id)
--    Questo permette all'ON CONFLICT("user_id", "work_id") di funzionare.
--    NOTA: per i record con user_id = NULL (globali), il constraint permette
--    duplicati (NULL != NULL in SQL), ma idx_image_overrides_global_work
--    impedisce comunque duplicati globali.
create unique index if not exists idx_image_overrides_user_work
  on public.image_overrides(user_id, work_id);

-- 3) Verifica che il constraint parziale per i globali esista ancora
--    (un solo override globale per opera)
create unique index if not exists idx_image_overrides_global_work
  on public.image_overrides(work_id) where is_global = true;

-- FINE
--
-- Verifica (opzionale):
--   SELECT indexname, indexdef FROM pg_indexes
--   WHERE tablename = 'image_overrides';
-- Dovresti vedere:
--   - idx_image_overrides_user_work: UNIQUE (user_id, work_id) — completo
--   - idx_image_overrides_global_work: UNIQUE (work_id) WHERE is_global = true — parziale
