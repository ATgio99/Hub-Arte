// ============================================================================
// lastVisited — memoria dell'ultima opera/artista visitati.
// Quando l'utente naviga in altre sezioni del sito e poi torna su "Opere"
// o "Artisti" dal menu, viene riportato all'ultima opera/artista aperta.
// Se clicca di nuovo la stessa voce di menu, torna alla home di quella sezione.
// ============================================================================

import type { Question } from "./quiz";

const LAST_OPERA_KEY = "atlante:last-opera";
const LAST_ARTISTA_KEY = "atlante:last-artista";
const LAST_RETE_KEY = "atlante:last-rete";
const LAST_MAPPA_KEY = "atlante:last-mappa";
const LAST_TIMELINE_KEY = "atlante:last-timeline";
const LAST_OPERE_SEARCH_KEY = "atlante:last-opere-search";
const LAST_ARTISTI_SEARCH_KEY = "atlante:last-artisti-search";
const LAST_TEST_KEY = "atlante:last-test";

// --- Ultima opera visitata ---
export function getLastOpera(): string | null {
  try { return localStorage.getItem(LAST_OPERA_KEY); } catch { return null; }
}

export function setLastOpera(operaId: string): void {
  try { localStorage.setItem(LAST_OPERA_KEY, operaId); } catch { /* ignore */ }
}

export function clearLastOpera(): void {
  try { localStorage.removeItem(LAST_OPERA_KEY); } catch { /* ignore */ }
}

// --- Ultimo artista visitato ---
export function getLastArtista(): string | null {
  try { return localStorage.getItem(LAST_ARTISTA_KEY); } catch { return null; }
}

export function setLastArtista(artistaId: string): void {
  try { localStorage.setItem(LAST_ARTISTA_KEY, artistaId); } catch { /* ignore */ }
}

export function clearLastArtista(): void {
  try { localStorage.removeItem(LAST_ARTISTA_KEY); } catch { /* ignore */ }
}

// --- Ricerca Opere (salva i filtri + search text) ---
export interface OpereSearchState {
  search: string;
  type: string;
  period: string;
  relief: string;
  showFavorites: boolean;
}

export function getLastOpereSearch(): OpereSearchState | null {
  try {
    const raw = localStorage.getItem(LAST_OPERE_SEARCH_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function setLastOpereSearch(state: OpereSearchState): void {
  try { localStorage.setItem(LAST_OPERE_SEARCH_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export function clearLastOpereSearch(): void {
  try { localStorage.removeItem(LAST_OPERE_SEARCH_KEY); } catch { /* ignore */ }
}

// --- Ricerca Artisti ---
export interface ArtistiSearchState {
  search: string;
}

export function getLastArtistiSearch(): ArtistiSearchState | null {
  try {
    const raw = localStorage.getItem(LAST_ARTISTI_SEARCH_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function setLastArtistiSearch(state: ArtistiSearchState): void {
  try { localStorage.setItem(LAST_ARTISTI_SEARCH_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export function clearLastArtistiSearch(): void {
  try { localStorage.removeItem(LAST_ARTISTI_SEARCH_KEY); } catch { /* ignore */ }
}

// --- Ultima ricerca nel grafo Rete ---
// Salviamo il focusNode (formato "type:id"), il searchQuery testuale, i filtri
// attivi (tipi/legami nascosti), il nodo selezionato e la posizione della
// camera (zoom/pan/rotazione). All'apertura della pagina Rete, questi valori
// vengono ripristinati così l'utente ritrova la sua ultima sessione.
// Doppio click su "Rete" nel menu cancella tutto.
export interface CameraState {
  // 3D: posizione camera (x,y,z). 2D: x,y sono il centro, z è lo zoom.
  x?: number;
  y?: number;
  z?: number;
}

export interface ReteSearchState {
  focusNode: string | null;
  searchQuery: string;
  // Filtri attivi (tipi e legami nascosti) — arrays perché Set non è serializzabile.
  hideTypes?: string[];
  hideKinds?: string[];
  // Nodo selezionato (click su sfera) — formato "type:id", ripristinato come
  // selezione attiva al ritorno nella pagina Rete.
  selId?: string | null;
  // Posizione camera salvata all'uscita dalla pagina.
  camera?: CameraState | null;
}

export function getLastRete(): ReteSearchState | null {
  try {
    const raw = localStorage.getItem(LAST_RETE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || (typeof parsed !== "object")) return null;
    return {
      focusNode: typeof parsed.focusNode === "string" ? parsed.focusNode : null,
      searchQuery: typeof parsed.searchQuery === "string" ? parsed.searchQuery : "",
      hideTypes: Array.isArray(parsed.hideTypes) ? parsed.hideTypes : [],
      hideKinds: Array.isArray(parsed.hideKinds) ? parsed.hideKinds : [],
      selId: typeof parsed.selId === "string" ? parsed.selId : null,
      camera: (parsed.camera && typeof parsed.camera === "object") ? parsed.camera : null,
    };
  } catch { return null; }
}

export function setLastRete(state: ReteSearchState): void {
  try { localStorage.setItem(LAST_RETE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export function clearLastRete(): void {
  try { localStorage.removeItem(LAST_RETE_KEY); } catch { /* ignore */ }
}

// --- Ultima città aperta dalla Mappa ---
// Salviamo il nome della città. Quando l'utente clicca "Mappa" nel menu,
// se c'è una città salvata andiamo alla scheda del luogo; doppio click resetta.
export function getLastMappa(): string | null {
  try { return localStorage.getItem(LAST_MAPPA_KEY); } catch { return null; }
}

export function setLastMappa(city: string): void {
  try { localStorage.setItem(LAST_MAPPA_KEY, city); } catch { /* ignore */ }
}

export function clearLastMappa(): void {
  try { localStorage.removeItem(LAST_MAPPA_KEY); } catch { /* ignore */ }
}

// --- Ultimo periodo aperto dalla Linea del tempo ---
// Salviamo l'ID del periodo. Quando l'utente clicca "Linea del tempo" nel menu,
// se c'è un periodo salvato andiamo alla sua scheda; doppio click resetta.
export function getLastTimeline(): string | null {
  try { return localStorage.getItem(LAST_TIMELINE_KEY); } catch { return null; }
}

export function setLastTimeline(periodId: string): void {
  try { localStorage.setItem(LAST_TIMELINE_KEY, periodId); } catch { /* ignore */ }
}

export function clearLastTimeline(): void {
  try { localStorage.removeItem(LAST_TIMELINE_KEY); } catch { /* ignore */ }
}

// --- Test in corso (sessione di quiz salvata) ---
// Quando l'utente inizia un quiz, lo stato viene salvato qui. Se l'utente
// naviga in altre sezioni del sito e poi torna sul Test, la sessione viene
// ripristinata esattamente dove era rimasta. Doppio click su "Test" nel menu
// (o click sul pulsante "Esci" in alto a destra) cancella la sessione.
export interface SavedAnswer {
  q: Question;
  chosen: number;
  ok: boolean;
}

export interface SavedTestState {
  questions: Question[];
  idx: number;
  picked: number | null;          // scelta corrente (null se ancora da rispondere)
  answers: SavedAnswer[];
  mode: "normale" | "ripasso";
  reviewRemoved: string[];
  savedAt: number;
}

export function getLastTest(): SavedTestState | null {
  try {
    const raw = localStorage.getItem(LAST_TEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) return null;
    return {
      questions: parsed.questions as Question[],
      idx: typeof parsed.idx === "number" ? parsed.idx : 0,
      picked: typeof parsed.picked === "number" ? parsed.picked : null,
      answers: Array.isArray(parsed.answers) ? parsed.answers as SavedAnswer[] : [],
      mode: parsed.mode === "ripasso" ? "ripasso" : "normale",
      reviewRemoved: Array.isArray(parsed.reviewRemoved) ? parsed.reviewRemoved as string[] : [],
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
    };
  } catch { return null; }
}

export function setLastTest(state: SavedTestState): void {
  try { localStorage.setItem(LAST_TEST_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export function clearLastTest(): void {
  try { localStorage.removeItem(LAST_TEST_KEY); } catch { /* ignore */ }
}
