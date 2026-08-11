-- ============================================================================
-- HUB Arte — Migration: aggiunge colonna image_gallery alla tabella works
-- ============================================================================
-- Permette di associare più immagini a un'opera (galleria scorrevole).
-- La colonna image_gallery è un array di URL (text[]).
-- L'immagine principale resta image_url/image_thumb.
-- ============================================================================

alter table public.works
  add column if not exists image_gallery text[] not null default '{}';

comment on column public.works.image_gallery is 'Array di URL di immagini aggiuntive per la galleria scorrevole. La prima immagine è image_url/image_thumb.';

-- FINE
