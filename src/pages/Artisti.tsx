// ============================================================================
// Pagina PROTAGONISTI: indice cercabile di chi ha fatto le opere e di chi le ha
// volute. Autori e committenti condividono la scheda e si distinguono per
// `category`; il filtro in alto sceglie quale dei due insiemi mostrare.
// Ricerca per nome/alias/ruolo, ordinamento per numero di opere o alfabetico.
// ============================================================================
import { useMemo, useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useData, useTimeRange } from "../lib/store";
import { arrivatoDaTastiera } from "../lib/scorciatoie";
import { FilterNote, Empty, EmptyTimeRange, FavStar } from "../components/ui";
import { useFavorites } from "../lib/favorites";
import { fmtYear, isCommittente } from "../lib/data";
import { clearLastArtista } from "../lib/lastVisited";

export default function Artisti() {
  const ix = useData();
  const { artistIn, active } = useTimeRange();

  // Quando si arriva alla home degli Artisti, azzerare l'ultimo artista visitato
  useEffect(() => {
    // Chi arriva con una scorciatoia sta solo cambiando sezione: la memoria
    // di dove era rimasto non va toccata. La si azzera solo quando l'indice
    // e' una scelta esplicita — il secondo clic sulla voce di menu.
    if (arrivatoDaTastiera()) return;
    clearLastArtista();
  }, []);

  // === Focus automatico sulla barra di ricerca (solo PC) ===
  // Stessa logica di Opere.tsx: mettiamo il cursore nella barra di ricerca
  // quando l'utente arriva alla home degli Artisti dal menu. Solo su device
  // con mouse (no touch) per evitare l'apertura indesiderata della tastiera
  // su tablet/cellulare.
  const searchRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const isTouchPrimary = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
    // Chi e' arrivato con una scorciatoia sta usando la tastiera per
    // navigare: mettergli il cursore nel campo di ricerca gli spegnerebbe
    // le scorciatoie al tasto successivo.
    if (!isTouchPrimary && !arrivatoDaTastiera() && searchRef.current) {
      const t = setTimeout(() => {
        try { searchRef.current?.focus(); } catch { /* ignore */ }
      }, 60);
      return () => clearTimeout(t);
    }
  }, []);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"opere" | "alfabetico">("opere");
  const [chi, setChi] = useState<"autori" | "committenti" | "tutti">("autori");
  const [favOnly, setFavOnly] = useState(false);
  const favs = useFavorites();

  // Due conteggi distinti: le opere eseguite (artist_ids) e quelle commissionate
  // (committente_ids). Un committente non compare mai nel primo elenco.
  const worksCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of ix.ds.works) {
      for (const aid of w.artist_ids ?? []) m.set(aid, (m.get(aid) ?? 0) + 1);
      for (const cid of w.committente_ids ?? []) m.set(cid, (m.get(cid) ?? 0) + 1);
    }
    return m;
  }, [ix]);

  const inTime = useMemo(() => ix.ds.artists.filter(artistIn), [ix, artistIn]);

  const list = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const nq = norm(q.trim());
    let out = inTime;
    if (chi !== "tutti") {
      const vogliamoCommittenti = chi === "committenti";
      out = out.filter((a) => isCommittente(a) === vogliamoCommittenti);
    }
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
  }, [inTime, q, sort, worksCount, favOnly, favs, chi]);

  return (
    <div className="wrap page" style={{ paddingBottom: 40 }}>
      <div className="page-head">
        <div className="page-eyebrow"><span className="eyebrow">Catalogo</span></div>
        <h1 className="page-title">Protagonisti</h1>
        <p className="page-lead">Chi ha fatto le opere e chi le ha volute: cerca per nome, alias o ruolo. Ogni scheda raccoglie biografia, innovazioni e opere. Lo slider temporale filtra l'elenco.</p>
      </div>
      <div className="page-rule" />

      <div className="filterbar" style={{ marginBottom: 18, gap: 12 }}>
        <input
          ref={searchRef}
          type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={chi === "committenti" ? "Cerca un committente…" : chi === "autori" ? "Cerca un autore…" : "Cerca fra i protagonisti…"} data-testid="art-search"
          style={{ flex: "0 1 340px", width: 340, padding: "10px 14px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--bg-1)", color: "var(--ink)", fontSize: 14.5 }}
        />
        <div className="seg" data-testid="art-chi">
          <button className={`seg-btn ${chi === "autori" ? "on" : ""}`} onClick={() => setChi("autori")}>Autori</button>
          <button className={`seg-btn ${chi === "committenti" ? "on" : ""}`} onClick={() => setChi("committenti")}>Committenti</button>
          <button className={`seg-btn ${chi === "tutti" ? "on" : ""}`} onClick={() => setChi("tutti")}>Tutti</button>
        </div>
        <div className="seg">
          <button className={`seg-btn ${sort === "opere" ? "on" : ""}`} onClick={() => setSort("opere")} data-testid="art-sort-opere">Per opere</button>
          <button className={`seg-btn ${sort === "alfabetico" ? "on" : ""}`} onClick={() => setSort("alfabetico")} data-testid="art-sort-alfa">A–Z</button>
        </div>
        <button className={`chip fav-chip ${favOnly ? "active" : ""}`} onClick={() => setFavOnly((v) => !v)} data-testid="art-fav-only"
          title={favs.artists.length === 0 ? "Nessun autore preferito: usa la ★ sulle schede" : ""}>
          ★ Preferiti{favs.artists.length > 0 ? ` (${favs.artists.length})` : ""}
        </button>
        <div style={{ marginLeft: "auto" }}>
          <FilterNote total={ix.ds.artists.length} shown={list.length} noun={chi === "committenti" ? "committenti" : chi === "autori" ? "autori" : "protagonisti"} />
        </div>
      </div>

      {list.length === 0 && (
        favOnly && favs.artists.length === 0 ? (
          <Empty msg="Nessun autore preferito: tocca la ★ su una scheda per aggiungerlo." />
        ) : q ? (
          <Empty msg={`Nessun risultato per «${q}».`} />
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
                <h4 className="artist-card-name">
                  {isCommittente(a) && (
                    <span title={a.is_collective ? "Ente committente" : "Committente"}
                      style={{ color: "var(--gold-deep)", marginRight: 6, fontSize: 11 }}>◆</span>
                  )}
                  {a.name}
                </h4>
                <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {n > 0 && <span className="tnum faint" style={{ fontSize: 12 }}>{n} {n === 1 ? "opera" : "opere"}</span>}
                  <FavStar type="artist" id={a.id} size={15} />
                </span>
              </div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>
                {[a.role, dates, a.location_city].filter(Boolean).join(" · ")}
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
