import { useMemo, useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import { useData, useTimeRange } from "../lib/store";
import { FilterNote } from "../components/ui";
import Fullscreen from "../components/Fullscreen";
import type { Work } from "../lib/types";

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
  const mapRef = useRef<any>(null);

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
        <div className="page-eyebrow"><span className="eyebrow">Geografia</span></div>
        <h1 className="page-title">Mappa & contaminazioni</h1>
        <p className="page-lead">I luoghi che custodiscono le opere e i flussi di influenza che li collegano. La dimensione di ogni cerchio riflette il numero di opere; gli archi uniscono opere connesse in città diverse. Clicca un cerchio o il nome di un centro per aprire la scheda del luogo.</p>
      </div>
      <div className="page-rule" />

      <div className="filterbar" style={{ marginBottom: 14 }}>
        <FilterNote total={ix.ds.works.filter((w) => w.location_city).length} shown={works.filter((w) => w.location_city).length} noun="opere localizzate" />
        <span className="muted tnum" style={{ fontSize: 13, marginLeft: "auto" }}>{cities.length} città · {flows.length} flussi</span>
      </div>

      <div className="view-split">
        <Fullscreen title="Mappa & contaminazioni" onChange={setIsFull}>
        <div className="stage" style={{ height: isFull ? "100%" : "min(72vh, 700px)", flex: isFull ? 1 : undefined, border: isFull ? 0 : undefined, borderRadius: isFull ? 0 : undefined }} data-testid="map-stage">
          <MapContainer center={[43, 12]} zoom={5} style={{ height: "100%", width: "100%" }} scrollWheelZoom ref={mapRef}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap, &copy; CARTO' />
            <Resizer trigger={isFull} />
            <FitBounds cities={cities} />
            {flows.map((f, i) => (
              <Polyline key={i} positions={[[f.a.lat, f.a.lon], [f.b.lat, f.b.lon]]}
                pathOptions={{ color: "#b88a2e", weight: 0.7 + Math.min(f.n, 4) * 0.5, opacity: 0.55, dashArray: "4 4" }} />
            ))}
            {cities.map((c) => {
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
        </Fullscreen>

        <div>
          <div className="panel">
            <div className="panel-title">Centri</div>
            <div style={{ maxHeight: 620, overflowY: "auto", margin: "0 -4px", paddingRight: 4 }}>
              {cities.slice(0, 24).map((c) => (
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
