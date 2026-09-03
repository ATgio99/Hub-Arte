-- ============================================================================
-- fonti — da quale libro viene ogni scheda.
--
-- Prende il posto di `works.importance`, il numero 1-3 che il sito mostrava
-- come «opera capitale». Erano due cose impacchettate in una: la provenienza,
-- che e' un fatto verificabile, e l'importanza, che non lo e'.
--
-- Le fonti sono una tabella e non un testo libero per un motivo pratico: il
-- titolo di un manuale scritto a mano cinquanta volte diventa cinquanta titoli
-- leggermente diversi, e una bibliografia con cinquanta voci per due libri non
-- e' una bibliografia.
--
-- `fonte_ids` e' un elenco, come `artist_ids` e `committente_ids`: la stessa
-- opera puo' comparire in piu' manuali, ed e' esattamente il caso che si vuole
-- poter registrare quando le fonti saranno piu' d'una.
--
-- Nulla viene distrutto: `works.book`, `chapter` e `page` restano dove sono.
-- Idempotente: si puo' rilanciare.
-- ============================================================================

create table if not exists public.fonti (
  id          text primary key,
  titolo      text not null,
  autori      text,
  editore     text,
  anno        integer,
  volume      text,
  note        text,
  updated_at  timestamptz not null default now()
);

comment on table public.fonti is
  'I libri da cui vengono le schede. Sostituisce il campo works.importance.';

alter table public.works
  add column if not exists fonte_ids text[] not null default '{}';

comment on column public.works.fonte_ids is
  'Le fonti da cui viene la scheda. Elenco: la stessa opera puo'' stare in piu'' manuali.';

create index if not exists idx_works_fonte_ids on public.works using gin(fonte_ids);

-- L'ora dell'ultima modifica serve al caricamento incrementale: i client
-- chiedono solo cio' che e' cambiato dopo l'ultima esportazione.
drop trigger if exists trg_fonti_touch on public.fonti;
create trigger trg_fonti_touch before update on public.fonti
  for each row execute function touch_updated_at();

alter table public.fonti enable row level security;

-- Stessi permessi delle altre tabelle del catalogo: chiunque legge, scrivono
-- i due indirizzi amministratori.
drop policy if exists "Anyone can read fonti" on public.fonti;
create policy "Anyone can read fonti" on public.fonti
  for select to anon, authenticated using (true);

drop policy if exists "Admins can insert fonti" on public.fonti;
create policy "Admins can insert fonti" on public.fonti
  for insert to authenticated
  with check ((auth.jwt() ->> 'email') = any (array['hubarte@proton.me', 'atgio@proton.me']));

drop policy if exists "Admins can update fonti" on public.fonti;
create policy "Admins can update fonti" on public.fonti
  for update to authenticated
  using ((auth.jwt() ->> 'email') = any (array['hubarte@proton.me', 'atgio@proton.me']))
  with check ((auth.jwt() ->> 'email') = any (array['hubarte@proton.me', 'atgio@proton.me']));

drop policy if exists "Admins can delete fonti" on public.fonti;
create policy "Admins can delete fonti" on public.fonti
  for delete to authenticated
  using ((auth.jwt() ->> 'email') = any (array['hubarte@proton.me', 'atgio@proton.me']));

-- Le due fonti che il catalogo ha gia'. Il numero storico in `book` non e' il
-- volume: 1 e' il volume 2, 2 e 8 sono tutti e due il volume 3.
insert into public.fonti (id, titolo, autori, editore, anno, volume) values
  ('occhi-arte-2', 'Con gli occhi dell''arte',
   'E. Demartini, C. Gatti, E. Tonetti, E. P. Villa', 'Rizzoli Education', 2022, '2'),
  ('occhi-arte-3', 'Con gli occhi dell''arte',
   'E. Demartini, C. Gatti, E. Tonetti, E. P. Villa', 'Rizzoli Education', 2022, '3')
on conflict (id) do nothing;
