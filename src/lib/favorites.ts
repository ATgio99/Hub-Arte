// ============================================================================
// Preferiti — stelle su opere e artisti, salvate nel browser (localStorage)
// e sincronizzate su Supabase Cloud se l'utente è loggato.
// ============================================================================
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

const KEY = "atlante:favorites";
const TOMB_KEY = "atlante:favorites-tombstones"; // ID eliminati di recente (anti-risveglio)
export const FAVS_EVENT = "atlante:favs-changed";

export interface Favorites { works: string[]; artists: string[] }

// --- Tombstones: ID eliminati di recente per evitare che il poll dal cloud
//     li riaggiunga. Scadono dopo 1 ora (dopo di che assumiamo che il cloud
//     sia stato aggiornato correttamente dalla DELETE).
const TOMB_TTL_MS = 60 * 60 * 1000; // 1 ora

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

export function getFavorites(): Favorites {
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

export function setFavorites(f: Favorites) {
  localStorage.setItem(KEY, JSON.stringify(f));
  window.dispatchEvent(new CustomEvent(FAVS_EVENT));
}

function persist(f: Favorites) {
  localStorage.setItem(KEY, JSON.stringify(f));
  window.dispatchEvent(new CustomEvent(FAVS_EVENT));
}

export type FavType = "work" | "artist";

export function isFavorite(type: FavType, id: string): boolean {
  const f = getFavorites();
  return (type === "work" ? f.works : f.artists).includes(id);
}

export function toggleFavorite(type: FavType, id: string): boolean {
  const f = getFavorites();
  const list = type === "work" ? f.works : f.artists;
  const i = list.indexOf(id);
  const wasAdded = i < 0;
  if (i >= 0) {
    list.splice(i, 1);
    // Traccia l'eliminazione per evitare che il poll la riaggiunga
    addTombstone(type, id);
  }
  persist(f);

  // Push su Supabase (fire-and-forget, non blocca l'UI)
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return;
    if (wasAdded) {
      supabase.from("user_favorites").upsert(
        { user_id: user.id, work_id: id, type },
        { onConflict: "user_id,work_id,type" }
      ).then(({ error }) => {
        // Se l'upsert ha successo, possiamo rimuovere la tombstone (il cloud ora ha la riga)
        if (!error) {
          const t = getTombstones();
          delete t[`${type}:${id}`];
          localStorage.setItem(TOMB_KEY, JSON.stringify(t));
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
  // Also clear from Supabase (await instead of .then)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("user_favorites").delete().eq("user_id", user.id);
  }
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
