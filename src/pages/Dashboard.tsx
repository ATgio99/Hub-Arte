import { useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useData, useTimeRange } from "../lib/store";
import { Section, FilterNote, CountUp } from "../components/ui";
import { getOverrides, clearAllOverrides, clearOverride, exportOverrides, importOverrides } from "../lib/imageOverrides";
import { workSortYear } from "../lib/data";
import { useStudied } from "../lib/studied";
import { useAuth } from "../lib/auth";
import { useInViewOnce, EASE_OUT, usePrefersReducedMotion } from "../lib/motion";

// ---- Barre orizzontali (clickable) ----------------------------------------
function Bars({ data, color = "var(--gold)" }: { data: [string, number, string?][]; color?: string }) {
  const max = Math.max(...data.map((d) => d[1]), 1);
  const reduced = usePrefersReducedMotion();
  const { ref, seen } = useInViewOnce(0.15);
  return (
    <div ref={ref as any}>
      {data.map(([label, n, href], i) => (
        <div className="bar-row" key={label}>
          {href ? <Link className="tlink" to={href} style={{ border: 0, fontSize: 13 }}>{label}</Link> : <span style={{ fontSize: 13 }}>{label}</span>}
          <div className="bar-track">
            <motion.div className="bar-fill"
              style={{ background: color }}
              initial={reduced ? false : { width: 0 }}
              animate={{ width: `${((seen || reduced) ? (n / max) : 0) * 100}%` }}
              transition={{ duration: 0.7, ease: EASE_OUT, delay: reduced ? 0 : Math.min(i * 0.035, 0.4) }} />
          </div>
          <span className="tnum">{n}</span>
        </div>
      ))}
    </div>
  );
}

// ---- Istogramma densità con barre che crescono (stagger) ------------------
function DensityBars({ density, densityMax, inSel, yearAt }:
  { density: number[]; densityMax: number; inSel: (i: number) => boolean; yearAt: (i: number) => number }) {
  const reduced = usePrefersReducedMotion();
  const { ref, seen } = useInViewOnce(0.2);
  return (
    <div className="density" data-testid="dash-density" ref={ref as any}>
      {density.map((n, i) => (
        <motion.i key={i}
          title={`${yearAt(i)}–${yearAt(i) + 30}: ${n} opere`}
          style={{ background: inSel(i) ? "var(--gold)" : "var(--line)" }}
          initial={reduced ? false : { height: 0 }}
          animate={{ height: `${((seen || reduced) ? (n / densityMax) : 0) * 100}%` }}
          transition={{ duration: 0.6, ease: EASE_OUT, delay: reduced ? 0 : Math.min(i * 0.006, 0.5) }} />
      ))}
    </div>
  );
}

// ---- Small multiple: sparkline densità temporale di un sottoinsieme -------
function SparkCard({ title, count, bins, color = "var(--gold)", href }:
  { title: string; count: number; bins: number[]; color?: string; href?: string }) {
  const max = Math.max(...bins, 1);
  const body = (
    <>
      <div className="sm-title">
        <span>{title}</span>
        <span className="tnum" style={{ color: "var(--ink-dim)" }}>{count}</span>
      </div>
      <div className="sm-spark">
        {bins.map((b, i) => <i key={i} style={{ height: `${(b / max) * 100}%`, background: color }} />)}
      </div>
    </>
  );
  return href
    ? <Link to={href} className="sm-card hover" style={{ display: "block" }}>{body}</Link>
    : <div className="sm-card">{body}</div>;
}

// ---- Barre progresso approfondite per periodo ----------------------------
function StudiedBars({ data }: { data: { name: string; total: number; studied: number; pct: number; href: string }[] }) {
  const reduced = usePrefersReducedMotion();
  const { ref, seen } = useInViewOnce(0.15);
  return (
    <div ref={ref as any}>
      {data.map((d, i) => (
        <div key={d.name} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Link className="tlink" to={d.href} style={{ border: 0, fontSize: 13, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</Link>
            <span className="tnum" style={{ fontSize: 12, color: d.pct === 100 ? "var(--c-technique)" : "var(--ink-dim)" }}>
              {d.studied}/{d.total} ({d.pct}%)
            </span>
          </div>
          <div style={{ height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
            <motion.div
              style={{ height: "100%", borderRadius: 3, background: d.pct === 100 ? "var(--c-technique)" : "var(--gold)" }}
              initial={reduced ? false : { width: 0 }}
              animate={{ width: `${((seen || reduced) ? d.pct : 0)}%` }}
              transition={{ duration: 0.7, ease: EASE_OUT, delay: reduced ? 0 : Math.min(i * 0.03, 0.4) }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const BIN = 30; // ampiezza bin (anni) per le densità temporali

export default function Dashboard() {
  const ix = useData();
  const ds = ix.ds;
  const { range, bounds, workIn, active } = useTimeRange();
  const studiedIds = useStudied();
  const { isAdmin } = useAuth();

  // opere nell'arco temporale globale: base di TUTTE le statistiche
  const works = useMemo(() => ds.works.filter(workIn), [ds, workIn]);

  // --- Statistiche approfondite per periodo ---
  const studiedByPeriod = useMemo(() => {
    const periodWorks = new Map<string, { total: number; studied: number }>();
    // Inizializza tutti i periodi che hanno opere
    for (const w of works) {
      const pid = w.period_id;
      if (!periodWorks.has(pid)) periodWorks.set(pid, { total: 0, studied: 0 });
      periodWorks.get(pid)!.total++;
    }
    // Conta le approfondite
    const studiedSet = new Set(studiedIds);
    for (const w of works) {
      if (studiedSet.has(w.id)) {
        const pid = w.period_id;
        if (periodWorks.has(pid)) periodWorks.get(pid)!.studied++;
      }
    }
    return [...periodWorks.entries()]
      .map(([pid, s]) => ({
        pid,
        name: ix.periodById.get(pid)?.name ?? pid,
        total: s.total,
        studied: s.studied,
        pct: s.total > 0 ? Math.round((s.studied / s.total) * 100) : 0,
        href: `/periodo/${pid}`,
      }))
      .sort((a, b) => b.total - a.total);
  }, [works, ix, studiedIds]);

  // Periodi con opere mancanti (non completamente approfonditi)
  const missingByPeriod = useMemo(() => {
    return studiedByPeriod
      .filter(p => p.pct < 100)
      .sort((a, b) => a.pct - b.pct); // prima i meno completati
  }, [studiedByPeriod]);

  const byType = useMemo(() => {
    const m = new Map<string, number>();
    works.forEach((w) => m.set(w.type, (m.get(w.type) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v] as [string, number]);
  }, [works]);

  const byPeriod = useMemo(() => {
    const m = new Map<string, number>();
    works.forEach((w) => m.set(w.period_id, (m.get(w.period_id) ?? 0) + 1));
    return [...m.entries()]
      .map(([id, n]) => [ix.periodById.get(id)?.name ?? id, n, `/periodo/${id}`] as [string, number, string])
      .sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [works, ix]);

  const byCity = useMemo(() => {
    const m = new Map<string, number>();
    works.forEach((w) => { if (w.location_city) m.set(w.location_city, (m.get(w.location_city) ?? 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => [k, v] as [string, number]);
  }, [works]);

  const byKind = useMemo(() => {
    const m = new Map<string, number>();
    ds.connections.forEach((c) => m.set(c.kind, (m.get(c.kind) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v] as [string, number]);
  }, [ds]);

  // densità innovazioni per periodo (clickable)
  const innovDensity = useMemo(() => {
    const m = new Map<string, number>();
    works.forEach((w) => m.set(w.period_id, (m.get(w.period_id) ?? 0) + w.innovations.length));
    return [...m.entries()]
      .map(([id, n]) => [ix.periodById.get(id)?.name ?? id, n, `/periodo/${id}`] as [string, number, string])
      .filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [works, ix]);

  const imp = useMemo(() => {
    const c = [0, 0, 0, 0]; works.forEach((w) => c[w.importance]++);
    return c;
  }, [works]);

  // ---- densità temporale: opere per bin (istogramma grande) ---------------
  const nBins = Math.max(1, Math.ceil((bounds.max - bounds.min) / BIN));
  const density = useMemo(() => {
    const arr = new Array(nBins).fill(0);
    ds.works.forEach((w) => {
      const y = workSortYear(w);
      if (y == null) return;
      const i = Math.min(nBins - 1, Math.max(0, Math.floor((y - bounds.min) / BIN)));
      arr[i]++;
    });
    return arr;
  }, [ds, bounds, nBins]);
  const densityMax = Math.max(...density, 1);
  const yearAt = (i: number) => bounds.min + i * BIN;
  const inSel = (i: number) => yearAt(i) + BIN > range.min && yearAt(i) <= range.max;

  // ---- small multiples: densità temporale per tipologia (top 6) -----------
  const typeSparks = useMemo(() => {
    const top = [...byType].slice(0, 6).map((d) => d[0]);
    return top.map((type) => {
      const bins = new Array(nBins).fill(0);
      let count = 0;
      ds.works.forEach((w) => {
        if (w.type !== type) return;
        const y = workSortYear(w);
        if (y == null) return;
        count++;
        const i = Math.min(nBins - 1, Math.max(0, Math.floor((y - bounds.min) / BIN)));
        bins[i]++;
      });
      return { type, bins, count };
    });
  }, [ds, byType, bounds, nBins]);

  const TYPE_COLOR: Record<string, string> = {
    architettura: "var(--gold)", pittura: "var(--amber)", scultura: "var(--c-work)",
    mosaico: "var(--verdigris)", miniatura: "var(--c-term)", oreficeria: "var(--gold-2)",
    urbanistica: "var(--rust)", altro: "var(--ink-dim)",
  };

  const totalStudied = useMemo(() => {
    const studiedSet = new Set(studiedIds);
    return works.filter(w => studiedSet.has(w.id)).length;
  }, [works, studiedIds]);
  const totalWorks = works.length;
  const studiedPct = totalWorks > 0 ? Math.round((totalStudied / totalWorks) * 100) : 0;
  const completedPeriods = studiedByPeriod.filter(p => p.pct === 100).length;

  const kpis = [
    { n: works.length, l: "Opere nell'arco" },
    { n: works.filter((w) => w.image_url).length, l: "Con immagine" },
    { n: works.filter((w) => w.lat && w.lon).length, l: "Geolocalizzate" },
    { n: totalStudied, l: "Approfondite nell'arco" },
    { n: byType.length, l: "Tipologie" },
    { n: byPeriod.length, l: "Periodi attivi" },
  ];

  return (
    <div className="wrap page">
      <div className="page-head">
        <div className="page-eyebrow"><span className="eyebrow">Visualizzazione</span></div>
        <h1 className="page-title">Statistiche dell'atlante</h1>
        <p className="page-lead">Una lettura quantitativa del programma: distribuzione delle opere, geografia, densità di innovazioni e natura delle connessioni. Tutti i grafici seguono la barra temporale a sinistra.</p>
        <div style={{ marginTop: 12 }}>
          <FilterNote total={ds.works.length} shown={works.length} noun="opere nell'arco scelto" />
        </div>
      </div>

      <div className="page-rule" />

      <div className="kpi-grid">
        {kpis.map((k) => (
          <div className="stat" key={k.l}>
            <div className="stat-num tnum"><CountUp value={k.n} /></div>
            <div className="stat-lab">{k.l}</div>
          </div>
        ))}
      </div>

      {/* ===== APPROFONDITE PER PERIODO ===== */}
      <Section eyebrow="Progresso studio" title="Opere approfondite per periodo">
        <p className="muted" style={{ fontSize: 13.5, marginTop: -8, marginBottom: 12, maxWidth: "60ch" }}>
          Spunta le opere come "approfondite" dalla loro scheda (icona ✓). Qui vedi a colpo d'occhio cosa ti manca per ogni periodo.
          {active && ` I conteggi seguono l'arco temporale selezionato (${range.min}–${range.max}).`}
        </p>
        {/* KPI complessivi */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div className="stat" style={{ flex: "1 1 140px", textAlign: "center" }}>
            <div className="stat-num tnum" style={{ color: studiedPct >= 70 ? "var(--c-technique)" : studiedPct >= 30 ? "var(--gold)" : "var(--c-event)" }}>
              <CountUp value={studiedPct} suffix="%" />
            </div>
            <div className="stat-lab">completamento nell'arco</div>
          </div>
          <div className="stat" style={{ flex: "1 1 140px", textAlign: "center" }}>
            <div className="stat-num tnum"><CountUp value={totalStudied} />/<CountUp value={totalWorks} /></div>
            <div className="stat-lab">opere approfondite nell'arco</div>
          </div>
          <div className="stat" style={{ flex: "1 1 140px", textAlign: "center" }}>
            <div className="stat-num tnum" style={{ color: "var(--c-technique)" }}><CountUp value={completedPeriods} /></div>
            <div className="stat-lab">periodi completi</div>
          </div>
        </div>
        {/* Progresso globale */}
        <div style={{ height: 8, background: "var(--line)", borderRadius: 4, overflow: "hidden", marginBottom: 28 }}>
          <motion.div
            style={{ height: "100%", borderRadius: 4, background: studiedPct >= 70 ? "var(--c-technique)" : studiedPct >= 30 ? "var(--gold)" : "var(--c-event)" }}
            initial={{ width: 0 }}
            animate={{ width: `${studiedPct}%` }}
            transition={{ duration: 0.8, ease: EASE_OUT }}
          />
        </div>

        {/* Barre per periodo - prima i mancanti, poi i completati */}
        {missingByPeriod.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 10, color: "var(--c-event)" }}>Da completare</div>
            <StudiedBars data={missingByPeriod} />
          </div>
        )}
        {studiedByPeriod.filter(p => p.pct === 100).length > 0 && (
          <div>
            <div className="eyebrow" style={{ marginBottom: 10, color: "var(--c-technique)" }}>Completati ✓</div>
            <StudiedBars data={studiedByPeriod.filter(p => p.pct === 100)} />
          </div>
        )}
        {totalStudied === 0 && (
          <p className="muted" style={{ textAlign: "center", padding: "20px 0" }}>
            Non hai ancora approfondito nessuna opera. Vai sulla scheda di un'opera e premi la spunta ✓ per segnare le opere che hai studiato.
          </p>
        )}
      </Section>

      {/* DENSITÀ TEMPORALE — istogramma grande, bin nell'arco evidenziati */}
      <Section eyebrow="Densità temporale" title="Opere nel tempo">
        <p className="muted" style={{ fontSize: 13.5, marginTop: -8, marginBottom: 16, maxWidth: "58ch" }}>
          Numero di opere catalogate per intervalli di {BIN} anni. Le barre in oro cadono nell'arco selezionato.
        </p>
        <DensityBars density={density} densityMax={densityMax} inSel={inSel} yearAt={yearAt} />
        <div className="density-axis">
          <span>{bounds.min}</span><span>{Math.round((bounds.min + bounds.max) / 2)}</span><span>{bounds.max}</span>
        </div>
      </Section>

      {/* SMALL MULTIPLES — densità per tipologia */}
      <Section eyebrow="Small multiples" title="Tipologie nel tempo">
        <p className="muted" style={{ fontSize: 13.5, marginTop: -8, marginBottom: 18, maxWidth: "58ch" }}>
          La parabola di ciascuna tipologia attraverso i secoli — ogni riquadro condivide la stessa scala temporale.
        </p>
        <div className="sm-grid" data-testid="dash-smallmultiples">
          {typeSparks.map((s) => (
            <SparkCard key={s.type} title={s.type} count={s.count} bins={s.bins}
              color={TYPE_COLOR[s.type] ?? "var(--gold)"} href={`/opere?type=${s.type}`} />
          ))}
        </div>
      </Section>

      <div className="two-col" style={{ marginTop: 56, alignItems: "start" }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 16 }}>Opere per tipologia</div>
          <Bars data={byType} />
          <div style={{ marginTop: 28 }} className="eyebrow">Opere per rilievo</div>
          <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
            {[[3, "Capitali"], [2, "Rilevanti"], [1, "Citate"]].map(([i, l]: any) => (
              <div className="stat" key={i} style={{ flex: 1, textAlign: "center" }}>
                <div className="stat-num tnum" style={{ fontSize: 32 }}><CountUp value={imp[i]} /></div>
                <div className="stat-lab">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 16 }}>Tipi di connessione</div>
          <Bars data={byKind} color="var(--amber)" />
          <p className="faint" style={{ fontSize: 12, marginTop: 14 }}>Le connessioni non hanno datazione propria e restano costanti al variare dell'arco.</p>
        </div>
      </div>

      <Section eyebrow="Distribuzione" title="Opere per periodo">
        <Bars data={byPeriod} />
      </Section>

      <div className="two-col" style={{ marginTop: 56, alignItems: "start" }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 16 }}>Città più rappresentate</div>
          <Bars data={byCity} color="var(--verdigris)" />
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 16 }}>Densità di innovazioni</div>
          <Bars data={innovDensity} color="var(--gold-2)" />
        </div>
      </div>

      {active && works.length === 0 && (
        <p className="muted" style={{ marginTop: 40, textAlign: "center" }}>Nessuna opera nell'arco {range.min}–{range.max}.</p>
      )}

      <Section eyebrow="Personalizzazioni" title="Immagini personalizzate">
        {isAdmin ? (
          <OverridesManager />
        ) : (
          <p className="muted" style={{ fontSize: 13.5, maxWidth: 640, lineHeight: 1.55 }}>
            La gestione delle immagini personalizzate è riservata agli amministratori.
            Se sei un utente e vuoi suggerire una modifica a un'immagine, usa il pulsante “✎ Richiedi modifica” sulla scheda dell'opera.
          </p>
        )}
      </Section>
    </div>
  );
}

// --- gestione immagini personalizzate: elenco, export/import, ripristino ----
function OverridesManager() {
  const ix = useData();
  const [, force] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const map = getOverrides();
  const entries = Object.entries(map);

  const doExport = () => {
    const blob = new Blob([exportOverrides()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "immagini-personalizzate.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const doImport = (f: File) => {
    f.text().then((txt) => {
      try { const n = importOverrides(txt); alert(`Importate ${n} immagini personalizzate.`); force((x) => x + 1); }
      catch { alert("File non valido: atteso un JSON { \"id-opera\": { \"url\": \"…\" } }"); }
    });
  };

  return (
    <div>
      <p className="muted" style={{ fontSize: 13.5, maxWidth: 640, lineHeight: 1.55, marginBottom: 14 }}>
        Da ogni scheda opera puoi sostituire l'immagine con "Cambia immagine". Le personalizzazioni vivono in questo
        browser: esportale in JSON per conservarle o per chiedermi di integrarle nel dataset in modo permanente.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <button className="btn ghost sm" onClick={doExport} disabled={!entries.length} data-testid="ov-export">Esporta JSON ({entries.length})</button>
        <button className="btn ghost sm" onClick={() => fileRef.current?.click()} data-testid="ov-import">Importa JSON</button>
        <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.currentTarget.value = ""; }} />
        {entries.length > 0 && (
          <button className="btn ghost sm" onClick={() => { if (confirm("Ripristinare le immagini originali per tutte le opere?")) { clearAllOverrides(); force((x) => x + 1); } }} data-testid="ov-clear">
            Ripristina tutte
          </button>
        )}
      </div>
      {entries.length === 0
        ? <p className="faint" style={{ fontSize: 13 }}>Nessuna immagine personalizzata al momento.</p>
        : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 10 }}>
            {entries.map(([wid, ov]) => {
              const w = ix.workById.get(wid);
              return (
                <div key={wid} className="card" style={{ padding: 10, display: "flex", gap: 10, alignItems: "center" }}>
                  <img src={ov.url} alt="" style={{ width: 52, height: 40, objectFit: "cover", borderRadius: 6, border: "1px solid var(--line)" }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Link className="tlink" to={`/opera/${wid}`} style={{ fontSize: 13, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {w?.title ?? wid}
                    </Link>
                    <button className="faint" style={{ fontSize: 11.5, background: "none", border: 0, padding: 0, cursor: "pointer", textDecoration: "underline" }}
                      onClick={() => { clearOverride(wid); force((x) => x + 1); }}>ripristina</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
