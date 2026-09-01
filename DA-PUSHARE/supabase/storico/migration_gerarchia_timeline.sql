-- ============================================================================
-- Gerarchia della timeline: epoche e periodi — 29 agosto 2026
-- ----------------------------------------------------------------------------
-- PROBLEMA. rootPeriod() in src/lib/data.ts determina le corsie della timeline
-- risalendo la catena dei parent_id fino alla radice. C'erano 28 radici, quindi
-- 28 corsie — di cui 21 contenevano un solo periodo. "Periodo padovano di
-- Mantegna" (11 anni) aveva una corsia sua accanto a "Gotico" (260 anni).
--
-- E il campo `type` era scorrelato dall'albero, esattamente al contrario:
--   Romanico, Gotico, Rinascimento  → marcati 'corrente'  (ma sono le epoche)
--   Quattrocento, Rinascimento maturo → marcati 'epoca'   (ma stanno sotto)
--
-- REGOLA ADOTTATA
--   `epoca`    = radice dell'albero, cioe' una corsia della timeline
--   `corrente` = tutto cio' che sta dentro una corsia
--
-- RISULTATO: 8 corsie.
--   284-476   Tarda Antichita'     1 periodo sotto
--   330-1453  Arte bizantina       0   (area culturale parallela, non in successione)
--   476-1000  Alto Medioevo        5   <- epoca NUOVA, aggiunta in periods.json
--   622-1200  Civilta' islamica    0   (idem)
--   950-1200  Romanico             7
--   1140-1400 Gotico              20
--   1400-1600 Rinascimento        28
--   1590-1750 Barocco              0
--
-- NESSUNA OPERA E' STATA TOCCATA: solo parent_id e type dei periodi.
-- Verificato dopo l'esecuzione: 286 opere nel DB, 974 nei JSON, zero opere
-- che puntano a un periodo inesistente.
--
-- ATTENZIONE: questo script copre solo i periodi del DATABASE. I periodi dei
-- JSON (Romanico, Gotico, Rinascimento, i cinque altomedievali, Alto Medioevo)
-- sono stati modificati in public/data/periods.json, che va pubblicato insieme.
-- ============================================================================

BEGIN;

-- === Periodi che diventano figli ============================================
UPDATE periods SET parent_id = 'gotico'              WHERE id = 'trecento';
UPDATE periods SET parent_id = 'rinascimento'        WHERE id IN
  ('eta-dellumanesimo','primo-rinascimento','rinasc-nordico');
UPDATE periods SET parent_id = 'quattrocento'        WHERE id IN
  ('quattrocento-veneziano','rinascimento-veneto','rinascimento-veneziano',
   'rinascimento-lombardo','quattrocento-milanese','rinascimento-veronese',
   'rinascimento-padano','seconda-meta-del-quattrocento');
UPDATE periods SET parent_id = 'rinascimento-maturo' WHERE id = 'rinascimento-veneto-maturo';

-- === Il campo type torna coerente con l'albero ==============================
-- Nel DB l'unica epoca-radice e' Barocco: le altre sette corsie stanno nei JSON.
UPDATE periods SET type = 'corrente' WHERE id <> 'barocco' AND type <> 'corrente';
UPDATE periods SET type = 'epoca'    WHERE id = 'barocco';

-- === Le due fasi biografiche di Mantegna escono dai periodi =================
-- Non sono periodi artistici ma tappe di una carriera. Entrambe completamente
-- vuote: zero opere, zero artisti, zero termini, zero connessioni (verificato
-- prima della cancellazione). L'informazione va semmai nella scheda di Mantegna.
DELETE FROM periods WHERE id IN
  ('periodo-padovano-di-mantegna','periodo-mantovano-di-mantegna');

COMMIT;

-- ============================================================================
-- MODIFICHE PARALLELE IN public/data/periods.json
--   + nuova epoca `alto-medioevo` (476-1000)
--   + parent_id: regno-ostrogoto, eta-giustinianea, eta-longobarda,
--     eta-carolingia, arte-ottoniana  → alto-medioevo
--     arte-tedesca-quattrocento       → rinasc-nordico
--   + type ricalcolato su 14 periodi secondo la regola epoca/corrente
--
-- VERIFICA FINALE
--   SELECT count(*) FROM periods WHERE type='epoca' AND parent_id IS NOT NULL;  -- 0
--   SELECT count(*) FROM periods WHERE type='corrente' AND parent_id IS NULL;   -- 0
--   albero unito: 69 periodi, 8 radici, profondita' massima 4 livelli
-- ============================================================================
