import { Link } from "react-router-dom";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { useData, useTimeRange } from "../lib/store";
import { WorkCard, Section, CountUp, RevealGroup, RevealChild } from "../components/ui";
import { EASE_OUT, usePrefersReducedMotion } from "../lib/motion";

const FEATURES = [
  { to: "/timeline", n: "01", t: "Linea del tempo", d: "Epoche, correnti e scuole in una gerarchia navigabile, con flussi di contaminazione ed eventi storici ancorati al contesto." },
  { to: "/grafo", n: "02", t: "Rete delle connessioni", d: "Le sinapsi tra artisti, opere, periodi e tecniche: passa il mouse su un nodo per accenderne i legami." },
  { to: "/mappa", n: "03", t: "Mappa & contaminazioni", d: "I centri del potere e i flussi che plasmano l'arte: modelli, tecniche e committenze viaggiano tra le città." },
  { to: "/opere", n: "04", t: "Catalogo opere", d: "Ogni scheda raccoglie immagine, datazione, tecniche, terminologia e le connessioni con le altre opere." },
  { to: "/glossario", n: "05", t: "Glossario & tecniche", d: "Terminologia, archetipi ricorrenti e l'evoluzione delle tecniche, da chi le introduce a chi le riprende." },
  { to: "/test", n: "06", t: "Autovalutazione", d: "Quiz a risposta chiusa generati dal dataset: autore, periodo, tecnica, datazione e riconoscimento dall'immagine." },
];

// Costellazione decorativa — rete neuronale leggera su carta.
function HeroConstellation() {
  const nodes = [[78, 22], [88, 38], [70, 48], [92, 60], [82, 74], [66, 68], [96, 28], [74, 33], [86, 52], [62, 40], [90, 84]];
  const edges = [[0,1],[0,3],[1,2],[2,5],[3,4],[1,6],[0,7],[2,8],[7,9],[4,10],[5,9],[6,8]];
  return (
    <svg className="hero-constellation" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {edges.map(([a, b], i) => (
        <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]}
          stroke="var(--gold-deep)" strokeWidth="0.16" opacity="0.4" />
      ))}
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 0.85 : 0.5}
          fill={i % 4 === 0 ? "var(--amber)" : i % 3 === 0 ? "var(--gold)" : "var(--gold-deep)"}>
          <animate attributeName="opacity" values="0.35;0.95;0.35" dur={`${3 + (i % 4)}s`} repeatCount="indefinite" begin={`${i * 0.3}s`} />
        </circle>
      ))}
    </svg>
  );
}

const DECADE = 20; // ampiezza bin per la densità temporale (anni)

// barre orizzontali che crescono all'ingresso in viewport
function GrowingBars({ rows, max }: { rows: [string, number][]; max: number }) {
  const reduced = usePrefersReducedMotion();
  return (
    <div>
      {rows.map(([label, n]) => (
        <div className="bar-row" key={label}>
          <span style={{ fontSize: 13 }}>{label}</span>
          <div className="bar-track">
            <motion.div className="bar-fill" style={{ width: reduced ? `${(n / max) * 100}%` : undefined }}
              initial={reduced ? false : { width: 0 }} whileInView={{ width: `${(n / max) * 100}%` }}
              viewport={{ once: true }} transition={{ duration: 0.9, ease: EASE_OUT }} />
          </div>
          <span className="tnum">{n}</span>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { ds } = useData();
  const { range, bounds, workIn, periodIn } = useTimeRange();

  const works = useMemo(() => ds.works.filter(workIn), [ds, workIn]);

  const featured = useMemo(() => {
    const cap = works.filter((w) => w.importance === 3 && w.image_thumb);
    const seen = new Set<string>(); const out: typeof cap = [];
    for (const w of cap) { if (!seen.has(w.type)) { seen.add(w.type); out.push(w); } }
    return out.concat(cap.filter((w) => !out.includes(w))).slice(0, 8);
  }, [works]);

  // KPI filtrate dall'intervallo
  const periods = useMemo(() => ds.periods.filter(periodIn), [ds, periodIn]);
  const cities = useMemo(() => new Set(works.map((w) => w.location_city).filter(Boolean)).size, [works]);
  const correnti = useMemo(() => periods.filter((p) => p.type === "corrente").length, [periods]);

  const stats = [
    { n: works.length, l: "opere", to: "/opere" },
    { n: periods.length, l: "periodi", to: "/timeline" },
    { n: correnti, l: "correnti", to: "/timeline" },
    { n: cities, l: "luoghi", to: "/mappa" },
  ];

  // "il programma in dati": opere per corrente (barre) + densità temporale
  const byCorrente = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of works) {
      const p = ds.periods.find((x) => x.id === w.period_id);
      const key = p?.name ?? w.period_id;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    const max = Math.max(...m.values(), 1);
    return { rows: [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7), max };
  }, [works, ds]);

  const density = useMemo(() => {
    const n = Math.max(1, Math.round((bounds.max - bounds.min) / DECADE));
    const arr = new Array(n).fill(0);
    for (const w of ds.works) {
      const y = w.year_end ?? w.year_start;
      if (y == null) continue;
      const i = Math.floor((y - bounds.min) / DECADE);
      if (i >= 0 && i < n) arr[i]++;
    }
    const max = Math.max(...arr, 1);
    return { arr, max, n };
  }, [ds, bounds]);

  const periodById = useMemo(() => new Map(ds.periods.map((p) => [p.id, p])), [ds]);
  void periodById;

  return (
    <div>
      <section className="hero">
        <HeroConstellation />
        <div className="hero-inner">
          <div className="hero-copy fadeup">
            <div className="eyebrow" style={{ marginBottom: 20 }}>Atlante di Storia dell'Arte</div>
            <h1 className="hero-title">
              L'arte come <em>rete</em><br />di connessioni.
            </h1>
            <p className="page-lead" style={{ marginTop: 26, maxWidth: 620 }}>
              Dal Tardoantico alla Controriforma: esplora opere, artisti, tecniche e
              contaminazioni culturali come una rete di nodi interconnessi, non come un elenco
              da memorizzare. Usa lo slider temporale per restringere ogni vista a un'epoca.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
              <Link to="/timeline" className="btn amber" data-testid="cta-timeline">Apri la linea del tempo →</Link>
              <Link to="/grafo" className="btn ghost" data-testid="cta-grafo">Esplora la rete</Link>
            </div>
          </div>
        </div>
        <div className="hero-stats">
          {stats.map((s) => (
            <Link key={s.l} to={s.to} className="hero-stat">
              <div className="hero-stat-n tnum"><CountUp value={s.n} /></div>
              <div className="hero-stat-l">{s.l}</div>
            </Link>
          ))}
        </div>
      </section>

      <div className="wrap" style={{ paddingBottom: 56 }}>
        {/* IL PROGRAMMA IN DATI */}
        <Section num="I" eyebrow="Il programma in dati"
          title="Una lettura quantitativa"
          right={<Link to="/dashboard" className="btn sm ghost">Statistiche complete →</Link>}>
          <div className="two-col" style={{ alignItems: "start" }}>
            <div>
              <div className="smallcaps" style={{ marginBottom: 16 }}>Opere per corrente</div>
              <GrowingBars rows={byCorrente.rows} max={byCorrente.max} />
            </div>
            <div>
              <div className="smallcaps" style={{ marginBottom: 16 }}>Densità temporale delle opere</div>
              <div className="density" aria-hidden="true">
                {density.arr.map((v, i) => {
                  const y = bounds.min + i * DECADE;
                  const inSel = y >= range.min - DECADE && y <= range.max;
                  return <i key={i} title={`${y}: ${v}`} style={{ height: `${Math.max((v / density.max) * 100, 2)}%`, background: inSel ? "var(--gold)" : "var(--line)" }} />;
                })}
              </div>
              <div className="density-axis">
                <span>{bounds.min}</span><span>{Math.round((bounds.min + bounds.max) / 2)}</span><span>{bounds.max}</span>
              </div>
            </div>
          </div>
        </Section>

        <Section num="II" eyebrow="Strumenti" title="Sei modi di attraversare il programma">
          <RevealGroup className="feat-grid">
            {FEATURES.map((f) => (
              <RevealChild key={f.to} soft>
                <Link to={f.to} className="feat" data-testid={`feat-${f.to.slice(1)}`} style={{ height: "100%" }}>
                  <span className="feat-num">{f.n}</span>
                  <h3>{f.t}</h3>
                  <p className="muted" style={{ fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>{f.d}</p>
                </Link>
              </RevealChild>
            ))}
          </RevealGroup>
        </Section>

        <Section num="III" eyebrow="Opere capitali" title="Dall'archivio"
          right={<Link to="/opere" className="btn sm ghost">Tutte le opere →</Link>}>
          <RevealGroup className="grid-works">
            {featured.map((w) => <RevealChild key={w.id} soft><WorkCard work={w} /></RevealChild>)}
          </RevealGroup>
        </Section>
      </div>
    </div>
  );
}
