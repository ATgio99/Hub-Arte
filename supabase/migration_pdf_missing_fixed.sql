-- ============================================================================
-- HUB Art — Fix per migration_pdf_missing.sql
-- ============================================================================
--
-- Il file originale inserisce alcuni eventi con year = NULL, ma la colonna
-- public.events.year è NOT NULL. Questo script consente temporaneamente i NULL,
-- esegue la migration originale, converte gli anni mancanti in 0 e ripristina
-- il vincolo NOT NULL.
--
-- IMPORTANTE:
-- 1. Incolla questo blocco PRIMA del contenuto di migration_pdf_missing.sql.
-- 2. Incolla il blocco finale DOPO tutto il contenuto della migration originale.
-- 3. Esegui tutto insieme nello SQL Editor di Supabase.
--
-- Il valore 0 significa "anno sconosciuto/non indicato nella fonte".
-- ============================================================================

BEGIN;

-- Permette temporaneamente agli INSERT originali di passare quando year è NULL.
ALTER TABLE public.events
  ALTER COLUMN year DROP NOT NULL;

-- Protezione ulteriore: se un INSERT omette year o lo imposta a NULL,
-- assegna 0 invece di lasciare un valore nullo.
CREATE OR REPLACE FUNCTION public.events_default_missing_year()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.year IS NULL THEN
    NEW.year := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_events_default_missing_year ON public.events;

CREATE TRIGGER trg_events_default_missing_year
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.events_default_missing_year();

-- ============================================================================
-- INCOLLA QUI SOTTO IL CONTENUTO COMPLETO DI migration_pdf_missing.sql
-- ============================================================================


-- ============================================================================
-- BLOCCO FINALE — da eseguire dopo la migration originale
-- ============================================================================

-- Converte eventuali NULL rimasti in valore sentinella.
UPDATE public.events
SET year = 0
WHERE year IS NULL;

-- Ripristina il vincolo previsto dallo schema.
ALTER TABLE public.events
  ALTER COLUMN year SET NOT NULL;

-- Il trigger non serve più dopo l'importazione.
DROP TRIGGER IF EXISTS trg_events_default_missing_year ON public.events;
DROP FUNCTION IF EXISTS public.events_default_missing_year();

COMMIT;

-- ============================================================================
-- VERIFICA
-- ============================================================================
SELECT id, year, title
FROM public.events
WHERE year = 0
ORDER BY title;
