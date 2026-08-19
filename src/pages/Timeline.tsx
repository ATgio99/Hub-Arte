import { useMemo, useRef, useState, useCallback, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useData, useTimeRange } from "../lib/store";
import { periodMidYear, fmtYear } from "../lib/data";
import { FilterNote } from "../components/ui";
import Fullscreen from "../components/Fullscreen";
import TimeRangeSlider from "../components/TimeRangeSlider";
import PeriodDossier from "../components/PeriodDossier";
import { usePrefersReducedMotion, EASE_OUT } from "../lib/motion";
import type { Period, ArtEvent, Artist } from "../lib/types";

const TYPE_COLOR: Record<string, string> = { epoca: "#b88a2e", corrente: "#b9692c", popolo: "#4f7d72" };
const EVENT_COLOR: Record<string, string> = { politico: "#a8483f", religioso: "#9a6a92", culturale: "#6e8350", tecnologico: "#5f7e8c" };
const EVENT_LABEL: Record<string, string> = { politico: "Politico", religioso: "Religioso", culturale: "Culturale", tecnologico: "Tecnologico" };

// ── Artist timeline colors by role category ──────────────────────────────
const ARTIST_CAT_COLOR: Record<string, string> = {
  Pittori: "#7B5EA7",
  Scultori: "#3D7A8A",
  Architetti: "#8A6D3B",
  "Orafi/Bronzisti": "#A0724A",
  Miniatori: "#6B8A5E",
  Committenti: "#8A7E5A",
  Altro: "#7A7570",
};

function artistCategory(a: Artist): string {
  const r = (a.role || "").toLowerCase();
  if (r.includes("pittor")) return "Pittori";
  if (r.includes("scultor")) return "Scultori";
  if (r.includes("architett")) return "Architetti";
  if (r.includes("orafo") || r.includes("bronz")) return "Orafi/Bronzisti";
  if (r.includes("miniator")) return "Miniatori";
  if (r.includes("committ")) return "Committenti";
  return "Altro";
}

interface ArtistLane extends Artist {
  lane: number;
  year_start: number;
  year_end: number;
  category: string;
  color: string;
}

function layoutArtistLanes(artists: Artist[]): { items: ArtistLane[]; totalLanes: number; categories: string[] } {
  const withDates = artists.filter((a) => a.birth != null);
  withDates.sort((a, b) => (a.birth ?? 0) - (b.birth ?? 0));

  const byCat: Record<string, Artist[]> = {};
  withDates.forEach((a) => {
    const cat = artistCategory(a);
    (byCat[cat] ??= []).push(a);
  });

  const items: ArtistLane[] = [];
  let laneBase = 0;
  const catOrder = ["Pittori", "Scultori", "Architetti", "Orafi/Bronzisti", "Miniatori", "Committenti", "Altro"];
  const activeCats: string[] = [];

  for (const cat of catOrder) {
    const arr = byCat[cat];
    if (!arr || arr.length === 0) continue;
    activeCats.push(cat);

    const laneEnds: number[] = [];
    for (const a of arr) {
      const start = a.birth ?? 0;
      const end = a.death ?? (start + 60);
      // Require 20-year gap between overlapping artists on the same lane (was -5)
      // This forces more lanes = more vertical space = less crowding
      let lane = laneEnds.findIndex((le) => start >= le - 20);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
      laneEnds[lane] = end;
      items.push({
        ...a,
        lane: laneBase + lane,
        year_start: start,
        year_end: end,
        category: cat,
        color: ARTIST_CAT_COLOR[cat] ?? "#7A7570",
      });
    }
    laneBase += Math.max(laneEnds.length, 1) + 0.4;
  }
  return { items, totalLanes: laneBase, categories: activeCats };
}

// ── Period lane layout (original) ────────────────────────────────────────

interface LaneItem extends Period { lane: number; }

function layoutLanes(periods: Period[]): LaneItem[] {
  const out: LaneItem[] = [];
  const byType: Record<string, Period[]> = { epoca: [], corrente: [], popolo: [] };
  periods.forEach((p) => (byType[p.type] ?? byType.corrente).push(p));
  let laneBase = 0;
  for (const type of ["epoca", "popolo", "corrente"]) {
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
  const sorted = events.slice().sort((a, b) => a.year - b.year);
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
//  ARTIST TIMELINE CANVAS
// ═══════════════════════════════════════════════════════════════════════════
function ArtistTimelineCanvas({ inFullscreen }: { inFullscreen: boolean }) {
  const ix = useData();
  const { range, artistIn } = useTimeRange();
  const nav = useNavigate();
  const [selId, setSelId] = useState<string | null>(null);
  const [hover, setHover] = useState<Tip | null>(null);

  const allArtists = ix.ds.artists;
  const filtered = useMemo(() => allArtists.filter(artistIn), [allArtists, artistIn]);
  const { items, totalLanes, categories } = useMemo(() => layoutArtistLanes(filtered), [filtered]);

  const withDates = allArtists.filter((a) => a.birth != null).length;

  const minY = items.length ? Math.min(...items.map((a) => a.year_start)) - 10 : range.min;
  const maxY = items.length ? Math.max(...items.map((a) => a.year_end)) + 10 : range.max;

  const PPY = 1.8;       // was 1.05 — wider bars = names visible
  const PAD = 80;        // was 60 — more margin
  const LANE_H = 38;     // was 28 — taller rows
  const TOP = 70;        // was 60
  const width = Math.max((maxY - minY) * PPY + PAD * 2, 600);
  const height = TOP + Math.ceil(totalLanes) * LANE_H + 50;

  const x = useCallback((year: number) => PAD + (year - minY) * PPY, [minY, PPY]);
  const laneY = (lane: number) => TOP + lane * LANE_H;

  // Zoom controls
  const reducedMotion = usePrefersReducedMotion();
  const [zoomTarget, setZoomTarget] = useState(1);
  const zoom = useSmoothZoom(zoomTarget, reducedMotion);
  const PPY_Z = PPY * zoom;
  const xZ = useCallback((year: number) => PAD + (year - minY) * PPY_Z, [minY, PPY_Z]);
  const widthZ = Math.max((maxY - minY) * PPY_Z + PAD * 2, 600);

  const ticks = useMemo(() => {
    const t: number[] = [];
    const span = maxY - minY;
    const step = span > 900 ? 100 : span > 400 ? 50 : 25;
    const start = Math.ceil(minY / step) * step;
    for (let y = start; y <= maxY; y += step) t.push(y);
    return t;
  }, [minY, maxY]);

  // Category separator positions
  const catRanges = useMemo(() => {
    const ranges: { name: string; startLane: number; endLane: number; color: string }[] = [];
    let prev: string | null = null;
    items.forEach((a) => {
      if (a.category !== prev) {
        if (prev !== null) ranges[ranges.length - 1].endLane = a.lane;
        ranges.push({ name: a.category, startLane: a.lane, endLane: a.lane + 1, color: a.color });
        prev = a.category;
      } else {
        ranges[ranges.length - 1].endLane = a.lane + 1;
      }
    });
    return ranges;
  }, [items]);

  const selectedArtist = selId ? items.find((a) => a.id === selId) : null;

  return (
    <>
      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap", fontSize: 11.5, color: "var(--ink-soft)" }}>
        {Object.entries(ARTIST_CAT_COLOR).filter(([c]) => categories.includes(c)).map(([cat, col]) => (
          <span key={cat} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span className="dot" style={{ background: col }} />{cat}
          </span>
        ))}
      </div>
      <div style={{ marginBottom: 12, fontSize: 13, color: "var(--ink-soft)" }}>
        <b style={{ color: "var(--ink)", fontWeight: 600 }}>{withDates}</b> artisti su {allArtists.length} totali (con date note)
      </div>

      <div className="stage" style={{ overflowX: "auto", overflowY: "auto", flex: inFullscreen ? 1 : undefined, height: inFullscreen ? "100%" : undefined, border: inFullscreen ? 0 : undefined, borderRadius: inFullscreen ? 0 : undefined }}>
        <svg width={widthZ} height={height} style={{ display: "block", minWidth: "100%" }}>
          {/* Year ticks */}
          {ticks.map((y) => (
            <g key={y}>
              <line x1={xZ(y)} y1={TOP - 10} x2={xZ(y)} y2={height - 20} stroke="var(--line-soft)" strokeWidth={1} />
              <text x={xZ(y)} y={TOP - 18} fill="var(--ink-faint)" fontSize={11} textAnchor="middle" fontFamily="var(--font-body)" style={{ fontVariantNumeric: "tabular-nums" }}>{y < 0 ? `${-y} a.C.` : y}</text>
            </g>
          ))}

          {/* Category labels and separators */}
          {catRanges.map((cr, i) => {
            const yMid = (laneY(cr.startLane) + laneY(cr.endLane)) / 2 + 5;
            return (
              <g key={i}>
                <rect x={0} y={laneY(cr.startLane) - 4} width={widthZ} height={laneY(cr.endLane) - laneY(cr.startLane) + 8} fill={cr.color} fillOpacity={0.03} />
                <text x={10} y={yMid} fill={cr.color} fontSize={11} fontWeight={700} fontFamily="var(--font-body)" opacity={0.6}>{cr.name}</text>
                {i > 0 && (
                  <line x1={PAD} y1={laneY(cr.startLane) - 6} x2={widthZ - 40} y2={laneY(cr.startLane) - 6} stroke="var(--line)" strokeWidth={0.5} strokeDasharray="4 4" />
                )}
              </g>
            );
          })}

          {/* Artist bars */}
          {items.map((a) => {
            const bx = xZ(a.year_start), bw = Math.max((a.year_end - a.year_start) * PPY_Z, 20);
            const by = laneY(a.lane);
            const barH = LANE_H - 10;
            const barY = by + 5;
            const periodNames = a.period_ids.map((pid) => { const p = ix.periodById.get(pid); return p ? p.name : pid; }).join(", ");
            return (
              <g key={a.id} style={{ cursor: "pointer" }}
                onClick={() => setSelId((s) => (s === a.id ? null : a.id))}
                onMouseEnter={(e) => setHover({ x: (e as any).clientX, y: (e as any).clientY, html: `<b>${a.name}</b><br>${a.birth ?? "?"}–${a.death ?? "?"} · ${a.role || ""}${periodNames ? `<br><span style="color:#837a66">${periodNames}</span>` : ""}` })}
                onMouseMove={(e) => setHover((h) => h && { ...h, x: (e as any).clientX, y: (e as any).clientY })}
                onMouseLeave={() => setHover(null)}>
                <rect x={bx} y={barY} width={3.5} height={barH} fill={a.color} rx={1.5} />
                <rect x={bx} y={barY} width={bw} height={barH} rx={5} fill={a.color} fillOpacity={selId === a.id ? 0.28 : 0.12} stroke={a.color} strokeOpacity={selId === a.id ? 1 : 0.7} strokeWidth={selId === a.id ? 2 : 0.8} />
                {bw > 50 && (
                  <text x={bx + 10} y={barY + barH / 2 + 4.5} fill="var(--ink)" fontSize={12} fontFamily="var(--font-body)" fontWeight={500} style={{ pointerEvents: "none" }}>
                    {bw > a.name.length * 7 ? a.name : a.name.slice(0, Math.floor((bw - 10) / 7)) + (a.name.length * 7 > bw - 10 ? "…" : "")}
                  </text>
                )}
                {bw > a.name.length * 7 + 60 && (
                  <text x={bx + 10 + a.name.length * 7 + 6} y={barY + barH / 2 + 4.5} fill="var(--ink-soft)" fontSize={10} fontFamily="var(--font-body)" style={{ pointerEvents: "none", fontVariantNumeric: "tabular-nums" }}>
                    {a.birth ?? "?"}–{a.death ?? "?"}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Artist detail panel */}
      <AnimatePresence>
        {selectedArtist && (
          <motion.div key={selectedArtist.id} className="tl-inline-dossier"
            style={{ marginTop: 16 }}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}>
            <div style={{ background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ fontSize: 18, marginBottom: 4, fontWeight: 600 }}>{selectedArtist.name}</h3>
                  <div style={{ color: "var(--gold)", fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
                    {selectedArtist.role || ""} · {selectedArtist.birth ?? "?"}–{selectedArtist.death ?? "?"}
                  </div>
                </div>
                <button onClick={() => setSelId(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--ink-soft)", padding: "0 4px" }}>&times;</button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                {selectedArtist.period_ids.map((pid) => {
                  const p = ix.periodById.get(pid);
                  return p ? (
                    <span key={pid} style={{ fontSize: 12, padding: "3px 8px", borderRadius: 999, background: "var(--bg-2)", color: "var(--ink-soft)", cursor: "pointer" }} onClick={() => nav(`/periodo/${pid}`)}>{p.name}</span>
                  ) : null;
                })}
                {selectedArtist.aka.map((a) => (
                  <span key={a} style={{ fontSize: 12, padding: "3px 8px", borderRadius: 999, background: "var(--bg-2)", color: "var(--ink-soft)" }}>alias: {a}</span>
                ))}
              </div>
              {selectedArtist.bio && <p className="muted" style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 10 }}>{selectedArtist.bio}</p>}
              {selectedArtist.innovations.length > 0 && (
                <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                  <strong>Innovazioni:</strong>
                  <ul style={{ margin: "4px 0 0 16px" }}>{selectedArtist.innovations.filter(Boolean).map((i) => <li key={i}>{i}</li>)}</ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hover && (
        <div className="float-tip" style={{ left: Math.min(hover.x + 14, window.innerWidth - 290), top: Math.min(hover.y + 14, window.innerHeight - 120) }}
          dangerouslySetInnerHTML={{ __html: hover.html }} />
      )}
    </>
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
        <div className="page-eyebrow"><span className="eyebrow">Visualizzazione</span></div>
        <h1 className="page-title">Linea del tempo multilivello</h1>
        <p className="page-lead">Epoche, popoli e correnti scorrono su corsie parallele: le sovrapposizioni temporali sono visibili, gli archi tracciano i flussi di contaminazione e gli eventi storici ancorano il contesto. Clicca una barra per espandere l'anteprima del periodo — con personaggi, artisti, opere e glossario da ricordare — un pallino per il dettaglio dell'evento.</p>
      </div>
      <div className="page-rule" />
      <TimelineShell onFull={setFull} />
    </div>
  );
}

// Shell with toggle between Periods and Artists
function TimelineShell({ onFull }: { onFull: (b: boolean) => void }) {
  const ix = useData();
  const { periodIn } = useTimeRange();
  const [showFlows, setShowFlows] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [inFull, setInFull] = useState(false);
  const [showArtists, setShowArtists] = useState(false);

  const allPeriods = ix.ds.periods;
  const periods = useMemo(() => allPeriods.filter(periodIn), [allPeriods, periodIn]);

  const legendEntries = showArtists
    ? Object.entries(ARTIST_CAT_COLOR).filter(([c]) => layoutArtistLanes(ix.ds.artists).categories.includes(c))
    : Object.entries(TYPE_COLOR);

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

  // Colonna destra in fullscreen: vista, tempo, filtri vista (flussi/eventi/artisti), legenda.
  // Visibile solo in fullscreen, come sideFiltersBlock nel grafo.
  const sideFiltersBlock = (
    <div className="panel gf-fs-only" data-testid="tl-fs-filters">
      <div className="panel-title" style={{ fontSize: 15, marginBottom: 10 }}>Tempo</div>
      <div style={{ margin: "0 -4px 14px" }}>
        <TimeRangeSlider compact />
      </div>
      <div className="panel-title" style={{ fontSize: 15, marginBottom: 8 }}>Vista</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        <ToggleChip active={showFlows} onClick={() => setShowFlows((v) => !v)} testId="tl-fs-flows">↝ flussi</ToggleChip>
        <ToggleChip active={showEvents} onClick={() => setShowEvents((v) => !v)} testId="tl-fs-events">◆ eventi</ToggleChip>
        <ToggleChip active={showArtists} onClick={() => setShowArtists((v) => !v)} testId="tl-fs-artists">👤 artisti</ToggleChip>
      </div>
      <div className="panel-title" style={{ fontSize: 15, marginBottom: 8 }}>Legenda</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {legendEntries.map(([t, c]) => (
          <span key={t} className="muted" style={{ fontSize: 11.5, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span className="dot" style={{ background: c }} />{t}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div className="filterbar" style={{ marginBottom: 14, gap: 14 }}>
        <ToggleChip active={showFlows} onClick={() => setShowFlows((v) => !v)} testId="tl-flows">↝ flussi</ToggleChip>
        <ToggleChip active={showEvents} onClick={() => setShowEvents((v) => !v)} testId="tl-events">◆ eventi</ToggleChip>
        <ToggleChip active={showArtists} onClick={() => setShowArtists((v) => !v)} testId="tl-artists">👤 artisti</ToggleChip>
        <div className="filter-group" style={{ marginLeft: "auto" }}>
          {legendEntries.map(([t, c]) => (
            <span key={t} className="muted" style={{ fontSize: 11.5, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span className="dot" style={{ background: c }} />{t}
            </span>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <FilterNote total={showArtists ? ix.ds.artists.length : allPeriods.length} shown={showArtists ? ix.ds.artists.filter((a) => a.birth != null).length : periods.length} noun={showArtists ? "artisti" : "periodi"} />
      </div>

      {showArtists ? (
        <Fullscreen title="Linea del tempo — Artisti" controls={null} showSlider={false} onChange={(f) => { setInFull(f); onFull(f); }}>
          <div className="gf-inner">
            <ArtistTimelineCanvas inFullscreen={inFull} />
            <div className="gf-side">
              {sideFiltersBlock}
            </div>
          </div>
        </Fullscreen>
      ) : (
        <Fullscreen title="Linea del tempo" controls={null} showSlider={false} onChange={(f) => { setInFull(f); onFull(f); }}>
          <div className="gf-inner">
            <TimelineCanvasControlled showFlows={showFlows} showEvents={showEvents} inFullscreen={inFull} />
            <div className="gf-side">
              {sideFiltersBlock}
            </div>
          </div>
        </Fullscreen>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  ORIGINAL PERIOD TIMELINE CANVAS (unchanged)
// ═══════════════════════════════════════════════════════════════════════════
function TimelineCanvasControlled({ showFlows, showEvents, inFullscreen }:
  { showFlows: boolean; showEvents: boolean; inFullscreen: boolean }) {
  const ix = useData();
  const nav = useNavigate();
  const { range, periodIn, eventIn } = useTimeRange();
  const reduced = usePrefersReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [zoomTarget, setZoomTarget] = useState(1);
  const zoom = useSmoothZoom(zoomTarget, reduced);
  const [hover, setHover] = useState<Tip | null>(null);
  const [pop, setPop] = useState<Popover | null>(null);
  const [selPid, setSelPid] = useState<string | null>(null);
  const [scrollX, setScrollX] = useState(0);
  const [stageW, setStageW] = useState(800);

  const allPeriods = ix.ds.periods;
  const periods = useMemo(() => allPeriods.filter(periodIn), [allPeriods, periodIn]);
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
  const eventsTop = TOP + laneCount * LANE_H + 30;
  const height = eventsTop + EV_ROWS * EV_ROW_H + 56 + (selPid ? 410 : 0);

  const x = useCallback((year: number) => PAD + (year - minY) * PPY, [minY, PPY]);

  const flows = useMemo(() => {
    const byId = new Map(lanes.map((l) => [l.id, l]));
    return ix.ds.connections
      .filter((c) => c.source_type === "period" && c.target_type === "period" && byId.has(c.source_id) && byId.has(c.target_id))
      .map((c) => ({ a: byId.get(c.source_id)!, b: byId.get(c.target_id)!, kind: c.kind, desc: c.description }))
      .filter((f) => f.a.id !== f.b.id);
  }, [ix, lanes]);

  const visibleEvents = useMemo(() => ix.ds.events.filter(eventIn), [ix, eventIn]);
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

  const laneY = (lane: number) => TOP + lane * LANE_H;

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
              <line x1={x(y)} y1={48} x2={x(y)} y2={eventsTop - 14 + globalShift} stroke="var(--line-soft)" strokeWidth={1} />
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
                  whileHover={reduced ? undefined : { scale: 1.0 }} />
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
              <line x1={PAD} y1={eventsTop - 14} x2={width - PAD} y2={eventsTop - 14} stroke="var(--line)" strokeWidth={1} />
              <text x={PAD} y={eventsTop - 20} fill="var(--ink-faint)" fontSize={9.5} fontFamily="var(--font-body)"
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
                    <line x1={ex} y1={eventsTop - 14} x2={ex} y2={ey} stroke={col} strokeWidth={1} strokeOpacity={0.28} />
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

        <div className="tl-zoom-float" data-testid="tl-zoom-float">
          <button className="btn sm ghost" onClick={() => setZoomTarget((z) => Math.max(0.5, +(z - 0.4).toFixed(2)))} data-testid="tl-zoom-out" aria-label="Riduci zoom">−</button>
          <span className="muted tnum" style={{ fontSize: 12, width: 42, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
          <button className="btn sm ghost" onClick={() => setZoomTarget((z) => Math.min(5, +(z + 0.4).toFixed(2)))} data-testid="tl-zoom-in" aria-label="Aumenta zoom">+</button>
        </div>
      </div>

      {hover && !pop && (
        <div className="float-tip" style={{ left: Math.min(hover.x + 14, window.innerWidth - 290), top: Math.min(hover.y + 14, window.innerHeight - 120) }}
          dangerouslySetInnerHTML={{ __html: hover.html }} />
      )}

      <AnimatePresence>
        {pop && (
          <motion.div className="ev-popover" data-testid="ev-popover"
            style={{ left: Math.min(pop.x, window.innerWidth - 320), top: Math.min(pop.y + 12, window.innerHeight - 260) }}
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
        )}
      </AnimatePresence>

      {!inFullscreen && (
        <div className="tl-evstat faint" style={{ fontSize: 12, marginTop: 10 }} data-testid="tl-evstat">
          {visibleEvents.length} eventi · {labelsShown} etichette visibili a questo zoom · i pallini ravvicinati si raggruppano in cluster (×N): clicca per espandere.
        </div>
      )}
    </>
  );
}
