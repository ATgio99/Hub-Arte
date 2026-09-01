// ============================================================================
// FiltroTempoFoglio — l'intervallo storico su telefono.
//
// Nel menu il cursore stava a una decina di pixel dal bordo sinistro dello
// schermo, ed e' esattamente la fascia in cui Safari per iPhone interpreta lo
// scorrimento come «torna indietro». Una pagina web quel gesto non lo puo'
// disattivare — non c'e' preventDefault che tenga, sparisce solo dentro l'app
// installata. L'unica soluzione e' geometrica: portare il comando via dal
// bordo.
//
// Qui il menu mostra una riga di riepilogo; toccandola sale un foglio dal
// basso, dove il cursore ha tutta la larghezza, le maniglie sono grandi
// abbastanza da prendersi con un dito e nessuna delle due sta sul bordo.
// L'istogramma della densita' resta: e' il pezzo che dice dove sono le opere,
// e senza quello si sceglie un intervallo alla cieca.
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useData, useTimeRange } from "../lib/store";

const PRESETS: { label: string; min: number; max: number }[] = [
  { label: "Tardoantico", min: 280, max: 540 },
  { label: "Romanico", min: 1000, max: 1200 },
  { label: "Gotico", min: 1140, max: 1400 },
  { label: "Quattrocento", min: 1400, max: 1500 },
  { label: "Cinquecento", min: 1500, max: 1600 },
];

function fmt(y: number) { return y < 0 ? `${-y} a.C.` : `${y}`; }

/** La riga nel menu: dice a che punto sta il filtro e apre il foglio. */
export function RigaIntervallo({ onApri }: { onApri: () => void }) {
  const { range, active } = useTimeRange();
  return (
    <button className={`fint-riga ${active ? "attivo" : ""}`} onClick={onApri}
      data-testid="apri-foglio-tempo" aria-haspopup="dialog">
      <span className="fint-riga-testo">
        <span className="fint-riga-et">Intervallo storico</span>
        <span className="fint-riga-val tnum">
          {fmt(range.min)} – {fmt(range.max)}{active ? "" : " · tutto"}
        </span>
        <span className="fint-riga-nota">
          {active ? "Filtro attivo su tutto il sito" : "Vale per tutto il sito"}
        </span>
      </span>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
    </button>
  );
}

export function FoglioIntervallo({ aperto, onChiudi }: { aperto: boolean; onChiudi: () => void }) {
  const { ds } = useData();
  const { range, bounds, setRange, reset, active, workIn } = useTimeRange();

  useEffect(() => {
    if (!aperto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onChiudi(); };
    window.addEventListener("keydown", onKey);
    // Lo scorrimento della pagina lo blocca gia' il menu, che e' l'unico modo
    // per arrivare qui. Bloccarlo una seconda volta significa avere due
    // padroni per la stessa proprieta': chiudendo il menu mentre il foglio e'
    // aperto, l'ultimo a rilasciare rimetterebbe il valore sbagliato e la
    // pagina resterebbe inchiodata.
    return () => window.removeEventListener("keydown", onKey);
  }, [aperto, onChiudi]);

  // Stesso conteggio del cursore del desktop: opere per intervallo, con la
  // scala a radice quadrata che rende visibili anche i decenni scarsi.
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
    return { arr, max: Math.max(...arr, 1), step, n };
  }, [ds, bounds]);

  const pct = (y: number) => ((y - bounds.min) / (bounds.max - bounds.min)) * 100;
  const uguale = (p: { min: number; max: number }) =>
    Math.abs(range.min - p.min) < 6 && Math.abs(range.max - p.max) < 6;

  // Si conta con lo stesso filtro che usa il resto del sito, non con una
  // regola scritta qui: la mia scartava le opere senza data, e il totale
  // diceva 1102 invece di 1115. Le opere non datate restano sempre visibili.
  const opereDentro = useMemo(() => ds.works.filter(workIn).length, [ds, workIn]);

  return createPortal(
    <AnimatePresence>
      {aperto && (
        <>
          <motion.div
            className="fint-velo"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onChiudi}
          />
          <motion.div
            className="fint-foglio" role="dialog" aria-modal="true"
            aria-label="Intervallo storico" data-testid="foglio-tempo"
            initial={{ y: "101%" }} animate={{ y: 0 }} exit={{ y: "101%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
          >
            <div className="fint-maniglia" aria-hidden />

            <div className="fint-testa">
              <h2>Intervallo storico</h2>
              {active && (
                <button className="fint-azzera" onClick={reset} data-testid="foglio-tempo-azzera">
                  Tutto
                </button>
              )}
            </div>

            <div className="fint-conto tnum">
              <b>{fmt(range.min)} – {fmt(range.max)}</b>
              <span>{opereDentro} {opereDentro === 1 ? "opera" : "opere"}</span>
            </div>
            <p className="fint-avviso">
              La scelta vale in tutto il sito: catalogo, protagonisti, mappa, rete,
              linea del tempo e statistiche mostrano solo quello che ci sta dentro.
            </p>

            <div className="fint-pista">
              <div className="fint-isto" aria-hidden>
                {bins.arr.map((v, i) => {
                  const y = bounds.min + i * bins.step;
                  const dentro = y + bins.step > range.min && y <= range.max;
                  const h = v > 0 ? Math.max(Math.sqrt(v / bins.max) * 100, 7) : 0;
                  return <span key={i} className={`fint-barra ${dentro ? "in" : ""}`} style={{ height: `${h}%` }} />;
                })}
              </div>
              <div className="fint-binario" />
              <div className="fint-scelto" style={{ left: `${pct(range.min)}%`, width: `${pct(range.max) - pct(range.min)}%` }} />
              <input className="fint-cursore" type="range" min={bounds.min} max={bounds.max} step={10}
                value={range.min} aria-label="Anno iniziale" data-testid="foglio-tempo-min"
                onChange={(e) => setRange({ min: Math.min(Number(e.target.value), range.max - 10), max: range.max })} />
              <input className="fint-cursore" type="range" min={bounds.min} max={bounds.max} step={10}
                value={range.max} aria-label="Anno finale" data-testid="foglio-tempo-max"
                onChange={(e) => setRange({ min: range.min, max: Math.max(Number(e.target.value), range.min + 10) })} />
            </div>

            <div className="fint-preset">
              {PRESETS.map((p) => (
                <button key={p.label} className={`fint-preset-b ${uguale(p) ? "on" : ""}`}
                  onClick={() => setRange({ min: p.min, max: p.max })}
                  data-testid={`foglio-tempo-preset-${p.label.toLowerCase()}`}>
                  {p.label}
                </button>
              ))}
            </div>

            <button className="fint-fatto" onClick={onChiudi} data-testid="foglio-tempo-fatto">
              Fatto
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
