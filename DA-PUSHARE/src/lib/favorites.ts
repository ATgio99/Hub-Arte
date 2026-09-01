// ============================================================================
// Preferiti — stelle su opere e artisti, salvate nel browser (localStorage)
// e sincronizzate su Supabase Cloud se l'utente è loggato.
// ============================================================================
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

const KEY = "atlante:favorites";
const TOMB_KEY = "atlante:favorites-tombstones"; // ID eliminati di recente (anti-risveglio)
const PENDING_KEY = "atlante:favorites-pending"; // ID aggiunti localmente, non ancora pushati
export const FAVS_EVENT = "atlante:favs-changed";

export interface Favorites { works: string[]; artists: string[] }

// --- Tombstones: ID eliminati di recente per evitare che il poll dal cloud
//     li riaggiunga. Scadono dopo 1 ora (dopo di che assumiamo che il cloud
//     sia stato aggiornato correttamente dalla DELETE).
// Quaranta secondi: il tempo perche' una scrittura arrivi al cloud e torni
// indietro. Prima era un'ora, e in quell'ora un preferito aggiunto dal telefono
// veniva rifiutato dal computer che lo aveva tolto poco prima: i due
// dispositivi restavano su numeri diversi senza piu' riallinearsi.
const TOMB_TTL_MS = 40 * 1000;

function getTombstones(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(TOMB_KEY) || "{}"); } catch { return {}; }
}
function addTombstone(type: FavType, id: string) {
  const t = getTombstones();
  t[`${type}:${id}`] = Date.now();
  localStorage.setItem(TOMB_KEY, JSON.stringify(t));
}
/** Filtra via gli ID presenti nelle tombstones recenti (usato dal pullFromCloud). */
export function filterTombstoned(type: FavType, ids: string[]): string[] {
  const t = getTombstones();
  const now = Date.now();
  return ids.filter(id => {
    const ts = t[`${type}:${id}`];
    if (!ts) return true; // non tombstoned → tienilo
    if (now - ts > TOMB_TTL_MS) {
      // scaduto → può essere tenuto (assumiamo cloud aggiornato)
      return true;
    }
    return false; // tombstoned recente → scartalo
  });
}

// --- Pending adds: ID aggiunti localmente ma non ancora pushati al cloud.
//     Servono per evitare che il pullFromCloud (che fa REPLACE con cloud data)
//     cancelli ID aggiunti offline o appena prima che l'UPSERT venga processato.
//     Vengono rimossi quando l'UPSERT al cloud ha successo.
function getPendingAdds(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || "{}"); } catch { return {}; }
}
function addPendingAdd(type: FavType, id: string) {
  const p = getPendingAdds();
  p[`${type}:${id}`] = Date.now();
  localStorage.setItem(PENDING_KEY, JSON.stringify(p));
}
function removePendingAdd(type: FavType, id: string) {
  const p = getPendingAdds();
  delete p[`${type}:${id}`];
  localStorage.setItem(PENDING_KEY, JSON.stringify(p));
}
/** Restituisce gli ID aggiunti localmente di recente (per tipo). Usato da pullFromCloud. */
export function getPendingAddsFor(type: FavType): string[] {
  const p = getPendingAdds();
  const now = Date.now();
  return Object.keys(p)
    .filter(k => k.startsWith(`${type}:`))
    .filter(k => now - p[k] < TOMB_TTL_MS) // scadono dopo 1 ora
    .map(k => k.slice(`${type}:`.length));
}

// La lista sta in memoria e il disco e' solo una copia di sicurezza.
//
// Prima ogni componente che mostrava una stella rileggeva localStorage e
// rifaceva il parsing del JSON a ogni notifica: nella pagina delle opere sono
// sessanta schede, e un clic ci metteva mezzo secondo a farsi vedere. Adesso il
// clic tocca un oggetto gia' in memoria, la pagina si ridisegna nel fotogramma
// successivo, e la scrittura su disco aspetta il momento di quiete.
let memoria: Favorites | null = null;
let scritturaProgrammata: any = null;

function leggiDaDisco(): Favorites {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      works: Array.isArray(raw.works) ? raw.works : [],
      artists: Array.isArray(raw.artists) ? raw.artists : [],
    };
  } catch {
    return { works: [], artists: [] };
  }
}

export function getFavorites(): Favorites {
  if (!memoria) memoria = leggiDaDisco();
  // Copia difensiva: chi chiama puo' modificarla senza toccare lo stato vero.
  return { works: [...memoria.works], artists: [...memoria.artists] };
}

/** Set per i controlli di appartenenza: una stella deve sapere in un colpo se
 *  e' accesa, non scorrere un elenco di trecento voci. */
let indice: { works: Set<string>; artists: Set<string> } | null = null;
function aggiornaIndice() {
  const m = memoria ?? leggiDaDisco();
  indice = { works: new Set(m.works), artists: new Set(m.artists) };
}

function scriviSuDisco() {
  if (!memoria) return;
  try { localStorage.setItem(KEY, JSON.stringify(memoria)); } catch { /* disco pieno o negato */ }
}

function applica(f: Favorites) {
  memoria = { works: [...f.works], artists: [...f.artists] };
  aggiornaIndice();
  // Il disegno parte subito; il disco lo raggiunge dopo, raggruppando i clic
  // ravvicinati in una scrittura sola.
  window.dispatchEvent(new CustomEvent(FAVS_EVENT));
  if (scritturaProgrammata) clearTimeout(scritturaProgrammata);
  scritturaProgrammata = setTimeout(scriviSuDisco, 400);
}

export function setFavorites(f: Favorites) { applica(f); }
function persist(f: Favorites) { applica(f); }

// Se si chiude la pagina prima che la scrittura differita sia partita, si salva
// comunque: quattro decimi di secondo bastano a perdere un clic.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", scriviSuDisco);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") scriviSuDisco();
  });
}

export type FavType = "work" | "artist";

// Quello che scriviamo noi ci torna indietro dal realtime qualche centinaio di
// millesimi dopo, e rimette a posto uno stato che era gia' a posto: la pagina si
// ridisegnava una seconda volta senza motivo. Qui si segna cosa abbiamo appena
// toccato, e l'eco di ritorno si lascia cadere. La finestra e' breve: una
// modifica vera fatta da un altro dispositivo passa lo stesso.
const scritturaNostra = new Map<string, number>();
const FINESTRA_ECO = 8000;

export function segnaScritturaNostra(type: FavType, id: string) {
  scritturaNostra.set(`${type}:${id}`, Date.now());
}

/** Vero se questo cambiamento l'abbiamo appena fatto noi da questa scheda. */
export function eNostraEco(type: string, id: string): boolean {
  const k = `${type}:${id}`;
  const t = scritturaNostra.get(k);
  if (t == null) return false;
  if (Date.now() - t > FINESTRA_ECO) { scritturaNostra.delete(k); return false; }
  return true;
}

export function isFavorite(type: FavType, id: string): boolean {
  if (!indice) aggiornaIndice();
  return (type === "work" ? indice!.works : indice!.artists).has(id);
}

export function toggleFavorite(type: FavType, id: string): boolean {
  // Check login
  const userStr = localStorage.getItem("sb-ddsdvcznziciqdambgom-auth-token");
  if (!userStr) {
    window.dispatchEvent(new CustomEvent("atlante:login-required", { detail: { action: "preferito", type, id } }));
    return false;
  }
  const f = getFavorites();
  const list = type === "work" ? f.works : f.artists;
  const i = list.indexOf(id);
  const wasAdded = i < 0;
  segnaScritturaNostra(type, id);
  if (i >= 0) {
    list.splice(i, 1);
    // Traccia l'eliminazione per evitare che il poll la riaggiunga
    addTombstone(type, id);
  } else {
    // L'aggiunta va scritta subito nella lista locale. Non c'era: l'id finiva
    // solo fra i «pending», e la stella si accendeva quando il dato tornava
    // indietro dal cloud — da qui i dieci secondi di attesa che si vedevano.
    // Adesso lo stato locale e' quello vero e il cloud lo raggiunge dopo.
    list.push(id);
    // Resta segnato come «pending» finché l'UPSERT non va a buon fine, così
    // una lettura dal cloud che arrivasse prima della scrittura non lo cancella.
    addPendingAdd(type, id);
  }
  persist(f);

  // La scrittura sul cloud non deve passare da `auth.getUser()`: quella e' una
  // chiamata di rete, e la faceva a ogni singolo clic su una stella. La
  // sessione e' gia' in memoria nel client, e leggerla non costa niente.
  supabase.auth.getSession().then(({ data: { session } }) => {
    const user = session?.user;
    if (!user) return;
    if (wasAdded) {
      supabase.from("user_favorites").upsert(
        { user_id: user.id, work_id: id, type },
        { onConflict: "user_id,work_id,type" }
      ).then(({ error }) => {
        if (!error) {
          // UPSERT riuscito: il cloud ora ha la riga → rimuovi tombstone e pending
          const t = getTombstones();
          delete t[`${type}:${id}`];
          localStorage.setItem(TOMB_KEY, JSON.stringify(t));
          removePendingAdd(type, id);
        }
      });
    } else {
      supabase.from("user_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("work_id", id)
        .eq("type", type)
        .then(({ error }) => {
          if (error) console.error("[favorites] delete failed:", error.message);
          // Non rimuoviamo la tombstone nemmeno se la delete ha successo:
          // la teniamo finché non scade naturalmente, così il poll non
          // riaggiunge l'ID prima che la replica del cloud sia consistente.
        });
    }
  });

  return wasAdded;
}

export function favoritesCount(): number {
  const f = getFavorites();
  return f.works.length + f.artists.length;
}

/** Svuota tutti i preferiti (locale + cloud). Async: attende la delete su Supabase. */
export async function clearAllFavorites() {
  persist({ works: [], artists: [] });
  // Pulisci anche tombstones e pending
  localStorage.removeItem(TOMB_KEY);
  localStorage.removeItem(PENDING_KEY);
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("user_favorites").delete().eq("user_id", user.id);
  }
}

/** Hook mirato: dice solo se QUESTA voce e' fra i preferiti.
 *
 *  `useFavorites` consegna un oggetto nuovo a ogni notifica, quindi tutte le
 *  stelle della pagina si ridisegnavano a ogni clic — sessanta componenti per
 *  un pallino che cambia colore. Questo restituisce un booleano: si ridisegna
 *  solo la stella che e' davvero cambiata. */
export function useIsFavorite(type: FavType, id: string): boolean {
  const [on, setOn] = useState<boolean>(() => isFavorite(type, id));
  useEffect(() => {
    const aggiorna = () => setOn(isFavorite(type, id));
    aggiorna();
    window.addEventListener(FAVS_EVENT, aggiorna);
    return () => window.removeEventListener(FAVS_EVENT, aggiorna);
  }, [type, id]);
  return on;
}

/** Hook reattivo: restituisce i preferiti correnti e si aggiorna a ogni toggle. */
export function useFavorites(): Favorites {
  const [favs, setFavs] = useState<Favorites>(() => getFavorites());
  useEffect(() => {
    const on = () => setFavs(getFavorites());
    window.addEventListener(FAVS_EVENT, on);
    return () => window.removeEventListener(FAVS_EVENT, on);
  }, []);
  return favs;
}
