// ============================================================================
// Persistenza quiz in localStorage + sync Supabase cloud:
//  - banca errori (domande sbagliate, con conteggio risposte giuste di fila)
//  - statistiche ricche (storico sessioni, tassi per tipo/periodo, streak)
// Sync: push automatico ad ogni modifica, pull al login.
// ============================================================================
import type { QuizKind } from "./quiz";
import { supabase } from "./supabase";

const ERR_KEY = "atlante.quiz.errors.v1";
const STATS_KEY = "atlante.quiz.stats.v1";

// --- Push quiz errors al cloud (fire-and-forget) ---
function pushErrorsToCloud() {
  supabase.auth.getUser().then(async ({ data: { user } }) => {
    if (!user) return;
    try {
      const errors = loadErrors();
      if (errors.length === 0) {
        // NON eliminare dal cloud! Potrebbero esserci errori su altri dispositivi
        // che non sono ancora stati scaricati su questo.
        // L'eliminazione avviene solo via clearErrors() che chiama questa funzione.
        return;
      }
      const rows = errors.map(e => ({
        user_id: user.id,
        kind: e.kind,
        ref_id: e.refId,
        prompt: e.prompt,
        correct_streak: e.correctStreak,
        added_at: e.addedAt,
        last_seen: e.lastSeen,
      }));
      await supabase.from("quiz_errors").upsert(rows, { onConflict: "user_id,kind,ref_id" });
      // Elimina dal cloud gli errori che non sono più nel locale
      const localKeys = errors.map(e => `${e.kind}:${e.refId}`);
      const { data: cloudRows } = await supabase.from("quiz_errors")
        .select("kind,ref_id").eq("user_id", user.id);
      if (cloudRows) {
        const toDelete = cloudRows.filter((r: any) => !localKeys.includes(`${r.kind}:${r.ref_id}`));
        for (const r of toDelete) {
          await supabase.from("quiz_errors").delete()
            .eq("user_id", user.id).eq("kind", r.kind).eq("ref_id", r.ref_id);
        }
      }
    } catch { /* ignore */ }
  });
}

// --- Push quiz stats al cloud (fire-and-forget) ---
function pushStatsToCloud() {
  supabase.auth.getUser().then(async ({ data: { user } }) => {
    if (!user) return;
    try {
      const stats = loadStats();
      await supabase.from("quiz_stats").upsert({
        user_id: user.id,
        stats: JSON.stringify(stats),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    } catch { /* ignore */ }
  });
}

// --- BANCA ERRORI -----------------------------------------------------------
export interface ErrorEntry {
  kind: QuizKind;
  refId: string;
  prompt: string;
  correctStreak: number;   // risposte giuste consecutive in ripasso
  addedAt: number;
  lastSeen: number;
}

export function loadErrors(): ErrorEntry[] {
  try { return JSON.parse(localStorage.getItem(ERR_KEY) || "[]"); } catch { return []; }
}
function saveErrors(arr: ErrorEntry[]) {
  try { localStorage.setItem(ERR_KEY, JSON.stringify(arr)); } catch {}
}

/** registra un errore (o lo aggiorna, azzerando lo streak) */
export function addError(kind: QuizKind, refId: string, prompt: string) {
  const arr = loadErrors();
  const i = arr.findIndex((e) => e.kind === kind && e.refId === refId);
  const now = Date.now();
  if (i >= 0) { arr[i].correctStreak = 0; arr[i].lastSeen = now; arr[i].prompt = prompt; }
  else arr.push({ kind, refId, prompt, correctStreak: 0, addedAt: now, lastSeen: now });
  saveErrors(arr);
  pushErrorsToCloud();
}

/** in ripasso: risposta corretta → +1 streak; a 2 di fila esce dalla banca */
export function reviewAnswer(kind: QuizKind, refId: string, ok: boolean): { removed: boolean } {
  const arr = loadErrors();
  const i = arr.findIndex((e) => e.kind === kind && e.refId === refId);
  if (i < 0) return { removed: false };
  arr[i].lastSeen = Date.now();
  if (ok) {
    arr[i].correctStreak += 1;
    if (arr[i].correctStreak >= 2) { arr.splice(i, 1); saveErrors(arr); pushErrorsToCloud(); return { removed: true }; }
  } else {
    arr[i].correctStreak = 0;
  }
  saveErrors(arr);
  pushErrorsToCloud();
  return { removed: false };
}

export function clearErrors() {
  saveErrors([]);
  // Elimina esplicitamente dal cloud
  supabase.auth.getUser().then(async ({ data: { user } }) => {
    if (!user) return;
    try {
      await supabase.from("quiz_errors").delete().eq("user_id", user.id);
    } catch { /* ignore */ }
  });
}
export function errorCount(): number { return loadErrors().length; }

// --- STATISTICHE ------------------------------------------------------------
export interface SessionRecord {
  at: number;
  score: number;
  total: number;
  pct: number;
  mode: "normale" | "ripasso";
  kinds: QuizKind[];
}
export interface QuizStats {
  sessions: SessionRecord[];
  totalAnswered: number;
  totalCorrect: number;
  byKind: Record<string, { asked: number; correct: number }>;
  byPeriod: Record<string, { asked: number; correct: number }>;
  bestStreak: number;       // miglior streak di risposte corrette consecutive (storico)
  currentStreak: number;
  errorFreq: Record<string, number>; // chiave "kind:refId" → quante volte sbagliata
}

const EMPTY: QuizStats = {
  sessions: [], totalAnswered: 0, totalCorrect: 0,
  byKind: {}, byPeriod: {}, bestStreak: 0, currentStreak: 0, errorFreq: {},
};

export function loadStats(): QuizStats {
  try {
    const s = JSON.parse(localStorage.getItem(STATS_KEY) || "null");
    if (!s) return { ...EMPTY };
    return { ...EMPTY, ...s, byKind: s.byKind ?? {}, byPeriod: s.byPeriod ?? {}, errorFreq: s.errorFreq ?? {}, sessions: s.sessions ?? [] };
  } catch { return { ...EMPTY }; }
}
function saveStats(s: QuizStats) { try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch {} }

export interface AnswerLog {
  kind: QuizKind;
  refId: string;
  ok: boolean;
  periodId?: string;
  prompt: string;
}

/** registra l'esito di una sessione completa (aggiorna tutte le statistiche) */
export function recordSession(answers: AnswerLog[], mode: "normale" | "ripasso", kinds: QuizKind[]) {
  const s = loadStats();
  const score = answers.filter((a) => a.ok).length;
  const total = answers.length;
  if (total === 0) return s;
  s.sessions.push({ at: Date.now(), score, total, pct: Math.round((score / total) * 100), mode, kinds });
  if (s.sessions.length > 100) s.sessions = s.sessions.slice(-100);
  for (const a of answers) {
    s.totalAnswered++;
    if (a.ok) { s.totalCorrect++; s.currentStreak++; if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak; }
    else { s.currentStreak = 0; s.errorFreq[`${a.kind}:${a.refId}`] = (s.errorFreq[`${a.kind}:${a.refId}`] ?? 0) + 1; }
    const k = s.byKind[a.kind] ??= { asked: 0, correct: 0 };
    k.asked++; if (a.ok) k.correct++;
    if (a.periodId) { const p = s.byPeriod[a.periodId] ??= { asked: 0, correct: 0 }; p.asked++; if (a.ok) p.correct++; }
  }
  saveStats(s);
  pushStatsToCloud();
  // Notifica l'app di fare pull immediato delle quiz stats/errors dal cloud
  // (così l'utente vede subito le sue statistiche aggiornate su tutti i dispositivi)
  try { window.dispatchEvent(new Event("atlante:quiz-completed")); } catch { /* ignore */ }
  return s;
}

export function clearStats() { saveStats({ ...EMPTY }); pushStatsToCloud(); }
