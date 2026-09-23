// ============================================================================
// Genera MANUALE_ESTRAZIONE.txt.
//
// Il manuale non si scrive a mano per un motivo solo: l'elenco dei nomi esatti
// in fondo invecchia il giorno dopo. Qui si rigenera dai dati veri — il master
// in public/data unito alle righe corrette su Supabase, esattamente come fa il
// sito — cosi' chi lo legge sta guardando il catalogo di oggi e non quello di
// tre mesi fa.
//
//   node supabase/manuale/genera.cjs
//
// Legge il database in sola lettura con la chiave pubblica: non scrive niente,
// da nessuna parte, tranne il file di testo.
// ============================================================================
const fs = require("fs");
const path = require("path");

const RADICE = path.resolve(__dirname, "../..");
const DATI = path.join(RADICE, "public/data");
const USCITA = path.join(__dirname, "MANUALE_ESTRAZIONE.txt");

const URL_BASE = "https://ddsdvcznziciqdambgom.supabase.co/rest/v1";
const CHIAVE = process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkc2R2Y3puemljaXFkYW1iZ29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMDgzNzcsImV4cCI6MjA5Nzg4NDM3N30.WliliS2vw5dMtIcKUaU7KEm2g8smAjm8fMHaNRb6v5c";

async function tabella(nome) {
  const out = [];
  for (let da = 0; ; da += 1000) {
    const r = await fetch(`${URL_BASE}/${nome}?select=*`, {
      headers: { apikey: CHIAVE, Authorization: `Bearer ${CHIAVE}`, Range: `${da}-${da + 999}` },
    });
    if (!r.ok) { console.error(`  ! ${nome}: ${r.status}`); return out; }
    const p = await r.json();
    out.push(...p);
    if (p.length < 1000) break;
  }
  return out;
}

const leggi = (f) => JSON.parse(fs.readFileSync(path.join(DATI, `${f}.json`), "utf8"));

function unisci(json, db) {
  const m = new Map(json.map((x) => [x.id, x]));
  for (const d of db || []) {
    if (!d?.id) continue;
    m.set(d.id, m.has(d.id) ? { ...m.get(d.id), ...d } : d);
  }
  return [...m.values()];
}

// ── formattazione ───────────────────────────────────────────────────────────
const RIGA = "=".repeat(78);
const riga = "-".repeat(78);
const anni = (a, b) => {
  const f = (n) => (n == null ? "" : n < 0 ? `${-n} a.C.` : String(n));
  if (a == null && b == null) return "date ignote";
  if (a != null && b != null && a !== b) return `${f(a)}–${f(b)}`;
  return f(a ?? b);
};
const pad = (s, n) => (s.length >= n ? s : s + " ".repeat(n - s.length));

/** Per le persone: «1474–1539», ma anche «† 616» e «n. 1474». Scrivere il
 *  solo anno di morte come se fosse la data di nascita e' un errore che poi
 *  qualcuno ricopia. */
const vita = (n, m) => {
  const f = (x) => (x < 0 ? `${-x} a.C.` : String(x));
  if (n == null && m == null) return "date ignote";
  if (n != null && m != null) return `${f(n)}–${f(m)}`;
  return n != null ? `n. ${f(n)}` : `† ${f(m)}`;
};

/** Tabella dei campi: nome, obbligo, tipo, regola. La regola va a capo
 *  rientrata, perche' e' la parte che si legge davvero. */
function campi(righe) {
  const L = Math.max(...righe.map((r) => r[0].length)) + 2;
  return righe.map(([nome, obbligo, tipo, regola]) => {
    const testa = `  ${pad(nome, L)}${pad(obbligo, 14)}${tipo}`;
    const corpo = String(regola).split("\n").map((r) => `  ${" ".repeat(L)}${r}`).join("\n");
    return `${testa}\n${corpo}`;
  }).join("\n\n");
}

(async () => {
  console.log("Scarico le righe corrette dal database…");
  const db = {};
  for (const t of ["works","artists","periods","techniques","terms","connections","events","fonti","incertezze","hidden_entities"]) {
    db[t] = await tabella(t);
    console.log(`  ${pad(t, 18)} ${db[t].length}`);
  }

  const nascosti = new Set((db.hidden_entities || []).map((h) => h.id));
  const ds = {};
  for (const k of ["periods","artists","works","techniques","terms","connections","events","fonti","incertezze"]) {
    ds[k] = unisci(leggi(k), db[k]).filter((x) => !nascosti.has(x.id));
  }

  const committenti = ds.artists.filter((a) => a.category === "committenti")
    .sort((a, b) => a.name.localeCompare(b.name, "it"));
  const autori = ds.artists.filter((a) => a.category !== "committenti")
    .sort((a, b) => a.name.localeCompare(b.name, "it"));

  const testo = componi({ ds, committenti, autori, nascosti });
  fs.writeFileSync(USCITA, testo, "utf8");
  console.log(`\nScritto ${USCITA}`);
  console.log(`${(testo.length / 1024).toFixed(0)} KB · ${testo.split("\n").length} righe`);
})();

// ============================================================================
function componi({ ds, committenti, autori, nascosti }) {
  const oggi = new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
  const P = [];
  const push = (...s) => P.push(...s);

  // ── testata ───────────────────────────────────────────────────────────────
  push(RIGA);
  push("HUBARTE — MANUALE DI ESTRAZIONE DATI");
  push("Che cosa serve per riempire ogni tabella, e con quali nomi esatti.");
  push(RIGA);
  push("");
  push(`Generato il ${oggi} dai dati veri: il master in public/data unito alle`);
  push("righe corrette su Supabase, esattamente come le unisce il sito.");
  push("Si rigenera con:  node supabase/manuale/genera.cjs");
  push("");
  push("Il manuale e' fatto di due meta' che si usano in modo diverso. Le PARTI 0-5");
  push("sono le istruzioni e stanno in poche pagine: si danno sempre, per intero.");
  push("La PARTE 6 e' il registro dei nomi, ed e' lunga: se il manuale viene dato a");
  push("un programma che ha un limite di lettura, si allegano solo le sezioni del");
  push("registro che servono a quell'incarico — chi lavora sulle opere di un");
  push("periodo non ha bisogno degli 882 termini di glossario. Quello che non si");
  push("puo' fare e' toglierlo tutto: senza registro, l'istruzione 1 della PARTE 0");
  push("non e' verificabile e i doppioni tornano.");
  push("");
  push("Contenuto del catalogo in questo momento:");
  push("");
  push(`  opere                ${String(ds.works.length).padStart(5)}`);
  push(`  autori               ${String(autori.length).padStart(5)}`);
  push(`  committenti          ${String(committenti.length).padStart(5)}`);
  push(`  epoche/correnti/scuole ${String(ds.periods.length).padStart(3)}`);
  push(`  connessioni          ${String(ds.connections.length).padStart(5)}`);
  push(`  tecniche             ${String(ds.techniques.length).padStart(5)}`);
  push(`  termini di glossario ${String(ds.terms.length).padStart(5)}`);
  push(`  eventi storici       ${String(ds.events.length).padStart(5)}`);
  push(`  fonti (bibliografia) ${String(ds.fonti.length).padStart(5)}`);
  push(`  attribuzioni aperte  ${String(ds.incertezze.length).padStart(5)}`);
  push("");
  push("");

  // ── indice ────────────────────────────────────────────────────────────────
  push(riga);
  push("INDICE");
  push(riga);
  push("");
  push("  PARTE 0   L'istruzione universale — da mettere in testa a ogni incarico");
  push("  PARTE 1   Le regole che valgono per tutto");
  push("  PARTE 2   Le entità, una per una");
  push("              2.1  Opera            (tabella works)");
  push("              2.2  Autore           (tabella artists)");
  push("              2.3  Committente      (tabella artists, category = committenti)");
  push("              2.4  Epoca, corrente, scuola   (tabella periods)");
  push("              2.5  Connessione      (tabella connections)");
  push("              2.6  Tecnica          (tabella techniques)");
  push("              2.7  Termine          (tabella terms)");
  push("              2.8  Evento storico   (tabella events)");
  push("              2.9  Fonte            (tabella fonti)");
  push("              2.10 Attribuzione aperta (tabella incertezze)");
  push("  PARTE 3   Come si consegna il lavoro");
  push("  PARTE 4   I controlli da fare prima di consegnare");
  push("  PARTE 5   Difetti noti del registro (leggere prima di aggiungere)");
  push("  PARTE 6   REGISTRO DEI NOMI ESATTI");
  push("              A. Epoche, correnti e scuole");
  push("              B. Autori");
  push("              C. Committenti");
  push("              D. Tecniche");
  push("              E. Fonti");
  push("              F. Città");
  push("              G. Materiali");
  push("              H. Termini di glossario");
  push("              I. Eventi storici");
  push("              L. Opere");
  push("");
  push("");

  // ── PARTE 0 ───────────────────────────────────────────────────────────────
  push(RIGA);
  push("PARTE 0 — L'ISTRUZIONE UNIVERSALE");
  push(RIGA);
  push("");
  push("Le righe fra le due linee si copiano tali e quali in testa a qualunque");
  push("incarico di estrazione, che lo faccia una persona o un programma. Tutto il");
  push("resto del manuale è il materiale a cui questa istruzione rimanda.");
  push("");
  push(riga);
  push("");
  push("  Stai estraendo dati per HUBARTE, un atlante di storia dell'arte. Il");
  push("  materiale che ti viene dato — un capitolo, una scheda, un elenco — va");
  push("  trasformato in righe di tabella, non in prosa.");
  push("");
  push("  Cinque obblighi, in ordine di importanza.");
  push("");
  push("  1. NON INVENTARE ENTITÀ CHE ESISTONO GIÀ. In fondo a questo manuale c'è");
  push("     il registro di tutto ciò che è già in catalogo, con l'id esatto. Prima");
  push("     di creare un autore, un committente, un periodo, una tecnica o una");
  push("     città, CERCALO nel registro. Se c'è, usa quell'id, anche se il libro");
  push("     lo chiama in un altro modo. Un secondo «Sebastiano Serlio» non è un");
  push("     dato in più: è lo stesso autore che perde metà delle sue opere.");
  push("");
  push("  2. SCRIVI SOLO QUELLO CHE IL TESTO DICE. Se il testo non dice l'anno, il");
  push("     campo resta vuoto. Un anno plausibile inventato è peggio di un campo");
  push("     vuoto, perché nessuno andrà mai a ricontrollarlo. Quando il testo è");
  push("     ambiguo o le fonti discordano, non scegliere: segnala (vedi 2.10).");
  push("");
  push("  3. RISPETTA I VOCABOLARI CHIUSI. Alcuni campi ammettono solo certi");
  push("     valori — il tipo di un'opera, il genere di una connessione. Sono");
  push("     elencati per intero nella scheda di ogni entità. Un valore fuori");
  push("     elenco non viene rifiutato dal database: sparisce dai filtri, che è");
  push("     peggio.");
  push("");
  push("  4. TIENI SEPARATO CHI HA FATTO DA CHI HA VOLUTO. `artist_ids` è chi");
  push("     l'opera l'ha eseguita, `committente_ids` è chi l'ha ordinata e pagata.");
  push("     Un committente non entra mai in artist_ids, e viceversa.");
  push("");
  push("  5. CONSEGNA NEL FORMATO DELLA PARTE 3, e prima di consegnare fai i");
  push("     controlli della PARTE 4. Ogni riga deve dichiarare uno stato:");
  push("     `nuovo`, `aggiornato`, `invariato` o `incerto`.");
  push("");
  push("  Una cosa che non è ovvia: questo catalogo nasce da manuali scolastici e");
  push("  finisce in una tesi. Il testo che scrivi verrà letto da studenti e sarà");
  push("  letto ad alta voce dal sintetizzatore vocale del sito. Scrivi in italiano");
  push("  piano, frasi finite, niente abbreviazioni da appunti, niente elenchi");
  push("  puntati dentro un campo di prosa.");
  push("");
  push(riga);
  push("");
  push("");

  // ── PARTE 1 ───────────────────────────────────────────────────────────────
  push(RIGA);
  push("PARTE 1 — LE REGOLE CHE VALGONO PER TUTTO");
  push(RIGA);
  push("");
  push("1.1  GLI ID");
  push("");
  push("     Ogni riga ha un id testuale, che è anche l'indirizzo della pagina");
  push("     (/opera/palazzo-te). Si ricava dal nome: minuscole, accenti tolti,");
  push("     spazi e punteggiatura sostituiti da un trattino singolo, niente");
  push("     trattino all'inizio o alla fine.");
  push("");
  push("         Palazzo Te                    ->  palazzo-te");
  push("         Sant'Andrea a Mantova         ->  sant-andrea-mantova");
  push("         Cappella Palatina (Palermo)   ->  cappella-palatina-palermo");
  push("");
  push("     Solo a-z, 0-9 e il trattino. Niente lettere accentate, niente");
  push("     apostrofi, niente maiuscole: sono finite in catalogo quattordici");
  push("     volte e sono elencate nella PARTE 5 come difetti da non imitare.");
  push("");
  push("     Quando due cose hanno lo stesso nome — e succede: 31 titoli di opere");
  push("     sono ripetuti — l'id si disambigua con la città o con l'autore, mai");
  push("     con un numero progressivo:");
  push("");
  push("         cappella-palatina-aquisgrana  /  cappella-palatina-palermo");
  push("         deposizione-di-cristo-antelami  /  deposizione-cristo-lorenzetti-assisi");
  push("");
  push("     L'id non si cambia mai dopo che è stato creato: è l'indirizzo di una");
  push("     pagina, e i collegamenti delle altre schede puntano lì.");
  push("");
  push("1.2  GLI ANNI");
  push("");
  push("     Sono numeri interi, e gli anni prima di Cristo sono negativi:");
  push("     il 200 a.C. si scrive -200. In catalogo ce ne sono per ora solo due,");
  push("     ma la regola vale.");
  push("");
  push("     Ogni datazione si scrive due volte, in due forme che servono a due");
  push("     cose diverse e non si sostituiscono a vicenda:");
  push("");
  push("       date_text   come si dice a voce, in italiano, con le incertezze");
  push("                   dentro: «1525-1535», «fine del XIII secolo»,");
  push("                   «entro il 1338», «III-I secolo a.C.». È quello che");
  push("                   la scheda mostra e che la voce legge.");
  push("       year_start  i due numeri con cui l'opera si colloca sulla linea del");
  push("       year_end    tempo e nei filtri. Un secolo diventa i suoi estremi");
  push("                   (XIII secolo -> 1200 e 1299); una data sola si scrive");
  push("                   uguale nei due campi; «1525 circa» resta 1525 in");
  push("                   entrambi, perché il «circa» sta già in date_text.");
  push("");
  push("     Non si lascia mai date_text vuoto quando i numeri ci sono: la scheda");
  push("     mostrerebbe una data e il testo un'altra.");
  push("");
  push("1.3  GLI ELENCHI");
  push("");
  push("     I campi che finiscono in `_ids` contengono ID, mai nomi. Sono array:");
  push("     vuoti si scrivono {} in SQL e [] in JSON, e non sono mai NULL.");
  push("     L'ordine conta solo dove è dichiarato (il primo autore è quello");
  push("     principale).");
  push("");
  push("     I campi di testo in elenco — `materials`, `innovations`, `aka`,");
  push("     `regions`, `key_innovations` — contengono parole o frasi intere, una");
  push("     per voce, senza numerazione e senza punto finale.");
  push("");
  push("1.4  I TESTI");
  push("");
  push("     summary, analysis, bio, definition, description sono prosa continua,");
  push("     in italiano, terza persona, presente storico. Niente «vedi sopra»,");
  push("     niente rimandi a pagine del libro, niente prima persona. La sintesi");
  push("     di un'opera sta fra le 40 e le 120 parole; l'analisi può essere lunga");
  push("     quanto serve ed è divisa in capoversi separati da una riga vuota.");
  push("");
  push("1.5  QUANDO NON SI SA");
  push("");
  push("     Campo vuoto (NULL) e array vuoto sono risposte legittime e frequenti:");
  push(`     nel catalogo di oggi ${ds.works.filter((w) => !w.artist_ids?.length).length} opere su ${ds.works.length} non hanno un autore, e non è`);
  push("     un errore — sono anonime. Quello che non è legittimo è riempire il");
  push("     campo con un valore verosimile.");
  push("");
  push("     Se la fonte dice una cosa e un'altra fonte ne dice un'altra, la riga");
  push("     va marcata `incerto` e la ragione va scritta in una attribuzione");
  push("     aperta (2.10), che è un'entità vera del catalogo e non una nota a");
  push("     margine.");
  push("");
  push("1.6  QUELLO CHE NON SI TOCCA MAI");
  push("");
  push("     id, created_at, updated_at, modified_by. I tre di coda li scrive il");
  push("     database da solo. E soprattutto: NON si scrivono righe parziali.");
  push("");
  push("     Questa è la trappola più costosa di questo progetto. Il sito legge il");
  push("     master JSON e ci sovrascrive sopra le righe del database campo per");
  push("     campo, ma l'app iOS sostituisce la riga intera. Una riga scritta a");
  push("     metà — solo id e titolo, per dire — non «aggiorna il titolo»: su");
  push("     telefono cancella la sintesi, l'analisi, l'immagine e tutto il resto.");
  push("     Chi aggiorna una riga esistente la riscrive INTERA, ricopiando anche");
  push("     i campi che non cambia.");
  push("");
  push("");

  // ── PARTE 2 ───────────────────────────────────────────────────────────────
  push(RIGA);
  push("PARTE 2 — LE ENTITÀ, UNA PER UNA");
  push(RIGA);
  push("");
  push("Legenda della colonna centrale:");
  push("");
  push("  OBBLIGATORIO   senza questo la riga non ha senso e non va consegnata");
  push("  RACCOMANDATO   si compila quando il testo lo dice; vuoto è accettabile");
  push("  FACOLTATIVO    di rado, e solo se il dato c'è davvero");
  push("  AUTOMATICO     lo scrive il database o uno script: non toccarlo");
  push("");
  push("");
  push(...sezioneOpera(ds));
  push(...sezioneAutore(ds, autori));
  push(...sezioneCommittente(ds, committenti));
  push(...sezionePeriodo(ds));
  push(...sezioneConnessione(ds));
  push(...sezioneTecnica(ds));
  push(...sezioneTermine(ds));
  push(...sezioneEvento(ds));
  push(...sezioneFonte(ds));
  push(...sezioneIncertezza(ds));
  push(...parte3());
  push(...parte4());
  push(...parte5(ds));
  push(...registro(ds, autori, committenti));

  return P.join("\n") + "\n";
}

// ── 2.1 opera ───────────────────────────────────────────────────────────────
function testata(numero, titolo, tabella, quante, riassunto) {
  return [riga, `${numero}  ${titolo.toUpperCase()}`,
    `     tabella ${tabella} · ${quante} righe in catalogo`, riga, "", ...riassunto.map((r) => `  ${r}`), ""];
}

function sezioneOpera(ds) {
  const es = ds.works.find((w) => w.id === "palazzo-te") || ds.works[0];
  return [
    ...testata("2.1", "Opera", "works", ds.works.length, [
      "È l'unità del catalogo: un edificio, un dipinto, una scultura, un mosaico.",
      "Tutto il resto — autori, periodi, tecniche — esiste per dire qualcosa su",
      "un'opera. Una scheda senza sintesi non serve a nessuno: il titolo da solo",
      "è una voce d'indice, non una scheda.",
    ]),
    campi([
      ["id", "OBBLIGATORIO", "testo", "Slug dal titolo (1.1). Disambiguare con la città o l'autore\nquando il titolo è già usato: 31 titoli lo sono."],
      ["title", "OBBLIGATORIO", "testo", "Il titolo com'è noto in italiano, senza l'autore dentro e\nsenza la datazione. «Palazzo Te», non «Palazzo Te di Giulio\nRomano (1525)»."],
      ["type", "OBBLIGATORIO", "vocabolario", "Uno solo fra: architettura · pittura · scultura · mosaico ·\nminiatura · oreficeria · urbanistica · altro.\nÈ la forma dell'opera, non la tecnica: un affresco è pittura."],
      ["summary", "OBBLIGATORIO", "prosa", "40-120 parole. Che cos'è, chi l'ha voluta, com'è fatta, perché\nconta. È il testo che si legge per primo e che la voce legge."],
      ["period_id", "OBBLIGATORIO", "id di periods", "Il periodo PIÙ SPECIFICO che le si adatta: se esiste la scuola,\nsi usa la scuola e non l'epoca sopra. Deve stare nel registro A."],
      ["artist_ids", "RACCOMANDATO", "elenco di id", "Chi l'ha ESEGUITA, in ordine di importanza. Vuoto per le opere\nanonime, che sono normali. Mai un committente qui dentro."],
      ["committente_ids", "RACCOMANDATO", "elenco di id", "Chi l'ha ORDINATA e pagata. Quasi sempre uno solo, ma l'elenco\nregge i casi doppi. Il committente è quasi sempre già nominato\nnella prosa del libro: «fu commissionata da…»."],
      ["date_text", "OBBLIGATORIO*", "testo", "La datazione come si dice a voce (1.2). *Obbligatorio se la\ndatazione si conosce anche solo per approssimazione."],
      ["year_start", "RACCOMANDATO", "intero", "Estremi numerici per la linea del tempo (1.2). Negativi per\ngli anni avanti Cristo."],
      ["year_end", "RACCOMANDATO", "intero", "Uguale a year_start quando la data è una sola."],
      ["location_city", "RACCOMANDATO", "testo", "La città dove l'opera SI TROVA OGGI, non dove è nata. Nome\nitaliano se esiste (Aquisgrana, non Aachen). Prendere la forma\nesatta dal registro F: 192 città sono già in uso."],
      ["location_place", "RACCOMANDATO", "testo", "L'edificio o il museo: «Musei Vaticani», «Basilica di San\nFrancesco». Attenzione: il sito raggruppa in «complessi» le\nopere che condividono città + luogo, quindi due grafie diverse\ndello stesso luogo spezzano il complesso in due."],
      ["lat / lon", "RACCOMANDATO", "decimali", "Coordinate del luogo, non della città. Servono alla mappa;\nsenza, l'opera non compare."],
      ["technique_ids", "RACCOMANDATO", "elenco di id", "Dal registro D. Le tecniche non si inventano per una sola\nopera: se manca, si crea la tecnica (2.6) e la si motiva."],
      ["materials", "RACCOMANDATO", "elenco di testi", "Materiali veri e propri: «marmo di Carrara», «tempera su\ntavola». Registro G per non moltiplicare i sinonimi."],
      ["innovations", "RACCOMANDATO", "elenco di testi", "Che cosa quest'opera introduce e prima non c'era. Una frase\nintera per voce, senza punto finale. È il campo che regge metà\ndell'atlante: se l'opera non innova niente, si lascia vuoto\ninvece di riassumere la sintesi."],
      ["analysis", "FACOLTATIVO", "prosa lunga", "La lettura distesa dell'opera, a capoversi. Solo dove c'è\nqualcosa da dire: 355 opere su 1114 ce l'hanno."],
      ["term_ids", "FACOLTATIVO", "elenco di id", "Termini di glossario che l'opera illustra (registro H)."],
      ["fonte_ids", "OBBLIGATORIO", "elenco di id", "Da quale libro viene la scheda (registro E). Serve alla\nbibliografia numerata e ai pallini accanto al titolo."],
      ["image_url", "RACCOMANDATO", "URL", "Preferire Wikimedia Commons, che dichiara autore e licenza.\nNON usare gli indirizzi delle copie dei motori di ricerca\n(gstatic, imgs.search.brave, bing.net, pinimg): scadono e non\ndichiarano licenza. Il sito li segnala in rosso."],
      ["image_thumb", "FACOLTATIVO", "URL", "Versione piccola. Se manca si usa image_url."],
      ["image_source", "FACOLTATIVO", "testo", "Pagina di provenienza, quando non si deduce dall'indirizzo."],
      ["image_gallery", "FACOLTATIVO", "elenco di URL", "Altre vedute della stessa opera, in ordine di lettura."],
      ["book / chapter / page", "FACOLTATIVO", "interi", "Da dove viene la scheda nel manuale cartaceo. Eredità\ndell'estrazione originale: si compila se lo si sa, ma la\nbibliografia vera passa da fonte_ids."],
      ["source_file", "AUTOMATICO", "testo", "Il file da cui la scheda è stata estratta la prima volta."],
      ["importance", "AUTOMATICO", "1 · 2 · 3", "Campo storico, sostituito da fonte_ids. Se non si sa: 1."],
    ]),
    "",
    "  ESEMPIO REALE (l'opera palazzo-te, come sta oggi in tabella)",
    "",
    ...JSON.stringify({
      id: es.id, title: es.title, type: es.type, period_id: es.period_id,
      artist_ids: es.artist_ids, committente_ids: es.committente_ids ?? [],
      date_text: es.date_text, year_start: es.year_start, year_end: es.year_end,
      location_city: es.location_city, location_place: es.location_place,
      lat: es.lat, lon: es.lon, materials: es.materials,
      innovations: (es.innovations || []).slice(0, 2),
      summary: (es.summary || "").slice(0, 150) + "…",
      fonte_ids: es.fonte_ids,
    }, null, 2).split("\n").map((r) => "    " + r),
    "",
    "  ERRORI TIPICI",
    "",
    "    · mettere il committente fra gli artist_ids perché il libro dice «fatta",
    "      fare da»: chi la fa fare non la fa;",
    "    · scrivere l'epoca invece della scuola in period_id, perdendo il livello",
    "      più informativo;",
    "    · usare il nome del luogo in due grafie diverse fra due opere vicine,",
    "      spezzando in due il complesso che il sito costruisce da solo;",
    "    · dedurre year_start da date_text a occhio, sbagliando il secolo: il",
    "      «XIII secolo» va da 1200 a 1299, non da 1300.",
    "", "",
  ];
}

// ── 2.2 autore ──────────────────────────────────────────────────────────────
function sezioneAutore(ds, autori) {
  const es = autori.find((a) => a.id === "giulio-romano") || autori[0];
  return [
    ...testata("2.2", "Autore", "artists", autori.length, [
      "Chi ha eseguito l'opera: pittori, scultori, architetti, orafi, miniatori,",
      "botteghe. Condivide la tabella con i committenti (2.3) e se ne distingue",
      "per il campo `category`. La regola che non si viola: un autore compare in",
      "`works.artist_ids`, un committente in `works.committente_ids`, mai al",
      "contrario e mai in tutti e due.",
    ]),
    campi([
      ["id", "OBBLIGATORIO", "testo", "Slug dal nome com'è noto: leonardo-da-vinci, giulio-romano.\nPer i nomi d'arte si usa il nome d'arte, non l'anagrafico:\nmasaccio, non tommaso-di-ser-giovanni."],
      ["name", "OBBLIGATORIO", "testo", "Il nome con cui lo si cerca, in italiano. «Giulio Romano»,\nnon «Giulio Pippi de' Jannuzzi»: quello va in `aka`."],
      ["aka", "RACCOMANDATO", "elenco di testi", "Gli altri nomi: anagrafico, latino, straniero, soprannomi.\nÈ il campo che impedisce il doppione — se un libro usa un\naltro nome, si aggiunge qui invece di creare una seconda\nscheda."],
      ["role", "OBBLIGATORIO", "testo breve", "Che mestiere fa: «pittore», «scultore e architetto»,\n«pittore e miniatore». Minuscolo, senza articolo."],
      ["category", "RACCOMANDATO", "vocabolario", "pittori · scultori · architetti · orafi-bronzisti ·\nminiatori · committenti · altro.\nSe è vuoto il sito lo deduce dal `role`, ma dedurre è peggio\nche sapere. Per un autore non è MAI «committenti»."],
      ["birth / death", "RACCOMANDATO", "interi", "Anni di nascita e morte, negativi per gli anni a.C.\nSe si conosce solo il periodo di attività, si lasciano vuoti\ne l'attività si scrive in `bio`."],
      ["period_ids", "RACCOMANDATO", "elenco di id", "I periodi in cui opera (registro A). Più d'uno quando la\ncarriera li attraversa: è così che compare nella sezione\nProtagonisti di ciascuno."],
      ["bio", "RACCOMANDATO", "prosa", "Chi è, dove lavora, che cosa cambia. Dalle 50 alle 200 parole."],
      ["innovations", "RACCOMANDATO", "elenco di testi", "Che cosa introduce nella storia dell'arte, non nella propria\ncarriera. Una frase per voce."],
      ["is_collective", "RACCOMANDATO", "vero/falso", "Vero per botteghe, cantieri e famiglie che agiscono come\nsoggetto unico; falso per le persone. Per gli autori è quasi\nsempre falso."],
      ["location_city", "FACOLTATIVO", "testo", "Sede principale. Per gli autori conta poco; per i committenti\nè obbligatorio (2.3)."],
    ]),
    "",
    "  ESEMPIO REALE",
    "",
    ...JSON.stringify({
      id: es.id, name: es.name, aka: es.aka, role: es.role, category: es.category ?? null,
      birth: es.birth, death: es.death, period_ids: es.period_ids,
      is_collective: !!es.is_collective,
      bio: (es.bio || "").slice(0, 140) + "…",
    }, null, 2).split("\n").map((r) => "    " + r),
    "",
    "  ERRORI TIPICI",
    "",
    "    · creare una seconda scheda perché il libro usa il nome anagrafico:",
    "      quel nome va in `aka` della scheda che esiste già;",
    "    · dare a una bottega gli anni di nascita e morte del capobottega;",
    "    · scrivere in `role` una frase intera invece del mestiere.",
    "", "",
  ];
}

// ── 2.3 committente ─────────────────────────────────────────────────────────
function sezioneCommittente(ds, committenti) {
  const es = committenti.find((a) => a.id === "federico-ii-gonzaga") || committenti[0];
  const coll = committenti.filter((c) => c.is_collective).length;
  return [
    ...testata("2.3", "Committente", "artists (category = committenti)", committenti.length, [
      "Chi ha voluto e pagato l'opera: papi, vescovi, principi, mercanti, ordini",
      "religiosi, corporazioni, comuni. Sta nella stessa tabella degli autori",
      `perché ha gli stessi campi; ${coll} dei ${committenti.length} non sono persone ma casate,`,
      "istituzioni e cantieri.",
      "",
      "Il committente non è un dettaglio d'archivio: è la ragione per cui l'opera",
      "esiste in quel posto e in quella forma, e nel testo dei manuali è quasi",
      "sempre già scritto — «commissionata da», «fatta erigere da», «per volere di».",
    ]),
    campi([
      ["", "", "", "Tutti i campi di 2.2, con queste differenze:"],
      ["category", "OBBLIGATORIO", "valore fisso", "Sempre e solo «committenti». È l'unica cosa che distingue una\nscheda di committente da una di autore."],
      ["location_city", "OBBLIGATORIO", "testo", "La sede da cui commissiona — la città del suo potere, non\nquella dove finisce l'opera. Serve alla mappa in modalità\ncommittenti, che senza questo campo non lo mostra."],
      ["is_collective", "OBBLIGATORIO", "vero/falso", "Vero per «Casa Medici», «Senato veneziano», «Arte della Lana»,\n«Abbazia di Novacella»; falso per Giulio II o Agnolo Doni."],
      ["birth / death", "RACCOMANDATO", "interi", "Per le istituzioni si lasciano vuoti, oppure si usano gli\nestremi dell'attività se il testo li dà."],
      ["role", "RACCOMANDATO", "testo breve", "Il titolo per cui commissiona: «papa», «marchese di Mantova»,\n«arcivescovo di Ravenna», «corporazione dei mercanti»."],
      ["period_ids", "RACCOMANDATO", "elenco di id", "I periodi in cui è attivo come mecenate."],
    ]),
    "",
    "  ESEMPIO REALE",
    "",
    ...JSON.stringify({
      id: es.id, name: es.name, category: es.category, role: es.role,
      birth: es.birth, death: es.death, location_city: es.location_city,
      is_collective: !!es.is_collective, period_ids: es.period_ids,
    }, null, 2).split("\n").map((r) => "    " + r),
    "",
    "  ERRORI TIPICI",
    "",
    "    · confondere il committente con il dedicatario o con il defunto",
    "      commemorato: chi paga non è chi è raffigurato;",
    "    · attribuire a un papa la committenza di un cantiere durato tre",
    "      pontificati (in quel caso: attribuzione aperta, 2.10);",
    "    · mettere come location_city la città dell'opera invece della sede.",
    "", "",
  ];
}

// ── 2.4 periodo ─────────────────────────────────────────────────────────────
function sezionePeriodo(ds) {
  const per = (t) => ds.periods.filter((p) => p.type === t).length;
  const es = ds.periods.find((p) => p.id === "manierismo") || ds.periods[0];
  return [
    ...testata("2.4", "Epoca, corrente, scuola", "periods", ds.periods.length, [
      "Una tabella sola per i tre livelli del tempo, distinti da `type` e legati",
      "fra loro da `parent_id`:",
      "",
      `  epoca     ${per("epoca")}   la fascia grande: Romanico, Gotico, Rinascimento`,
      `  corrente  ${per("corrente")}   un movimento dentro un'epoca: Tardogotico, Manierismo`,
      `  scuola    ${per("scuola")}   un ambiente locale o una corte: scuola ferrarese,`,
      "                 corte gonzaghesca",
      "",
      "Una scuola è un AMBIENTE, non la fase di un autore: «Giulio Romano a",
      "Mantova» non è una scuola, «corte gonzaghesca» sì. I nomi si tengono",
      "corti — sotto i 25 caratteri — perché compaiono dentro le targhette delle",
      "schede e sulla linea del tempo.",
    ]),
    campi([
      ["id", "OBBLIGATORIO", "testo", "Slug dal nome: manierismo, corte-gonzaghesca."],
      ["name", "OBBLIGATORIO", "testo", "Breve. Se supera i 25 caratteri va accorciato: si scrive\n«Corte gonzaghesca», non «Giulio Romano e Palazzo Te a Mantova»."],
      ["type", "OBBLIGATORIO", "vocabolario", "epoca · corrente · scuola. Nient'altro."],
      ["parent_id", "OBBLIGATORIO*", "id di periods", "Il periodo che lo contiene. *Vuoto solo per le epoche, che\nstanno in cima. Ogni scuola deve avere sopra una corrente, e\nogni corrente un'epoca: è la gerarchia che regge la timeline\ne la pagina del periodo."],
      ["year_start", "OBBLIGATORIO", "intero", "Estremi del periodo, negativi per gli anni a.C. Devono stare\ndentro quelli del padre, o quasi: uno sconfinamento va spiegato\nnel sommario."],
      ["year_end", "OBBLIGATORIO", "intero", ""],
      ["summary", "RACCOMANDATO", "prosa", "Che cos'è e che cosa lo distingue da quello che viene prima."],
      ["historical_context", "RACCOMANDATO", "prosa", "Che cosa succede intorno — politica, religione, economia — che\nspiega perché l'arte va in quella direzione."],
      ["regions", "RACCOMANDATO", "elenco di testi", "Dove: regioni, città, aree. La prima voce è la principale ed è\nquella che la mappa usa."],
      ["key_innovations", "RACCOMANDATO", "elenco di testi", "Le novità che il periodo porta, una frase per voce."],
    ]),
    "",
    "  ESEMPIO REALE",
    "",
    ...JSON.stringify({
      id: es.id, name: es.name, type: es.type, parent_id: es.parent_id,
      year_start: es.year_start, year_end: es.year_end, regions: es.regions,
      key_innovations: (es.key_innovations || []).slice(0, 2),
      summary: (es.summary || "").slice(0, 130) + "…",
    }, null, 2).split("\n").map((r) => "    " + r),
    "",
    "  ERRORI TIPICI",
    "",
    "    · appendere una scuola direttamente a un'epoca saltando la corrente;",
    "    · creare una «scuola» che è in realtà la biografia di un artista;",
    "    · nomi lunghi, che sulla linea del tempo diventano illeggibili.",
    "", "",
  ];
}

// ── 2.5 connessione ─────────────────────────────────────────────────────────
function sezioneConnessione(ds) {
  const conta = {};
  for (const c of ds.connections) conta[c.kind] = (conta[c.kind] || 0) + 1;
  const es = ds.connections.find((c) => c.kind === "maestro-allievo") || ds.connections[0];
  return [
    ...testata("2.5", "Connessione", "connections", ds.connections.length, [
      "Il filo fra due entità qualsiasi: due opere, due autori, un'opera e un",
      "periodo. È quello che rende l'atlante un grafo e non un elenco, ed è anche",
      "la parte più facile da sbagliare, perché una connessione senza descrizione",
      "non dice niente a nessuno.",
      "",
      "Una connessione si crea solo quando aggiunge qualcosa che le due schede da",
      "sole non dicono. «Questo dipinto è di questo autore» NON è una connessione:",
      "è già in artist_ids, e il grafo la disegna da sé.",
    ]),
    campi([
      ["id", "OBBLIGATORIO", "testo", "Slug che descrive il legame:\ngiotto-influenza-masaccio, cimabue-maestro-giotto."],
      ["source_type", "OBBLIGATORIO", "vocabolario", "period · artist · work · technique · event · term"],
      ["source_id", "OBBLIGATORIO", "id", "L'id dell'entità di partenza, che deve esistere."],
      ["target_type", "OBBLIGATORIO", "vocabolario", "Come sopra."],
      ["target_id", "OBBLIGATORIO", "id", "L'id dell'entità di arrivo, che deve esistere."],
      ["kind", "OBBLIGATORIO", "vocabolario", `Uno fra:
  influenza        A lascia un segno su B (${conta.influenza || 0})
  maestro-allievo  A insegna a B (${conta["maestro-allievo"] || 0})
  rielaborazione   B riprende A cambiandolo (${conta.rielaborazione || 0})
  committenza      A ha voluto B (${conta.committenza || 0})
  evoluzione       B è lo sviluppo di A (${conta.evoluzione || 0})
  contaminazione   incrocio fra tradizioni diverse (${conta.contaminazione || 0})
  collaborazione   fatta insieme (${conta.collaborazione || 0})
  contrasto        B nasce contro A (${conta.contrasto || 0})
  autore / luogo   generati dal sito da artist_ids e location_city:
                   si scrivono a mano solo per aggiungere una
                   descrizione più ricca di quella automatica`],
      ["description", "OBBLIGATORIO", "prosa", "Una o due frasi che dicono in che cosa consiste il legame.\nSenza questa la connessione è una linea senza significato:\nè il campo per cui la connessione esiste."],
      ["sort_order", "FACOLTATIVO", "intero", "Ordine di comparsa fra connessioni pari grado. Default 0."],
    ]),
    "",
    "  IL VERSO CONTA",
    "",
    "    source è chi agisce, target chi riceve. «Cimabue maestro-allievo Giotto»",
    "    dice che Cimabue insegna a Giotto; invertito direbbe il contrario, e",
    "    nessun controllo automatico se ne accorgerebbe.",
    "",
    "  ESEMPIO REALE",
    "",
    ...JSON.stringify({
      id: es.id, source_type: es.source_type, source_id: es.source_id,
      target_type: es.target_type, target_id: es.target_id, kind: es.kind,
      description: (es.description || "").slice(0, 160),
    }, null, 2).split("\n").map((r) => "    " + r),
    "",
    "  ERRORI TIPICI",
    "",
    "    · usare `committenza` per descrivere l'esecuzione: è successo per 35",
    "      connessioni di questo catalogo, ed è la ragione per cui il campo",
    "      committente_ids è stato creato;",
    "    · duplicare con una connessione quello che è già un campo della scheda;",
    "    · descrizioni che ripetono i due nomi senza dire il rapporto.",
    "", "",
  ];
}

// ── 2.6 tecnica ─────────────────────────────────────────────────────────────
function sezioneTecnica(ds) {
  const es = ds.techniques.find((t) => t.definition && t.evolution) || ds.techniques[0];
  return [
    ...testata("2.6", "Tecnica", "techniques", ds.techniques.length, [
      "Come l'opera è stata fatta: affresco, tempera su tavola, fusione a cera",
      "persa, opus sectile. Non è il materiale (quello sta in `materials`) e non",
      "è il tipo (quello sta in `type`): è il procedimento.",
    ]),
    campi([
      ["id", "OBBLIGATORIO", "testo", "Slug dal nome: affresco, fusione-a-cera-persa."],
      ["name", "OBBLIGATORIO", "testo", "Il nome corrente in italiano, minuscolo se non è un nome\nproprio."],
      ["category", "OBBLIGATORIO", "vocabolario", "pittorica · scultorea · architettonica · musiva ·\ncompositiva · decorativa · altra"],
      ["definition", "OBBLIGATORIO", "prosa", "In che cosa consiste, spiegata a chi non l'ha mai vista fare.\nDalle 30 alle 100 parole."],
      ["evolution", "RACCOMANDATO", "prosa", "Come cambia nel tempo e perché a un certo punto si abbandona."],
      ["first_period_id", "RACCOMANDATO", "id di periods", "Il periodo in cui compare per la prima volta (registro A)."],
      ["introduced_by", "FACOLTATIVO", "testo", "Chi l'ha introdotta, quando è attribuibile a qualcuno.\nÈ testo libero, non un id."],
    ]),
    "",
    "  ESEMPIO REALE",
    "",
    ...JSON.stringify({
      id: es.id, name: es.name, category: es.category,
      first_period_id: es.first_period_id, introduced_by: es.introduced_by,
      definition: (es.definition || "").slice(0, 150) + "…",
    }, null, 2).split("\n").map((r) => "    " + r),
    "", "",
  ];
}

// ── 2.7 termine ─────────────────────────────────────────────────────────────
function sezioneTermine(ds) {
  const es = ds.terms.find((t) => t.is_archetype) || ds.terms[0];
  return [
    ...testata("2.7", "Termine di glossario", "terms", ds.terms.length, [
      "Le parole del mestiere: abside, contrapposto, sfumato, deambulatorio. Il",
      "sito le riconosce dentro la prosa delle schede e le rende cliccabili, per",
      "questo il termine va scritto al singolare e nella forma in cui compare nei",
      "testi.",
    ]),
    campi([
      ["id", "OBBLIGATORIO", "testo", "Slug dal termine."],
      ["term", "OBBLIGATORIO", "testo", "Al singolare, minuscolo se non è nome proprio."],
      ["definition", "OBBLIGATORIO", "prosa", "Una definizione che si capisce senza sapere già la risposta.\nDalle 20 alle 80 parole."],
      ["category", "OBBLIGATORIO", "vocabolario", "architettura · pittura · scultura · iconografia · generale"],
      ["period_ids", "RACCOMANDATO", "elenco di id", "I periodi in cui il termine è pertinente."],
      ["is_archetype", "RACCOMANDATO", "vero/falso", "Vero per le forme che tornano lungo tutta la storia dell'arte\ne fanno da chiave di lettura (la cupola, il nudo, la pietà);\nfalso per il vocabolario tecnico corrente."],
    ]),
    "",
    "  ESEMPIO REALE",
    "",
    ...JSON.stringify({
      id: es.id, term: es.term, category: es.category, is_archetype: es.is_archetype,
      period_ids: (es.period_ids || []).slice(0, 3),
      definition: (es.definition || "").slice(0, 140) + "…",
    }, null, 2).split("\n").map((r) => "    " + r),
    "", "",
  ];
}

// ── 2.8 evento ──────────────────────────────────────────────────────────────
function sezioneEvento(ds) {
  const es = ds.events[0];
  return [
    ...testata("2.8", "Evento storico", "events", ds.events.length, [
      "Quello che succede intorno all'arte e la spiega: un concilio, una peste,",
      "un sacco, l'invenzione della stampa. Compaiono sulla linea del tempo",
      "sotto le opere, e servono a far vedere che l'arte non cambia da sola.",
    ]),
    campi([
      ["id", "OBBLIGATORIO", "testo", "Slug dal titolo: sacco-di-roma, peste-nera."],
      ["title", "OBBLIGATORIO", "testo", "Breve: sta in una targhetta sulla linea del tempo."],
      ["year", "OBBLIGATORIO", "intero", "L'anno in cui accade, negativo per gli anni a.C."],
      ["year_end", "FACOLTATIVO", "intero", "Solo per i fatti che durano (una guerra, un concilio lungo)."],
      ["kind", "OBBLIGATORIO", "vocabolario", "politico · religioso · culturale · tecnologico"],
      ["description", "OBBLIGATORIO", "prosa", "Che cosa è successo e perché riguarda l'arte. Due o tre frasi:\nil nesso con l'arte è la ragione per cui l'evento è qui."],
      ["period_id", "RACCOMANDATO", "id di periods", "Il periodo in cui cade."],
    ]),
    "",
    "  ESEMPIO REALE",
    "",
    ...JSON.stringify({
      id: es.id, title: es.title, year: es.year, year_end: es.year_end,
      kind: es.kind, period_id: es.period_id,
      description: (es.description || "").slice(0, 140) + "…",
    }, null, 2).split("\n").map((r) => "    " + r),
    "", "",
  ];
}

// ── 2.9 fonte ───────────────────────────────────────────────────────────────
function sezioneFonte(ds) {
  return [
    ...testata("2.9", "Fonte", "fonti", ds.fonti.length, [
      "I libri da cui vengono le schede. È una tabella e non un testo libero per",
      "un motivo pratico: il titolo di un manuale scritto a mano cinquanta volte",
      "diventa cinquanta titoli leggermente diversi, e una bibliografia con",
      "cinquanta voci per due libri non è una bibliografia.",
      "",
      "Il numero è un dato, non l'ordine di una query: è quello che compare nel",
      "pallino accanto al titolo dell'opera e deve restare stabile.",
    ]),
    campi([
      ["id", "OBBLIGATORIO", "testo", "Slug da titolo + volume: occhi-arte-2."],
      ["titolo", "OBBLIGATORIO", "testo", "Il titolo del libro, senza il volume dentro."],
      ["numero", "OBBLIGATORIO", "intero", "Il numero in bibliografia. Progressivo, mai riusato, mai\ncambiato dopo che le schede lo citano."],
      ["autori", "RACCOMANDATO", "testo", "Come in copertina, separati da virgola."],
      ["editore", "RACCOMANDATO", "testo", ""],
      ["anno", "RACCOMANDATO", "intero", "Anno dell'edizione usata, non della prima edizione."],
      ["volume", "FACOLTATIVO", "testo", "«2», «III»: come lo chiama il libro."],
      ["note", "FACOLTATIVO", "testo", "Qualsiasi cosa serva a ritrovarlo."],
    ]),
    "",
    "  IN CATALOGO ORA",
    "",
    ...ds.fonti.sort((a, b) => (a.numero ?? 99) - (b.numero ?? 99)).map((f) =>
      `    [${f.numero}] ${f.id}  ·  ${f.titolo}${f.volume ? `, vol. ${f.volume}` : ""}` +
      `${f.autori ? ` — ${f.autori}` : ""}${f.anno ? ` (${f.anno})` : ""}`),
    "", "",
  ];
}

// ── 2.10 incertezza ─────────────────────────────────────────────────────────
function sezioneIncertezza(ds) {
  const es = ds.incertezze[0];
  return [
    ...testata("2.10", "Attribuzione aperta", "incertezze", ds.incertezze.length, [
      "Non un campo vuoto ma una dichiarazione: «non si sa chi l'ha voluta, e",
      "questa è la ragione». Serve quando le fonti discordano davvero e scegliere",
      "significherebbe inventare.",
      "",
      "L'id è l'id dell'OPERA: una scheda, una incertezza. Sulla pagina compare",
      "come un riquadro dorato sotto il titolo, e la voce la legge.",
    ]),
    campi([
      ["id", "OBBLIGATORIO", "id di works", "L'id dell'opera a cui l'incertezza si riferisce. Deve esistere."],
      ["tema", "OBBLIGATORIO", "testo breve", "Su che cosa verte: committenza · attribuzione · datazione ·\nsoggetto. Una parola, minuscola."],
      ["nota", "OBBLIGATORIO", "prosa", "Che cosa si sa, che cosa si esclude e perché le ipotesi\nrestano aperte. Nominare le ipotesi in campo, non dire\ngenericamente «gli studiosi discutono»."],
      ["fonte", "RACCOMANDATO", "testo", "Dove si è verificato: testo libero, perché qui si cita anche\nla scheda di un museo o una banca dati, non solo i libri\ndella bibliografia."],
    ]),
    "",
    "  ESEMPIO REALE",
    "",
    ...(es ? JSON.stringify({ id: es.id, tema: es.tema,
      nota: (es.nota || "").slice(0, 220) + "…",
      fonte: (es.fonte || "").slice(0, 90) + "…" }, null, 2).split("\n").map((r) => "    " + r) : []),
    "",
    "  QUANDO SERVE E QUANDO NO",
    "",
    "    Serve: due candidati documentati, il museo che dichiara «non provato»,",
    "    una datazione che sposta l'opera di un secolo a seconda dello studio.",
    "    Non serve: un dato che semplicemente non si è cercato abbastanza.",
    "    L'incertezza è una conclusione, non una scorciatoia.",
    "", "",
  ];
}

// ── PARTE 3 ─────────────────────────────────────────────────────────────────
function parte3() {
  return [
    RIGA,
    "PARTE 3 — COME SI CONSEGNA IL LAVORO",
    RIGA,
    "",
    "  Un file per entità, formato CSV o JSON, con una colonna in più rispetto",
    "  alla tabella: lo STATO della riga. Lo stato è quello che permette di",
    "  rivedere il lavoro senza rileggerlo tutto.",
    "",
    "    nuovo        entità che non esiste in catalogo: va creata",
    "    aggiornato   entità che esiste e va corretta o completata",
    "    invariato    controllata, niente da cambiare (si consegna lo stesso:",
    "                 dice che quella riga è stata guardata)",
    "    incerto      il testo non basta per decidere. In una colonna `motivo`",
    "                 si scrive che cosa manca. Queste righe NON vengono",
    "                 applicate: si leggono a mano.",
    "",
    "  Le righe `aggiornato` si consegnano INTERE, con anche i campi che non",
    "  cambiano (vedi 1.6: una riga parziale mutila la scheda sull'app).",
    "",
    "  Insieme ai dati va consegnato un breve rendiconto:",
    "",
    "    · quante righe per stato;",
    "    · quali entità nuove sono state create e perché non bastava una",
    "      esistente (è il controllo contro i doppioni);",
    "    · le decisioni prese nei casi ambigui.",
    "",
    "  Niente SQL già scritto, a meno che non sia stato chiesto: le istruzioni",
    "  di scrittura le prepara chi applica, dopo aver letto il rendiconto.",
    "",
    "",
  ];
}

// ── PARTE 4 ─────────────────────────────────────────────────────────────────
function parte4() {
  return [
    RIGA,
    "PARTE 4 — I CONTROLLI DA FARE PRIMA DI CONSEGNARE",
    RIGA,
    "",
    "  Sono otto, e si fanno tutti. Sette su otto trovano errori che nessun",
    "  controllo automatico del database troverebbe, perché per Postgres una",
    "  stringa vale l'altra.",
    "",
    "  1. RIMANDI  Ogni id che compare in un campo `_ids`, in `period_id`, in",
    "     `parent_id`, in `source_id`/`target_id` esiste davvero nel registro?",
    "     Un id inesistente non dà errore: fa sparire il collegamento.",
    "",
    "  2. DOPPIONI  Ogni entità nuova è stata cercata nel registro per nome E",
    "     per nome alternativo? Cercare anche le varianti: «Serlio» e",
    "     «Sebastiano Serlio», «Ferrante» e «Ferdinando I d'Aragona».",
    "",
    "  3. VOCABOLARI  type, kind, category, i tre tipi di periodo: tutti i",
    "     valori sono dentro gli elenchi chiusi, scritti identici?",
    "",
    "  4. ANNI  year_start <= year_end? Gli anni a.C. sono negativi? Gli estremi",
    "     di un periodo stanno dentro quelli del padre? date_text e i numeri",
    "     dicono la stessa cosa?",
    "",
    "  5. AUTORI E COMMITTENTI  Nessun id compare in tutti e due gli elenchi",
    "     della stessa opera? Ogni committente ha category = committenti?",
    "",
    "  6. LUOGHI  Le città sono scritte come nel registro F? I `location_place`",
    "     dello stesso edificio sono scritti allo stesso modo in tutte le opere",
    "     che ci stanno dentro?",
    "",
    "  7. IMMAGINI  Nessun indirizzo che punta a gstatic, imgs.search.brave,",
    "     bing.net o pinimg? Quelli scadono e non dichiarano licenza.",
    "",
    "  8. RIGHE INTERE  Ogni riga `aggiornato` contiene tutti i campi della riga",
    "     originale, non solo quelli cambiati?",
    "",
    "",
  ];
}

// ── PARTE 5 ─────────────────────────────────────────────────────────────────
function parte5(ds) {
  const tutte = [...ds.works, ...ds.artists, ...ds.periods, ...ds.techniques, ...ds.terms, ...ds.events];
  const idStrani = tutte.map((x) => x.id).filter((i) => !/^[a-z0-9-]+$/.test(i)).sort();

  const perNome = {};
  for (const a of ds.artists) (perNome[a.name.toLowerCase()] = perNome[a.name.toLowerCase()] || []).push(a);
  const gemelli = Object.values(perNome).filter((v) => v.length > 1);

  const perTitolo = {};
  for (const w of ds.works) (perTitolo[w.title.toLowerCase()] = perTitolo[w.title.toLowerCase()] || []).push(w);
  const titoliRipetuti = Object.values(perTitolo).filter((v) => v.length > 1);

  const scuoleOrfane = ds.periods.filter((p) => {
    if (p.type !== "scuola" || !p.parent_id) return false;
    const padre = ds.periods.find((x) => x.id === p.parent_id);
    return !padre || padre.type === "epoca";
  });

  return [
    RIGA,
    "PARTE 5 — DIFETTI NOTI DEL REGISTRO",
    RIGA,
    "",
    "  Il catalogo non è pulito, e sapere dov'è sporco vale più che fingere che",
    "  non lo sia. Questi difetti si trovano nel registro qui sotto: NON vanno",
    "  imitati, e chi ne trova altri li segnala.",
    "",
    `  A. ${idStrani.length} id fuori norma (maiuscole, accenti, apostrofi, spazi).`,
    "     Restano come sono perché cambiarli romperebbe i collegamenti che",
    "     puntano lì, ma un id nuovo non si scrive mai così:",
    "",
    ...idStrani.map((i) => `       ${i}`),
    "",
    `  B. ${gemelli.length} nomi di persona presenti due volte con id diversi.`,
    "     Sono doppioni veri, da unire prima o poi:",
    "",
    ...gemelli.map((g) => `       ${g[0].name}  ->  ${g.map((x) => x.id).join("  +  ")}`),
    "",
    `  C. ${titoliRipetuti.length} titoli di opere usati da più schede. Qui NON è un difetto:`,
    "     sono opere diverse con lo stesso nome, ed è la ragione per cui l'id si",
    "     disambigua con la città o l'autore. Attenzione però quando si cerca:",
    "     trovare il titolo non vuol dire aver trovato l'opera giusta.",
    "",
    ...titoliRipetuti.slice(0, 12).map((g) => `       ${g[0].title}  ->  ${g.map((x) => x.id).join("  ·  ")}`),
    titoliRipetuti.length > 12 ? `       … e altri ${titoliRipetuti.length - 12}` : null,
    "",
    scuoleOrfane.length
      ? `  D. ${scuoleOrfane.length} scuole appese direttamente a un'epoca invece che a una corrente:`
      : "  D. Nessuna scuola appesa direttamente a un'epoca: la gerarchia è sana.",
    ...scuoleOrfane.map((p) => `       ${p.id}  (sotto ${p.parent_id})`),
    "",
    "",
  ].filter((r) => r !== null);
}

// ── PARTE 6: il registro ────────────────────────────────────────────────────
function registro(ds, autori, committenti) {
  const R = [];
  const cap = (lettera, titolo, quante, nota) => {
    R.push("", riga, `${lettera}. ${titolo.toUpperCase()}  —  ${quante} voci`, riga, "");
    if (nota) { R.push(...nota.map((n) => `  ${n}`), ""); }
  };

  R.push("", RIGA);
  R.push("PARTE 6 — REGISTRO DEI NOMI ESATTI");
  R.push(RIGA);
  R.push("");
  R.push("  Questo è il punto del manuale che conta di più. Prima di creare");
  R.push("  qualunque entità, cercala qui. Il formato è sempre:");
  R.push("");
  R.push("      id  |  Nome esatto  |  informazioni per distinguerlo");
  R.push("");
  R.push("  L'id è quello che va scritto nei campi; il nome è quello che va");
  R.push("  mostrato. Se il testo che stai leggendo usa un nome diverso da");
  R.push("  quello qui, il nome diverso va aggiunto fra gli `aka` della scheda");
  R.push("  esistente — non diventa una scheda nuova.");
  R.push("");

  // A. periodi, ad albero
  cap("A", "Epoche, correnti e scuole", ds.periods.length, [
    "Rientrati per livello: epoca, poi le correnti sotto, poi le scuole.",
    "In `period_id` di un'opera va SEMPRE il livello più profondo che si",
    "adatta.",
  ]);
  const figli = (pid) => ds.periods.filter((p) => p.parent_id === pid)
    .sort((a, b) => (a.year_start ?? 0) - (b.year_start ?? 0) || a.name.localeCompare(b.name, "it"));
  const stampaPeriodo = (p, liv) => {
    const rientro = "  " + "    ".repeat(liv);
    R.push(`${rientro}${pad(p.id, Math.max(2, 46 - liv * 4))} | ${pad(p.name, 34)} | ${anni(p.year_start, p.year_end)}`);
    for (const f of figli(p.id)) stampaPeriodo(f, liv + 1);
  };
  const epoche = ds.periods.filter((p) => !p.parent_id)
    .sort((a, b) => (a.year_start ?? 0) - (b.year_start ?? 0));
  for (const e of epoche) { stampaPeriodo(e, 0); R.push(""); }
  const orfani = ds.periods.filter((p) => p.parent_id && !ds.periods.some((x) => x.id === p.parent_id));
  if (orfani.length) {
    R.push("  [ senza un padre valido — da sistemare ]");
    for (const p of orfani) R.push(`  ${pad(p.id, 46)} | ${pad(p.name, 34)} | padre mancante: ${p.parent_id}`);
    R.push("");
  }

  // B. autori
  cap("B", "Autori", autori.length, [
    "Chi esegue. Vanno in `works.artist_ids`. Fra parentesi quadre i nomi",
    "alternativi già registrati: se il testo usa uno di quelli, la scheda è",
    "questa.",
  ]);
  for (const a of autori) {
    const alt = (a.aka || []).length ? `  [${a.aka.join(" · ")}]` : "";
    R.push(`  ${pad(a.id, 42)} | ${pad(a.name, 36)} | ${pad(vita(a.birth, a.death), 16)} | ${a.role || ""}${alt}`);
  }

  // C. committenti
  cap("C", "Committenti", committenti.length, [
    "Chi ordina e paga. Vanno in `works.committente_ids`, mai in artist_ids.",
    "«(ente)» segnala i soggetti collettivi: casate, corti, ordini, comuni.",
  ]);
  for (const c of committenti) {
    const alt = (c.aka || []).length ? `  [${c.aka.join(" · ")}]` : "";
    R.push(`  ${pad(c.id, 42)} | ${pad(c.name, 40)} | ${pad(vita(c.birth, c.death), 16)} | ${pad(c.location_city || "", 18)} | ${c.is_collective ? "(ente)" : ""}${alt}`);
  }

  // D. tecniche
  cap("D", "Tecniche", ds.techniques.length, ["Vanno in `works.technique_ids`."]);
  for (const t of [...ds.techniques].sort((a, b) => a.name.localeCompare(b.name, "it"))) {
    R.push(`  ${pad(t.id, 46)} | ${pad(t.name, 42)} | ${t.category}`);
  }

  // E. fonti
  cap("E", "Fonti", ds.fonti.length, ["Vanno in `works.fonte_ids`."]);
  for (const f of [...ds.fonti].sort((a, b) => (a.numero ?? 99) - (b.numero ?? 99))) {
    R.push(`  [${f.numero}] ${pad(f.id, 24)} | ${f.titolo}${f.volume ? `, vol. ${f.volume}` : ""} — ${f.autori || ""} (${f.anno || "s.d."})`);
  }

  // F. città
  const citta = {};
  for (const w of ds.works) if (w.location_city) citta[w.location_city] = (citta[w.location_city] || 0) + 1;
  for (const a of ds.artists) if (a.location_city) citta[a.location_city] = (citta[a.location_city] || 0) + 1;
  const elencoCitta = Object.entries(citta).sort((a, b) => a[0].localeCompare(b[0], "it"));
  cap("F", "Città", elencoCitta.length, [
    "La grafia esatta di `location_city`. Fra parentesi quante volte è usata:",
    "una città usata una volta sola può essere un doppione di quella accanto.",
  ]);
  for (let i = 0; i < elencoCitta.length; i += 3) {
    R.push("  " + elencoCitta.slice(i, i + 3).map(([c, n]) => pad(`${c} (${n})`, 24)).join(" "));
  }

  // G. materiali
  const mat = {};
  for (const w of ds.works) for (const m of w.materials || []) mat[m] = (mat[m] || 0) + 1;
  const elencoMat = Object.entries(mat).sort((a, b) => a[0].localeCompare(b[0], "it"));
  cap("G", "Materiali", elencoMat.length, [
    "Testo libero, quindi il posto dove i sinonimi si moltiplicano più in",
    "fretta. Prima di scrivere «marmo bianco» controllare se non c'è già",
    "«marmo di Carrara».",
  ]);
  for (let i = 0; i < elencoMat.length; i += 3) {
    R.push("  " + elencoMat.slice(i, i + 3).map(([m, n]) => pad(`${m} (${n})`, 24)).join(" "));
  }

  // H. termini
  cap("H", "Termini di glossario", ds.terms.length, [
    "Vanno in `works.term_ids`. «*» segna gli archetipi.",
  ]);
  for (const t of [...ds.terms].sort((a, b) => a.term.localeCompare(b.term, "it"))) {
    R.push(`  ${pad(t.id, 44)} | ${pad(t.term, 40)} | ${pad(t.category, 14)} ${t.is_archetype ? "*" : ""}`);
  }

  // I. eventi
  cap("I", "Eventi storici", ds.events.length, ["In ordine di tempo."]);
  for (const e of [...ds.events].sort((a, b) => (a.year ?? 0) - (b.year ?? 0))) {
    R.push(`  ${pad(String(e.year ?? "?"), 6)} ${pad(e.id, 44)} | ${pad(e.title, 44)} | ${e.kind}`);
  }

  // L. opere
  cap("L", "Opere", ds.works.length, [
    "In ordine alfabetico di titolo, che è l'ordine in cui si cerca se una",
    "cosa esiste già. Il periodo è quello assegnato: se stai riclassificando,",
    "è il valore da confrontare.",
  ]);
  const nomePeriodo = new Map(ds.periods.map((p) => [p.id, p.name]));
  for (const w of [...ds.works].sort((a, b) => a.title.localeCompare(b.title, "it"))) {
    R.push(`  ${pad(w.id, 50)} | ${pad(w.title, 54)} | ${pad(anni(w.year_start, w.year_end), 16)} | ${pad(w.location_city || "", 20)} | ${nomePeriodo.get(w.period_id) || w.period_id || ""}`);
  }

  R.push("", RIGA, "Fine del manuale.", RIGA);
  return R;
}
