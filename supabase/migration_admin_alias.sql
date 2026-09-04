-- ============================================================================
-- L'alias corto della casella di amministrazione.
--
-- `hubarte@pm.me` e `hubarte@proton.me` sono la stessa casella — pm.me e'
-- l'alias breve di ProtonMail — ma le regole confrontano stringhe, e l'alias
-- non era nell'elenco. Entrando con quello si lavorava da utente qualunque:
-- 185 correzioni alle fotografie delle opere sono rimaste private, visibili
-- solo a chi le aveva fatte, mentre a tutti gli altri restava l'immagine
-- sbagliata (il Cristo in maesta' di San Lorenzo fuori le Mura mostrava a
-- chiunque altro un ritratto fotografico di papa Pio IX).
--
-- Qui si aggiunge l'indirizzo a tutte le regole che gia' nominano quello
-- lungo, riscrivendo l'elenco e lasciando intatto il resto della condizione.
-- Idempotente: salta le regole che l'alias ce l'hanno gia'.
-- ============================================================================
do $$
declare
  p record;
  nuovo_qual text;
  nuovo_check text;
  quante int := 0;
begin
  for p in
    select schemaname, tablename, policyname, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and coalesce(qual,'') || coalesce(with_check,'') like '%hubarte@proton.me%'
      and coalesce(qual,'') || coalesce(with_check,'') not like '%hubarte@pm.me%'
  loop
    nuovo_qual  := replace(p.qual,       '''hubarte@proton.me''::text',
                                          '''hubarte@proton.me''::text, ''hubarte@pm.me''::text');
    nuovo_check := replace(p.with_check, '''hubarte@proton.me''::text',
                                          '''hubarte@proton.me''::text, ''hubarte@pm.me''::text');

    if p.qual is not null and p.with_check is not null then
      execute format('alter policy %I on %I.%I using (%s) with check (%s)',
                     p.policyname, p.schemaname, p.tablename, nuovo_qual, nuovo_check);
    elsif p.with_check is not null then
      execute format('alter policy %I on %I.%I with check (%s)',
                     p.policyname, p.schemaname, p.tablename, nuovo_check);
    else
      execute format('alter policy %I on %I.%I using (%s)',
                     p.policyname, p.schemaname, p.tablename, nuovo_qual);
    end if;
    quante := quante + 1;
  end loop;
  raise notice 'regole aggiornate: %', quante;
end $$;

-- ============================================================================
-- Via le correzioni private.
--
-- Sostituire la fotografia di un'opera e' cosa da amministratore, e vale per
-- tutti. La «correzione privata» — visibile al solo account che l'aveva fatta
-- — non esiste piu' nel sito: le regole che permettevano di scriverne una non
-- servono a nessuna funzione, restano solo a lasciare una porta aperta.
--
-- La lettura resta: le righe gia' scritte servono ancora, sono l'elenco delle
-- fotografie sbagliate da controllare una per una.
-- ============================================================================
drop policy if exists "Users can insert own private image overrides" on public.image_overrides;
drop policy if exists "Users can update own private image overrides" on public.image_overrides;
drop policy if exists "Users can delete own private image overrides" on public.image_overrides;
