-- ============================================================================
-- Normalizzazione delle tassonomie — 29 agosto 2026
-- ----------------------------------------------------------------------------
-- Riporta terms.category, techniques.category, connections.kind e periods.type
-- dentro gli elenchi chiusi dichiarati in src/lib/types.ts.
--
-- Da eseguire INSIEME alle modifiche al codice, che aggiungono:
--   TechCategory  += 'compositiva', 'decorativa'
--   ConnKind      += 'collaborazione', 'autore', 'luogo'
-- Eseguire questo script senza quelle modifiche lascerebbe fuori dai filtri
-- le 35 tecniche compositive/decorative e le 14 collaborazioni.
--
-- NOTA sulle 12 connessioni kind='autore': sono CONSERVATE. Il collegamento e'
-- ridondante (l'artista e' gia' in works.artist_ids), ma ciascuna porta una
-- descrizione scritta che il grafo generato non ha: Grafo.tsx controlla se la
-- connessione esiste gia' (riga ~374) e in tal caso usa quella salvata invece
-- di generarne una con la descrizione generica "Opera di X".
-- ============================================================================

BEGIN;

-- === 1. GLOSSARIO — 216 righe nelle 5 categorie previste ====================
-- 38 valori distinti diventano 4 (scultura resta invariata).
UPDATE public.terms SET category = 'architettura' WHERE category IN
  ('architettonico','decorazione','urbanistica','elemento decorativo','monumentale');
UPDATE public.terms SET category = 'iconografia' WHERE category IN
  ('iconografico','mitologico','astronomico','letterario','soggetto');
UPDATE public.terms SET category = 'pittura' WHERE category IN
  ('compositivo','composizione','prospettiva','prospettico','visivo','tecnico','cromatico');
-- tutto il resto (stilistico, storico, formale, culturale, ...) -> generale
UPDATE public.terms SET category = 'generale' WHERE category NOT IN
  ('architettura','pittura','scultura','iconografia','generale');

-- === 2. TECNICHE — 120 righe nelle 7 categorie (2 nuove) ===================
UPDATE public.techniques SET category = 'compositiva' WHERE category IN
  ('compositiva','composizione','prospettiva','illusionistica','iconografia');
UPDATE public.techniques SET category = 'decorativa' WHERE category IN
  ('decorativa','decorazione');
UPDATE public.techniques SET category = 'architettonica' WHERE category IN
  ('architettura','urbanistica','materiale','strutturale');
UPDATE public.techniques SET category = 'scultorea' WHERE category IN
  ('scultura','sculptural');
UPDATE public.techniques SET category = 'pittorica' WHERE category IN
  ('pittura','illuminazione','affresco','tecnica pittorica','luminosa','stile')
  OR id IN ('olio','tavola','graffitosgraffito');
-- restauro, disegno, 'corrente artistica', 'tipologia opera', 'cornice lignea'
UPDATE public.techniques SET category = 'altra' WHERE category NOT IN
  ('pittorica','scultorea','architettonica','musiva','compositiva','decorativa','altra');

-- === 3. CONNESSIONI — 28 righe ricondotte ai tipi previsti =================
-- 'collaborazione' (14 righe) non viene toccata: diventa un tipo legittimo.
-- 'autore' (12 righe) non viene toccata: vedi la nota in testa al file.
UPDATE public.connections SET kind = 'contrasto'      WHERE kind IN ('confronto','contemporaneita');
UPDATE public.connections SET kind = 'committenza'    WHERE kind = 'commissione';
UPDATE public.connections SET kind = 'influenza'      WHERE kind IN ('influenza-indiretta','contesto');
UPDATE public.connections SET kind = 'evoluzione'     WHERE kind IN ('sequenza','sostituzione','antecedente');
-- 'esempio' (3 righe: un'opera che esemplifica un concetto) non ha un
-- equivalente esatto fra i tipi previsti: 'rielaborazione' e' il piu' vicino.
UPDATE public.connections SET kind = 'rielaborazione' WHERE kind IN ('esempio','riferimento');

-- === 4. PERIODI — 5 righe ==================================================
UPDATE public.periods SET type = 'corrente' WHERE type IN ('movimento','movimento artistico');
UPDATE public.periods SET type = 'epoca'    WHERE type IN ('storico','politico');

COMMIT;

-- ============================================================================
-- VERIFICA — nessuna riga deve risultare fuori tassonomia.
-- ============================================================================
-- SELECT 'terms' t, category v, count(*) FROM terms GROUP BY category
-- UNION ALL SELECT 'techniques', category, count(*) FROM techniques GROUP BY category
-- UNION ALL SELECT 'connections', kind, count(*) FROM connections GROUP BY kind
-- UNION ALL SELECT 'periods', type, count(*) FROM periods GROUP BY type
-- ORDER BY 1, 3 DESC;
-- ============================================================================
