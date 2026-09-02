// ============================================================================
// fonti — da quale libro viene ogni opera.
//
// Prende il posto di `importance`, il numero 1-3 che diceva quanto spazio i
// manuali dedicassero a un'opera e che il sito mostrava come «opera capitale».
// Erano due cose diverse impacchettate in una: da dove viene la scheda, che e'
// un fatto verificabile, e quanto conta l'opera, che non lo e'. Erano anche gli
// stessi manuali che non nominano nemmeno un'artista a decidere cosa fosse
// capitale, quindi la parola firmava un canone spacciandolo per una proprieta'
// delle cose.
//
// Qui resta solo il fatto: quale libro, quale capitolo, quale pagina. Quando i
// manuali saranno piu' d'uno questo diventa una bibliografia vera, e si potra'
// dire «questa scheda viene di qui» invece di «questa opera vale tanto».
//
// Il numero in `works.book` e' storico e non corrisponde al volume: 1 e 2 sono
// due volumi dello stesso manuale.
// ============================================================================

export interface Fonte {
  titolo: string;
  autori: string;
  editore: string;
  anno?: number;
  volume?: string;
}

export const FONTI: Record<number, Fonte> = {
  1: {
    titolo: "Con gli occhi dell'arte",
    autori: "E. Demartini, C. Gatti, E. Tonetti, E. P. Villa",
    editore: "Rizzoli Education",
    anno: 2022,
    volume: "2",
  },
  2: {
    titolo: "Con gli occhi dell'arte",
    autori: "E. Demartini, C. Gatti, E. Tonetti, E. P. Villa",
    editore: "Rizzoli Education",
    anno: 2022,
    volume: "3",
  },
  // L'8 e' lo stesso volume del 2: ventisei schede entrate con un altro numero
  // in un'importazione a parte. Si mappano tutte e due sulla stessa fonte
  // invece di riscrivere i dati, cosi' il numero storico resta leggibile.
  8: {
    titolo: "Con gli occhi dell'arte",
    autori: "E. Demartini, C. Gatti, E. Tonetti, E. P. Villa",
    editore: "Rizzoli Education",
    anno: 2022,
    volume: "3",
  },
};

export function fonteDi(book: number | null | undefined): Fonte | null {
  return book == null ? null : FONTI[book] ?? null;
}

/** «Con gli occhi dell'arte, vol. 2 · cap. 6, p. 31» */
export function citazione(
  book: number | null | undefined,
  chapter?: number | null,
  page?: number | null,
): string | null {
  const f = fonteDi(book);
  if (!f) return null;
  let t = f.titolo;
  if (f.volume) t += `, vol. ${f.volume}`;
  const dove: string[] = [];
  if (chapter) dove.push(`cap. ${chapter}`);
  if (page) dove.push(`p. ${page}`);
  return dove.length ? `${t} · ${dove.join(", ")}` : t;
}
