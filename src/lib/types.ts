// Tipi del knowledge graph — Atlante di Storia dell'Arte
// Riflettono SCHEMA.md. Questi tipi sono condivisi da tutta l'app e
// rappresentano il contratto dati anche per una futura migrazione a Supabase.

// I tre livelli della timeline, dal piu' ampio al piu' specifico:
//   epoca    — la fascia maggiore (Romanico, Gotico, Rinascimento)
//   corrente — un movimento o una fase dentro un'epoca (Tardogotico, Manierismo)
//   scuola   — un raggruppamento locale o di bottega (Scuola ferrarese, Periodo sforzesco)
export type PeriodType = "epoca" | "corrente" | "scuola";
export type WorkType =
  | "architettura" | "pittura" | "scultura" | "mosaico"
  | "miniatura" | "oreficeria" | "urbanistica" | "altro";
export type ConnKind =
  | "influenza" | "contaminazione" | "rielaborazione" | "evoluzione"
  | "contrasto" | "committenza" | "maestro-allievo" | "collaborazione"
  // Pseudo-tipi: il Grafo li genera da artist_ids e da location_city quando non
  // esiste gia' una connessione esplicita fra le due entita'. Possono pero'
  // essere anche salvati nel DB con una descrizione piu' ricca di quella
  // generata: in quel caso il Grafo usa la versione salvata (vedi Grafo.tsx).
  | "autore" | "luogo";
export type EntityType = "period" | "artist" | "work" | "technique" | "event" | "term";
export type TechCategory =
  | "pittorica" | "scultorea" | "architettonica" | "musiva"
  | "compositiva" | "decorativa" | "altra";
export type TermCategory = "architettura" | "pittura" | "scultura" | "iconografia" | "generale";

export interface Period {
  id: string; name: string; type: PeriodType;
  year_start: number; year_end: number;
  regions: string[]; summary: string; historical_context: string;
  parent_id: string | null; key_innovations: string[];
}

export type ArtistCategory =
  | "pittori" | "scultori" | "architetti" | "orafi-bronzisti"
  | "miniatori" | "committenti" | "altro";

// Gli autori e i committenti condividono questa scheda: li distingue
// `category` ("committenti" per i mecenati). Cio' che NON va mai confuso e' il
// collegamento all'opera — vedi Work.artist_ids e Work.committente_ids.
export interface Artist {
  id: string; name: string; aka: string[];
  birth: number | null; death: number | null;
  period_ids: string[]; role: string; bio: string; innovations: string[];
  category?: ArtistCategory | null;
  // Casate, corti e istituzioni (Casa Medici, Senato veneziano): non persone.
  is_collective?: boolean;
  // Sede del committente, usata dalla mappa in modalita' committenti.
  location_city?: string | null;
}

export interface Work {
  // artist_ids = chi l'ha eseguita; committente_ids = chi l'ha voluta.
  // I due elenchi non si mescolano mai: un committente non entra in artist_ids.
  id: string; title: string; artist_ids: string[]; committente_ids?: string[]; period_id: string;
  date_text: string; year_start: number | null; year_end: number | null;
  type: WorkType; technique_ids: string[]; materials: string[];
  location_city: string | null; location_place: string | null;
  lat: number | null; lon: number | null;
  // `book` e' il numero della fonte da cui viene la scheda: vedi lib/fonti.ts.
  // Non e' il numero del volume, ed era dichiarato 1|2 mentre nei dati c'e'
  // anche un 8 — ventisei opere che il tipo diceva impossibili.
  book: number; chapter: number; page: number; source_file: string;
  /** I libri da cui viene la scheda. Elenco, come `artist_ids`: la stessa
   *  opera puo' comparire in piu' manuali. Ha preso il posto di `importance`. */
  fonte_ids: string[];
  importance: 1 | 2 | 3; summary: string; analysis: string | null;
  innovations: string[]; term_ids: string[];
  image_url?: string; image_thumb?: string; image_source?: string;
  image_gallery?: string[];
}

export interface Technique {
  id: string; name: string; definition: string;
  introduced_by: string | null; first_period_id: string | null;
  evolution: string; category: TechCategory;
}

export interface Term {
  id: string; term: string; definition: string;
  category: TermCategory; period_ids: string[]; is_archetype: boolean;
}

export interface Connection {
  id: string; source_type: EntityType; source_id: string;
  target_type: EntityType; target_id: string;
  kind: ConnKind; description: string;
  sort_order?: number; // opzionale, per riordino gerarchico (default 0)
}

export interface ArtEvent {
  id: string; year: number; year_end: number | null;
  title: string; description: string;
  kind: "politico" | "religioso" | "culturale" | "tecnologico";
  period_id: string | null;
}

export interface Dataset {
  periods: Period[]; artists: Artist[]; works: Work[];
  techniques: Technique[]; terms: Term[];
  connections: Connection[]; events: ArtEvent[]; fonti: Fonte[];
  incertezze: Incertezza[];
}

/** Un'attribuzione che resta aperta.
 *
 *  Non un campo vuoto ma una dichiarazione: «non si sa chi l'ha voluta, e
 *  questa e' la ragione». `id` e' l'id dell'opera — una scheda, un'incertezza.
 */
export interface Incertezza {
  id: string;
  /** Su che cosa: committenza, attribuzione, datazione… */
  tema: string;
  nota: string;
  fonte: string | null;
}

/** Un libro da cui vengono delle schede.
 *
 *  E' una tabella e non un testo libero perche' il titolo di un manuale
 *  scritto a mano cinquanta volte diventa cinquanta titoli leggermente
 *  diversi, e una bibliografia con cinquanta voci per due libri non e' una
 *  bibliografia. */
export interface Fonte {
  id: string;
  /** Il numero con cui compare in bibliografia e nei pallini sulle schede.
   *  E' un dato e non l'ordine di una query: se cambiasse a ogni caricamento,
   *  il rimando non varrebbe niente. */
  numero: number | null;
  titolo: string;
  autori: string | null;
  editore: string | null;
  anno: number | null;
  volume: string | null;
  note: string | null;
}
