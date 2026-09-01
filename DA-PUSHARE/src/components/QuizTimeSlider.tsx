// ============================================================================
// QuizTimeSlider — slider a trascinamento con doppia maniglia + istogramma.
// Variante "locale" del TimeRangeSlider globale: stato controllato dal parent
// (perché nel quiz NON dobbiamo toccare il range globale dell'app).
// Stessa grafica del TimeRangeSlider (classi CSS .trs-* condivise).
// ============================================================================
import { useMemo } from "react";
import { useData } from "../lib/store";

const PRESETS: { label: string; min: number; max: number }[] = [
  { label: "Tardoantico", min: 280, max: 540 },
  { label: "Romanico", min: 1000, max: 1200 },
  { label: "Gotico", min: 1140, max: 1400 },
  { label: "Quattrocento", min: 1400, max: 1500 },
  { label: "Cinquecento", min: 1500, max: 1600 },
];

function fmt(y: number) { return y < 0 ? `${-y} a.C.` : `${y}`; }

export interface TimeRange { min: number; max: number; }

export default function QuizTimeSlider({
  range,
  bounds,
  onRangeChange,
  onReset,
}: {
  range: TimeRange;
  bounds: TimeRange;
  onRangeChange: (r: TimeRange) => void;
  onReset: () => void;
}) {
  const { ds } = useData();

  // istogramma densità opere (stesso del TimeRangeSlider globale)
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
  const active = range.min > bounds.min || range.max < bounds.max;
  const matchesPreset = (p: { min: number; max: number }) =>
    Math.abs(range.min - p.min) < 6 && Math.abs(range.max - p.max) < 6;

  return (
    <div className="trs" data-testid="quiz-time-slider">
      <div className="trs-head">
        <span className="trs-title">Intervallo storico del quiz</span>
        {active && <button className="trs-reset" onClick={onReset} data-testid="quiz-trs-reset">tutto</button>}
      </div>
      <div className="trs-vals tnum">
        <span data-testid="quiz-trs-min">{fmt(range.min)}</span>
        <span data-testid="quiz-trs-max">{fmt(range.max)}</span>
      </div>

      <div className="trs-track-wrap">
        <div className="trs-hist" aria-hidden="true">
          {bins.arr.map((v, i) => {
            const y = bounds.min + i * bins.step;
            const inSel = y + bins.step > range.min && y <= range.max;
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
          value={range.min} aria-label="Anno iniziale" data-testid="quiz-trs-input-min"
          onChange={(e) => onRangeChange({ min: Math.min(Number(e.target.value), range.max - 10), max: range.max })} />
        <input className="trs-input" type="range" min={bounds.min} max={bounds.max} step={10}
          value={range.max} aria-label="Anno finale" data-testid="quiz-trs-input-max"
          onChange={(e) => onRangeChange({ min: range.min, max: Math.max(Number(e.target.value), range.min + 10) })} />
      </div>

      <div className="trs-presets">
        {PRESETS.map((p) => (
          <button key={p.label}
            className={`trs-preset ${matchesPreset(p) ? "on" : ""}`}
            onClick={() => onRangeChange({ min: p.min, max: p.max })}
            data-testid={`quiz-trs-preset-${p.label.toLowerCase()}`}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
