import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useData, useTimeRange } from "../lib/store";
import { WorkCard, Section, Empty, EntityLink, FilterNote, FavStar, BarraScheda } from "../components/ui";
import ArtistMap from "../components/ArtistMap";
import ArtistTimeline from "../components/ArtistTimeline";
import ArtistEditorDrawer from "../components/ArtistEditorDrawer";
import { useAuth } from "../lib/auth";
import { setLastArtista } from "../lib/lastVisited";
import {
  worksByArtist, worksByCommittente, isCommittente, connectionsOf, fmtYear, entityLabel, ENTITY_LABEL, KIND_LABEL,
} from "../lib/data";

export default function Artista() {
  const { id } = useParams();
  const ix = useData();
  const nav = useNavigate();
  const { user, isAdmin } = useAuth();
  const [editorOpen, setEditorOpen] = useState(false);
  const { workIn } = useTimeRange();
  const a = id ? ix.artistById.get(id) : undefined;

  // Salva l'ID dell'artista come ultimo visitato (per il ritorno da menu Artisti).
  // Deve stare PRIMA dell'early return, altrimenti viola le regole degli hooks.
  useEffect(() => {
    if (!a) return;
    setLastArtista(a.id);
    // Notifica la sidebar di aggiornare l'etichetta "Continua" in tempo reale
    window.dispatchEvent(new CustomEvent("atlante:last-visited-changed"));
  }, [a?.id]);

  if (!a) return <div className="wrap page"><Empty msg="Scheda non trovata." /></div>;

  // Per un committente le "sue" opere sono quelle che ha commissionato: cercarlo
  // fra gli autori non restituirebbe nulla, perche' non compare in artist_ids.
  const committente = isCommittente(a);
  const allWorks = (committente ? worksByCommittente(ix.ds, a.id) : worksByArtist(ix.ds, a.id))
    .sort((x, y) => y.importance - x.importance);
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
      <BarraScheda azioni={
        isAdmin ? (
          <button
            onClick={() => setEditorOpen(true)}
            className="btn gold sm"
            style={{ fontSize: 13, padding: "8px 14px", whiteSpace: "nowrap" }}
            title="Modifica i metadati nel database (solo admin)"
            data-testid="btn-admin-edit-artist"
          >
            ✎ Modifica
          </button>
        ) : user ? (
          <Link
            to="/suggerisci"
            className="btn ghost sm"
            style={{ fontSize: 13, padding: "8px 14px", borderColor: "var(--line)", color: "var(--ink-soft)", whiteSpace: "nowrap" }}
            title="Proponi una modifica a questa scheda"
          >
            ✎ Richiedi modifica
          </Link>
        ) : null
      } />
      <div className="page-head">
        {/* Un committente va riconosciuto subito: la scheda e' la stessa di un
            autore, e senza un segno esplicito le due cose si confondono. */}
        {committente && (
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <span className="tag" style={{ color: "var(--gold-deep)", borderColor: "var(--gold-deep)", fontWeight: 700, letterSpacing: ".06em" }}>
              {a.is_collective ? "◆ ENTE COMMITTENTE" : "◆ COMMITTENTE"}
            </span>
            {a.location_city && <span className="tag">{a.location_city}</span>}
          </div>
        )}
        <div className="eyebrow"><span className="tnum">{a.role}{life ? ` · ${life}` : ""}</span></div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <h1 className="page-title" style={{ minWidth: 0 }}>{a.name}</h1>
          <FavStar type="artist" id={a.id} size={24} className="fav-star-lg" />
        </div>
        {a.aka.length > 0 && <div className="muted" style={{ marginTop: 6 }}>detto anche: {a.aka.join(", ")}</div>}
        {committente && (
          <div className="muted" style={{ marginTop: 8, fontSize: 14 }}>
            Non ha eseguito queste opere: le ha commissionate.
          </div>
        )}
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

      {showTimeline && (
        <Section eyebrow="Cronologia" title="Linea del tempo delle opere">
          <ArtistTimeline artist={a} works={allWorks} periods={periods} />
        </Section>
      )}

      {conns.length > 0 && (
        <Section eyebrow="Sinapsi" title="Maestri, allievi e influenze" collapsible defaultCollapsed>
          {conns.map((c) => {
            const otherIsSource = !(c.source_type === "artist" && c.source_id === a.id);
            const ot = otherIsSource ? c.source_type : c.target_type;
            const oid = otherIsSource ? c.source_id : c.target_id;
            // Per mostrare A → B: "questo autore" è A (source) se source_id === a.id,
            // altrimenti l'altro è source e "questo autore" è B (target).
            // thisIsSource = true → quest'autore influenza l'altro (A → B)
            const thisIsSource = c.source_type === "artist" && c.source_id === a.id;
            const otherLabel = entityLabel(ix, ot, oid);
            return (
              <div className="conn-row" key={c.id}>
                <span className="conn-kind">{KIND_LABEL[c.kind] ?? c.kind}</span>
                <div>
                  {/* Mostra direzione: A → B (entrambi i nomi visibili) */}
                  <div style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span className="muted" style={{ fontSize: 12 }}>{ENTITY_LABEL[ot]} · </span>
                    {thisIsSource ? (
                      // Questo autore → altro
                      <>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</span>
                        <span style={{ color: "var(--gold-deep)", fontSize: 13, fontWeight: 700 }}>→</span>
                        <EntityLink type={ot} id={oid} label={otherLabel} />
                      </>
                    ) : (
                      // Altro → questo autore
                      <>
                        <EntityLink type={ot} id={oid} label={otherLabel} />
                        <span style={{ color: "var(--gold-deep)", fontSize: 13, fontWeight: 700 }}>→</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</span>
                      </>
                    )}
                  </div>
                  <div className="muted" style={{ fontSize: 14 }}>{c.description}</div>
                </div>
              </div>
            );
          })}
        </Section>
      )}

      {/* Mappa opere (se almeno 2 opere geolocalizzate in città diverse) */}
      {showMap && hasDistinctCities && (
        <Section eyebrow="Geografia" title="Dove si trovano le opere" collapsible defaultCollapsed>
          <ArtistMap artist={a} works={geolocatedWorks} periods={periods} />
        </Section>
      )}

      {allWorks.length > 0 ? (
        <Section eyebrow={`${works.length} opere`} title={committente ? "Opere commissionate" : "Opere"}
          right={<FilterNote total={allWorks.length} shown={works.length} noun="opere nell'arco scelto" />}>
          {works.length > 0
            ? <div className="grid-works">{works.map((w) => <WorkCard key={w.id} work={w} />)}</div>
            : <Empty msg="Nessuna opera di questo autore nell'intervallo temporale scelto." />}
        </Section>
      ) : <Section title={committente ? "Opere commissionate" : "Opere"}><Empty msg={committente ? "Nessuna opera ancora attribuita alla sua committenza." : "Nessuna opera registrata per questo autore."} /></Section>}

      {/* Editor drawer (solo admin, apre con pulsante Modifica) */}
      <ArtistEditorDrawer
        artistId={a.id}
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
      />
    </div>
  );
}
