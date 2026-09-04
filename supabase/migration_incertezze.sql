-- ============================================================================
-- Le attribuzioni che restano aperte diventano una tabella.
--
-- Stavano in `public/data/incertezze.json`, un file del repository che nessuna
-- interfaccia sapeva modificare: tredici voci scritte a mano, tutte sul tema
-- della committenza. Un'incertezza motivata — «non si sa chi l'ha voluta, e
-- questa e' la ragione» — vale piu' di un campo vuoto, quindi merita una
-- tabella come le fonti, con la spunta nel drawer e la scheda nell'editor.
--
-- `id` e' l'id dell'opera: una scheda, un'incertezza.
-- ============================================================================
create table if not exists public.incertezze (
  id         text primary key,
  tema       text not null default 'attribuzione',
  nota       text not null,
  fonte      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.incertezze is
  'Attribuzioni e dati che restano aperti, con la nota che dice perche.';

drop trigger if exists trg_incertezze_touch on public.incertezze;
create trigger trg_incertezze_touch before update on public.incertezze
  for each row execute function touch_updated_at();

alter table public.incertezze enable row level security;

drop policy if exists "Chiunque puo leggere le incertezze" on public.incertezze;
create policy "Chiunque puo leggere le incertezze"
  on public.incertezze for select using (true);

drop policy if exists "Gli amministratori scrivono le incertezze" on public.incertezze;
create policy "Gli amministratori scrivono le incertezze"
  on public.incertezze for insert with check (
    (auth.jwt() ->> 'email') = any (array['hubarte@proton.me','hubarte@pm.me','atgio@proton.me'])
  );

drop policy if exists "Gli amministratori aggiornano le incertezze" on public.incertezze;
create policy "Gli amministratori aggiornano le incertezze"
  on public.incertezze for update using (
    (auth.jwt() ->> 'email') = any (array['hubarte@proton.me','hubarte@pm.me','atgio@proton.me'])
  ) with check (
    (auth.jwt() ->> 'email') = any (array['hubarte@proton.me','hubarte@pm.me','atgio@proton.me'])
  );

drop policy if exists "Gli amministratori tolgono le incertezze" on public.incertezze;
create policy "Gli amministratori tolgono le incertezze"
  on public.incertezze for delete using (
    (auth.jwt() ->> 'email') = any (array['hubarte@proton.me','hubarte@pm.me','atgio@proton.me'])
  );

-- Le tredici voci del file, seminate una volta sola: vedi il commit.
