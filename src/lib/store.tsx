import { createContext, useContext, useEffect, useState, useMemo, useCallback, ReactNode } from "react";
import { loadDataset, buildIndex, clearDatasetCache, Indexed } from "./data";
import { applyOverrides, OVERRIDES_EVENT } from "./imageOverrides";
import type { Work, Period, Artist, Term, Technique, ArtEvent } from "./types";

// ============================================================================
// Context dati — espone il dataset indicizzato a tutta l'app (invariato).
// ============================================================================
const Ctx = createContext<Indexed | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [ix, setIx] = useState<Indexed | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let dsRef: any = null;
    loadDataset()
      .then((ds) => {
        dsRef = ds;
        applyOverrides(ds.works);
        setIx(buildIndex(ds));
      })
      .catch((e) => setErr(String(e)));
    // immagini personalizzate cambiate → riapplica e re-indicizza
    const onOverrides = () => {
      if (!dsRef) return;
      applyOverrides(dsRef.works);
      setIx(buildIndex(dsRef));
    };
    window.addEventListener(OVERRIDES_EVENT, onOverrides);
    // Works overrides changed in admin → reload dataset
    const onStorage = () => {
      clearDatasetCache();
      loadDataset()
        .then((ds) => {
          dsRef = ds;
          applyOverrides(ds.works);
          setIx(buildIndex(ds));
        })
        .catch(() => {});
    };
    window.addEventListener("hubart-works-changed", onStorage);
    // BroadcastChannel: ascolta modifiche fatte dall'admin.html in ALTRO tab
    // (l'admin dispatcha questo evento quando fa CRUD su opere/artisti nel DB).
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("hubart-admin");
      bc.onmessage = () => onStorage();
    } catch { bc = null; }
    return () => {
      window.removeEventListener(OVERRIDES_EVENT, onOverrides);
      window.removeEventListener("hubart-works-changed", onStorage);
      bc?.close();
    };
  }, []);

  if (err) {
    return (
      <div className="loader-wrap">
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <h2 className="serif" style={{ fontSize: 28, marginBottom: 8 }}>Errore di caricamento</h2>
          <p className="muted">{err}</p>
        </div>
      </div>
    );
  }
  if (!ix) {
    return (
      <div className="loader-wrap">
        <div className="spinner" />
        <p className="muted" style={{ letterSpacing: ".2em", textTransform: "uppercase", fontSize: 12 }}>
          Apertura dell'archivio…
        </p>
      </div>
    );
  }
  return (
    <Ctx.Provider value={ix}>
      <TimeRangeProvider ix={ix}>{children}</TimeRangeProvider>
    </Ctx.Provider>
  );
}

export function useData(): Indexed {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData fuori dal DataProvider");
  return v;
}

// ============================================================================
// TIME-RANGE globale — stato condiviso che filtra TUTTE le viste.
// Persiste cambiando pagina (vive nel provider di livello app) e in localStorage.
// Non tocca il layer dati: offre solo helper di appartenenza all'intervallo.
// ============================================================================

export interface TimeRange { min: number; max: number; }

interface TimeRangeCtx {
  range: TimeRange;          // intervallo selezionato
  bounds: TimeRange;         // estremi assoluti del dataset
  setRange: (r: TimeRange) => void;
  reset: () => void;
  active: boolean;           // true se diverso dagli estremi
  // helper di appartenenza
  inRange: (yStart: number | null | undefined, yEnd?: number | null | undefined) => boolean;
  workIn: (w: Work) => boolean;
  periodIn: (p: Period) => boolean;
  artistIn: (a: Artist) => boolean;
  termIn: (t: Term) => boolean;
  techIn: (t: Technique) => boolean;
  eventIn: (e: ArtEvent) => boolean;
}

const TRCtx = createContext<TimeRangeCtx | null>(null);
const LS_KEY = "atlante.timerange.v1";

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function TimeRangeProvider({ ix, children }: { ix: Indexed; children: ReactNode }) {
  // estremi assoluti dal dataset (periodi + opere con anno)
  const bounds = useMemo<TimeRange>(() => {
    let lo = Infinity, hi = -Infinity;
    for (const p of ix.ds.periods) { lo = Math.min(lo, p.year_start); hi = Math.max(hi, p.year_end); }
    for (const w of ix.ds.works) {
      const ys = w.year_start ?? w.year_end, ye = w.year_end ?? w.year_start;
      if (ys != null) lo = Math.min(lo, ys);
      if (ye != null) hi = Math.max(hi, ye);
    }
    if (!isFinite(lo)) { lo = 280; hi = 1600; }
    // arrotonda a decenni per estetica
    return { min: Math.floor(lo / 10) * 10, max: Math.ceil(hi / 10) * 10 };
  }, [ix]);

  const [range, setRangeState] = useState<TimeRange>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const r = JSON.parse(raw);
        if (typeof r.min === "number" && typeof r.max === "number")
          return { min: clamp(r.min, bounds.min, bounds.max), max: clamp(r.max, bounds.min, bounds.max) };
      }
    } catch {}
    return bounds;
  });

  const setRange = useCallback((r: TimeRange) => {
    const next = {
      min: clamp(Math.min(r.min, r.max), bounds.min, bounds.max),
      max: clamp(Math.max(r.min, r.max), bounds.min, bounds.max),
    };
    setRangeState(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
  }, [bounds]);

  const reset = useCallback(() => setRange(bounds), [bounds, setRange]);

  const active = range.min > bounds.min || range.max < bounds.max;

  // un'entità è "nell'intervallo" se la sua estensione temporale interseca [min,max]
  const inRange = useCallback((yStart: number | null | undefined, yEnd?: number | null | undefined) => {
    const s = yStart ?? yEnd, e = yEnd ?? yStart;
    if (s == null && e == null) return true; // entità senza datazione: sempre visibile
    const lo = s ?? e!, hi = e ?? s!;
    return hi >= range.min && lo <= range.max;
  }, [range]);

  const workIn = useCallback((w: Work) => inRange(w.year_start, w.year_end), [inRange]);
  const periodIn = useCallback((p: Period) => inRange(p.year_start, p.year_end), [inRange]);
  const eventIn = useCallback((e: ArtEvent) => inRange(e.year, e.year_end), [inRange]);
  const artistIn = useCallback((a: Artist) => {
    if (a.birth != null || a.death != null) return inRange(a.birth, a.death);
    // fallback: periodi di appartenenza
    if (a.period_ids.length) return a.period_ids.some((pid) => {
      const p = ix.periodById.get(pid); return p ? inRange(p.year_start, p.year_end) : true;
    });
    return true;
  }, [inRange, ix]);
  const termIn = useCallback((t: Term) => {
    if (!t.period_ids.length) return true;
    return t.period_ids.some((pid) => { const p = ix.periodById.get(pid); return p ? inRange(p.year_start, p.year_end) : true; });
  }, [inRange, ix]);
  const techIn = useCallback((t: Technique) => {
    if (!t.first_period_id) return true;
    const p = ix.periodById.get(t.first_period_id);
    return p ? inRange(p.year_start, p.year_end) : true;
  }, [inRange, ix]);

  const value: TimeRangeCtx = {
    range, bounds, setRange, reset, active,
    inRange, workIn, periodIn, artistIn, termIn, techIn, eventIn,
  };
  return <TRCtx.Provider value={value}>{children}</TRCtx.Provider>;
}

export function useTimeRange(): TimeRangeCtx {
  const v = useContext(TRCtx);
  if (!v) throw new Error("useTimeRange fuori dal TimeRangeProvider");
  return v;
}
