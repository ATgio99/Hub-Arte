import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useData } from "../lib/store";
import { useIsNarrow } from "../lib/motion";
import { WorkImage, WorkCard, WorkGallery, Section, Empty, EntityLink, FavStar, StudiedCheck, RichText, BarraScheda, SegnoApprofondita } from "../components/ui";
import { getGlobalOverrides, setOverride, clearOverride } from "../lib/imageOverrides";
import { useStudied, toggleStudied } from "../lib/studied";
import { useAuth } from "../lib/auth";
import { setLastOpera } from "../lib/lastVisited";
import { citazione, fontiDi } from "../lib/fonti";
import { useVerifiche, commutaVerifica } from "../lib/verifiche";
import EditorDrawer from "../components/EditorDrawer";
import {
  artistsOfWork, termsOfWork, techniquesOfWork, relatedWorks,
  connectionsOf, workYears, entityLabel, ENTITY_LABEL, KIND_LABEL,
  computeWorkGroups, workGroupMap, fonteImmagine,
} from "../lib/data";

// --- editor immagine personalizzata: URL manuale, anteprima, ripristino ----
function ImageEditor({ workId }: { workId: string }) {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const hasOverride = !!getGlobalOverrides()[workId];

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

// Le attribuzioni che restano aperte non spariscono in un campo vuoto: si
// dichiarano, con la fonte che dice perche' non si sa. Un'incertezza motivata
// e' un'informazione; un campo vuoto e' solo un'assenza.
interface Incertezza { tema: string; fonte: string; nota: string; }
let _incertezze: Record<string, Incertezza> | null = null;
function useIncertezza(workId: string): Incertezza | null {
  const [dati, setDati] = useState<Record<string, Incertezza> | null>(_incertezze);
  useEffect(() => {
    if (_incertezze) return;
    const base = (import.meta as any).env?.BASE_URL ?? "/";
    fetch(`${base}data/incertezze.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((j) => { _incertezze = j; setDati(j); })
      .catch(() => { _incertezze = {}; setDati({}); });
  }, []);
  return dati?.[workId] ?? null;
}

export default function Opera() {
  const { id } = useParams();
  const ix = useData();
  const stretto = useIsNarrow();
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
  const incertezza = useIncertezza(w.id);

  return (
    <div className="wrap page">
      <BarraScheda azioni={
        isAdmin ? (
          <>
            <SpuntaVerifica workId={w.id} email={user?.email ?? null} />
            <button
              onClick={() => setEditorOpen(true)}
              className="btn gold sm"
              style={{ fontSize: 13, padding: "8px 14px", whiteSpace: "nowrap" }}
              title="Modifica i metadati dell'opera nel database (solo admin)"
              data-testid="btn-admin-edit"
            >
              ✎ Modifica
            </button>
          </>
        ) : user ? (
          <Link
            to={`/suggerisci-modifica?work=${encodeURIComponent(w.id)}`}
            className="btn ghost sm"
            style={{ fontSize: 13, padding: "8px 14px", borderColor: "var(--line)", color: "var(--ink-soft)", whiteSpace: "nowrap" }}
            title="Richiedi una modifica a quest'opera (titolo, data, luogo, immagine…)"
            data-testid="btn-suggerisci-modifica"
          >
            ✎ {stretto ? "Modifica" : "Richiedi modifica"}
          </Link>
        ) : null
      } />

      <div className="opera-grid">
        {/* immagine — galleria scorrevole con lightbox integrato */}
        <div>
          <WorkGallery work={w} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 10, flexWrap: "wrap" }}>
            {isAdmin && <ImageEditor workId={w.id} />}
            {(() => {
              // La fonte si legge dall'indirizzo dell'immagine mostrata: non e'
              // un campo da compilare, quindi non puo' essere sbagliata o vecchia.
              const mostrata = getGlobalOverrides()[w.id]?.url || w.image_url;
              const f = fonteImmagine(mostrata);
              if (!f) return null;
              return (
                <div className="faint" style={{ fontSize: 11, marginLeft: "auto", textAlign: "right" }}>
                  immagine da{" "}
                  <a href={f.href} target="_blank" rel="noopener noreferrer"
                    className="tlink" style={{ color: "inherit" }}>{f.nome}</a>
                  {!f.affidabile && (
                    <span title="Indirizzo temporaneo di un motore di ricerca: non dichiara autore ne' licenza e puo' smettere di funzionare."
                      style={{ marginLeft: 6, color: "#a8483f" }}>· da verificare</span>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* testo */}
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <span className="tag">{w.type}</span>
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
              <SegnoApprofondita size={14} /> Approfondita
            </div>
          )}

          <div style={{ marginTop: 14, fontSize: 16, color: "var(--ink-soft)" }}>
            {artists.length > 0
              ? artists.map((a, i) => <span key={a.id}>{i > 0 && ", "}<EntityLink type="artist" id={a.id} label={a.name} /></span>)
              : <span className="muted">Anonimo</span>}
            {" · "}<span className="tnum">{workYears(w)}</span>
          </div>

          {/* Scheda tecnica prima della sintesi: chi legge vuole sapere subito
              dove si trova l'opera e con che tecnica e' fatta. La datazione non
              compare qui perche' e' gia' accanto all'autore, sopra. */}
          <dl className="meta" style={{ marginTop: 22 }}>
            {period && <><dt>Periodo</dt><dd><EntityLink type="period" id={period.id} label={period.name} /></dd></>}
            {w.location_city && <><dt>Luogo</dt><dd>{w.location_place ? `${w.location_place}, ` : ""}<Link className="tlink" to={`/luogo/${encodeURIComponent(w.location_city)}`}>{w.location_city}</Link></dd></>}
            {techs.length > 0 && <><dt>Tecnica</dt><dd>{techs.map((t, i) => <span key={t.id}>{i > 0 && ", "}<EntityLink type="technique" id={t.id} label={t.name} /></span>)}</dd></>}
            {w.materials.length > 0 && <><dt>Materiali</dt><dd>{w.materials.join(", ")}</dd></>}
            {/* Da dove viene la scheda. E' il dato che ha preso il posto di
                «opera capitale»: dice un fatto invece di dare un voto. */}
            {fontiDi(ix.ds, w).length > 0 && (
              <>
                <dt>{fontiDi(ix.ds, w).length > 1 ? "Fonti" : "Fonte"}</dt>
                <dd>{fontiDi(ix.ds, w).map((f, i) => (
                  <span key={f.id}>{i > 0 && "; "}
                    <Link className="tlink" to="/legal/crediti">{citazione(f)}</Link>
                  </span>
                ))}</dd>
              </>
            )}
          </dl>

          {incertezza && (
            <div style={{
              marginTop: 18, padding: "12px 14px", borderRadius: 10,
              border: "1px solid var(--line)", borderLeft: "3px solid var(--gold)",
              background: "var(--bg-1)", fontSize: 13.5, lineHeight: 1.55,
            }} data-testid="incertezza">
              <div className="eyebrow" style={{ marginBottom: 6, color: "var(--gold-deep)" }}>
                Attribuzione aperta · {incertezza.tema}
              </div>
              <div style={{ color: "var(--ink-soft)" }}>{incertezza.nota}</div>
              {incertezza.fonte && (
                <div className="faint" style={{ marginTop: 6, fontSize: 12 }}>Fonte consultata: {incertezza.fonte}</div>
              )}
            </div>
          )}

          <p className="prose" style={{ marginTop: 26, fontSize: 17 }}><RichText text={w.summary || ""} /></p>

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

      {/* === 1. Opere collegate (banner con anteprima + descrizione completa) === */}
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
              const thisIsSource = !otherIsSource;
              // Risolvi l'autore (o gli autori) dell'opera collegata per mostrarlo
              // accanto al titolo, come fa già la WorkCard standard.
              const otherArtists = artistsOfWork(ix, otherWork);
              const otherArtistsLabel = otherArtists.length > 0
                ? otherArtists.map(a => a.name).join(", ")
                : null;
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
                  <div style={{ width: 80, height: 80, borderRadius: 8, overflow: "hidden", flexShrink: 0, border: "1px solid var(--line-soft)" }}>
                    <WorkImage work={otherWork} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span className="tag" style={{ color: "var(--gold-deep)", borderColor: "var(--gold)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>
                        {KIND_LABEL[c.kind] ?? c.kind}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>
                        {thisIsSource ? "questa opera →" : "← quest'opera"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{otherWork.title}</span>
                      {otherArtistsLabel && (
                        <span style={{ fontSize: 13, color: "var(--ink-soft)", fontStyle: "italic" }}>
                          · {otherArtistsLabel}
                        </span>
                      )}
                    </div>
                    {c.description && (
                      <div style={{ fontSize: 13, color: "var(--ink-soft)", fontStyle: "italic", lineHeight: 1.5 }}>
                        "{c.description}"
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      {/* === 2. Termini collegati === */}
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

      {/* === 3. Opere nello stesso complesso === */}
      {siblings.length > 0 && (
        <Section eyebrow="Complesso" title={`Opere di ${group!.name}`}>
          <p className="muted" style={{ fontSize: 13.5, marginTop: -8, marginBottom: 16, maxWidth: "58ch" }}>
            Quest'opera fa parte del complesso di <b>{group!.name}</b>{group!.city ? ` a ${group!.city}` : ""}. Ecco le altre opere collegate.
          </p>
          <div className="grid-works">{siblings.map((r) => <WorkCard key={r.id} work={r} />)}</div>
        </Section>
      )}

      {/* === 4. Opere del periodo storico dell'opera ===
          Qui stanno solo le opere COEVE, cioe' quelle dello stesso periodo che
          non hanno un legame esplicito con l'opera corrente. Le opere collegate
          da una connection sono gia' mostrate sopra in "Opere collegate": se le
          ripetessimo anche qui l'utente vedrebbe due volte la stessa scheda. */}
      {related.length > 0 && (() => {
        // Recupera il tipo di relazione per ciascuna opera "related":
        // se l'opera corrente è collegata a quest'altra tramite una connection
        // di tipo opera↔opera, ne mostriamo il kind; altrimenti è solo "coeva".
        const relatedKindMap = new Map<string, { kind: string; description?: string; thisIsSource: boolean }>();
        for (const c of conns) {
          const otherIsSource = !(c.source_type === "work" && c.source_id === w.id);
          const ot = otherIsSource ? c.source_type : c.target_type;
          if (ot !== "work") continue;
          const otherWorkId = otherIsSource ? c.source_id : c.target_id;
          relatedKindMap.set(otherWorkId, {
            kind: c.kind,
            description: c.description,
            thisIsSource: !otherIsSource,
          });
        }
        // Le opere gia' mostrate come "Opere collegate" qui vengono escluse:
        // in questa sezione restano solo le coeve, senza un legame esplicito.
        const coevalRelated = related.filter(r => !relatedKindMap.has(r.id));
        if (coevalRelated.length === 0) return null;
        // Il nome del periodo sta nell'occhiello, non nel titolo: incastrarlo in
        // "opere del ..." produceva accordi sbagliati (del Rinascenza sveva).
        return (
          <Section eyebrow={period ? period.name : "Vicinanze"} title="Altre opere del periodo">
            <div className="grid-works">{coevalRelated.map((r) => <WorkCard key={r.id} work={r} />)}</div>
          </Section>
        );
      })()}

      {/* Editor drawer (solo admin, apre con pulsante Modifica) */}
      <EditorDrawer
        workId={w.id}
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
      />
    </div>
  );
}

// ============================================================================
// La spunta «verificata».
//
// Serve a una cosa sola: sapere quali schede sono state lette per intero e
// controllate. Sta accanto al tasto di modifica perche' e' li' che si guarda
// quando si sta rivedendo un'opera, e la vedono solo gli amministratori — a
// tutti gli altri non direbbe niente.
// ============================================================================
function SpuntaVerifica({ workId, email }: { workId: string; email: string | null }) {
  const { pronte, verificata, dettaglio } = useVerifiche();
  const [inCorso, setInCorso] = useState(false);
  const ok = verificata(workId);
  const v = dettaglio(workId);

  const quando = v?.verificata_il
    ? new Date(v.verificata_il).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <button
      onClick={async () => {
        setInCorso(true);
        await commutaVerifica(workId, { email });
        setInCorso(false);
      }}
      disabled={!pronte || inCorso}
      className="btn ghost sm"
      style={{
        fontSize: 13, padding: "8px 12px", whiteSpace: "nowrap",
        borderColor: ok ? "var(--c-technique)" : "var(--line)",
        color: ok ? "var(--c-technique)" : "var(--ink-soft)",
        background: ok ? "color-mix(in srgb, var(--c-technique) 10%, transparent)" : undefined,
        opacity: pronte ? 1 : 0.5,
      }}
      title={ok
        ? `Scheda verificata${quando ? ` il ${quando}` : ""}${v?.verificata_da ? ` da ${v.verificata_da}` : ""} — togli la spunta`
        : "Segna questa scheda come letta e controllata"}
      data-testid="btn-verifica"
    >
      {ok ? "✓ Verificata" : "Verifica"}
    </button>
  );
}
