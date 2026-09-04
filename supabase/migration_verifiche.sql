-- ============================================================================
-- Le schede verificate.
--
-- Il catalogo è di 1115 opere scritte a più riprese, e alcune hanno errori che
-- si vedono solo leggendole una per una: lo Spinario ellenistico archiviato
-- sotto l'Umanesimo fiorentino perché il manuale lo cita lì, un ritratto del
-- Fayyum con la fotografia di Nefertiti. Serve un modo di segnare che cosa è
-- già stato letto e controllato, altrimenti la revisione ricomincia da capo
-- ogni volta.
--
-- La tabella tiene una riga per entità verificata, non una colonna su `works`:
-- così non tocca il modello del catalogo (che l'app replica) e vale anche per
-- gli artisti, il giorno che servirà.
--
-- Lettura pubblica — la spunta non è un segreto e serve anche fuori dalla
-- dashboard; scrittura ai soli amministratori.
-- ============================================================================
create table if not exists public.verifiche (
  entity_type   text not null default 'work',
  entity_id     text not null,
  verificata_il timestamptz not null default now(),
  verificata_da text,
  nota          text,
  primary key (entity_type, entity_id)
);

comment on table public.verifiche is
  'Schede lette e controllate a mano: una riga per entità verificata.';

alter table public.verifiche enable row level security;

drop policy if exists "Chiunque puo leggere le verifiche" on public.verifiche;
create policy "Chiunque puo leggere le verifiche"
  on public.verifiche for select using (true);

drop policy if exists "Gli amministratori segnano le verifiche" on public.verifiche;
create policy "Gli amministratori segnano le verifiche"
  on public.verifiche for insert with check (
    (auth.jwt() ->> 'email') = any (array['hubarte@proton.me','hubarte@pm.me','atgio@proton.me'])
  );

drop policy if exists "Gli amministratori aggiornano le verifiche" on public.verifiche;
create policy "Gli amministratori aggiornano le verifiche"
  on public.verifiche for update using (
    (auth.jwt() ->> 'email') = any (array['hubarte@proton.me','hubarte@pm.me','atgio@proton.me'])
  ) with check (
    (auth.jwt() ->> 'email') = any (array['hubarte@proton.me','hubarte@pm.me','atgio@proton.me'])
  );

drop policy if exists "Gli amministratori tolgono le verifiche" on public.verifiche;
create policy "Gli amministratori tolgono le verifiche"
  on public.verifiche for delete using (
    (auth.jwt() ->> 'email') = any (array['hubarte@proton.me','hubarte@pm.me','atgio@proton.me'])
  );

create index if not exists idx_verifiche_tipo on public.verifiche(entity_type);
