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
 * Carica TUTTE le tabelle dal DB Supabase (se presenti) e fa merge col JSON statico.
 * - Le righe del DB con stesso id SOVRASCRIVONO quelle del JSON
 * - Le righe del DB con id nuovo vengono AGGIUNTE
 * - Se il DB non risponde o le tabelle non esistono → fallback silenzioso al JSON
 */
async function loadDbOverrides(): Promise<Partial<Dataset>> {
  try {
    const [periodsRes, worksRes, artistsRes, techRes, termsRes, eventsRes, connsRes, hiddenRes] = await Promise.all([
      supabase.from("periods").select("*"),
      supabase.from("works").select("*"),
      supabase.from("artists").select("*"),
      supabase.from("techniques").select("*"),
      supabase.from("terms").select("*"),
      supabase.from("events").select("*"),
      supabase.from("connections").select("*"),
      supabase.from("hidden_entities").select("id"),
    ]);
    // Salva gli hidden IDs per il filtraggio
    if (!hiddenRes.error && hiddenRes.data) {
      (loadDbOverrides as any)._hiddenIds = new Set(hiddenRes.data.map((r: any) => r.id));
    } else {
      (loadDbOverrides as any)._hiddenIds = new Set();
    }
    return {
      periods: periodsRes.error ? undefined : (periodsRes.data as any) ?? [],
      works: worksRes.error ? undefined : (worksRes.data as any) ?? [],
      artists: artistsRes.error ? undefined : (artistsRes.data as any) ?? [],
      techniques: techRes.error ? undefined : (techRes.data as any) ?? [],
      terms: termsRes.error ? undefined : (termsRes.data as any) ?? [],
      events: eventsRes.error ? undefined : (eventsRes.data as any) ?? [],
      connections: connsRes.error ? undefined : (connsRes.data as any) ?? [],
    };
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
  period: "Periodo", artist: "Artista", work: "Opera",
  technique: "Tecnica", event: "Evento", term: "Termine",
};

export const KIND_LABEL: Record<string, string> = {
  influenza: "influenza", contaminazione: "contaminazione",
  rielaborazione: "rielaborazione", evoluzione: "evoluzione",
  contrasto: "contrasto", committenza: "committenza",
  "maestro-allievo": "maestro-allievo",
};

// --- Query di dominio ------------------------------------------------------

export function worksByPeriod(ds: Dataset, periodId: string): Work[] {
  return ds.works.filter((w) => w.period_id === periodId);
}

export function worksByArtist(ds: Dataset, artistId: string): Work[] {
  return ds.works.filter((w) => w.artist_ids.includes(artistId));
}

export function artistsOfWork(ix: Indexed, w: Work): Artist[] {
  return w.artist_ids.map((id) => ix.artistById.get(id)).filter(Boolean) as Artist[];
}

export function termsOfWork(ix: Indexed, w: Work): Term[] {
  return w.term_ids.map((id) => ix.termById.get(id)).filter(Boolean) as Term[];
}

export function techniquesOfWork(ix: Indexed, w: Work): Technique[] {
  return w.technique_ids.map((id) => ix.techById.get(id)).filter(Boolean) as Technique[];
}

// Connessioni che toccano una data entità
export function connectionsOf(ds: Dataset, type: EntityType, id: string): Connection[] {
  return ds.connections.filter(
    (c) =>
      (c.source_type === type && c.source_id === id) ||
      (c.target_type === type && c.target_id === id)
  );
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
// vengono raggruppate in un "complesso". Il raggruppamento è automatico,
// basato su location_place normalizzato, con esclusione di musei/gallerie.
// Fase 2: merge di gruppi affini nella stessa città
//   (es. "Piazza San Marco" + "Basilica di San Marco" → un unico gruppo)

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
const MUSEUM_RE = /\b(museo|galleri|pinacoteca|collezione|kunst|musée|museum|gallery|national)\b/i;

function isGroupablePlace(place: string): boolean {
  // Escludi solo musei/gallerie (contenitori generici, non complessi architettonici).
  // Per tutto il resto, raggruppa se 2+ opere condividono il luogo.
  return !MUSEUM_RE.test(place);
}

// Normalizza per bucket iniziale: parte prima della virgola,
// togliendo parentesi e dettagli. Es:
//   "Basilica di San Marco, intradosso del portale" → "basilica di san marco"
//   "Piazza San Marco" → "piazza san marco"
function bucketNorm(place: string): string {
  let s = place.split(",")[0].trim();
  // rimuovi parentesi e contenuto: "Basilica di San Marco (facciata)" → "Basilica di San Marco"
  s = s.replace(/\s*\([^)]*\)/g, "").trim();
  return s.toLowerCase();
}

// Estrae i "token chiave" di un nome luogo per il merge.
// Es. "basilica di san marco" → ["basilica", "san", "marco"]
// Es. "piazza san marco" → ["piazza", "san", "marco"]
function keyTokens(norm: string): string[] {
  const STOP = new Set(["di", "del", "della", "dei", "degli", "delle", "da", "in", "a", "al", "alla", "lo", "la", "il", "le", "gli", "i", "e", "con", "per", "su"]);
  return norm.split(/\s+/).filter(t => t.length > 1 && !STOP.has(t));
}

// Due nomi normalizzati sono "affini" se condividono almeno 2 token chiave
// (es. "basilica di san marco" e "piazza san marco" condividono "san" + "marco")
function areSimilar(n1: string, n2: string): boolean {
  const t1 = new Set(keyTokens(n1));
  const t2 = keyTokens(n2);
  let shared = 0;
  for (const t of t2) { if (t1.has(t)) shared++; }
  // devono condividere almeno 2 token significativi, o almeno il 50% dei token minori
  const minLen = Math.min(t1.size, t2.size);
  return shared >= 2 && (minLen <= 2 || shared >= minLen * 0.5);
}

/** Calcola i gruppi di opere per complesso architettonico.
 *  Ritorna una mappa chiave → WorkGroup. */
export function computeWorkGroups(ds: Dataset): Map<string, WorkGroup> {
  // Fase 1: raccogli opere per (città + luogo normalizzato)
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

  // Fase 2: merge di gruppi affini nella stessa città
  //   Es. "Piazza San Marco" e "Basilica di San Marco" diventano un gruppo unico
  const bucketKeys = [...buckets.keys()];
  const mergeOf = new Map<string, string>(); // key → key del gruppo assorbito

  for (let i = 0; i < bucketKeys.length; i++) {
    const ki = bucketKeys[i];
    if (mergeOf.has(ki)) continue; // già assorbito
    const [city1, norm1] = ki.split("|", 2);
    if (!norm1) continue;

    for (let j = i + 1; j < bucketKeys.length; j++) {
      const kj = bucketKeys[j];
      if (mergeOf.has(kj)) continue;
      const [city2, norm2] = kj.split("|", 2);
      if (city1 !== city2 || !norm2) continue;

      if (areSimilar(norm1, norm2)) {
        // Assorbi kj dentro ki (mantieni il gruppo più grande come primario)
        const sizeI = buckets.get(ki)!.length;
        const sizeJ = buckets.get(kj)!.length;
        if (sizeJ > sizeI) {
          // kj è più grande: inverti, ki viene assorbito in kj
          mergeOf.set(ki, kj);
          buckets.get(kj)!.push(...buckets.get(ki)!);
          buckets.delete(ki);
          break; // ki è stato assorbito, passa al prossimo
        } else {
          mergeOf.set(kj, ki);
          buckets.get(ki)!.push(...buckets.get(kj)!);
          buckets.delete(kj);
        }
      }
    }
  }

  // Fase 3: crea gruppi solo per bucket con 2+ opere
  const groups = new Map<string, WorkGroup>();
  for (const [key, ws] of buckets) {
    if (ws.length < 2) continue;
    // Deduplica per id (il merge può aver creato doppioni)
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
