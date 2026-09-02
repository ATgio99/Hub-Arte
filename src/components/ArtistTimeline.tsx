// ============================================================================
// ArtistTimeline — timeline orizzontale che mostra le opere di un artista
// distribuite nel tempo. Ogni opera è un pallino posizionato in base al suo anno.
//
// Caratteristiche:
//   - Barra orizzontale con range anni (birth → death, o min/max opere)
//   - Marker per ogni opera (popup con titolo + anno + luogo)
//   - Marker vita dell'artista (birth, death) se disponibili
//   - Marker periodi storici associati all'artista (sfondo colorato)
// ============================================================================
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Artist, Work, Period } from "../lib/types";
import { fmtYear } from "../lib/data";

const PERIOD_COLORS = ["#b88a2e", "#6b2d3e", "#3f8a4f", "#a8483f", "#5e72a4", "#7a7570"];

export default function ArtistTimeline({
  artist,
  works,
  periods,
}: {
  artist: Artist;
  works: Work[];
  periods: Period[];
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Calcola range anni
  const { minYear, maxYear, lifeMin, lifeMax } = useMemo(() => {
    const workYears = works
      .map((w) => w.year_start ?? w.year_end)
      .filter((y): y is number => y != null);
    const lifeMin = artist.birth;
    const lifeMax = artist.death;
    const allYears = [...workYears];
    if (lifeMin != null) allYears.push(lifeMin);
    if (lifeMax != null) allYears.push(lifeMax);
    if (allYears.length === 0) return { minYear: 0, maxYear: 100, lifeMin: null, lifeMax: null };
    const lo = Math.min(...allYears);
    const hi = Math.max(...allYears);
    // Padding del 10% ai lati
    const pad = Math.max(5, Math.round((hi - lo) * 0.1));
    return { minYear: lo - pad, maxYear: hi + pad, lifeMin, lifeMax };
  }, [works, artist]);

  const span = Math.max(1, maxYear - minYear);
  const pct = (y: number) => ((y - minYear) / span) * 100;

  // Opere ordinate per anno
  const sortedWorks = useMemo(() => {
    return works
      .filter((w) => (w.year_start ?? w.year_end) != null)
      .slice()
      .sort((a, b) => (a.year_start ?? a.year_end ?? 0) - (b.year_start ?? b.year_end ?? 0));
  }, [works]);

  // Periodi associati all'artista (con anni)
  const artistPeriods = useMemo(() => {
    return periods.filter((p) => p.year_start != null && p.year_end != null);
  }, [periods]);

  if (sortedWorks.length === 0) {
    return (
      <div style={{ padding: "16px 20px", background: "var(--bg-2)", borderRadius: 10, fontSize: 14, color: "var(--ink-dim)", textAlign: "center" }}>
        Nessuna opera di {artist.name} con datazione precisa per costruire la timeline.
      </div>
    );
  }

  // Tick marks: ogni N anni in base allo span
  const tickStep = span > 80 ? 20 : span > 30 ? 10 : span > 10 ? 5 : 1;
  const ticks: number[] = [];
  for (let y = Math.ceil(minYear / tickStep) * tickStep; y <= maxYear; y += tickStep) {
    ticks.push(y);
  }

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
        ⏳ Linea del tempo di <b>{artist.name}</b> ({sortedWorks.length} opere datate).
        Passa il mouse su un pallino per vedere l'opera.
      </div>

      <div style={{
        background: "var(--bg)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "20px 16px 12px",
      }}>
        {/* Container timeline */}
        <div style={{ position: "relative", height: 130, marginBottom: 4 }}>
          {/* Sfondo periodi storici */}
          {artistPeriods.map((p, i) => {
            const lo = Math.max(p.year_start, minYear);
            const hi = Math.min(p.year_end, maxYear);
            if (hi <= minYear || lo >= maxYear) return null;
            const left = pct(lo);
            const width = pct(hi) - pct(lo);
            return (
              <div
                key={p.id}
                style={{
                  position: "absolute",
                  left: `${left}%`,
                  width: `${width}%`,
                  top: 30,
                  height: 60,
                  background: PERIOD_COLORS[i % PERIOD_COLORS.length],
                  opacity: 0.08,
                  borderRadius: 4,
                  borderLeft: `2px solid ${PERIOD_COLORS[i % PERIOD_COLORS.length]}`,
                }}
                title={`${p.name} (${p.year_start}–${p.year_end})`}
              >
                <span style={{
                  position: "absolute",
                  top: -16,
                  left: 4,
                  fontSize: 10,
                  color: PERIOD_COLORS[i % PERIOD_COLORS.length],
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}>
                  {p.name}
                </span>
              </div>
            );
          })}

          {/* Barra vita dell'artista (se abbiamo birth/death) */}
          {lifeMin != null && lifeMax != null && (
            <div
              style={{
                position: "absolute",
                left: `${pct(lifeMin)}%`,
                width: `${pct(lifeMax) - pct(lifeMin)}%`,
                top: 56,
                height: 4,
                background: "linear-gradient(90deg, #6b2d3e 0%, #b88a2e 100%)",
                borderRadius: 2,
              }}
              title={`Vita: ${fmtYear(lifeMin)} – ${fmtYear(lifeMax)}`}
            />
          )}

          {/* Marker birth/death */}
          {lifeMin != null && (
            <div style={{ position: "absolute", left: `${pct(lifeMin)}%`, top: 50, transform: "translateX(-50%)" }}>
              <div style={{ width: 8, height: 8, background: "#6b2d3e", borderRadius: "50%", border: "2px solid #fff", boxShadow: "0 0 0 1px #6b2d3e" }} />
              <div style={{ fontSize: 10, color: "#6b2d3e", fontWeight: 600, textAlign: "center", marginTop: 2, whiteSpace: "nowrap" }}>
                {fmtYear(lifeMin)}
              </div>
            </div>
          )}
          {lifeMax != null && (
            <div style={{ position: "absolute", left: `${pct(lifeMax)}%`, top: 50, transform: "translateX(-50%)" }}>
              <div style={{ width: 8, height: 8, background: "#a8483f", borderRadius: "50%", border: "2px solid #fff", boxShadow: "0 0 0 1px #a8483f" }} />
              <div style={{ fontSize: 10, color: "#a8483f", fontWeight: 600, textAlign: "center", marginTop: 2, whiteSpace: "nowrap" }}>
                {fmtYear(lifeMax)}
              </div>
            </div>
          )}

          {/* Linea orizzontale di riferimento */}
          <div style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 60,
            height: 1,
            background: "var(--line)",
          }} />

          {/* Marker opere */}
          {sortedWorks.map((w, idx) => {
            const year = w.year_start ?? w.year_end!;
            const left = pct(year);
            // Stagger verticale per evitare overlap quando ci sono più opere nello stesso anno
            const staggerY = (idx % 3) * 16 - 16;
            const isHovered = hoveredId === w.id;
            // Tutti i pallini uguali: la grandezza codificava «l'importanza»
            // dell'opera, che era poi lo spazio datole dai manuali. Quel dato
            // non c'e' piu', e un pallino piu' grosso senza niente dietro
            // direbbe una gerarchia che non abbiamo.
            const size = 9;
            return (
              <div
                key={w.id}
                style={{
                  position: "absolute",
                  left: `${left}%`,
                  top: 60 + staggerY,
                  transform: "translate(-50%, -50%)",
                  zIndex: isHovered ? 10 : 1,
                }}
                onMouseEnter={() => setHoveredId(w.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Pallino */}
                <div style={{
                  width: size,
                  height: size,
                  borderRadius: "50%",
                  background: "#8f6a1d",
                  border: "2px solid var(--bg)",
                  cursor: "pointer",
                  boxShadow: isHovered ? "0 0 0 2px var(--gold)" : "none",
                  transition: "box-shadow .15s",
                }} />

                {/* Tooltip on hover */}
                {isHovered && (
                  <div style={{
                    position: "absolute",
                    bottom: "calc(100% + 8px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "var(--ink, #2d2a26)",
                    color: "#fff",
                    padding: "8px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                    pointerEvents: "none",
                    zIndex: 100,
                  }}>
                    <div style={{ fontWeight: 600 }}>{w.title}</div>
                    <div style={{ opacity: 0.7, marginTop: 2 }}>
                      {year}{w.location_city ? ` · ${w.location_city}` : ""}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Tick marks (anni) */}
          {ticks.map((y) => (
            <div key={y} style={{
              position: "absolute",
              left: `${pct(y)}%`,
              top: 80,
              transform: "translateX(-50%)",
            }}>
              <div style={{ width: 1, height: 6, background: "var(--line)", margin: "0 auto" }} />
              <div style={{ fontSize: 10, color: "var(--ink-dim)", marginTop: 2, whiteSpace: "nowrap" }}>
                {y < 0 ? `${-y} a.C.` : y}
              </div>
            </div>
          ))}
        </div>

        {/* Legenda */}
        <div style={{
          display: "flex", gap: 14, marginTop: 8, fontSize: 11,
          color: "var(--ink-dim)", flexWrap: "wrap", justifyContent: "center",
        }}>
          <span>
            <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "#8f6a1d", marginRight: 4, verticalAlign: "middle" }} />
            opera
          </span>
          {lifeMin != null && lifeMax != null && (
            <span>
              <span style={{ display: "inline-block", width: 18, height: 4, background: "linear-gradient(90deg, #6b2d3e 0%, #b88a2e 100%)", marginRight: 4, verticalAlign: "middle" }} />
              vita dell'artista
            </span>
          )}
        </div>
      </div>

      {/* Lista opere (se hover, evidenzia) */}
      {sortedWorks.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: "var(--ink-dim)", textAlign: "center" }}>
          {sortedWorks.length} opere datate dal {fmtYear(sortedWorks[0].year_start ?? sortedWorks[0].year_end!)} al {fmtYear(sortedWorks[sortedWorks.length - 1].year_start ?? sortedWorks[sortedWorks.length - 1].year_end!)}
          {" · "}
          <Link to={`/opere?q=${encodeURIComponent(artist.name)}`} style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>
            Vedi tutte le opere →
          </Link>
        </div>
      )}
    </div>
  );
}
