// ============================================================================
// Immagini personalizzate per le opere — override manuali.
//
// Due tipi di override:
//   1. PRIVATO  (is_global = false) → salvato in localStorage + tabella
//      image_overrides (riga con user_id dell'utente, is_global=false)
//      Visibile solo all'utente che lo ha creato.
//
//   2. GLOBALE  (is_global = true) → salvato in localStorage (chiave separata)
//      + tabella image_overrides (riga con is_global=true, modified_by=admin email)
//      Visibile a TUTTI gli utenti (anche anonimi). Solo admin può crearli.
//
// Precedenza in applyOverrides:
//   1. Override PRIVATO dell'utente (se esiste)
//   2. Override GLOBALE (se esiste)
//   3. URL originale dell'opera
// ============================================================================
import { supabase } from "./supabase";
import { isAdminEmail } from "./auth";

const KEY_PRIVATE = "atlante:image-overrides";
const KEY_GLOBAL = "atlante:image-overrides-global";
export const OVERRIDES_EVENT = "atlante:overrides-changed";

export interface ImageOverride { url: string; setAt: string; isGlobal?: boolean; modifiedBy?: string }
export type OverrideMap = Record<string, ImageOverride>;

// --- GET/SET localStorage (separati per privati e globali) ---
export function getOverrides(): OverrideMap {
  try { return JSON.parse(localStorage.getItem(KEY_PRIVATE) || "{}"); } catch { return {}; }
}
export function setOverrides(map: OverrideMap) {
  localStorage.setItem(KEY_PRIVATE, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent(OVERRIDES_EVENT));
}

export function getGlobalOverrides(): OverrideMap {
  try { return JSON.parse(localStorage.getItem(KEY_GLOBAL) || "{}"); } catch { return {}; }
}
export function setGlobalOverrides(map: OverrideMap) {
  localStorage.setItem(KEY_GLOBAL, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent(OVERRIDES_EVENT));
}

function persistPrivate(map: OverrideMap) {
  localStorage.setItem(KEY_PRIVATE, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent(OVERRIDES_EVENT));
}
function persistGlobal(map: OverrideMap) {
  localStorage.setItem(KEY_GLOBAL, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent(OVERRIDES_EVENT));
}

// --- API PUBBLICA ---

/**
 * Imposta un override. Se l'utente è admin → GLOBALE (visibile a tutti).
 * Se l'utente è normale → PRIVATO (solo per lui).
 */
export async function setOverride(workId: string, url: string) {
  const cleanUrl = url.trim();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = isAdminEmail(user?.email);

  if (isAdmin) {
    // Override GLOBALE
    const map = getGlobalOverrides();
    map[workId] = { url: cleanUrl, setAt: new Date().toISOString(), isGlobal: true, modifiedBy: user?.email };
    persistGlobal(map);

    // Via dalla mappa privata, se ci fosse finita prima. Non e' pulizia: la
    // sincronizzazione rispedisce quella mappa scrivendo `is_global: false`
    // esplicito (sync.ts), quindi una voce rimasta li' riporterebbe privata la
    // correzione appena resa pubblica, a ogni sincronizzazione, per sempre.
    const privati = getOverrides();
    if (privati[workId]) {
      delete privati[workId];
      persistPrivate(privati);
      if (user) {
        await supabase.from("image_overrides")
          .delete()
          .eq("user_id", user.id).eq("work_id", workId).eq("is_global", false);
      }
    }

    if (user) {
      // 1) AGGIORNA DIRETTAMENTE la tabella works — tutti gli utenti vedono
      //    l'immagine al primo fetch perché works ha SELECT pubblica.
      //    Usiamo .update() se la riga esiste già (preserva gli altri campi),
      //    altrimenti .upsert() con tutti i campi obbligatori non fornibili.
      //    In pratica l'opera esiste già sempre (l'admin la sta modificando),
      //    quindi UPDATE è la strada corretta e non tocca title/artist_ids ecc.
      const { error: worksErr } = await supabase
        .from("works")
        .update({
          image_url: cleanUrl,
          image_thumb: cleanUrl,
          modified_by: user.email,
        })
        .eq("id", workId);
      if (worksErr) {
        console.error("[imageOverrides] Errore update works:", worksErr.message);
      } else {
        console.log("[imageOverrides] works.image_url aggiornato per", workId);
      }

      // 2) Salva anche in image_overrides come GLOBALE (per realtime + sync).
      //    Gestione manuale del conflitto perché l'indice unico è PARTIZIALE
      //    (where is_global = true) e Supabase JS non supporta conflict target
      //    parziali. Faccio SELECT -> UPDATE/INSERT.
      try {
        const { data: existing, error: selErr } = await supabase
          .from("image_overrides")
          .select("id")
          .eq("work_id", workId)
          .eq("is_global", true)
          .maybeSingle();

        // Se la SELECT fallisce perché la colonna is_global non esiste
        // (migration non eseguita), fallback: upsert semplice con modified_by
        if (selErr && /is_global/.test(selErr.message)) {
          console.warn("[imageOverrides] Colonna is_global non trovata, fallback upsert semplice");
          const { error: upsErr } = await supabase
            .from("image_overrides")
            .upsert(
              { user_id: user.id, work_id: workId, url: cleanUrl, modified_by: user.email },
              { onConflict: "user_id,work_id" }
            );
          if (upsErr) console.error("[imageOverrides] Fallback upsert:", upsErr.message);
        } else if (existing?.id) {
          // UPDATE riga esistente
          const { error: updErr } = await supabase
            .from("image_overrides")
            .update({
              url: cleanUrl,
              modified_by: user.email,
              user_id: user.id,
            })
            .eq("id", existing.id);
          if (updErr) console.error("[imageOverrides] Update globale:", updErr.message);
        } else {
          // INSERT nuova riga
          const { error: insErr } = await supabase
            .from("image_overrides")
            .insert({
              user_id: user.id,
              work_id: workId,
              url: cleanUrl,
              is_global: true,
              modified_by: user.email,
            });
          if (insErr) console.error("[imageOverrides] Insert globale:", insErr.message);
        }
      } catch (e) {
        console.error("[imageOverrides] Exception saving global override:", e);
      }
      // NON dispatchiamo hubart-works-changed qui: causerebbe un reload
      // completo del dataset (clearDatasetCache + loadDataset) che lancia
      // una race condition con il poll dei globali. L'OVERRIDES_EVENT
      // dispatchato da persistGlobal() è sufficiente per il tab corrente.
      // Per gli altri tab, ci pensa il realtime subscription.
    }
  } else {
    // Override PRIVATO
    const map = getOverrides();
    map[workId] = { url: cleanUrl, setAt: new Date().toISOString(), isGlobal: false };
    persistPrivate(map);

    if (user) {
      await supabase.from("image_overrides").upsert(
        { user_id: user.id, work_id: workId, url: cleanUrl, is_global: false, modified_by: null },
        { onConflict: "user_id,work_id" }
      );
    }
  }
}

/**
 * Elimina un override. Determina automaticamente se privato o globale.
 * Gli admin possono eliminare i globali; gli utenti normali solo i propri.
 */
export async function clearOverride(workId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = isAdminEmail(user?.email);

  // Elimina dai PRIVATI (se esiste)
  const privMap = getOverrides();
  const hadPrivate = !!privMap[workId];
  delete privMap[workId];
  persistPrivate(privMap);

  // Elimina dai GLOBALI (solo se admin)
  if (isAdmin) {
    const globMap = getGlobalOverrides();
    const hadGlobal = !!globMap[workId];
    delete globMap[workId];
    persistGlobal(globMap);

    if (user && hadGlobal) {
      await supabase.from("image_overrides")
        .delete()
        .eq("work_id", workId)
        .eq("is_global", true);
    }
  }

  if (user && hadPrivate) {
    await supabase.from("image_overrides")
      .delete()
      .eq("user_id", user.id)
      .eq("work_id", workId)
      .eq("is_global", false);
  }
}

export function clearAllOverrides() {
  persistPrivate({});
  // NON cancella i globali (sono condivisi con altri utenti!)
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (user) supabase.from("image_overrides")
      .delete()
      .eq("user_id", user.id)
      .eq("is_global", false);
  });
}

export function overridesCount(): number {
  return Object.keys(getOverrides()).length + Object.keys(getGlobalOverrides()).length;
}

export function exportOverrides(): string {
  // Esporta sia privati che globali (con flag isGlobal)
  const all: OverrideMap = { ...getOverrides(), ...getGlobalOverrides() };
  return JSON.stringify(all, null, 2);
}

export function importOverrides(json: string): number {
  const data = JSON.parse(json);
  if (typeof data !== "object" || data === null) throw new Error("JSON non valido");
  const privMap = getOverrides();
  const globMap = getGlobalOverrides();
  let n = 0;
  for (const [id, v] of Object.entries<any>(data)) {
    const url = typeof v === "string" ? v : v?.url;
    const isGlobal = (typeof v === "object" && v?.isGlobal === true);
    if (typeof url === "string" && url.trim()) {
      const entry: ImageOverride = { url: url.trim(), setAt: v?.setAt ?? new Date().toISOString(), isGlobal };
      if (isGlobal) globMap[id] = entry; else privMap[id] = entry;
      n++;
    }
  }
  persistPrivate(privMap);
  persistGlobal(globMap);
  return n;
}

/**
 * Applica gli override a una lista di opere (mutazione controllata).
 * Conserva gli originali in campi _orig_* per poterli ripristinare.
 *
 * Ordine di precedenza:
 *   1. Override PRIVATO dell'utente corrente
 *   2. Override GLOBALE (admin)
 *   3. URL originale dell'opera
 */
export function applyOverrides<T extends { id: string; image_url?: string | null; image_thumb?: string | null }>(works: T[]): T[] {
  const privMap = getOverrides();
  const globMap = getGlobalOverrides();
  for (const w of works) {
    const anyW = w as any;
    if (anyW._orig_image_url === undefined) {
      anyW._orig_image_url = w.image_url ?? null;
      anyW._orig_image_thumb = w.image_thumb ?? null;
    }
    const priv = privMap[w.id];
    const glob = globMap[w.id];
    if (priv) {
      w.image_url = priv.url;
      w.image_thumb = priv.url;
    } else if (glob) {
      w.image_url = glob.url;
      w.image_thumb = glob.url;
    } else {
      w.image_url = anyW._orig_image_url;
      w.image_thumb = anyW._orig_image_thumb;
    }
  }
  return works;
}
