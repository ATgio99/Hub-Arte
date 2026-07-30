// ============================================================================
// Preferiti — stelle su opere e artisti, salvate nel browser (localStorage)
// e sincronizzate su Supabase Cloud se l'utente è loggato.
// ============================================================================
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

const KEY = "atlante:favorites";
export const FAVS_EVENT = "atlante:favs-changed";

export interface Favorites { works: string[]; artists: string[] }

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
  if (i >= 0) list.splice(i, 1); else list.push(id);
  persist(f);

  // Push su Supabase (fire-and-forget, non blocca l'UI)
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return;
    if (wasAdded) {
      supabase.from("user_favorites").upsert(
        { user_id: user.id, work_id: id, type },
        { onConflict: "user_id,work_id,type" }
      );
    } else {
      supabase.from("user_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("work_id", id)
        .eq("type", type);
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
