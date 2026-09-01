-- ============================================================================
-- Applicazione della Fase 2: le opere scendono nelle scuole — 31 agosto 2026
-- ----------------------------------------------------------------------------
-- Seguito di migration_terzo_livello_scuole.sql, che aveva introdotto il tipo
-- `scuola` lasciando pero' le opere ferme sui contenitori generici. Qui si
-- chiude quel lavoro: tutte le 1.115 opere sono state riesaminate una per una
-- (titolo, autore, citta', datazione) e assegnate al periodo piu' specifico che
-- le compete.
--
-- ESITO DELL'ESAME
--   315 opere spostate su una scuola o corrente gia' esistente
--   325 opere raccolte in 52 scuole nuove (botteghe, corti, cantieri)
--   463 opere confermate dov'erano, gia' alla collocazione piu' fine possibile
--    12 casi ambigui lasciati invariati, elencati in lavoro_scuole/casi_incerti.csv
--
-- Le opere senza alcun periodo passano da 55 a 3. I contenitori generici si
-- svuotano: Quattrocento da 115 opere proprie a 4, Rinascimento maturo da 96
-- a 43, Manierismo da 80 a 32.
--
-- COSA NON E' STATO CREATO
--   Delle 63 scuole proposte dall'esame ne sono state scartate 11 perche' non
--   erano botteghe o luoghi ma semplici fasi di un singolo artista (El Greco a
--   Toledo, Palladio, Durer maturo, Cappelle Medicee, Cappella Contarelli,
--   Pirro Ligorio, San Brizio, Vera Croce, Piero a Sansepolcro, Antonello in
--   Sicilia). Le loro 47 opere restano sul contenitore precedente.
--
-- MODIFICHE PARALLELE (da pubblicare insieme a questo script)
--   public/data/periods.json  +52 scuole, +2 correnti (Romanico iberico e
--                             Bizantino in Italia), 106 periodi in tutto
--   public/data/works.json    459 opere riassegnate
--   src/pages/Timeline.tsx    la fascia delle scuole parte nascosta: la vista
--                             d'insieme mostra epoche e correnti
--   src/pages/Periodo.tsx     "Cosa contiene" al posto della lista piatta, con
--                             le correnti annidate come sezioni proprie e il
--                             percorso della matrioska in evidenza
--
-- Le due correnti nuove servono a non lasciare nessuna scuola appesa a
-- un'epoca: Santiago de Compostela entra nel Romanico iberico (dove e' stata
-- spostata anche la Pittura catalana), la Scuola marciana nel Bizantino in
-- Italia, le botteghe di Gislebertus e Gelduinus nell'Arte cluniacense.
-- Verificato dopo l'applicazione: zero scuole senza una corrente sopra.
-- ============================================================================

-- Le 181 opere presenti in questa tabella sono state riassegnate con lo script
-- generato in lavoro_scuole/db_updates.sql (gia' eseguito il 31 agosto 2026).
-- Le altre 459 vivono solo nel JSON statico e sono state aggiornate li'.
-- Questo file resta come traccia della migrazione; ri-eseguirlo non serve.

-- Controllo di integrita' da rilanciare dopo ogni intervento sui periodi:
--   nessuna opera deve puntare a un periodo inesistente
--   (da valutare sull'insieme unito JSON + DB, non sul solo database)
SELECT w.id, w.period_id
FROM works w
WHERE w.period_id IS NOT NULL
  AND w.period_id NOT IN (SELECT id FROM periods);

-- ============================================================================
-- ANCORA DA FARE
--   1. Decidere i 12 casi incerti (lavoro_scuole/casi_incerti.csv) e le 3 opere
--      rimaste senza periodo.
--   2. Le tre scuole ancora senza opere proprie: verificare se vadano riempite
--      o eliminate.
--   3. Committenti: campo works.committente_ids e categoria "committenti" sugli
--      artisti — vedi il piano concordato.
-- ============================================================================
