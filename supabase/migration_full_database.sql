-- ============================================================================
-- HUB Art — Migration Punto 2 AGGIORNATA: tutte le tabelle del dataset
-- ============================================================================
-- Esegui questo script nel SQL Editor di Supabase:
--   https://supabase.com/dashboard/project/ddsdvcznziciqdambgom/sql/new
--
-- SCOPO:
--   Crea TUTTE le tabelle del dataset HUB Art nel DB Supabase, con RLS:
--   - Tutti possono SELECT (anche anonimi) → il frontend legge dal DB
--   - Solo admin può INSERT/UPDATE/DELETE
--
--   Le tabelle coesistono col JSON statico: il frontend fa merge.
--   Le righe del DB con stesso id SOVRASCRIVONO quelle del JSON.
--   Le righe del DB con id nuovo vengono AGGIUNTE.
--
-- Tabelle create:
--   - works (sostituisce la migration precedente)
--   - artists (sostituisce la migration precedente)
--   - periods
--   - techniques
--   - terms
--   - events
--   - connections
-- ============================================================================

-- ============================================================================
-- TABELLA: periods
-- ============================================================================
create table if not exists public.periods (
  id                 text primary key,
  name               text not null,
  type               text not null default 'epoca',
  year_start         integer not null,
  year_end           integer not null,
  regions            text[] not null default '{}',
  summary            text,
  historical_context text,
  parent_id          text,
  key_innovations    text[] not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  modified_by        text
);
create index if not exists idx_periods_year on public.periods(year_start);
create index if not exists idx_periods_parent on public.periods(parent_id);

-- ============================================================================
-- TABELLA: works (già esistente, la arricchiamo con modified_by)
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
create index if not exists idx_works_period on public.works(period_id);
create index if not exists idx_works_type on public.works(type);
create index if not exists idx_works_book on public.works(book);
create index if not exists idx_works_year_start on public.works(year_start);
create index if not exists idx_works_importance on public.works(importance);
create index if not exists idx_works_location_city on public.works(location_city);
create index if not exists idx_works_artist_ids on public.works using gin(artist_ids);
create index if not exists idx_works_technique_ids on public.works using gin(technique_ids);
create index if not exists idx_works_term_ids on public.works using gin(term_ids);

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

-- ============================================================================
-- TABELLA: techniques
-- ============================================================================
create table if not exists public.techniques (
  id                text primary key,
  name              text not null,
  definition        text,
  introduced_by     text,
  first_period_id   text,
  evolution         text,
  category          text not null default 'altra',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  modified_by       text
);
create index if not exists idx_techniques_name on public.techniques(name);

-- ============================================================================
-- TABELLA: terms (glossario)
-- ============================================================================
create table if not exists public.terms (
  id            text primary key,
  term          text not null,
  definition    text,
  category      text not null default 'generale',
  period_ids    text[] not null default '{}',
  is_archetype  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  modified_by   text
);
create index if not exists idx_terms_term on public.terms(term);
create index if not exists idx_terms_category on public.terms(category);

-- ============================================================================
-- TABELLA: events (eventi storici per la timeline)
-- ============================================================================
create table if not exists public.events (
  id            text primary key,
  year          integer not null,
  year_end      integer,
  title         text not null,
  description   text,
  kind          text not null default 'culturale',
  period_id     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  modified_by   text
);
create index if not exists idx_events_year on public.events(year);
create index if not exists idx_events_kind on public.events(kind);
create index if not exists idx_events_period on public.events(period_id);

-- ============================================================================
-- TABELLA: connections (sinapsi tra entità)
-- ============================================================================
create table if not exists public.connections (
  id            text primary key,
  source_type   text not null,
  source_id     text not null,
  target_type   text not null,
  target_id     text not null,
  kind          text not null default 'influenza',
  description   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  modified_by   text
);
create index if not exists idx_connections_source on public.connections(source_type, source_id);
create index if not exists idx_connections_target on public.connections(target_type, target_id);
create index if not exists idx_connections_kind on public.connections(kind);

-- ============================================================================
-- TRIGGER updated_at (per tutte le tabelle)
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_periods_touch on public.periods;
create trigger trg_periods_touch before update on public.periods
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_works_touch on public.works;
create trigger trg_works_touch before update on public.works
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_artists_touch on public.artists;
create trigger trg_artists_touch before update on public.artists
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_techniques_touch on public.techniques;
create trigger trg_techniques_touch before update on public.techniques
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_terms_touch on public.terms;
create trigger trg_terms_touch before update on public.terms
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_events_touch on public.events;
create trigger trg_events_touch before update on public.events
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_connections_touch on public.connections;
create trigger trg_connections_touch before update on public.connections
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY — stessa policy per tutte le tabelle:
--   SELECT pubblica (anon + authenticated)
--   INSERT/UPDATE/DELETE solo admin
-- ============================================================================
do $$
declare
  t text;
begin
  foreach t in array array['periods','works','artists','techniques','terms','events','connections']
  loop
    execute format('alter table public.%I enable row level security', t);

    -- Drop policies esistenti
    execute format('drop policy if exists "Anyone can read %s" on public.%I', t, t);
    execute format('drop policy if exists "Admins can insert %s" on public.%I', t, t);
    execute format('drop policy if exists "Admins can update %s" on public.%I', t, t);
    execute format('drop policy if exists "Admins can delete %s" on public.%I', t, t);

    -- SELECT pubblica
    execute format($f$
      create policy "Anyone can read %s"
      on public.%I for select
      to anon, authenticated
      using (true)
    $f$, t, t);

    -- INSERT admin-only
    execute format($f$
      create policy "Admins can insert %s"
      on public.%I for insert
      to authenticated
      with check (auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me'))
    $f$, t, t);

    -- UPDATE admin-only
    execute format($f$
      create policy "Admins can update %s"
      on public.%I for update
      to authenticated
      using (auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me'))
      with check (auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me'))
    $f$, t, t);

    -- DELETE admin-only
    execute format($f$
      create policy "Admins can delete %s"
      on public.%I for delete
      to authenticated
      using (auth.jwt() ->> 'email' in ('hubarte@proton.me', 'atgio@proton.me'))
    $f$, t, t);
  end loop;
end $$;

-- ============================================================================
-- COMMENTI
-- ============================================================================
comment on table public.periods is 'Periodi storici del catalogo HUB Art. Le righe qui presenti sovrascrivono quelle del file JSON statico.';
comment on table public.works is 'Opere d''arte del catalogo HUB Art. Le righe qui presenti sovrascrivono quelle del file JSON statico.';
comment on table public.artists is 'Artisti del catalogo HUB Art. Le righe qui presenti sovrascrivono quelle del file JSON statico.';
comment on table public.techniques is 'Tecniche artistiche del catalogo HUB Art.';
comment on table public.terms is 'Termini del glossario del catalogo HUB Art.';
comment on table public.events is 'Eventi storici per la timeline.';
comment on table public.connections is 'Connessioni (sinapsi) tra entità del catalogo.';
