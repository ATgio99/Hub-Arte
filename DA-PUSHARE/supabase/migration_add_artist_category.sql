-- Migrazione: aggiunge colonna 'category' alla tabella artists
-- Esegui questo script nel SQL Editor di Supabase

ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS category text;
CREATE INDEX IF NOT EXISTS idx_artists_category ON public.artists(category);
COMMENT ON COLUMN public.artists.category IS 'Categoria/tag: pittori, scultori, architetti, orafi-bronzisti, miniatori, committenti, altro. Se NULL, viene dedotta dal ruolo.';
