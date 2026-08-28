// ============================================================================
// WorksPanel — pannello "opere collegate" riusabile.
// Usato da Glossario (opere che contengono un termine) e da Tecniche (opere
// che usano una tecnica). Su desktop è una colonna a destra (sticky), su
// mobile un foglio che sale dal basso (vedi works-panel.css).
//
// Le opere sono raggruppate per PERIODO (ordinato per year_start) oppure
// ordinate per rilievo (importance) + cronologia.
// ============================================================================
import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useData } from "../lib/store";
import { WorkImage } from "./ui";
import type { Work } from "../lib/types";

export interface WorksPanelProps {
  /** Etichetta piccola sopra il titolo: "Opere · termine" / "Opere · tecnica" */
  eyebrow: string;
  /** Nome del termine / della tecnica */
  title: string;
  /** Opere collegate (non filtrate: il pannello ordina e raggruppa) */
  works: Work[];
  /** Link "apri tutte nel catalogo" (es. /opere?term=abside) */
  catalogHref?: string;
  onClose: () => void;
}

type Sort = "cronologico" | "rilievo";

export default function WorksPanel({ eyebrow, title, works, catalogHref, onClose }: WorksPanelProps) {
  const { periodById } = useData();
  const [sort, setSort] = useState<Sort>("cronologico");

  // Esc chiude il pannello
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Raggruppamento per periodo, in ordine cronologico di inizio periodo.
  const groups = useMemo(() => {
    const map = new Map<string, Work[]>();
    for (const w of works) {
      const key = w.period_id ?? "senza-periodo";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(w);
    }
    const arr = [...map.entries()].map(([pid, ws]) => {
      const p = periodById.get(pid);
      return {
        pid,
        name: p?.name ?? "Senza periodo",
        year: p?.year_start ?? 9999,
        works: ws.sort((a, b) => (a.year_end ?? a.year_start ?? 9999) - (b.year_end ?? b.year_start ?? 9999)),
      };
    });
    return arr.sort((a, b) => a.year - b.year);
  }, [works, periodById]);

  // Elenco piatto ordinato per rilievo (capitali prima) + cronologia.
  const byImportance = useMemo(
    () => [...works].sort((a, b) => b.importance - a.importance || (a.year_end ?? 9999) - (b.year_end ?? 9999)),
    [works]
  );

  const row = (w: Work) => {
    const period = periodById.get(w.period_id);
    return (
      <Link key={w.id} to={`/opera/${w.id}`} className="wp-row" data-testid={`wp-row-${w.id}`}>
        <span className="wp-thumb"><WorkImage work={w} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></span>
        <span className="wp-txt">
          <span className="wp-title">
            {w.title}
            {w.importance === 3 && <span className="wp-star" title="Opera capitale"> ✦</span>}
          </span>
          <span className="wp-meta tnum">
            {[w.location_city, w.date_text].filter(Boolean).join(" · ")}
          </span>
          {sort === "rilievo" && period && <span className="wp-meta-2">{period.name}</span>}
        </span>
      </Link>
    );
  };

  return (
    <>
      {/* scrim: solo mobile (vedi CSS) */}
      <div className="wp-scrim" onClick={onClose} data-testid="wp-scrim" />
      <aside className="wp" role="dialog" aria-label={`Opere · ${title}`} data-testid="works-panel">
        <div className="wp-head">
          <div className="wp-handle" aria-hidden="true" />
          <div className="wp-head-row">
            <div>
              <div className="eyebrow" style={{ fontSize: 10 }}>{eyebrow}</div>
              <div className="wp-name">{title} <span className="tnum wp-count">{works.length}</span></div>
            </div>
            <button className="wp-close" onClick={onClose} aria-label="Chiudi pannello">✕</button>
          </div>
        </div>

        <div className="wp-sortbar">
          <button className={`chip sm ${sort === "cronologico" ? "active" : ""}`} onClick={() => setSort("cronologico")}>cronologico</button>
          <button className={`chip sm ${sort === "rilievo" ? "active" : ""}`} onClick={() => setSort("rilievo")}>per rilievo</button>
          <span className="wp-groups tnum">
            {sort === "cronologico" ? `${groups.length} period${groups.length === 1 ? "o" : "i"}` : ""}
          </span>
        </div>

        <div className="wp-body">
          {sort === "cronologico"
            ? groups.map((g) => (
                <div key={g.pid}>
                  <div className="wp-group">{g.name} <span className="tnum wp-count">{g.works.length}</span></div>
                  {g.works.map(row)}
                </div>
              ))
            : byImportance.map(row)}
        </div>

        {catalogHref && (
          <div className="wp-foot">
            <Link to={catalogHref} className="wp-cta">Apri le {works.length} opere nel catalogo →</Link>
          </div>
        )}
      </aside>
    </>
  );
}
