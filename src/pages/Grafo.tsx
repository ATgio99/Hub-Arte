import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import ForceGraph2D from "react-force-graph-2d";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
import SpriteText from "three-spritetext";
import { useData, useTimeRange } from "../lib/store";
import { ENTITY_COLOR, entityHref, WorkImage } from "../components/ui";
import { ENTITY_LABEL, KIND_LABEL, entityLabel } from "../lib/data";
import { getLastRete, setLastRete, clearLastRete } from "../lib/lastVisited";
import Fullscreen from "../components/Fullscreen";
import TimeRangeSlider from "../components/TimeRangeSlider";
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

  // === Ricerca globale ===
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ type: EntityType | "city"; id: string; label: string; subtitle?: string }[]>([]);

  // Quando l'utente seleziona un risultato, filtra il grafo per mostrare
  // solo quel nodo + tutti i nodi connessi (fino a 2 livelli)
  const [focusNode, setFocusNode] = useState<string | null>(null);

  // Ricerca globale: cerca in tutte le entità
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Appena l'utente ricomincia a digitare, usciamo dal focus su un risultato
    // precedente — altrimenti il messaggio "Nessun risultato" verrebbe
    // nascosto dal flag focusNode anche durante una nuova ricerca valida.
    if (focusNode) setFocusNode(null);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const q = query.toLowerCase().trim();
    const results: { type: EntityType | "city"; id: string; label: string; subtitle?: string }[] = [];
    // Opere
    for (const w of ix.ds.works) {
      if (w.title.toLowerCase().includes(q) || w.id.toLowerCase().includes(q)) {
        results.push({ type: "work", id: w.id, label: w.title, subtitle: w.location_city || undefined });
        if (results.length >= 20) break;
      }
    }
    // Artisti
    if (results.length < 20) {
      for (const a of ix.ds.artists) {
        if (a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || a.aka.some(ak => ak.toLowerCase().includes(q))) {
          results.push({ type: "artist", id: a.id, label: a.name, subtitle: a.role || undefined });
          if (results.length >= 20) break;
        }
      }
    }
    // Luoghi (città)
    if (results.length < 20) {
      const cities = new Set<string>();
      for (const w of ix.ds.works) {
        if (w.location_city && w.location_city.toLowerCase().includes(q)) cities.add(w.location_city);
      }
      for (const city of cities) {
        results.push({ type: "city", id: city, label: city, subtitle: "Luogo" });
        if (results.length >= 20) break;
      }
    }
    // Periodi
    if (results.length < 20) {
      for (const p of ix.ds.periods) {
        if (p.name.toLowerCase().includes(q)) {
          results.push({ type: "period", id: p.id, label: p.name, subtitle: `${p.year_start}–${p.year_end}` });
          if (results.length >= 20) break;
        }
      }
    }
    // Termini
    if (results.length < 20) {
      for (const t of ix.ds.terms) {
        if (t.term.toLowerCase().includes(q)) {
          results.push({ type: "term", id: t.id, label: t.term, subtitle: t.category });
          if (results.length >= 20) break;
        }
      }
    }
    // Tecniche
    if (results.length < 20) {
      for (const t of ix.ds.techniques) {
        if (t.name.toLowerCase().includes(q)) {
          results.push({ type: "technique", id: t.id, label: t.name, subtitle: t.category });
          if (results.length >= 20) break;
        }
      }
    }
    setSearchResults(results);
  };

  // Quando l'utente seleziona un risultato, filtra il grafo per mostrare
  // solo quel nodo + tutti i nodi connessi (fino a 2 livelli)
  const handleSelectResult = (result: { type: EntityType | "city"; id: string; label: string }) => {
    const nodeKey = `${result.type}:${result.id}`;
    setFocusNode(nodeKey);
    setSearchQuery(result.label);
    setSearchResults([]); // chiudi il dropdown
    const node = graph.nodes.find(n => n.id === nodeKey);
    if (node) {
      setSel(node);
    }
  };

  // Reset del focus (mostra tutto il grafo)
  const handleClearSearch = () => {
    setFocusNode(null);
    setSearchQuery("");
    setSearchResults([]);
    setSel(null);
    // Reset esplicito: cancella anche la memoria "ultima ricerca"
    clearLastRete();
    window.dispatchEvent(new CustomEvent("atlante:last-visited-changed"));
  };

  // === Memoria ultima ricerca nel grafo ===
  // All'apertura della pagina, ripristina l'ultima ricerca salvata
  // (focusNode + searchQuery) se esiste.
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (restored) return;
    const last = getLastRete();
    if (last && last.focusNode) {
      setFocusNode(last.focusNode);
      setSearchQuery(last.searchQuery || "");
    }
    setRestored(true);
  }, [restored]);

  // Quando focusNode o searchQuery cambiano (dopo il ripristino iniziale),
  // salva nello storage per ritrovarli alla prossima apertura.
  useEffect(() => {
    if (!restored) return;
    // Se non c'è focusNode, non salviamo nulla (così il clear rimane "pulito")
    if (focusNode) {
      setLastRete({ focusNode, searchQuery });
    } else {
      clearLastRete();
    }
    // Notifica la sidebar di aggiornare l'etichetta "Continua"
    window.dispatchEvent(new CustomEvent("atlante:last-visited-changed"));
  }, [focusNode, searchQuery, restored]);

  // Ascolta il "doppio click su Rete" dalla sidebar: resetta il grafo
  // (svuota focusNode + searchQuery + selezione). Quando l'utente è già
  // sulla pagina Rete e clicca di nuovo "Rete" nel menu, la sidebar
  // emette questo evento invece di fare una navigazione vera e propria.
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

  // ResizeObserver SOLO in modalità non-fullscreen.
  // In fullscreen usiamo dimensioni fisse (window.innerWidth/innerHeight)
  // perché il ResizeObserver causa un loop di re-render → tremolio del grafo.
  useEffect(() => {
    if (isFull) return; // skip in fullscreen
    const ro = new ResizeObserver(() => {
      if (wrapRef.current) setDims({ w: wrapRef.current.clientWidth, h: wrapRef.current.clientHeight });
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [isFull]);

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
    // città come nodi di raggruppamento
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

    // === Se c'è un focusNode (ricerca), filtra il grafo per mostrare solo
    //     il nodo cercato + i suoi vicini diretti + i vicini di 2° livello ===
    if (focusNode) {
      // Calcola l'insieme dei nodi visibili: focus + adiacenti + adiacenti-di-adiacenti
      const adjMap = new Map<string, Set<string>>();
      for (const l of links) {
        const s = typeof l.source === "object" ? l.source.id : l.source;
        const t = typeof l.target === "object" ? l.target.id : l.target;
        if (!adjMap.has(s)) adjMap.set(s, new Set());
        if (!adjMap.has(t)) adjMap.set(t, new Set());
        adjMap.get(s)!.add(t);
        adjMap.get(t)!.add(s);
      }
      const visibleNodes = new Set<string>([focusNode]);
      // 1° livello
      adjMap.get(focusNode)?.forEach(n => visibleNodes.add(n));
      // 2° livello
      const firstLevel = [...(adjMap.get(focusNode) || [])];
      for (const n of firstLevel) {
        adjMap.get(n)?.forEach(m => visibleNodes.add(m));
      }
      // Filtra nodi e links
      const filteredNodes = [...nodeMap.values()].filter(n => visibleNodes.has(n.id));
      const filteredLinks = links.filter(l => {
        const s = typeof l.source === "object" ? l.source.id : l.source;
        const t = typeof l.target === "object" ? l.target.id : l.target;
        return visibleNodes.has(s) && visibleNodes.has(t);
      });
      return { nodes: filteredNodes, links: filteredLinks };
    }

    return { nodes: [...nodeMap.values()], links };
  }, [ix, hideTypes, hideKinds, inTime, focusNode]);

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
    // Se si è cliccato su un arco (link), mostra info sulla connessione
    if (sel.etype === "link") {
      const sNode = typeof sel.linkSource === "object" ? sel.linkSource : graph.nodes.find(n => n.id === sel.linkSource);
      const tNode = typeof sel.linkTarget === "object" ? sel.linkTarget : graph.nodes.find(n => n.id === sel.linkTarget);
      return { conns: [], ent: null, isLink: true, sNode, tNode, kind: sel.linkKind, desc: sel.linkDesc };
    }
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

  // Blocco filtri + slider temporale, mostrato dentro la colonna destra
  // (.gf-side) SOLO in modalità fullscreen. In modalità normale i filtri
  // rimangono disposti in orizzontale sotto il grafo e lo slider è nella
  // sidebar dell'app, come sempre.
  const sideFiltersBlock = (
    <div className="panel gf-fs-only" data-testid="gf-fs-filters">
      <div className="panel-title" style={{ fontSize: 15, marginBottom: 10 }}>Tempo</div>
      <div style={{ margin: "0 -4px 14px" }}>
        <TimeRangeSlider compact />
      </div>
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
  );

  const renderGraph = (full: boolean) => (
    <div className="stage" ref={!full ? wrapRef : undefined} style={{
      // In fullscreen: dimensioni FISSE (width/height in px) invece di 100%/flex.
      // Se usassimo 100%/flex, ogni micro-reflow del parent (es. animazione
      // del drawer) causerebbe il ridimensionamento del canvas → zoom intermittente.
      // Nota: in fullscreen passiamo full=false a renderGraph (perché il CSS
      // .fs-host:fullscreen .gf-inner > .stage forza height:100% !important),
      // ma passiamo full=isFull al GraphSizer per fargli calcolare le dims.
      width: full ? dims.w : "100%",
      height: full ? dims.h : "min(72vh, 700px)",
      flex: full ? undefined : undefined,
      border: full ? 0 : undefined,
      borderRadius: full ? 0 : undefined,
    }} data-testid="graph-stage">
      <GraphSizer wrapRef={wrapRef} full={isFull} setDims={setDims} />
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
          onNodeHover={(n: any) => { setHoverId(n ? n.id : null); if (wrapRef.current) wrapRef.current.style.cursor = n ? "pointer" : "default"; }}
          onNodeClick={(n: any) => { setSel(n); }}
          onLinkClick={(l: any) => { setSel({ id: typeof l.source === "object" ? l.source.id : l.source, etype: "link", eid: "", label: "", deg: 0, linkKind: l.kind, linkDesc: l.desc, linkSource: l.source, linkTarget: l.target }); }}
          linkLabel={(l: any) => `${KIND_LABEL[l.kind] || l.kind}${l.desc ? " — " + l.desc : ""}`}
          nodeLabel={(n: any) => `${n.label} (${n.etype === "city" ? "Luogo" : ENTITY_LABEL[n.etype as EntityType] || n.etype}) · ${n.deg} connessioni`}
          onBackgroundClick={() => setSel(null)}
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
          onNodeClick={(n: any) => { setSel(n); }}
          onLinkClick={(l: any) => { setSel({ id: typeof l.source === "object" ? l.source.id : l.source, etype: "link", eid: "", label: "", deg: 0, linkKind: l.kind, linkDesc: l.desc, linkSource: l.source, linkTarget: l.target }); }}
          linkLabel={(l: any) => `${KIND_LABEL[l.kind] || l.kind}${l.desc ? " — " + l.desc : ""}`}
          nodeLabel={(n: any) => `${n.label} (${n.etype === "city" ? "Luogo" : ENTITY_LABEL[n.etype as EntityType] || n.etype}) · ${n.deg} connessioni`}
          onBackgroundClick={(ev: any) => snapSelect2d(ev)}
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
    </div>
  );

  return (
    <div className="wrap page" style={{ paddingBottom: 24 }}>
      <div className="page-head">
        <div className="page-eyebrow"><span className="eyebrow">Rete neurale <span style={{ fontSize: 9, fontWeight: 700, color: "var(--ink-dim)", opacity: 0.5, textTransform: "lowercase", letterSpacing: "0.02em" }}>(beta)</span></span></div>
        <h1 className="page-title">Il grafo delle interconnessioni</h1>
        <p className="page-lead">Ogni nodo è un'entità, ogni filo un legame documentato: influenze, rielaborazioni, rapporti maestro-allievo, committenze. Clicca su un nodo per i dettagli e le sue connessioni, clicca su un arco per vedere il tipo di legame. Lo slider temporale filtra la rete.</p>
      </div>
      <div className="page-rule" />

      {/* Barra superiore: solo mode toggle */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16, alignItems: "center" }}>
        {modeToggle}
        {focusNode && (
          <button onClick={handleClearSearch} className="btn ghost sm" style={{ fontSize: 12 }}>← Mostra tutto</button>
        )}
        {!focusNode && (
          <span className="faint" style={{ fontSize: 12.5 }}>Cerca nel pannello a destra per filtrare la rete.</span>
        )}
      </div>

      {/* Layout: grafo a sinistra + pannello dettagli a destra.
          In fullscreen NON usiamo il drawer laterale del componente Fullscreen:
          la colonna destra (.gf-side) contiene già ricerca, dettagli e filtri
          (in parallelsso al grafo), così la disposizione è coerente con la
          modalità normale e la mappa è alta quanto l'intera colonna destra. */}
      <Fullscreen title="Rete delle connessioni" controls={null} showSlider={false} onChange={setIsFull}>
        <div className="gf-inner">
          {renderGraph(false)}

        {/* Pannello destro: ricerca + dettagli nodo/connessione (stile Mappa) */}
        <div className="gf-side">
          {/* Pannello ricerca — come nella pagina Mappa */}
          <div className="panel" style={{ marginBottom: 12 }}>
            <div className="panel-title">Cerca</div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Cerca opera, autore, luogo…"
              style={{
                width: "100%", padding: "7px 10px", marginBottom: 10,
                border: "1px solid var(--line)", borderRadius: 6,
                background: "var(--bg)", color: "var(--ink)",
                fontSize: 13, fontFamily: "inherit",
              }}
            />
            <div style={{ maxHeight: 280, overflowY: "auto", margin: "0 -4px", paddingRight: 4 }}>
              {searchQuery.trim() && searchResults.length === 0 && !focusNode && (
                <div style={{ padding: "12px 0", textAlign: "center", color: "var(--ink-dim)", fontSize: 13 }}>
                  Nessun risultato per "{searchQuery}".
                </div>
              )}
              {searchResults.map((r) => (
                <button
                  key={`${r.type}:${r.id}`}
                  onClick={() => handleSelectResult(r)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    width: "100%", padding: "8px 4px",
                    border: 0, borderBottom: "1px solid var(--line-soft)",
                    background: "transparent", cursor: "pointer",
                    textAlign: "left", fontFamily: "inherit",
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: NODE_HEX[r.type] || "#b88a2e", flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
                    <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>{r.subtitle ? `${r.subtitle} · ` : ""}{r.type === "city" ? "Luogo" : ENTITY_LABEL[r.type as EntityType]}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {sel && selDetail ? (
            <div className="panel" data-testid="gf-panel">
              {/* === Click su ARCO === */}
              {sel.etype === "link" && selDetail.isLink && selDetail.sNode && selDetail.tNode ? (
                <>
                  <div className="eyebrow" style={{ color: KIND_COLOR[selDetail.kind] || "#b88a2e", marginBottom: 8 }}>Connessione</div>
                  <span className="tag" style={{ marginBottom: 10, color: KIND_COLOR[selDetail.kind] || "#b88a2e", borderColor: "var(--line)" }}>{KIND_LABEL[selDetail.kind as ConnKind] || selDetail.kind}</span>
                  {selDetail.desc && <p className="muted" style={{ fontSize: 13, lineHeight: 1.6, margin: "8px 0", fontStyle: "italic" }}>"{selDetail.desc}"</p>}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "10px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--bg-2)", borderRadius: 6, border: "1px solid var(--line-soft)" }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: NODE_HEX[selDetail.sNode.etype] || "#b88a2e", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{selDetail.sNode.label}</span>
                      <span style={{ fontSize: 10, color: "var(--ink-dim)", marginLeft: "auto" }}>{selDetail.sNode.etype === "city" ? "Luogo" : ENTITY_LABEL[selDetail.sNode.etype as EntityType]}</span>
                    </div>
                    <div style={{ textAlign: "center", color: "var(--ink-dim)", fontSize: 14 }}>↓</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--bg-2)", borderRadius: 6, border: "1px solid var(--line-soft)" }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: NODE_HEX[selDetail.tNode.etype] || "#b88a2e", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{selDetail.tNode.label}</span>
                      <span style={{ fontSize: 10, color: "var(--ink-dim)", marginLeft: "auto" }}>{selDetail.tNode.etype === "city" ? "Luogo" : ENTITY_LABEL[selDetail.tNode.etype as EntityType]}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    {(["artist", "work", "period", "term", "technique"].includes(selDetail.sNode.etype)) && (
                      <Link className="btn gold sm" to={entityHref(selDetail.sNode.etype, selDetail.sNode.eid)} style={{ fontSize: 12 }}>Apri {selDetail.sNode.label} →</Link>
                    )}
                    {(["artist", "work", "period", "term", "technique"].includes(selDetail.tNode.etype)) && (
                      <Link className="btn gold sm" to={entityHref(selDetail.tNode.etype, selDetail.tNode.eid)} style={{ fontSize: 12 }}>Apri {selDetail.tNode.label} →</Link>
                    )}
                  </div>
                </>
              ) : (
              <>
              {/* === Click su NODO === */}
              <div className="eyebrow" style={{ color: sel.etype === "city" ? NODE_HEX.city : ENTITY_COLOR[sel.etype as EntityType], marginBottom: 8 }}>{sel.etype === "city" ? "Luogo" : ENTITY_LABEL[sel.etype as EntityType]}</div>
              <h3 className="panel-title" style={{ marginBottom: 8 }}>{sel.label}</h3>
              {sel.etype === "city" && (() => {
                const cityWorks = ix.ds.works.filter((w) => w.location_city === sel.eid && workIn(w));
                return (
                  <>
                    <div className="faint tnum" style={{ fontSize: 12, marginBottom: 10 }}>{cityWorks.length} opere conservate qui</div>
                    <Link className="btn gold sm" to={`/luogo/${encodeURIComponent(sel.eid)}`} style={{ marginBottom: 12 }}>Apri il luogo →</Link>
                    <div className="smallcaps" style={{ margin: "4px 0 8px" }}>Opere</div>
                    <div style={{ maxHeight: 200, overflowY: "auto", margin: "0 -4px", paddingRight: 4 }}>
                      {cityWorks.slice(0, 30).map((w) => (
                        <div key={w.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--line-soft)", fontSize: 13 }}><Link className="tlink" to={`/opera/${w.id}`}>{w.title}</Link></div>
                      ))}
                    </div>
                  </>
                );
              })()}
              {sel.etype === "work" && selDetail.ent && (
                <Link to={`/opera/${sel.eid}`} className="card" style={{ display: "block", aspectRatio: "4/3", marginBottom: 12, overflow: "hidden" }}><WorkImage work={selDetail.ent} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></Link>
              )}
              {selDetail.ent?.summary && <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 6 }}>{selDetail.ent.summary.slice(0, 160)}{selDetail.ent.summary.length > 160 ? "…" : ""}</p>}
              {selDetail.ent?.bio && <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 6 }}>{selDetail.ent.bio.slice(0, 160)}{selDetail.ent.bio.length > 160 ? "…" : ""}</p>}
              {selDetail.ent?.definition && <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 6 }}>{selDetail.ent.definition}</p>}
              <div className="faint tnum" style={{ fontSize: 12, marginBottom: 10 }}>{sel.deg} connessioni nel grafo</div>
              {(["artist", "work", "period", "term", "technique"].includes(sel.etype)) && (
                <Link className="btn gold sm" style={{ marginBottom: 14 }} to={entityHref(sel.etype, sel.eid)} data-testid="gf-open">Apri la scheda →</Link>
              )}
              {/* === Lista connessioni con motivo e tasto Apri === */}
              {selDetail.conns.length > 0 && (
                <>
                  <div className="smallcaps" style={{ margin: "8px 0 8px" }}>Connessioni ({selDetail.conns.length})</div>
                  <div style={{ maxHeight: 320, overflowY: "auto", margin: "0 -4px", paddingRight: 4 }}>
                    {selDetail.conns.slice(0, 30).map((c) => {
                      const otherIsSource = !(c.source_type === sel.etype && c.source_id === sel.eid);
                      const ot = otherIsSource ? c.source_type : c.target_type;
                      const oid = otherIsSource ? c.source_id : c.target_id;
                      return (
                        <div key={c.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--line-soft)" }}>
                          <span className="tag" style={{ marginBottom: 4, color: KIND_COLOR[c.kind], borderColor: "var(--line)", fontSize: 10 }}>{KIND_LABEL[c.kind] ?? c.kind}</span>
                          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{entityLabel(ix, ot, oid)}</div>
                          <div className="faint" style={{ fontSize: 11, marginBottom: 4 }}>{ENTITY_LABEL[ot]}</div>
                          {c.description && <div style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.4, marginBottom: 6, fontStyle: "italic" }}>{c.description}</div>}
                          {(["artist", "work", "period", "term", "technique"].includes(ot)) && (
                            <Link className="tlink" to={entityHref(ot, oid)} onClick={() => { const k = `${ot}:${oid}`; const nn = graph.nodes.find((x) => x.id === k); if (nn) setSel(nn); }} style={{ fontSize: 12, fontWeight: 600 }}>Apri scheda →</Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              </>
              )}
            </div>
          ) : (
            <div className="panel gf-placeholder" style={{ textAlign: "center", color: "var(--ink-dim)", fontSize: 14 }}>
              Clicca un nodo o una connessione per i dettagli.
              <div style={{ marginTop: 14 }}><button className="btn sm ghost" onClick={restartFocus}>Riordina la rete</button></div>
            </div>
          )}

          {/* In fullscreen mostriamo qui i filtri e lo slider temporale,
              così la colonna destra contiene ricerca → risultati → dettagli → filtri,
              in parallelo al grafo che occupa tutta l'altezza della colonna. */}
          {sideFiltersBlock}
        </div>
        </div>
      </Fullscreen>

      {/* === Filtri in orizzontale sotto il grafo (modalità normale) ===
          In fullscreen vengono nascosti via CSS (.gf-bottom-filters display:none)
          perché sono stati spostati dentro la colonna destra (vedi sideFiltersBlock).
          "Livelli" e "Legami" stanno su due righe separate, entrambe allineate a sinistra. */}
      <div className="gf-bottom-filters" style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16, padding: "12px 16px", background: "var(--bg-2)", borderRadius: 10, border: "1px solid var(--line)" }}>
        {/* Riga 1: Livelli */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <div className="smallcaps" style={{ marginRight: 8 }}>Livelli:</div>
          {[...NODE_TYPES, "city" as const].map((t) => {
            const off = hideTypes.has(t);
            return (
              <button key={t} onClick={() => toggle(hideTypes, t, setHideTypes)} style={{ fontSize: 11, padding: "4px 10px", opacity: off ? 0.4 : 1, cursor: "pointer", border: "1px solid var(--line)", borderRadius: 999, background: off ? "transparent" : "var(--bg)" }}>
                <span className="dot" style={{ background: NODE_HEX[t], marginRight: 4 }} />{t === "city" ? "Luogo" : ENTITY_LABEL[t as EntityType]} ({counts[t] ?? 0})
              </button>
            );
          })}
        </div>
        {/* Riga 2: Legami */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <div className="smallcaps" style={{ marginRight: 8 }}>Legami:</div>
          {KINDS.map((k) => {
            const off = hideKinds.has(k);
            return (
              <button key={k} onClick={() => toggle(hideKinds, k, setHideKinds)} style={{ fontSize: 11, padding: "4px 10px", opacity: off ? 0.4 : 1, cursor: "pointer", border: "1px solid var(--line)", borderRadius: 999, background: off ? "transparent" : "var(--bg)" }}>
                <span className="dot" style={{ background: KIND_COLOR[k], marginRight: 4 }} />{KIND_LABEL[k]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// osserva la dimensione del contenitore (gestisce sia normale che fullscreen)
function GraphSizer({ wrapRef, full, setDims }: { wrapRef: any; full: boolean; setDims: (d: { w: number; h: number }) => void }) {
  const selfRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (full) {
      // In fullscreen: dimensioni CALCOLATE UNA VOLTA sola all'ingresso.
      // NON usare ResizeObserver né ascoltare window resize:
      // cambiare width/height del ForceGraph3D causa re-render del canvas
      // e ricalcolo della camera → effetto zoom intermittente.
      // Il grafo mantiene le dimensioni fisse finché si resta in fullscreen.
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Colonna destra di 340px + gap 18px + padding laterale 18+18 = 394px
      // sui desktop; su mobile (w <= 980) la colonna destra va in basso, quindi
      // il grafo occupa tutta la larghezza disponibile.
      const sideW = w > 980 ? 376 : 36; // 340 + 18 + 18 = 376
      const topPad = 56; // spazio per il titolo + pulsante "Esci"
      const bottomPad = 18;
      setDims({
        w: Math.max(200, w - sideW),
        h: Math.max(200, h - topPad - bottomPad),
      });
      return; // nessun listener, nessun aggiornamento
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
