// ============================================================================
// Wrapper "Schermo intero" riusabile per le visualizzazioni (rete, timeline,
// mappa, ...). Usa la Fullscreen API quando disponibile, con fallback CSS
// position:fixed inset:0. In fullscreen mostra uno slider temporale compatto
// flottante e un pulsante/Esc per uscire. Transizione fluida.
// ============================================================================
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useData, useTimeRange } from "../lib/store";
import { EASE_OUT } from "../lib/motion";

function ExpandIcon({ on }: { on: boolean }) {
  return on ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 9H4M9 9V4M15 9h5M15 9V4M9 15H4M9 15v5M15 15h5M15 15v5" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}

// ---- mini slider compatto flottante ----------------------------------------
function fmtY(y: number) { return y < 0 ? `${-y} a.C.` : `${y}`; }

function FloatingSlider() {
  const { ds } = useData();
  const { range, bounds, setRange, reset, active } = useTimeRange();
  const pct = (y: number) => ((y - bounds.min) / (bounds.max - bounds.min)) * 100;

  // mini-istogramma densità opere
  const bins = (() => {
    const N = 44;
    const span = Math.max(1, bounds.max - bounds.min);
    const step = span / N;
    const arr = new Array(N).fill(0);
    for (const w of ds.works) {
      const y = w.year_end ?? w.year_start;
      if (y == null) continue;
      const i = Math.min(N - 1, Math.floor((y - bounds.min) / step));
      if (i >= 0) arr[i]++;
    }
    const max = Math.max(...arr, 1);
    return { arr, max, step };
  })();

  return (
    <motion.div className="fs-slider" data-testid="fs-slider"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.32, ease: EASE_OUT }}>
      <div className="fs-slider-head">
        <span className="fs-slider-vals tnum">{fmtY(range.min)} – {fmtY(range.max)}</span>
        {active && <button className="trs-reset" onClick={reset} data-testid="fs-trs-reset">tutto</button>}
      </div>
      <div className="fs-slider-track">
        <div className="fs-hist" aria-hidden="true">
          {bins.arr.map((v, i) => {
            const y = bounds.min + i * bins.step;
            const inSel = y + bins.step > range.min && y <= range.max;
            const h = v > 0 ? Math.max(Math.sqrt(v / bins.max) * 100, 10) : 0;
            return <span key={i} className={`fs-hist-bar ${inSel ? "in" : ""}`} style={{ height: `${h}%` }} />;
          })}
        </div>
        <div className="fs-rail" />
        <div className="fs-range" style={{ left: `${pct(range.min)}%`, width: `${pct(range.max) - pct(range.min)}%` }} />
        <input className="fs-input" type="range" min={bounds.min} max={bounds.max} step={10}
          value={range.min} aria-label="Anno iniziale" data-testid="fs-trs-min"
          onChange={(e) => setRange({ min: Math.min(Number(e.target.value), range.max - 10), max: range.max })} />
        <input className="fs-input" type="range" min={bounds.min} max={bounds.max} step={10}
          value={range.max} aria-label="Anno finale" data-testid="fs-trs-max"
          onChange={(e) => setRange({ min: range.min, max: Math.max(Number(e.target.value), range.min + 10) })} />
      </div>
    </motion.div>
  );
}

export interface FullscreenHandle { isFull: boolean; }

/**
 * Avvolge una visualizzazione, aggiungendo un pulsante "Schermo intero" in alto
 * a destra. In fullscreen: sfondo carta a tutto schermo, slider compatto
 * flottante, controlli extra opzionali e uscita con Esc o pulsante.
 */
export default function Fullscreen({
  children, controls, title, showSlider = true, onChange,
}: {
  children: ReactNode;
  controls?: ReactNode;        // controlli essenziali della vista (chip, zoom…)
  title?: string;
  showSlider?: boolean;
  onChange?: (full: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isFull, setFull] = useState(false);
  const [cssFallback, setCssFallback] = useState(false);

  const enter = useCallback(async () => {
    const el = ref.current;
    if (!el) return;
    if (el.requestFullscreen) {
      try { await el.requestFullscreen(); return; } catch { /* fallback */ }
    }
    setCssFallback(true); setFull(true);
  }, []);

  const exit = useCallback(async () => {
    if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch {} }
    setCssFallback(false); setFull(false);
  }, []);

  const toggle = useCallback(() => { isFull ? exit() : enter(); }, [isFull, enter, exit]);

  // sincronizza con eventi nativi (Esc del browser)
  useEffect(() => {
    const onFs = () => {
      const native = !!document.fullscreenElement && document.fullscreenElement === ref.current;
      setFull(native || cssFallback);
      if (!native && !cssFallback) setFull(false);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [cssFallback]);

  // Esc per uscire dal fallback CSS (la Fullscreen API gestisce Esc da sola)
  useEffect(() => {
    if (!isFull) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && cssFallback) exit(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFull, cssFallback, exit]);

  useEffect(() => { onChange?.(isFull); }, [isFull, onChange]);

  return (
    <div ref={ref} className={`fs-host ${isFull ? "is-full" : ""}`} data-fullscreen={isFull} data-testid="fs-host">
      <button className="fs-btn" onClick={toggle} data-testid="fs-toggle"
        aria-label={isFull ? "Esci da schermo intero" : "Schermo intero"}
        title={isFull ? "Esci (Esc)" : "Schermo intero"}>
        <ExpandIcon on={isFull} />
        <span className="fs-btn-txt">{isFull ? "Esci" : "Schermo intero"}</span>
      </button>

      {isFull && title && <div className="fs-title">{title}</div>}

      {children}

      <AnimatePresence>
        {isFull && controls && (
          <motion.div className="fs-controls" data-testid="fs-controls"
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}>
            {controls}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFull && showSlider && <FloatingSlider />}
      </AnimatePresence>
    </div>
  );
}
