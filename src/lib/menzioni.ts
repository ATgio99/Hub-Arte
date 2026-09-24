// Le menzioni nei testi delle schede: «@Mantegna», «@andrea-mantegna»,
// «@Basilica di Santa Maria Novella». Diventano link nella pagina e vanno
// lette senza la chiocciola dalla voce.
//
// Prima la menzione si riconosceva con un'espressione regolare che prendeva
// tutto fino alla punteggiatura, spazi e punti compresi, e poi cercava un
// nome che ne fosse l'inizio: «@Basilica di Santa Maria Novella . Il tema
// sacro diventa…» finiva tutto dentro il link, e il resto della frase
// spariva sostituito dal nome della chiesa. Ora si parte dai nomi che il
// catalogo conosce e si prende il più lungo con cui il testo comincia:
// quello che viene dopo resta testo.
import type { Dataset, EntityType } from "./types";

// «city» non è un'entità del catalogo: è il nome di una città, che ha la sua
// pagina in /luogo/<nome>.
export type Menzione = { type: EntityType | "city"; id: string; label: string };
export type PezzoTesto = { testo: string; menzione?: Menzione };
export type IndiceMenzioni = { mappa: Map<string, Menzione>; chiavi: string[] };

// Un indice per dataset: la pagina ha più blocchi di testo e la voce ne ha
// altri, e non serve ricostruirlo per ognuno.
const cache = new WeakMap<object, IndiceMenzioni>();

// Nomi storici di una città che nel catalogo compare con il nome di oggi:
// nei testi si scrive «Costantinopoli» dove è giusto storicamente, ma la
// pagina della città è una sola.
export const NOMI_STORICI: Record<string, string> = {
  Costantinopoli: "Istanbul",
  Bisanzio: "Istanbul",
};

/** Il nome con cui la città ha la sua pagina («Costantinopoli» → «Istanbul»). */
export const cittaAttuale = (nome: string) => NOMI_STORICI[nome.trim()] ?? nome.trim();

/** I nomi storici di una città («Istanbul» → Costantinopoli, Bisanzio). */
export const nomiStorici = (citta: string) => Object.keys(NOMI_STORICI).filter((k) => NOMI_STORICI[k] === citta);

export function indiceMenzioni(ds: Pick<Dataset, "artists" | "works">): IndiceMenzioni {
  const giaFatto = cache.get(ds.works);
  if (giaFatto && cache.get(ds.artists) === giaFatto) return giaFatto;
  const indice = costruisci(ds);
  cache.set(ds.works, indice);
  cache.set(ds.artists, indice);
  return indice;
}

function costruisci(ds: Pick<Dataset, "artists" | "works">): IndiceMenzioni {
  const mappa = new Map<string, Menzione>();
  const metti = (k: string, m: Menzione) => { const c = normalizza(k.trim()); if (c && !mappa.has(c)) mappa.set(c, m); };
  for (const a of ds.artists) {
    metti(a.name, { type: "artist", id: a.id, label: a.name });
    metti(a.id, { type: "artist", id: a.id, label: a.name });
    for (const aka of a.aka ?? []) metti(aka, { type: "artist", id: a.id, label: aka });
  }
  for (const w of ds.works) {
    metti(w.title, { type: "work", id: w.id, label: w.title });
    metti(w.id, { type: "work", id: w.id, label: w.title });
  }
  // Le città vengono dopo opere e autori: a parità di nome vince la scheda.
  for (const r of [...ds.works, ...ds.artists] as { location_city?: string | null }[]) {
    const c = r.location_city?.trim();
    if (c) metti(c, { type: "city", id: cittaAttuale(c), label: c });
  }
  for (const [storico, oggi] of Object.entries(NOMI_STORICI)) {
    if (mappa.has(normalizza(oggi))) metti(storico, { type: "city", id: oggi, label: storico });
  }
  // Dal nome più lungo al più corto: «Santa Maria Novella» prima di «Santa Maria».
  const chiavi = [...mappa.keys()].sort((a, b) => b.length - a.length);
  return { mappa, chiavi };
}

// Minuscole e apostrofo dritto: «de’ Roberti» e «de' Roberti» sono lo stesso
// nome. La sostituzione è carattere per carattere, quindi le lunghezze
// restano quelle del testo originale.
const normalizza = (s: string) => s.toLowerCase().replace(/[\u2019\u2018`]/g, "'");

const LETTERA = /[\p{L}\p{N}]/u;
// Dove finisce una menzione che non corrisponde a niente, o a cui manca un
// pezzo: alla punteggiatura forte, a un punto seguito da spazio, a capo.
const FINE_SEGMENTO = /[,;:!?()[\]{}\n]|\.(?=\s|$)/;

export function spezzaMenzioni(testo: string, indice: IndiceMenzioni): PezzoTesto[] {
  const fuori: PezzoTesto[] = [];
  let buffer = "";
  let i = 0;
  while (i < testo.length) {
    const c = testo[i];
    const prima = i > 0 ? testo[i - 1] : "";
    // Una chiocciola in mezzo a una parola (un indirizzo email) non è una menzione.
    if (c !== "@" || (prima && LETTERA.test(prima)) || !LETTERA.test(testo[i + 1] ?? "")) {
      buffer += c; i++; continue;
    }
    const resto = testo.slice(i + 1);
    const basso = normalizza(resto);
    let trovata: { m: Menzione; lung: number } | null = null;
    // 1. Il nome più lungo con cui il testo comincia, e che finisce lì.
    for (const k of indice.chiavi) {
      if (basso.startsWith(k) && !LETTERA.test(resto[k.length] ?? "")) {
        trovata = { m: indice.mappa.get(k)!, lung: k.length };
        break;
      }
    }
    // 2. Nome scritto a metà («@Basilica di santa maria no»): il segmento fino
    //    alla punteggiatura è l'inizio di un nome noto.
    if (!trovata) {
      const fine = resto.search(FINE_SEGMENTO);
      const segmento = (fine < 0 ? resto : resto.slice(0, fine)).trimEnd();
      const s = normalizza(segmento);
      if (s.length >= 3) {
        const k = indice.chiavi.find((k) => k.startsWith(s));
        if (k) trovata = { m: indice.mappa.get(k)!, lung: segmento.length };
      }
    }
    if (trovata) {
      if (buffer) { fuori.push({ testo: buffer }); buffer = ""; }
      fuori.push({ testo: resto.slice(0, trovata.lung), menzione: trovata.m });
      i += 1 + trovata.lung;
    } else {
      // Nessun nome noto: si toglie solo la chiocciola, il testo resta com'è.
      i++;
    }
  }
  if (buffer) fuori.push({ testo: buffer });
  return fuori;
}

/** Il testo come va letto a voce: il nome al posto della menzione. */
export function senzaMenzioni(testo: string, indice: IndiceMenzioni): string {
  return spezzaMenzioni(testo, indice).map((p) => (p.menzione ? p.menzione.label : p.testo)).join("");
}
