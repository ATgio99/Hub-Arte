-- ============================================================================
-- FIX SICUREZZA — rimozione delle policy RLS legacy
-- ----------------------------------------------------------------------------
-- Data: 29 agosto 2026
--
-- PROBLEMA (image_overrides) — questa e' la parte che chiude una falla reale.
--   migration_image_overrides_global.sql ha aggiunto le policy corrette ma NON
--   ha rimosso le tre precedenti (io_select, io_insert, io_delete).
--   In PostgreSQL le policy permissive si sommano in OR: per essere autorizzati
--   basta che ne passi UNA. La policy io_insert controllava soltanto
--       auth.uid() = user_id
--   senza guardare is_global, quindi QUALSIASI UTENTE AUTENTICATO poteva
--   inserire un override con is_global = true, cioe' cambiare l'immagine di
--   un'opera per TUTTI i visitatori del sito, anonimi compresi.
--
--   Le policy corrette coprono gia' ogni caso legittimo:
--     SELECT  "Anonymous can read global image overrides"       (anon, is_global=true)
--             "Users can read own and global image overrides"   (authenticated)
--     INSERT  "Users can insert own private image overrides"    (is_global=false)
--             "Admins can insert global image overrides"        (is_global=true)
--     UPDATE  "Users can update own private image overrides"
--             "Admins can update global image overrides"
--     DELETE  "Users can delete own private image overrides"
--             "Admins can delete global image overrides"
--
-- PULIZIA (user_favorites, user_studied) — nessun cambiamento di comportamento.
--   Stesso residuo, ma innocuo: le policy fav_* e stud_* hanno una condizione
--   IDENTICA a quelle nuove (auth.uid() = user_id). L'unica differenza e' il
--   ruolo (public invece di authenticated), ma per un visitatore anonimo
--   auth.uid() e' NULL e non corrisponde mai a nessun user_id, quindi non
--   concedono nulla in piu'. Vengono rimosse perche' i doppioni rendono
--   illeggibile l'elenco delle policy: e' il motivo per cui il problema su
--   image_overrides e' passato inosservato.
--
-- NOTA: DROP POLICY rimuove una REGOLA DI PERMESSO, non dei dati.
--       Nessuna riga viene toccata: preferiti, opere approfondite e override
--       restano tutti al loro posto.
-- ============================================================================

BEGIN;

-- --- 1. La falla ------------------------------------------------------------
DROP POLICY IF EXISTS io_select ON public.image_overrides;
DROP POLICY IF EXISTS io_insert ON public.image_overrides;
DROP POLICY IF EXISTS io_delete ON public.image_overrides;

-- --- 2. Doppioni innocui ----------------------------------------------------
DROP POLICY IF EXISTS fav_select  ON public.user_favorites;
DROP POLICY IF EXISTS fav_insert  ON public.user_favorites;
DROP POLICY IF EXISTS fav_delete  ON public.user_favorites;

DROP POLICY IF EXISTS stud_select ON public.user_studied;
DROP POLICY IF EXISTS stud_insert ON public.user_studied;
DROP POLICY IF EXISTS stud_delete ON public.user_studied;

COMMIT;

-- ============================================================================
-- VERIFICA — da eseguire dopo la migrazione.
-- Attese: 8 policy su image_overrides, 4 su user_favorites, 4 su user_studied,
-- nessuna con nome io_*, fav_* o stud_*.
-- ============================================================================
-- SELECT tablename, policyname, cmd, roles::text
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('image_overrides', 'user_favorites', 'user_studied')
-- ORDER BY tablename, cmd, policyname;
--
-- Controllo che nessun utente non-admin possieda override globali:
-- SELECT u.email, count(*)
-- FROM image_overrides io JOIN auth.users u ON u.id = io.user_id
-- WHERE io.is_global GROUP BY u.email;
-- ============================================================================
