import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "../lib/store";
import { generateQuiz, Question, QuizKind, QUIZ_GROUPS, QUIZ_KIND_LABEL, ALL_KINDS } from "../lib/quiz";
import {
  loadErrors, addError, reviewAnswer, errorCount, clearErrors,
  loadStats, recordSession, clearStats, AnswerLog,
} from "../lib/quizStore";
import { connectionsOf, resolveEntity, KIND_LABEL } from "../lib/data";
import { WorkImage, CountUp, Reveal } from "../components/ui";
import { useFavorites } from "../lib/favorites";
import { useStudied } from "../lib/studied";
import QuizTimeSlider, { type TimeRange as QuizTimeRange } from "../components/QuizTimeSlider";
import { EASE_OUT, usePrefersReducedMotion } from "../lib/motion";
import { getLastTest, setLastTest, clearLastTest } from "../lib/lastVisited";

// selezione tipi di domanda persistente (default: NESSUN tipo selezionato)
const KINDS_LS = "atlante:quiz-kinds";
function loadKinds(): Set<QuizKind> {
  try {
    const raw = JSON.parse(localStorage.getItem(KINDS_LS) || "[]");
    if (Array.isArray(raw)) return new Set(raw.filter((k): k is QuizKind => ALL_KINDS.includes(k)));
  } catch {}
  return new Set();
}
function saveKinds(s: Set<QuizKind>) {
  try { localStorage.setItem(KINDS_LS, JSON.stringify([...s])); } catch {}
}

// Selezione periodi persistente
const PERIODS_LS = "atlante:quiz-periods";
function loadPeriodIds(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(PERIODS_LS) || "[]");
    if (Array.isArray(raw)) return new Set(raw.filter((s): s is string => typeof s === "string"));
  } catch {}
  return new Set();
}
function savePeriodIds(s: Set<string>) {
  try { localStorage.setItem(PERIODS_LS, JSON.stringify([...s])); } catch {}
}

type Phase = "setup" | "playing" | "result" | "stats";
type Mode = "normale" | "ripasso";

// ===================== DRAWER OPERA =====================
// Pannello laterale che mostra l'anteprima dell'opera senza uscire dal quiz
function OperaDrawer({ workId, open, onClose }: { workId: string | null; open: boolean; onClose: () => void }) {
  const ix = useData();
  const work = workId ? ix.workById.get(workId) : undefined;

  if (!work) return null;

  const period = work.period_id ? ix.periodById.get(work.period_id) : undefined;
  const artists = work.artist_ids.map(id => ix.artistById.get(id)).filter(Boolean);
  const techniques = work.technique_ids.map(id => ix.techById.get(id)).filter(Boolean);
  const terms = work.term_ids.map(id => ix.termById.get(id)).filter(Boolean);

  // Secolo
  const century = work.year_start || work.year_end
    ? (y: number) => y < 0 ? `${Math.ceil(-y / 100)} a.C.` : `${Math.ceil(y / 100)}° secolo`
    : null;
  const centuryText = century ? century(work.year_end ?? work.year_start!) : null;

  // Opere collegate (connessioni + same period)
  const conns = connectionsOf(ix.ds, "work", work.id);
  const relatedIds = new Set<string>();
  for (const c of conns) {
    if (c.source_type === "work" && c.source_id !== work.id) relatedIds.add(c.source_id);
    if (c.target_type === "work" && c.target_id !== work.id) relatedIds.add(c.target_id);
  }
  const relatedWorks = [...relatedIds].map(id => ix.workById.get(id)).filter(Boolean).slice(0, 6);

  // Anno formattato
  const fmtYear = (y: number) => y < 0 ? `${-y} a.C.` : `${y}`;
  const yearText = work.year_start && work.year_end
    ? `${fmtYear(work.year_start)}–${fmtYear(work.year_end)}`
    : work.year_end ? fmtYear(work.year_end)
    : work.year_start ? fmtYear(work.year_start)
    : work.date_text || null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim scuro */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, zIndex: 900,
              background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)",
            }}
          />
          {/* Pannello laterale */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 910,
              width: "min(500px, 92vw)", background: "var(--bg)",
              borderLeft: "1px solid var(--line)", overflowY: "auto",
              boxShadow: "-8px 0 30px rgba(0,0,0,0.12)",
            }}
          >
            <div style={{ padding: "20px 22px 32px" }}>
              {/* Header con chiudi */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span className="eyebrow" style={{ fontSize: 11 }}>Anteprima opera</span>
                <button onClick={onClose} style={{
                  background: "none", border: 0, cursor: "pointer", color: "var(--ink-dim)",
                  fontSize: 22, lineHeight: 1, padding: "4px 8px", borderRadius: 6,
                }} aria-label="Chiudi">✕</button>
              </div>

              {/* Immagine */}
              <div style={{
                height: 220, borderRadius: 10, overflow: "hidden",
                background: "var(--bg-2)", marginBottom: 18, display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <img src={work.image_url || work.image_thumb} alt={work.title}
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              </div>

              {/* Titolo */}
              <h2 style={{
                fontFamily: "var(--font-display)", fontSize: 22, lineHeight: 1.2,
                marginBottom: 10, color: "var(--ink)",
              }}>
                {work.title}
              </h2>

              {/* Meta info: tipo + secolo + datazione + periodo */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {work.type && <span className="tag" style={{ borderColor: "var(--gold)", color: "var(--gold-deep)" }}>{work.type}</span>}
                {centuryText && <span className="tag">{centuryText}</span>}
                {yearText && yearText !== work.date_text && <span className="tag" style={{ borderColor: "var(--line)" }}>{yearText}</span>}
                {work.date_text && <span className="tag" style={{ borderColor: "var(--line)" }}>{work.date_text}</span>}
                {period && <span className="tag" style={{ borderColor: "var(--c-period)", color: "var(--c-period)" }}>{period.name}</span>}
              </div>

              {/* Autori */}
              {artists.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div className="smallcaps" style={{ marginBottom: 6 }}>Autore{artists.length > 1 ? "i" : ""}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {artists.map(a => a && (
                      <Link key={a.id} to={`/artista/${a.id}`} className="chip" style={{ fontSize: 13 }}>
                        {a.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Luogo */}
              {(work.location_place || work.location_city) && (
                <div style={{ marginBottom: 14 }}>
                  <div className="smallcaps" style={{ marginBottom: 4 }}>Dove si trova</div>
                  <p style={{ fontSize: 13.5, margin: 0, color: "var(--ink-soft)" }}>
                    {work.location_city && <><b style={{ color: "var(--ink)" }}>{work.location_city}</b> · </>}
                    {work.location_place || "Luogo non specificato"}
                  </p>
                </div>
              )}

              {/* Descrizione / Summary */}
              {work.summary && (
                <div style={{ marginBottom: 14 }}>
                  <div className="smallcaps" style={{ marginBottom: 6 }}>Descrizione</div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.65, margin: 0, color: "var(--ink-soft)" }}>
                    {work.summary}
                  </p>
                </div>
              )}

              {/* Analisi (se presente) */}
              {work.analysis && (
                <div style={{ marginBottom: 14 }}>
                  <div className="smallcaps" style={{ marginBottom: 6 }}>Analisi</div>
                  <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: "var(--ink-dim)" }}>
                    {work.analysis}
                  </p>
                </div>
              )}

              {/* Materiali */}
              {work.materials && work.materials.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div className="smallcaps" style={{ marginBottom: 6 }}>Materiali</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {work.materials.map((m, i) => (
                      <span key={i} className="chip" style={{ fontSize: 12, background: "var(--bg-2)" }}>{m}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tecniche */}
              {techniques.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div className="smallcaps" style={{ marginBottom: 6 }}>Tecniche</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {techniques.map(t => t && (
                      <span key={t.id} className="chip" style={{ fontSize: 12 }}>{t.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Termini */}
              {terms.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div className="smallcaps" style={{ marginBottom: 6 }}>Termini chiave</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {terms.map(t => t && (
                      <span key={t.id} className="chip" style={{ fontSize: 12, background: "var(--bg-3)" }}>{t.term}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Innovazioni */}
              {work.innovations && work.innovations.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div className="smallcaps" style={{ marginBottom: 6 }}>Innovazioni</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.6 }}>
                    {work.innovations.map((inn, i) => <li key={i}>{inn}</li>)}
                  </ul>
                </div>
              )}

              {/* Connessioni / Opere collegate */}
              {conns.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div className="smallcaps" style={{ marginBottom: 6 }}>Connessioni</div>
                  {conns.slice(0, 5).map(c => {
                    const otherType = c.source_id === work.id ? c.target_type : c.source_type;
                    const otherId = c.source_id === work.id ? c.target_id : c.source_id;
                    const otherEntity = resolveEntity(ix, otherType, otherId);
                    const otherName = otherEntity ? (otherEntity as any).name || (otherEntity as any).title || (otherEntity as any).term || otherId : otherId;
                    const kindLabel = KIND_LABEL[c.kind] || c.kind;
                    return (
                      <div key={c.id} style={{ fontSize: 13, marginBottom: 4, display: "flex", alignItems: "baseline", gap: 6 }}>
                        <span style={{ color: "var(--gold-deep)", fontWeight: 500, flexShrink: 0 }}>{kindLabel}</span>
                        <span style={{ color: "var(--ink-soft)" }}>{c.description || otherName}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Opere collegate */}
              {relatedWorks.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div className="smallcaps" style={{ marginBottom: 8 }}>Opere collegate</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {relatedWorks.map(rw => rw && (
                      <div key={rw.id} style={{
                        display: "flex", gap: 10, padding: "8px 10px",
                        background: "var(--bg-1)", borderRadius: 8,
                        border: "1px solid var(--line-soft)",
                        alignItems: "center",
                      }}>
                        {rw.image_thumb && (
                          <img src={rw.image_thumb} alt="" style={{
                            width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0,
                          }} />
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {rw.title}
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--ink-dim)" }}>
                            {rw.date_text}{rw.location_city ? ` · ${rw.location_city}` : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Libro e pagina */}
              <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 16 }}>
                Libro {work.book} · Cap. {work.chapter}{work.page ? ` · Pag. ${work.page}` : ""}
              </div>

              {/* Pulsante per aprire la pagina completa */}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line-soft)" }}>
                <Link to={`/opera/${work.id}`} className="btn gold" style={{ display: "inline-flex", textDecoration: "none" }}>
                  Apri scheda completa →
                </Link>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default function Test() {
  const ix = useData();
  const reduced = usePrefersReducedMotion();

  // === Ripristino sessione di quiz salvata ===
  // Leggiamo una sola volta (lazy initializer) lo stato salvato in localStorage.
  // Se l'utente aveva un test in corso (è uscito dalla pagina senza terminarlo),
  // lo ripristiniamo esattamente dov'era rimasto: phase="playing", domande,
  // indice, risposta scelta, risposte date, modalità, errori di ripasso rimossi.
  const [restoredTest] = useState(() => getLastTest());
  const [phase, setPhase] = useState<Phase>(() => restoredTest && restoredTest.questions.length > 0 ? "playing" : "setup");
  const [mode, setMode] = useState<Mode>(() => restoredTest ? restoredTest.mode : "normale");
  const [questions, setQuestions] = useState<Question[]>(() => restoredTest ? restoredTest.questions : []);
  const [idx, setIdx] = useState<number>(() => restoredTest ? Math.min(restoredTest.idx, restoredTest.questions.length - 1) : 0);
  const [picked, setPicked] = useState<number | null>(() => restoredTest ? restoredTest.picked : null);
  const [answers, setAnswers] = useState<{ q: Question; chosen: number; ok: boolean }[]>(() => restoredTest ? restoredTest.answers : []);
  const [reviewRemoved, setReviewRemoved] = useState<string[]>(() => restoredTest ? restoredTest.reviewRemoved : []);

  const [kinds, setKinds] = useState<Set<QuizKind>>(() => loadKinds());
  const [periodIds, setPeriodIds] = useState<Set<string>>(() => loadPeriodIds());
  const [book, setBook] = useState("");
  const [count, setCount] = useState(20);
  const [favOnly, setFavOnly] = useState(false);
  const [studiedOnly, setStudiedOnly] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const favs = useFavorites();
  const studied = useStudied();
  const nFavs = favs.works.length + favs.artists.length;
  const nStudied = studied.length;

  // Intervallo storico LOCALE del quiz (NON usa useTimeRange globale perché
  // non deve influenzare le altre viste). Attivo solo quando l'utente attiva
  // "Solo preferiti" o "Solo approfondite": in quel caso lo slider sostituisce
  // la selezione chip dei periodi.
  const [quizRange, setQuizRange] = useState<QuizTimeRange | null>(null);
  const quizBounds = useMemo<QuizTimeRange>(() => {
    let lo = Infinity, hi = -Infinity;
    for (const p of ix.ds.periods) { lo = Math.min(lo, p.year_start); hi = Math.max(hi, p.year_end); }
    for (const w of ix.ds.works) {
      const ys = w.year_start ?? w.year_end, ye = w.year_end ?? w.year_start;
      if (ys != null) lo = Math.min(lo, ys);
      if (ye != null) hi = Math.max(hi, ye);
    }
    if (!isFinite(lo)) { lo = 280; hi = 1600; }
    return { min: Math.floor(lo / 10) * 10, max: Math.ceil(hi / 10) * 10 };
  }, [ix]);

  // Modalità "solo preferiti/approfondite": lo slider sostituisce le chip periodi
  const filteredMode = favOnly || studiedOnly;
  // yearRange attivo solo se sono in modalità filtrata E l'utente ha modificato lo slider
  const activeYearRange = (filteredMode && quizRange &&
    (quizRange.min > quizBounds.min || quizRange.max < quizBounds.max)) ? quizRange : undefined;

  const [errN, setErrN] = useState(0);

  // Drawer opera
  const [drawerWorkId, setDrawerWorkId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = (workId: string) => {
    setDrawerWorkId(workId);
    setDrawerOpen(true);
  };
  const closeDrawer = () => {
    setDrawerOpen(false);
    // Piccolo ritardo per l'animazione di uscita
    setTimeout(() => setDrawerWorkId(null), 300);
  };

  useEffect(() => { setErrN(errorCount()); }, [phase]);

  // === Persistenza della sessione di quiz (memory) ===
  // Salviamo in localStorage lo stato del quiz ogni volta che cambia (solo
  // se siamo in fase "playing"). Così l'utente può uscire dalla pagina Test
  // (per andare su Opere, Autori, ecc.) e tornare successivamente: ritroverà
  // il test esattamente dov'era rimasto. La sessione viene cancellata:
  //  - quando si conclude il test (finish)
  //  - quando l'utente preme "Esci" in alto a destra (abbandono esplicito)
  //  - quando si clicca due volte "Test" nella sidebar (reset)
  useEffect(() => {
    if (phase === "playing" && questions.length > 0) {
      setLastTest({
        questions,
        idx,
        picked,
        answers,
        mode,
        reviewRemoved,
        savedAt: Date.now(),
      });
    } else if (phase !== "playing") {
      // Se non siamo in playing, assicuriamoci che non ci sia una sessione
      // salvata "vecchia": l'utente è tornato al setup/risultato/statistiche.
      clearLastTest();
    }
  }, [phase, questions, idx, picked, answers, mode, reviewRemoved]);

  // === Listen per evento di reset esterno ===
  // La sidebar emette "atlante:test-reset" quando l'utente clicca due volte
  // "Test" nel menu (e siamo già sulla pagina Test). In quel caso abbandoniamo
  // la sessione corrente e torniamo al setup.
  useEffect(() => {
    const onReset = () => {
      clearLastTest();
      setQuestions([]);
      setIdx(0);
      setPicked(null);
      setAnswers([]);
      setReviewRemoved([]);
      setMode("normale");
      setPhase("setup");
      setNotice(null);
      // Notifica la sidebar che la sessione è stata cancellata
      window.dispatchEvent(new CustomEvent("atlante:last-visited-changed"));
    };
    window.addEventListener("atlante:test-reset", onReset);
    return () => window.removeEventListener("atlante:test-reset", onReset);
  }, []);

  const periods = useMemo(() => [...ix.ds.periods].sort((a, b) => a.year_start - b.year_start), [ix]);

  const start = () => {
    if (kinds.size === 0) { setNotice("Seleziona almeno un tipo di domanda per iniziare."); return; }
    // In modalità filtrata (favOnly/studiedOnly) ignoro i periodIds e uso yearRange
    // In modalità normale uso i periodIds classici
    const pids = filteredMode ? undefined : (periodIds.size > 0 ? [...periodIds] : undefined);
    const qs = generateQuiz(ix, {
      kinds: [...kinds],
      periodIds: pids,
      yearRange: filteredMode ? activeYearRange : undefined,
      book: book ? Number(book) : undefined,
      count,
      seed: Date.now() % 1e9,
      favorites: favOnly ? { works: new Set(favs.works), artists: new Set(favs.artists) } : undefined,
      studiedWorks: studiedOnly ? new Set(studied) : undefined,
    });
    if (qs.length === 0) {
      const reason = favOnly
        ? "Nessuna domanda generabile: in modalità «solo preferiti» valgono solo i tipi legati a opere e artisti. Selezionane almeno uno (es. Autore, Riconosci l'opera)."
        : studiedOnly
        ? "Nessuna domanda generabile: in modalità «solo approfondite» valgono solo i tipi legati a opere. Selezionane almeno uno (es. Autore, Riconosci l'opera)."
        : activeYearRange
        ? `Nessuna domanda generabile nell'intervallo ${activeYearRange.min}–${activeYearRange.max}: allarga l'intervallo o i tipi di domanda.`
        : "Nessuna domanda generabile con questi filtri: allarga i tipi di domanda o il periodo.";
      setNotice(reason);
      return;
    }
    setNotice(qs.length < count ? `Con questi filtri è stato possibile generare ${qs.length} domande (ne avevi chieste ${count}).` : null);
    setMode("normale"); setQuestions(qs); setIdx(0); setPicked(null); setAnswers([]); setReviewRemoved([]); setPhase("playing");
  };

  const startReview = () => {
    const errs = loadErrors();
    if (errs.length === 0) return;
    const refIds = errs.map((e) => ({ kind: e.kind, refId: e.refId }));
    const qs = generateQuiz(ix, { kinds: [], count: refIds.length, refIds, seed: Date.now() % 1e9 });
    if (qs.length === 0) return;
    setMode("ripasso"); setQuestions(qs); setIdx(0); setPicked(null); setAnswers([]); setReviewRemoved([]); setPhase("playing");
  };

  const q = questions[idx];

  // immagine risolta in TEMPO REALE dall'indice
  const liveWork = q?.refHref?.startsWith("/opera/") ? ix.workById.get(q.refHref.slice("/opera/".length)) : undefined;
  const liveImage = q?.image ? (liveWork?.image_thumb || liveWork?.image_url || q.image) : undefined;

  const answer = (i: number) => {
    if (picked != null) return;
    setPicked(i);
    const ok = i === q.correct;
    setAnswers((a) => [...a, { q, chosen: i, ok }]);
    if (mode === "normale") {
      if (!ok) addError(q.kind, q.refId, q.prompt);
    } else {
      const r = reviewAnswer(q.kind, q.refId, ok);
      if (r.removed) setReviewRemoved((prev) => [...prev, q.refId]);
    }
  };

  const next = () => {
    if (idx + 1 >= questions.length) finish();
    else { setIdx(idx + 1); setPicked(null); }
  };

  const finish = () => {
    const logs: AnswerLog[] = answers.map((a) => ({ kind: a.q.kind, refId: a.q.refId, ok: a.ok, periodId: a.q.topicPeriodId, prompt: a.q.prompt }));
    recordSession(logs, mode, [...kinds]);
    setErrN(errorCount());
    setPhase("result");
  };

  const score = answers.filter((a) => a.ok).length;

  const toggleKind = (k: QuizKind) => {
    const n = new Set(kinds); n.has(k) ? n.delete(k) : n.add(k);
    setKinds(n); saveKinds(n); setNotice(null);
  };
  const toggleGroup = (group: QuizKind[]) => {
    const allOn = group.every((k) => kinds.has(k));
    const n = new Set(kinds);
    if (allOn) group.forEach((k) => n.delete(k));
    else group.forEach((k) => n.add(k));
    setKinds(n); saveKinds(n); setNotice(null);
  };
  const selectAll = () => { const n = new Set(ALL_KINDS); setKinds(n); saveKinds(n); setNotice(null); };
  const clearAll = () => { const n = new Set<QuizKind>(); setKinds(n); saveKinds(n); setNotice(null); };

  const togglePeriod = (pid: string) => {
    const n = new Set(periodIds);
    n.has(pid) ? n.delete(pid) : n.add(pid);
    setPeriodIds(n); savePeriodIds(n); setNotice(null);
  };

  const periodGroups = useMemo(() => {
    const roots = periods.filter(p => !p.parent_id);
    const children = new Map<string, typeof periods>();
    for (const p of periods) {
      if (p.parent_id) {
        if (!children.has(p.parent_id)) children.set(p.parent_id, []);
        children.get(p.parent_id)!.push(p);
      }
    }
    return roots.map(r => ({ root: r, children: children.get(r.id) ?? [] }));
  }, [periods]);

  // ===================== SETUP =====================
  if (phase === "setup") {
    return (
      <div className="wrap page">
        <div className="page-head">
          <div className="page-eyebrow"><span className="eyebrow">Domande generate dal dataset</span></div>
          <h1 className="page-title">Test</h1>
          <p className="page-lead">Quiz a risposta chiusa costruiti in tempo reale dall'archivio — {ALL_KINDS.length} tipi di domanda, distrattori scelti tra entità affini, banca degli errori e statistiche persistenti.</p>
        </div>

        <div className="quiz-setup">
          <div className="quiz-actions">
            <button className="btn gold" onClick={start} disabled={kinds.size === 0} data-testid="quiz-start"
              title={kinds.size === 0 ? "Seleziona almeno un tipo di domanda" : ""}>Inizia il quiz →</button>
            <button className="btn" onClick={startReview} disabled={errN === 0} data-testid="quiz-review"
              title={errN === 0 ? "Nessun errore da ripassare" : ""}>
              Ripassa errori {errN > 0 && <span className="pill">{errN}</span>}
            </button>
            <button className="btn ghost" onClick={() => setPhase("stats")} data-testid="quiz-stats-link">Le mie statistiche →</button>
          </div>
          {notice && <div className="quiz-notice" data-testid="quiz-notice">{notice}</div>}
          {kinds.size === 0 && !notice && (
            <div className="quiz-notice soft" data-testid="quiz-hint">Nessun filtro attivo: seleziona qui sotto i tipi di domanda che vuoi (o «seleziona tutto»).</div>
          )}

          <div>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Quante domande</div>
            <div className="seg" data-testid="quiz-count-seg">
              {[10, 20, 40].map((n) => (
                <button key={n} className={`seg-btn ${count === n ? "on" : ""}`} onClick={() => setCount(n)} data-testid={`quiz-count-${n}`}>{n}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12, flexWrap: "wrap" }}>
              <div className="eyebrow">Tipi di domanda · {kinds.size} di {ALL_KINDS.length}</div>
              <button className="quiz-grouptoggle" onClick={selectAll} data-testid="kinds-all">seleziona tutto</button>
              <button className="quiz-grouptoggle" onClick={clearAll} disabled={kinds.size === 0} data-testid="kinds-none">azzera</button>
            </div>
            {QUIZ_GROUPS.map((g) => {
              const allOn = g.kinds.every((k) => kinds.has(k));
              return (
                <div key={g.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span className="smallcaps">{g.label}</span>
                    <button className="quiz-grouptoggle" onClick={() => toggleGroup(g.kinds)} data-testid={`group-${g.label}`}>
                      {allOn ? "deseleziona" : "seleziona tutti"}
                    </button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {g.kinds.map((k) => (
                      <span key={k} className={`chip ${kinds.has(k) ? "active" : ""}`} onClick={() => toggleKind(k)} data-testid={`kind-${k}`}>{QUIZ_KIND_LABEL[k]}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selezione periodi — visibile SOLO se NON in modalità filtrata.
              In modalità filtrata (Solo preferiti / Solo approfondite) viene
              sostituito dallo slider a trascinamento qui sotto. */}
          {!filteredMode ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12, flexWrap: "wrap" }}>
                <div className="eyebrow">Periodi · {periodIds.size} selezionati</div>
                <button className="quiz-grouptoggle" onClick={() => { const n = new Set(periods.map(p => p.id)); setPeriodIds(n); savePeriodIds(n); setNotice(null); }} data-testid="periods-all">seleziona tutto</button>
                <button className="quiz-grouptoggle" onClick={() => { const n = new Set<string>(); setPeriodIds(n); savePeriodIds(n); setNotice(null); }} disabled={periodIds.size === 0} data-testid="periods-none">azzera</button>
                {periodIds.size > 0 && <span className="faint" style={{ fontSize: 12 }}>Puoi selezionare più periodi insieme</span>}
              </div>
              <div style={{ maxHeight: 340, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px" }}>
                {periodGroups.map(({ root, children }) => {
                  const rootSelected = periodIds.has(root.id);
                  const allChildrenSelected = children.length > 0 && children.every(c => periodIds.has(c.id));
                  const someChildrenSelected = children.some(c => periodIds.has(c.id));
                  return (
                    <div key={root.id} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                        <span
                          className={`chip ${rootSelected || allChildrenSelected ? "active" : ""} ${someChildrenSelected && !allChildrenSelected ? "partial" : ""}`}
                          onClick={() => {
                            const n = new Set(periodIds);
                            const shouldSelect = !(rootSelected || allChildrenSelected);
                            if (shouldSelect) { n.add(root.id); children.forEach(c => n.add(c.id)); }
                            else { n.delete(root.id); children.forEach(c => n.delete(c.id)); }
                            setPeriodIds(n); savePeriodIds(n); setNotice(null);
                          }}
                          style={{ fontWeight: 600, fontSize: 13 }}
                          data-testid={`period-${root.id}`}
                        >
                          {root.name} <span className="tnum" style={{ fontWeight: 400, fontSize: 11 }}>({root.year_start}–{root.year_end})</span>
                        </span>
                      </div>
                      {children.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 8, marginTop: 2 }}>
                          {children.map(c => (
                            <span
                              key={c.id}
                              className={`chip ${periodIds.has(c.id) ? "active" : ""}`}
                              onClick={() => togglePeriod(c.id)}
                              style={{ fontSize: 12, padding: "3px 9px" }}
                              data-testid={`period-${c.id}`}
                            >
                              {c.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Slider a trascinamento — sostituisce le chip periodi quando
               l'utente attiva "Solo preferiti" o "Solo approfondite". Permette
               di restringere l'intervallo storico del quiz (es. solo Quattrocento). */
            <div>
              <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div className="eyebrow">
                  Intervallo storico
                  {favOnly && <span style={{ marginLeft: 6, color: "var(--gold-deep)" }}>· solo preferiti</span>}
                  {studiedOnly && <span style={{ marginLeft: 6, color: "var(--c-technique)" }}>· solo approfondite</span>}
                </div>
                <span className="faint" style={{ fontSize: 12 }}>
                  Trascina le maniglie per restringere il quiz a un intervallo temporale
                </span>
              </div>
              <QuizTimeSlider
                range={quizRange ?? quizBounds}
                bounds={quizBounds}
                onRangeChange={(r) => { setQuizRange(r); setNotice(null); }}
                onReset={() => { setQuizRange(quizBounds); setNotice(null); }}
              />
            </div>
          )}

          <div className="quiz-setup-row">
            <div className="quiz-field">
              <span className="filter-label">Preferiti</span>
              <button
                className={`chip fav-chip ${favOnly ? "active" : ""}`}
                onClick={() => {
                  if (nFavs > 0) {
                    setFavOnly((v) => !v);
                    // Se spengo favOnly e studiedOnly è già off, resetto anche lo slider
                    if (favOnly && !studiedOnly) setQuizRange(null);
                    setNotice(null);
                  }
                }}
                disabled={nFavs === 0}
                title={nFavs === 0 ? "Aggiungi prima qualche stella a opere o artisti" : ""}
                data-testid="quiz-fav-only"
              >
                ★ Solo preferiti{nFavs > 0 ? ` (${favs.works.length} opere · ${favs.artists.length} artisti)` : ""}
              </button>
              {nFavs === 0 && <span className="faint" style={{ fontSize: 11.5, marginTop: 4 }}>Metti una ★ su opere o artisti per usare questo filtro.</span>}
              {favOnly && <span className="faint" style={{ fontSize: 11.5, marginTop: 4 }}>Valgono i tipi di domanda legati a opere e artisti.</span>}
            </div>
            <div className="quiz-field">
              <span className="filter-label">Approfondite</span>
              <button
                className={`chip fav-chip ${studiedOnly ? "active" : ""}`}
                style={studiedOnly ? { background: "var(--c-technique)", borderColor: "var(--c-technique)", color: "#fff" } : {}}
                onClick={() => {
                  if (nStudied > 0) {
                    setStudiedOnly((v) => !v);
                    if (studiedOnly && !favOnly) setQuizRange(null);
                    setNotice(null);
                  }
                }}
                disabled={nStudied === 0}
                title={nStudied === 0 ? "Spunta ✓ alcune opere come approfondite per usare questo filtro" : ""}
                data-testid="quiz-studied-only"
              >
                ✓ Solo approfondite{nStudied > 0 ? ` (${nStudied} opere)` : ""}
              </button>
              {nStudied === 0 && <span className="faint" style={{ fontSize: 11.5, marginTop: 4 }}>Spunta ✓ su una opera per approfondirla.</span>}
              {studiedOnly && <span className="faint" style={{ fontSize: 11.5, marginTop: 4 }}>Valgono i tipi di domanda legati a opere.</span>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===================== STATS =====================
  if (phase === "stats") {
    return <StatsView onBack={() => setPhase("setup")} drawerWorkId={drawerWorkId} drawerOpen={drawerOpen} closeDrawer={closeDrawer} openDrawer={openDrawer} />;
  }

  // ===================== RESULT =====================
  if (phase === "result") {
    const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;
    return (
      <div className="wrap page">
        <div className="result-hero">
          <div className="eyebrow">{mode === "ripasso" ? "Ripasso completato" : "Risultato"}</div>
          <div className="result-score" data-testid="result-score">
            <CountUp value={score} /><span className="muted" style={{ fontSize: 38 }}>/{questions.length}</span>
          </div>
          <div className="result-pct" style={{ color: pct >= 70 ? "var(--c-technique)" : pct >= 40 ? "var(--gold)" : "var(--c-event)" }}>
            <CountUp value={pct} suffix="%" />
          </div>
          <p className="muted" style={{ marginTop: 8 }}>
            {pct >= 80 ? "Eccellente padronanza." : pct >= 60 ? "Buona preparazione, rivedi gli errori." : "Conviene ripassare."}
          </p>
          {mode === "ripasso" && reviewRemoved.length > 0 && (
            <p className="muted" style={{ marginTop: 6, color: "var(--c-technique)" }} data-testid="review-removed">
              {reviewRemoved.length} {reviewRemoved.length === 1 ? "domanda azzeccata 2 volte: uscita" : "domande azzeccate 2 volte: uscite"} dalla banca errori.
            </p>
          )}
          <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap", justifyContent: "center" }}>
            {errN > 0 && <button className="btn gold" onClick={startReview} data-testid="quiz-retry-wrong">Ripassa i {errN} errori →</button>}
            <button className="btn" onClick={() => setPhase("setup")} data-testid="quiz-restart">Nuovo quiz</button>
            <button className="btn ghost" onClick={() => setPhase("stats")} data-testid="quiz-go-stats">Statistiche →</button>
          </div>
        </div>

        <div style={{ marginTop: 44 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>Revisione di ogni domanda</div>
          {answers.map((a, i) => {
            // Estrai workId dalla refHref
            const refWorkId = a.q.refHref?.startsWith("/opera/") ? a.q.refHref.slice("/opera/".length) : null;
            const refWork = refWorkId ? ix.workById.get(refWorkId) : undefined;
            return (
              <div key={i} className="review-row" style={{ borderLeftColor: a.ok ? "var(--c-technique)" : "var(--c-event)" }} data-testid={`review-${i}`}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span className="tag" style={{ borderColor: "var(--line)" }}>{QUIZ_KIND_LABEL[a.q.kind]}</span>
                    {!a.ok && <span style={{ color: "var(--c-event)", fontSize: 13, fontWeight: 600 }}>✗ Sbagliata</span>}
                    {a.ok && <span style={{ color: "var(--c-technique)", fontSize: 13, fontWeight: 600 }}>✓ Corretta</span>}
                  </div>
                  <div style={{ fontSize: 15, marginTop: 8 }}>{a.q.prompt}</div>
                  <div style={{ fontSize: 13.5, marginTop: 6 }}>
                    {a.ok
                      ? <span style={{ color: "var(--c-technique)" }}>✓ {a.q.options[a.q.correct]}</span>
                      : <><span style={{ color: "var(--c-event)" }}>✗ La tua risposta: {a.q.options[a.chosen]}</span><br /><span className="muted">Corretta: <span style={{ color: "var(--c-technique)" }}>{a.q.options[a.q.correct]}</span></span></>}
                  </div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                    {a.q.explain}
                    {refWork && (
                      <> — <button onClick={() => openDrawer(refWork.id)} style={{
                        background: "none", border: 0, padding: 0, cursor: "pointer",
                        color: "var(--gold)", fontSize: 13, textDecoration: "underline",
                        fontWeight: 500,
                      }}>{refWork.title}</button></>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Drawer opera */}
        <OperaDrawer workId={drawerWorkId} open={drawerOpen} onClose={closeDrawer} />
      </div>
    );
  }

  // ===================== PLAYING =====================
  const currentRefWorkId = q?.refHref?.startsWith("/opera/") ? q.refHref.slice("/opera/".length) : null;
  const currentRefWork = currentRefWorkId ? ix.workById.get(currentRefWorkId) : undefined;

  return (
    <div className="wrap page">
      <div className="quiz-top">
        <div className="quiz-progress">
          <motion.div className="quiz-progress-fill" animate={{ width: `${(idx / questions.length) * 100}%` }} transition={{ duration: reduced ? 0 : 0.4, ease: EASE_OUT }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
          <span className="muted" style={{ fontSize: 13 }}>Domanda {idx + 1} di {questions.length}{mode === "ripasso" ? " · ripasso" : ""}</span>
          <span className="muted" style={{ fontSize: 13 }}>Punti: {score}</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div className="quiz-card" key={q.id}
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? false : { opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
        >
          {liveImage && (
            <div className="quiz-img">
              <img src={liveImage} alt="" />
            </div>
          )}
          <div className="quiz-kind">{QUIZ_KIND_LABEL[q.kind]}</div>
          <div className="quiz-prompt">{q.prompt}</div>
          <div className="quiz-opts">
            {q.options.map((opt, i) => {
              let cls = "quiz-opt";
              if (picked != null) {
                if (i === q.correct) cls += " correct";
                else if (i === picked && i !== q.correct) cls += " wrong";
                else cls += " dim";
              }
              return (
                <motion.button key={i} className={cls} onClick={() => answer(i)}
                  disabled={picked != null}
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: reduced ? 0 : i * 0.04 }}
                  data-testid={`opt-${i}`}
                >
                  <span className="quiz-opt-letter">{String.fromCharCode(65 + i)}</span>
                  {opt}
                </motion.button>
              );
            })}
          </div>
          {picked != null && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{ marginTop: 20 }}
            >
              {/* Feedback corretto/sbagliato */}
              <div className={`quiz-explain-card ${picked === q.correct ? "ok" : "ko"}`}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  {picked === q.correct ? (
                    <>
                      <span style={{ fontSize: 20 }}>✓</span>
                      <span style={{ fontWeight: 600, fontSize: 15, color: "var(--c-technique)" }}>Risposta corretta!</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 20 }}>✗</span>
                      <span style={{ fontWeight: 600, fontSize: 15, color: "var(--c-event)" }}>Risposta sbagliata</span>
                    </>
                  )}
                </div>
                <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
                  {q.explain}
                  {currentRefWork && (
                    <> — <button onClick={() => openDrawer(currentRefWork.id)} style={{
                      background: "none", border: 0, padding: 0, cursor: "pointer",
                      color: "var(--gold)", fontSize: 13.5, textDecoration: "underline",
                      fontWeight: 500,
                    }}>{currentRefWork.title}</button></>
                  )}
                </div>
                {picked !== q.correct && (
                  <div style={{ marginTop: 8, fontSize: 13.5 }}>
                    <span className="muted">La risposta corretta è: </span>
                    <span style={{ color: "var(--c-technique)", fontWeight: 600 }}>{q.options[q.correct]}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 30 }}>
        {picked != null && (
          <button className="btn gold" onClick={next} data-testid="quiz-next">
            {idx + 1 >= questions.length ? "Fine" : "Avanti →"}
          </button>
        )}
        <button className="btn ghost" onClick={finish} data-testid="quiz-abort">Esci</button>
      </div>

      {/* Drawer opera laterale */}
      <OperaDrawer workId={drawerWorkId} open={drawerOpen} onClose={closeDrawer} />
    </div>
  );
}

// ===================== STATS VIEW =====================
function StatsView({ onBack, drawerWorkId, drawerOpen, closeDrawer, openDrawer }: {
  onBack: () => void;
  drawerWorkId: string | null;
  drawerOpen: boolean;
  closeDrawer: () => void;
  openDrawer: (workId: string) => void;
}) {
  const stats = loadStats();
  const ix = useData();
  const reduced = usePrefersReducedMotion();

  const totalQ = stats.totalAnswered;
  const totalOk = stats.totalCorrect;
  const totalWrong = totalQ - totalOk;
  const pct = totalQ > 0 ? Math.round((totalOk / totalQ) * 100) : 0;
  const totalSessions = stats.sessions.length;
  const avgPct = totalSessions > 0 ? Math.round(stats.sessions.reduce((a, s) => a + s.pct, 0) / totalSessions) : 0;
  const bestSession = totalSessions > 0 ? Math.max(...stats.sessions.map(s => s.pct)) : 0;

  // rate per tipo
  const kindRate = useMemo(() => {
    return Object.entries(stats.byKind).map(([kind, s]) => ({
      kind,
      label: QUIZ_KIND_LABEL[kind as QuizKind] ?? kind,
      pct: s.asked > 0 ? Math.round((s.correct / s.asked) * 100) : 0,
      correct: s.correct,
      wrong: s.asked - s.correct,
      total: s.asked,
    })).sort((a, b) => a.pct - b.pct);
  }, [stats]);

  // rate per periodo
  const periodRate = useMemo(() => {
    return Object.entries(stats.byPeriod).map(([pid, s]) => ({
      pid,
      name: ix.periodById.get(pid)?.name ?? pid,
      pct: s.asked > 0 ? Math.round((s.correct / s.asked) * 100) : 0,
      correct: s.correct,
      wrong: s.asked - s.correct,
      total: s.asked,
    })).sort((a, b) => a.pct - b.pct);
  }, [stats, ix]);

  // sparkline ultimi 20 quiz
  const spark = stats.sessions.slice(-20);

  // top errori
  const topErrors = useMemo(() => {
    return Object.entries(stats.errorFreq).map(([key, n]) => {
      const [kind, refId] = key.split(":");
      return { kind: kind as QuizKind, refId, n, label: QUIZ_KIND_LABEL[kind as QuizKind] ?? kind };
    }).sort((a, b) => b.n - a.n).slice(0, 10);
  }, [stats]);

  // Andamento tendenza (ultime 5 vs precedenti 5)
  const trend = useMemo(() => {
    if (spark.length < 4) return null;
    const recent = spark.slice(-5);
    const older = spark.slice(-10, -5);
    const avgRecent = recent.reduce((a, s) => a + s.pct, 0) / recent.length;
    const avgOlder = older.length > 0 ? older.reduce((a, s) => a + s.pct, 0) / older.length : avgRecent;
    return Math.round(avgRecent - avgOlder);
  }, [spark]);

  const colorForPct = (p: number) => p >= 70 ? "#3f8a4f" : p >= 40 ? "var(--gold)" : "#a8483f";

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700, color: "var(--ink-dim)",
    textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4,
  };

  return (
    <div className="wrap page">
      <button className="btn ghost sm" onClick={onBack} style={{ marginBottom: 22 }}>← Torna al quiz</button>
      <div className="page-head">
        <div className="page-eyebrow"><span className="eyebrow">Analisi dettagliata</span></div>
        <h1 className="page-title">Statistiche test</h1>
        <p className="page-lead">Analisi approfondita delle tue prestazioni: andamento nel tempo, punti di forza e debolezza per tipo di domanda e periodo storico, errori ricorrenti.</p>
      </div>
      <div className="page-rule" />

      {/* KPI principali — stile Dashboard */}
      <div className="kpi-grid" style={{ marginBottom: 32 }}>
        <div className="stat">
          <div className="stat-num tnum"><CountUp value={totalSessions} /></div>
          <div className="stat-lab">Sessioni</div>
        </div>
        <div className="stat">
          <div className="stat-num tnum"><CountUp value={totalQ} /></div>
          <div className="stat-lab">Domande totali</div>
        </div>
        <div className="stat">
          <div className="stat-num tnum" style={{ color: colorForPct(pct) }}>
            <CountUp value={pct} suffix="%" />
          </div>
          <div className="stat-lab">% corretto globale</div>
        </div>
        <div className="stat">
          <div className="stat-num tnum" style={{ color: "#3f8a4f" }}>
            <CountUp value={totalOk} />
          </div>
          <div className="stat-lab">Corrette</div>
        </div>
        <div className="stat">
          <div className="stat-num tnum" style={{ color: "#a8483f" }}>
            <CountUp value={totalWrong} />
          </div>
          <div className="stat-lab">Errate</div>
        </div>
        <div className="stat">
          <div className="stat-num tnum" style={{ color: "var(--gold-deep)" }}>
            <CountUp value={stats.bestStreak} />
          </div>
          <div className="stat-lab">Miglior streak</div>
        </div>
      </div>

      {/* Barra progresso globale */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-dim)" }}>Progresso complessivo</span>
          <span className="tnum" style={{ fontSize: 13, color: colorForPct(pct), fontWeight: 700 }}>{pct}%</span>
        </div>
        <div style={{ height: 10, background: "var(--bg-2)", borderRadius: 5, overflow: "hidden" }}>
          <motion.div
            initial={reduced ? false : { width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: EASE_OUT }}
            style={{ height: "100%", borderRadius: 5, background: colorForPct(pct) }}
          />
        </div>
        {trend !== null && (
          <div style={{ marginTop: 8, fontSize: 12, color: trend > 0 ? "#3f8a4f" : trend < 0 ? "#a8483f" : "var(--ink-dim)" }}>
            {trend > 0 ? `↗ Tendenza in miglioramento (+${trend}% negli ultimi test)` : trend < 0 ? `↘ Tendenza in calo (${trend}% negli ultimi test)` : "→ Tendenza stabile"}
          </div>
        )}
      </div>

      {/* Andamento sessioni — grafico a barre migliorato */}
      {spark.length > 0 && (
        <div style={{ marginBottom: 36, padding: 20, background: "var(--bg-2)", borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Andamento</div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, marginTop: 2 }}>Ultime {spark.length} sessioni</h3>
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
              <span>Media: <b className="tnum" style={{ color: colorForPct(avgPct) }}>{avgPct}%</b></span>
              <span>Migliore: <b className="tnum" style={{ color: "#3f8a4f" }}>{bestSession}%</b></span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120, padding: "8px 0", borderBottom: "2px solid var(--line)" }}>
            {spark.map((s, i) => {
              const h = Math.max(6, (s.pct / 100) * 100);
              const color = colorForPct(s.pct);
              return (
                <div key={i} style={{ flex: 1, minWidth: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
                  title={`Sessione ${i + 1}: ${s.score}/${s.total} (${s.pct}%) - ${s.mode}`}>
                  <div style={{ fontSize: 9, color: "var(--ink-dim)", fontWeight: 600 }}>{s.pct}%</div>
                  <div style={{ width: "100%", maxWidth: 32, height: h, background: color, borderRadius: "4px 4px 0 0", opacity: 0.85 }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: "var(--ink-dim)" }}>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#3f8a4f", borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} />≥70%</span>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: "var(--gold)", borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} />40-69%</span>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#a8483f", borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} />&lt;40%</span>
          </div>
        </div>
      )}

      {/* Performance per tipo di domanda — barre orizzontali con dettagli */}
      {kindRate.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Punti di forza e debolezza</div>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 16 }}>Performance per tipo di domanda</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {kindRate.map(k => (
              <div key={k.kind} style={{ padding: "12px 16px", background: "var(--bg-2)", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, textTransform: "capitalize" }}>{k.label}</span>
                  <span className="tnum" style={{ fontSize: 13, color: "var(--ink-dim)" }}>
                    <b style={{ color: colorForPct(k.pct) }}>{k.pct}%</b> · {k.correct}/{k.total}
                    <span style={{ color: "#a8483f", marginLeft: 6 }}>({k.wrong} err.)</span>
                  </span>
                </div>
                <div style={{ height: 8, background: "var(--bg)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${k.pct}%`, background: colorForPct(k.pct), borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance per periodo storico */}
      {periodRate.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Copertura storica</div>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 16 }}>Performance per periodo storico</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {periodRate.map(p => (
              <div key={p.pid} style={{ padding: "10px 14px", background: "var(--bg-2)", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <Link className="tlink" to={`/periodo/${p.pid}`} style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</Link>
                  <span className="tnum" style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                    <b style={{ color: colorForPct(p.pct) }}>{p.pct}%</b> · {p.correct}/{p.total}
                  </span>
                </div>
                <div style={{ height: 6, background: "var(--bg)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${p.pct}%`, background: colorForPct(p.pct), borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Errori più frequenti */}
      {topErrors.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Da ripassare</div>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 16 }}>Errori più frequenti</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {topErrors.map((e, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 14px", background: "rgba(168,72,63,0.06)",
                borderRadius: 8, border: "1px solid rgba(168,72,63,0.15)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                    background: "#a8483f", color: "#fff",
                  }}>#{i + 1}</span>
                  <span style={{ fontSize: 13, textTransform: "capitalize" }}>{e.label}</span>
                  {e.refId && (
                    <button onClick={() => openDrawer(e.refId)} style={{
                      background: "none", border: 0, padding: 0, cursor: "pointer",
                      color: "var(--gold)", fontSize: 12, textDecoration: "underline",
                    }}>scheda →</button>
                  )}
                </div>
                <span className="tnum" style={{ fontSize: 14, fontWeight: 700, color: "#a8483f" }}>{e.n}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reset */}
      <div style={{ marginTop: 24, padding: 16, background: "rgba(168,72,63,0.04)", borderRadius: 10, border: "1px solid rgba(168,72,63,0.15)" }}>
        <div style={{ fontSize: 13, color: "var(--ink-dim)", marginBottom: 8 }}>Cancella definitivamente tutte le statistiche e la banca errori.</div>
        <button className="btn ghost sm" style={{ color: "#a8483f", borderColor: "#a8483f" }}
          onClick={() => { if (confirm("Cancellare tutte le statistiche quiz?")) { clearStats(); clearErrors(); onBack(); } }}>
          🗑️ Reset statistiche
        </button>
      </div>

      <OperaDrawer workId={drawerWorkId} open={drawerOpen} onClose={closeDrawer} />
    </div>
  );
}
