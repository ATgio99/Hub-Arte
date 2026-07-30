// ============================================================================
// Utilità di animazione "stile Apple" — spring fisici, ease-out lunghi,
// stagger, count-up. Rispetta SEMPRE prefers-reduced-motion.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import type { Variants } from "framer-motion";

// --- preferenza utente (reattiva) -------------------------------------------
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

// --- curve condivise --------------------------------------------------------
export const EASE_OUT = [0.16, 1, 0.3, 1] as const; // ease-out lungo, "Apple"
export const SPRING = { type: "spring", stiffness: 320, damping: 30, mass: 0.9 } as const;
export const SPRING_SOFT = { type: "spring", stiffness: 210, damping: 26 } as const;

// --- varianti reveal con stagger -------------------------------------------
export const revealContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
};
export const revealItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};
export const revealItemSoft: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

// transizione di pagina morbida
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE_OUT } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.24, ease: EASE_OUT } },
};

// --- count-up: numero che conta fino a target -------------------------------
export function useCountUp(target: number, opts?: { duration?: number; start?: boolean; decimals?: number }) {
  const { duration = 1100, start = true, decimals = 0 } = opts ?? {};
  const reduced = usePrefersReducedMotion();
  const [val, setVal] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (!start) return;
    if (reduced) { setVal(target); return; }
    const t0 = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      // ease-out cubico
      const e = 1 - Math.pow(1 - p, 3);
      setVal(from + (target - from) * e);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration, start, reduced]);
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

// componente helper per il count-up: si attiva quando entra in viewport
export function useInViewOnce(threshold = 0.3) {
  const ref = useRef<HTMLElement | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver((ents) => {
      if (ents.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); }
    }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return { ref, seen };
}
