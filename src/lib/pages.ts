// ============================================================================
// Le 8 PIETRE-PAGINA — definizioni leggere (NESSUN import di three).
// Questo modulo è importato sia da App.tsx (chrome/Indice) sia dalla scena 3D.
// Tenendolo separato da three/cathedral.ts evitiamo di trascinare three.js
// dentro al bundle principale: il 3D resta lazy-load solo in home.
// ============================================================================

export type StoneId =
  | "opere"
  | "artisti"
  | "rete"
  | "timeline"
  | "mappa"
  | "glossario"
  | "tecniche"
  | "statistiche"
  | "test";

export interface StoneDef {
  id: StoneId;
  num: string; // "01" — numero piccolo opzionale
  name: string; // NOME PAGINA — sempre primario, niente nomi architettonici
  desc: string; // sottotitolo breve
  route: string; // rotta verso pagina esistente (INTATTA)
}

// Le 8 pietre = le 8 porte delle pagine. Nessuna semantica architettonica.
export const STONES: StoneDef[] = [
  { id: "opere", num: "01", name: "Opere", desc: "Catalogo delle opere", route: "/opere" },
  { id: "artisti", num: "02", name: "Autori", desc: "Cerca maestri e botteghe", route: "/artisti" },
  { id: "rete", num: "03", name: "Rete", desc: "Connessioni tra artisti e opere", route: "/grafo" },
  { id: "timeline", num: "04", name: "Linea del tempo", desc: "Periodi e movimenti", route: "/timeline" },
  { id: "mappa", num: "05", name: "Mappa", desc: "Luoghi e geografie", route: "/mappa" },
  { id: "glossario", num: "06", name: "Glossario", desc: "Termini e definizioni", route: "/glossario" },
  { id: "tecniche", num: "07", name: "Tecniche", desc: "Materiali e procedimenti", route: "/tecniche" },
  { id: "statistiche", num: "08", name: "Statistiche", desc: "Dati e quadri d'insieme", route: "/dashboard" },
  { id: "test", num: "09", name: "Test", desc: "Mettiti alla prova", route: "/test" },
];
