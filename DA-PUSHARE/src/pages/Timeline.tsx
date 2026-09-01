import { useMemo, useRef, useState, useCallback, useEffect, type ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useData, useTimeRange } from "../lib/store";
import { periodMidYear, fmtYear } from "../lib/data";
import { FilterNote } from "../components/ui";
import Fullscreen from "../components/Fullscreen";
import TimeRangeSlider from "../components/TimeRangeSlider";
import PeriodDossier from "../components/PeriodDossier";
import { usePrefersReducedMotion, EASE_OUT } from "../lib/motion";
import type { Period, ArtEvent } from "../lib/types";

const TYPE_COLOR: Record<string, string> = { epoca: "#b88a2e", corrente: "#b9692c", scuola: "#4f7d72" };
// Le tre fasce della timeline, dalla piu' ampia alla piu' specifica. L'ordine
// qui e' anche l'ordine verticale delle fasce e dei filtri.
// Nella vista d'insieme si filtrano solo epoche e correnti. Le scuole sono
// settantasei: in una corsia unica diventavano illeggibili, e si raggiungono
// aprendo la scheda della corrente che le contiene.
const TIMELINE_TYPES = ["epoca", "corrente"] as const;
const TYPE_LABEL: Record<string, string> = { epoca: "Epoche", corrente: "Correnti", scuola: "Scuole" };
const EVENT_COLOR: Record<string, string> = { politico: "#a8483f", religioso: "#9a6a92", culturale: "#6e8350", tecnologico: "#5f7e8c" };
const EVENT_LABEL: Record<string, string> = { politico: "Politico", religioso: "Religioso", culturale: "Culturale", tecnologico: "Tecnologico" };

interface LaneItem extends Period { lane: number; }

function layoutLanes(periods: Period[]): LaneItem[] {
  const out: LaneItem[] = [];
  const byType: Record<string, Period[]> = { epoca: [], corrente: [], scuola: [] };
  periods.forEach((p) => (byType[p.type] ?? byType.corrente).push(p));
  let laneBase = 0;
  // Dall'alto verso il basso: epoche, poi correnti, poi scuole.
  for (const type of ["epoca", "corrente", "scuola"]) {
    const arr = (byType[type] ?? []).slice().sort((a, b) => a.year_start - b.year_start);
    const laneEnds: number[] = [];
    for (const p of arr) {
      let lane = laneEnds.findIndex((end) => p.year_start >= end - 4);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
      laneEnds[lane] = p.year_end;
      out.push({ ...p, lane: laneBase + lane });
    }
    laneBase += Math.max(laneEnds.length, 1) + 0.4;
  }
  return out;
}

// ---------------------------------------------------------------------------
// CORSIA EVENTI
// ---------------------------------------------------------------------------
const EV_ROWS = 3;
const DOT_GAP = 13;
const LABEL_PAD = 9;

interface EvNode {
  kind: "single" | "cluster";
  x: number; row: number;
  ev?: ArtEvent;
  members?: ArtEvent[];
  catKind: string;
  count: number;
  labelText: string;
}

function layoutEvents(events: ArtEvent[], xOf: (y: number) => number, charPx: number): EvNode[] {
  // Un evento senza anno non e' collocabile su un asse temporale: senza questo
  // filtro finiva in una posizione arbitraria, trascinando con se' il calcolo
  // dei raggruppamenti vicini.
  const sorted = events
    .filter((e) => typeof e.year === "number" && Number.isFinite(e.year))
    .sort((a, b) => a.year - b.year);
  const groups: ArtEvent[][] = [];
  for (const e of sorted) {
    const last = groups[groups.length - 1];
    if (last && xOf(e.year) - xOf(last[last.length - 1].year) < DOT_GAP) {
      last.push(e);
    } else {
      groups.push([e]);
    }
  }

  const rowEnds = new Array(EV_ROWS).fill(-Infinity);
  const nodes: EvNode[] = [];
  for (const g of groups) {
    const gx = xOf(g[0].year);
    let row = -1, best = Infinity;
    for (let r = 0; r < EV_ROWS; r++) {
      if (gx - rowEnds[r] >= DOT_GAP) { row = r; break; }
      if (rowEnds[r] < best) { best = rowEnds[r]; }
    }
    if (row === -1) {
      row = rowEnds.indexOf(Math.min(...rowEnds));
      const prevOnRow = [...nodes].reverse().find((n) => n.row === row);
      if (prevOnRow && gx - prevOnRow.x < DOT_GAP) {
        const merged = (prevOnRow.members ?? (prevOnRow.ev ? [prevOnRow.ev] : [])).concat(g);
        prevOnRow.kind = "cluster"; prevOnRow.members = merged; prevOnRow.ev = undefined;
        prevOnRow.count = merged.length; prevOnRow.labelText = `×${merged.length}`;
        rowEnds[row] = gx;
        continue;
      }
    }
    rowEnds[row] = gx;
    if (g.length === 1) {
      nodes.push({ kind: "single", x: gx, row, ev: g[0], catKind: g[0].kind, count: 1, labelText: g[0].title });
    } else {
      const counts: Record<string, number> = {};
      g.forEach((e) => { counts[e.kind] = (counts[e.kind] ?? 0) + 1; });
      const dom = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      nodes.push({ kind: "cluster", x: gx, row, members: g, catKind: dom, count: g.length, labelText: `×${g.length}` });
    }
  }

  const byRow: Record<number, EvNode[]> = {};
  nodes.forEach((n) => { (byRow[n.row] ??= []).push(n); });
  (Object.values(byRow) as EvNode[][]).forEach((row) => {
    row.sort((a, b) => a.x - b.x);
    for (let i = 0; i < row.length; i++) {
      const n = row[i];
      (n as any).showLabel = false;
      if (n.kind === "cluster") continue;
      const txt = n.labelText;
      const w = txt.length * charPx + LABEL_PAD;
      const nextX = i + 1 < row.length ? row[i + 1].x : Infinity;
      if (n.x + 7 + w < nextX - 4) (n as any).showLabel = true;
    }
  });

  return nodes;
}

function useSmoothZoom(target: number, reduced: boolean) {
  const [z, setZ] = useState(target);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (reduced) { setZ(target); return; }
    const start = performance.now();
    const from = z;
    const dur = 380;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setZ(from + (target - from) * e);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reduced]);
  return z;
}

interface Tip { x: number; y: number; html: string; }
interface Popover { x: number; y: number; node: EvNode; }

function EventCard({ e, onGo, ix }: { e: ArtEvent; onGo: (pid: string) => void; ix: ReturnType<typeof useData> }) {
  const period = e.period_id ? ix.periodById.get(e.period_id) : null;
  const col = EVENT_COLOR[e.kind] ?? "#888";
  return (
    <div>
      <div className="ev-pop-kind" style={{ color: col }}>{EVENT_LABEL[e.kind] ?? e.kind}</div>
      <div className="ev-pop-title">{e.title}</div>
      <div className="faint tnum" style={{ fontSize: 12, marginBottom: 8 }}>{fmtYear(e.year)}{e.year_end ? `–${fmtYear(e.year_end)}` : ""}</div>
      <p className="muted" style={{ fontSize: 13, lineHeight: 1.55, marginBottom: period ? 12 : 0 }}>{e.description}</p>
      {period && (
        <button className="btn gold sm" onClick={() => onGo(period.id)} data-testid="ev-pop-go">Apri «{period.name}» →</button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN TIMELINE PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function Timeline() {
  const [, setFull] = useState(false);
  return (
    <div className="wrap page" style={{ paddingBottom: 24 }}>
      <div className="page-head">
        <div className="page-eyebrow"><span className="eyebrow">Visualizzazione <span style={{ fontSize: 9, fontWeight: 700, color: "var(--ink-dim)", opacity: 0.5, textTransform: "lowercase", letterSpacing: "0.02em" }}>(beta)</span></span></div>
        <h1 className="page-title">Linea del tempo multilivello</h1>
        <p className="page-lead">Epoche e correnti scorrono su corsie parallele: le sovrapposizioni temporali sono visibili, gli archi tracciano i flussi di contaminazione e gli eventi storici ancorano il contesto. Clicca una barra per espandere l'anteprima del periodo — con personaggi, autori, opere e glossario da ricordare — un pallino per il dettaglio dell'evento. Le scuole e le botteghe si trovano dentro la scheda della corrente che le contiene.</p>
      </div>
      <div className="page-rule" />
      <TimelineShell onFull={setFull} />
    </div>
  );
}

// Shell della linea del tempo: periodi su corsie per tipo
function TimelineShell({ onFull }: { onFull: (b: boolean) => void }) {
  const ix = useData();
  const { periodIn } = useTimeRange();
  const [showFlows, setShowFlows] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [inFull, setInFull] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  // Le scuole non compaiono nella linea del tempo: restano sempre in questo
  // insieme, e non c'e' un filtro per riaccenderle (vedi TIMELINE_TYPES).
  const [hideTypes, setHideTypes] = useState<Set<string>>(new Set(["scuola"]));
  // PID del periodo da evidenziare (pulse) dopo click su risultato di ricerca.
  const [highlightPid, setHighlightPid] = useState<string | null>(null);

  const allPeriods = ix.ds.periods;
  const periods = useMemo(() => allPeriods.filter((p) => periodIn(p) && !hideTypes.has(p.type)), [allPeriods, periodIn, hideTypes]);

  // Conteggio periodi per tipo (per mostrare il numero accanto al filtro).
  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { epoca: 0, corrente: 0, scuola: 0 };
    for (const p of allPeriods) if (periodIn(p)) c[p.type] = (c[p.type] ?? 0) + 1;
    return c;
  }, [allPeriods, periodIn]);

  const toggleType = (t: string) => {
    setHideTypes((prev) => {
      const n = new Set(prev);
      n.has(t) ? n.delete(t) : n.add(t);
      return n;
    });
  };

  // === Ricerca globale ===
  // Cerca tra i periodi. Risultati in un dropdown sotto la barra, come nel grafo.
  const searchResults = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    const results: { type: "period"; id: string; label: string; subtitle?: string }[] = [];
    for (const p of ix.ds.periods) {
      if (p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) {
        results.push({
          type: "period",
          id: p.id,
          label: p.name,
          subtitle: `${fmtYear(p.year_start)}–${fmtYear(p.year_end)}`,
        });
        if (results.length >= 20) break;
      }
    }
    return results;
  }, [searchQ, ix]);

  const legendEntries = Object.entries(TYPE_COLOR);

  // Toggle chips per flussi/eventi/artisti (usati sia nella barra superiore
  // che nella colonna destra in fullscreen, per coerenza con il grafo).
  const ToggleChip = ({ active, onClick, children, testId }: { active: boolean; onClick: () => void; children: ReactNode; testId?: string }) => (
    <span
      className={`chip sm ${active ? "active" : ""}`}
      onClick={onClick}
      data-testid={testId}
      style={{ cursor: "pointer", userSelect: "none" }}
    >
      {children}
    </span>
  );

  // Barra di ricerca — riusata sia in modalità normale (sopra la timeline)
  // che in fullscreen (dentro il sideFiltersBlock della colonna destra).
  // Quando si clicca un risultato:
  //  - periodo: imposta highlightPid per far pulsare la barra, NON naviga via
  //  - artista: naviga alla scheda (come in Mappa/Rete)
  const handleSelectResult = (r: { type: "period" | "artist"; id: string }) => {
    setSearchQ("");
    if (r.type === "period") {
      setHighlightPid(r.id);
      // Auto-reset dopo 2.5s (il pulse dura 2s)
      setTimeout(() => setHighlightPid(null), 2500);
    }
    // Per gli artisti, il Link naviga automaticamente
  };

  const searchBar = (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={searchQ}
        onChange={(e) => setSearchQ(e.target.value)}
        placeholder="Cerca periodo…"
        data-testid="tl-search"
        style={{
          width: "100%", padding: "8px 12px",
          border: "1px solid var(--line)", borderRadius: 6,
          background: "var(--bg)", color: "var(--ink)",
          fontSize: 13, fontFamily: "inherit",
        }}
      />
      {searchQ.trim() && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
          background: "var(--bg-1)", border: "1px solid var(--line)",
          borderRadius: "0 0 8px 8px", boxShadow: "0 8px 24px rgba(0,0,0,.12)",
          maxHeight: 320, overflowY: "auto",
        }}>
          {searchResults.length === 0 ? (
            <div style={{ padding: "12px 14px", color: "var(--ink-dim)", fontSize: 13 }}>
              Nessun risultato per "{searchQ}".
            </div>
          ) : (
            searchResults.map((r) => {
              // Periodo: non naviga, imposta highlightPid per il pulse
              return (
                <button
                  key={`${r.type}:${r.id}`}
                  onClick={() => handleSelectResult(r)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%",
                    padding: "8px 12px", borderBottom: "1px solid var(--line-soft)",
                    background: "transparent", border: 0, borderBottomWidth: 1,
                    cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                    color: "var(--ink)",
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#b88a2e", flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, display: "block" }}>{r.label}</span>
                    {r.subtitle && <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>{r.subtitle}</span>}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Periodo</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );

  // Colonna destra: ricerca, tempo, vista (con tutti i filtri in stile lista).
  // Sempre visibile (sia in modalità normale che in fullscreen), come nel grafo.
  // La sezione "Legenda" è stata rimossa su richiesta utente (non utile).
  // Tutti i filtri (flussi, eventi, tipi di periodo) sono sotto "Vista"
  // con stile lista (pallino + nome + conteggio a destra), non pulsanti.
  const sideFiltersBlock = (
    <div className="panel" data-testid="tl-fs-filters">
      <div className="panel-title" style={{ fontSize: 15, marginBottom: 10 }}>Cerca</div>
      <div style={{ marginBottom: 14 }}>
        {searchBar}
      </div>
      <div className="panel-title" style={{ fontSize: 15, marginBottom: 10 }}>Tempo</div>
      <div style={{ margin: "0 -4px 14px" }}>
        <TimeRangeSlider compact />
      </div>
      <div className="panel-title" style={{ fontSize: 15, marginBottom: 8 }}>Vista</div>
      {/* Comandi zoom — sempre visibili nel riquadro filtri (non solo fullscreen).
          Stile tl-zoom-float con simboli chiari e dimensioni uniformi. */}
      <div className="tl-zoom-controls" style={{ marginBottom: 10 }}>
        <button className="tl-zoom-btn" onClick={() => window.dispatchEvent(new CustomEvent("atlante:tl-zoom", { detail: "out" }))} aria-label="Riduci zoom" data-testid="tl-zoom-out" title="Riduci zoom">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14" /></svg>
        </button>
        <button className="tl-zoom-btn tl-zoom-reset" onClick={() => window.dispatchEvent(new CustomEvent("atlante:tl-zoom", { detail: "reset" }))} aria-label="Reset zoom" data-testid="tl-zoom-reset" title="Reset zoom">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
        </button>
        <button className="tl-zoom-btn" onClick={() => window.dispatchEvent(new CustomEvent("atlante:tl-zoom", { detail: "in" }))} aria-label="Aumenta zoom" data-testid="tl-zoom-in" title="Aumenta zoom">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>
      {/* Tutti i filtri in stile lista (pallino + nome + conteggio).
          Comprende: flussi, eventi, autori (toggle vista) + epoca/corrente (vista periodi)
          o Pittori/Scultori/... (vista autori). */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 14 }}>
        {/* Toggle: flussi */}
        <button
          onClick={() => setShowFlows((v) => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "6px 4px", background: "transparent", border: 0,
            cursor: "pointer", textAlign: "left", fontFamily: "inherit",
            color: "var(--ink)", opacity: showFlows ? 1 : 0.4,
          }}
        >
          <span className="dot" style={{ background: "#b88a2e", flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 12.5 }}>↝ flussi</span>
        </button>
        {/* Toggle: eventi */}
        <button
          onClick={() => setShowEvents((v) => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "6px 4px", background: "transparent", border: 0,
            cursor: "pointer", textAlign: "left", fontFamily: "inherit",
            color: "var(--ink)", opacity: showEvents ? 1 : 0.4,
          }}
        >
          <span className="dot" style={{ background: "#a8483f", flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 12.5 }}>◆ eventi</span>
        </button>
        {/* Filtri per tipo di periodo */}
        {TIMELINE_TYPES.map((t) => {
          const c = TYPE_COLOR[t];
          const off = hideTypes.has(t);
          const count = typeCounts[t] ?? 0;
          return (
            <button
              key={t}
              onClick={() => toggleType(t)}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "6px 4px", background: "transparent", border: 0,
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                color: "var(--ink)", opacity: off ? 0.4 : 1,
              }}
            >
              <span className="dot" style={{ background: c, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12.5 }}>{TYPE_LABEL[t] ?? t}</span>
              <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Barra superiore: solo contatore.
          I comandi zoom sono nel riquadro filtri a destra (sempre visibili). */}
      <div className="filterbar" style={{ marginBottom: 14, gap: 14, alignItems: "center" }}>
        <div style={{ marginLeft: "auto" }}>
          <FilterNote total={allPeriods.length} shown={periods.length} noun="periodi" />
        </div>
      </div>

      <Fullscreen title="Linea del tempo" controls={null} showSlider={false} onChange={(f) => { setInFull(f); onFull(f); }}>
        <div className="gf-inner">
          <TimelineCanvasControlled
            showFlows={showFlows}
            showEvents={showEvents}
            inFullscreen={inFull}
            hideTypes={hideTypes}
            highlightPid={highlightPid}
          />
          <div className="gf-side">
            {sideFiltersBlock}
          </div>
        </div>
      </Fullscreen>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  ORIGINAL PERIOD TIMELINE CANVAS (unchanged)
// ═══════════════════════════════════════════════════════════════════════════
function TimelineCanvasControlled({ showFlows, showEvents, inFullscreen, hideTypes, highlightPid }:
  { showFlows: boolean; showEvents: boolean; inFullscreen: boolean; hideTypes: Set<string>; highlightPid: string | null }) {
  const ix = useData();
  const nav = useNavigate();
  const { range, periodIn, eventIn } = useTimeRange();
  const reduced = usePrefersReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [zoomTarget, setZoomTarget] = useState(1);
  const zoom = useSmoothZoom(zoomTarget, reduced);
  // Ascolta i comandi zoom esterni (dalla barra superiore di TimelineShell
  // o dalla sezione VISTA in fullscreen). L'evento custom "atlante:tl-zoom"
  // ha detail = "in" | "out" | "reset".
  useEffect(() => {
    const onZoom = (e: Event) => {
      const detail = (e as CustomEvent).detail as "in" | "out" | "reset";
      if (detail === "in") setZoomTarget((z) => Math.min(5, +(z + 0.4).toFixed(2)));
      else if (detail === "out") setZoomTarget((z) => Math.max(0.5, +(z - 0.4).toFixed(2)));
      else if (detail === "reset") setZoomTarget(1);
    };
    window.addEventListener("atlante:tl-zoom", onZoom);
    return () => window.removeEventListener("atlante:tl-zoom", onZoom);
  }, []);
  const [hover, setHover] = useState<Tip | null>(null);
  const [pop, setPop] = useState<Popover | null>(null);
  const [selPid, setSelPid] = useState<string | null>(null);
  const [scrollX, setScrollX] = useState(0);
  const [stageW, setStageW] = useState(800);

  const allPeriods = ix.ds.periods;
  const periods = useMemo(
    () => allPeriods.filter((p) => periodIn(p) && !hideTypes.has(p.type)),
    [allPeriods, periodIn, hideTypes]
  );
  const minY = useMemo(() => (periods.length ? Math.min(...periods.map((p) => p.year_start)) : range.min), [periods, range]);
  const maxY = useMemo(() => (periods.length ? Math.max(...periods.map((p) => p.year_end)) : range.max), [periods, range]);
  const lanes = useMemo(() => layoutLanes(periods), [periods]);
  const laneCount = useMemo(() => (lanes.length ? Math.ceil(Math.max(...lanes.map((l) => l.lane)) + 1) : 1), [lanes]);

  const PPY = 1.05 * zoom;
  const PAD = 60;
  const width = Math.max((maxY - minY) * PPY + PAD * 2, 600);
  const LANE_H = 48;
  const TOP = 70;
  const EV_ROW_H = 26;
  // Eventi spostati in alto: appena sotto gli anni (y=38), sopra le corsie.
  // Le corsie dei periodi iniziano a TOP=70, quindi gli eventi occupano lo
  // spazio tra ~y=44 e y=TOP. Usiamo una singola riga di eventi compatti.
  const eventsTop = 44;  // era: TOP + laneCount * LANE_H + 30
  const lanesTop = TOP + EV_ROWS * EV_ROW_H + 20;  // corsie periodi spostate sotto gli eventi
  const height = lanesTop + laneCount * LANE_H + 56 + (selPid ? 410 : 0);

  const x = useCallback((year: number) => PAD + (year - minY) * PPY, [minY, PPY]);

  // === Highlight + scroll automatico quando si seleziona un periodo dalla
  //     barra di ricerca. highlightPid viene impostato da TimelineShell e
  //     rimane attivo per ~2.5s. Durante quel periodo la barra del periodo
  //     corrispondente pulsa. Inoltre scorriamo la timeline in modo che la
  //     barra sia visibile e apriamo il dossier. ===
  useEffect(() => {
    if (!highlightPid) return;
    setSelPid(highlightPid);
    const p = periods.find((pp) => pp.id === highlightPid);
    if (!p) return;
    const el = scrollRef.current;
    if (!el) return;
    const targetX = x(p.year_start) - 200;
    el.scrollTo({ left: Math.max(0, targetX), behavior: "smooth" });
  }, [highlightPid, periods, x]);

  const flows = useMemo(() => {
    const byId = new Map(lanes.map((l) => [l.id, l]));
    return ix.ds.connections
      .filter((c) => c.source_type === "period" && c.target_type === "period" && byId.has(c.source_id) && byId.has(c.target_id))
      .map((c) => ({ a: byId.get(c.source_id)!, b: byId.get(c.target_id)!, kind: c.kind, desc: c.description }))
      .filter((f) => f.a.id !== f.b.id);
  }, [ix, lanes]);

  // Restano fuori dalla linea del tempo gli eventi che cadono oltre l'arco dei
  // periodi: sono soprattutto vicende successive delle opere (restauri, danni,
  // l'alluvione del 1966, l'incendio di Notre-Dame), che appartengono alla
  // storia conservativa e non a quella dell'arte qui rappresentata. Verrebbero
  // comunque disegnate fuori dall'area visibile.
  const visibleEvents = useMemo(
    () => ix.ds.events.filter((e) => eventIn(e) && typeof e.year === "number" && e.year >= minY && e.year <= maxY),
    [ix, eventIn, minY, maxY]
  );
  const evNodes = useMemo(() => layoutEvents(visibleEvents, x, 6.2), [visibleEvents, x]);
  const labelsShown = useMemo(() => evNodes.filter((n: any) => n.showLabel).length, [evNodes]);

  const ticks = useMemo(() => {
    const t: number[] = [];
    const span = maxY - minY;
    const step = span > 900 ? 100 : span > 400 ? 50 : 25;
    const start = Math.ceil(minY / step) * step;
    for (let y = start; y <= maxY; y += step) t.push(y);
    return t;
  }, [minY, maxY]);

  const laneY = (lane: number) => lanesTop + lane * LANE_H;

  const DH = 410;
  const selLane = useMemo(() => {
    const l = lanes.find((x) => x.id === selPid);
    return l ? l.lane : null;
  }, [lanes, selPid]);
  useEffect(() => { if (selPid && !lanes.some((l) => l.id === selPid)) setSelPid(null); }, [lanes, selPid]);
  const laneShift = useCallback((lane: number) => (selLane != null && lane > selLane ? DH : 0), [selLane]);
  const globalShift = selLane != null ? DH : 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStageW(el.clientWidth));
    ro.observe(el); setStageW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!pop) return;
    const close = () => setPop(null);
    const t = setTimeout(() => window.addEventListener("click", close), 0);
    return () => { clearTimeout(t); window.removeEventListener("click", close); };
  }, [pop]);

  const openEvent = (e: ArtEvent, clientX: number, clientY: number) =>
    setPop({ x: clientX, y: clientY, node: { kind: "single", x: 0, row: 0, ev: e, catKind: e.kind, count: 1, labelText: e.title } });

  const stagger = !reduced;

  return (
    <>
      <div className="stage" style={{ overflowX: "auto", overflowY: inFullscreen ? "auto" : "hidden", flex: inFullscreen ? 1 : undefined, height: inFullscreen ? "100%" : undefined, border: inFullscreen ? 0 : undefined, borderRadius: inFullscreen ? 0 : undefined }}
        ref={scrollRef} data-testid="timeline-stage" onMouseLeave={() => setHover(null)}
        onScroll={(e) => setScrollX((e.target as HTMLElement).scrollLeft)}>
        <svg width={width} height={Math.max(height, inFullscreen ? 600 : height)} style={{ display: "block", minWidth: "100%" }}>
          {ticks.map((y) => (
            <g key={y}>
              <line x1={x(y)} y1={48} x2={x(y)} y2={eventsTop - 4} stroke="var(--line-soft)" strokeWidth={1} />
              {/* Linea verticale che attraversa le corsie periodi ma non gli eventi */}
              <line x1={x(y)} y1={eventsTop + EV_ROWS * EV_ROW_H + 4} x2={x(y)} y2={lanesTop + laneCount * LANE_H} stroke="var(--line-soft)" strokeWidth={1} />
              <text x={x(y)} y={38} fill="var(--ink-faint)" fontSize={11} textAnchor="middle" fontFamily="var(--font-body)" style={{ fontVariantNumeric: "tabular-nums" }}>{fmtYear(y)}</text>
            </g>
          ))}

          {showFlows && flows.map((f, i) => {
            const x1 = x(periodMidYear(f.a)), y1 = laneY(f.a.lane) + 14 + laneShift(f.a.lane);
            const x2 = x(periodMidYear(f.b)), y2 = laneY(f.b.lane) + 14 + laneShift(f.b.lane);
            const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - 26 - Math.abs(f.a.lane - f.b.lane) * 6;
            return (
              <path key={i} d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`} fill="none"
                stroke="var(--gold)" strokeWidth={1.2} opacity={0.4} strokeDasharray="3 3"
                onMouseEnter={(e) => setHover({ x: (e as any).clientX, y: (e as any).clientY, html: `<b>${f.a.name}</b> → <b>${f.b.name}</b><br>${f.desc}` })}
                onMouseLeave={() => setHover(null)} style={{ cursor: "help" }} />
            );
          })}

          {lanes.map((p, i) => {
            const bx = x(p.year_start), bw = Math.max((p.year_end - p.year_start) * PPY, 10);
            const by = laneY(p.lane);
            const col = TYPE_COLOR[p.type] ?? "#888";
            const isHighlight = highlightPid === p.id;
            return (
              <motion.g key={p.id} style={{ cursor: "pointer" }}
                initial={stagger ? { opacity: 0, x: -12 } : false}
                animate={{ opacity: 1, x: 0, y: laneShift(p.lane) }}
                transition={{ duration: 0.5, ease: EASE_OUT, delay: stagger ? Math.min(i * 0.012, 0.5) : 0, y: { duration: 0.45, ease: EASE_OUT, delay: 0 } }}
                onClick={() => setSelPid((s) => (s === p.id ? null : p.id))}
                onMouseEnter={(e) => setHover({ x: (e as any).clientX, y: (e as any).clientY, html: `<b>${p.name}</b> · ${p.type}<br>${fmtYear(p.year_start)} – ${fmtYear(p.year_end)}<br><span style="color:#837a66">clicca per l'anteprima</span>` })}
                onMouseMove={(e) => setHover((h) => h && { ...h, x: (e as any).clientX, y: (e as any).clientY })}
                onMouseLeave={() => setHover(null)}>
                <motion.rect x={bx} y={by} width={bw} height={32} rx={6}
                  fill={col} fillOpacity={selPid === p.id ? 0.32 : 0.14} stroke={col} strokeOpacity={selPid === p.id ? 1 : 0.85} strokeWidth={selPid === p.id ? 2 : 1.1}
                  whileHover={reduced ? undefined : { scale: 1.0 }}
                />
                {/* Aura pulse quando il periodo è stato selezionato dalla ricerca.
                    Rettangolo separato sopra la barra, animato con framer-motion. */}
                {isHighlight && !reduced && (
                  <motion.rect
                    x={bx - 4} y={by - 4} width={bw + 8} height={40} rx={9}
                    fill="none" stroke={col} strokeWidth={2}
                    initial={{ opacity: 0.8, scale: 0.96 }}
                    animate={{ opacity: [0.8, 0.2, 0.8, 0.2, 0.8], scale: [0.96, 1.04, 0.96, 1.04, 0.96] }}
                    transition={{ duration: 2, times: [0, 0.25, 0.5, 0.75, 1], ease: "easeInOut" }}
                    style={{ pointerEvents: "none", transformOrigin: `${bx + bw / 2}px ${by + 16}px` }}
                  />
                )}
                <rect x={bx} y={by} width={3} height={32} fill={col} rx={1.5} style={{ pointerEvents: "none" }} />
                {bw > 44 && (
                  <text x={bx + 10} y={by + 20} fill="var(--ink)" fontSize={12.5} fontFamily="var(--font-body)" fontWeight={500} style={{ pointerEvents: "none" }}>
                    {bw > p.name.length * 7.2 ? p.name : p.name.slice(0, Math.floor(bw / 7.2)) + (p.name.length > bw / 7.2 ? "…" : "")}
                  </text>
                )}
              </motion.g>
            );
          })}

          {showEvents && (
            <motion.g animate={{ y: globalShift }} transition={{ duration: 0.45, ease: EASE_OUT }}>
              {/* Etichetta "Eventi storici" — ora sotto gli eventi (non sopra) */}
              <line x1={PAD} y1={eventsTop + EV_ROWS * EV_ROW_H + 2} x2={width - PAD} y2={eventsTop + EV_ROWS * EV_ROW_H + 2} stroke="var(--line)" strokeWidth={1} />
              <text x={PAD} y={eventsTop + EV_ROWS * EV_ROW_H + 14} fill="var(--ink-faint)" fontSize={9.5} fontFamily="var(--font-body)"
                style={{ letterSpacing: ".16em", textTransform: "uppercase" }}>Eventi storici</text>
              {evNodes.map((n, i) => {
                const ex = n.x, ey = eventsTop + n.row * EV_ROW_H + 8;
                const col = EVENT_COLOR[n.catKind] ?? "#888";
                const r = n.kind === "cluster" ? 6.5 : 4;
                const showLabel = (n as any).showLabel;
                const onEnter = (ev: any) => {
                  const html = n.kind === "cluster"
                    ? `<b>${n.count} eventi</b> · ${fmtYear(n.members![0].year)}–${fmtYear(n.members![n.members!.length - 1].year)}<br><span style="color:#837a66">Clicca per espandere</span>`
                    : `<b>${n.ev!.title}</b> · ${fmtYear(n.ev!.year)}<br><span style="color:#837a66">${EVENT_LABEL[n.ev!.kind] ?? n.ev!.kind}</span><br>${n.ev!.description.slice(0, 150)}${n.ev!.description.length > 150 ? "…" : ""}`;
                  setHover({ x: ev.clientX, y: ev.clientY, html });
                };
                return (
                  <g key={i} style={{ cursor: "pointer" }}
                    onMouseEnter={onEnter}
                    onMouseMove={(ev) => setHover((h) => h && { ...h, x: (ev as any).clientX, y: (ev as any).clientY })}
                    onMouseLeave={() => setHover(null)}
                    onClick={(ev) => { ev.stopPropagation(); setHover(null); setPop({ x: (ev as any).clientX, y: (ev as any).clientY, node: n }); }}>
                    {/* Linea verticale evento rimossa: gli eventi sono ora in alto,
                        la linea non avrebbe senso. */}
                    {n.kind === "cluster" ? (
                      <>
                        <circle cx={ex} cy={ey} r={r} fill={col} fillOpacity={0.92} />
                        <text x={ex} y={ey + 3} fill="#fff" fontSize={8} fontWeight={700} textAnchor="middle" fontFamily="var(--font-body)" style={{ pointerEvents: "none" }}>{n.count}</text>
                      </>
                    ) : (
                      <circle cx={ex} cy={ey} r={r} fill={col} />
                    )}
                    {showLabel && (
                      <text x={ex + 8} y={ey + 3.5} fill="var(--ink-soft)" fontSize={10.5} fontFamily="var(--font-body)" style={{ pointerEvents: "none" }}>
                        {n.labelText.length > 30 ? n.labelText.slice(0, 29) + "…" : n.labelText}
                      </text>
                    )}
                  </g>
                );
              })}
            </motion.g>
          )}
        </svg>

        <AnimatePresence>
          {selPid && selLane != null && (
            <motion.div key={selPid} className="tl-inline-dossier" data-testid="tl-inline-dossier"
              style={{ top: laneY(selLane) + 42, left: scrollX + 10, width: Math.max(stageW - 20, 320) }}
              initial={reduced ? false : { opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}>
              <PeriodDossier pid={selPid} onClose={() => setSelPid(null)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {hover && !pop && (
        <div className="float-tip" style={{ left: Math.min(hover.x + 14, window.innerWidth - 290), top: Math.min(hover.y + 14, window.innerHeight - 120) }}
          dangerouslySetInnerHTML={{ __html: hover.html }} />
      )}

      <AnimatePresence>
        {pop && (() => {
          // Calcola posizione popover in modo che non sia tagliato in fullscreen.
          // Se non c'è spazio sotto, mostra il popover SOPRA il pallino.
          const POP_W = 300;
          const POP_H = 260;
          const margin = 12;
          let left = Math.min(pop.x + margin, window.innerWidth - POP_W - margin);
          if (left < margin) left = margin;
          let top = pop.y + margin;
          // Se il popover finisce sotto lo schermo, spostalo sopra
          if (top + POP_H > window.innerHeight - margin) {
            top = pop.y - POP_H - margin;
          }
          // Se anche sopra è fuori schermo (pallino molto in alto), forza in basso
          if (top < margin) {
            top = Math.max(margin, window.innerHeight - POP_H - margin);
          }
          return (
          <motion.div className="ev-popover" data-testid="ev-popover"
            style={{ left, top }}
            initial={reduced ? false : { opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            onClick={(e) => e.stopPropagation()}>
            {pop.node.kind === "single" ? (
              <EventCard e={pop.node.ev!} onGo={(pid) => { setPop(null); nav(`/periodo/${pid}`); }} ix={ix} />
            ) : (
              <div>
                <div className="ev-pop-head">{pop.node.count} eventi · {fmtYear(pop.node.members![0].year)}–{fmtYear(pop.node.members![pop.node.members!.length - 1].year)}</div>
                <div className="ev-pop-list">
                  {pop.node.members!.map((e) => (
                    <button key={e.id} className="ev-pop-item" onClick={() => openEvent(e, pop.x, pop.y)}>
                      <span className="dot" style={{ background: EVENT_COLOR[e.kind], flexShrink: 0 }} />
                      <span className="ev-pop-item-t">{e.title}</span>
                      <span className="faint tnum" style={{ fontSize: 11 }}>{fmtYear(e.year)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
          );
        })()}
      </AnimatePresence>
    </>
  );
}
