import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import ForceGraph2D from "react-force-graph-2d";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
import SpriteText from "three-spritetext";
import { useData, useTimeRange } from "../lib/store";
import { ENTITY_COLOR, entityHref, WorkImage } from "../components/ui";
import { ENTITY_LABEL, KIND_LABEL, entityLabel } from "../lib/data";
import Fullscreen from "../components/Fullscreen";
import TimeRangeSlider from "../components/TimeRangeSlider";
import { getLastRete, setLastRete, clearLastRete } from "../lib/lastVisited";
import type { EntityType, ConnKind } from "../lib/types";

const NODE_TYPES: EntityType[] = ["period", "artist", "work", "technique", "term", "event"];
const KINDS: ConnKind[] = ["influenza", "rielaborazione", "evoluzione", "committenza", "maestro-allievo", "contaminazione", "contrasto"];

// colori esadecimali (coerenti col tema chiaro). three.js NON interpreta var CSS.
const NODE_HEX: Record<string, string> = {
  period: "#b88a2e", artist: "#b9692c", work: "#5f7e8c",
  technique: "#6e8350", term: "#9a6a92", event: "#a8483f", city: "#4f7d72",
};
const KIND_COLOR: Record<string, string> = {
  influenza: "#b88a2e", rielaborazione: "#b9692c", evoluzione: "#6e8350",
  committenza: "#4f7d72", "maestro-allievo": "#9a6a92", contaminazione: "#caa14a", contrasto: "#a8483f",
  luogo: "#7da59a",
};
const PAPER = "#f7f3ec";
const INK = "#211c14";
const DIM_LINE = "rgba(33,28,20,0.05)";

export default function Grafo() {
  const ix = useData();
  const nav = useNavigate();
  const { range, periodIn, workIn, artistIn, termIn, techIn, eventIn } = useTimeRange();
  const fg2d = useRef<any>();
  const fg3d = useRef<any>();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [hideTypes, setHideTypes] = useState<Set<string>>(new Set());
  const [hideKinds, setHideKinds] = useState<Set<ConnKind>>(new Set());
  const [sel, setSel] = useState<any>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [isFull, setIsFull] = useState(false);

  // CHANGE 6: focusNode + searchQuery + searchResults per salvare/ripristinare l'ultima ricerca
  const [focusNode, setFocusNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      if (wrapRef.current) setDims({ w: wrapRef.current.clientWidth, h: wrapRef.current.clientHeight });
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // CHANGE 6: ripristina l'ultima ricerca salvata al primo mount
  useEffect(() => {
    if (restored) return;
    const last = getLastRete();
    if (last && last.focusNode) {
      setFocusNode(last.focusNode);
      setSearchQuery(last.searchQuery || "");
    }
    setRestored(true);
  }, [restored]);

  // CHANGE 6: salva l'ultima ricerca ogni volta che cambia focus/query
  useEffect(() => {
    if (!restored) return;
    if (focusNode) {
      setLastRete({ focusNode, searchQuery });
    } else {
      clearLastRete();
    }
    window.dispatchEvent(new CustomEvent("atlante:last-visited-changed"));
  }, [focusNode, searchQuery, restored]);

  // CHANGE 6: ascolta il reset richiesto dalla sidebar (doppio click su Rete)
  useEffect(() => {
    const onReset = () => {
      setFocusNode(null);
      setSearchQuery("");
      setSearchResults([]);
      setSel(null);
      clearLastRete();
      window.dispatchEvent(new CustomEvent("atlante:last-visited-changed"));
    };
    window.addEventListener("atlante:rete-reset", onReset);
    return () => window.removeEventListener("atlante:rete-reset", onReset);
  }, []);

  // CHANGE 6: handler ricerca — aggiorna risultati e disattiva focus se l'utente digita
  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (focusNode) setFocusNode(null);
    const nq = q.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!nq) { setSearchResults([]); return; }
    const out: any[] = [];
    const push = (type: EntityType, id: string, label: string) => {
      out.push({ id: `${type}:${id}`, etype: type, eid: id, label });
      if (out.length >= 30) return;
    };
    for (const w of ix.ds.works) {
      if (out.length >= 30) break;
      const l = (w.title || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (l.includes(nq)) push("work", w.id, w.title);
    }
    for (const a of ix.ds.artists) {
      if (out.length >= 30) break;
      const l = (a.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (l.includes(nq)) push("artist", a.id, a.name);
    }
    for (const c of ix.ds.works) {
      if (out.length >= 30) break;
      if (c.location_city && c.location_city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(nq)) {
        push("city" as any, c.location_city, c.location_city);
      }
    }
    for (const p of ix.ds.periods) {
      if (out.length >= 30) break;
      const l = (p.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (l.includes(nq)) push("period", p.id, p.name);
    }
    setSearchResults(out);
  }, [ix, focusNode]);

  // CHANGE 6: pulisci ricerca e focus
  const handleClearSearch = useCallback(() => {
    setFocusNode(null);
    setSearchQuery("");
    setSearchResults([]);
    setSel(null);
    clearLastRete();
    window.dispatchEvent(new CustomEvent("atlante:last-visited-changed"));
  }, []);

  // CHANGE 6: handleSearchResultClick è definito DOPO `graph` (vedi sotto).

  const inTime = useCallback((type: EntityType, id: string): boolean => {
    switch (type) {
      case "period": { const p = ix.periodById.get(id); return p ? periodIn(p) : true; }
      case "artist": { const a = ix.artistById.get(id); return a ? artistIn(a) : true; }
      case "work": { const w = ix.workById.get(id); return w ? workIn(w) : true; }
      case "term": { const t = ix.termById.get(id); return t ? termIn(t) : true; }
      case "technique": { const t = ix.techById.get(id); return t ? techIn(t) : true; }
      case "event": { const e = ix.eventById.get(id); return e ? eventIn(e) : true; }
    }
    return true;
  }, [ix, periodIn, workIn, artistIn, termIn, techIn, eventIn]);

  const graph = useMemo(() => {
    const conns = ix.ds.connections.filter((c) => {
      if (hideKinds.has(c.kind)) return false;
      if (!NODE_TYPES.includes(c.source_type) || !NODE_TYPES.includes(c.target_type)) return false;
      if (hideTypes.has(c.source_type) || hideTypes.has(c.target_type)) return false;
      if (!inTime(c.source_type, c.source_id) || !inTime(c.target_type, c.target_id)) return false;
      return true;
    });
    const nodeMap = new Map<string, any>();
    const addNode = (type: EntityType, id: string) => {
      const key = `${type}:${id}`;
      if (nodeMap.has(key)) { nodeMap.get(key).deg++; return key; }
      nodeMap.set(key, { id: key, etype: type, eid: id, label: entityLabel(ix, type, id), deg: 1 });
      return key;
    };
    const links: any[] = [];
    for (const c of conns) {
      const s = addNode(c.source_type, c.source_id);
      const t = addNode(c.target_type, c.target_id);
      links.push({ source: s, target: t, kind: c.kind, desc: c.description });
    }
    // città come nodi di raggruppamento: ogni opera è legata al luogo in cui si trova
    if (!hideTypes.has("city")) {
      for (const wn of [...nodeMap.values()].filter((n) => n.etype === "work")) {
        const w = ix.workById.get(wn.eid);
        const city = w?.location_city;
        if (!city) continue;
        const key = `city:${city}`;
        if (!nodeMap.has(key)) nodeMap.set(key, { id: key, etype: "city", eid: city, label: city, deg: 0 });
        nodeMap.get(key).deg++;
        links.push({ source: key, target: wn.id, kind: "luogo", desc: `Opera conservata a ${city}` });
      }
    }
    return { nodes: [...nodeMap.values()], links };
  }, [ix, hideTypes, hideKinds, inTime]);

  // CHANGE 6: quando l'utente clicca un risultato di ricerca, imposta focus + sel
  const handleSearchResultClick = useCallback((r: any) => {
    setFocusNode(r.id);
    setSearchQuery("");
    setSearchResults([]);
    const node = graph.nodes.find((n) => n.id === r.id);
    if (node) setSel(node);
  }, [graph]);

  const adj = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const l of graph.links) {
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;
      if (!m.has(s)) m.set(s, new Set()); if (!m.has(t)) m.set(t, new Set());
      m.get(s)!.add(t); m.get(t)!.add(s);
    }
    return m;
  }, [graph]);

  const focusId = hoverId ?? (sel ? sel.id : null);
  const neighbors = useMemo(() => {
    if (!focusId) return null;
    const set = new Set<string>([focusId]);
    adj.get(focusId)?.forEach((n) => set.add(n));
    return set;
  }, [focusId, adj]);

  const toggle = <T,>(set: Set<T>, v: T, fn: (s: Set<T>) => void) => {
    const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); fn(n);
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    graph.nodes.forEach((n) => c[n.etype] = (c[n.etype] ?? 0) + 1);
    return c;
  }, [graph]);

  const selDetail = useMemo(() => {
    if (!sel) return null;
    const conns = ix.ds.connections.filter((c) =>
      (c.source_type === sel.etype && c.source_id === sel.eid) ||
      (c.target_type === sel.etype && c.target_id === sel.eid));
    const ent: any = (() => {
      switch (sel.etype) {
        case "period": return ix.periodById.get(sel.eid);
        case "artist": return ix.artistById.get(sel.eid);
        case "work": return ix.workById.get(sel.eid);
        case "technique": return ix.techById.get(sel.eid);
        case "term": return ix.termById.get(sel.eid);
        case "event": return ix.eventById.get(sel.eid);
      }
    })();
    return { conns, ent };
  }, [sel, ix]);

  // ---- 3D: luci forti su fondo chiaro + sprite text scuri --------------------
  const lit = useRef(false);
  const setup3d = useCallback(() => {
    const fg = fg3d.current;
    if (!fg || lit.current) return;
    try {
      const scene = fg.scene();
      // illuminazione adeguata: ambient forte + due direzionali tenui
      scene.add(new THREE.AmbientLight(0xffffff, 1.5));
      const d1 = new THREE.DirectionalLight(0xffffff, 0.7); d1.position.set(1, 1, 1); scene.add(d1);
      const d2 = new THREE.DirectionalLight(0xfff0d8, 0.4); d2.position.set(-1, -0.5, -1); scene.add(d2);
      // niente fog: su fondo carta dissolveva i nodi lontani (segnalato dall'utente)
      scene.fog = null;
      lit.current = true;
    } catch {}
  }, []);
  useEffect(() => { lit.current = false; }, [mode]);

  const node3dColor = useCallback((node: any) => {
    if (!neighbors) return NODE_HEX[node.etype] ?? "#b88a2e";
    return neighbors.has(node.id) ? (NODE_HEX[node.etype] ?? "#b88a2e") : "#d8ccb4";
  }, [neighbors]);

  const node3dObject = useCallback((node: any) => {
    const group = new THREE.Group();
    const dimmed = neighbors && !neighbors.has(node.id);
    const isFocus = node.id === focusId;
    const r = 3 + Math.min(node.deg, 9) * 0.9;
    const mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color(NODE_HEX[node.etype] ?? "#b88a2e"),
      transparent: true, opacity: dimmed ? 0.16 : 1,
      emissive: new THREE.Color(NODE_HEX[node.etype] ?? "#b88a2e"),
      emissiveIntensity: isFocus ? 0.55 : 0.18,
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 16), mat);
    group.add(sphere);
    // etichetta leggibile (sprite text scuro) per nodi in evidenza / hub
    const showLabel = (!dimmed) && (isFocus || (neighbors && neighbors.has(node.id)) || (!neighbors && node.deg >= 6));
    if (showLabel) {
      const lbl = node.label.length > 26 ? node.label.slice(0, 25) + "…" : node.label;
      const sprite = new SpriteText(lbl);
      sprite.color = INK;
      sprite.fontFace = "Georgia, serif";
      (sprite as any).fontWeight = "600";
      sprite.textHeight = 4.4;
      sprite.backgroundColor = "rgba(247,243,236,0.82)";
      sprite.padding = 1.4;
      sprite.borderRadius = 2;
      (sprite as any).position.set(0, r + 4, 0);
      group.add(sprite);
    }
    return group;
  }, [neighbors, focusId]);

  const link3dColor = useCallback((l: any) => {
    if (!neighbors) return "rgba(33,28,20,0.16)";
    const s = typeof l.source === "object" ? l.source.id : l.source;
    const t = typeof l.target === "object" ? l.target.id : l.target;
    const on = neighbors.has(s) && neighbors.has(t) && (s === focusId || t === focusId);
    return on ? (KIND_COLOR[l.kind] ?? INK) : "rgba(33,28,20,0.04)";
  }, [neighbors, focusId]);

  const restartFocus = () => { fg2d.current?.d3ReheatSimulation?.(); fg3d.current?.d3ReheatSimulation?.(); };

  // click "magnetico" in 2D: seleziona il nodo più vicino entro 18px dallo
  // schermo — i nodi piccoli diventano facilissimi da prendere (bug segnalato)
  const snapSelect2d = useCallback((ev: MouseEvent) => {
    const fg = fg2d.current;
    if (!fg || !ev) { setSel(null); return; }
    const el = (ev.target as HTMLElement);
    const rect = el.getBoundingClientRect?.();
    if (!rect) { setSel(null); return; }
    const g = fg.screen2GraphCoords(ev.clientX - rect.left, ev.clientY - rect.top);
    const k = fg.zoom?.() ?? 1;
    let best: any = null, bd = Infinity;
    for (const n of graph.nodes as any[]) {
      if (n.x == null) continue;
      const d = Math.hypot(n.x - g.x, n.y - g.y) * k;
      if (d < bd) { bd = d; best = n; }
    }
    if (best && bd <= 18) setSel(best); else setSel(null);
  }, [graph]);

  const typeChips = (
    <div className="filter-group">
      <span className="filter-label">Tipi</span>
      {[...NODE_TYPES, "city" as const].map((t) => (
        <span key={t} className={`chip sm ${hideTypes.has(t) ? "" : "active"}`}
          style={hideTypes.has(t) ? {} : { background: NODE_HEX[t], borderColor: NODE_HEX[t], color: "#fff" }}
          onClick={() => toggle(hideTypes, t, setHideTypes)} data-testid={`gf-type-${t}`}>
          {t === "city" ? "Luogo" : ENTITY_LABEL[t as EntityType]} {counts[t] ? `· ${counts[t]}` : ""}
        </span>
      ))}
    </div>
  );

  const modeToggle = (
    <div className="seg" data-testid="gf-mode">
      <button className={`seg-btn ${mode === "3d" ? "on" : ""}`} onClick={() => setMode("3d")} data-testid="gf-mode-3d">3D</button>
      <button className={`seg-btn ${mode === "2d" ? "on" : ""}`} onClick={() => setMode("2d")} data-testid="gf-mode-2d">2D</button>
    </div>
  );

  const fsControls = (
    <>
      {modeToggle}
      <div className="panel gf-filters" style={{ background: "transparent", border: 0, padding: 0, margin: 0 }}>
        <div className="panel-title" style={{ fontSize: 15, marginBottom: 8 }}>Livelli</div>
        {[...NODE_TYPES, "city" as const].map((t) => {
          const off = hideTypes.has(t);
          return (
            <button key={t} className={`gf-frow ${off ? "off" : ""}`} onClick={() => toggle(hideTypes, t, setHideTypes)}>
              <span className="dot" style={{ background: NODE_HEX[t] }} />
              <span className="gf-frow-lab">{t === "city" ? "Luogo" : ENTITY_LABEL[t as EntityType]}</span>
              <span className="gf-frow-n tnum">{counts[t] ?? 0}</span>
              <EyeIcon off={off} />
            </button>
          );
        })}
        <div className="panel-title" style={{ fontSize: 15, margin: "14px 0 8px" }}>Legami</div>
        {KINDS.map((k) => {
          const off = hideKinds.has(k);
          return (
            <button key={k} className={`gf-frow ${off ? "off" : ""}`} onClick={() => toggle(hideKinds, k, setHideKinds)}>
              <span className="dot" style={{ background: KIND_COLOR[k] }} />
              <span className="gf-frow-lab">{KIND_LABEL[k]}</span>
              <EyeIcon off={off} />
            </button>
          );
        })}
      </div>
    </>
  );

  const renderGraph = (full: boolean) => (
    <div className="stage" ref={!full ? wrapRef : undefined} style={{ height: full ? "100%" : "min(72vh, 700px)", flex: full ? 1 : undefined, border: full ? 0 : undefined, borderRadius: full ? 0 : undefined }} data-testid="graph-stage">
      <GraphSizer wrapRef={wrapRef} full={full} setDims={setDims} />
      {mode === "3d" ? (
        <ForceGraph3D
          ref={fg3d}
          width={dims.w} height={dims.h}
          graphData={graph}
          backgroundColor={PAPER}
          showNavInfo={false}
          cooldownTicks={100}
          cooldownTime={2000}
          enablePointerInteraction={true}
          nodeThreeObject={node3dObject}
          nodeColor={node3dColor}
          linkColor={link3dColor}
          linkWidth={(l: any) => {
            if (!neighbors) return 0.4;
            const s = typeof l.source === "object" ? l.source.id : l.source;
            const t = typeof l.target === "object" ? l.target.id : l.target;
            return (neighbors.has(s) && neighbors.has(t) && (s === focusId || t === focusId)) ? 1.4 : 0.2;
          }}
          linkOpacity={0.6}
          onEngineTick={setup3d}
          onEngineStop={() => { /* il motore si ferma da solo dopo cooldown */ }}
          onNodeHover={(n: any) => { setHoverId(n ? n.id : null); }}
          onNodeClick={(n: any) => { setSel(n); setFocusNode(n.id); }}
          onBackgroundClick={() => { setSel(null); setFocusNode(null); }}
        />
      ) : (
        <ForceGraph2D
          ref={fg2d}
          width={dims.w} height={dims.h}
          graphData={graph}
          backgroundColor={PAPER}
          cooldownTicks={100}
          cooldownTime={2000}
          d3VelocityDecay={0.3}
          nodeRelSize={4}
          linkColor={(l: any) => {
            if (!neighbors) return "rgba(33,28,20,0.13)";
            const s = typeof l.source === "object" ? l.source.id : l.source;
            const t = typeof l.target === "object" ? l.target.id : l.target;
            const on = neighbors.has(s) && neighbors.has(t) && (s === focusId || t === focusId);
            return on ? KIND_COLOR[l.kind] ?? INK : DIM_LINE;
          }}
          linkWidth={(l: any) => {
            if (!neighbors) return 0.6;
            const s = typeof l.source === "object" ? l.source.id : l.source;
            const t = typeof l.target === "object" ? l.target.id : l.target;
            return (neighbors.has(s) && neighbors.has(t) && (s === focusId || t === focusId)) ? 1.6 : 0.4;
          }}
          nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
            // area di click generosa: cerchio min 10px + rettangolo sull'etichetta visibile
            const r = Math.max((2.4 + Math.min(node.deg, 9) * 0.7) + 4, 10);
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, 2 * Math.PI); ctx.fill();
            if (node.deg >= 5) {
              const lw = Math.min(node.label.length, 28) * 6.4;
              ctx.fillRect(node.x - lw / 2, node.y + r - 4, lw, 16);
            }
          }}
          onNodeHover={(n: any) => { setHoverId(n ? n.id : null); if (wrapRef.current) wrapRef.current.style.cursor = n ? "pointer" : "default"; }}
          onNodeClick={(n: any) => { setSel(n); setFocusNode(n.id); }}
          onBackgroundClick={(ev: any) => { snapSelect2d(ev); setFocusNode(null); }}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, scale: number) => {
            const dimmed = neighbors && !neighbors.has(node.id);
            const isFocus = node.id === focusId;
            const r = (2.4 + Math.min(node.deg, 9) * 0.7);
            ctx.globalAlpha = dimmed ? 0.18 : 1;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
            ctx.fillStyle = NODE_HEX[node.etype] ?? "#b88a2e";
            ctx.fill();
            if (isFocus) { ctx.lineWidth = 1.4 / scale; ctx.strokeStyle = INK; ctx.stroke(); }
            const showLabel = (!dimmed) && (isFocus || (neighbors && neighbors.has(node.id)) || (!neighbors && node.deg >= 5));
            if (showLabel && scale > 0.5) {
              const fs = Math.max(10 / scale, 3);
              ctx.font = `500 ${fs}px Zodiak, Georgia, serif`;
              ctx.textAlign = "center"; ctx.textBaseline = "top";
              ctx.fillStyle = INK;
              const lbl = node.label.length > 28 ? node.label.slice(0, 26) + "…" : node.label;
              ctx.fillText(lbl, node.x, node.y + r + 1.5);
            }
            ctx.globalAlpha = 1;
          }}
        />
      )}
      <div className="stage-overlay" style={{ left: 14, bottom: 14, fontSize: 11.5 }}>
        <span className="muted tnum">{graph.nodes.length} nodi · {graph.links.length} legami · {range.min}–{range.max}</span>
      </div>
      <div className="stage-overlay" style={{ right: full ? 14 : 14, bottom: 14, fontSize: 11 }}>
        <span className="faint">{mode === "3d" ? "orbita · zoom · trascina per ruotare · clic su un nodo" : "trascina · zoom · clic su un nodo"}</span>
      </div>
    </div>
  );

  return (
    <div className="wrap page" style={{ paddingBottom: 24 }}>
      <div className="page-head">
        <div className="page-eyebrow"><span className="sec-num">02</span><span className="eyebrow">Rete neurale</span></div>
        <h1 className="page-title">Il grafo delle interconnessioni</h1>
        <p className="page-lead">Ogni nodo è un'entità, ogni filo un legame documentato: influenze, rielaborazioni, rapporti maestro-allievo, committenze. Muoviti nello spazio in 3D, passa il mouse su un nodo per accenderne le connessioni, clicca per i dettagli. Lo slider temporale filtra la rete.</p>
      </div>
      <div className="page-rule" />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16, alignItems: "center" }}>
        {modeToggle}
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Cerca opera, autore, luogo…"
          data-testid="gf-search"
          style={{ flex: "1 1 280px", maxWidth: 420, padding: "9px 14px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--bg-1)", color: "var(--ink)", fontSize: 14 }}
        />
        {(searchQuery || focusNode) && (
          <button className="btn ghost sm" onClick={handleClearSearch} data-testid="gf-search-clear">✕ Pulisci</button>
        )}
        <span className="faint" style={{ fontSize: 12.5 }}>I filtri per livello e legame sono nel pannello a destra.</span>
      </div>

      <Fullscreen title="Rete delle connessioni" controls={isFull ? null : fsControls} showSlider={!isFull} onChange={setIsFull}>
        <div className="gf-inner">
          {renderGraph(false)}

        <div className="gf-side">
          {/* CHANGE 7: in fullscreen mostra slider + mode toggle qui (niente drawer) */}
          {isFull && (
            <div className="panel gf-fs-only" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="sbx-trs" style={{ margin: "0 -4px" }}>
                <TimeRangeSlider compact />
              </div>
              {modeToggle}
            </div>
          )}

          {/* CHANGE 6: risultati di ricerca (sopra i filtri) */}
          {searchQuery.trim() && !focusNode && (
            <div className="panel" data-testid="gf-search-results">
              <div className="panel-title" style={{ fontSize: 15, marginBottom: 8 }}>Risultati ({searchResults.length})</div>
              {searchResults.length === 0 ? (
                <div className="muted" style={{ fontSize: 13.5, padding: "6px 0" }}>Nessun risultato per «{searchQuery}».</div>
              ) : (
                <div style={{ maxHeight: 280, overflowY: "auto", margin: "0 -4px", paddingRight: 4 }}>
                  {searchResults.map((r) => (
                    <button key={r.id} className="gf-frow" onClick={() => handleSearchResultClick(r)} style={{ width: "100%", textAlign: "left", background: "none", border: 0, cursor: "pointer", padding: "7px 6px", borderBottom: "1px solid var(--line-soft)", color: "var(--ink)", fontSize: 13 }}>
                      <span className="dot" style={{ background: NODE_HEX[r.etype] ?? "#b88a2e", marginRight: 8 }} />
                      <span style={{ flex: 1, minWidth: 0 }}>{r.label}</span>
                      <span className="faint" style={{ fontSize: 11, marginLeft: 6 }}>{r.etype === "city" ? "Luogo" : ENTITY_LABEL[r.etype as EntityType]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* pannello filtri in stile "Livelli" (riorganizzazione richiesta) */}
          <div className="panel gf-filters" data-testid="gf-filters">
            <div className="panel-title" style={{ fontSize: 17, marginBottom: 10 }}>Livelli</div>
            {[...NODE_TYPES, "city" as const].map((t) => {
              const off = hideTypes.has(t);
              return (
                <button key={t} className={`gf-frow ${off ? "off" : ""}`} onClick={() => toggle(hideTypes, t, setHideTypes)} data-testid={`gf-type-${t}`}>
                  <span className="dot" style={{ background: NODE_HEX[t] }} />
                  <span className="gf-frow-lab">{t === "city" ? "Luogo" : ENTITY_LABEL[t as EntityType]}</span>
                  <span className="gf-frow-n tnum">{counts[t] ?? 0}</span>
                  <EyeIcon off={off} />
                </button>
              );
            })}
            <div className="panel-title" style={{ fontSize: 17, margin: "16px 0 10px" }}>Legami</div>
            {KINDS.map((k) => {
              const off = hideKinds.has(k);
              return (
                <button key={k} className={`gf-frow ${off ? "off" : ""}`} onClick={() => toggle(hideKinds, k, setHideKinds)} data-testid={`gf-kind-${k}`}>
                  <span className="dot" style={{ background: KIND_COLOR[k] }} />
                  <span className="gf-frow-lab">{KIND_LABEL[k]}</span>
                  <EyeIcon off={off} />
                </button>
              );
            })}
          </div>

          {sel && selDetail ? (
            <div className="panel" data-testid="gf-panel">
              <div className="eyebrow" style={{ color: sel.etype === "city" ? NODE_HEX.city : ENTITY_COLOR[sel.etype as EntityType], marginBottom: 8 }}>{sel.etype === "city" ? "Luogo" : ENTITY_LABEL[sel.etype as EntityType]}</div>
              <h3 className="panel-title" style={{ marginBottom: 8 }}>{sel.label}</h3>
              {sel.etype === "city" && (() => {
                const cityWorks = ix.ds.works.filter((w) => w.location_city === sel.eid && workIn(w));
                return (
                  <>
                    <div className="faint tnum" style={{ fontSize: 12, marginBottom: 10 }}>{cityWorks.length} opere conservate qui (nell'intervallo attivo)</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                      <Link className="btn gold sm" to={`/luogo/${encodeURIComponent(sel.eid)}`} data-testid="gf-city-page">Apri la scheda del luogo →</Link>
                      <Link className="btn sm ghost" to="/mappa" data-testid="gf-city-map">Mappa →</Link>
                    </div>
                    <div className="smallcaps" style={{ margin: "4px 0 8px" }}>Opere</div>
                    <div style={{ maxHeight: 300, overflowY: "auto", margin: "0 -4px", paddingRight: 4 }}>
                      {cityWorks.slice(0, 40).map((w) => (
                        <div key={w.id} style={{ padding: "7px 0", borderBottom: "1px solid var(--line-soft)", fontSize: 13 }}>
                          <Link className="tlink" to={`/opera/${w.id}`}>{w.title}</Link>
                        </div>
                      ))}
                      {cityWorks.length > 40 && <div className="faint" style={{ padding: "7px 0", fontSize: 12 }}>… e altre {cityWorks.length - 40}</div>}
                    </div>
                  </>
                );
              })()}
              {sel.etype === "work" && selDetail.ent && (
                <Link to={`/opera/${sel.eid}`} className="card" style={{ display: "block", aspectRatio: "4/3", marginBottom: 12, overflow: "hidden" }}>
                  <WorkImage work={selDetail.ent} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </Link>
              )}
              {selDetail.ent?.summary && <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 6 }}>{selDetail.ent.summary.slice(0, 180)}{selDetail.ent.summary.length > 180 ? "…" : ""}</p>}
              {selDetail.ent?.bio && <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 6 }}>{selDetail.ent.bio.slice(0, 180)}{selDetail.ent.bio.length > 180 ? "…" : ""}</p>}
              {selDetail.ent?.definition && <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 6 }}>{selDetail.ent.definition}</p>}
              <div className="faint tnum" style={{ fontSize: 12, marginBottom: 14 }}>{sel.deg} connessioni nel grafo</div>

              {(["artist", "work", "period", "term", "technique"].includes(sel.etype)) && (
                <Link className="btn gold sm" style={{ marginBottom: 14 }} to={entityHref(sel.etype, sel.eid)} data-testid="gf-open">Apri la scheda →</Link>
              )}

              {selDetail.conns.length > 0 && (
                <>
                  <div className="smallcaps" style={{ margin: "8px 0 8px" }}>Connessioni</div>
                  <div style={{ maxHeight: 280, overflowY: "auto", margin: "0 -4px", paddingRight: 4 }}>
                    {selDetail.conns.slice(0, 30).map((c) => {
                      const otherIsSource = !(c.source_type === sel.etype && c.source_id === sel.eid);
                      const ot = otherIsSource ? c.source_type : c.target_type;
                      const oid = otherIsSource ? c.source_id : c.target_id;
                      return (
                        <div key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--line-soft)" }}>
                          <span className="tag" style={{ marginBottom: 4, color: KIND_COLOR[c.kind], borderColor: "var(--line)" }}>{KIND_LABEL[c.kind] ?? c.kind}</span>
                          <div style={{ fontSize: 13 }}>
                            <Link className="tlink" to={entityHref(ot, oid)} onClick={() => { const k = `${ot}:${oid}`; const nn = graph.nodes.find((x) => x.id === k); if (nn) { setSel(nn); setFocusNode(nn.id); } }}>
                              {entityLabel(ix, ot, oid)}
                            </Link>
                            <span className="faint" style={{ fontSize: 11 }}> · {ENTITY_LABEL[ot]}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="panel gf-placeholder" style={{ textAlign: "center", color: "var(--ink-dim)", fontSize: 14 }}>
              Seleziona un nodo per i dettagli.
              <div style={{ marginTop: 14 }}>
                <button className="btn sm ghost" onClick={restartFocus}>Riordina la rete</button>
              </div>
            </div>
          )}
        </div>
        </div>
      </Fullscreen>
    </div>
  );
}

// osserva la dimensione del contenitore (gestisce sia normale che fullscreen)
function GraphSizer({ wrapRef, full, setDims }: { wrapRef: any; full: boolean; setDims: (d: { w: number; h: number }) => void }) {
  const selfRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (full) {
      // In fullscreen: dimensioni fisse basate sulla finestra.
      // NON usare ResizeObserver (causa tremolio del force-graph).
      const w = window.innerWidth;
      const h = window.innerHeight;
      setDims({ w: w - (window.innerWidth > 900 ? 320 : 0), h }); // sottrai larghezza drawer se desktop
      return;
    }
    // Modalità normale: usa ResizeObserver con debounce
    const target = wrapRef.current;
    if (!target) return;
    let timeout: any;
    const ro = new ResizeObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setDims({ w: target.clientWidth, h: target.clientHeight });
      }, 300);
    });
    ro.observe(target);
    setDims({ w: target.clientWidth, h: target.clientHeight });
    return () => { ro.disconnect(); clearTimeout(timeout); };
  }, [full, wrapRef, setDims]);
  return <div ref={selfRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: -1 }} />;
}

// occhio on/off per le righe filtro (stile riferimento "Livelli")
function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" style={{ opacity: off ? 0.45 : 0.8, flexShrink: 0 }}>
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.6" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}
