import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useData } from "../lib/store";
import { useIsNarrow } from "../lib/motion";
import { WorkImage, WorkCard, WorkGallery, Section, Empty, EntityLink, FavStar, StudiedCheck, RichText, BarraScheda, SegnoApprofondita } from "../components/ui";
import { getGlobalOverrides, setOverride, clearOverride } from "../lib/imageOverrides";
import { useStudied, toggleStudied } from "../lib/studied";
import { useAuth } from "../lib/auth";
import { setLastOpera } from "../lib/lastVisited";
import { citazione, riferimento, fontiDi, ancoraFonte } from "../lib/fonti";
import type { Fonte } from "../lib/types";
import { useVerifiche, commutaVerifica } from "../lib/verifiche";
import { useTestoLeggibile, useBloccoLetto } from "../lib/lettura";
import EditorDrawer from "../components/EditorDrawer";
import {
  artistsOfWork, termsOfWork, techniquesOfWork, relatedWorks,
  connectionsOf, workYears, entityLabel, ENTITY_LABEL, KIND_LABEL,
  computeWorkGroups, workGroupMap, fonteImmagine, committentiOfWork,
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
//
// Stavano in un file statico che nessuna interfaccia sapeva modificare: ora
// sono una tabella come le altre, e arrivano col resto del catalogo.

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
  const committenti = committentiOfWork(ix, w);
  const fonti = fontiDi(ix.ds, w);
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


  // `Array.isArray` non e' pignoleria: i dati stanno in cache un'ora e il
  // codice no, quindi qui puo' arrivare la forma vecchia di quel file.
  const incertezza = useMemo(
    () => (Array.isArray(ix.ds.incertezze) ? ix.ds.incertezze.find((i) => i.id === w.id) : null) ?? null,
    [ix.ds.incertezze, w.id]);

  // Che cosa si sente quando si preme «Ascolta». L'ordine è quello di chi
  // leggerebbe la scheda a voce alta a qualcuno: che cos'è e di chi, dove sta,
  // poi la sintesi, la lettura dell'opera e le novità.
  const daLeggere = useMemo(() => {
    const b: { id: string; occhiello?: string; testo: string }[] = [];
    const dati = [
      artists.length > 0 ? `di ${artists.map((a) => a.name).join(", ")}` : "di autore ignoto",
      workYears(w),
      period ? `Periodo: ${period.name}` : "",
      committenti.length > 0 ? `Committente: ${committenti.map((a) => a.name).join(", ")}` : "",
      w.location_city ? `Si trova a ${w.location_city}${w.location_place ? `, ${w.location_place}` : ""}` : "",
      techs.length > 0 ? `Tecnica: ${techs.map((t) => t.name).join(", ")}` : "",
    ].filter(Boolean).join(". ");
    // La virgola invece del punto: letto ad alta voce, «Palazzo Te. di Giulio
    // Romano» suona come due frasi mozze.
    b.push({ id: "titolo", testo: `${w.title}, ${dati}.` });
    if (incertezza) b.push({ id: "incertezza", occhiello: `Attribuzione aperta, ${incertezza.tema}`, testo: incertezza.nota });
    if (w.summary) b.push({ id: "sintesi", occhiello: "Sintesi", testo: w.summary });
    if (w.analysis) b.push({ id: "analisi", occhiello: "Lettura dell'opera", testo: w.analysis });
    if (w.innovations.length > 0) {
      b.push({ id: "novita", occhiello: "Novità", testo: w.innovations.join(". ") });
    }
    return b;
  }, [w, artists, committenti, period, techs, incertezza]);

  useTestoLeggibile(w.title, daLeggere);
  const inLettura = useBloccoLetto();

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
          <div className="opera-titolo-riga">
            <h1 style={{ fontSize: "clamp(28px,4.5vw,46px)", lineHeight: 1.04, letterSpacing: "-.02em", minWidth: 0 }}>
              {w.title}
              <PalliniFonti fonti={fonti} />
            </h1>
            {/* Staccati dal numero della bibliografia da un filo verticale:
                su telefono il pallino della fonte finiva a contatto con la
                spunta, e sembravano tre comandi in fila. */}
            <div className="opera-titolo-segni">
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
            {/* Chi l'ha voluta. Compare sempre, anche quando non si sa: un'opera
                l'ha commissionata qualcuno, e «sconosciuto» e' un'informazione —
                lo spazio vuoto invece sembrava una dimenticanza. */}
            <dt>Committente</dt>
            <dd>{committenti.length > 0
              ? committenti.map((a, i) => <span key={a.id}>{i > 0 && ", "}<EntityLink type="artist" id={a.id} label={a.name} /></span>)
              : <span className="muted">Sconosciuto</span>}</dd>
            {w.location_city && <><dt>Luogo</dt><dd>{w.location_place ? `${w.location_place}, ` : ""}<Link className="tlink" to={`/luogo/${encodeURIComponent(w.location_city)}`}>{w.location_city}</Link></dd></>}
            {techs.length > 0 && <><dt>Tecnica</dt><dd>{techs.map((t, i) => <span key={t.id}>{i > 0 && ", "}<EntityLink type="technique" id={t.id} label={t.name} /></span>)}</dd></>}
            {w.materials.length > 0 && <><dt>Materiali</dt><dd>{w.materials.join(", ")}</dd></>}
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

          <p className={`prose ${inLettura === "sintesi" ? "in-lettura" : ""}`}
             style={{ marginTop: 26, fontSize: 17 }}><RichText text={w.summary || ""} /></p>

          {w.innovations.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>Innovazioni</div>
              <ul className={`innov ${inLettura === "novita" ? "in-lettura" : ""}`}>{w.innovations.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
        </div>
      </div>

      {w.analysis && (
        <Section eyebrow="Analisi" title="Lettura dell'opera">
          <div className={`prose ${inLettura === "analisi" ? "in-lettura" : ""}`}
               style={{ maxWidth: "72ch", fontSize: 17 }}>
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

// ============================================================================
// I pallini della bibliografia.
//
// La provenienza stava in fondo alla scheda tecnica, scritta per esteso: una
// riga di prosa che diceva da quale manuale viene la scheda. Da lontano non si
// vedeva, e con tre libri diventava un paragrafo.
//
// Un numero accanto al titolo si legge a colpo d'occhio — quante fonti ha
// questa scheda, e quali — e porta alla voce in bibliografia. E' il modo in cui
// funzionano le note nei libri, che e' esattamente il posto da cui questo
// catalogo viene.
// ============================================================================
function PalliniFonti({ fonti }: { fonti: Fonte[] }) {
  if (fonti.length === 0) return null;
  return (
    <sup style={{ marginLeft: 8, display: "inline-flex", gap: 4, verticalAlign: "super" }}>
      {fonti.map((f) => (
        <Link
          key={f.id}
          to={`/legal/crediti#${ancoraFonte(f)}`}
          title={`${citazione(f)}${f.autori ? ` — ${f.autori}` : ""} · vai alla bibliografia`}
          data-testid={`pallino-fonte-${f.numero ?? f.id}`}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 22, height: 22, borderRadius: "50%",
            border: "1px solid var(--gold)", color: "var(--gold-deep)",
            background: "color-mix(in srgb, var(--gold) 10%, transparent)",
            fontSize: 11.5, fontWeight: 600, lineHeight: 1, textDecoration: "none",
            fontFamily: "var(--font-ui, inherit)",
          }}
        >
          {f.numero ?? "?"}
        </Link>
      ))}
    </sup>
  );
}
