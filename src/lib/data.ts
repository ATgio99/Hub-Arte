// ============================================================================
// LAYER DATI ISOLATO  —  lib/data.ts
// ----------------------------------------------------------------------------
// Unico punto di accesso ai dati dell'applicazione. I componenti NON leggono
// mai i JSON direttamente: usano sempre le funzioni esportate qui.
//
// MIGRAZIONE A SUPABASE
// Oggi i dati arrivano da file JSON statici (fetch in `loadDataset`). Per
// passare a Supabase basta riscrivere SOLO `loadDataset()` con una query
// (es. supabase.from('works').select('*') ...) mantenendo la stessa firma e
// la stessa forma del `Dataset`. Tutto il resto del file e tutti i componenti
// restano invariati: le funzioni accessorie operano su strutture in memoria.
// ============================================================================

import type {
  Dataset, Period, Artist, Work, Technique, Term, Connection, ArtEvent,
  EntityType,
} from "./types";
import { supabase } from "./supabase";

// --- Sorgente dati (JSON statico + Supabase) --------------------------------
const BASE = (import.meta as any).env?.BASE_URL ?? "/";

async function fetchJson<T>(name: string): Promise<T> {
  const res = await fetch(`${BASE}data/${name}.json`);
  if (!res.ok) throw new Error(`Impossibile caricare ${name}: ${res.status}`);
  return res.json();
}

let _cache: Promise<Dataset> | null = null;

/** Clear the dataset cache so next loadDataset() re-fetches everything */
export function clearDatasetCache() { _cache = null; }

/**
 * Il catalogo completo sta nei JSON: qui si chiedono al database SOLO le righe
 * modificate dopo l'ultimo export (public/data/meta.json). Cosi' le correzioni
 * fatte dalla dashboard si vedono subito online, ma finche' non si tocca nulla
 * queste query tornano vuote e costano quasi niente. Quando si vuole riportare
 * le modifiche nel repository si lancia `npm run esporta-catalogo`.
 *
 * Senza meta.json (fork che non ha ancora esportato) si scarica tutto, come
 * faceva la versione precedente.
 */
// Le otto tabelle del catalogo si interrogano a ogni caricamento di pagina, e
// ognuna costa due richieste — la verifica CORS e la lettura vera. Sedici
// richieste per un risultato che, salvo modifiche di un amministratore, e'
// sempre lo stesso: niente.
//
// Il risultato viene quindi tenuto per qualche minuto in sessionStorage: chi
// ricarica, cambia scheda e torna, o naviga con Safari che ricarica le pagine
// in secondo piano, non ripaga sedici richieste ogni volta. La finestra e'
// breve perche' una correzione fatta dalla dashboard deve comunque comparire
// in fretta.
const CHIAVE_DELTA = "atlante:delta-catalogo";
const DURATA_DELTA = 10 * 60 * 1000;

function leggiDeltaSalvato(): { dati: Partial<Dataset>; nascosti: string[] } | null {
  try {
    const raw = sessionStorage.getItem(CHIAVE_DELTA);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (!c || Date.now() - c.quando > DURATA_DELTA) return null;
    return { dati: c.dati, nascosti: c.nascosti ?? [] };
  } catch { return null; }
}

function salvaDelta(dati: Partial<Dataset>, nascosti: string[]) {
  try {
    sessionStorage.setItem(CHIAVE_DELTA, JSON.stringify({ quando: Date.now(), dati, nascosti }));
  } catch { /* quota piena: si continua senza cache */ }
}

/** Da chiamare quando un amministratore salva: la copia in cache non vale piu'. */
export function scadiDeltaCatalogo() {
  try { sessionStorage.removeItem(CHIAVE_DELTA); } catch { /* ignore */ }
}

async function loadDbOverrides(): Promise<Partial<Dataset>> {
  const salvato = leggiDeltaSalvato();
  if (salvato) {
    (loadDbOverrides as any)._hiddenIds = new Set(salvato.nascosti);
    return salvato.dati;
  }
  try {
    // data dell'ultimo export: da li' in poi conta solo cio' che e' cambiato
    let dopo: string | null = null;
    try {
      const meta = await fetchJson<{ esportato_il?: string }>("meta");
      dopo = meta?.esportato_il ?? null;
    } catch { /* nessun meta.json: si scarica tutto */ }

    const q = (tabella: string) => {
      const base = supabase.from(tabella).select("*");
      return dopo ? base.gt("updated_at", dopo) : base;
    };

    const [periodsRes, worksRes, artistsRes, techRes, termsRes, eventsRes, connsRes, hiddenRes] = await Promise.all([
      q("periods"),
      q("works"),
      q("artists"),
      q("techniques"),
      q("terms"),
      q("events"),
      dopo
        ? supabase.from("connections").select("*").gt("updated_at", dopo).order("sort_order")
        : supabase.from("connections").select("*").order("sort_order"),
      // le voci nascoste prima dell'export sono gia' state tolte dai JSON
      dopo
        ? supabase.from("hidden_entities").select("id").gt("hidden_at", dopo)
        : supabase.from("hidden_entities").select("id"),
    ]);
    // Salva gli hidden IDs per il filtraggio
    const nascosti: string[] = (!hiddenRes.error && hiddenRes.data)
      ? hiddenRes.data.map((r: any) => r.id) : [];
    (loadDbOverrides as any)._hiddenIds = new Set(nascosti);
    const risultato = {
      periods: periodsRes.error ? undefined : (periodsRes.data as any) ?? [],
      works: worksRes.error ? undefined : (worksRes.data as any) ?? [],
      artists: artistsRes.error ? undefined : (artistsRes.data as any) ?? [],
      techniques: techRes.error ? undefined : (techRes.data as any) ?? [],
      terms: termsRes.error ? undefined : (termsRes.data as any) ?? [],
      events: eventsRes.error ? undefined : (eventsRes.data as any) ?? [],
      connections: connsRes.error ? undefined : (connsRes.data as any) ?? [],
    };
    salvaDelta(risultato, nascosti);
    return risultato;
  } catch {
    (loadDbOverrides as any)._hiddenIds = new Set();
    return {};
  }
}

/** Helper: merge di un array JSON con array DB (DB sovrascrive per id, aggiunge nuovi) */
function mergeArrays<T extends { id: string }>(jsonArr: T[], dbArr: T[] | undefined): T[] {
  if (!dbArr || dbArr.length === 0) return jsonArr;
  const map = new Map<string, T>(jsonArr.map((x) => [x.id, x]));
  for (const db of dbArr) {
    if (!db?.id) continue;
    if (map.has(db.id)) {
      map.set(db.id, { ...map.get(db.id)!, ...db });
    } else {
      map.set(db.id, db);
    }
  }
  return [...map.values()];
}

/** Carica (e mette in cache) l'intero dataset. Unico accesso alla sorgente. */
export function loadDataset(): Promise<Dataset> {
  if (_cache) return _cache;
  _cache = (async () => {
    const [periods, artists, works, techniques, terms, connections, events] =
      await Promise.all([
        fetchJson<Period[]>("periods"),
        fetchJson<Artist[]>("artists"),
        fetchJson<Work[]>("works"),
        fetchJson<Technique[]>("techniques"),
        fetchJson<Term[]>("terms"),
        fetchJson<Connection[]>("connections"),
        fetchJson<ArtEvent[]>("events"),
      ]);

    // Merge localStorage work overrides (legacy admin.html)
    try {
      const overridesRaw = localStorage.getItem("hubart_works_overrides");
      if (overridesRaw) {
        const overrides: Work[] = JSON.parse(overridesRaw);
        for (const ow of overrides) {
          const idx = works.findIndex(w => w.id === ow.id);
          if (idx !== -1) works[idx] = ow; else works.push(ow);
        }
      }
    } catch { /* ignore localStorage errors */ }

    // Merge Supabase DB (tutte le tabelle)
    try {
      const dbData = await loadDbOverrides();
      const hiddenIds: Set<string> = (loadDbOverrides as any)._hiddenIds || new Set();
      const filterHidden = <T extends { id: string }>(arr: T[]): T[] =>
        hiddenIds.size === 0 ? arr : arr.filter(x => !hiddenIds.has(x.id));
      return {
        periods: filterHidden(mergeArrays(periods, dbData.periods as Period[])),
        artists: filterHidden(mergeArrays(artists, dbData.artists as Artist[])),
        works: filterHidden(mergeArrays(works, dbData.works as Work[])),
        techniques: filterHidden(mergeArrays(techniques, dbData.techniques as Technique[])),
        terms: filterHidden(mergeArrays(terms, dbData.terms as Term[])),
        connections: filterHidden(mergeArrays(connections, dbData.connections as Connection[])),
        events: filterHidden(mergeArrays(events, dbData.events as ArtEvent[])),
      };
    } catch { /* ignore DB errors, use JSON only */ }

    return { periods, artists, works, techniques, terms, connections, events };
  })();
  return _cache;
}

// --- Indici e accessori (operano in memoria) -------------------------------
// Tutte le funzioni sotto sono PURE rispetto al Dataset passato: ricevono il
// dataset (o un indice) e non toccano la sorgente. Questo le rende riusabili
// indipendentemente dall'origine dei dati.

export type Indexed = {
  ds: Dataset;
  periodById: Map<string, Period>;
  artistById: Map<string, Artist>;
  workById: Map<string, Work>;
  techById: Map<string, Technique>;
  termById: Map<string, Term>;
  eventById: Map<string, ArtEvent>;
};

export function buildIndex(ds: Dataset): Indexed {
  const idx = (arr: any[]) => new Map(arr.map((x) => [x.id, x]));
  return {
    ds,
    periodById: idx(ds.periods),
    artistById: idx(ds.artists),
    workById: idx(ds.works),
    techById: idx(ds.techniques),
    termById: idx(ds.terms),
    eventById: idx(ds.events),
  };
}

// Risoluzione generica di un'entità per tipo+id
export function resolveEntity(ix: Indexed, type: EntityType, id: string) {
  switch (type) {
    case "period": return ix.periodById.get(id);
    case "artist": return ix.artistById.get(id);
    case "work": return ix.workById.get(id);
    case "technique": return ix.techById.get(id);
    case "term": return ix.termById.get(id);
    case "event": return ix.eventById.get(id);
  }
}

export function entityLabel(ix: Indexed, type: EntityType, id: string): string {
  const e: any = resolveEntity(ix, type, id);
  if (!e) return id;
  return e.name ?? e.title ?? e.term ?? id;
}

// Nome leggibile del tipo entità
export const ENTITY_LABEL: Record<EntityType, string> = {
  period: "Periodo", artist: "Autore", work: "Opera",
  technique: "Tecnica", event: "Evento", term: "Termine",
};

export const KIND_LABEL: Record<string, string> = {
  influenza: "influenza", contaminazione: "contaminazione",
  rielaborazione: "rielaborazione", evoluzione: "evoluzione",
  contrasto: "contrasto", committenza: "committenza",
  "maestro-allievo": "maestro-allievo", collaborazione: "collaborazione",
  // Pseudo-tipi generati dal Grafo (vedi ConnKind in types.ts)
  autore: "opera di", luogo: "luogo",
};

// --- Query di dominio ------------------------------------------------------

export function worksByPeriod(ds: Dataset, periodId: string): Work[] {
  return ds.works.filter((w) => w.period_id === periodId);
}

export function worksByArtist(ds: Dataset, artistId: string): Work[] {
  return ds.works.filter((w) => w.artist_ids.includes(artistId));
}

// Le opere volute da un committente. Speculare a worksByArtist, ma sull'altro
// elenco: chi commissiona non figura tra gli autori, quindi cercarlo in
// artist_ids non restituirebbe nulla.
export function worksByCommittente(ds: Dataset, committenteId: string): Work[] {
  return ds.works.filter((w) => (w.committente_ids ?? []).includes(committenteId));
}

export function artistsOfWork(ix: Indexed, w: Work): Artist[] {
  return w.artist_ids.map((id) => ix.artistById.get(id)).filter(Boolean) as Artist[];
}

export function committentiOfWork(ix: Indexed, w: Work): Artist[] {
  return (w.committente_ids ?? []).map((id) => ix.artistById.get(id)).filter(Boolean) as Artist[];
}

// Un mecenate: la categoria esplicita se c'e', altrimenti il ruolo scritto a
// mano (com'era prima che la categoria venisse davvero popolata).
export function isCommittente(a: Artist): boolean {
  if (a.category) return a.category === "committenti";
  return (a.role ?? "").toLowerCase().includes("committ");
}

export function termsOfWork(ix: Indexed, w: Work): Term[] {
  return w.term_ids.map((id) => ix.termById.get(id)).filter(Boolean) as Term[];
}

export function techniquesOfWork(ix: Indexed, w: Work): Technique[] {
  return w.technique_ids.map((id) => ix.techById.get(id)).filter(Boolean) as Technique[];
}

// Connessioni che toccano una data entità
// Ordinate per sort_order (gerarchia impostata dall'admin nell'editor)
export function connectionsOf(ds: Dataset, type: EntityType, id: string): Connection[] {
  return ds.connections
    .filter(
      (c) =>
        (c.source_type === type && c.source_id === id) ||
        (c.target_type === type && c.target_id === id)
    )
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

// Opere "vicine": connesse direttamente, oppure (fallback) stesso periodo
export function relatedWorks(ds: Dataset, w: Work, limit = 8): Work[] {
  const conns = connectionsOf(ds, "work", w.id);
  const ids = new Set<string>();
  for (const c of conns) {
    if (c.source_type === "work" && c.source_id !== w.id) ids.add(c.source_id);
    if (c.target_type === "work" && c.target_id !== w.id) ids.add(c.target_id);
  }
  let out = [...ids].map((id) => ds.works.find((x) => x.id === id)).filter(Boolean) as Work[];
  if (out.length < limit) {
    const same = ds.works.filter(
      (x) => x.period_id === w.period_id && x.id !== w.id && !ids.has(x.id)
    );
    out = out.concat(same.slice(0, limit - out.length));
  }
  return out.slice(0, limit);
}

// Catena di antenati di un periodo (root..self)
export function periodAncestry(ix: Indexed, id: string): Period[] {
  const chain: Period[] = [];
  let cur = ix.periodById.get(id);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    chain.unshift(cur);
    seen.add(cur.id);
    cur = cur.parent_id ? ix.periodById.get(cur.parent_id) : undefined;
  }
  return chain;
}

// Periodo "radice/epoca" di appartenenza (per le corsie della timeline)
export function rootPeriod(ix: Indexed, id: string): Period | undefined {
  const chain = periodAncestry(ix, id);
  return chain[0];
}

// --- Utilità di formato ----------------------------------------------------

export function fmtYear(y: number | null | undefined): string {
  if (y == null) return "—";
  return y < 0 ? `${-y} a.C.` : `${y}`;
}

export function workYears(w: Work): string {
  if (w.date_text) return w.date_text;
  if (w.year_start && w.year_end) return `${fmtYear(w.year_start)}–${fmtYear(w.year_end)}`;
  return fmtYear(w.year_end ?? w.year_start);
}

// anno rappresentativo per posizionamenti su scala temporale
export function workSortYear(w: Work): number | null {
  return w.year_end ?? w.year_start ?? null;
}

export function periodMidYear(p: Period): number {
  return Math.round((p.year_start + p.year_end) / 2);
}

// --- Raggruppamento opere per complesso architettonico ----------------------
// Le opere che si trovano nello stesso edificio (chiesa, basilica, cappella…)
// vengono raggruppate in un "complesso". Il raggruppamento è automatico e
// avviene per corrispondenza ESATTA di città + location_place normalizzato,
// con esclusione di musei/gallerie.
//
// NOTA: qui esisteva una seconda fase che tentava di fondere fra loro i gruppi
// con nomi "affini" nella stessa città (es. "Piazza San Marco" con "Basilica di
// San Marco"). Era inattiva per un bug e non ha mai fuso nulla; simulandola sul
// dataset reale produceva 71 fusioni quasi tutte errate, perché due parole in
// comune bastano a unire chiese diverse (Santa Croce con Santa Maria Novella,
// San Clemente al Laterano con San Giovanni in Laterano). È stata rimossa: per
// unire due grafie dello stesso edificio si uniforma il location_place delle
// opere, che è esplicito e verificabile.

export interface WorkGroup {
  /** Nome del complesso (il più rappresentativo) */
  name: string;
  /** Città */
  city: string | null;
  /** Opera "capofila": tipo architettura o la più importante */
  parent: Work;
  /** Tutte le opere del gruppo, parent inclusa */
  works: Work[];
}

// Controlla se un luogo è raggruppabile in un complesso.
// Filtro: NON raggruppiamo musei/gallerie/pinacoteche (sono contenitori generici,
// non complessi architettonici). Per tutto il resto, raggruppiamo se 2+ opere
// hanno lo stesso location_place (match case-insensitive dopo normalizzazione).
// Questo permette all'admin di creare complessi con qualsiasi nome di luogo
// (es. "Casa di Giotto", "Villa Foscari", "Castello Estense") semplicemente
// assegnando lo stesso luogo a 2+ opere.
// I musei non sono complessi architettonici: sono contenitori, e due opere
// appese nella stessa sala non formano un edificio. La versione precedente
// chiudeva ogni voce con \b, quindi «galleri\b» non stava dentro «Gallerie»
// (plurale) e gli Uffizi finivano per diventare un complesso, con capofila
// un'opera qualsiasi. Le radici restano aperte a destra.
const MUSEUM_RE = /\b(mus(eo|ei|ée|eum)|galleri|gallery|galleries|pinacotec|collezion|kunst|national)/i;

function isGroupablePlace(place: string): boolean {
  // Escludi solo musei/gallerie (contenitori generici, non complessi architettonici).
  // Per tutto il resto, raggruppa se 2+ opere condividono il luogo.
  return !MUSEUM_RE.test(place);
}

// Normalizza per bucket iniziale: parte prima della virgola,
// togliendo parentesi e dettagli. Es:
//   "Basilica di San Marco, intradosso del portale" → "basilica di san marco"
//   "Piazza San Marco" → "piazza san marco"
/** Nome breve di un luogo: la parte prima della virgola, senza parentesi.
 *  «Galleria degli Uffizi, ma collocazione originaria la chiesa di …» diventa
 *  «Galleria degli Uffizi». Serve sia a raggruppare sia a scriverlo a video:
 *  certi luoghi nel catalogo sono frasi intere e sfondano l'impaginazione. */
export function nomeBreveLuogo(place: string): string {
  return place.split(",")[0].trim().replace(/\s*\([^)]*\)/g, "").trim();
}

function bucketNorm(place: string): string {
  let s = place.split(",")[0].trim();
  // rimuovi parentesi e contenuto: "Basilica di San Marco (facciata)" → "Basilica di San Marco"
  s = s.replace(/\s*\([^)]*\)/g, "").trim();
  return s.toLowerCase();
}

/** Calcola i gruppi di opere per complesso architettonico.
 *  Ritorna una mappa chiave → WorkGroup. */
export function computeWorkGroups(ds: Dataset): Map<string, WorkGroup> {
  // Raccogli le opere per (città + luogo normalizzato)
  const buckets = new Map<string, Work[]>();
  for (const w of ds.works) {
    const place = w.location_place;
    if (!place) continue;
    const norm = bucketNorm(place);
    if (!isGroupablePlace(norm)) continue;
    const key = `${w.location_city ?? ""}|${norm}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(w);
  }

  // Crea un gruppo solo per i luoghi con 2+ opere
  const groups = new Map<string, WorkGroup>();
  for (const [key, ws] of buckets) {
    if (ws.length < 2) continue;
    // Deduplica per id (difensivo)
    const seen = new Set<string>();
    const unique = ws.filter(w => { if (seen.has(w.id)) return false; seen.add(w.id); return true; });
    if (unique.length < 2) continue;

    // Determina l'opera "capofila": prima architettura con importanza massima
    const arch = unique.filter(w => w.type === "architettura").sort((a, b) => b.importance - a.importance || a.title.length - b.title.length);
    const parent = arch[0] ?? unique.reduce((a, b) => a.importance > b.importance ? a : b);

    // Determina il nome del gruppo: usa il titolo dell'opera architettonica principale,
    // o il location_place più frequente
    const placeCounts = new Map<string, number>();
    for (const w of unique) {
      if (w.location_place) {
        const p = w.location_place.split(",")[0].trim().replace(/\s*\([^)]*\)/g, "").trim();
        placeCounts.set(p, (placeCounts.get(p) ?? 0) + 1);
      }
    }
    // Scegli il nome più frequente, o il titolo dell'opera parent
    let bestName = parent.title;
    let bestCount = 0;
    for (const [p, c] of placeCounts) {
      if (c > bestCount) { bestCount = c; bestName = p; }
    }

    groups.set(key, {
      name: bestName,
      city: parent.location_city ?? unique[0].location_city,
      parent,
      works: unique.sort((a, b) => {
        if (a.id === parent.id) return -1;
        if (b.id === parent.id) return 1;
        if (a.type === "architettura" && b.type !== "architettura") return -1;
        if (b.type === "architettura" && a.type !== "architettura") return 1;
        return b.importance - a.importance || (a.year_end ?? 0) - (b.year_end ?? 0);
      }),
    });
  }

  return groups;
}

/** Trova il gruppo di appartenenza di un'opera (se esiste) */
export function findWorkGroup(ix: Indexed, w: Work, groups: Map<string, WorkGroup>): WorkGroup | undefined {
  const byWId = workGroupMap(groups);
  return byWId.get(w.id);
}

/** Mappa opera-id → gruppo, per accesso rapido */
export function workGroupMap(groups: Map<string, WorkGroup>): Map<string, WorkGroup> {
  const m = new Map<string, WorkGroup>();
  for (const g of groups.values()) {
    for (const w of g.works) {
      m.set(w.id, g);
    }
  }
  return m;
}

// --- Fonte delle immagini ---------------------------------------------------
// La provenienza non si dichiara a mano: si ricava dall'indirizzo dell'immagine,
// cosi' non puo' contraddire il file che si sta effettivamente mostrando.
// Per Wikimedia si risale alla pagina del file, dove stanno licenza e autore.
const SITI_NOTI: { test: RegExp; nome: string }[] = [
  { test: /(^|\.)wikimedia\.org$/, nome: "Wikimedia Commons" },
  { test: /(^|\.)wikipedia\.org$/, nome: "Wikipedia" },
  { test: /(^|\.)wikidata\.org$/, nome: "Wikidata" },
  { test: /(^|\.)meisterdrucke\./, nome: "Meisterdrucke" },
  { test: /(^|\.)artesvelata\.it$/, nome: "Arte Svelata" },
  { test: /(^|\.)finestresullarte\./, nome: "Finestre sull'Arte" },
  { test: /(^|\.)arte\.it$/, nome: "Arte.it" },
  { test: /(^|\.)alamy\./, nome: "Alamy" },
  { test: /(^|\.)metmuseum\.org$/, nome: "The Met" },
  { test: /(^|\.)nga\.gov$/, nome: "National Gallery of Art" },
  { test: /(^|\.)louvre\.fr$/, nome: "Louvre" },
  { test: /(^|\.)museicivici/, nome: "Musei Civici" },
];

// Indirizzi che non sono una fonte ma una copia temporanea di un motore di
// ricerca: vanno segnalati, perche' spariscono e non dichiarano una licenza.
const CACHE_DI_RICERCA = /(gstatic\.com|search\.brave\.com|bing\.net|duckduckgo\.com|pinimg\.com)$/;

export interface FonteImmagine {
  nome: string;
  href: string;
  affidabile: boolean;
}

export function fonteImmagine(url?: string | null): FonteImmagine | null {
  if (!url) return null;
  let host: string;
  try { host = new URL(url).hostname.toLowerCase(); } catch { return null; }

  // Da un file di Wikimedia si risale alla sua pagina di descrizione.
  if (/wikimedia\.org$/.test(host)) {
    const file = decodeURIComponent(url.split("/").pop() || "").split("?")[0];
    return {
      nome: "Wikimedia Commons",
      href: file ? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}` : url,
      affidabile: true,
    };
  }
  if (CACHE_DI_RICERCA.test(host)) {
    return { nome: "copia da motore di ricerca", href: url, affidabile: false };
  }
  const noto = SITI_NOTI.find((s) => s.test.test(host));
  return { nome: noto ? noto.nome : host.replace(/^www\./, ""), href: url, affidabile: true };
}

// Una richiesta di modifica porta con se' l'id della scheda, non il suo tipo:
// la tabella nasce per le opere e ha una sola colonna work_id. Gli id di opere
// e autori non si sovrappongono mai, quindi il tipo si ricava cercando l'id
// nei due indici.
export function rottaDiScheda(ix: Indexed, id: string): string {
  if (ix.artistById.has(id)) return `/artista/${id}`;
  return `/opera/${id}`;
}
