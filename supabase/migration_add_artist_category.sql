-- Migrazione: aggiunge colonna 'category' alla tabella artists
-- Esegui questo script nel SQL Editor di Supabase per aggiungere il campo
-- categoria agli artisti, così puoi taggare ogni autore come Pittore,
-- Scultore, Architetto, Orafo/Bronzista, Miniatori, Committente o Altro.

-- Aggiungi colonna category (nullable, per retrocompatibilità)
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS category text;

-- Crea indice per filtrare per categoria
CREATE INDEX IF NOT EXISTS idx_artists_category ON public.artists(category);

-- Commento
COMMENT ON COLUMN public.artists.category IS 'Categoria/tag dell''artista: pittori, scultori, architetti, orafi-bronzisti, miniatori, committenti, altro. Se NULL, viene dedotta dal ruolo.';
