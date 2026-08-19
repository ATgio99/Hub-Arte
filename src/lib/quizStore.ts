// ============================================================================
// Persistenza quiz "patente" in localStorage:
//  - banca errori (domande sbagliate, con conteggio risposte giuste di fila)
//  - statistiche ricche (storico sessioni, tassi per tipo/periodo, streak)
// Tutto client-side, nessuna rete.
// ============================================================================
import type { QuizKind } from "./quiz";

const ERR_KEY = "atlante.quiz.errors.v1";
const STATS_KEY = "atlante.quiz.stats.v1";

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
}

/** in ripasso: risposta corretta → +1 streak; a 2 di fila esce dalla banca */
export function reviewAnswer(kind: QuizKind, refId: string, ok: boolean): { removed: boolean } {
  const arr = loadErrors();
  const i = arr.findIndex((e) => e.kind === kind && e.refId === refId);
  if (i < 0) return { removed: false };
  arr[i].lastSeen = Date.now();
  if (ok) {
    arr[i].correctStreak += 1;
    if (arr[i].correctStreak >= 2) { arr.splice(i, 1); saveErrors(arr); return { removed: true }; }
  } else {
    arr[i].correctStreak = 0;
  }
  saveErrors(arr);
  return { removed: false };
}

export function clearErrors() { saveErrors([]); }
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
  return s;
}

export function clearStats() { saveStats({ ...EMPTY }); }
