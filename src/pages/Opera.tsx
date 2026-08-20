import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useData } from "../lib/store";
import { WorkImage, WorkCard, WorkGallery, Section, Empty, EntityLink, FavStar, StudiedCheck, RichText } from "../components/ui";
import { getOverrides, setOverride, clearOverride } from "../lib/imageOverrides";
import { useStudied, toggleStudied } from "../lib/studied";
import { useAuth } from "../lib/auth";
import { setLastOpera } from "../lib/lastVisited";
import EditorDrawer from "../components/EditorDrawer";
import {
  artistsOfWork, termsOfWork, techniquesOfWork, relatedWorks,
  connectionsOf, workYears, entityLabel, ENTITY_LABEL, KIND_LABEL,
  computeWorkGroups, workGroupMap,
} from "../lib/data";

// --- editor immagine personalizzata: URL manuale, anteprima, ripristino ----
function ImageEditor({ workId }: { workId: string }) {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const hasOverride = !!getOverrides()[workId];

  const save = async () => {
    const u = url.trim();
    if (!/^https?:\/\/.+/i.test(u)) { setErr("Inserisci un URL valido (http/https)."); return; }
    setSaving(true);
    setErr(null);
    try {
      await setOverride(workId, u);
      setOpen(false); setUrl("");
    } catch (e: any) {
      setErr(`Errore salvataggio: ${e?.message || "errore sconosciuto"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn ghost sm" onClick={() => { setOpen((o) => !o); setErr(null); }} data-testid="img-edit-toggle">
          {open ? "Chiudi" : "Cambia immagine"}
        </button>
        {hasOverride && (
          <button className="btn ghost sm" onClick={() => clearOverride(workId)} data-testid="img-edit-reset" title="Torna all'immagine originale">
            Ripristina originale
          </button>
        )}
      </div>
      {open && (
        <div className="card" style={{ position: "absolute", zIndex: 30, top: "calc(100% + 8px)", left: 0, width: "min(440px, 88vw)", padding: 14 }} data-testid="img-edit-panel">
          <div className="smallcaps" style={{ marginBottom: 8 }}>Immagine personalizzata</div>
          <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.5, margin: "0 0 10px" }}>
            Incolla l'URL di un'immagine (es. da Wikimedia Commons: tasto destro sull'immagine → "Copia indirizzo immagine").
            {isAdmin
              ? " Sei admin: la modifica sarà visibile a TUTTI gli utenti (override globale)."
              : " La modifica vale solo su questo browser e puoi sempre ripristinare l'originale."}
          </p>
          <input
            type="url" value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…" data-testid="img-edit-url"
            disabled={saving}
            style={{ width: "100%", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg)", color: "var(--ink)", fontSize: 13.5 }}
          />
          {/^https?:\/\/.+/i.test(url.trim()) && (
            <div style={{ marginTop: 10, border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden", maxHeight: 180, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
              <img src={url.trim()} alt="anteprima" style={{ maxWidth: "100%", maxHeight: 180, objectFit: "contain" }}
                onError={() => setErr("L'immagine non si carica da questo URL.")} onLoad={() => setErr(null)} />
            </div>
          )}
          {err && <div style={{ color: "#a8483f", fontSize: 12.5, marginTop: 8 }}>{err}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn gold sm" onClick={save} disabled={saving} data-testid="img-edit-save">
              {saving ? "Salvataggio…" : "Salva"}
            </button>
            <button className="btn ghost sm" onClick={() => { setOpen(false); setErr(null); }} disabled={saving}>Annulla</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Opera() {
  const { id } = useParams();
  const ix = useData();
  const nav = useNavigate();
  const studied = useStudied();
  const { user, isAdmin } = useAuth();
  const w = id ? ix.workById.get(id) : undefined;
  const [editorOpen, setEditorOpen] = useState(false);

  // Salva l'ID dell'opera come ultima visitata (per il ritorno da menu Opere).
  // Deve stare PRIMA dell'early return, altrimenti viola le regole degli hooks.
  useEffect(() => {
    if (!w) return;
    setLastOpera(w.id);
    // Notifica la sidebar di aggiornare l'etichetta "Continua" in tempo reale
    window.dispatchEvent(new CustomEvent("atlante:last-visited-changed"));
  }, [w?.id]);

  if (!w) return <div className="wrap page"><Empty msg="Opera non trovata." /></div>;

  const artists = artistsOfWork(ix, w);
  const terms = termsOfWork(ix, w);
  const techs = techniquesOfWork(ix, w);
  const period = ix.periodById.get(w.period_id);
  const related = relatedWorks(ix.ds, w);
  const conns = connectionsOf(ix.ds, "work", w.id);

  // Gruppo di appartenenza
  const groups = useMemo(() => computeWorkGroups(ix.ds), [ix.ds]);
  const byGroup = useMemo(() => workGroupMap(groups), [groups]);
  const group = byGroup.get(w.id);
  const siblings = group ? group.works.filter(sw => sw.id !== w.id) : [];

  const isStudied = studied.includes(w.id);

  return (
    <div className="wrap page">
      {/* Header: indietro (sinistra) + azione principale (destra) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, gap: 12, flexWrap: "wrap" }}>
        <button className="btn ghost sm" onClick={() => nav(-1)} data-testid="button-back">← Indietro</button>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isAdmin ? (
            <button
              onClick={() => setEditorOpen(true)}
              className="btn gold sm"
              style={{ fontSize: 13, padding: "8px 14px", whiteSpace: "nowrap" }}
              title="Modifica i metadati dell'opera nel database (solo admin)"
              data-testid="btn-admin-edit"
            >
              ✎ Modifica
            </button>
          ) : user ? (
            <Link
              to={`/suggerisci-modifica?work=${encodeURIComponent(w.id)}`}
              className="btn ghost sm"
              style={{ fontSize: 13, padding: "8px 14px", borderColor: "var(--line)", color: "var(--ink-soft)", whiteSpace: "nowrap" }}
              title="Richiedi una modifica a quest'opera (titolo, data, luogo, immagine…)"
              data-testid="btn-suggerisci-modifica"
            >
              ✎ Richiedi modifica
            </Link>
          ) : null}
        </div>
      </div>

      <div className="opera-grid">
        {/* immagine — galleria scorrevole con lightbox integrato */}
        <div>
          <WorkGallery work={w} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 10, flexWrap: "wrap" }}>
            {isAdmin && <ImageEditor workId={w.id} />}
            {w.image_source && <div className="faint" style={{ fontSize: 11, marginLeft: "auto" }}>fonte immagine: {getOverrides()[w.id] ? "personalizzata" : w.image_source}</div>}
          </div>
        </div>

        {/* testo */}
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <span className="tag">{w.type}</span>
            {w.importance === 3 && <span className="tag" style={{ color: "var(--gold-deep)", borderColor: "var(--gold-deep)" }}>✦ opera capitale</span>}
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <h1 style={{ fontSize: "clamp(28px,4.5vw,46px)", lineHeight: 1.04, letterSpacing: "-.02em", minWidth: 0 }}>{w.title}</h1>
            <div style={{ display: "flex", gap: 6, flexShrink: 0, alignSelf: "center", height: 28 }}>
              <StudiedCheck id={w.id} size={24} />
              <FavStar type="work" id={w.id} size={24} />
            </div>
          </div>
          {/* Badge approfondita */}
          {isStudied && (
            <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6, background: "color-mix(in srgb, var(--c-technique) 12%, transparent)", color: "var(--c-technique)", fontSize: 13, fontWeight: 500 }}>
              ✓ Approfondita
            </div>
          )}

          <div style={{ marginTop: 14, fontSize: 16, color: "var(--ink-soft)" }}>
            {artists.length > 0
              ? artists.map((a, i) => <span key={a.id}>{i > 0 && ", "}<EntityLink type="artist" id={a.id} label={a.name} /></span>)
              : <span className="muted">Anonimo</span>}
            {" · "}<span className="tnum">{workYears(w)}</span>
          </div>

          <p className="prose" style={{ marginTop: 22, fontSize: 17 }}><RichText text={w.summary || ""} /></p>

          <dl className="meta" style={{ marginTop: 26 }}>
            {period && <><dt>Periodo</dt><dd><EntityLink type="period" id={period.id} label={period.name} /></dd></>}
            {w.location_city && <><dt>Luogo</dt><dd>{w.location_place ? `${w.location_place}, ` : ""}<Link className="tlink" to={`/luogo/${encodeURIComponent(w.location_city)}`}>{w.location_city}</Link></dd></>}
            {techs.length > 0 && <><dt>Tecnica</dt><dd>{techs.map((t, i) => <span key={t.id}>{i > 0 && ", "}<EntityLink type="technique" id={t.id} label={t.name} /></span>)}</dd></>}
            {w.materials.length > 0 && <><dt>Materiali</dt><dd>{w.materials.join(", ")}</dd></>}
            {w.date_text && <><dt>Datazione</dt><dd>{w.date_text}</dd></>}
          </dl>

          {w.innovations.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>Innovazioni</div>
              <ul className="innov">{w.innovations.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
        </div>
      </div>

      {w.analysis && (
        <Section eyebrow="Analisi" title="Lettura dell'opera">
          <div className="prose" style={{ maxWidth: "72ch", fontSize: 17 }}>
            {w.analysis.split(/\n+/).map((p, i) => <p key={i}><RichText text={p} /></p>)}
          </div>
        </Section>
      )}

      {/* Sezione gruppo: altre opere dello stesso complesso */}
      {siblings.length > 0 && (
        <Section eyebrow="Complesso" title={`Opere di ${group!.name}`}>
          <p className="muted" style={{ fontSize: 13.5, marginTop: -8, marginBottom: 16, maxWidth: "58ch" }}>
            Quest'opera fa parte del complesso di <b>{group!.name}</b>{group!.city ? ` a ${group!.city}` : ""}. Ecco le altre opere collegate.
          </p>
          <div className="grid-works">{siblings.map((r) => <WorkCard key={r.id} work={r} />)}</div>
        </Section>
      )}

      {terms.length > 0 && (
        <Section eyebrow="Glossario" title="Termini collegati">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
            {terms.map((t) => (
              <Link to={`/glossario?t=${t.id}`} key={t.id} className="card hover" style={{ padding: "16px 18px", display: "block" }} data-testid={`term-${t.id}`}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h4 style={{ fontSize: 18 }}>{t.term}</h4>
                  {t.is_archetype && <span className="tag" style={{ color: "var(--c-term)", borderColor: "var(--c-term)" }}>archetipo</span>}
                </div>
                <p className="muted" style={{ fontSize: 13.5, marginTop: 6, lineHeight: 1.55 }}>{t.definition}</p>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {conns.length > 0 && (
        <Section eyebrow="Sinapsi" title="Connessioni">
          <div>
            {conns.map((c) => {
              const otherIsSource = !(c.source_type === "work" && c.source_id === w.id);
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
          </div>
        </Section>
      )}

      {related.length > 0 && (
        <Section eyebrow="Vicinanze" title="Opere connesse">
          <div className="grid-works">{related.map((r) => <WorkCard key={r.id} work={r} />)}</div>
        </Section>
      )}

      {/* === Banner connessioni con anteprima opera collegata ===
          Mostra un banner per ogni connessione a un'altra opera, con:
          - tipo di legame (influenza, rielaborazione, ecc.)
          - direzione: quest'opera → opera collegata (o viceversa)
          - anteprima visiva dell'opera collegata (immagine + titolo) */}
      {conns.filter(c => {
        const otherIsSource = !(c.source_type === "work" && c.source_id === w.id);
        const ot = otherIsSource ? c.source_type : c.target_type;
        return ot === "work";
      }).length > 0 && (
        <Section eyebrow="Sinapsi" title="Opere collegate">
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
            {conns.filter(c => {
              const otherIsSource = !(c.source_type === "work" && c.source_id === w.id);
              const ot = otherIsSource ? c.source_type : c.target_type;
              return ot === "work";
            }).map((c) => {
              const otherIsSource = !(c.source_type === "work" && c.source_id === w.id);
              const otherWorkId = otherIsSource ? c.source_id : c.target_id;
              const otherWork = ix.workById.get(otherWorkId);
              if (!otherWork) return null;
              // Direzione: true = quest'opera influenza l'altra; false = l'altra influenza questa
              const thisIsSource = !otherIsSource;
              return (
                <Link
                  key={c.id}
                  to={`/opera/${otherWorkId}`}
                  className="conn-banner"
                  style={{
                    display: "flex", gap: 16, padding: 16,
                    background: "var(--bg-1)", border: "1px solid var(--line)",
                    borderRadius: 12, textDecoration: "none", color: "var(--ink)",
                    transition: "border-color .2s, box-shadow .2s",
                  }}
                >
                  {/* Anteprima immagine opera collegata */}
                  <div style={{ width: 80, height: 80, borderRadius: 8, overflow: "hidden", flexShrink: 0, border: "1px solid var(--line-soft)" }}>
                    <WorkImage work={otherWork} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  {/* Info connessione */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span className="tag" style={{ color: "var(--gold-deep)", borderColor: "var(--gold)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>
                        {KIND_LABEL[c.kind] ?? c.kind}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>
                        {thisIsSource ? "questa opera →" : "← quest'opera"}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{otherWork.title}</div>
                    {c.description && (
                      <div style={{ fontSize: 13, color: "var(--ink-soft)", fontStyle: "italic", lineHeight: 1.4 }}>
                        "{c.description.slice(0, 120)}{c.description.length > 120 ? "…" : ""}"
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      {/* Editor drawer (solo admin, apre con pulsante Modifica) */}
      <EditorDrawer
        workId={w.id}
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
      />
    </div>
  );
}
