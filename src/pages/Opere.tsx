import { useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useData, useTimeRange } from "../lib/store";
import { arrivatoDaTastiera } from "../lib/scorciatoie";
import { WorkCard, WorkGroupCard, Empty, EmptyTimeRange, FilterNote } from "../components/ui";
import { useFavorites } from "../lib/favorites";
import { useStudied } from "../lib/studied";
import { useAuth } from "../lib/auth";
import { useVerifiche } from "../lib/verifiche";
import { computeWorkGroups, workGroupMap, rilevanzaTitolo, pulisciPerRicerca, SOGLIA_RILEVANZA } from "../lib/data";
import { clearLastOpera } from "../lib/lastVisited";
import { BottoneFiltri, FoglioFiltri, contaFiltri, StatoFiltri } from "../components/FiltriOpereFoglio";
import { useIsNarrow } from "../lib/motion";
import type { WorkType } from "../lib/types";

const TYPES: WorkType[] = ["architettura", "pittura", "scultura", "mosaico", "miniatura", "oreficeria", "urbanistica", "altro"];

export default function Opere() {
  const { ds, periodById, artistById } = useData();
  const { workIn, active } = useTimeRange();
  const [sp] = useSearchParams();

  // Quando si arriva alla home delle Opere, azzerare l'ultima opera visitata
  // (così il prossimo click su "Opere" nel menu non riporta all'opera vecchia)
  useEffect(() => {
    // Chi arriva con una scorciatoia sta solo cambiando sezione: la memoria
    // di dove era rimasto non va toccata. La si azzera solo quando l'indice
    // e' una scelta esplicita — il secondo clic sulla voce di menu.
    if (arrivatoDaTastiera()) return;
    clearLastOpera();
  }, []);

  // === Focus automatico sulla barra di ricerca (solo PC) ===
  // Quando l'utente arriva alla home delle Opere dal menu (doppio click su
  // "Opere" nella sidebar mentre è già su una scheda opera, o click singolo
  // quando era in home), mettiamo subito il cursore nella barra di ricerca
  // così può iniziare a cercare senza un click aggiuntivo.
  // Solo su dispositivi con mouse (no touch): se è un device touch (tablet,
  // cellulare), il focus automatico aprirebbe la tastiera on-screen senza
  // una chiara intenzione dell'utente — lo evitiamo.
  const searchRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    // Rilevazione approssimativa di device touch. Se la touchscreen è il
    // primary input, NON facciamo auto-focus (vedi regola qui sopra).
    const isTouchPrimary = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
    // Chi e' arrivato con una scorciatoia sta usando la tastiera per
    // navigare: mettergli il cursore nel campo di ricerca gli spegnerebbe
    // le scorciatoie al tasto successivo.
    if (!isTouchPrimary && !arrivatoDaTastiera() && searchRef.current) {
      // Piccolo delay per essere sicuri che il render sia completato
      const t = setTimeout(() => {
        try { searchRef.current?.focus(); } catch { /* ignore */ }
      }, 60);
      return () => clearTimeout(t);
    }
  }, []);

  const [q, setQ] = useState(() => sessionStorage.getItem("atlante:opere-search") || "");
  const [type, setType] = useState<string>(sp.get("type") ?? "");
  const [period, setPeriod] = useState<string>(sp.get("p") ?? "");
  const [favOnly, setFavOnly] = useState(false);
  const [studiedFilter, setStudiedFilter] = useState<"" | "studied" | "not-studied">("");
  // Solo per gli amministratori: le schede ancora da leggere e controllare.
  // Sta qui e non solo in statistiche perche' la revisione si fa scorrendo il
  // catalogo, non da un elenco a parte.
  const [soloDaVerificare, setSoloDaVerificare] = useState(false);
  const [grouped, setGrouped] = useState(false);
  const [limit, setLimit] = useState(60);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const favs = useFavorites();
  const studied = useStudied();
  const { isAdmin } = useAuth();
  const { verificata } = useVerifiche();

  // Salva la ricerca in sessionStorage quando cambia
  useEffect(() => {
    if (q) sessionStorage.setItem("atlante:opere-search", q);
    else sessionStorage.removeItem("atlante:opere-search");
  }, [q]);

  // Il filtro dei periodi mostrava tutte le voci in fila, ordinate per anno:
  // epoche, correnti e scuole mescolate, oltre duecento righe senza gerarchia,
  // in cui scegliere «Rinascimento» non dava nulla perche' le opere sono
  // attaccate alle scuole sottostanti. Qui l'elenco segue invece l'albero
  // (epoca › corrente › scuola), scegliere un ramo prende anche tutto quello
  // che ha sotto, e le voci senza opere non compaiono affatto.
  const figliDi = useMemo(() => {
    const m = new Map<string, typeof ds.periods>();
    for (const p of ds.periods) {
      const k = p.parent_id ?? "";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    }
    for (const v of m.values()) v.sort((a, b) => a.year_start - b.year_start);
    return m;
  }, [ds]);

  // Un periodo comprende sempre i suoi discendenti: e' il senso della matrioska.
  const discendenti = useMemo(() => {
    const m = new Map<string, Set<string>>();
    const calcola = (id: string): Set<string> => {
      if (m.has(id)) return m.get(id)!;
      const insieme = new Set<string>([id]);
      m.set(id, insieme);
      for (const f of figliDi.get(id) ?? []) for (const x of calcola(f.id)) insieme.add(x);
      return insieme;
    };
    for (const p of ds.periods) calcola(p.id);
    return m;
  }, [ds, figliDi]);

  const perPeriodo = useMemo(() => {
    const c = new Map<string, number>();
    for (const w of ds.works) c.set(w.period_id, (c.get(w.period_id) ?? 0) + 1);
    return c;
  }, [ds]);

  // Tre opere non hanno un periodo assegnato. Finora esistevano solo come una
  // barra senza nome nelle statistiche: qui diventano una voce del filtro, con
  // il suo conteggio, cosi' si possono guardare e sistemare.
  const SENZA_PERIODO = "__senza_periodo__";
  const senzaPeriodo = useMemo(
    () => ds.works.filter((w) => !w.period_id || !periodById.has(w.period_id)).length,
    [ds, periodById]
  );

  // Il periodo si sceglie in due passi. Centoquindici voci in un menu solo, con
  // le scuole rientrate sotto le correnti, erano una lista lunga tre schermate
  // in cui non si trovava niente: prima l'epoca, poi — e solo allora — la
  // corrente o la scuola che ci sta dentro.
  const epocaScelta = useMemo(() => {
    if (!period || period === SENZA_PERIODO) return "";
    let corrente: string | undefined = period;
    while (corrente) {
      const p = periodById.get(corrente);
      if (!p) return "";
      if (p.type === "epoca" || !p.parent_id) return p.id;
      corrente = p.parent_id ?? undefined;
    }
    return "";
  }, [period, periodById]);

  const periodOpts = useMemo(() => {
    const totale = (id: string) => {
      let n = 0;
      for (const x of discendenti.get(id) ?? []) n += perPeriodo.get(x) ?? 0;
      return n;
    };
    const out: { id: string; label: string; n: number }[] = [];
    const scendi = (id: string, livello: number) => {
      for (const f of figliDi.get(id) ?? []) {
        const n = totale(f.id);
        if (n === 0) continue;
        out.push({ id: f.id, label: "\u00a0\u00a0".repeat(livello) + (livello ? "› " : "") + f.name, n });
        scendi(f.id, livello + 1);
      }
    };
    scendi("", 0);
    return out;
  }, [figliDi, discendenti, perPeriodo]);

  /** Le epoche, con quante opere contengono in tutto. */
  const epocheOpts = useMemo(() => {
    const totale = (id: string) => {
      let n = 0;
      for (const x of discendenti.get(id) ?? []) n += perPeriodo.get(x) ?? 0;
      return n;
    };
    return (figliDi.get("") ?? [])
      .map((p) => ({ id: p.id, label: p.name, n: totale(p.id) }))
      .filter((o) => o.n > 0);
  }, [figliDi, discendenti, perPeriodo]);

  /** Quello che sta dentro l'epoca scelta: correnti e, rientrate, le scuole. */
  const sottoOpts = useMemo(() => {
    if (!epocaScelta) return [] as { id: string; label: string; n: number }[];
    const totale = (id: string) => {
      let n = 0;
      for (const x of discendenti.get(id) ?? []) n += perPeriodo.get(x) ?? 0;
      return n;
    };
    const out: { id: string; label: string; n: number }[] = [];
    const scendi = (id: string, livello: number) => {
      for (const f of figliDi.get(id) ?? []) {
        const n = totale(f.id);
        if (n === 0) continue;
        out.push({ id: f.id, label: "\u00a0\u00a0".repeat(livello) + (livello ? "› " : "") + f.name, n });
        scendi(f.id, livello + 1);
      }
    };
    scendi(epocaScelta, 0);
    return out;
  }, [epocaScelta, figliDi, discendenti, perPeriodo]);

  // opere visibili nell'intervallo temporale globale (prima dei filtri locali)
  const inTime = useMemo(() => ds.works.filter(workIn), [ds, workIn]);

  // calcola gruppi
  const groups = useMemo(() => computeWorkGroups(ds), [ds]);
  const byGroup = useMemo(() => workGroupMap(groups), [groups]);

  // Dalla bibliografia si arriva qui con ?fonte=<id>: le schede che vengono da
  // quel libro. Non e' un filtro dell'interfaccia — non ha una pastiglia — ma
  // un rimando, quindi vive nell'indirizzo e non nello stato.
  const fonteChiesta = sp.get("fonte");

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return inTime.filter((w) => {
      if (fonteChiesta && !(w.fonte_ids ?? []).includes(fonteChiesta)) return false;
      if (favOnly && !favs.works.includes(w.id)) return false;
      if (type && w.type !== type) return false;
      if (period === SENZA_PERIODO) {
        if (w.period_id && periodById.has(w.period_id)) return false;
      } else if (period && !discendenti.get(period)?.has(w.period_id)) return false;

      if (studiedFilter === "studied" && !studied.includes(w.id)) return false;
      if (studiedFilter === "not-studied" && studied.includes(w.id)) return false;
      if (soloDaVerificare && verificata(w.id)) return false;
      if (qq) {
        // Tutte le parole devono trovarsi, ma possono stare in campi diversi:
        // «palazzo te mantova» è il titolo più la città. Fra i campi c'è anche
        // l'autore, che prima non c'era: cercare «masaccio» non dava niente.
        const keywords = qq.split(/\s+/).filter(Boolean);
        const autori = (w.artist_ids ?? []).map((id) => artistById.get(id)?.name ?? "").join(" ");
        const hay = pulisciPerRicerca(
          [w.title, w.location_city, w.location_place, w.type, autori,
           periodById.get(w.period_id)?.name].filter(Boolean).join(" "));
        if (!keywords.every(kw => hay.includes(pulisciPerRicerca(kw)))) return false;
      }
      return true;
    // In ordine di tempo. Prima veniva per «importanza», cioe' per quanto
    // spazio davano i manuali: la prima schermata del catalogo era una classifica
    // travestita da elenco.
    }).sort((a, b) => (a.year_end ?? a.year_start ?? 9999) - (b.year_end ?? b.year_start ?? 9999)
        || a.id.localeCompare(b.id));
  }, [inTime, q, type, period, favOnly, favs, studiedFilter, studied, discendenti, periodById,
      artistById, soloDaVerificare, verificata, fonteChiesta]);

  // Le corrispondenze nette salgono in cima, e sotto l'elenco resta in ordine
  // di tempo: cercando «palazzo te» il Palazzo Te era fra gli ultimi, perché è
  // del 1525. Ordinare tutto per pertinenza avrebbe rotto la cronologia, che è
  // il modo in cui questo atlante si guarda; così invece si tiene tutt'e due.
  const { inCima, restanti } = useMemo(() => {
    const qq = q.trim();
    if (!qq) return { inCima: [] as typeof filtered, restanti: filtered };
    const conPunteggio = filtered
      .map((w) => ({
        w,
        p: rilevanzaTitolo(w.title, qq, [
          w.location_city, w.location_place, w.type,
          ...(w.artist_ids ?? []).map((id) => artistById.get(id)?.name ?? ""),
          periodById.get(w.period_id)?.name,
        ].filter(Boolean).join(" ")),
      }))
      .filter((x) => x.p >= SOGLIA_RILEVANZA)
      .sort((a, b) => b.p - a.p)
      .slice(0, 5);
    // Se le migliori sono tutto il risultato, il blocchetto non aggiunge nulla.
    if (conPunteggio.length === 0 || conPunteggio.length === filtered.length) {
      return { inCima: [] as typeof filtered, restanti: filtered };
    }
    const scelte = new Set(conPunteggio.map((x) => x.w.id));
    return { inCima: conPunteggio.map((x) => x.w), restanti: filtered.filter((w) => !scelte.has(w.id)) };
  }, [filtered, q, artistById, periodById]);

  // in modalità raggruppata, separa le opere in "singole" e "raggruppate"
  const { singleWorks, groupedWorks } = useMemo(() => {
    if (!grouped) return { singleWorks: filtered, groupedWorks: [] as typeof filtered };
    const seenGroupKeys = new Set<string>();
    const singles: typeof filtered = [];
    const grouped_: typeof filtered = [];
    for (const w of filtered) {
      const g = byGroup.get(w.id);
      if (g && g.works.length >= 2) {
        // solo la prima opera del gruppo aggiunge il gruppo al risultato
        const gKey = `${g.city}|${g.name.toLowerCase()}`;
        if (!seenGroupKeys.has(gKey)) {
          seenGroupKeys.add(gKey);
          grouped_.push(w); // pusha il parent come segnaposto
        }
        // le altre opere del gruppo non appaiono come singole
      } else {
        singles.push(w);
      }
    }
    return { singleWorks: singles, groupedWorks: grouped_ };
  }, [filtered, grouped, byGroup]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // conta risultati per filtri
  const studiedCount = useMemo(() => filtered.filter(w => studied.includes(w.id)).length, [filtered, studied]);
  const notStudiedCount = filtered.length - studiedCount;
  // Quante ne restano da controllare fra quelle in vista: e' il numero che
  // dice quanto manca al capitolo che si sta rivedendo, non al catalogo.
  const daVerificare = useMemo(
    () => (isAdmin ? filtered.filter((w) => !verificata(w.id)).length : 0),
    [isAdmin, filtered, verificata]);

  // Sotto i 900px vale la stessa soglia del menu a scomparsa: dove sparisce la
  // barra laterale i filtri non ci stanno piu' in riga.
  const stretto = useIsNarrow(900);
  const [filtriAperti, setFiltriAperti] = useState(false);

  const azzeraFiltri = () => {
    setQ(""); setType(""); setPeriod("");
    setFavOnly(false); setStudiedFilter(""); setGrouped(false); setLimit(60);
  };

  const statoFiltri: StatoFiltri = {
    type, setType: (v) => { setType(v); setLimit(60); }, tipi: TYPES,
    period, setPeriod: (v) => { setPeriod(v); setLimit(60); },
    periodOpts, senzaPeriodo, chiaveSenzaPeriodo: SENZA_PERIODO,
    epocaScelta, epocheOpts, sottoOpts,
    favOnly, setFavOnly: (v) => { setFavOnly(v); setLimit(60); }, nFav: favs.works.length,
    studiedFilter, setStudiedFilter: (v) => { setStudiedFilter(v); setLimit(60); },
    nStudiate: studiedCount, nDaStudiare: notStudiedCount,
    grouped, setGrouped, nGruppi: groups.size,
    onAzzera: azzeraFiltri,
    quante: filtered.length,
  };

  return (
    <div className="wrap page">
      <div className="page-head">
        <div className="page-eyebrow"><span className="eyebrow">Catalogo</span></div>
        <h1 className="page-title">Opere</h1>
        <p className="page-lead">Il catalogo completo: ogni scheda raccoglie immagine, datazione, tecniche, terminologia e le connessioni con le altre opere. Usa la barra temporale a sinistra per restringere il periodo.</p>
      </div>

      <div className="page-rule" />

      <div className="filterbar" style={{ marginBottom: 8 }}>
        <input ref={searchRef} className="input" placeholder="Cerca per titolo o luogo…" value={q}
          onChange={(e) => { setQ(e.target.value); setLimit(60); }} data-testid="input-search" style={{ flex: "1 1 240px" }} />
        {/* Su schermo stretto i sei filtri prendevano quattro righe e la prima
            opera finiva sotto la piega. Restano fuori la ricerca e un tasto che
            dice quanti filtri sono accesi; il resto sale dal basso. */}
        {stretto && <BottoneFiltri attivi={contaFiltri(statoFiltri)} onApri={() => setFiltriAperti(true)} />}
        {!stretto && <>
        <select className="input" value={type} onChange={(e) => { setType(e.target.value); setLimit(60); }} data-testid="select-type">
          <option value="">Ogni tipo</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {/* Prima l'epoca, poi la corrente o la scuola che ci sta dentro: in un
            menu solo erano centoquindici voci, tre schermate di elenco. */}
        <select className="input"
          value={period === SENZA_PERIODO ? SENZA_PERIODO : epocaScelta}
          onChange={(e) => { setPeriod(e.target.value); setLimit(60); }}
          data-testid="select-epoca">
          <option value="">Ogni epoca</option>
          {epocheOpts.map((p) => <option key={p.id} value={p.id}>{p.label} ({p.n})</option>)}
          {senzaPeriodo > 0 && (
            <option value={SENZA_PERIODO}>Senza periodo assegnato ({senzaPeriodo})</option>
          )}
        </select>
        <select className="input"
          value={period === epocaScelta ? "" : period}
          disabled={!epocaScelta}
          onChange={(e) => { setPeriod(e.target.value || epocaScelta); setLimit(60); }}
          data-testid="select-period"
          title={epocaScelta ? "Corrente o scuola dentro l'epoca scelta" : "Scegli prima un'epoca"}
          style={{ opacity: epocaScelta ? 1 : 0.5 }}>
          <option value="">{epocaScelta ? "Tutta l'epoca" : "Corrente o scuola"}</option>
          {sottoOpts.map((p) => <option key={p.id} value={p.id}>{p.label} ({p.n})</option>)}
        </select>
        <button className={`chip fav-chip ${favOnly ? "active" : ""}`} onClick={() => { setFavOnly((v) => !v); setLimit(60); }} data-testid="works-fav-only"
          title={favs.works.length === 0 ? "Nessuna opera preferita: usa la ★ sulle schede" : ""}>
          ★ Preferiti{favs.works.length > 0 ? ` (${favs.works.length})` : ""}
        </button>

        {/* Tasto toggle "Approfondite" — come i preferiti. */}
        <button
          className={`chip fav-chip ${studiedFilter === "studied" ? "active" : ""}`}
          onClick={() => { setStudiedFilter(v => v === "studied" ? "" : "studied"); setLimit(60); }}
          data-testid="toggle-studied"
          title="Mostra solo le opere approfondite (studiate)"
        >
          ✓ Approfondite{studiedCount > 0 ? ` (${studiedCount})` : ""}
        </button>
        {/* Tasto toggle "Da approfondire" */}
        <button
          className={`chip fav-chip ${studiedFilter === "not-studied" ? "active" : ""}`}
          onClick={() => { setStudiedFilter(v => v === "not-studied" ? "" : "not-studied"); setLimit(60); }}
          data-testid="toggle-not-studied"
          title="Mostra solo le opere da approfondire"
        >
          ○ Da approfondire{notStudiedCount > 0 ? ` (${notStudiedCount})` : ""}
        </button>
        {isAdmin && (
          <button
            className={`chip fav-chip ${soloDaVerificare ? "active" : ""}`}
            onClick={() => { setSoloDaVerificare((v) => !v); setLimit(60); }}
            data-testid="toggle-da-verificare"
            title="Solo le schede non ancora lette e controllate (visibile ai soli amministratori)"
          >
            ⚑ Da verificare{daVerificare > 0 ? ` (${daVerificare})` : ""}
          </button>
        )}
        <button className={`chip ${grouped ? "active" : ""}`} onClick={() => setGrouped(v => !v)} data-testid="toggle-grouped"
          title={groups.size === 0 ? "Nessun gruppo disponibile" : "Raggruppa opere dello stesso complesso"}>
          ⛨ Complessi{groups.size > 0 ? ` (${groups.size})` : ""}
        </button>
        </>}
      </div>

      {stretto && <FoglioFiltri aperto={filtriAperti} onChiudi={() => setFiltriAperti(false)} s={statoFiltri} />}

      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "12px 0 22px", flexWrap: "wrap" }}>
        <div className="muted tnum" style={{ fontSize: 13 }} data-testid="text-count">
          {filtered.length} {filtered.length === 1 ? "opera" : "opere"}
          {filtered.length !== ds.works.length ? ` su ${ds.works.length}` : ""}
        </div>
        {active && <FilterNote total={ds.works.length} shown={inTime.length} noun="opere nell'arco scelto" />}
        {(q || type || period || favOnly || studiedFilter || soloDaVerificare) && (
          <button className="btn ghost sm" data-testid="reset-filtri"
            onClick={() => { setQ(""); setType(""); setPeriod(""); setFavOnly(false); setStudiedFilter(""); setSoloDaVerificare(false); setLimit(60); }}>
            Azzera i filtri
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        favOnly && favs.works.length === 0 ? (
          <Empty msg="Nessuna opera preferita: tocca la ★ su una scheda per aggiungerla." />
        ) : active ? (
          <EmptyTimeRange noun="opere" />
        ) : (
          <Empty msg="Nessuna opera corrisponde ai filtri." />
        )
      ) : (
        <>
          {inCima.length > 0 && !grouped && (
            <div
              data-testid="piu-pertinenti"
              style={{
                marginBottom: 28, padding: "14px 16px 18px", borderRadius: 14,
                border: "1px solid var(--gold)",
                background: "color-mix(in srgb, var(--gold) 6%, transparent)",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase",
                  color: "var(--gold-deep)", border: "1px solid var(--gold)", borderRadius: 999,
                  padding: "3px 10px", background: "var(--bg-0, #fff)",
                }}>
                  {inCima.length === 1 ? "Corrispondenza esatta" : `Le ${inCima.length} corrispondenze migliori`}
                </span>
                <span className="muted" style={{ fontSize: 13 }}>
                  per «{q.trim()}»
                </span>
              </div>
              <div className="grid-works">
                {inCima.map((w) => (
                  <WorkCard key={w.id} work={w}
                    subtitle={[w.location_city, periodById.get(w.period_id)?.name].filter(Boolean).join(" · ")} />
                ))}
              </div>
            </div>
          )}

          {inCima.length > 0 && !grouped && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 16px" }}>
              <span className="eyebrow" style={{ whiteSpace: "nowrap" }}>
                Le altre {restanti.length}, in ordine di tempo
              </span>
              <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
            </div>
          )}

          <div className="grid-works">
            {/* Opere raggruppate (solo in modalità raggruppata) */}
            {grouped && groupedWorks.map((w) => {
              const g = byGroup.get(w.id);
              if (!g) return null;
              const gKey = `${g.city}|${g.name.toLowerCase()}`;
              return (
                <WorkGroupCard
                  key={gKey}
                  group={g}
                  expanded={expandedGroups.has(gKey)}
                  onToggle={() => toggleGroup(gKey)}
                />
              );
            })}

            {/* Opere singole */}
            {(grouped ? singleWorks : restanti).slice(0, limit).map((w) => (
              <WorkCard key={w.id} work={w}
                group={grouped ? byGroup.get(w.id) : undefined}
                subtitle={[w.location_city, periodById.get(w.period_id)?.name].filter(Boolean).join(" · ")} />
            ))}
          </div>
          {filtered.length > limit && (
            <div style={{ textAlign: "center", marginTop: 34 }}>
              <button className="btn" onClick={() => setLimit((l) => l + 60)} data-testid="button-more">
                Mostra altre ({filtered.length - limit})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
