// ============================================================================
// Dossier "da ricordare" di un periodo: glossario chiave, personaggi/eventi,
// artisti principali, opere capitali, stili collegati, tecniche e luoghi.
// Usato come anteprima espandibile nella timeline (variant="timeline")
// e come sezione memoranda nella scheda periodo (variant="page").
// ============================================================================
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useData } from "../lib/store";
import { EntityLink, WorkImage } from "./ui";
import { fmtYear } from "../lib/data";

const EV_DOT: Record<string, string> = {
  politico: "#a8483f", religioso: "#9a6a92", culturale: "#b88a2e", tecnologico: "#4f7d72",
};

export default function PeriodDossier({ pid, variant = "timeline", onClose }:
  { pid: string; variant?: "timeline" | "page"; onClose?: () => void }) {
  const ix = useData();
  const p = ix.periodById.get(pid);

  const data = useMemo(() => {
    if (!p) return null;
    const works = ix.ds.works.filter((w) => w.period_id === pid);
    const capital = works.filter((w) => w.importance === 3).slice(0, 6);
    // artisti per numero di opere nel periodo
    const ac = new Map<string, number>();
    for (const w of works) for (const a of w.artist_ids ?? []) ac.set(a, (ac.get(a) ?? 0) + 1);
    for (const a of ix.ds.artists) if (a.period_ids.includes(pid) && !ac.has(a.id)) ac.set(a.id, 0);
    const artists = [...ac.entries()].sort((x, y) => y[1] - x[1]).slice(0, 8);
    // glossario: termini del periodo, archetipi prima
    const terms = ix.ds.terms
      .filter((t) => t.period_ids?.includes(pid))
      .sort((a, b) => Number(b.is_archetype) - Number(a.is_archetype))
      .slice(0, 18);
    const techs = ix.ds.techniques.filter((t) => t.first_period_id === pid).slice(0, 8);
    // personaggi & eventi: del periodo o nel suo arco temporale
    const events = ix.ds.events
      .filter((e) => e.period_id === pid || (e.year >= p.year_start && e.year <= p.year_end))
      .sort((a, b) => a.year - b.year);
    const keyEvents = events.length > 8
      ? events.filter((e) => e.kind === "politico" || e.kind === "religioso").slice(0, 8)
      : events.slice(0, 8);
    // luoghi principali
    const cc = new Map<string, number>();
    for (const w of works) if (w.location_city) cc.set(w.location_city, (cc.get(w.location_city) ?? 0) + 1);
    const cities = [...cc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    // stili: figli + genitore
    const children = ix.ds.periods.filter((x) => x.parent_id === pid).sort((a, b) => a.year_start - b.year_start);
    const parent = p.parent_id ? ix.periodById.get(p.parent_id) : null;
    return { works, capital, artists, terms, techs, keyEvents, cities, children, parent };
  }, [ix, pid, p]);

  if (!p || !data) return null;
  const isTL = variant === "timeline";

  return (
    <div className={`dossier ${isTL ? "" : "page"}`} data-testid="period-dossier">
      {isTL && (
        <div className="dossier-head">
          <div>
            <span className="eyebrow" style={{ marginRight: 10 }}>{p.type}</span>
            <span className="tnum faint" style={{ fontSize: 12.5 }}>{fmtYear(p.year_start)} – {fmtYear(p.year_end)}</span>
            <h3 className="dossier-title">{p.name}</h3>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link className="btn gold sm" to={`/periodo/${pid}`} data-testid="dossier-open">Apri la scheda completa →</Link>
            {onClose && <button className="btn sm ghost" onClick={onClose} aria-label="Chiudi anteprima" data-testid="dossier-close">✕</button>}
          </div>
        </div>
      )}
      {isTL && <p className="muted" style={{ fontSize: 14, lineHeight: 1.6, margin: "2px 0 16px", maxWidth: 760 }}>{p.summary}</p>}

      <div className="dossier-grid">
        {data.keyEvents.length > 0 && (
          <div className="dossier-cell">
            <div className="smallcaps dossier-label">Personaggi & eventi da ricordare</div>
            {data.keyEvents.map((e) => (
              <div key={e.id} className="dossier-ev" title={e.description}>
                <span className="dot" style={{ background: EV_DOT[e.kind] ?? "var(--gold)", flexShrink: 0 }} />
                <span className="tnum dossier-ev-y">{fmtYear(e.year)}</span>
                <span>{e.title}</span>
              </div>
            ))}
          </div>
        )}

        {data.terms.length > 0 && (
          <div className="dossier-cell">
            <div className="smallcaps dossier-label">Glossario chiave</div>
            <div className="dossier-chips">
              {data.terms.map((t) => (
                <EntityLink key={t.id} type="term" id={t.id}
                  className={`chip sm ${t.is_archetype ? "arch" : ""}`}
                  label={t.is_archetype ? `★ ${t.term}` : t.term} />
              ))}
            </div>
          </div>
        )}

        {data.artists.length > 0 && (
          <div className="dossier-cell">
            <div className="smallcaps dossier-label">Artisti più importanti</div>
            <div className="dossier-chips">
              {data.artists.map(([aid, n]) => (
                <EntityLink key={aid} type="artist" id={aid} className="chip sm"
                  label={`${ix.artistById.get(aid)?.name ?? aid}${n > 0 ? ` · ${n}` : ""}`} />
              ))}
            </div>
            {data.techs.length > 0 && (
              <>
                <div className="smallcaps dossier-label" style={{ marginTop: 14 }}>Tecniche</div>
                <div className="dossier-chips">
                  {data.techs.map((t) => <EntityLink key={t.id} type="technique" id={t.id} className="chip sm" label={t.name} />)}
                </div>
              </>
            )}
          </div>
        )}

        {(data.cities.length > 0 || data.children.length > 0 || data.parent) && (
          <div className="dossier-cell">
            {data.cities.length > 0 && (
              <>
                <div className="smallcaps dossier-label">Luoghi principali</div>
                <div className="dossier-chips">
                  {data.cities.map(([c, n]) => (
                    <Link key={c} className="chip sm" to={`/luogo/${encodeURIComponent(c)}`}>{c} · {n}</Link>
                  ))}
                </div>
              </>
            )}
            {(data.children.length > 0 || data.parent) && (
              <>
                <div className="smallcaps dossier-label" style={{ marginTop: data.cities.length ? 14 : 0 }}>Stili & correnti collegate</div>
                <div className="dossier-chips">
                  {data.parent && <Link className="chip sm" to={`/periodo/${data.parent.id}`}>↑ {data.parent.name}</Link>}
                  {data.children.map((c) => <Link key={c.id} className="chip sm" to={`/periodo/${c.id}`}>{c.name}</Link>)}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {isTL && data.capital.length > 0 && (
        <>
          <div className="smallcaps dossier-label" style={{ marginTop: 18 }}>Opere capitali</div>
          <div className="dossier-works">
            {data.capital.map((w) => (
              <Link key={w.id} to={`/opera/${w.id}`} className="dossier-work" title={w.title}>
                <div className="dossier-work-img"><WorkImage work={w} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
                <div className="dossier-work-t">{w.title}</div>
              </Link>
            ))}
            {data.works.length > data.capital.length && (
              <Link to={`/opere?p=${pid}`} className="dossier-work more">
                <div className="dossier-work-img" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
                  +{data.works.length - data.capital.length}
                </div>
                <div className="dossier-work-t">tutte le opere →</div>
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
