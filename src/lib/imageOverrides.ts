// ============================================================================
// Immagini sostituite a mano.
//
// Cambiare la fotografia di un'opera e' cosa da amministratore, e vale per
// tutti: la sostituzione finisce nella tabella `works` (che ha lettura
// pubblica) e in `image_overrides` con `is_global = true`.
//
// C'era anche una seconda strada — la «correzione privata», visibile solo a
// chi l'aveva fatta — ed e' stata tolta. Non serviva a nessuno e faceva danno:
// la mappa locale delle correzioni private vive nel browser, non nell'account,
// e la sincronizzazione la rispediva sul server sotto l'identita' di chiunque
// entrasse da quel browser. Cosi' 186 correzioni sono finite duplicate sotto
// tre account come righe private, e al resto del mondo — sito e app —
// continuava a comparire la fotografia sbagliata: il Cristo in maesta' di San
// Lorenzo fuori le Mura mostrava a tutti un ritratto di papa Pio IX.
//
// Quello che resta della mappa privata nei browser e' inerte: non viene piu'
// letta, ne' scritta, ne' sincronizzata. Le funzioni che la toccano restano
// solo per poterla svuotare.
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
 * Sostituisce la fotografia di un'opera, per tutti. Solo un amministratore
 * puo' farlo: a chiunque altro la funzione non fa niente, e il comando non
 * viene nemmeno mostrato (Opera.tsx).
 */
export async function setOverride(workId: string, url: string) {
  const cleanUrl = url.trim();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = isAdminEmail(user?.email);
  if (!isAdmin) {
    console.warn("[imageOverrides] Solo un amministratore puo' cambiare un'immagine.");
    return;
  }

  const map = getGlobalOverrides();
  map[workId] = { url: cleanUrl, setAt: new Date().toISOString(), isGlobal: true, modifiedBy: user?.email };
  persistGlobal(map);

  // Via la vecchia voce privata, se in questo browser ce n'era una: e' quella
  // che teneva la correzione invisibile a tutti gli altri.
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
}

/**
 * Toglie la fotografia sostituita e rimette quella del catalogo. Cancella
 * anche l'eventuale vecchia voce privata rimasta in questo browser, che non
 * viene piu' letta ma tanto vale toglierla di mezzo.
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
  return Object.keys(getGlobalOverrides()).length;
}

export function exportOverrides(): string {
  return JSON.stringify(getGlobalOverrides(), null, 2);
}

export function importOverrides(json: string): number {
  const data = JSON.parse(json);
  if (typeof data !== "object" || data === null) throw new Error("JSON non valido");
  const globMap = getGlobalOverrides();
  let n = 0;
  for (const [id, v] of Object.entries<any>(data)) {
    const url = typeof v === "string" ? v : v?.url;
    if (typeof url === "string" && url.trim()) {
      globMap[id] = { url: url.trim(), setAt: v?.setAt ?? new Date().toISOString(), isGlobal: true };
      n++;
    }
  }
  persistGlobal(globMap);
  return n;
}

/**
 * Applica al catalogo le fotografie sostituite dagli amministratori.
 * Conserva gli originali in `_orig_*` per poterli ripristinare.
 *
 * Vale solo la mappa globale: la vecchia mappa privata non viene piu' letta.
 */
export function applyOverrides<T extends { id: string; image_url?: string | null; image_thumb?: string | null }>(works: T[]): T[] {
  const globMap = getGlobalOverrides();
  for (const w of works) {
    const anyW = w as any;
    if (anyW._orig_image_url === undefined) {
      anyW._orig_image_url = w.image_url ?? null;
      anyW._orig_image_thumb = w.image_thumb ?? null;
    }
    const glob = globMap[w.id];
    if (glob) {
      w.image_url = glob.url;
      w.image_thumb = glob.url;
    } else {
      w.image_url = anyW._orig_image_url;
      w.image_thumb = anyW._orig_image_thumb;
    }
  }
  return works;
}
