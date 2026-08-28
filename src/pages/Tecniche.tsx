import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useData, useTimeRange } from "../lib/store";
import { Empty, EntityLink, FilterNote } from "../components/ui";
import WorksPanel from "../components/WorksPanel";
import { fmtYear } from "../lib/data";
import type { TechCategory } from "../lib/types";

const CATS: TechCategory[] = ["pittorica", "scultorea", "architettonica", "musiva", "altra"];
const CAT_COLOR: Record<string, string> = {
  pittorica: "var(--amber)", scultorea: "var(--c-work)", architettonica: "var(--gold)",
  musiva: "var(--verdigris)", altra: "var(--c-term)",
};

export default function Tecniche() {
  const ix = useData();
  const { techIn } = useTimeRange();
  const [sp] = useSearchParams();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [active, setActive] = useState<string | null>(sp.get("t"));
  // Tecnica le cui opere sono aperte nel pannello laterale (null = chiuso)
  const [openTech, setOpenTech] = useState<string | null>(null);

  // Opere che usano una data tecnica (per ID).
  const worksWithTech = useMemo(() => {
    const map = new Map<string, typeof ix.ds.works>();
    for (const w of ix.ds.works) {
      for (const tid of w.technique_ids || []) {
        if (!map.has(tid)) map.set(tid, []);
        map.get(tid)!.push(w);
      }
    }
    return map;
  }, [ix.ds.works]);

  // deep-link a una tecnica: ?t=ID evidenzia e scorre
  useEffect(() => {
    const t = sp.get("t");
    if (t) { setActive(t); setTimeout(() => document.getElementById(`tech-${t}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 300); }
  }, [sp]);

  // tecniche nell'intervallo temporale globale (prima dei filtri locali)
  const inTime = useMemo(() => ix.ds.techniques.filter(techIn), [ix, techIn]);

  // ordina per first_period (cronologia di introduzione)
  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return inTime
      .filter((t) => {
        if (cat && t.category !== cat) return false;
        if (qq && !(t.name.toLowerCase().includes(qq) || t.definition.toLowerCase().includes(qq))) return false;
        return true;
      })
      .sort((a, b) => {
        const pa = a.first_period_id ? ix.periodById.get(a.first_period_id)?.year_start ?? 9999 : 9999;
        const pb = b.first_period_id ? ix.periodById.get(b.first_period_id)?.year_start ?? 9999 : 9999;
        return pa - pb;
      });
  }, [inTime, q, cat, ix]);

  const openTechObj = openTech ? ix.techById.get(openTech) : null;

  return (
    <div className="wrap page">
      <div className="page-head">
        <div className="page-eyebrow"><span className="eyebrow">{ix.ds.techniques.length} tecniche</span></div>
        <h1 className="page-title">Indice delle tecniche</h1>
        <p className="page-lead">Tecniche pittoriche, scultoree, architettoniche e musive: come nascono, chi le introduce e come si evolvono nel tempo. Ordinate per epoca di prima comparsa.</p>
      </div>

      <div className="page-rule" />

      <div className="filterbar" style={{ marginBottom: 8 }}>
        <input className="input" placeholder="Cerca una tecnica…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-search" style={{ flex: "1 1 220px" }} />
        <div className="filter-group">
          <span className={`chip ${cat === "" ? "active" : ""}`} onClick={() => setCat("")}>tutte</span>
          {CATS.map((c) => <span key={c} className={`chip ${cat === c ? "active" : ""}`} onClick={() => setCat(c)}>{c}</span>)}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "12px 0 22px", flexWrap: "wrap" }}>
        <div className="muted tnum" style={{ fontSize: 13 }}>{list.length} tecniche</div>
        <FilterNote total={ix.ds.techniques.length} shown={inTime.length} noun="tecniche nell'arco scelto" />
      </div>

      {list.length === 0 ? <Empty msg="Nessuna tecnica trovata." /> : (
        <div className={openTechObj ? "gloss-split" : ""}>
          <div className="tech-list">
            {list.map((t) => {
              const fp = t.first_period_id ? ix.periodById.get(t.first_period_id) : null;
              const works = worksWithTech.get(t.id) || [];
              const isOpen = openTech === t.id;
              return (
                <div id={`tech-${t.id}`} className={`tech-card ${active === t.id || isOpen ? "hot" : ""}`} key={t.id} data-testid={`tech-${t.id}`}>
                  <div className="tech-spine" style={{ background: CAT_COLOR[t.category] }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                      <h3 style={{ fontSize: 22 }}>{t.name}</h3>
                      <span className="tag" style={{ color: CAT_COLOR[t.category], borderColor: "var(--line)" }}>{t.category}</span>
                      {fp && <span className="faint" style={{ fontSize: 12 }}>prima comparsa: <EntityLink type="period" id={fp.id} label={`${fp.name} (${fmtYear(fp.year_start)})`} /></span>}
                    </div>
                    <p className="prose" style={{ marginTop: 10, fontSize: 15.5 }}>{t.definition}</p>
                    <div className="tech-meta">
                      {t.introduced_by && <div><span className="faint">Introdotta da · </span>{t.introduced_by}</div>}
                      {t.evolution && <div style={{ marginTop: 8 }}><span className="faint">Evoluzione · </span><span className="muted">{t.evolution}</span></div>}
                    </div>
                    {/* Riga d'accesso alle opere che usano la tecnica */}
                    {works.length > 0 && (
                      <div className="gloss-open">
                        <button className="gloss-openbtn" onClick={() => setOpenTech(isOpen ? null : t.id)}
                          data-testid={`tech-open-${t.id}`} aria-expanded={isOpen}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M15 3v18" />
                          </svg>
                          {works.length} oper{works.length === 1 ? "a" : "e"} con questa tecnica{isOpen ? "" : " →"}
                        </button>
                        {isOpen && <span className="gloss-openflag">aperto nel pannello</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {openTechObj && (
            <WorksPanel
              eyebrow="Opere · tecnica"
              title={openTechObj.name}
              works={worksWithTech.get(openTechObj.id) || []}
              catalogHref={`/opere?tech=${openTechObj.id}`}
              onClose={() => setOpenTech(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
