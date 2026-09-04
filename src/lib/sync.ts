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
import { getFavorites, setFavorites, filterTombstoned, getPendingAddsFor, eNostraEco } from "./favorites";
import { getStudied, setStudied, filterTombstonedStudied, getPendingAddsStudied, eNostraEcoStudied } from "./studied";
import { getOverrides, setOverrides, getGlobalOverrides, setGlobalOverrides } from "./imageOverrides";
import type { OverrideMap } from "./imageOverrides";
import type { User } from "@supabase/supabase-js";
import { isAdminEmail } from "./auth";

// ---------- PULL GLOBAL IMAGE OVERRIDES (per tutti, anche anonimi) ----------
// Questa funzione può essere chiamata anche senza utente (utente anonimo).
// Scarica TUTTI gli override globali (is_global=true) e fa MERGE nel localStorage
// sotto la chiave separata "atlante:image-overrides-global".
//
// IMPORTANTE: fa MERGE, non REPLACE. Non cancella MAI gli override locali.
// Motivo: se l'admin fa setOverride e poi il poll parte prima che la INSERT
// cloud sia visibile (race condition, ritardo di replica, RLS che blocca),
// il localStorage verrebbe svuotato e l'immagine tornerebbe al default.
// Il MERGE preserva sempre i dati locali; cloud vince solo su URL diverso.

// Le immagini scelte dagli amministratori valgono per tutti e cambiano di rado,
// ma venivano richieste a ogni caricamento di pagina da ogni dispositivo: nel
// log erano sedici richieste in trentasette secondi. Restano in sessionStorage
// per cinque minuti, e chi ricarica non le ripaga. Se un admin ne cambia una,
// il realtime la porta subito lo stesso.
const CHIAVE_IMG = "atlante:img-globali-lette";
const DURATA_IMG = 5 * 60 * 1000;

export async function pullGlobalImageOverrides(): Promise<void> {
  try {
    const letto = Number(sessionStorage.getItem(CHIAVE_IMG) || 0);
    if (Date.now() - letto < DURATA_IMG) return;
    sessionStorage.setItem(CHIAVE_IMG, String(Date.now()));
  } catch { /* sessionStorage negato: si procede */ }
  try {
    // Prova prima con il filtro is_global = true (richiede la migration)
    let { data, error } = await supabase
      .from("image_overrides")
      .select("work_id, url, modified_by, updated_at")
      .eq("is_global", true);

    // Se la colonna is_global non esiste (migration non eseguita),
    // fallback: scarica tutti gli override e filtra lato client quelli
    // con modified_by = email admin
    if (error) {
      console.log("[sync] is_global column not found, trying fallback...");
      const res = await supabase
        .from("image_overrides")
        .select("work_id, url, modified_by, updated_at");
      if (res.error) {
        console.error("[sync] Fallback also failed:", res.error.message);
        return;
      }
      // Filtra lato client: considera globali quelli con modified_by admin.
      // L'elenco sta in un posto solo (auth.tsx): copiato qui, dimenticava
      // l'alias corto della casella e faceva sparire delle correzioni.
      data = (res.data || []).filter((r: any) => isAdminEmail(r.modified_by));
    }

    if (!data || data.length === 0) {
      // NON cancellare il localStorage! Potrebbe contenere override appena
      // salvati dall'admin locale che non sono ancora visibili nel cloud
      // (race condition, ritardo di replica, RLS che blocca la INSERT).
      console.log("[sync] No global overrides in cloud, keeping local localStorage intact");
      return;
    }

    // MERGE: cloud vince su conflitti (URL diverso), ma non rimuove mai entry locali
    const localMap = getGlobalOverrides();
    const merged: OverrideMap = { ...localMap };
    let changed = false;
    for (const r of data) {
      const existing = merged[r.work_id];
      const cloudUrl = r.url;
      if (!existing || existing.url !== cloudUrl) {
        merged[r.work_id] = {
          url: cloudUrl,
          setAt: r.updated_at ?? new Date().toISOString(),
          isGlobal: true,
          modifiedBy: r.modified_by ?? undefined,
        };
        changed = true;
      }
    }
    if (changed) {
      setGlobalOverrides(merged);
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
  console.log("[sync] pushToCloud start for user:", uid);

  // 1) Preferiti — solo quelli che il cloud non ha ancora.
  //
  // Qui si riscrivevano TUTTE le righe locali a ogni sincronizzazione: 393
  // preferiti piu' 517 approfondite, novecento scritture per ogni caricamento
  // di pagina. E ogni riga scritta genera un evento che il realtime deve
  // consegnare al client: e' cosi' che si arrivava a «Too many postgres
  // changes messages per second».
  //
  // Si spinge quindi solo cio' che e' segnato come non ancora confermato: nel
  // caso normale sono zero righe, e la spinta non parte nemmeno.
  const daMandareWork = getPendingAddsFor("work");
  const daMandareArtist = getPendingAddsFor("artist");
  const favRows = [
    ...daMandareWork.map(work_id => ({ user_id: uid, work_id, type: "work" as const })),
    ...daMandareArtist.map(work_id => ({ user_id: uid, work_id, type: "artist" as const })),
  ];
  if (favRows.length > 0) {
    const { error } = await supabase.from("user_favorites").upsert(favRows, { onConflict: "user_id,work_id,type" });
    if (error) console.error("[sync] Error pushing favorites:", error.message);
    else console.log("[sync] Pushed", favRows.length, "favorites to cloud");
  } else {
    console.log("[sync] No local favorites to push");
  }

  // 2) Approfondite — stessa regola: solo quelle non ancora confermate.
  const studiedIds = getPendingAddsStudied();
  if (studiedIds.length > 0) {
    const studiedRows = studiedIds.map(work_id => ({ user_id: uid, work_id }));
    const { error } = await supabase.from("user_studied").upsert(studiedRows, { onConflict: "user_id,work_id" });
    if (error) console.error("[sync] Error pushing studied:", error.message);
    else console.log("[sync] Pushed", studiedRows.length, "studied to cloud");
  } else {
    console.log("[sync] No local studied to push");
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

  // 4) Quiz errors — push solo se ci sono errori locali
  try {
    const errors = JSON.parse(localStorage.getItem("atlante.quiz.errors.v1") || "[]");
    if (Array.isArray(errors) && errors.length > 0) {
      const errRows = errors.map((e: any) => ({
        user_id: uid,
        kind: e.kind,
        ref_id: e.refId,
        prompt: e.prompt || "",
        correct_streak: e.correctStreak || 0,
        added_at: e.addedAt || Date.now(),
        last_seen: e.lastSeen || Date.now(),
      }));
      await supabase.from("quiz_errors").upsert(errRows, { onConflict: "user_id,kind,ref_id" });
    }
  } catch { /* ignore */ }

  // 5) Quiz stats — push solo se ci sono statistiche locali
  try {
    const stats = JSON.parse(localStorage.getItem("atlante.quiz.stats.v1") || "null");
    if (stats && stats.totalAnswered > 0) {
      await supabase.from("quiz_stats").upsert({
        user_id: uid,
        stats: JSON.stringify(stats),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    }
  } catch { /* ignore */ }
}

// ---------- PULL FROM CLOUD (MERGE union locale + cloud) ----------
// Strategia MERGE:
//   - Unisci locale + cloud (union, deduplica).
//   - Il cloud NON sovrascrive il locale: entrambi contribuiscono.
//   - Questo è corretto perché:
//     1. toggleFavorite/toggleStudied pushano immediatamente al cloud
//     2. signOut pulisce il localStorage (no contaminazione cross-account)
//     3. Se l'utente aggiunge offline e poi fa sync, il merge preserva i dati locali

export async function pullFromCloud(user: User): Promise<void> {
  console.log("[sync] pullFromCloud start for user:", user.id);

  // 1) Favorites — REPLACE-with-pending
  //    Il cloud è la fonte di verità per le eliminazioni (se un ID non è nel cloud,
  //    è stato eliminato da qualche parte e va rimosso anche locale).
  //    MA preserviamo gli ID "pending": aggiunti localmente di recente e non ancora
  //    sincronizzati (es. offline add o UPSERT non ancora processato).
  const { data: favRows, error: favErr } = await supabase
    .from("user_favorites")
    .select("work_id, type")
    .eq("user_id", user.id);

  if (favErr) {
    console.error("[sync] Error fetching favorites:", favErr.message);
  } else {
    const cloudWorks = filterTombstoned("work", (favRows || []).filter(r => r.type === "work").map(r => r.work_id));
    const cloudArtists = filterTombstoned("artist", (favRows || []).filter(r => r.type === "artist").map(r => r.work_id));
    // Preserva gli ID pending (aggiunti localmente, non ancora nel cloud)
    const pendingWorks = getPendingAddsFor("work");
    const pendingArtists = getPendingAddsFor("artist");
    // REPLACE: cloud + pending (deduplicati). I locali-non-in-cloud-non-pending vengono scartati.
    const finalWorks = [...new Set([...cloudWorks, ...pendingWorks])];
    const finalArtists = [...new Set([...cloudArtists, ...pendingArtists])];
    setFavorites({ works: finalWorks, artists: finalArtists });
    console.log(`[sync] favorites: cloud ${cloudWorks.length}+${cloudArtists.length} + pending ${pendingWorks.length}+${pendingArtists.length} → ${finalWorks.length}+${finalArtists.length}`);
  }

  // 2) Studied — REPLACE-with-pending (stessa logica)
  const { data: studiedRows, error: studiedErr } = await supabase
    .from("user_studied")
    .select("work_id")
    .eq("user_id", user.id);

  if (studiedErr) {
    console.error("[sync] Error fetching studied:", studiedErr.message);
  } else {
    const cloudStudied = filterTombstonedStudied((studiedRows || []).map(r => r.work_id));
    const pendingStudied = getPendingAddsStudied();
    const finalStudied = [...new Set([...cloudStudied, ...pendingStudied])];
    setStudied(finalStudied);
    console.log(`[sync] studied: cloud ${cloudStudied.length} + pending ${pendingStudied.length} → ${finalStudied.length}`);
  }
  // NOTA: image overrides (privati + globali) sono stati estratti in
  // pullImageOverrides() — non vengono più scaricati ad ogni polling 30s,
  // ma solo al login e ogni 5 minuti (vedi App.tsx).
}

// ---------- PULL IMAGE OVERRIDES (privati + globali) ----------
// Estratta da pullFromCloud per ridurre il traffico: il polling automatico
// (ogni 30s) chiama solo pullFromCloud (favorites/studied), mentre
// pullImageOverrides viene chiamato:
//   - Al login (via fullSync)
//   - Ogni 5 minuti (polling separato, più lento)
//   - Al focus del tab (l'utente torna attivo)
// Questo riduce drasticamente le richieste a image_overrides
// (prima erano 169/ora = ~125k/mese, ora ~288/giorno = ~8.6k/mese).
export async function pullImageOverrides(user: User): Promise<void> {
  // 1) Image overrides PRIVATI dell'utente — merge (locale ha precedenza)
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

  // 2) Image overrides GLOBALI — per tutti gli utenti
  await pullGlobalImageOverrides();
}

// ---------- PULL QUIZ FROM CLOUD (solo quiz_errors + quiz_stats) ----------
// Estratta da pullFromCloud per ridurre il traffico: il polling automatico
// (ogni 30s) chiama solo pullFromCloud (favorites/studied/overrides),
// mentre pullQuizFromCloud viene chiamato solo:
//   - Al login (via fullSync)
//   - Dopo che l'utente completa un quiz (evento 'atlante:quiz-completed')
// Questo riduce drasticamente le richieste a quiz_errors/quiz_stats
// (prima erano 72 richieste/ora = ~52k/mese per tabella, ora 1-2/giorno).
export async function pullQuizFromCloud(user: User): Promise<void> {
  // 1) Quiz errors — MERGE cloud + locale
  const { data: errRows, error: errErr } = await supabase
    .from("quiz_errors")
    .select("kind, ref_id, prompt, correct_streak, added_at, last_seen")
    .eq("user_id", user.id);

  if (!errErr) {
    try {
      const local = JSON.parse(localStorage.getItem("atlante.quiz.errors.v1") || "[]");
      const cloudErrors = (errRows || []).map((e: any) => ({
        kind: e.kind,
        refId: e.ref_id,
        prompt: e.prompt || "",
        correctStreak: e.correct_streak || 0,
        addedAt: e.added_at || Date.now(),
        lastSeen: e.last_seen || Date.now(),
      }));
      // Merge: cloud vince, ma preserva locali non nel cloud
      const cloudKeys = new Set(cloudErrors.map((e: any) => `${e.kind}:${e.refId}`));
      for (const le of local) {
        if (!cloudKeys.has(`${le.kind}:${le.refId}`)) {
          cloudErrors.push(le);
        }
      }
      localStorage.setItem("atlante.quiz.errors.v1", JSON.stringify(cloudErrors));
      console.log(`[sync] quiz errors: cloud ${errRows?.length || 0} + local ${local.length} → ${cloudErrors.length}`);
    } catch { /* ignore */ }
  }

  // 2) Quiz stats — cloud vince se ha più sessioni
  const { data: statsRow, error: statsErr } = await supabase
    .from("quiz_stats")
    .select("stats, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!statsErr && statsRow && statsRow.stats) {
    try {
      const cloudStats = typeof statsRow.stats === "string"
        ? JSON.parse(statsRow.stats)
        : statsRow.stats;
      const localStats = JSON.parse(localStorage.getItem("atlante.quiz.stats.v1") || "null");
      // Cloud vince se: locale è vuoto O cloud ha più sessioni O cloud ha più risposte totali
      const cloudSessions = cloudStats.sessions?.length || 0;
      const localSessions = localStats?.sessions?.length || 0;
      const cloudAnswered = cloudStats.totalAnswered || 0;
      const localAnswered = localStats?.totalAnswered || 0;
      if (!localStats || cloudAnswered >= localAnswered) {
        localStorage.setItem("atlante.quiz.stats.v1", JSON.stringify(cloudStats));
        console.log(`[sync] quiz stats: cloud (${cloudSessions} sessions, ${cloudAnswered} answered) → locale`);
      } else {
        console.log(`[sync] quiz stats: locale (${localSessions} sessions, ${localAnswered} answered) > cloud → mantengo locale`);
      }
    } catch { /* ignore */ }
  }
}

// ---------- FULL SYNC (PULL ONLY al login) ----------
// FIX BUG CRITICO: al login di un utente facciamo SOLO pull dal cloud.
// Il push dei dati locali avviene solo quando l'utente fa azioni esplicite
// (toggle preferito, spunta studied, setOverride).

// ---------- FULL SYNC (push locale → cloud, poi pull cloud → locale) ----------
// 1. PUSH: spinge tutti i dati locali al cloud (upsert)
// 2. PULL: scarica dal cloud e fa merge
// Questo garantisce che se l'utente aggiunge un preferito sul telefono,
// al sync successivo (manuale o automatico) viene prima spedito al cloud,
// poi scaricato su tutti i dispositivi.

export async function fullSync(user: User): Promise<void> {
  console.log("[sync] fullSync start for user:", user.id);
  // 1. Push dei dati locali al cloud
  await pushToCloud(user);
  // 2. Pull dal cloud e merge (favorites/studied)
  await pullFromCloud(user);
  // 3. Pull quiz dal cloud (solo al login, non nel polling automatico)
  await pullQuizFromCloud(user);
  // 4. Pull image overrides (privati + globali) — solo al login e ogni 5 min
  await pullImageOverrides(user);
  console.log("[sync] fullSync complete");
}

// ---------- REALTIME SUBSCRIPTIONS ----------
//
// Qui c'era il difetto che ha prodotto centinaia di migliaia di chiamate al
// giorno. Tre cose andavano storte insieme:
//
// 1. Una variabile globale «subscriptionsActive» faceva da lucchetto. Se
//    l'effetto che chiama questa funzione veniva rilanciato mentre era ancora
//    dentro un await, la pulizia partiva prima che il canale esistesse: il
//    lucchetto restava chiuso per sempre, il canale vecchio non lo rimuoveva
//    piu' nessuno e ogni chiamata successiva tornava «undefined».
// 2. Il canale restava agganciato al token con cui era nato. Quando quel token
//    scadeva — dopo circa un'ora — il server lo rifiutava.
// 3. `.subscribe()` era chiamato senza callback di stato: l'errore era muto e
//    il client riprovava a connettersi da solo, all'infinito.
//
// Il risultato era un canale zombie che bussava alla porta tutto il giorno.
// Adesso: un solo canale tracciato in un riferimento, chiuso davvero quando si
// chiude, riautenticato a ogni rinnovo del token, e con un tetto ai tentativi
// oltre il quale si smette e si torna a sincronizzare al rientro sulla scheda.

// Postgres, quando cancella una riga, nell'evento di realtime manda solo le
// colonne che identificano la riga — di norma la chiave primaria. Non basta a
// capire quale preferito e' stato tolto, e infatti le cancellazioni fatte da un
// altro dispositivo non arrivavano mai: le aggiunte si vedevano, le rimozioni
// no, e i due dispositivi finivano su numeri diversi.
//
// Sul database e' stata messa `replica identity full` sulle due tabelle: senza,
// con il filtro per utente, l'evento di cancellazione non veniva proprio
// consegnato e le rimozioni fatte da un altro dispositivo non arrivavano mai.
// Adesso arrivano, ma il contenuto della riga resta oscurato dalle regole di
// sicurezza — quindi non sappiamo *quale* riga e' sparita. Si chiede allora una
// rilettura, una sola, dopo un secondo e mezzo. Costa due chiamate quando
// qualcuno toglie davvero qualcosa da un altro dispositivo, e niente il resto
// del tempo.
let rilettura: any = null;
function chiediRilettura(user: User) {
  if (rilettura) clearTimeout(rilettura);
  rilettura = setTimeout(() => { rilettura = null; pullFromCloud(user); }, 1500);
}

let canaleCorrente: ReturnType<typeof supabase.channel> | null = null;
let tentativiFalliti = 0;
const MAX_TENTATIVI = 4;

/** Chiude il canale in corso, se ce n'e' uno. Sempre sicuro da chiamare. */
export function chiudiRealtime() {
  if (canaleCorrente) {
    try { supabase.removeChannel(canaleCorrente); } catch { /* gia' chiuso */ }
    canaleCorrente = null;
  }
}

export function subscribeToRealtime(user: User): () => void {
  // Un canale alla volta: se ce n'era gia' uno lo si chiude, non lo si eredita.
  chiudiRealtime();
  tentativiFalliti = 0;

  const channel = supabase
    .channel(`hubart-sync-${user.id}`)
    .on("postgres_changes",
      { event: "*", schema: "public", table: "user_favorites", filter: `user_id=eq.${user.id}` },
      (payload) => {
        // L'eco delle nostre stesse scritture si lascia cadere: lo stato locale
        // e' gia' quello giusto, e riapplicarlo fa solo ridisegnare la pagina.
        const idEco = (payload.new as any)?.work_id ?? (payload.old as any)?.work_id;
        const tipoEco = (payload.new as any)?.type ?? (payload.old as any)?.type;
        if (idEco && tipoEco && eNostraEco(tipoEco, idEco)) return;
        if (payload.eventType === "INSERT") {
          const f = getFavorites();
          const list = payload.new.type === "work" ? f.works : f.artists;
          const newId = payload.new.work_id;
          // Rispetta le tombstones: se l'utente ha eliminato questo ID di recente,
          // non riaggiungerlo (a meno che non sia passato abbastanza tempo).
          const filtered = filterTombstoned(payload.new.type, [newId]);
          if (filtered.length > 0 && !list.includes(newId)) {
            list.push(newId);
            setFavorites(f);
          }
        } else if (payload.eventType === "DELETE") {
          const vecchio = payload.old as any;
          if (!vecchio || !vecchio.work_id || !vecchio.type) { chiediRilettura(user); return; }
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
        const idEco = (payload.new as any)?.work_id ?? (payload.old as any)?.work_id;
        if (idEco && eNostraEcoStudied(idEco)) return;
        if (payload.eventType === "INSERT") {
          const ids = getStudied();
          const newId = payload.new.work_id;
          // Rispetta le tombstones
          const filtered = filterTombstonedStudied([newId]);
          if (filtered.length > 0 && !ids.includes(newId)) {
            ids.push(newId);
            setStudied(ids);
          }
        } else if (payload.eventType === "DELETE") {
          const vecchio = payload.old as any;
          if (!vecchio || !vecchio.work_id) { chiediRilettura(user); return; }
          const ids = getStudied().filter(id => id !== vecchio.work_id);
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
    .subscribe((stato) => {
      if (stato === "SUBSCRIBED") {
        tentativiFalliti = 0;
        return;
      }
      if (stato === "CHANNEL_ERROR" || stato === "TIMED_OUT") {
        tentativiFalliti++;
        // Oltre il tetto si smette: insistere contro un server che risponde
        // «too many requests» produce solo altre richieste. La sincronizzazione
        // continua comunque al rientro sulla scheda.
        if (tentativiFalliti >= MAX_TENTATIVI) {
          console.warn(`[sync] Realtime non disponibile dopo ${MAX_TENTATIVI} tentativi: si continua senza, sincronizzando al rientro sulla scheda.`);
          chiudiRealtime();
        }
      }
    });

  canaleCorrente = channel;
  return () => {
    if (canaleCorrente === channel) chiudiRealtime();
  };
}


