-- ============================================================================
-- HUB Arte — Migration: aggiunge sort_order a connections
-- ============================================================================
-- Permette di riordinare le connessioni di un artista (gerarchia).
-- Il riordino avviene nell'ArtistEditorDrawer con pulsanti su/giù.
-- ============================================================================

-- Aggiunge la colonna sort_order (intero, default 0, nullable)
alter table public.connections
  add column if not exists sort_order integer default 0;

-- Indice per performance
create index if not exists idx_connections_sort_order
  on public.connections(sort_order);

-- FINE
--
-- Verifica:
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'connections' AND column_name = 'sort_order';
