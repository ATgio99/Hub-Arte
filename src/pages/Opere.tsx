import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useData, useTimeRange } from "../lib/store";
import { WorkCard, WorkGroupCard, Empty, EmptyTimeRange, FilterNote } from "../components/ui";
import { useFavorites } from "../lib/favorites";
import { useStudied } from "../lib/studied";
import { computeWorkGroups, workGroupMap } from "../lib/data";
import type { WorkType } from "../lib/types";

const TYPES: WorkType[] = ["architettura", "pittura", "scultura", "mosaico", "miniatura", "oreficeria", "urbanistica", "altro"];

export default function Opere() {
  const { ds, periodById } = useData();
  const { workIn, active } = useTimeRange();
  const [sp] = useSearchParams();
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

  // periodi ordinati cronologicamente per il filtro
  const periodOpts = useMemo(
    () => [...ds.periods].sort((a, b) => a.year_start - b.year_start),
    [ds]
  );

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
      if (period && w.period_id !== period) return false;
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
  }, [inTime, q, type, period, imp, favOnly, favs, studiedFilter, studied]);

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
        <div className="page-eyebrow"><span className="eyebrow">Catalogo · Opere</span></div>
        <h1 className="page-title">Opere</h1>
        <p className="page-lead">Il catalogo completo: ogni scheda raccoglie immagine, datazione, tecniche, terminologia e le connessioni con le altre opere. Usa la barra temporale a sinistra per restringere il periodo.</p>
      </div>

      <div className="page-rule" />

      <div className="filterbar" style={{ marginBottom: 8 }}>
        <input className="input" placeholder="Cerca per titolo o luogo…" value={q}
          onChange={(e) => { setQ(e.target.value); setLimit(60); }} data-testid="input-search" style={{ flex: "1 1 240px" }} />
        <select className="input" value={type} onChange={(e) => { setType(e.target.value); setLimit(60); }} data-testid="select-type">
          <option value="">Ogni tipo</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="input" value={period} onChange={(e) => { setPeriod(e.target.value); setLimit(60); }} data-testid="select-period">
          <option value="">Ogni periodo</option>
          {periodOpts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input" value={imp} onChange={(e) => { setImp(e.target.value); setLimit(60); }} data-testid="select-imp">
          <option value="">Ogni rilievo</option>
          <option value="3">Capitali</option>
          <option value="2">Rilevanti</option>
          <option value="1">Citate</option>
        </select>
        <button className={`chip fav-chip ${favOnly ? "active" : ""}`} onClick={() => { setFavOnly((v) => !v); setLimit(60); }} data-testid="works-fav-only"
          title={favs.works.length === 0 ? "Nessuna opera preferita: usa la ★ sulle schede" : ""}>
          ★ Preferiti{favs.works.length > 0 ? ` (${favs.works.length})` : ""}
        </button>
      </div>

      {/* Seconda riga filtri: approfondite + raggruppate */}
      <div className="filterbar" style={{ marginBottom: 8, marginTop: 4 }}>
        <select className="input" value={studiedFilter} onChange={(e) => { setStudiedFilter(e.target.value as any); setLimit(60); }} data-testid="select-studied" style={{ flex: "0 0 auto" }}>
          <option value="">Tutte</option>
          <option value="studied">✓ Approfondite ({studiedCount})</option>
          <option value="not-studied">○ Da approfondire ({notStudiedCount})</option>
        </select>
        <button className={`chip ${grouped ? "active" : ""}`} onClick={() => setGrouped(v => !v)} data-testid="toggle-grouped"
          title={groups.size === 0 ? "Nessun gruppo disponibile" : "Raggruppa opere dello stesso complesso"}>
          ⛨ Complessi{groups.size > 0 ? ` (${groups.size})` : ""}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "12px 0 22px", flexWrap: "wrap" }}>
        <div className="muted tnum" style={{ fontSize: 13 }} data-testid="text-count">{filtered.length} risultati</div>
        <FilterNote total={ds.works.length} shown={inTime.length} noun="opere nell'arco scelto" />
        {studiedFilter && (
          <div className="filter-note" data-testid="studied-filter-note">
            {studiedFilter === "studied" ? "✓" : "○"} {studiedFilter === "studied" ? "Approfondite" : "Da approfondire"}: <b>{studiedFilter === "studied" ? studiedCount : notStudiedCount}</b> opere
          </div>
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
