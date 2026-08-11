// ============================================================================
// ArtistMap — mappa interattiva che mostra dove si trovano le opere di un artista
// durante la sua vita, derivati dalle opere che ha realizzato in varie città.
//
// Per ogni città dove l'artista ha opere:
//   - CircleMarker proporzionale al numero di opere
//   - Popup con elenco opere + anni
//
// Polyline tratteggiata che collega le città in ordine cronologico
// (prima opera per anno) → mostra il posizione delle opere dell'artista.
// ============================================================================
import { useMemo, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap, Tooltip } from "react-leaflet";
import { Link } from "react-router-dom";
import type { Artist, Work, Period } from "../lib/types";
import { fmtYear } from "../lib/data";

interface ArtistCity {
  name: string;
  lat: number;
  lon: number;
  works: Work[];
  firstYear: number | null;
}

function FitBounds({ cities }: { cities: ArtistCity[] }) {
  const map = useMap();
  useEffect(() => {
    if (cities.length === 0) return;
    const lats = cities.map((c) => c.lat), lons = cities.map((c) => c.lon);
    const b: [[number, number], [number, number]] =
      [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]];
    setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(b, { padding: [40, 40], maxZoom: 8 });
    }, 80);
  }, [cities, map]);
  return null;
}

export default function ArtistMap({
  artist,
  works,
  periods,
}: {
  artist: Artist;
  works: Work[];
  periods: Period[];
}) {
  // Raggruppa opere per città con coordinate
  const cities = useMemo<ArtistCity[]>(() => {
    const m = new Map<string, ArtistCity>();
    for (const w of works) {
      if (w.lat == null || w.lon == null || !w.location_city) continue;
      const key = w.location_city;
      const year = w.year_start ?? w.year_end ?? null;
      if (!m.has(key)) {
        m.set(key, { name: key, lat: w.lat, lon: w.lon, works: [], firstYear: year });
      }
      const c = m.get(key)!;
      c.works.push(w);
      if (year != null && (c.firstYear == null || year < c.firstYear)) c.firstYear = year;
    }
    // Ordina per anno prima opera (cronologico)
    return [...m.values()].sort((a, b) => (a.firstYear ?? 9999) - (b.firstYear ?? 9999));
  }, [works]);

  // Crea il percorso: array di [lat, lon] in ordine cronologico
  const pathPositions: [number, number][] = useMemo(
    () => cities.map((c) => [c.lat, c.lon]),
    [cities]
  );

  if (cities.length < 2) {
    // Se c'è solo 1 città o 0, la mappa delle opere non ha senso
    return (
      <div style={{ padding: "16px 20px", background: "var(--bg-2)", borderRadius: 10, fontSize: 14, color: "var(--ink-dim)", textAlign: "center" }}>
        {cities.length === 1
          ? `Tutte le opere note di ${artist.name} si trovano a ${cities[0].name}. Tutte le opere sono in un'unica citt nel dataset.`
          : `Nessun luogo geolocalizzato nelle opere di ${artist.name}.`}
      </div>
    );
  }

  const maxWorks = Math.max(...cities.map((c) => c.works.length), 1);

  return (
    <div>
      <div style={{
        background: "var(--bg-2)",
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 10,
        fontSize: 13,
        color: "var(--ink-dim)",
        lineHeight: 1.55,
      }}>
        🗺️ Mappa delle opere di <b>{artist.name}</b> ricostruita dalle opere documentate
        ({cities.length} città, {works.length} opere geolocalizzate).
        Le città sono collegate in ordine cronologico (prima opera per anno).
      </div>
      <div style={{
        height: 360,
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid var(--line)",
        background: "var(--bg)",
      }}>
        <MapContainer
          center={[cities[0].lat, cities[0].lon]}
          zoom={5}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <FitBounds cities={cities} />

          {/* Percorso cronologico (linea tratteggiata oro) */}
          {pathPositions.length >= 2 && (
            <Polyline
              positions={pathPositions}
              pathOptions={{
                color: "#b88a2e",
                weight: 2,
                opacity: 0.7,
                dashArray: "6, 8",
              }}
            />
          )}

          {/* Marker per ogni città */}
          {cities.map((c, idx) => {
            const radius = 8 + Math.sqrt(c.works.length / maxWorks) * 14;
            return (
              <CircleMarker
                key={c.name}
                center={[c.lat, c.lon]}
                radius={radius}
                pathOptions={{
                  color: "#b88a2e",
                  fillColor: idx === 0 ? "#3f8a4f" : idx === cities.length - 1 ? "#a8483f" : "#b88a2e",
                  fillOpacity: 0.7,
                  weight: 2,
                }}
              >
                <Tooltip direction="top" offset={[0, -radius]}>
                  <b>{c.name}</b> ({c.works.length} opere{c.firstYear != null ? `, prima nel ${c.firstYear}` : ""})
                </Tooltip>
                <Popup>
                  <div style={{ minWidth: 220 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, color: "#2d2a26" }}>
                      📍 {c.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#7a7570", marginBottom: 8 }}>
                      {c.works.length} opere documentate{c.firstYear != null ? ` · prima nel ${c.firstYear}` : ""}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" }}>
                      {c.works
                        .slice()
                        .sort((a, b) => (a.year_start ?? a.year_end ?? 9999) - (b.year_start ?? b.year_end ?? 9999))
                        .map((w) => {
                          const y = w.year_start && w.year_end
                            ? `${w.year_start}–${w.year_end}`
                            : (w.year_end || w.year_start || w.date_text || "");
                          return (
                            <Link
                              key={w.id}
                              to={`/opera/${w.id}`}
                              style={{
                                fontSize: 12.5,
                                color: "#6b2d3e",
                                textDecoration: "none",
                                padding: "3px 6px",
                                borderRadius: 4,
                                background: "#f5e8eb",
                              }}
                            >
                              {y && <b style={{ marginRight: 6 }}>{y}:</b>}
                              {w.title}
                            </Link>
                          );
                        })}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legenda */}
      <div style={{
        display: "flex", gap: 16, marginTop: 8, fontSize: 11.5,
        color: "var(--ink-dim)", flexWrap: "wrap",
      }}>
        <span>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#3f8a4f", marginRight: 4, verticalAlign: "middle" }} />
          prima città (esordio)
        </span>
        <span>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#a8483f", marginRight: 4, verticalAlign: "middle" }} />
          ultima città (periodo finale)
        </span>
        <span>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#b88a2e", marginRight: 4, verticalAlign: "middle" }} />
          città intermedie
        </span>
        <span>
          <span style={{ display: "inline-block", width: 18, height: 0, borderTop: "2px dashed #b88a2e", marginRight: 4, verticalAlign: "middle" }} />
          ordine cronologico
        </span>
      </div>
    </div>
  );
}
