// ============================================================================
// IconaSezione — i simboli delle sezioni del sito.
//
// Stanno qui, e non dentro la barra laterale, perche' li usano in due punti: il
// menu e il comando che dalle schede riporta all'indice della sezione. Usare lo
// stesso segno nei due posti fa capire dove si sta andando senza doverlo
// leggere.
// ============================================================================
export default function IconaSezione({ id, size = 18 }: { id: string; size?: number }) {
  const comune = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.5,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  };
  switch (id) {
    case "opere": return <svg {...comune}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M4 8h16M9 3v18" /></svg>;
    case "artisti": return <svg {...comune}><circle cx="12" cy="8" r="3.4" /><path d="M5 20c1.2-3.6 3.8-5.4 7-5.4s5.8 1.8 7 5.4" /></svg>;
    case "rete": return <svg {...comune}><circle cx="6" cy="6" r="2" /><circle cx="18" cy="8" r="2" /><circle cx="9" cy="18" r="2" /><path d="M8 7l8 1M8 8l1 8M17 10l-7 7" /></svg>;
    case "timeline": return <svg {...comune}><path d="M3 12h18" /><circle cx="7" cy="12" r="1.6" /><circle cx="13" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /><path d="M7 12V7M13 12v5M19 12V8" /></svg>;
    case "mappa": return <svg {...comune}><path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2z" /><path d="M9 4v14M15 6v14" /></svg>;
    case "glossario": return <svg {...comune}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></svg>;
    case "tecniche": return <svg {...comune}><path d="M14 4l6 6-9 9-6 1 1-6 8-10z" /><path d="M12 6l6 6" /></svg>;
    case "statistiche": return <svg {...comune}><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></svg>;
    case "test": return <svg {...comune}><path d="M9 11l2 2 4-4" /><rect x="4" y="4" width="16" height="16" rx="2" /></svg>;
    default: return <svg {...comune}><circle cx="12" cy="12" r="8" /></svg>;
  }
}
