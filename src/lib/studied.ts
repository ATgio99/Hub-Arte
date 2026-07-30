// ============================================================================
// Opere approfondite — spunta "approfondita" per opera, salvate nel browser
// e sincronizzate su Supabase Cloud se l'utente è loggato.
// ============================================================================
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

const KEY = "atlante:studied";
export const STUDIED_EVENT = "atlante:studied-changed";

export function getStudied(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function setStudied(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(STUDIED_EVENT));
}

function persist(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(STUDIED_EVENT));
}

export function isStudied(id: string): boolean {
  return getStudied().includes(id);
}

export function toggleStudied(id: string): boolean {
  const ids = getStudied();
  const i = ids.indexOf(id);
  const wasAdded = i < 0;
  if (i >= 0) ids.splice(i, 1); else ids.push(id);
  persist(ids);

  // Push su Supabase (fire-and-forget)
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return;
    if (wasAdded) {
      supabase.from("user_studied").upsert(
        { user_id: user.id, work_id: id },
        { onConflict: "user_id,work_id" }
      );
    } else {
      supabase.from("user_studied")
        .delete()
        .eq("user_id", user.id)
        .eq("work_id", id);
    }
  });

  return wasAdded;
}

export function studiedCount(): number {
  return getStudied().length;
}

export function clearAllStudied() {
  persist([]);
  // Also clear from Supabase
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (user) supabase.from("user_studied").delete().eq("user_id", user.id);
  });
}

/** Hook reattivo: restituisce gli id delle opere approfondite e si aggiorna a ogni toggle. */
export function useStudied(): string[] {
  const [ids, setIds] = useState<string[]>(() => getStudied());
  useEffect(() => {
    const on = () => setIds(getStudied());
    window.addEventListener(STUDIED_EVENT, on);
    return () => window.removeEventListener(STUDIED_EVENT, on);
  }, []);
  return ids;
}
