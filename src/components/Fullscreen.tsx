// ============================================================================
// Wrapper "Schermo intero" riusabile per le visualizzazioni (rete, timeline,
// mappa). In fullscreen mostra:
//   - Pulsante "Esci" in alto a destra (sempre visibile, sopra tutto)
//   - Drawer laterale a destra (stile sidebar) con filtri e slider temporale
//   - Drawer apribile/chiudibile con un pulsante hamburger in basso a destra
//   - Il contenuto occupa tutto lo schermo a sinistra del drawer
// ============================================================================
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EASE_OUT } from "../lib/motion";
import TimeRangeSlider from "./TimeRangeSlider";

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

export default function Fullscreen({
  children, controls, title, showSlider = true, onChange,
}: {
  children: ReactNode;
  controls?: ReactNode;
  title?: string;
  showSlider?: boolean;
  onChange?: (full: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isFull, setFull] = useState(false);
  const [cssFallback, setCssFallback] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);

  const enter = useCallback(async () => {
    const el = ref.current;
    if (!el) return;
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouch && el.requestFullscreen) {
      try { await el.requestFullscreen(); setFull(true); setDrawerOpen(true); document.body.style.overflow = "hidden"; return; } catch { /* fallback */ }
    }
    setCssFallback(true); setFull(true); setDrawerOpen(true);
    document.body.style.overflow = "hidden";
  }, []);

  const exit = useCallback(async () => {
    if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch {} }
    setCssFallback(false); setFull(false);
    document.body.style.overflow = "";
  }, []);

  const toggle = useCallback(() => { isFull ? exit() : enter(); }, [isFull, enter, exit]);

  useEffect(() => {
    const onFs = () => {
      const native = !!document.fullscreenElement && document.fullscreenElement === ref.current;
      setFull(native || cssFallback);
      if (!native && !cssFallback) setFull(false);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [cssFallback]);

  useEffect(() => {
    if (!isFull) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && cssFallback) exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFull, cssFallback, exit]);

  useEffect(() => {
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => { onChange?.(isFull); }, [isFull, onChange]);

  if (!isFull) {
    return (
      <div ref={ref} className="fs-host" data-testid="fs-host">
        <button className="fs-btn" onClick={toggle} data-testid="fs-toggle"
          aria-label="Schermo intero" title="Schermo intero">
          <ExpandIcon on={false} />
          <span className="fs-btn-txt">Schermo intero</span>
        </button>
        {children}
      </div>
    );
  }

  // Fullscreen: drawer laterale stile sidebar + contenuto
  return (
    <div ref={ref} className="fs-host is-full" data-fullscreen={isFull} data-testid="fs-host">
      {/* Pulsante ESCI — sempre in alto a destra, sopra tutto */}
      <button
        onClick={exit}
        aria-label="Esci da schermo intero"
        title="Esci (Esc)"
        style={{
          position: "fixed", top: 14, right: 14, zIndex: 10000,
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "8px 16px", borderRadius: 999, cursor: "pointer",
          background: "rgba(251,248,241,.95)", backdropFilter: "blur(8px)",
          border: "1px solid var(--line)", color: "var(--ink)",
          fontSize: 13, fontWeight: 600, fontFamily: "inherit",
          boxShadow: "0 2px 12px rgba(0,0,0,.12)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
        Esci
      </button>

      {/* Titolo */}
      {title && (
        <div style={{
          position: "fixed", top: 18, left: 18, zIndex: 9998,
          fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ink)",
          pointerEvents: "none",
        }}>
          {title}
        </div>
      )}

      {/* Contenuto principale */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </div>

      {/* Drawer laterale destro — stesso stile della sidebar principale */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 9999,
              width: "min(300px, 88vw)",
              background: "rgba(251,248,241,.88)",
              backdropFilter: "blur(14px)",
              borderLeft: "1px solid var(--line)",
              borderRadius: "16px 0 0 16px",
              boxShadow: "-8px 0 30px rgba(0,0,0,.12)",
              overflowY: "auto",
              display: "flex", flexDirection: "column",
              paddingTop: 52,
            }}
          >
            {/* Header drawer */}
            <div style={{
              padding: "8px 16px 10px",
              borderBottom: "1px solid var(--line)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Filtri e impostazioni
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{
                  background: "none", border: 0, cursor: "pointer",
                  color: "var(--ink-dim)", fontSize: 20, lineHeight: 1,
                  padding: "2px 6px", borderRadius: 4,
                }}
                aria-label="Chiudi filtri"
              >
                ✕
              </button>
            </div>

            {/* Corpo drawer */}
            <div style={{ padding: "12px 16px 80px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Slider temporale — usa il componente della sidebar */}
              {showSlider && (
                <div className="sbx-trs" style={{ margin: "0 -4px" }}>
                  <TimeRangeSlider compact />
                </div>
              )}
              {/* Filtri specifici della vista */}
              {controls && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {controls}
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Pulsante per riaprire il drawer */}
      {!drawerOpen && (
        <button
          onClick={() => setDrawerOpen(true)}
          style={{
            position: "fixed", bottom: 14, right: 14, zIndex: 10000,
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "10px 16px", borderRadius: 999, cursor: "pointer",
            background: "rgba(251,248,241,.95)", backdropFilter: "blur(8px)",
            border: "1px solid var(--line)", color: "var(--ink)",
            fontSize: 13, fontWeight: 500, fontFamily: "inherit",
            boxShadow: "0 2px 12px rgba(0,0,0,.12)",
          }}
          aria-label="Apri filtri"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
          Filtri
        </button>
      )}
    </div>
  );
}
