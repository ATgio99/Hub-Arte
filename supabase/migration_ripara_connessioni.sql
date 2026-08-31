-- ============================================================================
-- Riparazione dei collegamenti rotti del Grafo — 29 agosto 2026
-- ----------------------------------------------------------------------------
-- I 67 riferimenti che puntavano a entita' inesistenti si sono rivelati di
-- tre nature diverse, non una sola:
--   31  ALIAS          — l'entita' esiste con un id diverso ("michelangelo"
--                        invece di "michelangelo-buonarroti")
--   35  MANCANTI       — l'entita' non e' mai stata creata. Sono quasi tutti
--                        COMMITTENTI: papi, sovrani, cardinali, banchieri.
--                        Non toccati da questo script: vanno creati a mano.
--    1  TIPO ERRATO    — id valido ma dichiarato con il tipo sbagliato
--
-- Due verifiche hanno cambiato il piano iniziale:
--  a) 5 delle 31 rimappature avrebbero creato DOPPIONI con una connessione
--     gia' esistente, ciascuno con una descrizione diversa e complementare.
--     Le descrizioni sono state fuse e la riga superflua eliminata.
--  b) 11 connessioni su 85 avevano la DIREZIONE invertita. Solo 3 sono
--     correggibili adesso: le altre 8 hanno un estremo fra le entita'
--     mancanti e vanno sistemate insieme a quelle.
-- ============================================================================

BEGIN;

-- === FASE 1 — fusione descrizioni e rimozione doppioni =====================
-- 1a. Doppioni che la rimappatura avrebbe creato (5 coppie)
UPDATE connections SET description =
 'Nel 1512 Pontormo entra nella bottega di Andrea del Sarto e ne assorbe soprattutto gli equilibrati schemi compositivi. Prende parte con lui alle decorazioni del chiostrino dell''Annunziata e della camera Borgherini.'
 WHERE id='andrea-del-sarto-jacopo-pontormo-maestro-allievo';
UPDATE connections SET description =
 'Influenza della cultura padovana e della prospezione spaziale di Mantegna sull''opera di Tura, visibile nella sapienza antiquaria e nella ricerca di profondità spaziale nelle ante dell''organo. Tura entra in contatto con l''opera di Mantegna durante il soggiorno veneziano (1450-1456).'
 WHERE id='andrea-mantegna-cosme-tura-influenza';
UPDATE connections SET description =
 'Forte influenza del cognato Mantegna sulle opere giovanili di Bellini, con ripresa della linea acuita, delle forme tese e della tensione emotiva; percepibile in particolare nella Pietà, nelle linee di contorno evidenziate.'
 WHERE id='andrea-mantegna-giovanni-bellini-influenza';
UPDATE connections SET description =
 'Pontormo collaborò con Rosso Fiorentino nella predella dell''Annunciazione di Andrea del Sarto a San Gallo e, con lo stesso Andrea del Sarto, alle decorazioni del chiostrino dell''Annunziata, contribuendo alla cosiddetta scuola della Santissima Annunziata.'
 WHERE id='jacopo-pontormo-rosso-fiorentino-collaborazione';
UPDATE connections SET description =
 'Pontormo svolge un alunnato presso Piero di Cosimo durante la formazione fiorentina, avviata nelle botteghe di Leonardo e di Piero di Cosimo.'
 WHERE id='piero-di-cosimo-jacopo-pontormo-maestro-allievo';

-- 1b. Doppioni gia' presenti nel dataset, non causati dalla rimappatura (3)
UPDATE connections SET description =
 'La Trinità di El Greco rivela la conoscenza della Pietà Bandini di Michelangelo; più in generale la sua pittura risente dell''esempio dei maestri del Rinascimento e del Manierismo italiano.'
 WHERE id='michelangelo-buonarroti-el-greco-influenza';
UPDATE connections SET description =
 'La pittura di El Greco risente dell''esempio di Tintoretto, tra i maestri veneziani studiati durante il soggiorno a Venezia.'
 WHERE id='el-greco-tintoretto-influenza';
UPDATE connections SET description =
 'La pittura di El Greco risente dell''esempio di Tiziano, incontrato durante gli anni trascorsi in Italia, in particolare nel soggiorno veneziano.'
 WHERE id='el-greco-tiziano-vecellio-influenza';

DELETE FROM connections WHERE id IN (
  'andrea-del-sarto-pontormo-maestro-allievo','mantegna-cosme-tura-influenza',
  'mantegna-giovanni-bellini-influenza','pontormo-rosso-fiorentino-collaborazione',
  'piero-di-cosimo-pontormo-maestro-allievo','el-greco-michelangelo-buonarroti-influenza',
  'conn-el-greco-tintoretto','conn-el-greco-tiziano');

-- === FASE 2 — rimappatura dei 31 alias =====================================
-- Ricavati dal campo `aka` e dai nomi, non da somiglianza fra stringhe: il
-- matching automatico produceva errori gravi (Cosimo il Vecchio confuso con
-- Cosimo I, due secoli di distanza; un cardinale confuso con un pittore).
WITH alias(tipo, vecchio, nuovo) AS (VALUES
 ('artist','botticelli','sandro-botticelli'),('artist','michelangelo','michelangelo-buonarroti'),
 ('artist','cellini','benvenuto-cellini'),('artist','mantegna','andrea-mantegna'),
 ('artist','perugino','pietro-perugino'),('artist','pontormo','jacopo-pontormo'),
 ('artist','jacopo-barozzi-vignola','jacopo-vignola'),('artist','pellegrino-tibaldi','tibaldi'),
 ('artist','michelozzo','michelozzo-michelozzi'),('artist','giulio-cesare-procaccini','procaccini-giulio'),
 ('artist','juan-fernandez-de-navarrete','el-mudo'),('artist','luca-cambiaso','cambiaso'),
 ('artist','francesco-primaticcio','primaticcio'),('artist','squarcione','francesco-squarcione'),
 ('artist','pordenone','giovanni-antonio-pordenone'),('artist','raffaello','raffaello-sanzio'),
 ('artist','barthelemy-deyck','barthelemy-d-eyck'),('artist','bartholomaeus-spranger','spranger'),
 ('artist','giuseppe-arcimboldo','arcimboldo'),('artist','giuseppe-heintz-il-vecchio','heintz-vecchio'),
 ('artist','hans-von-aachen','von-aachen'),
 ('work','basilica-palladiana','basilica-palladiana-vicenza'),
 ('work','teatro-olimpico-di-vicenza','teatro-olimpico-vicenza-palladio-scamozzi'),
 ('work','libreria-di-sansovino','libreria-marciana-sansovino'),
 ('work','i-quattro-libri-dell-architettura','quattro-libri-architettura-palladio'),
 ('work','pala-di-san-zeno','pala-di-san-zeno-mantegna'),
 ('work','villa-barbaro-a-maser','villa-barbaro-maser-palladio'),
 ('work','villa-d-este','villa-este-tivoli-ligorio'),
 ('work','convito-in-casa-di-levi','convito-casa-levi-veronese'),
 ('work','ultima-cena-tintoretto','ultima-cena-tintoretto-san-giorgio'),
 ('work','camera-degli-sposi','decorazione-della-camera-degli-sposi'))
UPDATE connections c SET
  source_id = COALESCE((SELECT nuovo FROM alias WHERE tipo=c.source_type AND vecchio=c.source_id), c.source_id),
  target_id = COALESCE((SELECT nuovo FROM alias WHERE tipo=c.target_type AND vecchio=c.target_id), c.target_id)
WHERE EXISTS (SELECT 1 FROM alias WHERE tipo=c.source_type AND vecchio=c.source_id)
   OR EXISTS (SELECT 1 FROM alias WHERE tipo=c.target_type AND vecchio=c.target_id);

-- === FASE 3 — direzioni invertite ==========================================
-- Convenzione: origine = chi influenza / il maestro / il committente / cio'
-- che viene prima. Sette delle undici inversioni avevano un'opera palladiana
-- come origine quando doveva essere destinazione: chi ha inserito i dati ha
-- ragionato "da Palladio verso i suoi modelli", al contrario della convenzione.
UPDATE connections SET
  source_type=target_type, source_id=target_id, target_type=source_type, target_id=source_id
WHERE id IN (
  'basilica-palladiana-libreria-di-sansovino-influenza',  -- la Libreria (1537) precede la Basilica
  'villa-barbaro-a-maser-villa-d-este-influenza',         -- Villa Barbaro guarda a Villa d'Este
  'conn-tibaldi-michelangelo');                           -- "Tibaldi studia l'opera di Michelangelo"

-- La Saliera non e' una committenza DI Cellini: e' opera sua. Il committente
-- reale, Francesco I di Valois, e' fra le entita' mancanti.
UPDATE connections SET kind='autore' WHERE id='conn-cellini-francesco-i';

-- === FASE 4 — tipo errato ==================================================
-- "Ritratto virile (Ritratto d'ignoto marinaio)" e' un'opera, non una tecnica.
UPDATE connections SET target_type='work'
WHERE id='nuovo-msncmarc' AND target_id='ritratto-virile-ritratto-dignoto-marinaio';

COMMIT;

-- ============================================================================
-- RESTA DA FARE — le 35 entita' mancanti
-- ----------------------------------------------------------------------------
-- Committenti:  accademia-olimpica, agostino-chigi, alessandro-farnese,
--   ascanio-sforza, carlo-borromeo, cosimo-de-medici (il Vecchio),
--   federico-borromeo, federico-ii-gonzaga, filippo-ii-di-spagna,
--   francesco-i-de-medici, francesco-i-di-valois, gian-giorgio-trissino,
--   giovan-battista-suardi, giulio-ii-della-rovere, ippolito-ii-deste,
--   leonardo-buonafede, ludovico-capponi, ludovico-il-moro,
--   pier-francesco-orsini, piero-il-gottoso, rodolfo-ii-dasburgo
-- Artisti:  antonio-badile, battista-naldini, dario-da-treviso,
--   domenico-brusasorci, fra-paolino, giorgio-schiavone, luca-fancelli,
--   marco-zoppo, mariotto-albertinelli
-- Opere:  de-architectura (Vitruvio), teatro-di-marcello, tempio-di-portuno,
--   ultima-cena-tiziano-vecellio, villa-giulia
--
-- Le 8 direzioni ancora invertite dipendono da queste entita':
--   basilica-palladiana-teatro-di-marcello-influenza
--   villa-barbaro-a-maser-tempio-di-portuno-influenza
--   villa-barbaro-a-maser-villa-giulia-influenza
--   i-quattro-libri-dell-architettura-de-architectura-rielaborazione
--   teatro-olimpico-di-vicenza-de-architectura-rielaborazione
--   convito-in-casa-di-levi-ultima-cena-tiziano-evoluzione
--   conn-cerano-borromeo
--   (piu' conn-el-greco-filippo-ii, committenza senza il committente)
--
-- ALTRO DA VERIFICARE: le connessioni giovanni-bellini-giorgione-influenza e
-- giovanni-bellini-giorgione-maestro-allievo hanno i `kind` scambiati fra loro
-- rispetto al proprio id.
-- ============================================================================
