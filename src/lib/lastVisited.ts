// ============================================================================
// lastVisited.ts — memorizza l'ultima opera/autore/luogo/periodo/grafo visitato
// per offrire il "Continua →" nella sidebar.
// Tutto in localStorage, zero dipendenze.
// ============================================================================

const LAST_OPERA_KEY = "atlante:last-opera";
const LAST_ARTISTA_KEY = "atlante:last-artista";
const LAST_RETE_KEY = "atlante:last-rete";
const LAST_MAPPA_KEY = "atlante:last-mappa";
const LAST_TIMELINE_KEY = "atlante:last-timeline";

// --- Ultima opera aperta ---
export function getLastOpera(): string | null {
  try { return localStorage.getItem(LAST_OPERA_KEY); } catch { return null; }
}

export function setLastOpera(id: string): void {
  try { localStorage.setItem(LAST_OPERA_KEY, id); } catch { /* ignore */ }
}

export function clearLastOpera(): void {
  try { localStorage.removeItem(LAST_OPERA_KEY); } catch { /* ignore */ }
}

// --- Ultimo autore aperto ---
export function getLastArtista(): string | null {
  try { return localStorage.getItem(LAST_ARTISTA_KEY); } catch { return null; }
}

export function setLastArtista(id: string): void {
  try { localStorage.setItem(LAST_ARTISTA_KEY, id); } catch { /* ignore */ }
}

export function clearLastArtista(): void {
  try { localStorage.removeItem(LAST_ARTISTA_KEY); } catch { /* ignore */ }
}

// Compat: vecchio nome usato in alcune parti del codice
export function clearLastArtistaSearch(): void {
  clearLastArtista();
}

// --- Ultima ricerca nel grafo Rete ---
export interface ReteSearchState {
  focusNode: string | null;
  searchQuery: string;
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
export function getLastTimeline(): string | null {
  try { return localStorage.getItem(LAST_TIMELINE_KEY); } catch { return null; }
}

export function setLastTimeline(periodId: string): void {
  try { localStorage.setItem(LAST_TIMELINE_KEY, periodId); } catch { /* ignore */ }
}

export function clearLastTimeline(): void {
  try { localStorage.removeItem(LAST_TIMELINE_KEY); } catch { /* ignore */ }
}
