import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { useData, useTimeRange } from "../lib/store";
import { WorkCard, Section, Empty, EntityLink, FilterNote, BarraScheda } from "../components/ui";
import {
  worksByPeriod, connectionsOf, periodAncestry, fmtYear,
  entityLabel, ENTITY_LABEL, KIND_LABEL,
} from "../lib/data";
import PeriodDossier from "../components/PeriodDossier";
import { setLastTimeline } from "../lib/lastVisited";
import { useIsNarrow } from "../lib/motion";
import type { Period } from "../lib/types";
import { useTestoLeggibile } from "../lib/lettura";

const TYPE_COLOR: Record<string, string> = { epoca: "#b88a2e", corrente: "#b9692c", scuola: "#4f7d72" };

// Mostra la matrioska sotto un periodo: le scuole dirette come griglia, e ogni
// corrente figlia come blocco a se' che ripete la stessa struttura al proprio interno.
// La ricorsione regge anche i casi di scuola dentro scuola presenti nei dati.
function PeriodTree({ periods, parentId, depth = 0 }: { periods: Period[]; parentId: string; depth?: number }) {
  const kids = periods.filter((x) => x.parent_id === parentId).sort((a, b) => a.year_start - b.year_start);
  if (kids.length === 0) return null;
  const scuole = kids.filter((k) => k.type === "scuola");
  const correnti = kids.filter((k) => k.type !== "scuola");

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {scuole.length > 0 && (
        <div>
          <div className="eyebrow" style={{ marginBottom: 10, color: TYPE_COLOR.scuola }}>
            {scuole.length === 1 ? "Scuola" : `Scuole (${scuole.length})`}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {scuole.map((s) => <PeriodCard key={s.id} p={s} />)}
          </div>
          {scuole.map((s) => (
            <div key={s.id} style={{ marginTop: 14 }}>
              <PeriodTree periods={periods} parentId={s.id} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}

      {correnti.map((c) => (
        <div key={c.id} style={{ borderLeft: `2px solid ${TYPE_COLOR[c.type] ?? "var(--line)"}`, paddingLeft: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 6, color: TYPE_COLOR[c.type] }}>{c.type}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <Link to={`/periodo/${c.id}`} style={{ fontWeight: 600, fontSize: 17 }}>{c.name}</Link>
            <span className="faint tnum" style={{ fontSize: 12 }}>{fmtYear(c.year_start)}–{fmtYear(c.year_end)}</span>
          </div>
          <PeriodTree periods={periods} parentId={c.id} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

function PeriodCard({ p }: { p: Period }) {
  return (
    <Link to={`/periodo/${p.id}`} className="card hover" style={{ padding: "12px 16px", minWidth: 180 }}>
      <div style={{ fontWeight: 600 }}>{p.name}</div>
      <div className="faint tnum" style={{ fontSize: 12, marginTop: 3 }}>{fmtYear(p.year_start)}–{fmtYear(p.year_end)}</div>
    </Link>
  );
}

export default function Periodo() {
  const { id } = useParams();
  const ix = useData();
  const nav = useNavigate();
  const { workIn } = useTimeRange();
  // Su telefono le sezioni lunghe partono chiuse: la pagina di un periodo
  // altrimenti diventa un rotolo interminabile.
  const narrow = useIsNarrow();
  const p = id ? ix.periodById.get(id) : undefined;

  // Salva il periodo come ultimo visitato dalla Linea del tempo (per il ritorno via menu)
  useEffect(() => {
    if (!p) return;
    setLastTimeline(p.id);
    window.dispatchEvent(new CustomEvent("atlante:last-visited-changed"));
  }, [p?.id]);

  if (!p) return <div className="wrap page"><Empty msg="Periodo non trovato." /></div>;

  const allWorks = worksByPeriod(ix.ds, p.id)
    .sort((a, b) => (a.year_end ?? a.year_start ?? 9999) - (b.year_end ?? b.year_start ?? 9999)
      || a.id.localeCompare(b.id));
  const works = allWorks.filter(workIn);
  const hasChildren = ix.ds.periods.some((x) => x.parent_id === p.id);
  const artists = ix.ds.artists.filter((a) => a.period_ids.includes(p.id));
  const conns = connectionsOf(ix.ds, "period", p.id);
  const trail = periodAncestry(ix, p.id);

  useTestoLeggibile(p?.name ?? "", p ? [
    { id: "che", testo: `${p.name}. ${p.type}, dal ${fmtYear(p.year_start)} al ${fmtYear(p.year_end)}.` },
    ...(p.summary ? [{ id: "sommario", occhiello: "In breve", testo: p.summary }] : []),
    ...(p.historical_context ? [{ id: "contesto", occhiello: "Contesto storico", testo: p.historical_context }] : []),
  ] : []);

  return (
    <div className="wrap page">
      <BarraScheda />
      {trail.length > 1 && (
        <div className="card" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14, fontSize: 13, padding: "10px 14px" }}>
          {trail.map((t, i) => {
            const last = i === trail.length - 1;
            return (
              <span key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: TYPE_COLOR[t.type] ?? "var(--line)" }} />
                {last
                  ? <span style={{ fontWeight: 600 }}>{t.name}</span>
                  : <Link to={`/periodo/${t.id}`} className="tlink" style={{ border: 0 }}>{t.name}</Link>}
                {!last && <span className="faint">›</span>}
              </span>
            );
          })}
        </div>
      )}
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

      <Section eyebrow="Memoranda" title="Glossario & cose da ricordare" collapsible={narrow} defaultCollapsed={narrow}>
        <PeriodDossier pid={p.id} variant="page" />
      </Section>

      {hasChildren && (
        <Section eyebrow="Articolazione" title="Cosa contiene" collapsible={narrow} defaultCollapsed={narrow}>
          <PeriodTree periods={ix.ds.periods} parentId={p.id} />
        </Section>
      )}

      {artists.length > 0 && (
        <Section eyebrow="Protagonisti" title={`Artisti (${artists.length})`} collapsible={narrow} defaultCollapsed={narrow}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {artists.map((a) => <EntityLink key={a.id} type="artist" id={a.id} label={a.name} className="chip" />)}
          </div>
        </Section>
      )}

      {conns.length > 0 && (
        <Section eyebrow="Sinapsi" title="Connessioni e contaminazioni" collapsible={narrow} defaultCollapsed={narrow}>
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
              {/* Su telefono le schede vanno in colonna singola: 24 opere fanno
                  una pagina da migliaia di pixel, quindi qui ne bastano poche
                  con il rimando al catalogo. */}
              <div className="grid-works">{works.slice(0, narrow ? 6 : 24).map((w) => <WorkCard key={w.id} work={w} />)}</div>
              {works.length > (narrow ? 6 : 24) && <div style={{ marginTop: 20 }}><Link className="btn" to={`/opere?p=${p.id}`}>Vedi tutte nel catalogo →</Link></div>}
            </>
          ) : <Empty msg="Nessuna opera del periodo nell'intervallo temporale scelto." />}
        </Section>
      )}
    </div>
  );
}
