// ============================================================================
// Scheda LUOGO: tutte le opere conservate in una città, gli artisti e i periodi
// rappresentati, i collegamenti con le altre città. Raggiungibile dal grafo,
// dalla mappa (marker e lista centri) e dalle schede opera.
// ============================================================================
import { useMemo, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Polyline } from "react-leaflet";
import { useData, useTimeRange } from "../lib/store";
import { WorkCard, EntityLink, FilterNote, Empty } from "../components/ui";
import { KIND_LABEL } from "../lib/data";
import { setLastMappa } from "../lib/lastVisited";

export default function Luogo() {
  const { name = "" } = useParams();
  const city = decodeURIComponent(name);
  const ix = useData();
  const nav = useNavigate();
  const { workIn } = useTimeRange();

  // Salva la città come ultima visitata dalla Mappa (per il ritorno via menu)
  useEffect(() => {
    setLastMappa(city);
    window.dispatchEvent(new CustomEvent("atlante:last-visited-changed"));
  }, [city]);

  const allHere = useMemo(() => ix.ds.works.filter((w) => w.location_city === city), [ix, city]);
  const works = useMemo(() => allHere.filter(workIn), [allHere, workIn]);

  const pos = useMemo(() => {
    const w = allHere.find((x) => x.lat != null && x.lon != null);
    return w ? { lat: w.lat as number, lon: w.lon as number } : null;
  }, [allHere]);

  const artists = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of works) for (const a of w.artist_ids ?? []) m.set(a, (m.get(a) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [works]);

  const periods = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of works) if (w.period_id) m.set(w.period_id, (m.get(w.period_id) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [works]);

  // collegamenti con altre città: connessioni opera-opera con un capo qui
  const cityLinks = useMemo(() => {
    const here = new Set(works.map((w) => w.id));
    const byCity = new Map<string, { n: number; pairs: { kind: string; a: string; b: string; otherId: string }[]; lat?: number; lon?: number }>();
    for (const c of ix.ds.connections) {
      if (c.source_type !== "work" || c.target_type !== "work") continue;
      const sHere = here.has(c.source_id), tHere = here.has(c.target_id);
      if (sHere === tHere) continue; // o entrambe qui o nessuna
      const other = ix.workById.get(sHere ? c.target_id : c.source_id);
      const mine = ix.workById.get(sHere ? c.source_id : c.target_id);
      if (!other?.location_city || !mine) continue;
      if (!byCity.has(other.location_city)) byCity.set(other.location_city, { n: 0, pairs: [], lat: other.lat ?? undefined, lon: other.lon ?? undefined });
      const e = byCity.get(other.location_city)!;
      e.n++;
      if (e.pairs.length < 4) e.pairs.push({ kind: c.kind, a: mine.title, b: other.title, otherId: other.id });
    }
    return [...byCity.entries()].sort((a, b) => b[1].n - a[1].n);
  }, [ix, works]);

  if (!allHere.length) {
    return (
      <div className="wrap page">
        <button className="btn ghost sm" onClick={() => nav(-1)} style={{ marginBottom: 18 }} data-testid="button-back">← Indietro</button>
        <div className="page-head"><h1 className="page-title">{city}</h1></div>
        <Empty msg="Nessuna opera registrata in questo luogo." />
        <Link className="btn sm ghost" to="/mappa" style={{ marginTop: 14 }}>← Torna alla mappa</Link>
      </div>
    );
  }

  return (
    <div className="wrap page" style={{ paddingBottom: 40 }}>
      <button className="btn ghost sm" onClick={() => nav(-1)} style={{ marginBottom: 18 }} data-testid="button-back">← Indietro</button>
      <div className="page-head">
        <div className="page-eyebrow"><span className="eyebrow" style={{ color: "#4f7d72" }}>Luogo</span></div>
        <h1 className="page-title">{city}</h1>
        <p className="page-lead">
          {allHere.length} opere del programma sono conservate qui{cityLinks.length > 0 ? `, con legami documentati verso ${cityLinks.length} altre città` : ""}.
        </p>
      </div>
      <div className="page-rule" />

      <div className="filterbar" style={{ marginBottom: 18 }}>
        <FilterNote total={allHere.length} shown={works.length} noun="opere" />
        <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Link className="btn sm ghost" to="/mappa">Mappa →</Link>
          <Link className="btn sm ghost" to="/grafo">Rete →</Link>
        </span>
      </div>

      <div className="view-split" style={{ marginBottom: 26 }}>
        {pos && (
          <div className="stage" style={{ height: 320 }}>
            <MapContainer center={[pos.lat, pos.lon]} zoom={6} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap, &copy; CARTO" />
              {cityLinks.map(([cn, e]) => (e.lat != null && e.lon != null) ? (
                <Polyline key={cn} positions={[[pos.lat, pos.lon], [e.lat, e.lon]]}
                  pathOptions={{ color: "#b88a2e", weight: 0.8 + Math.min(e.n, 4) * 0.5, opacity: 0.5, dashArray: "4 4" }} />
              ) : null)}
              <CircleMarker center={[pos.lat, pos.lon]} radius={10}
                pathOptions={{ color: "#3c6157", fillColor: "#4f7d72", fillOpacity: 0.7, weight: 1.4 }} />
              {cityLinks.map(([cn, e]) => (e.lat != null && e.lon != null) ? (
                <CircleMarker key={`m-${cn}`} center={[e.lat, e.lon]} radius={5}
                  pathOptions={{ color: "#8f6a1d", fillColor: "#caa14a", fillOpacity: 0.6, weight: 1 }} />
              ) : null)}
            </MapContainer>
          </div>
        )}

        <div>
          <div className="panel">
            <div className="panel-title" style={{ marginBottom: 10 }}>Collegamenti con altre città</div>
            {cityLinks.length === 0 && <div className="muted" style={{ fontSize: 13 }}>Nessun legame documentato con opere altrove (nell'intervallo attivo).</div>}
            <div style={{ maxHeight: 250, overflowY: "auto", margin: "0 -4px", paddingRight: 4 }}>
              {cityLinks.map(([cn, e]) => (
                <div key={cn} style={{ padding: "9px 0", borderBottom: "1px solid var(--line-soft)" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <Link className="tlink" to={`/luogo/${encodeURIComponent(cn)}`} style={{ fontFamily: "Zodiak, serif", fontSize: 15 }}>{cn}</Link>
                    <span className="faint tnum" style={{ fontSize: 11.5 }}>{e.n} {e.n === 1 ? "legame" : "legami"}</span>
                  </div>
                  {e.pairs.slice(0, 2).map((p, i) => (
                    <div key={i} className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                      {KIND_LABEL[p.kind as keyof typeof KIND_LABEL] ?? p.kind}: {p.a.slice(0, 26)}{p.a.length > 26 ? "…" : ""} ↔ <Link className="tlink" to={`/opera/${p.otherId}`}>{p.b.slice(0, 26)}{p.b.length > 26 ? "…" : ""}</Link>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
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

      <div className="smallcaps" style={{ margin: "6px 0 12px" }}>Le opere ({works.length})</div>
      <div className="grid-works">
        {works.map((w) => (
            <WorkCard key={w.id} work={w} subtitle={[w.date_text, ix.periodById.get(w.period_id)?.name].filter(Boolean).join(" · ")} />
                  ))}
      </div>
    </div>
  );
}
