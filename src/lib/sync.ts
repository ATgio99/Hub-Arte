// ============================================================================
// Supabase Sync — push locale → cloud, pull cloud → locale, realtime
// ============================================================================
// STRATEGIA (post-fix bug contaminazione account):
//
//   Al login di un utente:
//     1. PULL dal cloud (NON push prima!)
//        - Se il cloud HA dati per questo utente → unisci col locale (merge)
//        - Se il cloud NON ha dati per questo Utente (nuovo utente) → NON
//          spingere il localStorage: potrebbe contenere residui di un utente
//          precedente su questo browser. Solo l'azione attiva dell'utente
//          (toggle preferito, spunta approfondita, override immagine) spinge
//          i suoi dati sul cloud.
//     2. Subscribe realtime per sincronia live.
//
//   Al logout:
//     - auth.tsx pulisce localStorage (preferiti, studied, override privati,
//       quiz stats/errors). I dati globali (override immagini admin) restano.
//     - Così il prossimo utente su questo browser parte da zero.
//
//   Immagini override:
//     - Override GLOBALI (is_global=true, admin): scaricati per tutti gli
//       utenti (anche anonimi). Visibili a tutti.
//     - Override PRIVATI (is_global=false, utente): scaricati solo per l'utente
//       proprietario. NON vengono mai spinti a un altro account.
// ============================================================================

import { supabase } from "./supabase";
import { getFavorites, setFavorites } from "./favorites";
import { getStudied, setStudied } from "./studied";
import { getOverrides, setOverrides, getGlobalOverrides, setGlobalOverrides } from "./imageOverrides";
import type { User } from "@supabase/supabase-js";

// ---------- PULL GLOBAL IMAGE OVERRIDES (per tutti, anche anonimi) ----------
// Questa funzione può essere chiamata anche senza utente (utente anonimo).
// Scarica TUTTI gli override globali (is_global=true) e li salva nel localStorage
// sotto la chiave separata "atlante:image-overrides-global".

export async function pullGlobalImageOverrides(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("image_overrides")
      .select("work_id, url, modified_by, updated_at")
      .eq("is_global", true);

    if (error) {
      // Se la tabella non ha ancora la colonna is_global (pre-migration),
      // la query fallisce: ignora silenziosamente. L'app continua a funzionare
      // con gli override privati del localStorage.
      return;
    }
    if (!data || data.length === 0) {
      // Nessun override globale → pulisci il localStorage globale
      setGlobalOverrides({});
      return;
    }

    const map = getGlobalOverrides();
    const newMap: Record<string, { url: string; setAt: string; isGlobal: boolean; modifiedBy?: string }> = {};
    for (const r of data) {
      newMap[r.work_id] = {
        url: r.url,
        setAt: r.updated_at ?? new Date().toISOString(),
        isGlobal: true,
        modifiedBy: r.modified_by ?? undefined,
      };
    }
    // Aggiorna solo se ci sono differenze (per evitare dispatch inutili)
    const oldKeys = Object.keys(map).sort().join(",");
    const newKeys = Object.keys(newMap).sort().join(",");
    if (oldKeys !== newKeys) {
      setGlobalOverrides(newMap);
    } else {
      // Verifica anche che gli URL siano identici
      let changed = false;
      for (const k of Object.keys(newMap)) {
        if (map[k]?.url !== newMap[k].url) { changed = true; break; }
      }
      if (changed) setGlobalOverrides(newMap);
    }
  } catch {
    /* ignore */
  }
}

// ---------- PUSH TO CLOUD (SOLO per dati esplicitamente dell'utente) ----------
// NOTA: questa funzione NON viene più chiamata al login. Viene usata solo
// dall'export/import manuale o dalla UI "Forza sync" se aggiunta in futuro.

export async function pushToCloud(user: User): Promise<void> {
  const uid = user.id;

  // 1) Favorites
  const favs = getFavorites();
  const favRows = [
    ...favs.works.map(work_id => ({ user_id: uid, work_id, type: "work" as const })),
    ...favs.artists.map(work_id => ({ user_id: uid, work_id, type: "artist" as const })),
  ];
  if (favRows.length > 0) {
    await supabase.from("user_favorites").upsert(favRows, { onConflict: "user_id,work_id,type" });
  }

  // 2) Studied
  const studiedIds = getStudied();
  if (studiedIds.length > 0) {
    const studiedRows = studiedIds.map(work_id => ({ user_id: uid, work_id }));
    await supabase.from("user_studied").upsert(studiedRows, { onConflict: "user_id,work_id" });
  }

  // 3) Image overrides PRIVATI (is_global=false)
  // NON spingiamo i globali: sono gestiti dal modulo imageOverrides tramite
  // l'API setOverride (che sa se l'utente è admin e salva di conseguenza).
  const overrides = getOverrides();
  const overrideEntries = Object.entries(overrides);
  if (overrideEntries.length > 0) {
    const imgRows = overrideEntries.map(([work_id, ov]) => ({
      user_id: uid,
      work_id,
      url: ov.url,
      is_global: false,
      modified_by: null,
    }));
    await supabase.from("image_overrides").upsert(imgRows, { onConflict: "user_id,work_id" });
  }

  // 4) Quiz errors
  try {
    const errors = JSON.parse(localStorage.getItem("atlante.quiz.errors.v1") || "[]");
    if (Array.isArray(errors) && errors.length > 0) {
      const errRows = errors.map((e: any) => ({
        user_id: uid,
        kind: e.kind,
        ref_id: e.refId,
        prompt: e.prompt || "",
        count: e.correctStreak || 0,
      }));
      await supabase.from("quiz_errors").upsert(errRows, { onConflict: "user_id,kind,ref_id" });
    }
  } catch { /* ignore */ }
}

// ---------- PULL FROM CLOUD (REPLACE cloud → locale) ----------
// Strategia REPLACE (post-fix):
//   - Se il cloud HA dati per questo utente → REPLACE il locale (non merge).
//   - Se il cloud è VUOTO per questo utente → mantieni il locale e, se il
//     locale ha dati, pusha verso il cloud (così il primo dispositivo
//     "semina" il cloud per gli altri).
//   Nota: il merge potrebbe causare contaminazione tra account su browser
//   condivisi; la REPLACE è più prevedibile.

export async function pullFromCloud(user: User): Promise<void> {
  // 1) Favorites — REPLACE
  console.log("[sync] pullFromCloud: favorites for", user.id);
  const { data: favRows } = await supabase
    .from("user_favorites")
    .select("work_id, type")
    .eq("user_id", user.id);

  if (favRows && favRows.length > 0) {
    // Il cloud HA dati → REPLACE il locale con quello del cloud.
    const cloudWorks = favRows.filter(r => r.type === "work").map(r => r.work_id);
    const cloudArtists = favRows.filter(r => r.type === "artist").map(r => r.work_id);
    console.log(`[sync] favorites: cloud has ${cloudWorks.length} works + ${cloudArtists.length} artists → REPLACE locale`);
    setFavorites({ works: cloudWorks, artists: cloudArtists });
  } else {
    // Il cloud è vuoto → mantieni il locale e, se ha dati, pusha al cloud.
    const localFavs = getFavorites();
    if (localFavs.works.length > 0 || localFavs.artists.length > 0) {
      console.log(`[sync] favorites: cloud empty, local has ${localFavs.works.length}+${localFavs.artists.length} → pushToCloud`);
      await pushToCloud(user);
    } else {
      console.log("[sync] favorites: cloud empty, local empty → nothing to do");
    }
  }

  // 2) Studied — REPLACE
  console.log("[sync] pullFromCloud: studied for", user.id);
  const { data: studiedRows } = await supabase
    .from("user_studied")
    .select("work_id")
    .eq("user_id", user.id);

  if (studiedRows && studiedRows.length > 0) {
    // Il cloud HA dati → REPLACE il locale.
    const cloudStudied = studiedRows.map(r => r.work_id);
    console.log(`[sync] studied: cloud has ${cloudStudied.length} → REPLACE locale`);
    setStudied(cloudStudied);
  } else {
    // Il cloud è vuoto → mantieni il locale e, se ha dati, pusha al cloud.
    const localStudied = getStudied();
    if (localStudied.length > 0) {
      console.log(`[sync] studied: cloud empty, local has ${localStudied.length} → pushToCloud`);
      await pushToCloud(user);
    } else {
      console.log("[sync] studied: cloud empty, local empty → nothing to do");
    }
  }

  // 3) Image overrides PRIVATI dell'utente — merge (locale ha precedenza)
  const { data: imgRows, error: imgErr } = await supabase
    .from("image_overrides")
    .select("work_id, url")
    .eq("user_id", user.id)
    .eq("is_global", false);

  if (!imgErr && imgRows && imgRows.length > 0) {
    const map = getOverrides();
    for (const r of imgRows) {
      if (!map[r.work_id]) {
        map[r.work_id] = { url: r.url, setAt: new Date().toISOString(), isGlobal: false };
      }
    }
    setOverrides(map);
  }

  // 4) Image overrides GLOBALI — per tutti gli utenti (anche quelli senza propri override)
  await pullGlobalImageOverrides();

  // 5) Quiz errors — merge nel localStorage
  const { data: errRows } = await supabase
    .from("quiz_errors")
    .select("kind, ref_id, prompt, count")
    .eq("user_id", user.id);

  if (errRows && errRows.length > 0) {
    try {
      const existing = JSON.parse(localStorage.getItem("atlante.quiz.errors.v1") || "[]");
      for (const e of errRows) {
        const found = existing.find((x: any) => x.kind === e.kind && x.refId === e.ref_id);
        if (!found) {
          existing.push({ kind: e.kind, refId: e.ref_id, prompt: e.prompt });
        }
      }
      localStorage.setItem("atlante.quiz.errors.v1", JSON.stringify(existing));
    } catch { /* ignore */ }
  }
}

// ---------- FULL SYNC (PULL ONLY al login) ----------
// FIX BUG CRITICO: al login di un utente facciamo SOLO pull dal cloud.
// Il push dei dati locali avviene solo quando l'utente fa azioni esplicite
// (toggle preferito, spunta studied, setOverride).

export async function fullSync(user: User): Promise<void> {
  // SOLO PULL: scarica i dati dell'utente dal cloud e fa merge col locale.
  // NON spinge i dati locali al cloud (per evitare contaminazione tra account).
  await pullFromCloud(user);
}

// ---------- REALTIME SUBSCRIPTIONS ----------

let subscriptionsActive = false;

export function subscribeToRealtime(user: User): (() => void) | undefined {
  if (subscriptionsActive) return undefined;
  subscriptionsActive = true;

  const channel = supabase
    .channel("hubart-sync")
    .on("postgres_changes",
      { event: "*", schema: "public", table: "user_favorites", filter: `user_id=eq.${user.id}` },
      (payload) => {
        if (payload.eventType === "INSERT") {
          const f = getFavorites();
          const list = payload.new.type === "work" ? f.works : f.artists;
          if (!list.includes(payload.new.work_id)) {
            list.push(payload.new.work_id);
            setFavorites(f);
          }
        } else if (payload.eventType === "DELETE") {
          const f = getFavorites();
          if (payload.old.type === "work") {
            f.works = f.works.filter(id => id !== payload.old.work_id);
          } else {
            f.artists = f.artists.filter(id => id !== payload.old.work_id);
          }
          setFavorites(f);
        }
      }
    )
    .on("postgres_changes",
      { event: "*", schema: "public", table: "user_studied", filter: `user_id=eq.${user.id}` },
      (payload) => {
        if (payload.eventType === "INSERT") {
          const ids = getStudied();
          if (!ids.includes(payload.new.work_id)) {
            ids.push(payload.new.work_id);
            setStudied(ids);
          }
        } else if (payload.eventType === "DELETE") {
          const ids = getStudied().filter(id => id !== payload.old.work_id);
          setStudied(ids);
        }
      }
    )
    .on("postgres_changes",
      // Ascolta i cambiamenti agli override PRIVATI dell'utente corrente
      { event: "*", schema: "public", table: "image_overrides", filter: `user_id=eq.${user.id}` },
      (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          // Aggiorna solo se è un override privato (is_global=false)
          const row = payload.new as any;
          if (row.is_global === false || row.is_global === null) {
            const map = getOverrides();
            map[row.work_id] = { url: row.url, setAt: new Date().toISOString(), isGlobal: false };
            setOverrides(map);
          }
        } else if (payload.eventType === "DELETE") {
          const map = getOverrides();
          delete map[(payload.old as any).work_id];
          setOverrides(map);
        }
      }
    )
    .on("postgres_changes",
      // Ascolta i cambiamenti agli override GLOBALI (per tutti gli utenti)
      { event: "*", schema: "public", table: "image_overrides", filter: "is_global=eq.true" },
      (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const row = payload.new as any;
          const map = getGlobalOverrides();
          map[row.work_id] = { url: row.url, setAt: new Date().toISOString(), isGlobal: true, modifiedBy: row.modified_by };
          setGlobalOverrides(map);
        } else if (payload.eventType === "DELETE") {
          const map = getGlobalOverrides();
          delete map[(payload.old as any).work_id];
          setGlobalOverrides(map);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
    subscriptionsActive = false;
  };
}
