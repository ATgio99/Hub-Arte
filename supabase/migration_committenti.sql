-- ============================================================================
-- Committenti: chi ha voluto l'opera, accanto a chi l'ha fatta — 31 agosto 2026
-- ----------------------------------------------------------------------------
-- I mecenati non diventano una tabella a se': restano dentro `artists`, gia'
-- predisposta con la categoria "committenti" (valore previsto da sempre in
-- ArtistCategory e mai usato: zero righe lo impostano). Cosi' una persona che
-- fosse insieme artista e committente resta una scheda sola, e non si duplica
-- l'anagrafica.
--
-- Il rischio di confusione non sta nel condividere la tabella ma nel condividere
-- il collegamento all'opera. Per questo restano due campi rigidamente distinti:
--   works.artist_ids       chi l'ha eseguita
--   works.committente_ids  chi l'ha commissionata
-- Un committente non entra MAI in artist_ids: non comparira' mai come autore.
--
-- CAMPI NUOVI SU artists
--   is_collective   distingue "Casa Medici" o "Senato veneziano" da una persona
--                   fisica; per gli artisti resta false.
--   location_city   la sede del committente (Urbino, Mantova, Citta' del
--                   Vaticano): serve alla mappa in modalita' committenti, dove i
--                   segnaposto seguono la sede e non le citta' delle opere, che
--                   possono essere sparse. Testo libero come works.location_city:
--                   nel progetto non esiste una tabella di luoghi normalizzati.
--
-- committente_ids e' un array benche' oggi si popoli con un solo id: le
-- committenze condivise e i casi controversi non richiederanno una migrazione.
--
-- MODIFICHE PARALLELE
--   src/lib/types.ts   Artist.is_collective, Artist.location_city,
--                      Work.committente_ids
--   src/lib/data.ts    worksByCommittente(), speculare a worksByArtist()
-- ============================================================================

alter table public.artists add column if not exists is_collective boolean not null default false;
alter table public.artists add column if not exists location_city text;
create index if not exists idx_artists_location_city on public.artists(location_city);

comment on column public.artists.is_collective is 'true per casate, corti e istituzioni committenti (Casa Medici, Senato veneziano); false per le persone fisiche.';
comment on column public.artists.location_city is 'Sede principale, usata dalla mappa in modalita'' committenti. Testo libero, come works.location_city.';

alter table public.works add column if not exists committente_ids text[] not null default '{}';
create index if not exists idx_works_committente_ids on public.works using gin(committente_ids);

comment on column public.works.committente_ids is 'Chi ha commissionato l''opera (id di artists con category=committenti). Distinto da artist_ids, che indica chi l''ha eseguita. Array per reggere committenze multiple.';
