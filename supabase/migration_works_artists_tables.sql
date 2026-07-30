-- ============================================================================
-- HUB Art — Migration Punto 2: Tabelle `works` e `artists` nel DB
-- ============================================================================
-- Esegui questo script nel SQL Editor di Supabase:
--   https://supabase.com/dashboard/project/ddsdvcznziciqdambgom/sql/new
--
-- SCOPO:
--   Creare le tabelle `works` e `artists` nel DB Supabase, con RLS policies:
--   - TUTTI possono SELECT (anche anonimi) → le pagine React leggono dal DB
--   - SOLO admin può INSERT/UPDATE/DELETE
--   Le tabelle coesistono col JSON statico (data/works.json e data/artists.json):
--   il frontend legge prima dal DB, poi fa fallback al JSON per le opere/artisti
--   non presenti nel DB (retro-compatibilità).
-- ============================================================================

-- ============================================================================
-- TABELLA: works
-- ============================================================================
create table if not exists public.works (
  id              text primary key,
  title           text not null,
  artist_ids      text[] not null default '{}',
  period_id       text,
  date_text       text,
  year_start      integer,
  year_end        integer,
  type            text,
  technique_ids   text[] not null default '{}',
  materials       text[] not null default '{}',
  location_city   text,
  location_place  text,
  lat             double precision,
  lon             double precision,
  book            integer,
  chapter         integer,
  page            integer,
  source_file     text,
  importance      integer not null default 1,
  summary         text,
  analysis        text,
  innovations     text[] not null default '{}',
  term_ids        text[] not null default '{}',
  image_url       text,
  image_thumb     text,
  image_source    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  modified_by     text
);

-- Indici per ricerche frequenti
create index if not exists idx_works_period on public.works(period_id);
create index if not exists idx_works_type on public.works(type);
create index if not exists idx_works_book on public.works(book);
create index if not exists idx_works_year_start on public.works(year_start);
create index if not exists idx_works_importance on public.works(importance);
create index if not exists idx_works_location_city on public.works(location_city);
-- Indici GIN per array (ricerca "opere che contengono questo artista")
create index if not exists idx_works_artist_ids on public.works using gin(artist_ids);
create index if not exists idx_works_technique_ids on public.works using gin(technique_ids);
create index if not exists idx_works_term_ids on public.works using gin(term_ids);

-- Trigger per aggiornare updated_at automaticamente
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_works_touch on public.works;
create trigger trg_works_touch before update on public.works
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- TABELLA: artists
-- ============================================================================
create table if not exists public.artists (
  id              text primary key,
  name            text not null,
  aka             text[] not null default '{}',
  birth           integer,
  death           integer,
  period_ids      text[] not null default '{}',
  role            text,
  bio             text,
  innovations     text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  modified_by     text
);

create index if not exists idx_artists_name on public.artists(name);
create index if not exists idx_artists_period_ids on public.artists using gin(period_ids);

drop trigger if exists trg_artists_touch on public.artists;
create trigger trg_artists_touch before update on public.artists
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY — works
-- ============================================================================
alter table public.works enable row level security;

-- DROP policies esistenti
drop policy if exists "Anyone can read works" on public.works;
drop policy if exists "Admins can insert works" on public.works;
drop policy if exists "Admins can update works" on public.works;
drop policy if exists "Admins can delete works" on public.works;

-- SELECT: tutti (inclusi anonimi) possono leggere
create policy "Anyone can read works"
  on public.works for select
  to anon, authenticated
  using (true);

-- INSERT: solo admin
create policy "Admins can insert works"
  on public.works for insert
  to authenticated
  with check (auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me'));

-- UPDATE: solo admin
create policy "Admins can update works"
  on public.works for update
  to authenticated
  using (auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me'))
  with check (auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me'));

-- DELETE: solo admin
create policy "Admins can delete works"
  on public.works for delete
  to authenticated
  using (auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me'));

-- ============================================================================
-- ROW LEVEL SECURITY — artists
-- ============================================================================
alter table public.artists enable row level security;

drop policy if exists "Anyone can read artists" on public.artists;
drop policy if exists "Admins can insert artists" on public.artists;
drop policy if exists "Admins can update artists" on public.artists;
drop policy if exists "Admins can delete artists" on public.artists;

create policy "Anyone can read artists"
  on public.artists for select
  to anon, authenticated
  using (true);

create policy "Admins can insert artists"
  on public.artists for insert
  to authenticated
  with check (auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me'));

create policy "Admins can update artists"
  on public.artists for update
  to authenticated
  using (auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me'))
  with check (auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me'));

create policy "Admins can delete artists"
  on public.artists for delete
  to authenticated
  using (auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me'));

-- ============================================================================
-- COMMENTI
-- ============================================================================
comment on table public.works is 'Opere d''arte del catalogo HUB Art. Le opere qui presenti sovrascrivono quelle del file JSON statico con stesso id.';
comment on table public.artists is 'Artisti del catalogo HUB Art. Gli artisti qui presenti sovrascrivono quelli del file JSON statico con stesso id.';
comment on column public.works.modified_by is 'Email dell''admin che ha modificato l''opera per ultimo.';
comment on column public.artists.modified_by is 'Email dell''admin che ha modificato l''artista per ultimo.';
