// ============================================================================
// Generatore di quiz CLIENT-SIDE dal dataset — "quiz patente".
// Zero token, zero rete. Molti template di domanda con distrattori
// "intelligenti" (stesso periodo/categoria). Con 944 opere, 672 termini e
// 93 tecniche le combinazioni superano le migliaia.
// ============================================================================
import type { Indexed } from "./data";
import { workYears } from "./data";
import type { Work, Artist } from "./types";

export type QuizKind =
  | "autore" | "periodo" | "tecnica" | "datazione" | "secolo" | "citta"
  | "immagine" | "opera-luogo" | "artista-periodo" | "artista-opera" | "tecnica-def"
  | "def-tecnica" | "termine-def" | "def-termine" | "periodo-secolo"
  | "periodo-regione" | "connessione" | "evento-anno" | "evento-da-anno"
  | "autore-input" | "titolo-input" | "periodo-input" | "data-input" | "luogo-input";

export interface Question {
  id: string;
  kind: QuizKind;
  prompt: string;
  image?: string;
  options: string[];
  correct: number;
  refId: string;          // id entità di riferimento (per ripasso / banca errori)
  refHref?: string;       // link alla scheda
  explain: string;
  topicPeriodId?: string; // periodo associato (per statistiche per periodo)
  /** Per domande "autore-input": id dell'artista corretto, così il rendering
   *  può usare un autocomplete sull'elenco artisti del db e verificare la
   *  scelta confrontando l'id (più robusto del confronto stringa). */
  correctArtistId?: string;
  correctArtistName?: string;
  /** Per domande aperte su altri tipi di entità (opera, periodo, luogo).
   *  Salviamo l'id e l'etichetta leggibile dell'entità corretta. */
  correctEntityId?: string;
  correctEntityLabel?: string;
  /** Tipo di entità da cercare nell'autocomplete: "artist" | "work" | "period" | "city".
   *  Usato dal componente Autocomplete per sapere quale pool mostrare. */
  correctEntityType?: "artist" | "work" | "period" | "city";
}

export const QUIZ_KIND_LABEL: Record<QuizKind, string> = {
  autore: "Autore dell'opera",
  periodo: "Periodo dell'opera",
  tecnica: "Tecnica dell'opera",
  datazione: "Datazione",
  secolo: "Secolo",
  citta: "Città / luogo",
  immagine: "Riconosci l'opera",
  "opera-luogo": "Opera nel luogo",
  "artista-periodo": "Periodo dell'autore",
  "artista-opera": "Opera dell'autore",
  "tecnica-def": "Definizione di tecnica",
  "def-tecnica": "Quale tecnica?",
  "termine-def": "Definizione di termine",
  "def-termine": "Quale termine?",
  "periodo-secolo": "Secolo del periodo",
  "periodo-regione": "Area geografica del periodo",
  connessione: "Tipo di legame",
  "evento-anno": "Anno dell'evento",
  "evento-da-anno": "Evento dall'anno",
  "autore-input": "Riconosci l'autore (a memoria)",
  "titolo-input": "Riconosci il titolo (a memoria)",
  "periodo-input": "Riconosci il periodo (a memoria)",
  "data-input": "Riconosci la data (a memoria)",
  "luogo-input": "Riconosci il luogo (a memoria)",
};

/** Tipi di domanda "aperti" (con autocomplete invece di scelta multipla).
 *  Sono raggruppati sotto il selettore "Aperte" nel setup del quiz. */
export const OPEN_KINDS: QuizKind[] = [
  "autore-input", "titolo-input", "periodo-input", "data-input", "luogo-input",
];

// raggruppamento per UI (categorie macro)
export const QUIZ_GROUPS: { label: string; kinds: QuizKind[] }[] = [
  { label: "Opere", kinds: ["autore", "periodo", "tecnica", "datazione", "secolo", "citta", "immagine", "opera-luogo", "autore-input", "titolo-input", "periodo-input", "data-input", "luogo-input"] },
  { label: "Autori", kinds: ["artista-periodo", "artista-opera"] },
  { label: "Tecniche & termini", kinds: ["tecnica-def", "def-tecnica", "termine-def", "def-termine"] },
  { label: "Periodi & contesto", kinds: ["periodo-secolo", "periodo-regione", "connessione", "evento-anno", "evento-da-anno"] },
];

export const ALL_KINDS: QuizKind[] = QUIZ_GROUPS.flatMap((g) => g.kinds);

/** Tipi di domanda "a risposta multipla" (scelta tra 4 opzioni).
 *  Sono tutti quelli che NON sono in OPEN_KINDS. */
export const MULTIPLE_KINDS: QuizKind[] = ALL_KINDS.filter(k => !OPEN_KINDS.includes(k));

/** tipi di domanda generati da opere o artisti: gli unici sensati in modalità «solo preferiti» */
export const FAV_KINDS: QuizKind[] = [
  "autore", "periodo", "tecnica", "datazione", "secolo", "citta", "immagine", "opera-luogo", "autore-input", "titolo-input", "periodo-input", "data-input", "luogo-input",
  "artista-periodo", "artista-opera",
];

function shuffle<T>(a: T[], seed: () => number): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(seed() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
function mulberry(s: number) { return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function uniqOptions(correct: string, pools: string[][], rng: () => number, n = 3): string[] {
  const seen = new Set([correct.trim().toLowerCase()]);
  const out: string[] = [];
  // prima il pool "intelligente", poi fallback
  for (const pool of pools) {
    for (const c of shuffle(pool, rng)) {
      if (!c) continue;
      const k = c.trim().toLowerCase();
      if (!seen.has(k) && c.trim()) { seen.add(k); out.push(c); }
      if (out.length >= n) return out;
    }
  }
  return out;
}

function build(correct: string, distractors: string[], rng: () => number) {
  if (distractors.length < 3) return null;
  const opts = shuffle([correct, ...distractors.slice(0, 3)], rng);
  return { options: opts, correct: opts.indexOf(correct) };
}

function century(year: number): string {
  if (year <= 0) return "—";
  const c = Math.ceil(year / 100);
  const roman = toRoman(c);
  return `${roman} secolo`;
}
function toRoman(n: number): string {
  const map: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "", v = n;
  for (const [k, s] of map) while (v >= k) { out += s; v -= k; }
  return out;
}
function decade(year: number): string {
  const d = Math.floor(year / 10) * 10;
  return `anni ${d}`;
}

export interface GenOpts {
  kinds: QuizKind[];
  periodId?: string;       // singolo periodo (retro-compatibile)
  periodIds?: string[];    // periodi multipli (ha precedenza su periodId)
  /** intervallo storico [min, max] — filtra opere/artisti/periodi per anno
   *  ATTENZIONE: ha precedenza su periodIds quando fornito. */
  yearRange?: { min: number; max: number };
  book?: number;
  count: number;
  seed?: number;
  /** se fornito, genera SOLO da questi item (modalità ripasso banca errori) */
  refIds?: { kind: QuizKind; refId: string }[];
  /** se fornito, limita il quiz alle opere/artisti preferiti */
  favorites?: { works: Set<string>; artists: Set<string> };
  /** se fornito, limita il quiz alle opere approfondite (studied) */
  studiedWorks?: Set<string>;
}

const truncDef = (s: string, n = 110) => s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s;

export function generateQuiz(ix: Indexed, opts: GenOpts): Question[] {
  const rng = mulberry(opts.seed ?? Date.now() % 1e9);
  const ds = ix.ds;
  const periodName = (id: string) => ix.periodById.get(id)?.name ?? id;

  const fav = opts.favorites;
  const studied = opts.studiedWorks;
  const isFavWork = (w: Work) => !fav || fav.works.has(w.id) || w.artist_ids.some((a) => fav.artists.has(a));
  const isStudiedWork = (w: Work) => !studied || studied.has(w.id);
  const isFiltered = !!(fav || studied);

  // set dei periodi ammessi: il filtro include anche i sotto-periodi
  // (gerarchia parent_id) e si applica a opere, artisti, termini, tecniche,
  // periodi ed eventi — non solo alle opere.
  // Supporta periodIds (multipli) con fallback a periodId (singolo)
  const _pids = opts.periodIds?.length ? opts.periodIds : opts.periodId ? [opts.periodId] : null;
  // yearRange (intervallo storico a trascinamento) ha precedenza sui periodIds:
  // un periodo è ammesso se la sua estensione [year_start, year_end] interseca
  // [yearRange.min, yearRange.max]
  const yr = opts.yearRange;
  const periodOk = _pids
    ? new Set(ds.periods.filter((p) => _pids.includes(p.id) || (p.parent_id && _pids.includes(p.parent_id))).map((p) => p.id))
    : null;
  const yearInRange = (yStart: number | null | undefined, yEnd?: number | null | undefined) => {
    if (!yr) return true;
    const s = yStart ?? yEnd, e = yEnd ?? yStart;
    if (s == null && e == null) return true; // entità senza datazione: ammessa
    const lo = s ?? e!, hi = e ?? s!;
    return hi >= yr.min && lo <= yr.max;
  };

  // pool opere note (con preferiti/approfonditi il vincolo di importanza decade)
  let workPool = isFiltered ? ds.works.filter((w) => isFavWork(w) && isStudiedWork(w)) : ds.works.filter((w) => w.importance >= 2);
  if (periodOk) workPool = workPool.filter((w) => periodOk.has(w.period_id));
  // yearRange: filtra opere per anno (interseca [year_start, year_end] con [yr.min, yr.max])
  if (yr) workPool = workPool.filter((w) => yearInRange(w.year_start, w.year_end));
  if (opts.book) workPool = workPool.filter((w) => w.book === opts.book);

  let namedArtists = ds.artists.filter((a) => a.name && a.role);
  if (fav) {
    const favArtistIds = new Set<string>(fav.artists);
    for (const w of ds.works) if (fav.works.has(w.id)) for (const aid of w.artist_ids) favArtistIds.add(aid);
    namedArtists = namedArtists.filter((a) => favArtistIds.has(a.id));
  }
  // studied: restringe gli artisti a quelli che hanno ALMENO un'opera studied
  if (studied) {
    const studiedArtistIds = new Set<string>();
    for (const w of ds.works) if (studied.has(w.id)) for (const aid of w.artist_ids) studiedArtistIds.add(aid);
    namedArtists = namedArtists.filter((a) => studiedArtistIds.has(a.id));
  }
  if (periodOk) namedArtists = namedArtists.filter((a) => a.period_ids.some((pid) => periodOk.has(pid)));
  // yearRange: artisti per anno di nascita/morte (o periodo)
  if (yr) namedArtists = namedArtists.filter((a) => {
    if (a.birth != null || a.death != null) return yearInRange(a.birth, a.death);
    if (a.period_ids.length) return a.period_ids.some((pid) => {
      const p = ix.periodById.get(pid); return p ? yearInRange(p.year_start, p.year_end) : true;
    });
    return true;
  });
  const allTechNames = ds.techniques.map((t) => t.name);
  const allTermNames = ds.terms.map((t) => t.term);
  const allPeriodNames = ds.periods.map((p) => p.name);
  const allCities = [...new Set(ds.works.map((w) => w.location_city).filter(Boolean) as string[])];
  const allRegions = [...new Set(ds.periods.flatMap((p) => p.regions))];
  const samePeriodWorks = (w: Work) => ds.works.filter((x) => x.period_id === w.period_id && x.id !== w.id);
  const worksOfArtist = (a: Artist) => ds.works.filter((w) => w.artist_ids.includes(a.id) && w.importance >= 2);

  const out: Question[] = [];
  const usedKey = new Set<string>();
  let qi = 0;
  const push = (q: Omit<Question, "id">) => {
    const key = `${q.kind}:${q.refId}`;
    if (usedKey.has(key)) return false;
    usedKey.add(key);
    out.push({ ...q, id: `q${qi++}` });
    return true;
  };

  // ---- generatore per singolo kind su un'opera ----
  const genFromWork = (kind: QuizKind, w: Work): boolean => {
    switch (kind) {
      case "autore":
      case "immagine":
      case "autore-input":
      case "titolo-input":
      case "periodo-input":
      case "data-input":
      case "luogo-input": {
        if (w.artist_ids.length === 0 && (kind === "autore" || kind === "autore-input")) return false;
        // Per i tipi "aperti" NON generiamo distrattori: l'utente deve digitare
        // e selezionare la risposta dall'elenco completo del db.
        // Lasciamo options vuoto e correct=0 (placeholder), l'UI speciale in
        // Test.tsx gestisce la verifica tramite correctEntityId/Label.
        if (kind === "autore-input") {
          if (w.artist_ids.length === 0) return false;
          const artist = ix.artistById.get(w.artist_ids[0]);
          if (!artist) return false;
          if (!w.image_thumb && !w.image_url) return false;
          return push({
            kind: "autore-input",
            refId: w.id,
            refHref: `/opera/${w.id}`,
            topicPeriodId: w.period_id,
            prompt: "Di chi è quest'opera? Scrivi il nome dell'autore e selezionalo dalla lista.",
            image: w.image_thumb || w.image_url,
            options: [],
            correct: 0,
            correctArtistId: artist.id,
            correctArtistName: artist.name,
            correctEntityId: artist.id,
            correctEntityLabel: artist.name,
            correctEntityType: "artist",
            explain: `«${w.title}» è di ${artist.name} (${periodName(w.period_id)}).`,
          });
        }
        if (kind === "titolo-input") {
          if (!w.image_thumb && !w.image_url) return false;
          return push({
            kind: "titolo-input",
            refId: w.id,
            refHref: `/opera/${w.id}`,
            topicPeriodId: w.period_id,
            prompt: "Quale opera è questa? Scrivi il titolo e selezionalo dalla lista.",
            image: w.image_thumb || w.image_url,
            options: [],
            correct: 0,
            correctEntityId: w.id,
            correctEntityLabel: w.title,
            correctEntityType: "work",
            explain: `È «${w.title}» (${workYears(w)}, ${periodName(w.period_id)}).`,
          });
        }
        if (kind === "periodo-input") {
          if (!w.image_thumb && !w.image_url) return false;
          const p = ix.periodById.get(w.period_id);
          if (!p) return false;
          return push({
            kind: "periodo-input",
            refId: w.id,
            refHref: `/opera/${w.id}`,
            topicPeriodId: w.period_id,
            prompt: "A quale periodo storico appartiene quest'opera? Scrivi il nome e selezionalo dalla lista.",
            image: w.image_thumb || w.image_url,
            options: [],
            correct: 0,
            correctEntityId: p.id,
            correctEntityLabel: p.name,
            correctEntityType: "period",
            explain: `«${w.title}» appartiene al periodo: ${p.name}.`,
          });
        }
        if (kind === "data-input") {
          if (!w.image_thumb && !w.image_url) return false;
          // Per la data, l'utente deve individuare l'anno. L'autocomplete
          // propone tutti gli anni delle opere del db (così l'utente sceglie
          // un anno dall'elenco invece di digitarlo a mano — evitiamo
          // ambiguità di formato). Usiamo come risposta corretta l'anno
          // di fine (o inizio se non c'è fine).
          const year = w.year_end ?? w.year_start;
          if (year == null) return false;
          const yearStr = String(year < 0 ? `${-year} a.C.` : year);
          return push({
            kind: "data-input",
            refId: w.id,
            refHref: `/opera/${w.id}`,
            topicPeriodId: w.period_id,
            prompt: "A quando risale quest'opera? Seleziona l'anno dalla lista.",
            image: w.image_thumb || w.image_url,
            options: [],
            correct: 0,
            // Per le date usiamo come id la stringa stessa (non c'è un'entità nel db)
            correctEntityId: yearStr,
            correctEntityLabel: yearStr,
            correctEntityType: "city", // placeholder: il rendering usa l'autocomplete "anno" dedicato
            explain: `«${w.title}» è databile: ${w.date_text || yearStr} (${periodName(w.period_id)}).`,
          });
        }
        if (kind === "luogo-input") {
          if (!w.location_city) return false;
          if (!w.image_thumb && !w.image_url) return false;
          return push({
            kind: "luogo-input",
            refId: w.id,
            refHref: `/opera/${w.id}`,
            topicPeriodId: w.period_id,
            prompt: "In quale città si trova quest'opera? Scrivi il nome e selezionalo dalla lista.",
            image: w.image_thumb || w.image_url,
            options: [],
            correct: 0,
            correctEntityId: w.location_city,
            correctEntityLabel: w.location_city,
            correctEntityType: "city",
            explain: `«${w.title}» si trova a ${w.location_city}${w.location_place ? ` (${w.location_place})` : ""}.`,
          });
        }
        // Caso "autore" (scelta multipla) e "immagine" (scelta multipla)
        const artist = ix.artistById.get(w.artist_ids[0]);
        if (!artist) return false;
        const sameP = namedArtists.filter((a) => a.id !== artist.id && a.period_ids.includes(w.period_id)).map((a) => a.name);
        const distr = uniqOptions(artist.name, [sameP, namedArtists.map((a) => a.name)], rng);
        const b = build(artist.name, distr, rng);
        if (!b) return false;
        if (kind === "immagine") {
          if (!w.image_thumb && !w.image_url) return false;
          return push({ kind: "immagine", refId: w.id, refHref: `/opera/${w.id}`, topicPeriodId: w.period_id,
            prompt: "Di chi è quest'opera?", image: w.image_thumb || w.image_url, ...b,
            explain: `«${w.title}» è di ${artist.name} (${periodName(w.period_id)}).` });
        }
        return push({ kind: "autore", refId: w.id, refHref: `/opera/${w.id}`, topicPeriodId: w.period_id,
          prompt: `Chi è l'autore di «${w.title}»?`, ...b,
          explain: `«${w.title}» (${workYears(w)}) è opera di ${artist.name}.` });
      }
      case "periodo": {
        const correct = periodName(w.period_id);
        const wm = (w.year_end ?? w.year_start ?? 0);
        const near = ds.periods.filter((p) => p.id !== w.period_id)
          .sort((a, b2) => Math.abs((a.year_start + a.year_end) / 2 - wm) - Math.abs((b2.year_start + b2.year_end) / 2 - wm))
          .slice(0, 8).map((p) => p.name);
        const b = build(correct, uniqOptions(correct, [near, allPeriodNames], rng), rng);
        if (!b) return false;
        return push({ kind: "periodo", refId: w.id, refHref: `/opera/${w.id}`, topicPeriodId: w.period_id,
          prompt: `A quale periodo appartiene «${w.title}»?`, image: w.image_thumb || w.image_url || undefined, ...b,
          explain: `«${w.title}» appartiene a: ${correct}.` });
      }
      case "tecnica": {
        if (w.technique_ids.length === 0) return false;
        const tech = ix.techById.get(w.technique_ids[0]);
        if (!tech) return false;
        const sp = samePeriodWorks(w).flatMap((x) => x.technique_ids).map((id) => ix.techById.get(id)?.name).filter(Boolean) as string[];
        const b = build(tech.name, uniqOptions(tech.name, [sp, allTechNames], rng), rng);
        if (!b) return false;
        return push({ kind: "tecnica", refId: w.id, refHref: `/opera/${w.id}`, topicPeriodId: w.period_id,
          prompt: `Quale tecnica caratterizza «${w.title}»?`, image: w.image_thumb || w.image_url || undefined, ...b,
          explain: `«${w.title}» è realizzata con: ${tech.name}.` });
      }
      case "datazione": {
        const wy = w.year_end ?? w.year_start;
        if (wy == null) return false;
        const correct = w.date_text || String(wy);
        const sp = samePeriodWorks(w).map((x) => x.date_text || (x.year_end ?? x.year_start)?.toString()).filter((d): d is string => !!d && d !== correct);
        const b = build(correct, uniqOptions(correct, [sp], rng), rng);
        if (!b) return false;
        return push({ kind: "datazione", refId: w.id, refHref: `/opera/${w.id}`, topicPeriodId: w.period_id,
          prompt: `Quando è databile «${w.title}»?`, image: w.image_thumb || w.image_url || undefined, ...b,
          explain: `«${w.title}» è databile: ${correct} (${periodName(w.period_id)}).` });
      }
      case "secolo": {
        const wy = w.year_end ?? w.year_start;
        if (wy == null || wy <= 0) return false;
        const correct = century(wy);
        const distractPool = [century(wy - 100), century(wy + 100), century(wy - 200), century(wy + 200), decade(wy)].filter((d) => d !== correct);
        const b = build(correct, uniqOptions(correct, [distractPool], rng), rng);
        if (!b) return false;
        return push({ kind: "secolo", refId: w.id, refHref: `/opera/${w.id}`, topicPeriodId: w.period_id,
          prompt: `In quale secolo si colloca «${w.title}»?`, image: w.image_thumb || w.image_url || undefined, ...b,
          explain: `«${w.title}» (${workYears(w)}) si colloca nel ${correct}.` });
      }
      case "citta": {
        if (!w.location_city) return false;
        const correct = w.location_city;
        const sp = samePeriodWorks(w).map((x) => x.location_city).filter((c): c is string => !!c && c !== correct);
        const b = build(correct, uniqOptions(correct, [sp, allCities], rng), rng);
        if (!b) return false;
        return push({ kind: "citta", refId: w.id, refHref: `/opera/${w.id}`, topicPeriodId: w.period_id,
          prompt: `In quale città si trova «${w.title}»?`, image: w.image_thumb || w.image_url || undefined, ...b,
          explain: `«${w.title}» si trova a ${correct}${w.location_place ? ` (${w.location_place})` : ""}.` });
      }
      case "opera-luogo": {
        if (!w.location_city) return false;
        const correct = w.title;
        // distrattori: opere in ALTRE città (preferibilmente dello stesso periodo)
        const elsewhere = (x: Work) => !!x.location_city && x.location_city !== w.location_city;
        const sp = samePeriodWorks(w).filter(elsewhere).map((x) => x.title);
        const all = ds.works.filter((x) => x.id !== w.id && elsewhere(x)).map((x) => x.title);
        const b = build(correct, uniqOptions(correct, [sp, all], rng), rng);
        if (!b) return false;
        return push({ kind: "opera-luogo", refId: w.id, refHref: `/opera/${w.id}`, topicPeriodId: w.period_id,
          prompt: `Quale di queste opere si trova a ${w.location_city}?`, ...b,
          explain: `«${w.title}» si trova a ${w.location_city}${w.location_place ? ` (${w.location_place})` : ""}.` });
      }
    }
    return false;
  };

  // ---- generatore per artista ----
  const genFromArtist = (kind: QuizKind, a: Artist): boolean => {
    if (kind === "artista-periodo") {
      if (a.period_ids.length === 0) return false;
      const correct = periodName(a.period_ids[0]);
      const b = build(correct, uniqOptions(correct, [allPeriodNames], rng), rng);
      if (!b) return false;
      return push({ kind: "artista-periodo", refId: a.id, refHref: `/artista/${a.id}`, topicPeriodId: a.period_ids[0],
        prompt: `A quale periodo è associato ${a.name}?`, ...b,
        explain: `${a.name} (${a.role}) è associato a: ${correct}.` });
    }
    if (kind === "artista-opera") {
      const works = worksOfArtist(a);
      if (works.length === 0) return false;
      const correct = works[0].title;
      // distrattori: opere di altri artisti dello stesso periodo
      const otherWorks = ds.works.filter((w) => w.period_id === (a.period_ids[0] ?? "") && !w.artist_ids.includes(a.id) && w.importance >= 2).map((w) => w.title);
      const b = build(correct, uniqOptions(correct, [otherWorks, ds.works.map((w) => w.title)], rng), rng);
      if (!b) return false;
      return push({ kind: "artista-opera", refId: a.id, refHref: `/artista/${a.id}`, topicPeriodId: a.period_ids[0],
        prompt: `Quale di queste opere è di ${a.name}?`, ...b,
        explain: `${a.name} è autore di «${correct}».` });
    }
    return false;
  };

  // ---- liste mescolate (rispettano il filtro periodo/yearRange, se attivi) ----
  const works = shuffle(workPool, rng);
  const artists = shuffle(namedArtists, rng);
  const techs = shuffle(ds.techniques.filter((t) =>
    t.definition &&
    (!periodOk || (t.first_period_id && periodOk.has(t.first_period_id))) &&
    (!yr || (t.first_period_id && (() => { const p = ix.periodById.get(t.first_period_id!); return p ? yearInRange(p.year_start, p.year_end) : true; })()))
  ), rng);
  const terms = shuffle(ds.terms.filter((t) =>
    t.definition &&
    (!periodOk || t.period_ids.some((pid) => periodOk.has(pid))) &&
    (!yr || t.period_ids.some((pid) => { const p = ix.periodById.get(pid); return p ? yearInRange(p.year_start, p.year_end) : true; }))
  ), rng);
  const periods = shuffle(ds.periods.filter((p) => (!periodOk || periodOk.has(p.id)) && (!yr || yearInRange(p.year_start, p.year_end))), rng);
  const events = shuffle(ds.events.filter((e) => (!periodOk || (e.period_id && periodOk.has(e.period_id))) && (!yr || yearInRange(e.year, e.year_end))), rng);

  // pointer per ciascun "produttore"
  const ptr: Record<string, number> = {};
  const nextOf = <T,>(arr: T[], key: string): T | undefined => {
    ptr[key] ??= 0;
    return arr[ptr[key]++];
  };

  // produttore per kind: ritorna true se ha aggiunto una domanda
  const produce = (kind: QuizKind): boolean => {
    let guard = 0;
    switch (kind) {
      case "autore": case "autore-input": case "titolo-input": case "periodo-input": case "data-input": case "luogo-input": case "immagine": case "periodo": case "tecnica":
      case "datazione": case "secolo": case "citta": case "opera-luogo": {
        while (guard++ < 60) { const w = nextOf(works, "w_" + kind); if (!w) return false; if (genFromWork(kind, w)) return true; }
        return false;
      }
      case "artista-periodo": case "artista-opera": {
        while (guard++ < 60) { const a = nextOf(artists, "a_" + kind); if (!a) return false; if (genFromArtist(kind, a)) return true; }
        return false;
      }
      case "tecnica-def": {
        while (guard++ < 60) {
          const t = nextOf(techs, "td"); if (!t) return false;
          const sameCat = ds.techniques.filter((x) => x.id !== t.id && x.category === t.category && x.definition).map((x) => truncDef(x.definition));
          const b = build(truncDef(t.definition), uniqOptions(truncDef(t.definition), [sameCat, ds.techniques.map((x) => truncDef(x.definition))], rng), rng);
          if (!b) continue;
          return push({ kind, refId: t.id, refHref: `/tecniche?t=${t.id}`, topicPeriodId: t.first_period_id ?? undefined,
            prompt: `Qual è la definizione corretta di «${t.name}»?`, ...b, explain: `${t.name}: ${truncDef(t.definition, 160)}` });
        }
        return false;
      }
      case "def-tecnica": {
        while (guard++ < 60) {
          const t = nextOf(techs, "dt"); if (!t) return false;
          const sameCat = ds.techniques.filter((x) => x.id !== t.id && x.category === t.category).map((x) => x.name);
          const b = build(t.name, uniqOptions(t.name, [sameCat, allTechNames], rng), rng);
          if (!b) continue;
          return push({ kind, refId: t.id, refHref: `/tecniche?t=${t.id}`, topicPeriodId: t.first_period_id ?? undefined,
            prompt: `A quale tecnica si riferisce questa definizione? «${truncDef(t.definition, 140)}»`, ...b, explain: `È la definizione di ${t.name}.` });
        }
        return false;
      }
      case "termine-def": {
        while (guard++ < 60) {
          const t = nextOf(terms, "te"); if (!t) return false;
          const sameCat = ds.terms.filter((x) => x.id !== t.id && x.category === t.category && x.definition).map((x) => truncDef(x.definition));
          const b = build(truncDef(t.definition), uniqOptions(truncDef(t.definition), [sameCat, ds.terms.map((x) => truncDef(x.definition))], rng), rng);
          if (!b) continue;
          return push({ kind, refId: t.id, refHref: `/glossario?t=${t.id}`, topicPeriodId: t.period_ids[0],
            prompt: `Qual è la definizione di «${t.term}»?`, ...b, explain: `${t.term}: ${truncDef(t.definition, 160)}` });
        }
        return false;
      }
      case "def-termine": {
        while (guard++ < 60) {
          const t = nextOf(terms, "dte"); if (!t) return false;
          const sameCat = ds.terms.filter((x) => x.id !== t.id && x.category === t.category).map((x) => x.term);
          const b = build(t.term, uniqOptions(t.term, [sameCat, allTermNames], rng), rng);
          if (!b) continue;
          return push({ kind, refId: t.id, refHref: `/glossario?t=${t.id}`, topicPeriodId: t.period_ids[0],
            prompt: `Quale termine corrisponde a questa definizione? «${truncDef(t.definition, 140)}»`, ...b, explain: `È la definizione di «${t.term}».` });
        }
        return false;
      }
      case "periodo-secolo": {
        while (guard++ < 60) {
          const p = nextOf(periods, "ps"); if (!p) return false;
          if (p.year_start <= 0) continue;
          const correct = century(p.year_start);
          const distract = [century(p.year_start - 100), century(p.year_start + 100), century(p.year_end), century(p.year_start - 200)].filter((d) => d !== correct);
          const b = build(correct, uniqOptions(correct, [distract], rng), rng);
          if (!b) continue;
          return push({ kind, refId: p.id, refHref: `/periodo/${p.id}`, topicPeriodId: p.id,
            prompt: `In quale secolo inizia il periodo «${p.name}»?`, ...b, explain: `«${p.name}» inizia nel ${correct} (${p.year_start}).` });
        }
        return false;
      }
      case "periodo-regione": {
        while (guard++ < 60) {
          const p = nextOf(periods, "pr"); if (!p) return false;
          if (p.regions.length === 0) continue;
          const correct = p.regions[0];
          const others = allRegions.filter((r) => !p.regions.includes(r));
          const b = build(correct, uniqOptions(correct, [others], rng), rng);
          if (!b) continue;
          return push({ kind, refId: p.id, refHref: `/periodo/${p.id}`, topicPeriodId: p.id,
            prompt: `Quale area geografica è centrale per «${p.name}»?`, ...b, explain: `«${p.name}» riguarda soprattutto quest'area: ${p.regions.join(", ")}.` });
        }
        return false;
      }
      case "evento-da-anno": {
        while (guard++ < 60) {
          const e = nextOf(events, "eda"); if (!e) return false;
          const correct = e.title;
          // distrattori: altri eventi, prima quelli vicini nel tempo
          const near = ds.events.filter((x) => x.id !== e.id && Math.abs(x.year - e.year) <= 120 && x.title !== correct).map((x) => x.title);
          const all = ds.events.filter((x) => x.id !== e.id).map((x) => x.title);
          const b = build(correct, uniqOptions(correct, [near, all], rng), rng);
          if (!b) continue;
          return push({ kind, refId: e.id, refHref: `/timeline`, topicPeriodId: e.period_id ?? undefined,
            prompt: `Quale di questi avvenimenti risale al ${e.year}?`, ...b,
            explain: `${e.year}: ${e.title}. ${truncDef(e.description, 120)}` });
        }
        return false;
      }
      case "connessione": {
        // col filtro periodo attivo, tieni solo i legami con almeno un estremo nel periodo
        const inPeriod = (type: string, id: string): boolean => {
          if (!periodOk) return true;
          switch (type) {
            case "period": return periodOk.has(id);
            case "work": { const w = ix.workById.get(id); return !!w && periodOk.has(w.period_id); }
            case "artist": { const a = ix.artistById.get(id); return !!a && a.period_ids.some((p) => periodOk.has(p)); }
            case "technique": { const t = ix.techById.get(id); return !!t && !!t.first_period_id && periodOk.has(t.first_period_id); }
            case "term": { const t = ix.termById.get(id); return !!t && t.period_ids.some((p) => periodOk.has(p)); }
            case "event": { const e = ix.eventById.get(id); return !!e && !!e.period_id && periodOk.has(e.period_id); }
          }
          return false;
        };
        const conns = shuffle(ds.connections.filter((c) => !periodOk || inPeriod(c.source_type, c.source_id) || inPeriod(c.target_type, c.target_id)), rng);
        while (guard++ < 80) {
          const c = nextOf(conns, "cn"); if (!c) return false;
          const sLabel = labelOf(ix, c.source_type, c.source_id);
          const tLabel = labelOf(ix, c.target_type, c.target_id);
          if (!sLabel || !tLabel) continue;
          const correct = KIND_IT[c.kind] ?? c.kind;
          const others = Object.values(KIND_IT).filter((k) => k !== correct);
          const b = build(correct, uniqOptions(correct, [others], rng), rng);
          if (!b) continue;
          return push({ kind, refId: c.id, topicPeriodId: undefined,
            prompt: `Che tipo di legame intercorre tra «${sLabel}» e «${tLabel}»?`, ...b,
            explain: `Legame di tipo «${correct}»: ${truncDef(c.description, 150)}` });
        }
        return false;
      }
      case "evento-anno": {
        while (guard++ < 60) {
          const e = nextOf(events, "ev"); if (!e) return false;
          const correct = String(e.year);
          const distract = [e.year - 30, e.year + 30, e.year - 80, e.year + 60, e.year - 150].filter((y) => y !== e.year).map(String);
          const b = build(correct, uniqOptions(correct, [distract], rng), rng);
          if (!b) continue;
          return push({ kind, refId: e.id, refHref: `/timeline`, topicPeriodId: e.period_id ?? undefined,
            prompt: `In che anno: «${e.title}»?`, ...b, explain: `${e.title}: ${e.year}. ${truncDef(e.description, 120)}` });
        }
        return false;
      }
    }
    return false;
  };

  // ---- MODALITÀ RIPASSO: genera solo dagli item indicati ----
  if (opts.refIds && opts.refIds.length) {
    for (const { kind, refId } of opts.refIds) {
      if (out.length >= opts.count) break;
      // riposiziona i puntatori per generare quella specifica entità
      const w = ds.works.find((x) => x.id === refId);
      if (w && genFromWork(kind, w)) continue;
      const a = ds.artists.find((x) => x.id === refId);
      if (a && genFromArtist(kind, a)) continue;
      // tecniche/termini/periodi/eventi/connessioni: rigenera ad hoc
      regenSpecific(ix, kind, refId, rng, push, { allTechNames, allTermNames, allRegions, truncDef });
    }
    return out;
  }

  // ---- MIX bilanciato tra i kind selezionati (round-robin) ----
  let kinds = opts.kinds.length ? opts.kinds : ALL_KINDS;
  // con «solo preferiti» restano solo i tipi legati a opere/artisti
  if (fav) kinds = kinds.filter((k) => FAV_KINDS.includes(k));
  if (kinds.length === 0) return [];
  let exhausted = 0;
  let ki = 0;
  while (out.length < opts.count && exhausted < kinds.length) {
    const kind = kinds[ki % kinds.length];
    ki++;
    if (produce(kind)) exhausted = 0; else exhausted++;
    if (ki > kinds.length * 200) break;
  }
  return shuffle(out, rng).slice(0, opts.count);
}

// helper: etichetta di un'entità per le domande "connessione"
function labelOf(ix: Indexed, type: string, id: string): string | null {
  switch (type) {
    case "period": return ix.periodById.get(id)?.name ?? null;
    case "artist": return ix.artistById.get(id)?.name ?? null;
    case "work": return ix.workById.get(id)?.title ?? null;
    case "technique": return ix.techById.get(id)?.name ?? null;
    case "term": return ix.termById.get(id)?.term ?? null;
    case "event": return ix.eventById.get(id)?.title ?? null;
  }
  return null;
}

const KIND_IT: Record<string, string> = {
  influenza: "influenza", contaminazione: "contaminazione",
  rielaborazione: "rielaborazione", evoluzione: "evoluzione",
  contrasto: "contrasto", committenza: "committenza", "maestro-allievo": "maestro-allievo",
};

// rigenera una domanda specifica per ripasso (tecnica/termine/periodo/evento/connessione)
function regenSpecific(
  ix: Indexed, kind: QuizKind, refId: string, rng: () => number,
  push: (q: Omit<Question, "id">) => boolean,
  ctx: { allTechNames: string[]; allTermNames: string[]; allRegions: string[]; truncDef: (s: string, n?: number) => string }
) {
  const ds = ix.ds;
  const { truncDef } = ctx;
  const mk = (correct: string, pool: string[][]) => build(correct, uniqOptions(correct, pool, rng), rng);

  if (kind === "tecnica-def" || kind === "def-tecnica") {
    const t = ix.techById.get(refId); if (!t || !t.definition) return;
    if (kind === "tecnica-def") {
      const b = mk(truncDef(t.definition), [ds.techniques.filter((x) => x.id !== t.id).map((x) => truncDef(x.definition))]);
      if (b) push({ kind, refId: t.id, refHref: `/tecniche?t=${t.id}`, prompt: `Qual è la definizione corretta di «${t.name}»?`, ...b, explain: `${t.name}: ${truncDef(t.definition, 160)}` });
    } else {
      const b = mk(t.name, [ctx.allTechNames]);
      if (b) push({ kind, refId: t.id, refHref: `/tecniche?t=${t.id}`, prompt: `A quale tecnica si riferisce questa definizione? «${truncDef(t.definition, 140)}»`, ...b, explain: `È la definizione di ${t.name}.` });
    }
  } else if (kind === "termine-def" || kind === "def-termine") {
    const t = ix.termById.get(refId); if (!t || !t.definition) return;
    if (kind === "termine-def") {
      const b = mk(truncDef(t.definition), [ds.terms.filter((x) => x.id !== t.id).map((x) => truncDef(x.definition))]);
      if (b) push({ kind, refId: t.id, refHref: `/glossario?t=${t.id}`, prompt: `Qual è la definizione di «${t.term}»?`, ...b, explain: `${t.term}: ${truncDef(t.definition, 160)}` });
    } else {
      const b = mk(t.term, [ctx.allTermNames]);
      if (b) push({ kind, refId: t.id, refHref: `/glossario?t=${t.id}`, prompt: `Quale termine corrisponde a questa definizione? «${truncDef(t.definition, 140)}»`, ...b, explain: `È la definizione di «${t.term}».` });
    }
  } else if (kind === "periodo-secolo" || kind === "periodo-regione") {
    const p = ix.periodById.get(refId); if (!p) return;
    if (kind === "periodo-secolo" && p.year_start > 0) {
      const correct = century(p.year_start);
      const b = mk(correct, [[century(p.year_start - 100), century(p.year_start + 100), century(p.year_end), century(p.year_start - 200)].filter((d) => d !== correct)]);
      if (b) push({ kind, refId: p.id, refHref: `/periodo/${p.id}`, prompt: `In quale secolo inizia il periodo «${p.name}»?`, ...b, explain: `«${p.name}» inizia nel ${correct} (${p.year_start}).` });
    } else if (kind === "periodo-regione" && p.regions.length) {
      const correct = p.regions[0];
      const b = mk(correct, [ctx.allRegions.filter((r) => !p.regions.includes(r))]);
      if (b) push({ kind, refId: p.id, refHref: `/periodo/${p.id}`, prompt: `Quale area geografica è centrale per «${p.name}»?`, ...b, explain: `«${p.name}» riguarda soprattutto quest'area: ${p.regions.join(", ")}.` });
    }
  } else if (kind === "evento-anno") {
    const e = ix.eventById.get(refId); if (!e) return;
    const correct = String(e.year);
    const b = mk(correct, [[e.year - 30, e.year + 30, e.year - 80, e.year + 60].map(String).filter((y) => y !== correct)]);
    if (b) push({ kind, refId: e.id, refHref: `/timeline`, prompt: `In che anno: «${e.title}»?`, ...b, explain: `${e.title}: ${e.year}.` });
  } else if (kind === "evento-da-anno") {
    const e = ix.eventById.get(refId); if (!e) return;
    const correct = e.title;
    const b = mk(correct, [ds.events.filter((x) => x.id !== e.id).map((x) => x.title)]);
    if (b) push({ kind, refId: e.id, refHref: `/timeline`, prompt: `Quale di questi avvenimenti risale al ${e.year}?`, ...b, explain: `${e.year}: ${e.title}.` });
  } else if (kind === "connessione") {
    const c = ds.connections.find((x) => x.id === refId); if (!c) return;
    const sLabel = labelOf(ix, c.source_type, c.source_id);
    const tLabel = labelOf(ix, c.target_type, c.target_id);
    if (!sLabel || !tLabel) return;
    const correct = KIND_IT[c.kind] ?? c.kind;
    const b = mk(correct, [Object.values(KIND_IT).filter((k) => k !== correct)]);
    if (b) push({ kind, refId: c.id, prompt: `Che tipo di legame intercorre tra «${sLabel}» e «${tLabel}»?`, ...b, explain: `Legame di tipo «${correct}».` });
  }
}
