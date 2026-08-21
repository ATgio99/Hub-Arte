-- ============================================================================
-- HUB Art — Importazione dati dal libro (Capitolo 8)
-- Rinascimento nordico, Manierismo, Controriforma
-- ============================================================================

-- ==================== PERIODI ====================
INSERT INTO public.periods (id, name, type, year_start, year_end, regions, summary, historical_context, parent_id, key_innovations) VALUES (
  'rinasc-nordico', 'Rinascimento nordico', 'epoca', 1400, 1600,
  '{'Germania','Paesi Bassi','Francia','Inghilterra'}', 'L''arte della Riforma: in Europa protestante, la pittura religiosa perde la funzione didattica e si affermano ritratto, natura morta e paesaggio.', 'La Riforma protestante (Zwingli, Calvino, Lutero) vieta l''arte religiosa considerata idolatria. L''iconoclastia distrugge dipinti e sculture sacre. Il rigorismo morale calvinista vieta sensualità e ostentazione, determinando l''affermazione di generi come natura morta e paesaggio.', NULL, '{'Ritratto realistico','Natura morta','Paesaggio autonomo','Iconoclastia'}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.periods (id, name, type, year_start, year_end, regions, summary, historical_context, parent_id, key_innovations) VALUES (
  'manierismo', 'Manierismo', 'corrente', 1520, 1600,
  '{'Italia','Francia','Spagna','Austria','Paesi Bassi'}', 'Diffusione del Manierismo in Europa: corte di Francia (Fontainebleau), Spagna di Filippo II (El Escorial), corte imperiale di Praga (Rodolfo II).', 'Il Manierismo si diffonde in Europa attraverso le corti: Francesco I in Francia, Filippo II in Spagna, Massimiliano II e Rodolfo II a Praga. Each corte sviluppa una propria declinazione: decorativismo in Francia, rigore controriformista in Spagna, allegorie bizzarre a Praga.', NULL, '{'Strapwork','Kunstkammer/Wunderkammer','Macchina d''altare','Anamorfosi'}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.periods (id, name, type, year_start, year_end, regions, summary, historical_context, parent_id, key_innovations) VALUES (
  'controriforma', 'Controriforma', 'corrente', 1545, 1620,
  '{'Italia','Spagna'}', 'La crisi del Rinascimento e la risposta cattolica: il Concilio di Trento stabilisce i principi dell''arte sacra controriformista.', 'Il Concilio di Trento (1545-1563) stabilisce che l''arte sacra deve essere chiara, didattica e devozionale. Carlo Borromeo promuove i valori controriformisti a Milano. Nascono nuove tipologie architettoniche (chiesa a navata unica con cappelle laterali).', NULL, '{'Chiesa a navata unica','Arte devozionale','Quadroni di san Carlo'}'
) ON CONFLICT (id) DO NOTHING;

-- ==================== AUTORI ====================
INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'holbein-giovane', 'Hans Holbein il Giovane', '{}', 1497, 1543,
  '{'rinasc-nordico'}', 'Pittore e incisore', 'Pittore e incisore attivo in Svizzera (Lucerna e Basilea) e in Inghilterra. Allievo del padre Hans il Vecchio, completa la formazione con un probabile soggiorno in Italia (1517-1519) dove assorbe la prospettiva mantegnesca e lo sfumato leonardesco. Autore di ritratti e soggetti devozionali, cerca di conservare una doppia committenza cattolica e protestante. Nel 1532 si trasferisce in Inghilterra dove diventa pittore di corte di Enrico VIII Tudor.', '{'Ritratto realistico a mezzobusto','Resa lenticolare dei dettagli','Tavolozza limitata ai bruni'}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'bosch', 'Hieronymus Bosch', '{'Jheronimus van Aken'}', 1450, 1516,
  '{'rinasc-nordico'}', 'Pittore', 'Pittore fiammingo attivo a ''s-Hertogenbosch. Le sue opere allucinate, con terribili fusioni tra oggetti inanimati, esseri viventi e vegetali, diventano metafore dei vizi e dei peccati. Visioni da incubo rese con minuzioso realismo secondo la tradizione fiamminga.', '{'Allegorie allucinate','Fusioni mostruose tra elementi diversi','Realismo minuzioso dei dettagli'}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'grunewald', 'Matthias Grünewald', '{'Mathis Gothart Nithart'}', 1475, 1528,
  '{'rinasc-nordico'}', 'Pittore', 'Pittore tedesco nativo di Würzburg, contemporaneo di Dürer. Propone una sintesi della pittura del Rinascimento nordico caratterizzata da un''attitudine visionaria ed estremamente espressiva, al limite della deformazione delle figure. Emblematico è l''altare per la chiesa abbaziale degli Antoniani a Isenheim.', '{'Pittura visionaria','Espressionismo ante litteram','Stesura materica'}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'cranach-vecchio', 'Lucas Cranach il Vecchio', '{'Lucas Sunder'}', 1472, 1553,
  '{'rinasc-nordico'}', 'Pittore e incisore', 'Pittore e incisore tedesco, prende nome dalla città natale Kronach. Studia l''opera grafica di Dürer. Le prime opere lo collocano nella ''Scuola Danubiana''. Nel 1505 si trasferisce a Wittenberg dove diviene pittore di corte dei principi elettori di Sassonia. A stretto contatto con Lutero, ne dipinge ritratti che diventano immagine ''ufficiale'' del padre della Riforma. Abbracciata la fede protestante, si impegna a divulgarne i principi attraverso l''incisione.', '{'Ritratto di Lutero come immagine ufficiale','Iconografia luterana','Linearismo raffinato tardogotico'}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'le-breton', 'Gilles Le Breton', '{}', NULL, 1553,
  '{'manierismo'}', 'Architetto', 'Capomastro e architetto francese attivo dal 1526. Progetta il castello di Fontainebleau dal 1528 sul sito di un''antica dimora di caccia, creando un''originale sintesi della tradizione medievale francese e del Rinascimento italiano.', '{'Sintesi gotico-rinascimentale','Porte Dorée con facciata a loggia'}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'serlio', 'Sebastiano Serlio', '{}', 1475, 1554,
  '{'manierismo'}', 'Architetto e trattatista', 'Architetto bolognese chiamato a corte in Francia nel 1541. Nominato architetto del re, dedica a Francesco I i primi tre volumi del trattato ''Sette libri dell''architettura''. Esercita influenza soprattutto a livello teorico.', '{'Trattato Sette libri dell''architettura','Diffusione del classicismo italiano in Francia'}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'rosso-fiorentino', 'Rosso Fiorentino', '{'Giovanni Battista di Jacopo'}', 1494, 1540,
  '{'manierismo'}', 'Pittore', 'Pittore toscano chiamato in Francia nel 1530. Diviene capo generale delle fabbriche, delle pitture e degli ornamenti del palazzo di Fontainebleau. Dal 1534 si occupa della Galleria di Francesco I. La sua decorazione integra affreschi, stucchi ad altorilievo e decorazioni dipinte con un linguaggio fatto di simboli, allegorie e allusioni letterarie.', '{'Strapwork','Decorazione integrata affresco-stucco','Linguaggio simbolico criptico'}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'primaticcio', 'Francesco Primaticcio', '{}', 1504, 1570,
  '{'manierismo'}', 'Pittore', 'Pittore giunto in Francia nel 1532. La sua attività prosegue fino al 1570. Decorazioni della camera della duchessa d''Etampes con affreschi dedicati ad Alessandro Magno. Stile elegante e simmetrico, con cariatidi dalle teste minute e profili di purezza classica, canoni proporzionali allungati.', '{'Cariatidi allungate','Composizione simmetrica ed elegante'}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'cellini', 'Benvenuto Cellini', '{}', 1500, 1571,
  '{'manierismo'}', 'Orafo e scultore', 'Orafo e scultore fiorentino, giunge a Fontainebleau nel 1540 alla morte di Rosso Fiorentino. Realizza per Francesco I la celeberrima saliera e l''altorilievo bronzeo della Ninfa di Fontainebleau per la Porte Dorée. Le figure allungate riprendono i modelli affermatisi a Fontainebleau.', '{'Saliera come piccola scultura in oro','Altorilievo bronzeo a tutto tondo','Figure manieristicamente allungate'}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'toledo', 'Juan Bautista de Toledo', '{}', 1515, 1567,
  '{'controriforma'}', 'Architetto', 'Architetto spagnolo, dirige i lavori del monastero dell''Escorial dal 1563 fino alla morte nel 1567.', '{}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'herrera', 'Juan de Herrera', '{}', 1530, 1597,
  '{'controriforma'}', 'Architetto', 'Architetto spagnolo, subentra a Toledo nella direzione dei lavori dell''Escorial dal 1567 al 1586. L''edificio in granito grigio è delimitato da quattro torri angolari con pianta a griglia di cortili.', '{'Classicismo austero','Pianta a griglia di cortili'}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'el-mudo', 'Juan Fernández de Navarrete', '{'El Mudo'}', 1526, 1579,
  '{'controriforma'}', 'Pittore', 'Pittore spagnolo detto El Mudo (il Muto). Si sarebbe formato in Italia presso Tiziano. Filippo II gli commissiona trentadue pale d''altare, ma muore prematuramente dopo aver realizzato sette tele.', '{}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'cambiaso', 'Luca Cambiaso', '{}', 1527, 1585,
  '{'controriforma'}', 'Pittore', 'Pittore genovese di vasta cultura e notevoli capacità compositive. Giunge in Spagna nel 1583. Affresca la volta del coro con la Gloria della Trinità all''Escorial, adeguandosi alle disposizioni del re: figure celestiali compatte e gerarchicamente allineate.', '{'Composizione gerarchica di schiere celestiali'}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'el-greco', 'El Greco', '{'Domenikos Theotokopoulos'}', 1541, 1614,
  '{'controriforma'}', 'Pittore', 'Pittore formatosi a Creta nell''ambiente dei pittori di icone. Giunge nella penisola iberica nel 1577 dopo aver soggiornato in Italia tra Venezia e Roma. La sua arte risente dell''esempio di Raffaello, Michelangelo, Tiziano, Tintoretto. Si distacca nettamente dalla pittura devozionale controriformista, fino a esiti di esplicito antinaturalismo con figure allungate e colori dissonanti.', '{'Stilizzazione antinaturalistica delle figure','Doppio punto di vista','Luce abbagliante dal Bambino','Tonalità bluastra dominante'}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'arcimboldo', 'Giuseppe Arcimboldo', '{}', 1527, 1593,
  '{'manierismo'}', 'Pittore', 'Pittore lombardo nato da una famiglia di artisti impegnata nel cantiere del duomo di Milano. Nel 1562 si trasferisce a Praga e nel 1564 ottiene l''incarico ufficiale alla corte asburgica. Per l''imperatore lavora anche come costumista e organizza scenografie di feste e tornei. Le sue opere più note sono le teste composte con verdure, frutta, fiori e animali: allegorie celebrative della casa imperiale con complessi riferimenti culturali.', '{'Teste composte con elementi naturali','Allegorie vegetali celebrate la casa imperiale','Ritratto come Vertumno'}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'spranger', 'Bartholomäus Spranger', '{}', 1546, 1611,
  '{'manierismo'}', 'Pittore', 'Pittore fiammingo di Anversa attivo alla corte di Rodolfo II a Praga. Produzione di soggetto erotico e gusto manierista, incentrata su soggetti mitologici e allegorici. Studia i modelli del Manierismo italiano.', '{'Soggetto erotico manierista','Contrapposto indolente del corpo nudo'}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'von-aachen', 'Hans von Aachen', '{}', 1552, 1615,
  '{'manierismo'}', 'Pittore', 'Pittore nordico attivo alla corte di Rodolfo II a Praga. Ha soggiornato in Italia a stretto contatto con il Manierismo.', '{}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'heintz-vecchio', 'Joseph Heintz il Vecchio', '{}', 1564, 1609,
  '{'manierismo'}', 'Pittore', 'Pittore nordico attivo alla corte di Rodolfo II a Praga. Ha soggiornato in Italia a stretto contatto con il Manierismo.', '{}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'taddeo-zuccari', 'Taddeo Zuccari', '{}', 1529, 1566,
  '{'controriforma'}', 'Pittore', 'Pittore nato nel ducato di Urbino. Prosegue gli studi a Roma sotto l''influenza del Manierismo raffaellesco di Polidoro da Caravaggio e Perin del Vaga. Lavora a Firenze e Venezia. Incaricato di decorare la villa Farnese a Caprarola. Nella Pietà per la cappella della villa si impone come uno dei primi modelli dell''arte post-tridentina: chiarezza e semplicità, ricerca di verosimiglianza e devota compunzione.', '{'Arte post-tridentina','Chiarezza e semplicità narrativa','Devota compunzione'}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'barocci', 'Federico Barocci', '{}', 1528, 1612,
  '{'controriforma'}', 'Pittore', 'Pittore marchigiano, torna a Urbino nel 1565 dopo aver lavorato nei Palazzi Vaticani (1561-1563). Interprete di una pittura devozionale fondata su una sincera poetica degli affetti. Immagini semplici e comprensibili ma dinamiche e coinvolgenti, grazie alla perizia compositiva e alla materia pittorica iridescente e cangiante. Armoniosa fusione dei toni derivata da Correggio.', '{'Poetica degli affetti','Materia pittorica iridescente e cangiante','Fusione morbida dei toni'}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'tibaldi', 'Pellegrino Tibaldi', '{}', 1527, 1596,
  '{'controriforma'}', 'Architetto e pittore', 'Architetto e pittore di formazione bolognese. Lavora a Roma con Perin del Vaga, studiando Michelangelo, Peruzzi e Serlio. A Milano assume la guida del cantiere del duomo. Nel 1569 progetta per i Gesuiti la chiesa di San Fedele: ambiente unitario con cappelle laterali ridotte ai minimi termini, navata che immette scenograficamente nel presbiterio con abside semicircolare e tiburio lombardo.', '{'Chiesa a navata unica con cappelle minimizzate','Tiburio tipicamente lombardo','Abside semicircolare'}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'procaccini-giulio', 'Giulio Cesare Procaccini', '{}', 1574, 1625,
  '{'controriforma'}', 'Pittore', 'Pittore bolognese attivo a Milano dal 1591. Importa riferimenti a Parmigianino con luminismo prezioso, colori freddi e sontuosi, composizioni di intimo patetismo. All''inizio del Seicento si avvicina a Morazzone e Cerano formando la triade dei pittori di Federico Borromeo.', '{'Luminismo prezioso','Colori freddi e sontuosi','Intimo patetismo'}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'morazzone', 'Pier Francesco Mazzucchelli', '{'Morazzone'}', 1573, 1626,
  '{'controriforma'}', 'Pittore', 'Pittore lombardo, con Cerano e Procaccini costituisce la triade dei pittori di Federico Borromeo. Nel Quadro delle tre mani dipinge il centro del Martirio delle sante Rufina e Seconda.', '{}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artists (id, name, aka, birth, death, period_ids, role, bio, innovations) VALUES (
  'cerano', 'Giovan Battista Crespi', '{'Cerano'}', 1573, 1632,
  '{'controriforma'}', 'Pittore', 'Pittore lombardo. Per il duomo di Milano realizza quattro dei Quadroni di san Carlo. In ''San Carlo visita gli appestati'' concilia gusto narrativo e adesione alla religiosità di Carlo Borromeo con soluzioni formali complesse. Con Procaccini e Morazzone forma la triade dei pittori di Federico Borromeo.', '{'Quadroni di san Carlo','Stile borromaico'}'
) ON CONFLICT (id) DO NOTHING;

-- ==================== OPERE ====================
INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'ritratto-erasmo-holbein', 'Ritratto di Erasmo da Rotterdam', '{'holbein-giovane'}', 'rinasc-nordico',
  '1523 circa', 1523, 1523, 'ritratto',
  '{'olio-tavola'}', '{'olio','tavola'}', 'Parigi', 'Musée du Louvre',
  48.8606, 2.3376, 8, 8, 477, 3,
  'Ritratto a mezzobusto del teologo Erasmo da Rotterdam, con tavolozza limitata ai bruni che dà sostanza all''autorevolezza intellettuale e morale del soggetto.', 'Holbein ritrae Erasmo rifacendosi alla consolidata iconografia rinascimentale a mezzobusto e adottando una tavolozza limitata a pochi colori dominati dai bruni. Dà in questo modo sostanza all''autorevolezza intellettuale e morale di Erasmo e ne evidenzia la dimensione di esegeta dei testi sacri, pure in un ritratto pienamente realistico.', '{'Tavolozza limitata ai bruni','Ritratto a mezzobusto'}', '{}',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Hans_Holbein_the_Younger_-_Erasmus_of_Rotterdam_-_WGA10774.jpg/406px-Hans_Holbein_the_Younger_-_Erasmus_of_Rotterdam_-_WGA10774.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Hans_Holbein_the_Younger_-_Erasmus_of_Rotterdam_-_WGA10774.jpg/300px-Hans_Holbein_the_Younger_-_Erasmus_of_Rotterdam_-_WGA10774.jpg', 'wikimedia-commons'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'ritratto-tommaso-moro', 'Ritratto di Tommaso Moro', '{'holbein-giovane'}', 'rinasc-nordico',
  '1527', 1527, 1527, 'ritratto',
  '{'olio-tavola'}', '{'olio','tavola'}', 'New York', 'The Frick Collection',
  40.7711, -73.9674, 8, 8, 478, 3,
  'Ritratto di Tommaso Moro con volto realistico, abito raffinato con velluti e pelliccia, collare delle Esse con medaglione della Rosa dei Tudor.', 'Holbein è favorito dalla frequentazione pressoché quotidiana con Moro (entrambi risiedono nel quartiere di Chelsea), che gli consente di familiarizzare con la fisionomia del soggetto e di coglierne appieno la personalità, il peso politico e l''autorevolezza culturale. Il volto appare realistico in ogni dettaglio, fin nella definizione lenticolare dei singoli peli della barba. Il prestigio e la posizione sociale di Moro sono testimoniati dalla raffinatezza dell''abito, rimarchevole per la resa straordinaria dei velluti e della pelliccia, e dall''evidenza attribuita al ''collare delle Esse'' con il medaglione della Rosa dei Tudor, casato di Enrico VIII.', '{'Resa lenticolare dei dettagli','Collare delle Esse con Rosa dei Tudor'}', '{}',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Hans_Holbein_the_Younger_-_Sir_Thomas_More_-_WGA10825.jpg/401px-Hans_Holbein_the_Younger_-_Sir_Thomas_More_-_WGA10825.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Hans_Holbein_the_Younger_-_Sir_Thomas_More_-_WGA10825.jpg/300px-Hans_Holbein_the_Younger_-_Sir_Thomas_More_-_WGA10825.jpg', 'wikimedia-commons'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'ambasciatori-holbein', 'Gli Ambasciatori', '{'holbein-giovane'}', 'rinasc-nordico',
  '1533', 1533, 1533, 'ritratto',
  '{'olio-tavola'}', '{'olio','tavola'}', 'Londra', 'National Gallery',
  51.5089, -0.1283, 8, 8, 478, 3,
  'Doppio ritratto dei diplomatici Jean de Dinteville e Georges de Selve con anamorfosi di un teschio.', 'Il dipinto rappresenta due ambasciatori francesi alla corte di Enrico VIII. La composizione include oggetti simbolici: strumenti scientifici, globo terrestre, libri di musica. Nel primo piano un teschio distorto anamorficamente richiama la vanità delle conquiste terrene.', '{'Anamorfosi del teschio','Natura morta simbolica'}', '{}',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Hans_Holbein_the_Younger_-_The_Ambassadors_-_Google_Art_Project.jpg/800px-Hans_Holbein_the_Younger_-_The_Ambassadors_-_Google_Art_Project.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Hans_Holbein_the_Younger_-_The_Ambassadors_-_Google_Art_Project.jpg/400px-Hans_Holbein_the_Younger_-_The_Ambassadors_-_Google_Art_Project.jpg', 'wikimedia-commons'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'trittico-carro-fieno', 'Trittico del Carro di fieno', '{'bosch'}', 'rinasc-nordico',
  '1512-1515', 1512, 1515, 'dipinto',
  '{'olio-tavola'}', '{'olio','tavola'}', 'Madrid', 'Museo Nacional del Prado',
  40.4138, -3.6921, 8, 8, 477, 3,
  'Trittico con ante aperte e chiuse: il carro di fieno come allegoria dei beni materiali circondato da figure di ogni estrazione sociale in una danza macabra.', 'Al centro del Trittico si intravede in alto Cristo risorto come l''unica possibilità di salvezza in un universo dominato dalla cupidigia. Sulla parte esterna delle ante Bosch raffigura il pellegrino che vaga senza sosta. All''interno, lo sportello di sinistra descrive quattro episodi biblici: la caduta degli angeli ribelli, la creazione di Eva, il peccato originale e la cacciata dal Paradiso terrestre. Nella tavola centrale il carro di fieno, simbolo dei beni materiali, è circondato da figure di ogni estrazione sociale, in una sorta di allegorica danza macabra. L''ultimo pannello illustra le conseguenze delle azioni umane: peccatori puniti da creature mostruose.', '{'Allegoria del carro di fieno','Danza macabra simbolica','Pannelli con visioni infernali'}', '{}',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/El_triunfo_de_la_Muerte.jpg/1280px-El_triunfo_de_la_Muerte.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/El_triunfo_de_la_Muerte.jpg/400px-El_triunfo_de_la_Muerte.jpg', 'wikimedia-commons'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'altare-isenheim', 'Altare di Isenheim (Crocifissione)', '{'grunewald'}', 'rinasc-nordico',
  '1512-1516', 1512, 1516, 'pala d''altare',
  '{'olio-tavola'}', '{'olio','tavola'}', 'Colmar', 'Musée d''Unterlinden',
  48.0776, 7.3589, 8, 8, 479, 3,
  'Grande macchina d''altare con sportelli mobili: Crocifissione drammatica, Concerto di angeli e Natività.', 'Quando è chiusa, la pala mostra una drammatica Crocifissione su fondo nero: Maria sviene tra le braccia di san Giovanni Evangelista, mentre san Giovanni Battista indica il corpo di Cristo straziato da piaghe. La pittura è stesa matericamente a evidenziare le forme anticlassiche. Nelle ante laterali le figure di san Sebastiano e sant''Antonio Abate. Aprendo i pannelli: un celestiale Concerto di angeli sotto un''elegante architettura tardogotica e una Natività in antitesi con la visione notturna della morte di Cristo. Sulle tavole laterali l''Annunciazione e una visionaria Resurrezione dal forte impatto luministico.', '{'Macchina d''altare a sportelli','Crocifissione visionaria e materica','Contrasto luce/tenebre'}', '{}',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Matthias_Gr%C3%BCnewald_-_The_Crucifixion_-_Google_Art_Project.jpg/1280px-Matthias_Gr%C3%BCnewald_-_The_Crucifixion_-_Google_Art_Project.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Matthias_Gr%C3%BCnewald_-_The_Crucifixion_-_Google_Art_Project.jpg/400px-Matthias_Gr%C3%BCnewald_-_The_Crucifixion_-_Google_Art_Project.jpg', 'wikimedia-commons'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'ritratto-lutero-cranach', 'Ritratto di Lutero e Katharina von Bora', '{'cranach-vecchio'}', 'rinasc-nordico',
  '1529', 1529, 1529, 'ritratto',
  '{'olio-tavola'}', '{'olio','tavola'}', 'Firenze', 'Gallerie degli Uffizi',
  43.7677, 11.2553, 8, 8, 479, 2,
  'Doppio ritratto di Lutero e della moglie Katharina von Bora, immagine ufficiale del padre della Riforma.', 'Cranach dipinge ritratti di Lutero che saranno replicati infinite volte, fino a diventare immagine ''ufficiale'' del padre della Riforma. Il pittore si tiene lontano da ogni idealizzazione e vuole piuttosto evidenziare l''umanità di Lutero, che sembra invitare lo spettatore a un dialogo personale.', '{'Ritratto ufficiale di Lutero','Doppio pannello'}', '{}',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Lucas_Cranach_d.%C3%84._-Martin_Luther%281529%29.jpg/401px-Lucas_Cranach_d.%C3%84._-Martin_Luther%281529%29.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Lucas_Cranach_d.%C3%84._-Martin_Luther%281529%29.jpg/300px-Lucas_Cranach_d.%C3%84._-Martin_Luther%281529%29.jpg', 'wikimedia-commons'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'fontainebleau-porte-doree', 'Porte Dorée, Castello di Fontainebleau', '{'le-breton'}', 'manierismo',
  'dal 1528', 1528, 1540, 'architettura',
  '{}', '{'pietra'}', 'Fontainebleau', 'Castello di Fontainebleau',
  48.4047, 2.7019, 8, 9, 481, 2,
  'Accesso principale del castello di Fontainebleau: loggia a tre ordini con finestre sovrapposte e alti tetti a spiovente.', 'Il Porte Dorée viene costruito reinterpretando il modello rinascimentale della facciata dei Torricini di Urbino: una loggia a tre ordini fiancheggiata da spazi inquadrati da pilastri con due finestre sovrapposte verticalmente. Il frontone della finestra inferiore funge da base per quella superiore. Completato da alti tetti a spiovente, privo di decorazioni.', '{'Loggia a tre ordini','Frontoni come basi'}', '{}',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Fontainebleau_-_Porte_Dor%C3%A9e_01.jpg/800px-Fontainebleau_-_Porte_Dor%C3%A9e_01.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Fontainebleau_-_Porte_Dor%C3%A9e_01.jpg/400px-Fontainebleau_-_Porte_Dor%C3%A9e_01.jpg', 'wikimedia-commons'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'galleria-francesco-i', 'Galleria di Francesco I', '{'rosso-fiorentino','primaticcio'}', 'manierismo',
  '1534-1540 circa', 1534, 1540, 'affresco',
  '{'affresco'}', '{'affresco','stucco'}', 'Fontainebleau', 'Castello di Fontainebleau',
  48.4047, 2.7019, 8, 9, 482, 3,
  'Decorazione con 14 riquadri ad affresco e stucchi ad altorilievo che celebrano Francesco I con simboli, allegorie e allusioni letterarie.', 'La decorazione si suddivide in quattordici riquadri compresi tra le finestre. Ampi riquadri ad affresco dedicati alla celebrazione di Francesco I campeggiano entro elaborate cornici, composte da stucchi ad altorilievo e decorazioni dipinte. Particolare fortuna avrà lo strapwork, che imita i riccioli e le volute di una striscia di cuoio.', '{'Strapwork','Decorazione integrata affresco-stucco'}', '{}',
  NULL, NULL, NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'elefante-trionfale', 'Elefante trionfale, tributo allegorico a Francesco I', '{'rosso-fiorentino','primaticcio'}', 'manierismo',
  '1534-1540', 1534, 1540, 'affresco',
  '{'affresco'}', '{'affresco','stucco'}', 'Fontainebleau', 'Castello di Fontainebleau, Galleria di Francesco I',
  48.4047, 2.7019, 8, 9, 482, 2,
  'Affresco e stucco con elefante allegorico tributo a Francesco I nella Galleria.', 'Il elefante trionfale è un tributo allegorico a Francesco I, parte della decorazione della Galleria. L''elefante, simbolo di forza e regalità, reca sul dorso elementi celebrativi del sovrano.', '{}', '{}',
  NULL, NULL, NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'camera-duchessa-etampes', 'Camera della duchessa d''Etampes', '{'primaticcio'}', 'manierismo',
  '1541-1544', 1541, 1544, 'affresco',
  '{'affresco'}', '{'affresco','stucco'}', 'Fontainebleau', 'Castello di Fontainebleau',
  48.4047, 2.7019, 8, 9, 482, 2,
  'Serie di affreschi dedicati ad Alessandro Magno che alludono alla relazione tra il re e la duchessa d''Etampes.', 'Una serie di affreschi dedicati ad Alessandro Magno — celebrato sia come valoroso condottiero sia come valente amante — allude alla relazione tra il re e la duchessa. Le scene sono incorniciate da stucchi ad altorilievo. Effetto ripetitivo delle pose delle cariatidi, teste minute, profili di purezza classica, canoni allungati.', '{'Cariatidi allungate','Stile simmetrico elegante'}', '{}',
  NULL, NULL, NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'ninfa-fontainebleau', 'Ninfa di Fontainebleau', '{'cellini'}', 'manierismo',
  '1542-1543', 1542, 1543, 'scultura',
  '{'bronzo'}', '{'bronzo'}', 'Parigi', 'Musée du Louvre',
  48.8606, 2.3376, 8, 9, 483, 3,
  'Altorilievo bronzeo con ninfa sdraiata, urna, cani, cinghiali, daini e cervo per ornare la Porte Dorée.', 'Il soggetto si deve a una precisa richiesta del sovrano che desiderava collocare sulla porta il genio protettore di Fontainebleau. La ninfa, divinità classica protettrice dei boschi e delle fonti, personifica la sorgente. La fanciulla è quasi sdraiata e si appoggia a un''urna dalla quale sgorga l''acqua. A destra la muta dei cani, a sinistra cinghiali e daini. Sopra la ninfa un cervo con testa monumentale a tutto tondo.', '{'Altorilievo a tutto tondo','Figure allungate manieriste'}', '{}',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/La_Nymphe_de_Fontainebleau%28Bandeau%29.jpg/1280px-La_Nymphe_de_Fontainebleau%28Bandeau%29.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/La_Nymphe_de_Fontainebleau%28Bandeau%29.jpg/400px-La_Nymphe_de_Fontainebleau%28Bandeau%29.jpg', 'wikimedia-commons'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'saliera-francesco-i', 'Saliera di Francesco I', '{'cellini'}', 'manierismo',
  '1540-1543', 1540, 1543, 'oreficeria',
  '{'oro-smalti'}', '{'oro','smalti','ebano'}', 'Vienna', 'Kunsthistorisches Museum',
  48.2035, 16.3622, 8, 9, 484, 3,
  'Saliera in oro e smalti su base di ebano: Nettuno e Pomona rappresentano il Mare e la Terra nell''origine del sale.', 'L''opera ha il carattere di una piccola scultura in oro. Le due figure principali, elegantissime e manieristicamente allungate, rappresentano il Mare (Nettuno) e la Terra (Pomona). Le gambe quasi intrecciate esprimono la compenetrazione dei due elementi. La superficie è divisa in zona marina (cavalli marini, tartaruga, delfini) e terrestre (segugio, leone, elefante). Vicino alle figure piccoli contenitori (tempio e nave) per il sale. Nel basamento i Venti e le quattro parti del giorno.', '{'Piccola scultura in oro','Figure allungate in precarietà','Contenitori a forma di tempio e nave'}', '{}',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Saliera_von_Benvenuto_Cellini_01.jpg/640px-Saliera_von_Benvenuto_Cellini_01.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Saliera_von_Benvenuto_Cellini_01.jpg/400px-Saliera_von_Benvenuto_Cellini_01.jpg', 'wikimedia-commons'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'el-escorial', 'Monastero di San Lorenzo (El Escorial)', '{'toledo','herrera'}', 'controriforma',
  '1563-1586', 1563, 1586, 'architettura',
  '{}', '{'granito'}', 'El Escorial', 'Monastero di San Lorenzo',
  40.5874, -4.1453, 8, 9, 485, 3,
  'Enorme complesso monastero-palazzo-pantheon (207x162 m) in granito grigio con pianta a griglia di cortili e chiesa a croce greca.', 'Il monastero racchiude funzioni di monastero, Palazzo Reale e chiesa-pantheon della dinastia. Pianta a rettangolo (207x162 m) con griglia di cortili che richiama la graticola di san Lorenzo. Interamente in granito grigio, con quattro torri angolari. Tre sezioni parallele: settore sud (edifici conventuali, Patio de los Evangelistas), lato nord (seminario, collegio, Palazzo Reale), sezione centrale (appartamenti del re, biblioteca, chiesa a pianta a croce greca con facciata di classicismo romano).', '{'Pianta a griglia','Classicismo austero','Materializzazione dello spirito controriformista'}', '{}',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Monasterio_de_El_Escorial_06.jpg/1280px-Monasterio_de_El_Escorial_06.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Monasterio_de_El_Escorial_06.jpg/400px-Monasterio_de_El_Escorial_06.jpg', 'wikimedia-commons'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'gloria-trinita-cambiaso', 'Gloria della Trinità', '{'cambiaso'}', 'controriforma',
  '1584-1585', 1584, 1585, 'affresco',
  '{'affresco'}', '{'affresco'}', 'El Escorial', 'Chiesa del monastero di San Lorenzo',
  40.5874, -4.1453, 8, 9, 486, 2,
  'Affresco della volta del coro con schiere celesti compatte e gerarchicamente allineate adoranti la Trinità.', 'Cambiaso rinuncia alla sua formazione michelangiolesca per rappresentare un disincarnato esercito di figure celesti adoranti la Trinità, disposte come schiere compatte e gerarchicamente allineate, a riflettere il rigido ritorno all''ordine cattolico promosso da Filippo II.', '{'Schiere compatte e gerarchiche'}', '{}',
  NULL, NULL, NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'trinita-el-greco', 'Trinità', '{'el-greco'}', 'controriforma',
  '1577-1579', 1577, 1579, 'dipinto',
  '{'olio-tela'}', '{'olio','tela'}', 'Madrid', 'Museo Nacional del Prado',
  40.4138, -3.6921, 8, 9, 487, 3,
  'Dio Padre sorregge il corpo morto di Cristo con coro di angeli dai colori freddi e dissonanti.', 'L''iconografia rimanda a un''incisione di Dürer. Il tema della Trinità si sovrappone a quello della Pietà: Dio Padre sorregge il corpo morto di Cristo con i segni della crocifissione. La figura di Cristo rivela nella possente torsione la conoscenza della Pietà Bandini di Michelangelo. Ricchezza dei contrasti cromatici, intensità luminosa, gamma di colori freddi e dissonanti nel coro di angeli.', '{'Sovrapposizione Trinità e Pietà','Colori freddi e dissonanti'}', '{}',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/El_Greco_-_The_Trinity_-_WGA10554.jpg/402px-El_Greco_-_The_Trinity_-_WGA10554.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/El_Greco_-_The_Trinity_-_WGA10554.jpg/300px-El_Greco_-_The_Trinity_-_WGA10554.jpg', 'wikimedia-commons'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'martirio-san-maurizio', 'Martirio di san Maurizio', '{'el-greco'}', 'controriforma',
  '1580-1582', 1580, 1582, 'dipinto',
  '{'olio-tela'}', '{'olio','tela'}', 'El Escorial', 'Chiesa del monastero di San Lorenzo',
  40.5874, -4.1453, 8, 9, 487, 3,
  'Composizione affollata con san Maurizio che ritorna su piani diversi, rifiutata da Filippo II per complessità non controriformista.', 'La composizione è affollata e di interpretazione non semplice, con la figura del protagonista che ritorna più volte su piani diversi. L''episodio del martirio è relegato sullo sfondo. El Greco mescola agiografia e contemporaneità: tra le figure i duchi Emanuele Filiberto di Savoia e Alessandro Farnese. Smarcata dai criteri controriformisti di chiarezza, la pala viene rifiutata dal re.', '{'Figura che ritorna su piani diversi','Mescolanza agiografia e contemporaneità'}', '{}',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/El_Greco_-_Martyrdom_of_Saint_Maurice_-_WGA10557.jpg/800px-El_Greco_-_Martyrdom_of_Saint_Maurice_-_WGA10557.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/El_Greco_-_Martyrdom_of_Saint_Maurice_-_WGA10557.jpg/400px-El_Greco_-_Martyrdom_of_Saint_Maurice_-_WGA10557.jpg', 'wikimedia-commons'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'adorazione-pastori-el-greco', 'Adorazione dei pastori', '{'el-greco'}', 'controriforma',
  '1612-1614', 1612, 1614, 'dipinto',
  '{'olio-tela'}', '{'olio','tela'}', 'Madrid', 'Museo Nacional del Prado',
  40.4138, -3.6921, 8, 9, 487, 3,
  'Pala con Bambino da cui emana luce abbagliante, figure allungate e pennellate dense con doppio punto di vista.', 'Dal Bambino emana una luce abbagliante, ripresa dalle invenzioni di Correggio, che accende di improvvisi bagliori lo spazio scuro della capanna. Le pennellate dense variano a seconda degli effetti di luce. Le figure, allungate al limite della stilizzazione manierista, sembrano fluttuare prese da un''estasi. El Greco combina due punti di vista: da sotto in su per gli angeli e dal basso verso l''alto per i pastori.', '{'Luce abbagliante dal Bambino','Doppio punto di vista','Figure fluttuanti in estasi'}', '{}',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/El_Greco_-_Adoration_of_the_Shepherds_-_WGA10560.jpg/402px-El_Greco_-_Adoration_of_the_Shepherds_-_WGA10560.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/El_Greco_-_Adoration_of_the_Shepherds_-_WGA10560.jpg/300px-El_Greco_-_Adoration_of_the_Shepherds_-_WGA10560.jpg', 'wikimedia-commons'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'sepoltura-conte-orgaz', 'La sepoltura del conte di Orgaz', '{'el-greco'}', 'controriforma',
  '1586-1588', 1586, 1588, 'dipinto',
  '{'olio-tela'}', '{'olio','tela'}', 'Toledo', 'Chiesa di Santo Tomé',
  39.8628, -4.0273, 8, 9, 488, 3,
  'Dipinto monumentale: parte bassa con sepoltura del conte da parte dei santi Stefano e Agostino, parte alta con il Paradiso.', 'La parte bassa rappresenta la collocazione della salma nella tomba a opera dei santi Stefano e Agostino in presenza di una folla. La parte alta raffigura l''intero Paradiso che assiste all''evento con l''accoglienza e il giudizio dell''anima del conte. El Greco attualizza la scena attribuendo costumi contemporanei. La visione allucinata del Paradiso, le figure allungate innaturalmente, la tonalità bluastra dominante confermano l''irriducibilità di El Greco alle convenzioni devozionali.', '{'Doppia composizione terra/paradiso','Figure allungate innaturalmente','Tonalità bluastra dominante'}', '{}',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/El_Greco_-_The_Burial_of_the_Count_of_Orgaz_-_WGA10558.jpg/800px-El_Greco_-_The_Burial_of_the_Count_of_Orgaz_-_WGA10558.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/El_Greco_-_The_Burial_of_the_Count_of_Orgaz_-_WGA10558.jpg/400px-El_Greco_-_The_Burial_of_the_Count_of_Orgaz_-_WGA10558.jpg', 'wikimedia-commons'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'rodolfo-ii-vertumno', 'Rodolfo II come Vertumno', '{'arcimboldo'}', 'manierismo',
  '1590', 1590, 1590, 'ritratto',
  '{'olio-tavola'}', '{'olio','tavola'}', 'Skokloster', 'Castello di Skokloster',
  59.4286, 17.5806, 8, 9, 489, 3,
  'Ritratto allegorico di Rodolfo II come Vertumno, composto da frutta, verdura e fiori di ogni stagione.', 'L''imperatore è allegoricamente presentato come Vertumno, divinità etrusco-romana dell''alternarsi di mesi e stagioni, in una metamorfica raffigurazione che combina frutta, verdura e fiori di ogni periodo dell''anno. L''opera celebra la prosperità garantita dal sovrano, alludendo all''armoniosa convivenza di popoli e territori diversi sotto la corona imperiale. La pannocchia di mais testimonia la modernità e il legame con il Nuovo Mondo.', '{'Ritratto composto da elementi naturali','Allegoria di Vertumno','Riferimento al Nuovo Mondo (mais)'}', '{}',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Giuseppe_Arcimboldo_-_Rodolfo_II_as_Vertumnus_-_Skoklosters_slott.jpg/402px-Giuseppe_Arcimboldo_-_Rodolfo_II_as_Vertumnus_-_Skoklosters_slott.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Giuseppe_Arcimboldo_-_Rodolfo_II_as_Vertumnus_-_Skoklosters_slott.jpg/300px-Giuseppe_Arcimboldo_-_Rodolfo_II_as_Vertumnus_-_Skoklosters_slott.jpg', 'wikimedia-commons'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'ercole-onfale', 'Ercole e Onfale', '{'spranger'}', 'manierismo',
  '1585 circa', 1585, 1585, 'dipinto',
  '{'olio-rame'}', '{'olio','rame'}', 'Vienna', 'Kunsthistorisches Museum',
  48.2035, 16.3622, 8, 9, 491, 2,
  'Piccolo dipinto su rame: Ercole schiavo di Onfale con scambio di ruoli, dal gusto erotico manierista.', 'Come punizione per aver rubato il tripode dell''oracolo di Delfi, Ercole diviene schiavo di Onfale, regina di Lidia, costretto a indossare abiti femminili e dedicarsi alla tessitura. Onfale sottrae la clava e la pelle di leone. Il tema dello scambio di ruoli allude alla sorte di uomini ridotti in schiavitù da donne lascive. Il contrapposto indolente del corpo nudo è frutto dello studio dei modelli del Manierismo italiano.', '{'Scambio di ruoli sessuale','Contrapposto indolente'}', '{}',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Bartholomaeus_Spranger_-_Hercules_and_Omphale_-_KHM.jpg/577px-Bartholomaeus_Spranger_-_Hercules_and_Omphale_-_KHM.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Bartholomaeus_Spranger_-_Hercules_and_Omphale_-_KHM.jpg/400px-Bartholomaeus_Spranger_-_Hercules_and_Omphale_-_KHM.jpg', 'wikimedia-commons'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'pieta-zuccari', 'Pietà', '{'taddeo-zuccari'}', 'controriforma',
  '1564-1565', 1564, 1565, 'dipinto',
  '{'olio-tela'}', '{'olio','tela'}', 'Urbino', 'Galleria Nazionale delle Marche',
  43.7243, 12.6372, 8, 10, 494, 2,
  'Primo modello di arte post-tridentina: chiarezza e semplicità con angeli che reggono ceri.', 'Il corpo morto di Cristo viene offerto alla contemplazione del fedele da un gruppo di angeli che reggono lunghi ceri. Pur nel genericamente richiamo a modelli michelangioleschi, l''artista si concentra sulla ricerca di verosimiglianza e devota compunzione, rinunciando alle attitudini contorte e ricercate del Manierismo.', '{'Arte post-tridentina','Chiarezza e semplicità'}', '{}',
  NULL, NULL, NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'sala-fasti-farnesiani', 'Sala dei fasti farnesiani', '{'taddeo-zuccari'}', 'controriforma',
  '1563-1565', 1563, 1565, 'affresco',
  '{'affresco'}', '{'affresco'}', 'Caprarola', 'Palazzo Farnese',
  42.2997, 12.2281, 8, 10, 494, 2,
  'Decorazione profana con grottesche, emblemi, stemmi, paesaggi, finti arazzi e scene storiche farnesiane.', 'Taddeo Zuccari riveste le sale con un fitto repertorio ornamentale di grottesche, emblemi e stemmi e con una profusione di paesaggi, finti arazzi, scene storiche e mitologiche incentrate sulla glorificazione dei Farnese, secondo un programma iconografico elaborato dal committente cardinale Alessandro Farnese.', '{'Repertorio ornamentale farnesiano','Programma iconografico profano'}', '{}',
  NULL, NULL, NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'deposizione-barocci', 'Deposizione dalla croce', '{'barocci'}', 'controriforma',
  '1569', 1569, 1569, 'dipinto',
  '{'olio-tela'}', '{'olio','tela'}', 'Perugia', 'Cattedrale di San Lorenzo',
  43.1122, 12.3889, 8, 10, 494, 2,
  'Cristo calato dalla croce con svenimento della Vergine, stesura cromatica vibrante e iridescente.', 'Con chiari riferimenti a Michelangelo e Sebastiano del Piombo, Barocci dà vita a un''affollata rappresentazione incentrata sul corpo di Cristo calato dalla croce e sullo svenimento della Vergine. L''intonazione patetica dei gesti delle Marie amplifica l''energia espressa. La volumetria sembra sfaldarsi in una vibrante stesura cromatica e nell''alternarsi di luci iridescenti e ombre profonde. Armoniosa fusione dei toni derivata da Correggio.', '{'Stesura cromatica vibrante','Materia pittorica iridescente'}', '{}',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Federico_Barocci_-_Deposition_from_the_Cross_-_WGA10390.jpg/402px-Federico_Barocci_-_Deposition_from_the_Cross_-_WGA10390.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Federico_Barocci_-_Deposition_from_the_Cross_-_WGA10390.jpg/300px-Federico_Barocci_-_Deposition_from_the_Cross_-_WGA10390.jpg', 'wikimedia-commons'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'san-fedele-tibaldi', 'Chiesa di San Fedele', '{'tibaldi'}', 'controriforma',
  '1569', 1569, 1580, 'architettura',
  '{}', '{'pietra','marmo'}', 'Milano', 'Chiesa di San Fedele',
  45.4654, 9.1859, 8, 10, 495, 2,
  'Chiesa gesuita a navata unica con cappelle minimizzate, presbiterio scenografico e tiburio lombardo.', 'San Fedele consiste in un ambiente unitario in cui le cappelle laterali sono ridotte ai minimi termini. L''unica navata immette scenograficamente nel presbiterio, concluso da un''abside semicircolare, sul quale si innesta un tiburio tipicamente lombardo.', '{'Cappelle laterali minimizzate','Tiburio tipicamente lombardo','Presbiterio scenografico'}', '{}',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Milano_chiesa_di_San_Fedele.jpg/800px-Milano_chiesa_di_San_Fedele.jpg', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Milano_chiesa_di_San_Fedele.jpg/400px-Milano_chiesa_di_San_Fedele.jpg', 'wikimedia-commons'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'san-carlo-appestati', 'San Carlo visita gli appestati', '{'cerano'}', 'controriforma',
  '1602', 1602, 1602, 'dipinto',
  '{'tempera-tela'}', '{'tempera','tela'}', 'Milano', 'Duomo di Milano',
  45.4642, 9.191, 8, 10, 496, 2,
  'Quadro dei Quadroni di san Carlo: il santo tra gli appestati con gusto narrativo e religiosità appassionata.', 'Cerano concilia uno spiccato gusto narrativo e una sincera adesione alla religiosità appassionata e severa di Carlo Borromeo con soluzioni formali complesse, cariche di riferimenti alla tarda Maniera tosco-romana, come rivelano le pose articolate delle figure in primo piano.', '{'Stile borromaico','Quadroni di san Carlo'}', '{}',
  NULL, NULL, NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.works (id, title, artist_ids, period_id, date_text, year_start, year_end, type, technique_ids, materials, location_city, location_place, lat, lon, book, chapter, page, importance, summary, analysis, innovations, term_ids, image_url, image_thumb, image_source) VALUES (
  'martirio-rufina-seconda', 'Martirio delle sante Rufina e Seconda (Quadro delle tre mani)', '{'morazzone','cerano','procaccini-giulio'}', 'controriforma',
  '1620-1624', 1620, 1624, 'dipinto',
  '{'olio-tela'}', '{'olio','tela'}', 'Milano', 'Pinacoteca di Brera',
  45.4726, 9.186, 8, 10, 496, 2,
  'Dipinto eseguito da tre mani: Morazzone (centro), Cerano (sinistra), Procaccini (destra). Stile borromaico devozionale.', 'Su incarico del collezionista Scipione Toso, Procaccini, Cerano e Morazzone si misurano sulla stessa tela. A Morazzone l''impianto generale e il carnefice a cavallo, santa Seconda decollata, il putto e il cane. A Cerano la parte sinistra. A Procaccini la parte destra con santa Rufina inginocchiata. Le ''tre mani'' condividono lo stesso approccio devozionale, incline a toni drammatici espressi con raffinata intellettualistica che affonda le radici nella cultura tardomanierista.', '{'Quadro delle tre mani','Collaborazione tra tre pittori'}', '{}',
  NULL, NULL, NULL
) ON CONFLICT (id) DO NOTHING;

-- ==================== CONNESSIONI ====================
INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description) VALUES (
  'conn-holbein-erasmo', 'artist', 'holbein-giovane', 'work', 'ritratto-erasmo-holbein', 'committenza', 'Holbein ritrae Erasmo a Basilea, dove il teologo è impegnato nel tentativo di riavvicinare le confessioni.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description) VALUES (
  'conn-holbein-moro', 'artist', 'holbein-giovane', 'work', 'ritratto-tommaso-moro', 'committenza', 'Holbein ritrae Tommaso Moro durante il primo soggiorno inglese (1526-1528), favorito dalla frequentazione quotidiana a Chelsea.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description) VALUES (
  'conn-holbein-ambasciatori', 'artist', 'holbein-giovane', 'work', 'ambasciatori-holbein', 'committenza', 'Doppio ritratto dei diplomatici alla corte di Enrico VIII.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description) VALUES (
  'conn-holbein-mantegna', 'artist', 'holbein-giovane', 'artist', 'mantegna', 'influenza', 'Holbein assorbe la prospettiva dalla tradizione mantegnesca durante il soggiorno in Italia (1517-1519).'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description) VALUES (
  'conn-holbein-leonardo', 'artist', 'holbein-giovane', 'artist', 'leonardo-da-vinci', 'influenza', 'Holbein assorbe lo sfumato leonardesco durante il soggiorno in Italia.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description) VALUES (
  'conn-cranach-lutero', 'artist', 'cranach-vecchio', 'work', 'ritratto-lutero-cranach', 'committenza', 'Cranach dipinge Lutero a Wittenberg, ritratti replicati infinite volte come immagine ufficiale del padre della Riforma.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description) VALUES (
  'conn-rosso-primaticcio-fontainebleau', 'artist', 'rosso-fiorentino', 'artist', 'primaticcio', 'contaminazione', 'Rosso Fiorentino e Primaticcio collaborano alla decorazione di Fontainebleau, creando la Scuola di Fontainebleau.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description) VALUES (
  'conn-cellini-francesco-i', 'artist', 'cellini', 'work', 'saliera-francesco-i', 'committenza', 'Cellini realizza la saliera per Francesco I, originariamente progettata per il cardinale Ippolito II d''Este.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description) VALUES (
  'conn-el-greco-tiziano', 'artist', 'el-greco', 'artist', 'tiziano', 'influenza', 'El Greco risente dell''esempio di Tiziano durante il soggiorno a Venezia.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description) VALUES (
  'conn-el-greco-michelangelo', 'artist', 'el-greco', 'artist', 'michelangelo', 'influenza', 'La Trinità di El Greco rivela la conoscenza della Pietà Bandini di Michelangelo nella possente torsione di Cristo.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description) VALUES (
  'conn-el-greco-tintoretto', 'artist', 'el-greco', 'artist', 'tintoretto', 'influenza', 'El Greco risente dell''esempio di Tintoretto durante il soggiorno a Venezia.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description) VALUES (
  'conn-el-greco-correggio', 'artist', 'el-greco', 'artist', 'correggio', 'influenza', 'La luce abbagliante dal Bambino nell''Adorazione dei pastori è ripresa dalle invenzioni di Correggio.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description) VALUES (
  'conn-arcimboldo-leonardo', 'artist', 'arcimboldo', 'artist', 'leonardo-da-vinci', 'influenza', 'L''interesse di Arcimboldo per la deformazione deriva dalla conoscenza degli studi fisionomici di Leonardo a Milano.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description) VALUES (
  'conn-barocci-correggio', 'artist', 'barocci', 'artist', 'correggio', 'influenza', 'L''armoniosa e morbida fusione dei toni di Barocci è derivata dalla conoscenza della pittura di Correggio.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description) VALUES (
  'conn-barocci-michelangelo', 'artist', 'barocci', 'artist', 'michelangelo', 'influenza', 'La Deposizione di Barocci presenta chiari riferimenti a Michelangelo.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description) VALUES (
  'conn-tibaldi-michelangelo', 'artist', 'tibaldi', 'artist', 'michelangelo', 'influenza', 'Tibaldi studia l''opera di Michelangelo durante il periodo romano.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description) VALUES (
  'conn-toledo-herrera', 'artist', 'toledo', 'artist', 'herrera', 'maestro-allievo', 'Herrera subentra a Toledo nella direzione dei lavori dell''Escorial dopo la morte di quest''ultimo nel 1567.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description) VALUES (
  'conn-el-greco-filippo-ii', 'artist', 'el-greco', 'work', 'martirio-san-maurizio', 'committenza', 'Filippo II commissiona il Martirio di san Maurizio per l''Escorial, poi rifiutato per complessità non controriformista.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.connections (id, source_type, source_id, target_type, target_id, kind, description) VALUES (
  'conn-cerano-borromeo', 'artist', 'cerano', 'artist', 'carlo-borromeo', 'committenza', 'Cerano realizza i Quadroni di san Carlo sotto il patronato di Federico Borromeo.'
) ON CONFLICT (id) DO NOTHING;

-- ==================== TECNICHE ====================
INSERT INTO public.techniques (id, name, definition, introduced_by, first_period_id, evolution, category) VALUES (
  'olio-tavola', 'Pittura a olio su tavola', 'Tecnica pittorica che utilizza pigmenti legati con olio (solitamente di lino) applicati su supporto ligneo.', 'Jan van Eyck', 'rinascimento', 'Nel Rinascimento nordico viene usata per la resa lenticolare dei dettagli.', 'pittura'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.techniques (id, name, definition, introduced_by, first_period_id, evolution, category) VALUES (
  'olio-tela', 'Pittura a olio su tela', 'Tecnica pittorica con pigmenti a olio su supporto di tela (lino o canapa).', NULL, 'rinascimento', 'Si diffonde nel Cinquecento sostituendo progressivamente la tavola.', 'pittura'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.techniques (id, name, definition, introduced_by, first_period_id, evolution, category) VALUES (
  'affresco', 'Affresco', 'Tecnica pittorica su intonaco fresco, in cui i pigmenti vengono applicati su malta ancora umida.', NULL, 'medioevo', 'Nel Manierismo viene combinato con stucchi e decorazioni dipinte (Fontainebleau).', 'pittura'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.techniques (id, name, definition, introduced_by, first_period_id, evolution, category) VALUES (
  'bronzo', 'Scultura in bronzo', 'Tecnica scultorea tramite fusione di lega di rame e stagno.', NULL, 'antichita', 'Nel Rinascimento viene usata per altorilievi e sculture a tutto tondo.', 'scultura'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.techniques (id, name, definition, introduced_by, first_period_id, evolution, category) VALUES (
  'oro-smalti', 'Oreficeria a smalto', 'Tecnica orafa con applicazione di smalti su metallo prezioso.', NULL, 'medioevo', 'Nel Manierismo raggiunge vertici con la Saliera di Cellini.', 'altra'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.techniques (id, name, definition, introduced_by, first_period_id, evolution, category) VALUES (
  'olio-rame', 'Pittura a olio su rame', 'Tecnica pittorica con olio su lamina di rame, usata per piccoli dipinti di grande dettaglio.', NULL, 'manierismo', 'Tipica del Manierismo per opere da collezionismo privato.', 'pittura'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.techniques (id, name, definition, introduced_by, first_period_id, evolution, category) VALUES (
  'tempera-tela', 'Tempera su tela', 'Tecnica pittorica con pigmenti a tempera (legante acquoso) su tela di grandi dimensioni.', NULL, 'rinascimento', 'Usata per i Quadroni di san Carlo nel Duomo di Milano.', 'pittura'
) ON CONFLICT (id) DO NOTHING;

-- ==================== TERMINI ====================
INSERT INTO public.terms (id, term, definition, category, period_ids, is_archetype) VALUES (
  'iconoclastia', 'Iconoclastia', 'Distruzione di immagini sacre considerate idolatriche. Nel Cinquecento protestante, la distruzione di dipinti e sculture a tema sacro.', 'generale', '{'rinasc-nordico'}', false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.terms (id, term, definition, category, period_ids, is_archetype) VALUES (
  'strapwork', 'Strapwork', 'Decorazione che imita i riccioli e le volute di una striscia di cuoio, tipica del Manierismo di Fontainebleau.', 'decorazione', '{'manierismo'}', false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.terms (id, term, definition, category, period_ids, is_archetype) VALUES (
  'macchina-altare', 'Macchina d''altare', 'Grande struttura pittorica con sportelli mobili che permettono di variare le immagini offerte ai fedeli.', 'architettura', '{'rinasc-nordico'}', false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.terms (id, term, definition, category, period_ids, is_archetype) VALUES (
  'anamorfosi', 'Anamorfosi', 'Tecnica di deformazione prospettica che nasconde un''immagine visibile solo da un punto di vista specifico.', 'pittura', '{'manierismo'}', false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.terms (id, term, definition, category, period_ids, is_archetype) VALUES (
  'kunstkammer', 'Kunstkammer / Wunderkammer', 'Camera delle arti e delle meraviglie: raccolta di oggetti d''arte, rarità naturalistiche e curiosità, tipica delle corti manieriste (es. Rodolfo II a Praga).', 'generale', '{'manierismo'}', true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.terms (id, term, definition, category, period_ids, is_archetype) VALUES (
  'mirabilia', 'Mirabilia', 'Oggetti meritevoli di essere guardati, capaci di suscitare meraviglia. Comprendono artificialia (creati dall''uomo) e naturalia (curiosità della natura).', 'generale', '{'manierismo'}', false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.terms (id, term, definition, category, period_ids, is_archetype) VALUES (
  'galleria', 'Galleria', 'Spazio architettonico lungo e decorato, originato nei palazzi rinascimentali per esposizione di opere d''arte e celebrazione del committente.', 'architettura', '{'manierismo'}', false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.terms (id, term, definition, category, period_ids, is_archetype) VALUES (
  'tiburio', 'Tiburio', 'Struttura architettonica esterna che copre la cupola, tipica dell''architettura lombarda.', 'architettura', '{'controriforma'}', false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.terms (id, term, definition, category, period_ids, is_archetype) VALUES (
  'controriforma-term', 'Controriforma', 'Movimento di riforma cattolica avviato con il Concilio di Trento (1545-1563) in risposta alla Riforma protestante. Stabilisce principi per l''arte sacra: chiarezza, didattica, decoro.', 'generale', '{'controriforma'}', true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.terms (id, term, definition, category, period_ids, is_archetype) VALUES (
  'scuola-danubiana', 'Scuola Danubiana', 'Corrente pittorica fiorita tra Austria e Baviera nel primo Cinquecento, caratterizzata da nuova attenzione per il paesaggio naturale e approccio realistico-espressivo.', 'pittura', '{'rinasc-nordico'}', false
) ON CONFLICT (id) DO NOTHING;

-- ==================== EVENTI ====================
INSERT INTO public.events (id, year, year_end, title, description, kind, period_id) VALUES (
  'evt-riforma', 1517, NULL, 'Lutero e le 95 tesi', 'Martin Lutero pubblica le 95 tesi, avviando la Riforma protestante.', 'religioso', 'rinasc-nordico'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events (id, year, year_end, title, description, kind, period_id) VALUES (
  'evt-trento', 1545, 1563, 'Concilio di Trento', 'Il Concilio stabilisce i principi dell''arte sacra controriformista: chiarezza didattica e decoro.', 'religioso', 'controriforma'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events (id, year, year_end, title, description, kind, period_id) VALUES (
  'evt-fontainebleau', 1528, NULL, 'Inizio dei lavori di Fontainebleau', 'Francesco I avvia la costruzione del castello di Fontainebleau, centro del Manierismo in Francia.', 'culturale', 'manierismo'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events (id, year, year_end, title, description, kind, period_id) VALUES (
  'evt-escorial', 1563, 1586, 'Costruzione dell''Escorial', 'Filippo II fa erigere il monastero di San Lorenzo di El Escorial.', 'politico', 'controriforma'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events (id, year, year_end, title, description, kind, period_id) VALUES (
  'evt-borromeo', 1577, NULL, 'Instructiones di Carlo Borromeo', 'Carlo Borromeo pubblica le istruzioni per la costruzione e l''arredo delle chiese.', 'religioso', 'controriforma'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events (id, year, year_end, title, description, kind, period_id) VALUES (
  'evt-praga-rodotfo', 1583, NULL, 'Rodolfo II trasferisce la corte a Praga', 'L''imperatore trasferisce la corte a Praga, trasformandola in un centro del Manierismo internazionale.', 'culturale', 'manierismo'
) ON CONFLICT (id) DO NOTHING;
