import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { EASE_OUT } from "../lib/motion";

export default function LoginPrompt() {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<string>("");
  const nav = useNavigate();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setAction(detail?.action || "");
      setOpen(true);
    };
    window.addEventListener("atlante:login-required", handler);
    return () => window.removeEventListener("atlante:login-required", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  const isApprofondita = action === "approfondita";
  const msg = isApprofondita
    ? "Per segnare un'opera come <b>approfondita</b> e salvare i tuoi progressi"
    : "Per aggiungere un'opera ai <b>preferiti</b> e salvarla";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-live="polite"
          aria-label="Accesso richiesto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            background: "rgba(26,20,14,0.55)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.94, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 16, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: 440, width: "100%",
              background: "var(--bg, #faf6ee)",
              border: "1px solid rgba(184,138,46,0.25)",
              borderRadius: 18,
              boxShadow: "0 24px 70px rgba(20,16,12,0.35), 0 4px 12px rgba(20,16,12,0.15)",
              padding: "32px 28px 24px",
              overflow: "hidden",
            }}
          >
            {/* Linea decorativa oro in alto */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 3,
              background: "linear-gradient(90deg, transparent 0%, var(--gold, #d4a017) 35%, var(--gold-deep, #b88a2e) 65%, transparent 100%)",
            }} />

            {/* Icona bookmark in cerchio */}
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "rgba(184,138,46,0.12)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                  stroke="var(--gold-deep, #b88a2e)" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </div>
            </div>

            {/* Titolo */}
            <h3 style={{
              fontFamily: "var(--font-display, 'Zodiak', serif)",
              fontSize: 24, fontWeight: 500,
              color: "var(--ink, #1a1a1a)",
              textAlign: "center",
              marginBottom: 14, lineHeight: 1.2,
              letterSpacing: "-.01em",
            }}>
              Accedi o registrati
            </h3>

            {/* Corpo testo */}
            <div style={{ maxWidth: 360, margin: "0 auto 20px" }}>
              <p style={{
                fontSize: 14.5, lineHeight: 1.65,
                color: "var(--ink-soft, #5b5550)", margin: 0,
              }}
                dangerouslySetInnerHTML={{ __html: `${msg}, devi avere un account.` }}
              />
              <p style={{
                fontSize: 13.5, lineHeight: 1.6,
                color: "var(--ink-dim, #8a8580)", margin: "10px 0 0",
                fontStyle: "italic", textAlign: "center",
              }}>
                È gratuito e ti permette di sincronizzare i tuoi dati su tutti i dispositivi.
              </p>
            </div>

            {/* Bottoni */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                className="btn gold sm"
                onClick={() => { setOpen(false); nav("/login"); }}
                style={{
                  padding: "11px 24px",
                  fontSize: 14.5, fontWeight: 600,
                  justifyContent: "center",
                  textTransform: "none",
                }}
              >
                Accedi o registrati →
              </button>
              <button
                className="btn ghost sm"
                onClick={() => setOpen(false)}
                style={{
                  fontSize: 13.5,
                  justifyContent: "center",
                  textTransform: "none",
                }}
              >
                Continua senza account
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
