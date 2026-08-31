-- ============================================================================
-- Terzo livello della timeline: epoca > corrente > scuola — 29 agosto 2026
-- ----------------------------------------------------------------------------
-- Il tipo `popolo` e' stato rimosso: non lo usava nessun periodo (0 su 52) ma
-- occupava una fascia nella timeline e un'opzione nell'editor. Al suo posto
-- entra `scuola`, il livello che mancava per rendere leggibile la matrioska.
--
-- REGOLA DI ASSEGNAZIONE
--   epoca    — la fascia maggiore: Tarda Antichita', Arte bizantina, Alto
--              Medioevo, Civilta' islamica, Romanico, Gotico, Rinascimento,
--              Barocco. Otto in tutto, sono le radici dell'albero.
--   corrente — un movimento o una fase non definita da un luogo (Tardogotico,
--              Duecento italiano, Manierismo, Controriforma) e i grandi rami
--              nazionali (Gotico italiano, francese, inglese, Romanico
--              italiano), che a loro volta contengono scuole: se fossero
--              anch'essi scuole la matrioska si romperebbe.
--   scuola   — un raggruppamento definito da un luogo, una corte o una bottega:
--              Scuola senese trecentesca, Umanesimo fiorentino, Scuola
--              ferrarese, Periodo sforzesco, Ars nova fiammingo-borgognona.
--
-- RISULTATO sull'insieme unito JSON+DB: 8 epoche, 32 correnti, 29 scuole.
-- Zero incoerenze gerarchiche: non esiste una corrente dentro una scuola.
--
-- MODIFICHE PARALLELE (da pubblicare insieme a questo script)
--   src/lib/types.ts        PeriodType: "popolo" -> "scuola"
--   src/pages/Timeline.tsx  tre fasce invece di due, un filtro per ciascuna,
--                           etichette Epoche / Correnti / Scuole
--   src/pages/AdminDatabase.tsx  menu a tendina di periods.type
--   public/data/periods.json     18 tipi ricalcolati
-- ============================================================================

BEGIN;

-- Scuole regionali del Quattrocento e del Cinquecento
UPDATE periods SET type = 'scuola' WHERE id IN (
  'quattrocento-veneziano','rinascimento-veneziano','scuola-ferrarese','rinascimento-padano',
  'rinascimento-lombardo','quattrocento-milanese','rinascimento-veronese','rinascimento-veneto',
  'rinascimento-veneto-maturo','rinascimento-mantovano','rinascimento-napoletano','sforzesco');

-- Fasi e movimenti non geografici: restano correnti
UPDATE periods SET type = 'corrente' WHERE id IN (
  'trecento','rinasc-nordico','eta-dellumanesimo','primo-rinascimento',
  'seconda-meta-del-quattrocento','manierismo','controriforma');

-- Barocco e' l'unica epoca presente nel database: le altre sette stanno nei JSON
UPDATE periods SET type = 'epoca' WHERE id = 'barocco';

COMMIT;

-- ============================================================================
-- ANCORA DA FARE
--   1. Assegnare le 1.115 opere al periodo piu' specifico che le compete.
--      Oggi i contenitori generici sono gonfi: Quattrocento ha 155 opere
--      proprie (di cui 55 fiorentine, che dovrebbero stare in Umanesimo o
--      Rinascimento fiorentino), Rinascimento maturo 99, Manierismo 92.
--      Restano inoltre 43 opere senza alcun periodo.
--   2. Solo DOPO l'assegnazione, eliminare le scuole rimaste vuote. Oggi sono
--      13, ma diverse si riempiranno: Rinascimento lombardo, veronese, veneto,
--      mantovano, napoletano, veneziano, Quattrocento milanese, Scuola
--      veneziana, Rinascimento padano e veneto maturo, piu' i tre doppioni
--      concettuali Trecento, Eta' dell'Umanesimo e Primo Rinascimento.
--   3. Da fondere: "Gotico cortese" (0 opere proprie) e "Gotico internazionale"
--      (8 opere) sono due nomi per la stessa cosa, separati nell'albero.
-- ============================================================================
