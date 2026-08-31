-- ============================================================================
-- Riordino della timeline — 29 agosto 2026
-- ----------------------------------------------------------------------------
-- PROBLEMA. La timeline aveva 44 radici invece di 12. I JSON portano una
-- gerarchia pulita (Tarda Antichita' > Romanico > Gotico > Rinascimento) in cui
-- quasi ogni periodo ha un padre; le 33 righe del DB ne aggiungevano 32 SENZA
-- padre, che finivano allo stesso livello del Romanico. Cosi' "Regno di Renato
-- d'Angio' a Napoli" (7 anni) compariva accanto a "Gotico" (260 anni).
--
-- Nella tabella periods convivevano quattro cose diverse:
--   - periodi artistici veri        (Manierismo, Barocco, Rinascimento nordico)
--   - CORTI, SIGNORIE, REGNI        (Signoria degli Este, Eta' gonzaghesca...)
--   - FASI DELLA CARRIERA di un artista (Periodo padovano di Mantegna)
--   - SCUOLE REGIONALI duplicate    (5 etichette venete, 5 ferraresi, 5 napoletane)
--
-- CRITERIO ADOTTATO
--   il PERIODO ARTISTICO resta nella timeline, appeso a un padre;
--   la CORTE esce dai periodi e diventa raggruppamento nella pagina Committenti;
--   il DOPPIONE sparisce.
-- ============================================================================

BEGIN;

-- === 1. Restituire i due padri cancellati dal merge =========================
-- Le righe del DB avevano parent_id NULL e vincevano sul JSON: 46 opere
-- risalivano in cima alla timeline invece di stare sotto Rinascimento.
-- E' il bug del merge che sovrascrive con valori vuoti, visto all'opera.
UPDATE periods SET parent_id = 'rinascimento' WHERE id = 'manierismo';
UPDATE periods SET parent_id = 'manierismo'   WHERE id = 'controriforma';

-- === 2. Le 10 opere ferraresi al periodo con gli anni giusti ================
-- Vanno dal 1455 al 1493 (Salone dei Mesi, Palazzo dei Diamanti, cerchia di
-- Cossa e Tura). "Signoria degli Este" copre 1242-1598: descrive la dinastia,
-- non le opere. "Scuola ferrarese" copre 1440-1500.
UPDATE works SET period_id = 'scuola-ferrarese'
WHERE period_id = 'signoria-degli-este-a-ferrara';

-- === 3. I tre periodi regionali restano, appesi al Quattrocento =============
UPDATE periods SET parent_id = 'quattrocento', type = 'corrente'
WHERE id IN ('scuola-ferrarese','rinascimento-napoletano','rinascimento-mantovano');

-- === 4. Le sei corti escono dai periodi =====================================
-- Diventano il raggruppamento della pagina Committenti. Nessuna ha piu' opere
-- collegate dopo il passo 2.
DELETE FROM periods WHERE id IN (
  'signoria-degli-este-a-ferrara',           -- 1242-1598, dinastia estense
  'eta-gonzaghesca',                          -- 1328-1707, dinastia gonzaghesca
  'napoli-aragonese',                         -- 1443-1495, contiene i due regni sotto
  'regno-di-alfonso-daragona',                -- 1443-1458, prima meta' del precedente
  'regno-di-ferdinando-i-daragona-ferrante',  -- 1458-1494, seconda meta'
  'regno-di-renato-dangio-a-napoli');         -- 1435-1442

-- === 5. I cinque doppioni spariscono ========================================
--   rinascimento-ferrarese            = scuola-ferrarese (anni identici 1440-1500)
--   officina-ferrarese                = esiste gia' come termine nel glossario
--   rinascimento-eccentrico-ferrarese = variante della scuola ferrarese
--   rinascimento-aragonese            = rinascimento-napoletano
--   eta-gonzaghesca-a-mantova         = eta-gonzaghesca (i Gonzaga stavano a Mantova)
DELETE FROM periods WHERE id IN (
  'rinascimento-ferrarese','officina-ferrarese','rinascimento-eccentrico-ferrarese',
  'rinascimento-aragonese','eta-gonzaghesca-a-mantova');

-- === 6. I due riferimenti rimasti appesi ====================================
UPDATE artists
SET period_ids = array_replace(period_ids, 'signoria-degli-este-a-ferrara', 'scuola-ferrarese')
WHERE 'signoria-degli-este-a-ferrara' = any(period_ids);   -- Cosme' Tura

-- La committenza di Borso d'Este puntava al periodo "Officina ferrarese", ma la
-- descrizione parla del ciclo della Sala dei Mesi, che e' un'opera in catalogo.
-- Diventa una delle poche committenze che puntano a un'opera specifica: da 6 a 8.
UPDATE connections SET target_type = 'work', target_id = 'ciclo-dei-mesi-salone-dei-mesi'
WHERE id = 'borso-deste-officina-ferrarese-committenza';

COMMIT;

-- ============================================================================
-- RISULTATO: periodi nel DB da 33 a 22, zero riferimenti residui agli eliminati.
-- "sforzesco" e' rimasto intatto: e' l'unica corte gia' fatta bene, con una
-- sintesi vera, 5 opere e il padre umanesimo-lombardo. E' il modello da seguire.
--
-- RESTA DA FARE — le altre scuole regionali vuote, con lo stesso criterio:
--   venete   : rinascimento-veneto, rinascimento-veneto-maturo,
--              rinascimento-veneziano, quattrocento-veneziano (5 opere), scuola-veneziana
--   lombarde : rinascimento-lombardo, quattrocento-milanese
--   altre    : rinascimento-veronese, rinascimento-padano, trecento (doppione di
--              trecento-italiano), primo-rinascimento, eta-dellumanesimo,
--              seconda-meta-del-quattrocento (1 opera)
--   fasi di un artista: periodo-padovano-di-mantegna, periodo-mantovano-di-mantegna
--              — non sono periodi: semmai informazione nella scheda di Mantegna.
-- ============================================================================
