-- Connessioni aggiuntive relative a Francesco Squarcione
-- Verificate rispetto alle connessioni già presenti nel CSV.
-- Le connessioni già esistenti (Squarcione -> Mantegna e Squarcione -> Cosme Tura)
-- NON vengono reinserite.

BEGIN;

INSERT INTO connections (
  id, source_type, source_id, target_type, target_id, kind,
  description, created_at, updated_at, modified_by, sort_order
)
SELECT
  'francesco-squarcione-marco-zoppo-maestro-allievo',
  'artist', 'francesco-squarcione',
  'artist', 'marco-zoppo',
  'maestro-allievo',
  'Marco Zoppo è indicato tra gli artisti formati nella bottega di Francesco Squarcione.',
  NOW(), NOW(), NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM connections c
  WHERE c.source_type = 'artist'
    AND c.source_id = 'francesco-squarcione'
    AND c.target_type = 'artist'
    AND c.target_id = 'marco-zoppo'
    AND c.kind = 'maestro-allievo'
);

INSERT INTO connections (
  id, source_type, source_id, target_type, target_id, kind,
  description, created_at, updated_at, modified_by, sort_order
)
SELECT
  'francesco-squarcione-giorgio-schiavone-maestro-allievo',
  'artist', 'francesco-squarcione',
  'artist', 'giorgio-schiavone',
  'maestro-allievo',
  'Giorgio Schiavone è documentato nell''ambiente di Squarcione a Padova e viene indicato tra i suoi allievi e collaboratori.',
  NOW(), NOW(), NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM connections c
  WHERE c.source_type = 'artist'
    AND c.source_id = 'francesco-squarcione'
    AND c.target_type = 'artist'
    AND c.target_id = 'giorgio-schiavone'
    AND c.kind = 'maestro-allievo'
);

INSERT INTO connections (
  id, source_type, source_id, target_type, target_id, kind,
  description, created_at, updated_at, modified_by, sort_order
)
SELECT
  'francesco-squarcione-dario-da-treviso-maestro-allievo',
  'artist', 'francesco-squarcione',
  'artist', 'dario-da-treviso',
  'maestro-allievo',
  'Dario da Treviso è indicato tra gli artisti formati nell''ambiente della bottega di Francesco Squarcione.',
  NOW(), NOW(), NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM connections c
  WHERE c.source_type = 'artist'
    AND c.source_id = 'francesco-squarcione'
    AND c.target_type = 'artist'
    AND c.target_id = 'dario-da-treviso'
    AND c.kind = 'maestro-allievo'
);

INSERT INTO connections (
  id, source_type, source_id, target_type, target_id, kind,
  description, created_at, updated_at, modified_by, sort_order
)
SELECT
  'francesco-squarcione-carlo-crivelli-influenza',
  'artist', 'francesco-squarcione',
  'artist', 'carlo-crivelli',
  'influenza',
  'Carlo Crivelli è collegato all''ambiente padovano di Squarcione; il rapporto è più prudentemente classificato come influenza/formazione piuttosto che come rapporto maestro-allievo certo.',
  NOW(), NOW(), NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM connections c
  WHERE c.source_type = 'artist'
    AND c.source_id = 'francesco-squarcione'
    AND c.target_type = 'artist'
    AND c.target_id = 'carlo-crivelli'
    AND c.kind = 'influenza'
);

-- Il rapporto Donatello-Squarcione è trattato come influenza, non come maestro-allievo.
INSERT INTO connections (
  id, source_type, source_id, target_type, target_id, kind,
  description, created_at, updated_at, modified_by, sort_order
)
SELECT
  'donatello-francesco-squarcione-influenza',
  'artist', 'donatello',
  'artist', 'francesco-squarcione',
  'influenza',
  'La cultura padovana di Squarcione si sviluppa anche attraverso il confronto con la scultura di Donatello e con le opere realizzate dall''artista durante il soggiorno padovano.',
  NOW(), NOW(), NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM connections c
  WHERE c.source_type = 'artist'
    AND c.source_id = 'donatello'
    AND c.target_type = 'artist'
    AND c.target_id = 'francesco-squarcione'
    AND c.kind = 'influenza'
);

COMMIT;
