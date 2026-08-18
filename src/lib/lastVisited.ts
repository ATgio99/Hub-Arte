// ============================================================================
// lastVisited — memoria dell'ultima opera/artista visitati.
// Quando l'utente naviga in altre sezioni del sito e poi torna su "Opere"
// o "Artisti" dal menu, viene riportato all'ultima opera/artista aperta.
// Se clicca di nuovo la stessa voce di menu, torna alla home di quella sezione.
// ============================================================================

const LAST_OPERA_KEY = "atlante:last-opera";
const LAST_ARTISTA_KEY = "atlante:last-artista";
const LAST_OPERE_SEARCH_KEY = "atlante:last-opere-search";
const LAST_ARTISTI_SEARCH_KEY = "atlante:last-artisti-search";

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
