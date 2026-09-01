// ============================================================================
// Home 3D — V4 "Cattedrale monumentale". Scena Three.js lazy-loaded (solo home).
// La cattedrale è SCENOGRAFIA pura: niente pietre-pagina, niente esplosione.
// Drammaturgia AUTOMATICA (10s, nessuno scroll richiesto): blueprint dall'alto →
// MATERIALIZZAZIONE dal basso verso l'alto (fronte d'onda dorato) → discesa in
// vista 3/4 della facciata.
// La navigazione vive nella SIDEBAR sinistra (vedi App/Sidebar).
// Loader con progresso reale. Mobile statico. prefers-reduced-motion: scena già
// materializzata. WebGL assente → fallback editoriale con griglia di link.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePrefersReducedMotion } from "../lib/motion";
import { STONES } from "../lib/pages";
import type { CathedralScene } from "../three/cathedral";

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch { return false; }
}

const PHASE_LABELS = [
  "01 · Disegno tecnico",
  "02 · Materializzazione",
  "03 · La facciata",
];

export default function Home3D() {
  const reduced = usePrefersReducedMotion();
  const navigate = useNavigate();
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CathedralScene | null>(null);

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [webgl] = useState(() => hasWebGL());
  const [mobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 760 : false));
  const [phase, setPhase] = useState(1);
  const [reveal, setReveal] = useState(0);

  // ---- loader: progresso reale (LoadingManager) + fallback fluido ----------
  const realProgress = useRef(0);
  useEffect(() => {
    if (!webgl) { setLoading(false); return; }
    let p = 0; let raf = 0; let ready = false;
    const tick = () => {
      const target = ready ? 100 : Math.max(realProgress.current * 88, p);
      p = Math.min(ready ? 100 : 92, p + Math.max(1.2, (target - p) * 0.18));
      setProgress(p);
      if (p < 100) raf = requestAnimationFrame(tick);
      else setTimeout(() => setLoading(false), 280);
    };
    raf = requestAnimationFrame(tick);
    (window as any).__cathReady = () => { ready = true; };
    return () => cancelAnimationFrame(raf);
  }, [webgl]);

  // ---- avvio scena (lazy import del modulo Three) --------------------------
  useEffect(() => {
    if (!webgl || !hostRef.current) return;
    let scene: CathedralScene | null = null;
    let cancelled = false;
    import("../three/cathedral").then(({ CathedralScene }) => {
      if (cancelled || !hostRef.current) return;
      scene = new CathedralScene(
        hostRef.current,
        {
          onReady: () => { (window as any).__cathReady?.(); },
          onProgress: (p) => { realProgress.current = p; },
          onPhase: (ph) => setPhase(ph),
          onReveal: (r) => setReveal(r),
        },
        reduced
      );
      sceneRef.current = scene;
      if (reduced) scene.setProgress(0.9);
    });
    return () => { cancelled = true; scene?.destroy(); sceneRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webgl, reduced]);

  // ---- animazione AUTOMATICA: 10 secondi dal blueprint alla facciata -------
  useEffect(() => {
    if (!webgl || reduced || loading) return;
    let raf = 0;
    const DURATA = 10000; // 10s totali (richiesta utente)
    const t0 = performance.now();
    const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const tick = (now: number) => {
      const t = Math.min((now - t0) / DURATA, 1);
      const v = ease(t);
      sceneRef.current?.setProgress(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [webgl, reduced, loading]);

  // ---------------------------------------------------------------------------
  // FALLBACK: nessun WebGL → griglia di link (usabilità garantita)
  // ---------------------------------------------------------------------------
  if (!webgl) {
    return (
      <div className="home3d-fallback wrap">
        <header className="h3d-fb-head">
          <div className="eyebrow">HUB Arte — Atlante Neuronale</div>
          <h1 className="h3d-fb-title">La cattedrale<br />del <em>sapere</em>.</h1>
          <p className="muted" style={{ maxWidth: 560, marginTop: 16 }}>
            Otto vie per attraversare l'Atlante. La scena 3D non è disponibile su
            questo dispositivo: usa il menù qui sotto o la sidebar a sinistra.
          </p>
        </header>
        <div className="h3d-fb-grid">
          {STONES.map((p) => (
            <button key={p.id} className="h3d-fb-card" data-testid={`fb-${p.id}`} onClick={() => navigate(p.route)}>
              <span className="h3d-fb-num">{p.num}</span>
              <span className="h3d-fb-name">{p.name}</span>
              <span className="h3d-fb-desc">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="home3d" data-testid="home3d" data-mobile={mobile ? "1" : "0"}>
      {/* SCENA FISSA */}
      <div className="h3d-stage" aria-hidden="true">
        <div ref={hostRef} className="h3d-canvas" data-testid="h3d-canvas" />

        {/* HUD mono agli angoli (italiano) */}
        <div className="h3d-hud">
          {/* alto destra — manifesto */}
          <div className="h3d-hud-tr">
            <span className="h3d-hud-tag">///// Manifesto</span>
            <p>La cattedrale prende corpo<br />dalla pietra, dal disegno<br />alla facciata.</p>
          </div>

          {/* basso destra — indicatore di fase + barra reveal */}
          <div className="h3d-hud-br">
            <span className="h3d-hud-fase-num">Fase {String(phase).padStart(2, "0")}/03</span>
            <span className="h3d-hud-fase-txt">{PHASE_LABELS[phase - 1]}</span>
            <span className="h3d-hud-reveal"><i style={{ width: `${Math.round(reveal * 100)}%` }} /></span>
          </div>
        </div>
      </div>


      {/* LOADER (progresso reale) */}
      {loading && (
        <div className="h3d-loader" data-testid="h3d-loader">
          <svg className="h3d-loader-mono" width="46" height="58" viewBox="0 0 46 58" fill="none"
            stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
            <path d="M23 2 L34 14 L34 56 L12 56 L12 14 Z" />
            <path d="M23 2 L23 14 M12 22 L34 22 M12 34 L34 34" />
            <circle cx="23" cy="10" r="3" />
          </svg>
          <div className="h3d-loader-bar"><i style={{ width: `${progress}%` }} /></div>
          <div className="h3d-loader-txt">Materializzazione della pietra · {Math.round(progress)}%</div>
        </div>
      )}
    </div>
  );
}
