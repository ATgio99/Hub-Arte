-- SUPABASE CONNECTIONS AUDIT — COMPLETE SCANNED CORPUS
-- 8 PDFs / 391 pages. Existing CSV: 110 rows.
-- Second full audit completed: removed 1 misattributed relation.
-- This file contains only connections not already present in the CSV,
-- after exact duplicate elimination and a second-pass relation-cue audit.
-- Each INSERT is idempotent via NOT EXISTS on source/target/kind.
BEGIN;

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'agostino-chigi-raffaello-sanzio-committenza', 'artist', 'agostino-chigi', 'artist', 'raffaello-sanzio', 'committenza', 'Il banchiere Agostino Chigi commissiona a Raffaello la decorazione della propria villa sul Tevere, la futura Farnesina, compreso il Trionfo di Galatea.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'agostino-chigi' AND c.target_type = 'artist' AND c.target_id = 'raffaello-sanzio' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'agostino-chigi-sebastiano-del-piombo-committenza', 'artist', 'agostino-chigi', 'artist', 'sebastiano-del-piombo', 'committenza', 'Sebastiano del Piombo è chiamato a Roma nel 1511 dal banchiere e mecenate Agostino Chigi e partecipa alla decorazione di villa Chigi detta Farnesina.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'agostino-chigi' AND c.target_type = 'artist' AND c.target_id = 'sebastiano-del-piombo' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'albrecht-durer-michael-wolgemut-maestro-allievo', 'artist', 'albrecht-durer', 'artist', 'michael-wolgemut', 'maestro-allievo', 'Albrecht Dürer svolge l''apprendistato nella bottega del pittore e incisore Michael Wolgemut.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'albrecht-durer' AND c.target_type = 'artist' AND c.target_id = 'michael-wolgemut' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'alessandro-farnese-jacopo-barozzi-vignola-committenza', 'artist', 'alessandro-farnese', 'artist', 'jacopo-barozzi-vignola', 'committenza', 'La costruzione della chiesa del Gesù viene promossa dal cardinale Alessandro Farnese e affidata all''architetto Jacopo Barozzi detto Vignola.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'alessandro-farnese' AND c.target_type = 'artist' AND c.target_id = 'jacopo-barozzi-vignola' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'andrea-del-sarto-pontormo-maestro-allievo', 'artist', 'andrea-del-sarto', 'artist', 'pontormo', 'maestro-allievo', 'Pontormo prende parte con Andrea del Sarto alle decorazioni del chiostrino dell''Annunziata e della camera Borgherini ed è indicato come suo allievo.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'andrea-del-sarto' AND c.target_type = 'artist' AND c.target_id = 'pontormo' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'andrea-del-sarto-rosso-fiorentino-maestro-allievo', 'artist', 'andrea-del-sarto', 'artist', 'rosso-fiorentino', 'maestro-allievo', 'Rosso Fiorentino si forma alla scuola di Andrea del Sarto e lavora con lui agli affreschi della Vita della Vergine.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'andrea-del-sarto' AND c.target_type = 'artist' AND c.target_id = 'rosso-fiorentino' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'andrea-mantegna-correggio-maestro-allievo', 'artist', 'andrea-mantegna', 'artist', 'correggio', 'maestro-allievo', 'Correggio completa la propria formazione a Mantova presso Mantegna, dal quale assimila le novità prospettiche della Camera degli Sposi e l''interesse per i soggetti antichi.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'andrea-mantegna' AND c.target_type = 'artist' AND c.target_id = 'correggio' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'andrea-palladio-vincenzo-scamozzi-influenza', 'artist', 'andrea-palladio', 'artist', 'vincenzo-scamozzi', 'influenza', 'Vincenzo Scamozzi è indicato come il più importante degli immediati seguaci di Andrea Palladio e porta a compimento opere avviate dal maestro.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'andrea-palladio' AND c.target_type = 'artist' AND c.target_id = 'vincenzo-scamozzi' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'andrea-verrocchio-botticelli-influenza', 'artist', 'andrea-verrocchio', 'artist', 'botticelli', 'influenza', 'Botticelli completa la propria formazione avvicinandosi alla bottega di Verrocchio e riprendendone la maggiore solidità delle figure.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'andrea-verrocchio' AND c.target_type = 'artist' AND c.target_id = 'botticelli' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'andrea-verrocchio-leonardo-da-vinci-maestro-allievo', 'artist', 'andrea-verrocchio', 'artist', 'leonardo-da-vinci', 'maestro-allievo', 'La bottega di Verrocchio ospita Leonardo, insieme ad altri giovani artisti che apprendono diverse tecniche artistiche.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'andrea-verrocchio' AND c.target_type = 'artist' AND c.target_id = 'leonardo-da-vinci' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'andrea-verrocchio-pietro-perugino-maestro-allievo', 'artist', 'andrea-verrocchio', 'artist', 'pietro-perugino', 'maestro-allievo', 'Pietro Perugino entra nella bottega di Andrea Verrocchio, dove sviluppa un disegno grafico più nitido attraverso lo studio dell''anatomia e del disegno dal vero.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'andrea-verrocchio' AND c.target_type = 'artist' AND c.target_id = 'pietro-perugino' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'ascanio-sforza-donato-bramante-committenza', 'artist', 'ascanio-sforza', 'artist', 'donato-bramante', 'committenza', 'Il Cristo alla colonna di Bramante è indicato come forse commissionato da Ascanio Sforza per l''abbazia di Chiaravalle.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'ascanio-sforza' AND c.target_type = 'artist' AND c.target_id = 'donato-bramante' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'baccio-bandinelli-bartolomeo-ammannati-maestro-allievo', 'artist', 'baccio-bandinelli', 'artist', 'bartolomeo-ammannati', 'maestro-allievo', 'Bartolomeo Ammannati è indicato come allievo di Baccio Bandinelli e, dopo la sua morte, utilizza il modello fornito da Bandinelli per la Fontana del Nettuno.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'baccio-bandinelli' AND c.target_type = 'artist' AND c.target_id = 'bartolomeo-ammannati' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'beato-angelico-benozzo-gozzoli-collaborazione', 'artist', 'beato-angelico', 'artist', 'benozzo-gozzoli', 'collaborazione', 'Benozzo Gozzoli lavora con Beato Angelico nella decorazione della cappella Niccolina, insieme ad altri allievi e collaboratori.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'beato-angelico' AND c.target_type = 'artist' AND c.target_id = 'benozzo-gozzoli' AND c.kind = 'collaborazione'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'beato-angelico-benozzo-gozzoli-maestro-allievo', 'artist', 'beato-angelico', 'artist', 'benozzo-gozzoli', 'maestro-allievo', 'Benozzo Gozzoli si forma, secondo Vasari, come allievo di Beato Angelico e collabora con lui agli affreschi del convento di San Marco.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'beato-angelico' AND c.target_type = 'artist' AND c.target_id = 'benozzo-gozzoli' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'benvenuto-cellini-giambologna-influenza', 'artist', 'benvenuto-cellini', 'artist', 'giambologna', 'influenza', 'Il Mercurio di Giambologna mostra di aver fatto tesoro delle invenzioni di Benvenuto Cellini, soprattutto nella posa instabile e nella torsione serpentinata e nel virtuosismo della fusione.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'benvenuto-cellini' AND c.target_type = 'artist' AND c.target_id = 'giambologna' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'bergognone-vincenzo-foppa-influenza', 'artist', 'bergognone', 'artist', 'vincenzo-foppa', 'influenza', 'Bergognone dimostra una particolare conoscenza della pittura di Vincenzo Foppa, arricchita dall''influenza dell''arte d''Oltralpe e provenzale-ligure.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'bergognone' AND c.target_type = 'artist' AND c.target_id = 'vincenzo-foppa' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'bernardo-rossellino-leon-battista-alberti-collaborazione', 'artist', 'bernardo-rossellino', 'artist', 'leon-battista-alberti', 'collaborazione', 'Bernardo Rossellino probabilmente lavora accanto a Leon Battista Alberti nel cantiere di Palazzo Rucellai.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'bernardo-rossellino' AND c.target_type = 'artist' AND c.target_id = 'leon-battista-alberti' AND c.kind = 'collaborazione'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'bernardo-rossellino-filippo-brunelleschi-influenza', 'artist', 'bernardo-rossellino', 'artist', 'filippo-brunelleschi', 'influenza', 'Bernardo Rossellino subisce l''influenza di Brunelleschi nell''attività di architetto.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'bernardo-rossellino' AND c.target_type = 'artist' AND c.target_id = 'filippo-brunelleschi' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'bernardo-rossellino-leon-battista-alberti-influenza', 'artist', 'bernardo-rossellino', 'artist', 'leon-battista-alberti', 'influenza', 'Bernardo Rossellino subisce soprattutto l''influenza di Leon Battista Alberti e probabilmente lavora con lui nel cantiere di Palazzo Rucellai.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'bernardo-rossellino' AND c.target_type = 'artist' AND c.target_id = 'leon-battista-alberti' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'botticelli-filippino-lippi-maestro-allievo', 'artist', 'botticelli', 'artist', 'filippino-lippi', 'maestro-allievo', 'Filippino Lippi emerge tra gli allievi di Botticelli.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'botticelli' AND c.target_type = 'artist' AND c.target_id = 'filippino-lippi' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'carlo-borromeo-pellegrino-tibaldi-committenza', 'artist', 'carlo-borromeo', 'artist', 'pellegrino-tibaldi', 'committenza', 'Carlo Borromeo affida l''architettura religiosa a Pellegrino Tibaldi; nel 1569, sotto il suo patronato, Tibaldi progetta la chiesa di San Fedele a Milano.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'carlo-borromeo' AND c.target_type = 'artist' AND c.target_id = 'pellegrino-tibaldi' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'cosimo-de-medici-beato-angelico-committenza', 'artist', 'cosimo-de-medici', 'artist', 'beato-angelico', 'committenza', 'L''interesse suscitato dal Tabernacolo dei Linaioli porta Cosimo de'' Medici a rivolgersi a Beato Angelico per la realizzazione di alcune opere, tra cui probabilmente la Pala di Annalena.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'cosimo-de-medici' AND c.target_type = 'artist' AND c.target_id = 'beato-angelico' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'cosimo-de-medici-filippo-lippi-committenza', 'artist', 'cosimo-de-medici', 'artist', 'filippo-lippi', 'committenza', 'Filippo Lippi diventa presto protetto di Cosimo de'' Medici, dal quale riceve numerose commissioni.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'cosimo-de-medici' AND c.target_type = 'artist' AND c.target_id = 'filippo-lippi' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'cosimo-i-de-medici-benvenuto-cellini-committenza', 'artist', 'cosimo-i-de-medici', 'artist', 'benvenuto-cellini', 'committenza', 'Benvenuto Cellini, tornato a Firenze nel 1545, realizza per Cosimo I il Perseo destinato alla Loggia dei Lanzi.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'cosimo-i-de-medici' AND c.target_type = 'artist' AND c.target_id = 'benvenuto-cellini' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'cosimo-rosselli-piero-di-cosimo-maestro-allievo', 'artist', 'cosimo-rosselli', 'artist', 'piero-di-cosimo', 'maestro-allievo', 'Piero di Cosimo è ricordato come allievo di Cosimo Rosselli, del quale eredita uno stile permeato dal linearismo dei Pollaiolo e di Verrocchio.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'cosimo-rosselli' AND c.target_type = 'artist' AND c.target_id = 'piero-di-cosimo' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'desiderio-da-settignano-antonio-rossellino-collaborazione', 'artist', 'desiderio-da-settignano', 'artist', 'antonio-rossellino', 'collaborazione', 'Desiderio da Settignano probabilmente inizia collaborando con i fratelli Rossellino.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'desiderio-da-settignano' AND c.target_type = 'artist' AND c.target_id = 'antonio-rossellino' AND c.kind = 'collaborazione'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'desiderio-da-settignano-bernardo-rossellino-collaborazione', 'artist', 'desiderio-da-settignano', 'artist', 'bernardo-rossellino', 'collaborazione', 'Desiderio da Settignano probabilmente inizia collaborando con i fratelli Rossellino.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'desiderio-da-settignano' AND c.target_type = 'artist' AND c.target_id = 'bernardo-rossellino' AND c.kind = 'collaborazione'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'desiderio-da-settignano-bernardo-rossellino-influenza', 'artist', 'desiderio-da-settignano', 'artist', 'bernardo-rossellino', 'influenza', 'Nel Monumento funebre di Carlo Marsuppini, Desiderio da Settignano riprende il modello di Bernardo Rossellino.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'desiderio-da-settignano' AND c.target_type = 'artist' AND c.target_id = 'bernardo-rossellino' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'donatello-beato-angelico-influenza', 'artist', 'donatello', 'artist', 'beato-angelico', 'influenza', 'La piena fisicità delle figure di Beato Angelico è collegata nel testo allo studio della scultura fiorentina e, in particolare, di Donatello.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'donatello' AND c.target_type = 'artist' AND c.target_id = 'beato-angelico' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'donatello-michelangelo-buonarroti-influenza', 'artist', 'donatello', 'artist', 'michelangelo-buonarroti', 'influenza', 'Il testo collega il Mosè di Michelangelo alla lezione del San Giorgio e del San Giovanni di Donatello.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'donatello' AND c.target_type = 'artist' AND c.target_id = 'michelangelo-buonarroti' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'donatello-michelozzo-influenza', 'artist', 'donatello', 'artist', 'michelozzo', 'influenza', 'Michelozzo recupera principi rinascimentali appresi da Donatello.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'donatello' AND c.target_type = 'artist' AND c.target_id = 'michelozzo' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'donatello-bertoldo-di-giovanni-maestro-allievo', 'artist', 'donatello', 'artist', 'bertoldo-di-giovanni', 'maestro-allievo', 'Bertoldo di Giovanni è indicato come allievo di Donatello.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'donatello' AND c.target_type = 'artist' AND c.target_id = 'bertoldo-di-giovanni' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'el-greco-michelangelo-buonarroti-influenza', 'artist', 'el-greco', 'artist', 'michelangelo-buonarroti', 'influenza', 'La pittura di El Greco risente dell''esempio dei maestri del Rinascimento e del Manierismo italiano, tra cui Michelangelo.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'el-greco' AND c.target_type = 'artist' AND c.target_id = 'michelangelo-buonarroti' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'el-greco-raffaello-sanzio-influenza', 'artist', 'el-greco', 'artist', 'raffaello-sanzio', 'influenza', 'La pittura di El Greco risente dell''esempio dei maestri del Rinascimento e del Manierismo italiano, tra cui Raffaello.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'el-greco' AND c.target_type = 'artist' AND c.target_id = 'raffaello-sanzio' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'el-greco-tintoretto-influenza', 'artist', 'el-greco', 'artist', 'tintoretto', 'influenza', 'La pittura di El Greco risente dell''esempio di Tintoretto, tra i maestri veneziani studiati durante il soggiorno italiano.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'el-greco' AND c.target_type = 'artist' AND c.target_id = 'tintoretto' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'el-greco-tiziano-vecellio-influenza', 'artist', 'el-greco', 'artist', 'tiziano-vecellio', 'influenza', 'La pittura di El Greco risente dell''esempio di Tiziano, incontrato durante gli anni trascorsi in Italia.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'el-greco' AND c.target_type = 'artist' AND c.target_id = 'tiziano-vecellio' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'federico-borromeo-cerano-committenza', 'artist', 'federico-borromeo', 'artist', 'cerano', 'committenza', 'Federico Borromeo commissiona a Cerano un ciclo di dipinti, tra cui i Quadroni di san Carlo e successivamente i Miracoli di san Carlo.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'federico-borromeo' AND c.target_type = 'artist' AND c.target_id = 'cerano' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'federico-borromeo-giulio-cesare-procaccini-committenza', 'artist', 'federico-borromeo', 'artist', 'giulio-cesare-procaccini', 'committenza', 'Federico Borromeo commissiona a Giulio Cesare Procaccini, insieme a Cerano, il secondo ciclo dei Miracoli di san Carlo.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'federico-borromeo' AND c.target_type = 'artist' AND c.target_id = 'giulio-cesare-procaccini' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'federico-ii-gonzaga-tintoretto-committenza', 'artist', 'federico-ii-gonzaga', 'artist', 'tintoretto', 'committenza', 'Nel 1579 Federico II Gonzaga commissiona a Tintoretto le tele dette Fasti Gonzaghesi.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'federico-ii-gonzaga' AND c.target_type = 'artist' AND c.target_id = 'tintoretto' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'filippo-brunelleschi-lorenzo-ghiberti-collaborazione', 'artist', 'filippo-brunelleschi', 'artist', 'lorenzo-ghiberti', 'collaborazione', 'Brunelleschi e Ghiberti vincono il concorso del 1418 per la cupola di Santa Maria del Fiore e lavorano insieme dal 1420 al 1436.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'filippo-brunelleschi' AND c.target_type = 'artist' AND c.target_id = 'lorenzo-ghiberti' AND c.kind = 'collaborazione'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'filippo-brunelleschi-beato-angelico-influenza', 'artist', 'filippo-brunelleschi', 'artist', 'beato-angelico', 'influenza', 'Le architetture delle opere di Beato Angelico sono descritte come ispirate alle soluzioni brunelleschiane.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'filippo-brunelleschi' AND c.target_type = 'artist' AND c.target_id = 'beato-angelico' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'filippo-brunelleschi-donatello-influenza', 'artist', 'filippo-brunelleschi', 'artist', 'donatello', 'influenza', 'Durante il viaggio a Roma Donatello è a contatto con Brunelleschi; al suo rientro assimila anche le regole della costruzione prospettica apprese da lui.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'filippo-brunelleschi' AND c.target_type = 'artist' AND c.target_id = 'donatello' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'filippo-brunelleschi-leon-battista-alberti-influenza', 'artist', 'filippo-brunelleschi', 'artist', 'leon-battista-alberti', 'influenza', 'Alberti formalizza nel De pictura i principi matematico-geometrici della prospettiva lineare applicati da Brunelleschi, contribuendone alla diffusione.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'filippo-brunelleschi' AND c.target_type = 'artist' AND c.target_id = 'leon-battista-alberti' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'filippo-brunelleschi-michelozzo-influenza', 'artist', 'filippo-brunelleschi', 'artist', 'michelozzo', 'influenza', 'Michelozzo recupera principi rinascimentali appresi da Brunelleschi e ne riprende soluzioni architettoniche.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'filippo-brunelleschi' AND c.target_type = 'artist' AND c.target_id = 'michelozzo' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'filippo-brunelleschi-luca-fancelli-maestro-allievo', 'artist', 'filippo-brunelleschi', 'artist', 'luca-fancelli', 'maestro-allievo', 'Luca Fancelli è indicato come allievo di Brunelleschi prima di diventare il principale collaboratore di Leon Battista Alberti a Mantova.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'filippo-brunelleschi' AND c.target_type = 'artist' AND c.target_id = 'luca-fancelli' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'filippo-ii-di-spagna-juan-fernandez-de-navarrete-committenza', 'artist', 'filippo-ii-di-spagna', 'artist', 'juan-fernandez-de-navarrete', 'committenza', 'Nel 1576 Filippo II commissiona trentadue pale d''altare a Juan Fernández de Navarrete detto El Mudo.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'filippo-ii-di-spagna' AND c.target_type = 'artist' AND c.target_id = 'juan-fernandez-de-navarrete' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'filippo-ii-di-spagna-luca-cambiaso-committenza', 'artist', 'filippo-ii-di-spagna', 'artist', 'luca-cambiaso', 'committenza', 'Filippo II si rivolge a Luca Cambiaso per la decorazione dell''Escorial; nel 1583 l''artista giunge in Spagna e realizza la Gloria della Trinità.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'filippo-ii-di-spagna' AND c.target_type = 'artist' AND c.target_id = 'luca-cambiaso' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'filippo-ii-di-spagna-pellegrino-tibaldi-committenza', 'artist', 'filippo-ii-di-spagna', 'artist', 'pellegrino-tibaldi', 'committenza', 'Nella decorazione dell''Escorial Filippo II si rivolge anche a diversi artisti italiani, tra cui Pellegrino Tibaldi.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'filippo-ii-di-spagna' AND c.target_type = 'artist' AND c.target_id = 'pellegrino-tibaldi' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'filippo-ii-di-spagna-tiziano-vecellio-committenza', 'artist', 'filippo-ii-di-spagna', 'artist', 'tiziano-vecellio', 'committenza', 'Filippo II di Spagna eredita il rapporto privilegiato con Tiziano e gli commissiona almeno trenta dipinti, acquistando le opere che l''artista decide di inviargli.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'filippo-ii-di-spagna' AND c.target_type = 'artist' AND c.target_id = 'tiziano-vecellio' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'filippo-lippi-masaccio-influenza', 'artist', 'filippo-lippi', 'artist', 'masaccio', 'influenza', 'Il plasticismo di Masaccio e la sua applicazione della prospettiva lineare esercitano una notevole influenza su Filippo Lippi fin dagli inizi della carriera.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'filippo-lippi' AND c.target_type = 'artist' AND c.target_id = 'masaccio' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'filippo-lippi-botticelli-maestro-allievo', 'artist', 'filippo-lippi', 'artist', 'botticelli', 'maestro-allievo', 'Sandro Botticelli passa a bottega da Filippo Lippi, dal quale assorbe soluzioni iconografiche e uno stile dal linearismo marcato.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'filippo-lippi' AND c.target_type = 'artist' AND c.target_id = 'botticelli' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'fra-bartolomeo-andrea-del-sarto-influenza', 'artist', 'fra-bartolomeo', 'artist', 'andrea-del-sarto', 'influenza', 'Andrea del Sarto si muove sull''esempio di Bartolomeo della Porta e della cultura fiorentina di Raffaello e Leonardo.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'fra-bartolomeo' AND c.target_type = 'artist' AND c.target_id = 'andrea-del-sarto' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'francesco-i-de-medici-bernardo-buontalenti-committenza', 'artist', 'francesco-i-de-medici', 'artist', 'bernardo-buontalenti', 'committenza', 'La villa medicea di Pratolino viene costruita da Bernardo Buontalenti per il granduca Francesco I de'' Medici.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'francesco-i-de-medici' AND c.target_type = 'artist' AND c.target_id = 'bernardo-buontalenti' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'francesco-i-de-medici-giambologna-committenza', 'artist', 'francesco-i-de-medici', 'artist', 'giambologna', 'committenza', 'Francesco I de'' Medici è il committente del Ratto della Sabina di Giambologna.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'francesco-i-de-medici' AND c.target_type = 'artist' AND c.target_id = 'giambologna' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'francesco-i-di-valois-benvenuto-cellini-committenza', 'artist', 'francesco-i-di-valois', 'artist', 'benvenuto-cellini', 'committenza', 'Francesco I di Valois chiama a Fontainebleau Benvenuto Cellini, al quale commissiona diverse opere, tra cui la celebre Saliera e la Ninfa di Fontainebleau.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'francesco-i-di-valois' AND c.target_type = 'artist' AND c.target_id = 'benvenuto-cellini' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'francesco-i-di-valois-francesco-primaticcio-committenza', 'artist', 'francesco-i-di-valois', 'artist', 'francesco-primaticcio', 'committenza', 'Francesco I di Valois favorisce a Fontainebleau la presenza di Rosso Fiorentino e Francesco Primaticcio, chiamati per la decorazione del castello e delle sue gallerie.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'francesco-i-di-valois' AND c.target_type = 'artist' AND c.target_id = 'francesco-primaticcio' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'francesco-i-di-valois-rosso-fiorentino-committenza', 'artist', 'francesco-i-di-valois', 'artist', 'rosso-fiorentino', 'committenza', 'Rosso Fiorentino viene chiamato in Francia nel 1530 dal re Francesco I e diviene pittore di corte.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'francesco-i-di-valois' AND c.target_type = 'artist' AND c.target_id = 'rosso-fiorentino' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'francesco-sforza-guiniforte-solari-committenza', 'artist', 'francesco-sforza', 'artist', 'guiniforte-solari', 'committenza', 'Francesco Sforza affida a Guiniforte Solari il cantiere milanese, autorizzandolo a intervenire sul progetto originario di Filarete.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'francesco-sforza' AND c.target_type = 'artist' AND c.target_id = 'guiniforte-solari' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'gentile-bellini-tiziano-vecellio-maestro-allievo', 'artist', 'gentile-bellini', 'artist', 'tiziano-vecellio', 'maestro-allievo', 'Tiziano entra nella bottega di Gentile e Giovanni Bellini, dove apprende la tecnica cromatica veneziana.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'gentile-bellini' AND c.target_type = 'artist' AND c.target_id = 'tiziano-vecellio' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'gentile-da-fabriano-cosme-tura-influenza', 'artist', 'gentile-da-fabriano', 'artist', 'cosme-tura', 'influenza', 'La fama della decorazione di Gentile da Fabriano a Brescia è tale che il duca di Ferrara invia Cosmè Tura a studiarla.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'gentile-da-fabriano' AND c.target_type = 'artist' AND c.target_id = 'cosme-tura' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'gentile-da-fabriano-pisanello-influenza', 'artist', 'gentile-da-fabriano', 'artist', 'pisanello', 'influenza', 'Pisanello si indirizza verso l''arte di Gentile da Fabriano, del quale diviene collaboratore a Venezia; Gentile gli trasmette modelli stilistici e la bottega.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'gentile-da-fabriano' AND c.target_type = 'artist' AND c.target_id = 'pisanello' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'giorgio-vasari-bernardo-buontalenti-maestro-allievo', 'artist', 'giorgio-vasari', 'artist', 'bernardo-buontalenti', 'maestro-allievo', 'Bernardo Buontalenti, allievo di Vasari, realizza sul finire del secolo la fortezza del Belvedere nel parco di Palazzo Pitti.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'giorgio-vasari' AND c.target_type = 'artist' AND c.target_id = 'bernardo-buontalenti' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'giorgione-tiziano-vecellio-collaborazione', 'artist', 'giorgione', 'artist', 'tiziano-vecellio', 'collaborazione', 'Giorgione e il giovane Tiziano decorano insieme a fresco la facciata del Fondaco dei Tedeschi nel 1508-1509.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'giorgione' AND c.target_type = 'artist' AND c.target_id = 'tiziano-vecellio' AND c.kind = 'collaborazione'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'giorgione-correggio-influenza', 'artist', 'giorgione', 'artist', 'correggio', 'influenza', 'La conoscenza dei paesaggi di Giorgione è indicata tra le componenti che influenzano la formazione di Correggio.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'giorgione' AND c.target_type = 'artist' AND c.target_id = 'correggio' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'giorgione-giovan-girolamo-savoldo-influenza', 'artist', 'giorgione', 'artist', 'giovan-girolamo-savoldo', 'influenza', 'Savoldo modifica il proprio stile sull''esempio di Giorgione, traendo dalla pittura veneta suggestioni luministiche e cromatiche.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'giorgione' AND c.target_type = 'artist' AND c.target_id = 'giovan-girolamo-savoldo' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'giorgione-sebastiano-del-piombo-influenza', 'artist', 'giorgione', 'artist', 'sebastiano-del-piombo', 'influenza', 'Sebastiano del Piombo entra nell''orbita di Giorgione, la cui influenza è riconoscibile nella sua produzione giovanile.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'giorgione' AND c.target_type = 'artist' AND c.target_id = 'sebastiano-del-piombo' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'giorgione-tiziano-vecellio-influenza', 'artist', 'giorgione', 'artist', 'tiziano-vecellio', 'influenza', 'Il confronto tra le due Veneri mostra che Tiziano riprende la Venere dormiente di Giorgione e ne rielabora il tema secondo una nuova concezione della pittura.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'giorgione' AND c.target_type = 'artist' AND c.target_id = 'tiziano-vecellio' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'giorgione-tiziano-vecellio-rielaborazione', 'artist', 'giorgione', 'artist', 'tiziano-vecellio', 'rielaborazione', 'Alla morte di Giorgione, Tiziano completa la Venere dormiente e più tardi rielabora lo stesso tema nella Venere di Urbino; il testo sottolinea la ripresa dell''iconografia del nudo femminile disteso.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'giorgione' AND c.target_type = 'artist' AND c.target_id = 'tiziano-vecellio' AND c.kind = 'rielaborazione'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'giovan-battista-suardi-lorenzo-lotto-committenza', 'artist', 'giovan-battista-suardi', 'artist', 'lorenzo-lotto', 'committenza', 'Nel 1524 Giovan Battista Suardi incarica Lorenzo Lotto di affrescare l''oratorio della villa di famiglia a Trescore Balneario.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'giovan-battista-suardi' AND c.target_type = 'artist' AND c.target_id = 'lorenzo-lotto' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'giovanni-bellini-sebastiano-del-piombo-maestro-allievo', 'artist', 'giovanni-bellini', 'artist', 'sebastiano-del-piombo', 'maestro-allievo', 'Sebastiano del Piombo si forma con ogni probabilità nella bottega di Giovanni Bellini prima di entrare nell''orbita di Giorgione.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'giovanni-bellini' AND c.target_type = 'artist' AND c.target_id = 'sebastiano-del-piombo' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'giulio-ii-della-rovere-donato-bramante-committenza', 'artist', 'giulio-ii-della-rovere', 'artist', 'donato-bramante', 'committenza', 'A Roma Giulio II della Rovere nomina Bramante sovrintendente generale delle costruzioni papali e gli affida il progetto del nuovo edificio di San Pietro.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'giulio-ii-della-rovere' AND c.target_type = 'artist' AND c.target_id = 'donato-bramante' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'giulio-ii-della-rovere-raffaello-sanzio-committenza', 'artist', 'giulio-ii-della-rovere', 'artist', 'raffaello-sanzio', 'committenza', 'Nel 1508 Giulio II incarica Raffaello di decorare le Stanze Vaticane.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'giulio-ii-della-rovere' AND c.target_type = 'artist' AND c.target_id = 'raffaello-sanzio' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'hubert-van-eyck-jan-van-eyck-maestro-allievo', 'artist', 'hubert-van-eyck', 'artist', 'jan-van-eyck', 'maestro-allievo', 'Il testo presenta Hubert van Eyck come il fratello maggiore e il primo maestro di Jan; i due realizzano insieme il Polittico dell''Agnello Mistico.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'hubert-van-eyck' AND c.target_type = 'artist' AND c.target_id = 'jan-van-eyck' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'ippolito-ii-deste-benvenuto-cellini-committenza', 'artist', 'ippolito-ii-deste', 'artist', 'benvenuto-cellini', 'committenza', 'La Saliera di Francesco I era stata progettata da Benvenuto Cellini per il cardinale Ippolito II d''Este, uno dei suoi protettori.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'ippolito-ii-deste' AND c.target_type = 'artist' AND c.target_id = 'benvenuto-cellini' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'jacopo-bellini-vincenzo-foppa-influenza', 'artist', 'jacopo-bellini', 'artist', 'vincenzo-foppa', 'influenza', 'Foppa trae ispirazione dall''Annunciazione di Jacopo Bellini nella chiesa di Sant''Alessandro a Brescia.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'jacopo-bellini' AND c.target_type = 'artist' AND c.target_id = 'vincenzo-foppa' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'jacopo-della-quercia-michelangelo-buonarroti-influenza', 'artist', 'jacopo-della-quercia', 'artist', 'michelangelo-buonarroti', 'influenza', 'Michelangelo rimane colpito dalle figure del portale di San Petronio di Jacopo della Quercia e ne utilizza suggestioni per gli affreschi della Cappella Sistina.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'jacopo-della-quercia' AND c.target_type = 'artist' AND c.target_id = 'michelangelo-buonarroti' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'jacopo-sansovino-alessandro-vittoria-maestro-allievo', 'artist', 'jacopo-sansovino', 'artist', 'alessandro-vittoria', 'maestro-allievo', 'Alessandro Vittoria approda alla bottega di Jacopo Sansovino e assorbe da lui un approccio pittorico alla scultura attento ai valori tattili e chiaroscurali.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'jacopo-sansovino' AND c.target_type = 'artist' AND c.target_id = 'alessandro-vittoria' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'jan-van-eyck-giusto-di-gand-influenza', 'artist', 'jan-van-eyck', 'artist', 'giusto-di-gand', 'influenza', 'Giusto di Gand si forma sulle opere di Jan van Eyck prima di trasferirsi a Roma e poi a Urbino.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'jan-van-eyck' AND c.target_type = 'artist' AND c.target_id = 'giusto-di-gand' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'jan-van-eyck-barthelemy-deyck-maestro-allievo', 'artist', 'jan-van-eyck', 'artist', 'barthelemy-deyck', 'maestro-allievo', 'Barthélemy d''Eyck è indicato come allievo di Jan van Eyck.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'jan-van-eyck' AND c.target_type = 'artist' AND c.target_id = 'barthelemy-deyck' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'leon-battista-alberti-piero-della-francesca-influenza', 'artist', 'leon-battista-alberti', 'artist', 'piero-della-francesca', 'influenza', 'Nel San Sigismondo di Piero della Francesca le idee dell''artista trovano conferma e sostegno teorico nei trattati di Leon Battista Alberti; il testo evidenzia la condivisione della visione della realtà come massa e volume.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'leon-battista-alberti' AND c.target_type = 'artist' AND c.target_id = 'piero-della-francesca' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'leonardo-buonafede-rosso-fiorentino-committenza', 'artist', 'leonardo-buonafede', 'artist', 'rosso-fiorentino', 'committenza', 'La Pala dello Spedalingo viene commissionata a Rosso Fiorentino nel 1518 da Leonardo Buonafede, rettore dell''ospedale di Santa Maria Nuova.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'leonardo-buonafede' AND c.target_type = 'artist' AND c.target_id = 'rosso-fiorentino' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'leonardo-da-vinci-correggio-influenza', 'artist', 'leonardo-da-vinci', 'artist', 'correggio', 'influenza', 'La luce e il colore di Correggio nella Camera della Badessa sono descritti come modulati secondo precetti leonardeschi.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'leonardo-da-vinci' AND c.target_type = 'artist' AND c.target_id = 'correggio' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'leonardo-da-vinci-donato-bramante-influenza', 'artist', 'leonardo-da-vinci', 'artist', 'donato-bramante', 'influenza', 'Nel Cristo alla colonna Bramante si confronta con la pittura di Leonardo, con attenzione alla luce, al paesaggio e al patetismo della figura.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'leonardo-da-vinci' AND c.target_type = 'artist' AND c.target_id = 'donato-bramante' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'leonardo-da-vinci-giorgione-influenza', 'artist', 'leonardo-da-vinci', 'artist', 'giorgione', 'influenza', 'Secondo Vasari, Giorgione studia a Venezia alcune opere di Leonardo e ne assume lo sfumato e l''attenzione alla resa degli elementi naturali.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'leonardo-da-vinci' AND c.target_type = 'artist' AND c.target_id = 'giorgione' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'leonardo-da-vinci-giovan-girolamo-savoldo-influenza', 'artist', 'leonardo-da-vinci', 'artist', 'giovan-girolamo-savoldo', 'influenza', 'Savoldo modifica ulteriormente il proprio stile anche sull''esempio di Leonardo, approdando a una pittura fondata su una luminosità intensa.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'leonardo-da-vinci' AND c.target_type = 'artist' AND c.target_id = 'giovan-girolamo-savoldo' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'leonardo-da-vinci-bernardino-luini-maestro-allievo', 'artist', 'leonardo-da-vinci', 'artist', 'bernardino-luini', 'maestro-allievo', 'Bernardino Luini è indicato tra i più originali allievi di Leonardo e sviluppa una pittura permeata dalla cultura leonardesca.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'leonardo-da-vinci' AND c.target_type = 'artist' AND c.target_id = 'bernardino-luini' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'leonardo-da-vinci-pontormo-maestro-allievo', 'artist', 'leonardo-da-vinci', 'artist', 'pontormo', 'maestro-allievo', 'Pontormo inizia la propria formazione nelle botteghe di Leonardo e di Piero di Cosimo.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'leonardo-da-vinci' AND c.target_type = 'artist' AND c.target_id = 'pontormo' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'lorenzo-ghiberti-donatello-maestro-allievo', 'artist', 'lorenzo-ghiberti', 'artist', 'donatello', 'maestro-allievo', 'Donatello compie il proprio apprendistato nella bottega di Ghiberti tra il 1404 e il 1407, acquisendo i segreti dell''oreficeria e della fusione in bronzo.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'lorenzo-ghiberti' AND c.target_type = 'artist' AND c.target_id = 'donatello' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'lorenzo-ghiberti-michelozzo-maestro-allievo', 'artist', 'lorenzo-ghiberti', 'artist', 'michelozzo', 'maestro-allievo', 'Michelozzo si forma nella bottega di Ghiberti, da cui recupera forme tardogotiche fiorentine aggiornandole in chiave classica.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'lorenzo-ghiberti' AND c.target_type = 'artist' AND c.target_id = 'michelozzo' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'lorenzo-ghiberti-paolo-uccello-maestro-allievo', 'artist', 'lorenzo-ghiberti', 'artist', 'paolo-uccello', 'maestro-allievo', 'La bottega di Ghiberti diventa luogo di formazione per una generazione di artisti rinascimentali, tra cui Paolo Uccello.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'lorenzo-ghiberti' AND c.target_type = 'artist' AND c.target_id = 'paolo-uccello' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'lorenzo-lotto-antonello-da-messina-influenza', 'artist', 'lorenzo-lotto', 'artist', 'antonello-da-messina', 'influenza', 'Nei ritratti degli anni trevigiani Lorenzo Lotto si discosta dal tonalismo di Giorgione e pare riprendere la grande lezione di Antonello da Messina.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'lorenzo-lotto' AND c.target_type = 'artist' AND c.target_id = 'antonello-da-messina' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'luca-della-robbia-andrea-della-robbia-maestro-allievo', 'artist', 'luca-della-robbia', 'artist', 'andrea-della-robbia', 'maestro-allievo', 'La tecnica della terracotta invetriata sviluppata da Luca della Robbia viene ulteriormente sviluppata dal nipote Andrea della Robbia.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'luca-della-robbia' AND c.target_type = 'artist' AND c.target_id = 'andrea-della-robbia' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'ludovico-capponi-pontormo-committenza', 'artist', 'ludovico-capponi', 'artist', 'pontormo', 'committenza', 'Ludovico Capponi acquista la cappella Barbadori e ne affida la decorazione a Jacopo Pontormo.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'ludovico-capponi' AND c.target_type = 'artist' AND c.target_id = 'pontormo' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'ludovico-gonzaga-leon-battista-alberti-committenza', 'artist', 'ludovico-gonzaga', 'artist', 'leon-battista-alberti', 'committenza', 'Ludovico Gonzaga coinvolge Leon Battista Alberti nei principali cantieri mantovani, tra cui San Sebastiano e Sant''Andrea.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'ludovico-gonzaga' AND c.target_type = 'artist' AND c.target_id = 'leon-battista-alberti' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'ludovico-il-moro-donato-bramante-committenza', 'artist', 'ludovico-il-moro', 'artist', 'donato-bramante', 'committenza', 'Alla corte di Ludovico il Moro Bramante lavora a Milano e riceve incarichi per interventi architettonici, tra cui i lavori di Vigevano.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'ludovico-il-moro' AND c.target_type = 'artist' AND c.target_id = 'donato-bramante' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'ludovico-il-moro-leonardo-da-vinci-committenza', 'artist', 'ludovico-il-moro', 'artist', 'leonardo-da-vinci', 'committenza', 'Ludovico il Moro affida a Leonardo la decorazione della Sala delle Asse e, tra il 1495 e il 1497, l''incarico di dipingere l''Ultima Cena nel refettorio di Santa Maria delle Grazie.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'ludovico-il-moro' AND c.target_type = 'artist' AND c.target_id = 'leonardo-da-vinci' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'mantegna-albrecht-durer-influenza', 'artist', 'mantegna', 'artist', 'albrecht-durer', 'influenza', 'Dürer affianca allo studio della natura quello delle incisioni dei maestri del suo tempo, con una predilezione per Andrea Mantegna e Martin Schongauer.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'mantegna' AND c.target_type = 'artist' AND c.target_id = 'albrecht-durer' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'masaccio-beato-angelico-influenza', 'artist', 'masaccio', 'artist', 'beato-angelico', 'influenza', 'La pittura di Beato Angelico mostra uno studio della fisicità delle figure derivato dai dipinti di Masaccio.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'masaccio' AND c.target_type = 'artist' AND c.target_id = 'beato-angelico' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'masaccio-donatello-influenza', 'artist', 'masaccio', 'artist', 'donatello', 'influenza', 'Masaccio si confronta con Donatello e con Brunelleschi; il testo presenta questi maestri come tramite per il recupero di modelli derivati dall''arte romana.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'masaccio' AND c.target_type = 'artist' AND c.target_id = 'donatello' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'masaccio-filippino-lippi-influenza', 'artist', 'masaccio', 'artist', 'filippino-lippi', 'influenza', 'Nel completamento della cappella Brancacci, Filippino Lippi entra in contatto con l''opera di Masaccio e il suo linearismo giovanile si modifica.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'masaccio' AND c.target_type = 'artist' AND c.target_id = 'filippino-lippi' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'masolino-da-panicale-masaccio-collaborazione', 'artist', 'masolino-da-panicale', 'artist', 'masaccio', 'collaborazione', 'Masaccio sviluppa a Firenze un rapporto di collaborazione con Masolino da Panicale.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'masolino-da-panicale' AND c.target_type = 'artist' AND c.target_id = 'masaccio' AND c.kind = 'collaborazione'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'michelangelo-buonarroti-sebastiano-del-piombo-collaborazione', 'artist', 'michelangelo-buonarroti', 'artist', 'sebastiano-del-piombo', 'collaborazione', 'Il rapporto tra Sebastiano del Piombo e Michelangelo si concretizza nella partecipazione diretta di Michelangelo alle opere di Sebastiano, con idee, cartoni e studi.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'michelangelo-buonarroti' AND c.target_type = 'artist' AND c.target_id = 'sebastiano-del-piombo' AND c.kind = 'collaborazione'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'michelangelo-buonarroti-el-greco-influenza', 'artist', 'michelangelo-buonarroti', 'artist', 'el-greco', 'influenza', 'La Trinità di El Greco rivela, secondo il testo, la conoscenza della Pietà Bandini di Michelangelo.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'michelangelo-buonarroti' AND c.target_type = 'artist' AND c.target_id = 'el-greco' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'michelangelo-buonarroti-rosso-fiorentino-influenza', 'artist', 'michelangelo-buonarroti', 'artist', 'rosso-fiorentino', 'influenza', 'Rosso Fiorentino è profondamente affascinato dalle opere fiorentine di Michelangelo e ne sviluppa liberamente le suggestioni.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'michelangelo-buonarroti' AND c.target_type = 'artist' AND c.target_id = 'rosso-fiorentino' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'michelangelo-buonarroti-tiziano-vecellio-influenza', 'artist', 'michelangelo-buonarroti', 'artist', 'tiziano-vecellio', 'influenza', 'Tiziano guarda ai modelli di Michelangelo: il testo riconosce nelle sue opere riprese michelangiolesche nelle torsioni delle figure e nella concitazione dei personaggi.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'michelangelo-buonarroti' AND c.target_type = 'artist' AND c.target_id = 'tiziano-vecellio' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'pier-francesco-orsini-pirro-ligorio-committenza', 'artist', 'pier-francesco-orsini', 'artist', 'pirro-ligorio', 'committenza', 'Il giardino di Bomarzo, ideato e realizzato nel Cinquecento, è attribuito a Pirro Ligorio ed è legato alla committenza del principe Pier Francesco Orsini.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'pier-francesco-orsini' AND c.target_type = 'artist' AND c.target_id = 'pirro-ligorio' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'piero-di-cosimo-pontormo-maestro-allievo', 'artist', 'piero-di-cosimo', 'artist', 'pontormo', 'maestro-allievo', 'Pontormo inizia la propria formazione nelle botteghe di Leonardo e di Piero di Cosimo.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'piero-di-cosimo' AND c.target_type = 'artist' AND c.target_id = 'pontormo' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'piero-il-gottoso-benozzo-gozzoli-committenza', 'artist', 'piero-il-gottoso', 'artist', 'benozzo-gozzoli', 'committenza', 'Piero il Gottoso chiama Benozzo Gozzoli a decorare la cappella del palazzo di famiglia tra il 1459 e il 1461.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'piero-il-gottoso' AND c.target_type = 'artist' AND c.target_id = 'benozzo-gozzoli' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'pisanello-matteo-de-pasti-maestro-allievo', 'artist', 'pisanello', 'artist', 'matteo-de-pasti', 'maestro-allievo', 'Matteo de'' Pasti, attivo nel Tempio Malatestiano, è indicato come allievo di Pisanello.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'pisanello' AND c.target_type = 'artist' AND c.target_id = 'matteo-de-pasti' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'pontormo-rosso-fiorentino-collaborazione', 'artist', 'pontormo', 'artist', 'rosso-fiorentino', 'collaborazione', 'Pontormo e Rosso Fiorentino lavorano con Andrea del Sarto alle decorazioni del chiostrino dell''Annunziata, contribuendo alla cosiddetta scuola della Santissima Annunziata.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'pontormo' AND c.target_type = 'artist' AND c.target_id = 'rosso-fiorentino' AND c.kind = 'collaborazione'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'raffaello-sanzio-leonardo-da-vinci-influenza', 'artist', 'raffaello-sanzio', 'artist', 'leonardo-da-vinci', 'influenza', 'Durante il soggiorno fiorentino Raffaello entra in contatto con l''opera di Leonardo; il confronto gli suggerisce nuove soluzioni compositive e contribuisce all''evoluzione del suo linguaggio.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'raffaello-sanzio' AND c.target_type = 'artist' AND c.target_id = 'leonardo-da-vinci' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'raffaello-sanzio-michelangelo-buonarroti-influenza', 'artist', 'raffaello-sanzio', 'artist', 'michelangelo-buonarroti', 'influenza', 'Il confronto con Michelangelo apre nuovi orizzonti a Raffaello; il testo riconosce nelle sue opere la resa potente e monumentale delle figure e schemi compositivi di derivazione michelangiolesca.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'raffaello-sanzio' AND c.target_type = 'artist' AND c.target_id = 'michelangelo-buonarroti' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'raffaello-sanzio-pietro-perugino-influenza', 'artist', 'raffaello-sanzio', 'artist', 'pietro-perugino', 'influenza', 'Raffaello avvia una collaborazione con la bottega di Pietro Perugino e apprende da Perugino un''arte delicata, armoniosa e luminosa.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'raffaello-sanzio' AND c.target_type = 'artist' AND c.target_id = 'pietro-perugino' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'raffaello-sanzio-rosso-fiorentino-influenza', 'artist', 'raffaello-sanzio', 'artist', 'rosso-fiorentino', 'influenza', 'Il confronto con gli affreschi di Raffaello contribuisce al ripiegamento di Rosso verso forme di astratta bellezza durante il periodo romano.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'raffaello-sanzio' AND c.target_type = 'artist' AND c.target_id = 'rosso-fiorentino' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'raffaello-sanzio-giovan-francesco-penni-maestro-allievo', 'artist', 'raffaello-sanzio', 'artist', 'giovan-francesco-penni', 'maestro-allievo', 'Giovan Francesco Penni è indicato tra i principali allievi della bottega di Raffaello.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'raffaello-sanzio' AND c.target_type = 'artist' AND c.target_id = 'giovan-francesco-penni' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'raffaello-sanzio-giovanni-da-udine-maestro-allievo', 'artist', 'raffaello-sanzio', 'artist', 'giovanni-da-udine', 'maestro-allievo', 'Giovanni da Udine è indicato tra i principali allievi della bottega di Raffaello.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'raffaello-sanzio' AND c.target_type = 'artist' AND c.target_id = 'giovanni-da-udine' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'raffaello-sanzio-giulio-romano-maestro-allievo', 'artist', 'raffaello-sanzio', 'artist', 'giulio-romano', 'maestro-allievo', 'Giulio Romano è uno dei principali allievi di Raffaello e lavora al suo fianco nella decorazione delle Stanze Vaticane.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'raffaello-sanzio' AND c.target_type = 'artist' AND c.target_id = 'giulio-romano' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'raffaello-sanzio-perin-del-vaga-maestro-allievo', 'artist', 'raffaello-sanzio', 'artist', 'perin-del-vaga', 'maestro-allievo', 'Perin del Vaga è indicato come allievo di Raffaello.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'raffaello-sanzio' AND c.target_type = 'artist' AND c.target_id = 'perin-del-vaga' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'robert-campin-rogier-van-der-weyden-maestro-allievo', 'artist', 'robert-campin', 'artist', 'rogier-van-der-weyden', 'maestro-allievo', 'Rogier van der Weyden si forma a Tournai nella bottega di Robert Campin e ne riprende l''attenzione per i volumi e la rappresentazione realistica degli spazi.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'robert-campin' AND c.target_type = 'artist' AND c.target_id = 'rogier-van-der-weyden' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'rodolfo-ii-dasburgo-bartholomaeus-spranger-committenza', 'artist', 'rodolfo-ii-dasburgo', 'artist', 'bartholomaeus-spranger', 'committenza', 'Rodolfo II chiama al suo servizio a Praga il pittore fiammingo Bartholomaeus Spranger.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'rodolfo-ii-dasburgo' AND c.target_type = 'artist' AND c.target_id = 'bartholomaeus-spranger' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'rodolfo-ii-dasburgo-giuseppe-arcimboldo-committenza', 'artist', 'rodolfo-ii-dasburgo', 'artist', 'giuseppe-arcimboldo', 'committenza', 'Rodolfo II incarica Arcimboldo di cercare opere d''arte e oggetti insoliti per la Kunstkammer.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'rodolfo-ii-dasburgo' AND c.target_type = 'artist' AND c.target_id = 'giuseppe-arcimboldo' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'rodolfo-ii-dasburgo-giuseppe-heintz-il-vecchio-committenza', 'artist', 'rodolfo-ii-dasburgo', 'artist', 'giuseppe-heintz-il-vecchio', 'committenza', 'Rodolfo II chiama al suo servizio a Praga artisti tra cui Joseph Heintz il Vecchio.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'rodolfo-ii-dasburgo' AND c.target_type = 'artist' AND c.target_id = 'giuseppe-heintz-il-vecchio' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'rodolfo-ii-dasburgo-hans-von-aachen-committenza', 'artist', 'rodolfo-ii-dasburgo', 'artist', 'hans-von-aachen', 'committenza', 'Rodolfo II chiama al suo servizio a Praga il pittore Hans von Aachen.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'rodolfo-ii-dasburgo' AND c.target_type = 'artist' AND c.target_id = 'hans-von-aachen' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'rogier-van-der-weyden-giusto-di-gand-influenza', 'artist', 'rogier-van-der-weyden', 'artist', 'giusto-di-gand', 'influenza', 'Giusto di Gand si forma anche sulle opere di Rogier van der Weyden, assimilandone la lezione.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'rogier-van-der-weyden' AND c.target_type = 'artist' AND c.target_id = 'giusto-di-gand' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'rosso-fiorentino-francesco-primaticcio-collaborazione', 'artist', 'rosso-fiorentino', 'artist', 'francesco-primaticcio', 'collaborazione', 'Rosso Fiorentino realizza con Francesco Primaticcio la decorazione della Galleria di Francesco I a Fontainebleau.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'rosso-fiorentino' AND c.target_type = 'artist' AND c.target_id = 'francesco-primaticcio' AND c.kind = 'collaborazione'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'sismondo-pandolfo-malatesta-leon-battista-alberti-committenza', 'artist', 'sismondo-pandolfo-malatesta', 'artist', 'leon-battista-alberti', 'committenza', 'Sigismondo Pandolfo Malatesta coinvolge Leon Battista Alberti nella trasformazione della chiesa di San Francesco di Rimini nel Tempio Malatestiano.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'sismondo-pandolfo-malatesta' AND c.target_type = 'artist' AND c.target_id = 'leon-battista-alberti' AND c.kind = 'committenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'tintoretto-paolo-veronese-influenza', 'artist', 'tintoretto', 'artist', 'paolo-veronese', 'influenza', 'Veronese dimostra di far tesoro di alcune soluzioni compositive di Tintoretto.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'tintoretto' AND c.target_type = 'artist' AND c.target_id = 'paolo-veronese' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'tiziano-vecellio-giovan-girolamo-savoldo-influenza', 'artist', 'tiziano-vecellio', 'artist', 'giovan-girolamo-savoldo', 'influenza', 'Savoldo si ispira alla pittura di Tiziano durante il periodo trascorso in Veneto.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'tiziano-vecellio' AND c.target_type = 'artist' AND c.target_id = 'giovan-girolamo-savoldo' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'tiziano-vecellio-michelangelo-buonarroti-influenza', 'artist', 'tiziano-vecellio', 'artist', 'michelangelo-buonarroti', 'influenza', 'Tiziano riprende modelli michelangioleschi, in particolare nelle torsioni delle figure e nella concitazione dei personaggi; il testo precisa che questi modelli sono conosciuti anche attraverso le incisioni.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'tiziano-vecellio' AND c.target_type = 'artist' AND c.target_id = 'michelangelo-buonarroti' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'tiziano-vecellio-raffaello-sanzio-influenza', 'artist', 'tiziano-vecellio', 'artist', 'raffaello-sanzio', 'influenza', 'Tiziano guarda ai modelli di Raffaello, riprendendone in particolare alcuni elementi compositivi e le figure degli angioletti.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'tiziano-vecellio' AND c.target_type = 'artist' AND c.target_id = 'raffaello-sanzio' AND c.kind = 'influenza'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'tiziano-vecellio-juan-fernandez-de-navarrete-maestro-allievo', 'artist', 'tiziano-vecellio', 'artist', 'juan-fernandez-de-navarrete', 'maestro-allievo', 'Juan Fernández de Navarrete detto El Mudo si sarebbe formato in Italia presso Tiziano, secondo la tradizione riportata nel testo.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'tiziano-vecellio' AND c.target_type = 'artist' AND c.target_id = 'juan-fernandez-de-navarrete' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'tiziano-vecellio-palma-il-giovane-maestro-allievo', 'artist', 'tiziano-vecellio', 'artist', 'palma-il-giovane', 'maestro-allievo', 'La Pietà di Tiziano viene ultimata dall''allievo Palma il Giovane dopo la morte dell''artista.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'tiziano-vecellio' AND c.target_type = 'artist' AND c.target_id = 'palma-il-giovane' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'tiziano-vecellio-tintoretto-maestro-allievo', 'artist', 'tiziano-vecellio', 'artist', 'tintoretto', 'maestro-allievo', 'Secondo le fonti citate nel testo, Tintoretto sarebbe stato allievo di Tiziano; la critica moderna considera però questa attribuzione tradizionale con cautela.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'tiziano-vecellio' AND c.target_type = 'artist' AND c.target_id = 'tintoretto' AND c.kind = 'maestro-allievo'
);

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description, created_at, updated_at, modified_by, sort_order)
SELECT 'vincenzo-foppa-giovan-girolamo-savoldo-maestro-allievo', 'artist', 'vincenzo-foppa', 'artist', 'giovan-girolamo-savoldo', 'maestro-allievo', 'Giovan Girolamo Savoldo è indicato come probabilmente allievo di Vincenzo Foppa a Brescia.', '2026-08-20 12:06:00+00', '2026-08-20 12:06:00+00', NULL, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.connections c
  WHERE c.source_type = 'artist' AND c.source_id = 'vincenzo-foppa' AND c.target_type = 'artist' AND c.target_id = 'giovan-girolamo-savoldo' AND c.kind = 'maestro-allievo'
);

COMMIT;