import { useMemo } from "react";
import { useData, useTimeRange } from "../lib/store";

// Preset rapidi (richiesti dal brief). Gli anni sono indicativi e cliccabili.
const PRESETS: { label: string; min: number; max: number }[] = [
  { label: "Tardoantico", min: 280, max: 540 },
  { label: "Romanico", min: 1000, max: 1200 },
  { label: "Gotico", min: 1140, max: 1400 },
  { label: "Quattrocento", min: 1400, max: 1500 },
  { label: "Cinquecento", min: 1500, max: 1600 },
];

function fmt(y: number) { return y < 0 ? `${-y} a.C.` : `${y}`; }

/**
 * Slider globale di intervallo storico — doppia maniglia con mini-istogramma
 * di densità delle opere per decennio. Compatto per la sidebar.
 */
export default function TimeRangeSlider({ compact = true }: { compact?: boolean }) {
  const { ds } = useData();
  const { range, bounds, setRange, reset, active } = useTimeRange();

  // istogramma: opere per intervallo nell'arco assoluto.
  // ~56 barre leggibili: lo step si adatta all'ampiezza del dataset.
  const bins = useMemo(() => {
    const TARGET = 56;
    const span = Math.max(1, bounds.max - bounds.min);
    const step = Math.max(10, Math.round(span / TARGET / 10) * 10);
    const n = Math.max(1, Math.ceil(span / step));
    const arr = new Array(n).fill(0);
    for (const w of ds.works) {
      const y = w.year_end ?? w.year_start;
      if (y == null) continue;
      const i = Math.floor((y - bounds.min) / step);
      if (i >= 0 && i < n) arr[i]++;
    }
    const max = Math.max(...arr, 1);
    return { arr, max, step, n };
  }, [ds, bounds]);

  const pct = (y: number) => ((y - bounds.min) / (bounds.max - bounds.min)) * 100;

  const matchesPreset = (p: { min: number; max: number }) =>
    Math.abs(range.min - p.min) < 6 && Math.abs(range.max - p.max) < 6;

  return (
    <div className={`trs ${compact ? "" : "inline"}`} data-testid="time-range-slider">
      <div className="trs-head">
        <span className="trs-title">Intervallo storico</span>
        {active && <button className="trs-reset" onClick={reset} data-testid="trs-reset">reset</button>}
      </div>
      <div className="trs-vals tnum">
        <span data-testid="trs-min">{fmt(range.min)}</span>
        <span data-testid="trs-max">{fmt(range.max)}</span>
      </div>

      <div className="trs-track-wrap">
        {/* istogramma di densità */}
        <div className="trs-hist" aria-hidden="true">
          {bins.arr.map((v, i) => {
            const y = bounds.min + i * bins.step;
            const inSel = y + bins.step > range.min && y <= range.max;
            // scala radice quadrata: rende leggibili anche i decenni meno popolati
            const h = v > 0 ? Math.max(Math.sqrt(v / bins.max) * 100, 8) : 0;
            return (
              <span key={i} className={`trs-bar ${inSel ? "in" : ""}`}
                style={{ height: `${h}%` }} />
            );
          })}
        </div>
        <div className="trs-rail" />
        <div className="trs-range" style={{ left: `${pct(range.min)}%`, width: `${pct(range.max) - pct(range.min)}%` }} />
        <input className="trs-input" type="range" min={bounds.min} max={bounds.max} step={10}
          value={range.min} aria-label="Anno iniziale" data-testid="trs-input-min"
          onChange={(e) => setRange({ min: Math.min(Number(e.target.value), range.max - 10), max: range.max })} />
        <input className="trs-input" type="range" min={bounds.min} max={bounds.max} step={10}
          value={range.max} aria-label="Anno finale" data-testid="trs-input-max"
          onChange={(e) => setRange({ min: range.min, max: Math.max(Number(e.target.value), range.min + 10) })} />
      </div>

      <div className="trs-presets">
        {PRESETS.map((p) => (
          <button key={p.label}
            className={`trs-preset ${matchesPreset(p) ? "on" : ""}`}
            onClick={() => setRange({ min: p.min, max: p.max })}
            data-testid={`trs-preset-${p.label.toLowerCase()}`}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
