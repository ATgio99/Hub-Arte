import { useParams, useNavigate, Link } from "react-router-dom";
import { useData, useTimeRange } from "../lib/store";
import { WorkCard, Section, Empty, EntityLink, FilterNote } from "../components/ui";
import {
  worksByPeriod, connectionsOf, periodAncestry, fmtYear,
  entityLabel, ENTITY_LABEL, KIND_LABEL,
} from "../lib/data";
import PeriodDossier from "../components/PeriodDossier";

export default function Periodo() {
  const { id } = useParams();
  const ix = useData();
  const nav = useNavigate();
  const { workIn } = useTimeRange();
  const p = id ? ix.periodById.get(id) : undefined;
  if (!p) return <div className="wrap page"><Empty msg="Periodo non trovato." /></div>;

  const allWorks = worksByPeriod(ix.ds, p.id).sort((a, b) => b.importance - a.importance);
  const works = allWorks.filter(workIn);
  const children = ix.ds.periods.filter((x) => x.parent_id === p.id).sort((a, b) => a.year_start - b.year_start);
  const artists = ix.ds.artists.filter((a) => a.period_ids.includes(p.id));
  const conns = connectionsOf(ix.ds, "period", p.id);
  const trail = periodAncestry(ix, p.id);

  return (
    <div className="wrap page">
      <button className="btn ghost sm" onClick={() => nav(-1)} style={{ marginBottom: 18 }} data-testid="button-back">← Indietro</button>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10, fontSize: 13 }}>
        {trail.slice(0, -1).map((t) => (
          <Link key={t.id} to={`/periodo/${t.id}`} className="muted tlink" style={{ border: 0 }}>{t.name} ›</Link>
        ))}
      </div>
      <div className="page-head">
        <div className="eyebrow"><span className="tnum">{p.type} · {fmtYear(p.year_start)} – {fmtYear(p.year_end)}</span></div>
        <h1 className="page-title">{p.name}</h1>
        <p className="page-lead">{p.summary}</p>
      </div>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 16 }}>
        {p.regions.map((r) => <span key={r} className="tag">{r}</span>)}
      </div>

      <div className="two-col" style={{ marginTop: 36 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Contesto storico</div>
          <div className="prose" style={{ fontSize: 16 }}>{p.historical_context.split(/\n+/).map((x, i) => <p key={i}>{x}</p>)}</div>
        </div>
        {p.key_innovations.length > 0 && (
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Innovazioni chiave</div>
            <ul className="innov">{p.key_innovations.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
        )}
      </div>

      <Section eyebrow="Memoranda" title="Glossario & cose da ricordare">
        <PeriodDossier pid={p.id} variant="page" />
      </Section>

      {children.length > 0 && (
        <Section eyebrow="Articolazione" title="Sotto-periodi e correnti">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {children.map((c) => (
              <Link key={c.id} to={`/periodo/${c.id}`} className="card hover" style={{ padding: "12px 16px", minWidth: 180 }}>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div className="faint tnum" style={{ fontSize: 12, marginTop: 3 }}>{fmtYear(c.year_start)}–{fmtYear(c.year_end)}</div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {artists.length > 0 && (
        <Section eyebrow="Protagonisti" title={`Artisti (${artists.length})`}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {artists.map((a) => <EntityLink key={a.id} type="artist" id={a.id} label={a.name} className="chip" />)}
          </div>
        </Section>
      )}

      {conns.length > 0 && (
        <Section eyebrow="Sinapsi" title="Connessioni e contaminazioni">
          {conns.map((c) => {
            const otherIsSource = !(c.source_type === "period" && c.source_id === p.id);
            const ot = otherIsSource ? c.source_type : c.target_type;
            const oid = otherIsSource ? c.source_id : c.target_id;
            return (
              <div className="conn-row" key={c.id}>
                <span className="conn-kind">{KIND_LABEL[c.kind] ?? c.kind}</span>
                <div>
                  <div style={{ marginBottom: 3 }}>
                    <span className="muted" style={{ fontSize: 12 }}>{ENTITY_LABEL[ot]} · </span>
                    <EntityLink type={ot} id={oid} label={entityLabel(ix, ot, oid)} />
                  </div>
                  <div className="muted" style={{ fontSize: 14 }}>{c.description}</div>
                </div>
              </div>
            );
          })}
        </Section>
      )}

      {allWorks.length > 0 && (
        <Section eyebrow={`${works.length} opere`} title="Opere del periodo"
          right={<FilterNote total={allWorks.length} shown={works.length} noun="opere nell'arco scelto" />}>
          {works.length > 0 ? (
            <>
              <div className="grid-works">{works.slice(0, 24).map((w) => <WorkCard key={w.id} work={w} />)}</div>
              {works.length > 24 && <div style={{ marginTop: 20 }}><Link className="btn" to={`/opere?p=${p.id}`}>Vedi tutte nel catalogo →</Link></div>}
            </>
          ) : <Empty msg="Nessuna opera del periodo nell'intervallo temporale scelto." />}
        </Section>
      )}
    </div>
  );
}
