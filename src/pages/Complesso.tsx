// ============================================================================
// Scheda COMPLESSO: pagina dedicata a un complesso architettonico (gruppo di
// opere nello stesso luogo). Mostra tutte le opere del gruppo, il luogo, gli
// artisti e i periodi rappresentati, e un link alla città.
// Raggiungibile dall'overlay "Apri complesso" su WorkCard (in modalità grouped
// di Opere.tsx) o dalla sezione "Complesso" in Opera.tsx.
// L'ID nell'URL è il parent.id dell'opera capofila del gruppo.
// ============================================================================
import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useData, useTimeRange } from "../lib/store";
import { WorkCard, EntityLink, Empty } from "../components/ui";
import { computeWorkGroups, workGroupMap } from "../lib/data";

export default function Complesso() {
  const { id = "" } = useParams();
  const ix = useData();
  const { workIn } = useTimeRange();

  const groups = useMemo(() => computeWorkGroups(ix.ds), [ix.ds]);
  const byGroup = useMemo(() => workGroupMap(groups), [groups]);
  const group = byGroup.get(id);

  if (!group) {
    return (
      <div className="wrap page">
        <div className="page-head">
          <h1 className="page-title">Complesso non trovato</h1>
        </div>
        <Empty msg="Questo complesso non esiste o non ha più opere associate." />
        <Link className="btn sm ghost" to="/opere" style={{ marginTop: 14 }}>← Torna alle opere</Link>
      </div>
    );
  }

  // Opere nel gruppo (filtrate per intervallo temporale)
  const works = group.works.filter(workIn);
  const parent = group.parent;

  // Artisti presenti nel complesso
  const artists = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of group.works) for (const a of w.artist_ids ?? []) m.set(a, (m.get(a) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [group.works]);

  // Periodi rappresentati
  const periods = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of group.works) if (w.period_id) m.set(w.period_id, (m.get(w.period_id) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [group.works]);

  return (
    <div className="wrap page" style={{ paddingBottom: 40 }}>
      <div className="page-head">
        <div className="page-eyebrow">
          <span className="eyebrow" style={{ color: "#4f7d72" }}>Complesso architettonico</span>
        </div>
        <h1 className="page-title">{group.name}</h1>
        <p className="page-lead">
          {group.works.length} opere situate in questo complesso
          {group.city ? `, a ${group.city}` : ""}.
          L'opera capofila è <Link to={`/opera/${parent.id}`} className="tlink">{parent.title}</Link>.
        </p>
      </div>
      <div className="page-rule" />

      <div className="filterbar" style={{ marginBottom: 18 }}>
        <span className="muted" style={{ fontSize: 13 }}>
          {works.length} di {group.works.length} opere nell'intervallo temporale attivo
        </span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {group.city && <Link className="btn sm ghost" to={`/luogo/${encodeURIComponent(group.city)}`}>📍 {group.city}</Link>}
          <Link className="btn sm ghost" to="/opere">← Opere</Link>
        </span>
      </div>

      {(artists.length > 0 || periods.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 26 }}>
          {periods.length > 0 && (
            <div>
              <div className="smallcaps" style={{ marginBottom: 8 }}>Periodi rappresentati</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {periods.slice(0, 10).map(([pid, n]) => (
                  <Link key={pid} className="badge-period" to={`/periodo/${pid}`}>{ix.periodById.get(pid)?.name ?? pid} · {n}</Link>
                ))}
              </div>
            </div>
          )}
          {artists.length > 0 && (
            <div>
              <div className="smallcaps" style={{ marginBottom: 8 }}>Artisti presenti</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {artists.slice(0, 12).map(([aid, n]) => (
                  <EntityLink key={aid} type="artist" id={aid} className="chip sm" label={`${ix.artistById.get(aid)?.name ?? aid} · ${n}`} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="smallcaps" style={{ margin: "6px 0 12px" }}>Le opere del complesso ({works.length})</div>
      <div className="grid-works">
        {works.map((w) => (
          <WorkCard key={w.id} work={w} subtitle={[w.date_text, ix.periodById.get(w.period_id)?.name].filter(Boolean).join(" · ")} />
        ))}
      </div>
      {works.length === 0 && (
        <Empty msg="Nessuna opera di questo complesso nell'intervallo temporale scelto." />
      )}
    </div>
  );
}
