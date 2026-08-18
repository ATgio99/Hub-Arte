import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useData, useTimeRange } from "../lib/store";
import { WorkCard, Section, Empty, EntityLink, FilterNote, FavStar } from "../components/ui";
import ArtistMap from "../components/ArtistMap";
import ArtistTimeline from "../components/ArtistTimeline";
import ArtistEditorDrawer from "../components/ArtistEditorDrawer";
import { useAuth } from "../lib/auth";
import { setLastArtista } from "../lib/lastVisited";
import {
  worksByArtist, connectionsOf, fmtYear, entityLabel, ENTITY_LABEL, KIND_LABEL,
} from "../lib/data";

export default function Artista() {
  const { id } = useParams();
  const ix = useData();
  const nav = useNavigate();
  const { user, isAdmin } = useAuth();
  const [editorOpen, setEditorOpen] = useState(false);
  const { workIn } = useTimeRange();
  const a = id ? ix.artistById.get(id) : undefined;
  if (!a) return <div className="wrap page"><Empty msg="Artista non trovato." /></div>;

  // Salva l'ID dell'artista come ultimo visitato (per il ritorno da menu Artisti)
  useEffect(() => {
    if (a) setLastArtista(a.id);
  }, [a?.id]);

  const allWorks = worksByArtist(ix.ds, a.id).sort((x, y) => y.importance - x.importance);
  const works = allWorks.filter(workIn);
  const periods = a.period_ids.map((pid) => ix.periodById.get(pid)).filter(Boolean) as any[];
  const conns = connectionsOf(ix.ds, "artist", a.id);
  const life = [a.birth, a.death].some((x) => x != null)
    ? `${a.birth != null ? fmtYear(a.birth) : "?"} – ${a.death != null ? fmtYear(a.death) : "?"}` : null;

  // Verifica se ci sono opere geolocalizzate (per mostrare la mappa)
  const geolocatedWorks = allWorks.filter((w) => w.lat != null && w.lon != null && w.location_city);
  const showMap = geolocatedWorks.length >= 2; // almeno 2 città diverse
  const hasDistinctCities = new Set(geolocatedWorks.map((w) => w.location_city)).size >= 2;

  // Verifica se ci sono opere datate (per mostrare la timeline)
  const datedWorks = allWorks.filter((w) => (w.year_start ?? w.year_end) != null);
  const showTimeline = datedWorks.length >= 2;

  return (
    <div className="wrap page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
        <button className="btn ghost sm" onClick={() => nav(-1)} data-testid="button-back">← Indietro</button>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isAdmin ? (
            <button
              onClick={() => setEditorOpen(true)}
              className="btn gold sm"
              style={{ fontSize: 13, padding: "8px 14px", whiteSpace: "nowrap" }}
              title="Modifica i metadati dell'artista nel database (solo admin)"
              data-testid="btn-admin-edit-artist"
            >
              ✎ Modifica
            </button>
          ) : user ? (
            <Link
              to="/suggerisci"
              className="btn ghost sm"
              style={{ fontSize: 13, padding: "8px 14px", borderColor: "var(--line)", color: "var(--ink-soft)", whiteSpace: "nowrap" }}
              title="Proponi una modifica a questo artista"
            >
              ✎ Richiedi modifica
            </Link>
          ) : null}
        </div>
      </div>
      <div className="page-head">
        <div className="eyebrow"><span className="tnum">{a.role}{life ? ` · ${life}` : ""}</span></div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <h1 className="page-title" style={{ minWidth: 0 }}>{a.name}</h1>
          <FavStar type="artist" id={a.id} size={24} className="fav-star-lg" />
        </div>
        {a.aka.length > 0 && <div className="muted" style={{ marginTop: 6 }}>detto anche: {a.aka.join(", ")}</div>}
        <p className="page-lead">{a.bio}</p>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        {periods.map((p) => <EntityLink key={p.id} type="period" id={p.id} label={p.name} className="chip" />)}
      </div>

      {a.innovations.length > 0 && (
        <div style={{ marginTop: 30, maxWidth: 760 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Innovazioni</div>
          <ul className="innov">{a.innovations.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}

      {conns.length > 0 && (
        <Section eyebrow="Sinapsi" title="Maestri, allievi e influenze">
          {conns.map((c) => {
            const otherIsSource = !(c.source_type === "artist" && c.source_id === a.id);
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

      {/* Timeline opere (se almeno 2 opere datate) */}
      {showTimeline && (
        <Section eyebrow="Cronologia" title="Linea del tempo delle opere">
          <ArtistTimeline artist={a} works={allWorks} periods={periods} />
        </Section>
      )}

      {/* Mappa opere (se almeno 2 opere geolocalizzate in città diverse) */}
      {showMap && hasDistinctCities && (
        <Section eyebrow="Geografia" title="Dove si trovano le opere">
          <ArtistMap artist={a} works={geolocatedWorks} periods={periods} />
        </Section>
      )}

      {allWorks.length > 0 ? (
        <Section eyebrow={`${works.length} opere`} title="Opere"
          right={<FilterNote total={allWorks.length} shown={works.length} noun="opere nell'arco scelto" />}>
          {works.length > 0
            ? <div className="grid-works">{works.map((w) => <WorkCard key={w.id} work={w} />)}</div>
            : <Empty msg="Nessuna opera di questo artista nell'intervallo temporale scelto." />}
        </Section>
      ) : <Section title="Opere"><Empty msg="Nessuna opera registrata per questo artista." /></Section>}

      {/* Editor drawer (solo admin, apre con pulsante Modifica) */}
      <ArtistEditorDrawer
        artistId={a.id}
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
      />
    </div>
  );
}
