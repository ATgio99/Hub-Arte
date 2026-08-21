// Tipi del knowledge graph — Atlante di Storia dell'Arte
// Riflettono SCHEMA.md. Questi tipi sono condivisi da tutta l'app e
// rappresentano il contratto dati anche per una futura migrazione a Supabase.

export type PeriodType = "epoca" | "corrente" | "popolo";
export type WorkType =
  | "architettura" | "pittura" | "scultura" | "mosaico"
  | "miniatura" | "oreficeria" | "urbanistica" | "altro";
export type ConnKind =
  | "influenza" | "contaminazione" | "rielaborazione" | "evoluzione"
  | "contrasto" | "committenza" | "maestro-allievo";
export type EntityType = "period" | "artist" | "work" | "technique" | "event" | "term";
export type TechCategory = "pittorica" | "scultorea" | "architettonica" | "musiva" | "altra";
export type TermCategory = "architettura" | "pittura" | "scultura" | "iconografia" | "generale";

export interface Period {
  id: string; name: string; type: PeriodType;
  year_start: number; year_end: number;
  regions: string[]; summary: string; historical_context: string;
  parent_id: string | null; key_innovations: string[];
}

export interface Artist {
  id: string; name: string; aka: string[];
  birth: number | null; death: number | null;
  period_ids: string[]; role: string; bio: string; innovations: string[];
}

export interface Work {
  id: string; title: string; artist_ids: string[]; period_id: string;
  date_text: string; year_start: number | null; year_end: number | null;
  type: WorkType; technique_ids: string[]; materials: string[];
  location_city: string | null; location_place: string | null;
  lat: number | null; lon: number | null;
  book: 1 | 2; chapter: number; page: number; source_file: string;
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
  connections: Connection[]; events: ArtEvent[];
}
