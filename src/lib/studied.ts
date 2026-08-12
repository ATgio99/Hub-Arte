// ============================================================================
// Opere approfondite — spunta "approfondita" per opera, salvate nel browser
// e sincronizzate su Supabase Cloud se l'utente è loggato.
// ============================================================================
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

const KEY = "atlante:studied";
const TOMB_KEY = "atlante:studied-tombstones"; // ID eliminati di recente (anti-risveglio)
const PENDING_KEY = "atlante:studied-pending"; // ID aggiunti localmente, non ancora pushati
export const STUDIED_EVENT = "atlante:studied-changed";

// --- Tombstones: ID eliminati di recente per evitare che il poll dal cloud
//     li riaggiunga. Scadono dopo 1 ora.
const TOMB_TTL_MS = 60 * 60 * 1000; // 1 ora

function getTombstones(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(TOMB_KEY) || "{}"); } catch { return {}; }
}
function addTombstone(id: string) {
  const t = getTombstones();
  t[id] = Date.now();
  localStorage.setItem(TOMB_KEY, JSON.stringify(t));
}
/** Filtra via gli ID presenti nelle tombstones recenti (usato dal pullFromCloud). */
export function filterTombstonedStudied(ids: string[]): string[] {
  const t = getTombstones();
  const now = Date.now();
  return ids.filter(id => {
    const ts = t[id];
    if (!ts) return true;
    if (now - ts > TOMB_TTL_MS) return true; // scaduto
    return false;
  });
}

// --- Pending adds: ID aggiunti localmente ma non ancora pushati al cloud.
//     Servono per evitare che il pullFromCloud (che fa REPLACE con cloud data)
//     cancelli ID aggiunti offline o appena prima che l'UPSERT venga processato.
function getPendingAdds(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || "{}"); } catch { return {}; }
}
function addPendingAdd(id: string) {
  const p = getPendingAdds();
  p[id] = Date.now();
  localStorage.setItem(PENDING_KEY, JSON.stringify(p));
}
function removePendingAdd(id: string) {
  const p = getPendingAdds();
  delete p[id];
  localStorage.setItem(PENDING_KEY, JSON.stringify(p));
}
/** Restituisce gli ID aggiunti localmente di recente. Usato da pullFromCloud. */
export function getPendingAddsStudied(): string[] {
  const p = getPendingAdds();
  const now = Date.now();
  return Object.keys(p).filter(id => now - p[id] < TOMB_TTL_MS);
}

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
  // Check login
  const userStr = localStorage.getItem("sb-ddsdvcznziciqdambgom-auth-token");
  if (!userStr) {
    window.dispatchEvent(new CustomEvent("atlante:login-required", { detail: { action: "approfondita", id } }));
    return false;
  }
  const ids = getStudied();
  const i = ids.indexOf(id);
  const wasAdded = i < 0;
  if (i >= 0) {
    ids.splice(i, 1);
    // Traccia l'eliminazione per evitare che il poll la riaggiunga
    addTombstone(id);
  } else {
    // Traccia l'aggiunta come "pending" finché l'UPSERT non va a buon fine
    addPendingAdd(id);
  }
  persist(ids);

  // Push su Supabase (fire-and-forget)
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return;
    if (wasAdded) {
      supabase.from("user_studied").upsert(
        { user_id: user.id, work_id: id },
        { onConflict: "user_id,work_id" }
      ).then(({ error }) => {
        if (!error) {
          // UPSERT riuscito: il cloud ora ha la riga → rimuovi tombstone e pending
          const t = getTombstones();
          delete t[id];
          localStorage.setItem(TOMB_KEY, JSON.stringify(t));
          removePendingAdd(id);
        }
      });
    } else {
      supabase.from("user_studied")
        .delete()
        .eq("user_id", user.id)
        .eq("work_id", id)
        .then(({ error }) => {
          if (error) console.error("[studied] delete failed:", error.message);
          // Non rimuoviamo la tombstone: la teniamo finché non scade.
        });
    }
  });

  return wasAdded;
}

export function studiedCount(): number {
  return getStudied().length;
}

export async function clearAllStudied() {
  persist([]);
  // Pulisci anche tombstones e pending
  localStorage.removeItem(TOMB_KEY);
  localStorage.removeItem(PENDING_KEY);
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("user_studied").delete().eq("user_id", user.id);
  }
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
