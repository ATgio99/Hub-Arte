import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useData, useTimeRange } from "../lib/store";
import { Empty, EntityLink, FilterNote } from "../components/ui";
import WorksInline from "../components/WorksInline";
import type { TermCategory } from "../lib/types";

const CATS: TermCategory[] = ["architettura", "pittura", "scultura", "iconografia", "generale"];

export default function Glossario() {
  const ix = useData();
  const { termIn } = useTimeRange();
  const [sp] = useSearchParams();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [onlyArch, setOnlyArch] = useState(false);
  const [active, setActive] = useState<string | null>(sp.get("t"));
  // Termini espansi: il blocco opere si apre dentro la scheda
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Trova opere che contengono un dato termine (per ID).
  const worksWithTerm = useMemo(() => {
    const map = new Map<string, typeof ix.ds.works>();
    for (const w of ix.ds.works) {
      for (const tid of w.term_ids || []) {
        if (!map.has(tid)) map.set(tid, []);
        map.get(tid)!.push(w);
      }
    }
    return map;
  }, [ix.ds.works]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  useEffect(() => {
    const t = sp.get("t");
    if (t) { setActive(t); setTimeout(() => document.getElementById(`term-${t}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 300); }
  }, [sp]);

  // termini visibili nell'intervallo temporale globale (prima dei filtri locali)
  const inTime = useMemo(() => ix.ds.terms.filter(termIn), [ix, termIn]);

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return inTime
      .filter((t) => {
        if (cat && t.category !== cat) return false;
        if (onlyArch && !t.is_archetype) return false;
        if (qq && !(t.term.toLowerCase().includes(qq) || t.definition.toLowerCase().includes(qq))) return false;
        return true;
      })
      .sort((a, b) => a.term.localeCompare(b.term, "it"));
  }, [inTime, q, cat, onlyArch]);

  return (
    <div className="wrap page">
      <div className="page-head">
        <div className="page-eyebrow"><span className="eyebrow">Voci · Glossario</span></div>
        <h1 className="page-title">Glossario</h1>
        <p className="page-lead">Terminologia specifica, parti architettoniche e archetipi ricorrenti. Gli <strong style={{ color: "var(--c-term)" }}>archetipi</strong> sono elementi che riemergono nei secoli.</p>
      </div>

      <div className="page-rule" />

      <div className="filterbar">
        <input className="input" placeholder="Cerca un termine…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-search" style={{ flex: "1 1 220px" }} />
        <div className="filter-group">
          <span className={`chip ${cat === "" ? "active" : ""}`} onClick={() => setCat("")}>tutte</span>
          {CATS.map((c) => <span key={c} className={`chip ${cat === c ? "active" : ""}`} onClick={() => setCat(c)}>{c}</span>)}
        </div>
        <span className={`chip ${onlyArch ? "active" : ""}`} onClick={() => setOnlyArch((v) => !v)} data-testid="chip-archetype">◆ solo archetipi</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "14px 0 22px", flexWrap: "wrap" }}>
        <div className="muted tnum" style={{ fontSize: 13 }}>{list.length} voci</div>
        <FilterNote total={ix.ds.terms.length} shown={inTime.length} noun="voci nell'arco scelto" />
      </div>

      {list.length === 0 ? <Empty msg="Nessun termine trovato." /> : (
        <div className="gloss-grid">
          {list.map((t) => {
            const isExpanded = expanded.has(t.id);
            const works = worksWithTerm.get(t.id) || [];
            return (
              <div id={`term-${t.id}`} key={t.id}
                className={`gloss-card ${t.is_archetype ? "arch" : ""} ${active === t.id || isExpanded ? "hot" : ""}`}
                data-testid={`gloss-${t.id}`}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <h3 style={{ fontSize: 20 }}>{t.term}</h3>
                  {t.is_archetype && <span className="tag" style={{ color: "var(--c-term)", borderColor: "var(--c-term)" }}>◆ archetipo</span>}
                  <span className="faint" style={{ fontSize: 11, marginLeft: "auto", textTransform: "uppercase", letterSpacing: ".08em" }}>{t.category}</span>
                </div>
                <p className="muted" style={{ marginTop: 8, fontSize: 14.5, lineHeight: 1.6 }}>{t.definition}</p>
                {t.period_ids.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                    {t.period_ids.slice(0, 5).map((pid) => (
                      <EntityLink key={pid} type="period" id={pid} className="chip sm" />
                    ))}
                  </div>
                )}

                {/* Apertura del blocco opere dentro la scheda */}
                {works.length > 0 && (
                  <>
                    <div className="gloss-open">
                      <button className="gloss-openbtn" onClick={() => toggleExpand(t.id)}
                        aria-expanded={isExpanded} data-testid={`gloss-expand-${t.id}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                        {isExpanded ? `Nascondi le ${works.length} opere` : `${works.length} oper${works.length === 1 ? "a" : "e"} con questo termine`}
                      </button>
                    </div>
                    {isExpanded && <WorksInline works={works} />}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
