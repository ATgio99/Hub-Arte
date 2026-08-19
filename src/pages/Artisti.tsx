// ============================================================================
// Pagina ARTISTI: indice cercabile di tutti gli artisti del programma.
// Ricerca per nome/alias/ruolo, ordinamento per numero di opere o alfabetico,
// card con date, ruolo, periodi e conteggio opere. Filtrata dallo slider.
// ============================================================================
import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useData, useTimeRange } from "../lib/store";
import { FilterNote, Empty, EmptyTimeRange, FavStar } from "../components/ui";
import { useFavorites } from "../lib/favorites";
import { fmtYear } from "../lib/data";
import { clearLastArtista } from "../lib/lastVisited";

export default function Artisti() {
  const ix = useData();
  const { artistIn, active } = useTimeRange();

  // Quando si arriva alla home degli Artisti, azzerare l'ultimo artista visitato
  useEffect(() => {
    clearLastArtista();
  }, []);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"opere" | "alfabetico">("opere");
  const [favOnly, setFavOnly] = useState(false);
  const favs = useFavorites();

  const worksCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of ix.ds.works) for (const aid of w.artist_ids ?? []) m.set(aid, (m.get(aid) ?? 0) + 1);
    return m;
  }, [ix]);

  const inTime = useMemo(() => ix.ds.artists.filter(artistIn), [ix, artistIn]);

  const list = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const nq = norm(q.trim());
    let out = inTime;
    if (favOnly) out = out.filter((a) => favs.artists.includes(a.id));
    if (nq) {
      out = out.filter((a) =>
        norm(a.name).includes(nq) ||
        (a.aka ?? []).some((x) => norm(x).includes(nq)) ||
        norm(a.role ?? "").includes(nq));
    }
    return [...out].sort((a, b) =>
      sort === "opere"
        ? (worksCount.get(b.id) ?? 0) - (worksCount.get(a.id) ?? 0) || a.name.localeCompare(b.name, "it")
        : a.name.localeCompare(b.name, "it"));
  }, [inTime, q, sort, worksCount, favOnly, favs]);

  return (
    <div className="wrap page" style={{ paddingBottom: 40 }}>
      <div className="page-head">
        <div className="page-eyebrow"><span className="eyebrow">Maestri & botteghe</span></div>
        <h1 className="page-title">Autori</h1>
        <p className="page-lead">Tutti i protagonisti del programma: cerca per nome, alias o ruolo. Ogni scheda raccoglie biografia, innovazioni e opere. Lo slider temporale filtra l'elenco.</p>
      </div>
      <div className="page-rule" />

      <div className="filterbar" style={{ marginBottom: 18, gap: 12 }}>
        <input
          type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca un autore… (es. Giotto, orafo, Antelami)" data-testid="art-search"
          style={{ flex: "1 1 280px", maxWidth: 420, padding: "10px 14px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--bg-1)", color: "var(--ink)", fontSize: 14.5 }}
        />
        <div className="seg">
          <button className={`seg-btn ${sort === "opere" ? "on" : ""}`} onClick={() => setSort("opere")} data-testid="art-sort-opere">Per opere</button>
          <button className={`seg-btn ${sort === "alfabetico" ? "on" : ""}`} onClick={() => setSort("alfabetico")} data-testid="art-sort-alfa">A–Z</button>
        </div>
        <button className={`chip fav-chip ${favOnly ? "active" : ""}`} onClick={() => setFavOnly((v) => !v)} data-testid="art-fav-only"
          title={favs.artists.length === 0 ? "Nessun autore preferito: usa la ★ sulle schede" : ""}>
          ★ Preferiti{favs.artists.length > 0 ? ` (${favs.artists.length})` : ""}
        </button>
        <FilterNote total={ix.ds.artists.length} shown={list.length} noun="autori" />
      </div>

      {list.length === 0 && (
        favOnly && favs.artists.length === 0 ? (
          <Empty msg="Nessun autore preferito: tocca la ★ su una scheda per aggiungerlo." />
        ) : q ? (
          <Empty msg={`Nessun autore per «${q}».`} />
        ) : active ? (
          <EmptyTimeRange noun="autori" />
        ) : (
          <Empty msg="Nessun autore." />
        )
      )}

      <div className="grid-artists">
        {list.map((a) => {
          const n = worksCount.get(a.id) ?? 0;
          const dates = [a.birth, a.death].some((x) => x != null)
            ? `${a.birth != null ? fmtYear(a.birth) : "?"} – ${a.death != null ? fmtYear(a.death) : "?"}`
            : null;
          return (
            <Link key={a.id} to={`/artista/${a.id}`} className="card artist-card" data-testid={`card-artist-${a.id}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                <h4 className="artist-card-name">{a.name}</h4>
                <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {n > 0 && <span className="tnum faint" style={{ fontSize: 12 }}>{n} {n === 1 ? "opera" : "opere"}</span>}
                  <FavStar type="artist" id={a.id} size={15} />
                </span>
              </div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>
                {[a.role, dates].filter(Boolean).join(" · ")}
              </div>
              {a.period_ids.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                  {a.period_ids.slice(0, 3).map((pid) => (
                    <span key={pid} className="badge-period" style={{ fontSize: 9, padding: "3px 8px" }}>
                      {ix.periodById.get(pid)?.name ?? pid}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
