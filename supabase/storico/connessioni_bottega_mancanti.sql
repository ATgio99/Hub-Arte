-- Connessioni di bottega mancanti individuate nel corpus scansionato
-- Verificate contro connections_rows.csv e contro connections_missing_from_scans_FINAL2.sql
-- Inserimenti idempotenti: rieseguibili senza creare duplicati.

BEGIN;

INSERT INTO public.connections
(id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT
  'andrea-verrocchio-botticelli-maestro-allievo',
  'artist', 'andrea-verrocchio', 'artist', 'botticelli',
  'maestro-allievo',
  'La bottega di Andrea Verrocchio ospita Sandro Botticelli; il testo indica Botticelli tra i giovani artisti che vi apprendono tecniche e soluzioni artistiche e parla esplicitamente di Verrocchio e dei suoi allievi.',
  now(), now(), NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist'
    AND c.source_id = 'andrea-verrocchio'
    AND c.target_type = 'artist'
    AND c.target_id = 'botticelli'
    AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections
(id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT
  'andrea-verrocchio-domenico-ghirlandaio-maestro-allievo',
  'artist', 'andrea-verrocchio', 'artist', 'domenico-ghirlandaio',
  'maestro-allievo',
  'Il testo indica Domenico Ghirlandaio tra i giovani artisti accolti nella bottega di Verrocchio, dove apprende diverse tecniche artistiche e soluzioni; il passaggio parla esplicitamente di Verrocchio e dei suoi allievi.',
  now(), now(), NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist'
    AND c.source_id = 'andrea-verrocchio'
    AND c.target_type = 'artist'
    AND c.target_id = 'domenico-ghirlandaio'
    AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections
(id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT
  'filippo-lippi-filippino-lippi-maestro-allievo',
  'artist', 'filippo-lippi', 'artist', 'filippino-lippi',
  'maestro-allievo',
  'Filippino Lippi si forma nella scuola del padre Filippo Lippi; dopo la morte del padre prosegue la formazione con Fra Diamante e successivamente con Botticelli.',
  now(), now(), NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist'
    AND c.source_id = 'filippo-lippi'
    AND c.target_type = 'artist'
    AND c.target_id = 'filippino-lippi'
    AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections
(id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT
  'fra-diamante-filippino-lippi-maestro-allievo',
  'artist', 'fra-diamante', 'artist', 'filippino-lippi',
  'maestro-allievo',
  'Dopo la morte di Filippo Lippi, Filippino passa a Firenze sotto la guida di Fra Diamante prima di entrare nella bottega di Botticelli.',
  now(), now(), NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist'
    AND c.source_id = 'fra-diamante'
    AND c.target_type = 'artist'
    AND c.target_id = 'filippino-lippi'
    AND c.kind = 'maestro-allievo'
);

COMMIT;

-- Nota: il file è idempotente. Se una delle connessioni esiste già,
-- la relativa INSERT viene semplicemente ignorata.
