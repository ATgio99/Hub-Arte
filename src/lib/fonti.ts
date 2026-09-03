// ============================================================================
// fonti — da quale libro viene ogni scheda.
//
// Ha preso il posto di `works.importance`, il numero 1-3 che il sito mostrava
// come «opera capitale». Erano due cose impacchettate in una: la provenienza,
// che e' un fatto verificabile, e l'importanza, che non lo e'. Il numero
// misurava lo spazio che i manuali danno all'opera — e sono gli stessi manuali
// che non nominano nemmeno un'artista, quindi la parola firmava un canone
// facendolo sembrare una proprieta' delle cose.
//
// Le fonti stanno in una tabella e non in un testo libero: il titolo di un
// manuale scritto a mano cinquanta volte diventa cinquanta titoli leggermente
// diversi, e una bibliografia con cinquanta voci per due libri non serve a
// niente. `works.fonte_ids` e' un elenco, come `artist_ids`: la stessa opera
// puo' stare in piu' manuali.
//
// Capitolo e pagina il catalogo li ha in `chapter` e `page`, ma vengono
// dall'importazione e sono sbagliati: non si stampano. Una citazione precisa e
// falsa e' peggio di una generica e vera, perche' chi la usa va a cercare
// quella pagina.
// ============================================================================
import type { Dataset, Fonte, Work } from "./types";

/** «Con gli occhi dell'arte, vol. 2» */
export function citazione(f: Fonte): string {
  return f.volume ? `${f.titolo}, vol. ${f.volume}` : f.titolo;
}

/** «E. Demartini… — Rizzoli Education, 2022» */
export function riferimento(f: Fonte): string {
  return [f.autori, [f.editore, f.anno].filter(Boolean).join(", ")]
    .filter(Boolean).join(" — ");
}

export function fontiDi(ds: Dataset, w: Work): Fonte[] {
  const voluti = w.fonte_ids ?? [];
  if (voluti.length === 0) return [];
  return ds.fonti.filter((f) => voluti.includes(f.id));
}

/** Quante opere cita ogni fonte: serve all'editor e alla pagina dei crediti. */
export function opereDiFonte(ds: Dataset, fonteId: string): Work[] {
  return ds.works.filter((w) => (w.fonte_ids ?? []).includes(fonteId));
}
