// ============================================================================
// LoginPrompt — popup modale che appare quando un utente non loggato prova
// a mettere un preferito o un'opera approfondita. Lo invita a registrarsi
// o accedere per salvare i suoi progressi nel cloud.
// ============================================================================
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

  // Esc per chiudere
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const msg = action === "approfondita"
    ? "Per segnare un'opera come approfondita e salvare i tuoi progressi"
    : "Per aggiungere un'opera ai preferiti e salvarla";

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, animation: "fadeIn .2s",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--bg)", borderRadius: 16, padding: "32px 28px",
          maxWidth: 420, width: "100%", textAlign: "center",
          boxShadow: "0 20px 60px -12px rgba(0,0,0,0.3)",
          border: "1px solid var(--line)",
        }}
      >
        {/* Icona */}
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "rgba(184,138,46,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 18px",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </div>

        <h3 style={{
          fontSize: 20, fontFamily: "var(--font-display)",
          marginBottom: 8, color: "var(--ink)",
        }}>
          Accedi o registrati
        </h3>

        <p style={{
          fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55,
          marginBottom: 24, maxWidth: "36ch", margin: "0 auto 24px",
        }}>
          {msg}, devi avere un account.
          <br />
          È gratuito e ti permette di sincronizzare i tuoi dati su tutti i dispositivi.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            className="btn gold"
            style={{ fontSize: 15, padding: "12px 24px" }}
            onClick={() => { setOpen(false); nav("/login"); }}
          >
            Accedi o registrati →
          </button>
          <button
            className="btn ghost sm"
            onClick={() => setOpen(false)}
          >
            Continua senza account
          </button>
        </div>
      </div>
    </div>
  );
}
