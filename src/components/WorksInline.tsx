// ============================================================================
// WorksInline — blocco "opere collegate" che si apre DENTRO la scheda
// (glossario) o dentro la scheda tecnica, nella sua stessa colonna.
// Le opere sono divise per periodo (cronologico) oppure per rilievo, con
// titolo, luogo e datazione. Mostra le prime N e poi "Mostra le altre".
// ============================================================================
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../lib/store";
import { WorkImage } from "./ui";
import type { Work } from "../lib/types";

const STEP = 8; // opere visibili all'apertura

type Sort = "cronologico" | "rilievo";

export default function WorksInline({ works }: { works: Work[] }) {
  const { periodById } = useData();
  const [sort, setSort] = useState<Sort>("cronologico");
  const [limit, setLimit] = useState(STEP);

  // ordine cronologico: per anno del periodo, poi per datazione dell'opera
  const chrono = useMemo(() => {
    const key = (w: Work) => periodById.get(w.period_id)?.year_start ?? 9999;
    return [...works].sort((a, b) => key(a) - key(b) || (a.year_end ?? a.year_start ?? 9999) - (b.year_end ?? b.year_start ?? 9999));
  }, [works, periodById]);

  const byImportance = useMemo(
    () => [...works].sort((a, b) => b.importance - a.importance || (a.year_end ?? 9999) - (b.year_end ?? 9999)),
    [works]
  );

  const shown = (sort === "cronologico" ? chrono : byImportance).slice(0, limit);
  const rest = works.length - shown.length;

  const row = (w: Work) => {
    const place = [w.location_city, w.location_place && w.location_place !== w.location_city ? w.location_place : null]
      .filter(Boolean).join(", ");
    return (
      <Link key={w.id} to={`/opera/${w.id}`} className="wi-row" data-testid={`wi-row-${w.id}`}>
        <span className="wi-thumb"><WorkImage work={w} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></span>
        <span className="wi-txt">
          <span className="wi-title">
            {w.title}
            {w.importance === 3 && <span className="wi-star" title="Opera capitale"> ✦</span>}
          </span>
          <span className="wi-meta tnum">{[place, w.date_text].filter(Boolean).join(" · ")}</span>
        </span>
      </Link>
    );
  };

  return (
    <div className="wi" data-testid="works-inline">
      {sort === "cronologico"
        ? // raggruppate per periodo: intestazione quando il periodo cambia
          shown.map((w, i) => {
            const p = periodById.get(w.period_id);
            const prev = i > 0 ? periodById.get(shown[i - 1].period_id) : null;
            const newGroup = i === 0 || p?.id !== prev?.id;
            const count = shown.filter((x) => x.period_id === w.period_id).length;
            return (
              <div key={w.id}>
                {newGroup && (
                  <div className="wi-group">
                    {p?.name ?? "Senza periodo"} <span className="tnum wi-count">{count}</span>
                  </div>
                )}
                {row(w)}
              </div>
            );
          })
        : shown.map(row)}

      <div className="wi-foot">
        {rest > 0 && (
          <button className="wi-more" onClick={() => setLimit((l) => l + 24)} data-testid="wi-more">
            Mostra le altre {rest} oper{rest === 1 ? "a" : "e"} ↓
          </button>
        )}
        <span className="wi-sort">
          <button className={`chip sm ${sort === "cronologico" ? "active" : ""}`} onClick={() => setSort("cronologico")}>cronologico</button>
          <button className={`chip sm ${sort === "rilievo" ? "active" : ""}`} onClick={() => setSort("rilievo")}>rilievo</button>
        </span>
      </div>
    </div>
  );
}
