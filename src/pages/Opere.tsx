import { useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useData, useTimeRange } from "../lib/store";
import { WorkCard, WorkGroupCard, Empty, EmptyTimeRange, FilterNote } from "../components/ui";
import { useFavorites } from "../lib/favorites";
import { useStudied } from "../lib/studied";
import { computeWorkGroups, workGroupMap } from "../lib/data";
import { clearLastOpera } from "../lib/lastVisited";
import type { WorkType } from "../lib/types";

const TYPES: WorkType[] = ["architettura", "pittura", "scultura", "mosaico", "miniatura", "oreficeria", "urbanistica", "altro"];

export default function Opere() {
  const { ds, periodById } = useData();
  const { workIn, active } = useTimeRange();
  const [sp] = useSearchParams();

  // Quando si arriva alla home delle Opere, azzerare l'ultima opera visitata
  // (così il prossimo click su "Opere" nel menu non riporta all'opera vecchia)
  useEffect(() => {
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
    if (!isTouchPrimary && searchRef.current) {
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
  const [imp, setImp] = useState<string>(() => sessionStorage.getItem("atlante:opere-imp") || "");
  const [favOnly, setFavOnly] = useState(false);
  const [studiedFilter, setStudiedFilter] = useState<"" | "studied" | "not-studied">("");
  const [grouped, setGrouped] = useState(false);
  const [limit, setLimit] = useState(60);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const favs = useFavorites();
  const studied = useStudied();

  // Salva la ricerca in sessionStorage quando cambia
  useEffect(() => {
    if (q) sessionStorage.setItem("atlante:opere-search", q);
    else sessionStorage.removeItem("atlante:opere-search");
  }, [q]);
  useEffect(() => {
    if (imp) sessionStorage.setItem("atlante:opere-imp", imp);
    else sessionStorage.removeItem("atlante:opere-imp");
  }, [imp]);

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

  // opere visibili nell'intervallo temporale globale (prima dei filtri locali)
  const inTime = useMemo(() => ds.works.filter(workIn), [ds, workIn]);

  // calcola gruppi
  const groups = useMemo(() => computeWorkGroups(ds), [ds]);
  const byGroup = useMemo(() => workGroupMap(groups), [groups]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return inTime.filter((w) => {
      if (favOnly && !favs.works.includes(w.id)) return false;
      if (type && w.type !== type) return false;
      if (period && !discendenti.get(period)?.has(w.period_id)) return false;
      if (imp && String(w.importance) !== imp) return false;
      if (studiedFilter === "studied" && !studied.includes(w.id)) return false;
      if (studiedFilter === "not-studied" && studied.includes(w.id)) return false;
      if (qq) {
        const keywords = qq.split(/\s+/).filter(Boolean);
        const hay = (w.title + " " + (w.location_city ?? "") + " " + (w.location_place ?? "") + " " + (w.type ?? "")).toLowerCase();
        if (!keywords.every(kw => hay.includes(kw))) return false;
      }
      return true;
    }).sort((a, b) => b.importance - a.importance || (a.year_end ?? 9999) - (b.year_end ?? 9999));
  }, [inTime, q, type, period, imp, favOnly, favs, studiedFilter, studied, discendenti]);

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
        <select className="input" value={type} onChange={(e) => { setType(e.target.value); setLimit(60); }} data-testid="select-type">
          <option value="">Ogni tipo</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="input" value={period} onChange={(e) => { setPeriod(e.target.value); setLimit(60); }} data-testid="select-period">
          <option value="">Ogni periodo</option>
          {periodOpts.map((p) => <option key={p.id} value={p.id}>{p.label} ({p.n})</option>)}
        </select>
        <select className="input" value={imp} onChange={(e) => { setImp(e.target.value); setLimit(60); }} data-testid="select-imp"
          title="Quanto spazio danno all'opera i manuali da cui nasce il catalogo. Non è un giudizio di valore sull'opera.">
          <option value="">Ogni trattazione</option>
          <option value="3">Trattate a lungo</option>
          <option value="2">Trattate</option>
          <option value="1">Solo citate</option>
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
        <button className={`chip ${grouped ? "active" : ""}`} onClick={() => setGrouped(v => !v)} data-testid="toggle-grouped"
          title={groups.size === 0 ? "Nessun gruppo disponibile" : "Raggruppa opere dello stesso complesso"}>
          ⛨ Complessi{groups.size > 0 ? ` (${groups.size})` : ""}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "12px 0 22px", flexWrap: "wrap" }}>
        <div className="muted tnum" style={{ fontSize: 13 }} data-testid="text-count">
          {filtered.length} {filtered.length === 1 ? "opera" : "opere"}
          {filtered.length !== ds.works.length ? ` su ${ds.works.length}` : ""}
        </div>
        {active && <FilterNote total={ds.works.length} shown={inTime.length} noun="opere nell'arco scelto" />}
        {(q || type || period || imp || favOnly || studiedFilter) && (
          <button className="btn ghost sm" data-testid="reset-filtri"
            onClick={() => { setQ(""); setType(""); setPeriod(""); setImp(""); setFavOnly(false); setStudiedFilter(""); setLimit(60); }}>
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
            {(grouped ? singleWorks : filtered).slice(0, limit).map((w) => (
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
