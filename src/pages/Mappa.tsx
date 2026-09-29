import { useMemo, useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import { useData, useTimeRange } from "../lib/store";
import { FilterNote } from "../components/ui";
import Fullscreen from "../components/Fullscreen";
import TimeRangeSlider from "../components/TimeRangeSlider";
import type { Work, Artist } from "../lib/types";
import { isCommittente } from "../lib/data";

// invalida la dimensione della mappa quando si entra/esce dal fullscreen
// E anche al mount iniziale (Leaflet ha bisogno di sapere le dimensioni reali)
function Resizer({ trigger }: { trigger: boolean }) {
  const map = useMap();
  useEffect(() => {
    // Invalida subito al mount
    map.invalidateSize();
    // E poi di nuovo dopo 300ms (quando il layout è stabilizzato)
    const t = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(t);
  }, [trigger, map]);
  return null;
}

interface City { name: string; lat: number; lon: number; works: Work[]; }
interface SedeCommittenti { name: string; lat: number; lon: number; committenti: { a: Artist; n: number }[]; }

// Sedi di committenti in citta' dove il catalogo non ha opere con coordinate:
// senza queste i loro mecenati sparirebbero dalla mappa.
const COORD_SEDI: Record<string, [number, number]> = {
  "Augusta": [48.3705, 10.8978], "Bourges": [47.081, 2.3988], "Bressanone": [46.715, 11.656], "Bruges": [51.2093, 3.2247],
  "Chieri": [45.0126, 7.8247], "Città di Castello": [43.457, 12.2405], "Fabriano": [43.3363, 12.9046], "Ferrara": [44.8381, 11.6198],
  "Isenheim": [47.9167, 7.2667], "Magdeburgo": [52.1205, 11.6276], "Melun": [48.5421, 2.6554], "Montecassino": [41.49, 13.8139],
  "Polisy": [48.0706, 4.3717], "Reggio Emilia": [44.6983, 10.6312],
};

function FitBounds({ cities }: { cities: City[] }) {
  const map = useMap();
  useEffect(() => {
    if (!cities.length) return;
    const core = cities.filter((c) => c.lon > -12 && c.lon < 46 && c.lat > 28 && c.lat < 62);
    const use = core.length >= 3 ? core : cities;
    const lats = use.map((c) => c.lat), lons = use.map((c) => c.lon);
    const b: [[number, number], [number, number]] =
      [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]];
    // Invalida PRIMA la dimensione, poi fitta i bounds
    const t = setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(b, { padding: [36, 36], maxZoom: 7 });
    }, 100);
    return () => clearTimeout(t);
  }, [cities, map]);
  return null;
}

export default function Mappa() {
  const ix = useData();
  const { workIn } = useTimeRange();
  const [isFull, setIsFull] = useState(false);
  const [cityQ, setCityQ] = useState("");
  const mapRef = useRef<any>(null);
  // Opere: dove sono le opere oggi. Committenti: dove avevano sede quelli che le hanno commissionate.
  const [modo, setModo] = useState<"opere" | "committenti">("opere");

  const works = useMemo(() => ix.ds.works.filter(workIn), [ix, workIn]);

  const cities = useMemo<City[]>(() => {
    const m = new Map<string, City>();
    for (const w of works) {
      if (w.lat == null || w.lon == null || !w.location_city) continue;
      const key = w.location_city;
      if (!m.has(key)) m.set(key, { name: key, lat: w.lat, lon: w.lon, works: [] });
      m.get(key)!.works.push(w);
    }
    return [...m.values()].sort((a, b) => b.works.length - a.works.length);
  }, [works]);

  const cityByName = useMemo(() => new Map(cities.map((c) => [c.name, c])), [cities]);

  // Le coordinate di una citta' vengono dalle opere del catalogo (tutte, non
  // solo quelle nel periodo scelto): la sede di un committente puo' non avere
  // opere nell'intervallo pur restando un luogo reale.
  const coordCitta = useMemo(() => {
    const m = new Map<string, [number, number]>(Object.entries(COORD_SEDI));
    for (const w of ix.ds.works) if (w.lat != null && w.lon != null && w.location_city && !m.has(w.location_city)) m.set(w.location_city, [w.lat, w.lon]);
    return m;
  }, [ix]);

  // Un committente compare se nel periodo scelto ha almeno un'opera commissionata.
  const sedi = useMemo<SedeCommittenti[]>(() => {
    const opere = new Map<string, number>();
    for (const w of works) for (const cid of w.committente_ids ?? []) opere.set(cid, (opere.get(cid) ?? 0) + 1);
    const m = new Map<string, SedeCommittenti>();
    for (const a of ix.ds.artists) {
      const n = opere.get(a.id) ?? 0;
      if (!n || !a.location_city || !isCommittente(a)) continue;
      const c = coordCitta.get(a.location_city);
      if (!c) continue;
      if (!m.has(a.location_city)) m.set(a.location_city, { name: a.location_city, lat: c[0], lon: c[1], committenti: [] });
      m.get(a.location_city)!.committenti.push({ a, n });
    }
    for (const s of m.values()) s.committenti.sort((x, y) => (x.a.birth ?? x.a.death ?? 9999) - (y.a.birth ?? y.a.death ?? 9999));
    return [...m.values()].sort((a, b) => b.committenti.length - a.committenti.length);
  }, [works, ix, coordCitta]);
  const maxCommittenti = Math.max(...sedi.map((s) => s.committenti.length), 1);

  const flows = useMemo(() => {
    const out: { a: City; b: City; n: number }[] = [];
    const seen = new Map<string, { a: City; b: City; n: number }>();
    for (const c of ix.ds.connections) {
      if (c.source_type !== "work" || c.target_type !== "work") continue;
      const ws = ix.workById.get(c.source_id), wt = ix.workById.get(c.target_id);
      if (!ws?.location_city || !wt?.location_city) continue;
      const ca = cityByName.get(ws.location_city), cb = cityByName.get(wt.location_city);
      if (!ca || !cb || ca.name === cb.name) continue;
      const key = [ca.name, cb.name].sort().join("→");
      if (seen.has(key)) seen.get(key)!.n++;
      else { const f = { a: ca, b: cb, n: 1 }; seen.set(key, f); out.push(f); }
    }
    return out;
  }, [ix, cityByName]);

  const maxWorks = Math.max(...cities.map((c) => c.works.length), 1);

  return (
    <div className="wrap page" style={{ paddingBottom: 24 }}>
      <div className="page-head">
        <div className="page-eyebrow"><span className="eyebrow">Visualizzazione</span></div>
        <h1 className="page-title">Mappa & contaminazioni</h1>
        <p className="page-lead">{modo === "opere"
          ? "I luoghi che custodiscono le opere e i flussi di influenza che li collegano. La dimensione di ogni cerchio riflette il numero di opere; gli archi uniscono opere connesse in città diverse. Clicca un cerchio o il nome di un centro per aprire la scheda del luogo."
          : "Le città in cui avevano sede i committenti: papi, sovrani, signori, confraternite. La dimensione di ogni cerchio riflette il numero di committenti; nel riquadro si vede quante opere ha commissionato ciascuno nel periodo scelto."}</p>
      </div>
      <div className="page-rule" />

      <div className="filterbar" style={{ marginBottom: 14 }}>
        <div className="seg" data-testid="mappa-modo">
          <button className={`seg-btn ${modo === "opere" ? "on" : ""}`} onClick={() => setModo("opere")}>Opere</button>
          <button className={`seg-btn ${modo === "committenti" ? "on" : ""}`} onClick={() => setModo("committenti")}>Committenti</button>
        </div>
        {modo === "opere"
          ? <FilterNote total={ix.ds.works.filter((w) => w.location_city).length} shown={works.filter((w) => w.location_city).length} noun="opere localizzate" />
          : null}
        <span className="muted tnum" style={{ fontSize: 13, marginLeft: "auto" }}>{modo === "opere"
          ? `${cities.length} città · ${flows.length} flussi`
          : `${sedi.length} città · ${sedi.reduce((t, s) => t + s.committenti.length, 0)} committenti`}</span>
      </div>

      <Fullscreen title="Mappa & contaminazioni" controls={null} showSlider={false} onChange={setIsFull}>
        <div className="gf-inner">
          {/* Colonna sinistra: mappa */}
          <div className="stage" style={{
            height: isFull ? "100%" : "min(72vh, 700px)",
            flex: isFull ? 1 : undefined,
            border: isFull ? 0 : undefined,
            borderRadius: isFull ? 0 : undefined,
          }} data-testid="map-stage">
            <MapContainer center={[43, 12]} zoom={5} style={{ height: "100%", width: "100%" }} scrollWheelZoom ref={mapRef}>
              {/* Esri Light Gray: gratuito e senza chiave (CARTO ora chiede una chiave API). */}
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
                maxZoom={16} />
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                maxZoom={16} />
              <Resizer trigger={isFull} />
              <FitBounds cities={cities} />
              {modo === "opere" && flows.map((f, i) => (
                <Polyline key={i} positions={[[f.a.lat, f.a.lon], [f.b.lat, f.b.lon]]}
                  pathOptions={{ color: "#b88a2e", weight: 0.7 + Math.min(f.n, 4) * 0.5, opacity: 0.55, dashArray: "4 4" }} />
              ))}
              {modo === "committenti" && sedi.map((s) => {
                const r = 5 + (s.committenti.length / maxCommittenti) * 22;
                return (
                  <CircleMarker key={"c-" + s.name} center={[s.lat, s.lon]} radius={r}
                    pathOptions={{ color: "#6e3326", fillColor: "#b5654f", fillOpacity: 0.55, weight: 1.2 }}>
                    <Popup>
                      <div style={{ minWidth: 200 }}>
                        <Link to={`/luogo/${encodeURIComponent(s.name)}`} style={{ fontSize: 15, fontFamily: "Zodiak, serif", fontWeight: 600, color: "#211c14", textDecoration: "none", borderBottom: "1px solid #b5654f" }}>{s.name}</Link>
                        <div style={{ color: "#837a66", fontSize: 12, margin: "4px 0 8px" }}>{s.committenti.length} {s.committenti.length === 1 ? "committente" : "committenti"}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflow: "auto" }}>
                          {s.committenti.map(({ a, n }) => (
                            <Link key={a.id} to={`/artista/${a.id}`} style={{ color: "#6e3326", fontSize: 13, textDecoration: "none" }}>· {a.name} <span style={{ color: "#837a66" }}>({n} {n === 1 ? "opera" : "opere"})</span></Link>
                          ))}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
              {modo === "opere" && cities.map((c) => {
                const r = 5 + (c.works.length / maxWorks) * 22;
                return (
                  <CircleMarker key={c.name} center={[c.lat, c.lon]} radius={r}
                    pathOptions={{ color: "#8f6a1d", fillColor: "#caa14a", fillOpacity: 0.55, weight: 1.2 }}>
                    <Popup>
                      <div style={{ minWidth: 180 }}>
                        <Link to={`/luogo/${encodeURIComponent(c.name)}`} style={{ fontSize: 15, fontFamily: "Zodiak, serif", fontWeight: 600, color: "#211c14", textDecoration: "none", borderBottom: "1px solid #caa14a" }}>{c.name}</Link>
                        <div style={{ color: "#837a66", fontSize: 12, margin: "4px 0 8px" }}>{c.works.length} opere</div>
                        <Link to={`/luogo/${encodeURIComponent(c.name)}`} style={{ display: "inline-block", color: "#8f6a1d", fontSize: 12.5, fontWeight: 600, textDecoration: "none", marginBottom: 8 }}>Apri la scheda del luogo →</Link>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflow: "auto" }}>
                          {c.works.slice(0, 14).map((w) => (
                            <Link key={w.id} to={`/opera/${w.id}`} style={{ color: "#8f6a1d", fontSize: 13, textDecoration: "none" }}>· {w.title}</Link>
                          ))}
                          {c.works.length > 14 && <span style={{ color: "#837a66", fontSize: 12 }}>+ altre {c.works.length - 14}</span>}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>

          {/* Colonna destra: ricerca Centri + (in fullscreen) slider temporale */}
          <div className="gf-side">
            <div className="panel" style={{ marginBottom: 12 }}>
              <div className="panel-title">{modo === "opere" ? "Centri" : "Sedi dei committenti"}</div>
              <input
                type="text"
                value={cityQ}
                onChange={(e) => setCityQ(e.target.value)}
                placeholder="Cerca città…"
                style={{
                  width: "100%", padding: "7px 10px", marginBottom: 10,
                  border: "1px solid var(--line)", borderRadius: 6,
                  background: "var(--bg)", color: "var(--ink)",
                  fontSize: 13, fontFamily: "inherit",
                }}
              />
              <div style={{ maxHeight: 580, overflowY: "auto", margin: "0 -4px", paddingRight: 4 }}>
                {modo === "committenti" ? (() => {
                  const q = cityQ.trim().toLowerCase();
                  const filtered = q ? sedi.filter((s) => s.name.toLowerCase().includes(q)) : sedi.slice(0, 24);
                  if (!filtered.length) return <div style={{ padding: "16px 0", textAlign: "center", color: "var(--ink-dim)", fontSize: 13 }}>Nessuna città trovata per "{cityQ}".</div>;
                  return filtered.map((s) => (
                    <div key={s.name} style={{ padding: "10px 0", borderBottom: "1px solid var(--line-soft)" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <Link className="tlink" to={`/luogo/${encodeURIComponent(s.name)}`} style={{ fontFamily: "Zodiak, serif", fontSize: 16 }}>{s.name}</Link>
                        <span className="badge-period" style={{ fontSize: 9.5, padding: "3px 8px" }}>{s.committenti.length} {s.committenti.length === 1 ? "committente" : "committenti"}</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}>
                        {s.committenti.slice(0, 4).map(({ a }) => (
                          <Link key={a.id} to={`/artista/${a.id}`} className="tlink" style={{ fontSize: 12 }}>{a.name.length > 26 ? a.name.slice(0, 24) + "…" : a.name}</Link>
                        ))}
                      </div>
                    </div>
                  ));
                })() : (() => {
                  const q = cityQ.trim().toLowerCase();
                  const filtered = q
                    ? cities.filter(c => c.name.toLowerCase().includes(q))
                    : cities.slice(0, 24);
                  if (filtered.length === 0) {
                    return (
                      <div style={{ padding: "16px 0", textAlign: "center", color: "var(--ink-dim)", fontSize: 13 }}>
                        Nessuna città trovata per "{cityQ}".
                      </div>
                    );
                  }
                  return filtered.map((c) => (
                    <div key={c.name} style={{ padding: "10px 0", borderBottom: "1px solid var(--line-soft)" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <Link className="tlink" to={`/luogo/${encodeURIComponent(c.name)}`} style={{ fontFamily: "Zodiak, serif", fontSize: 16 }}>{c.name}</Link>
                        <span className="badge-period" style={{ fontSize: 9.5, padding: "3px 8px" }}>{c.works.length} opere</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}>
                        {c.works.slice(0, 4).map((w) => (
                          <Link key={w.id} to={`/opera/${w.id}`} className="tlink" style={{ fontSize: 12 }}>{w.title.length > 26 ? w.title.slice(0, 24) + "…" : w.title}</Link>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
              {modo === "opere" && !cityQ.trim() && cities.length > 24 && (
                <div style={{ padding: "8px 0 0", fontSize: 11, color: "var(--ink-dim)", textAlign: "center" }}>
                  +{cities.length - 24} altre città — usa la ricerca per trovarle
                </div>
              )}
            </div>

            {/* Slider temporale — visibile solo in fullscreen, come nel grafo */}
            <div className="panel gf-fs-only" data-testid="mappa-fs-filters">
              <div className="panel-title" style={{ fontSize: 15, marginBottom: 10 }}>Tempo</div>
              <div style={{ margin: "0 -4px" }}>
                <TimeRangeSlider compact />
              </div>
            </div>
          </div>
        </div>
      </Fullscreen>
    </div>
  );
}
