// ============================================================================
// CookieConsent — banner inferiore per informativa cookie.
// Persistenza scelta in localStorage (atlante.cookie.choice).
// Mostrato solo finché l'utente non ha espresso una scelta.
// ============================================================================
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "atlante.cookie.choice";
type Choice = "all" | "necessary" | null;

export default function CookieConsent() {
  const [choice, setChoice] = useState<Choice>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Choice;
      setChoice(stored);
    } catch { /* ignore */ }
    setReady(true);
  }, []);

  const save = (c: "all" | "necessary") => {
    try { localStorage.setItem(STORAGE_KEY, c); } catch { /* ignore */ }
    setChoice(c);
  };

  if (!ready || choice) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie e privacy"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        padding: "0 12px 12px",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          maxWidth: 760,
          width: "100%",
          background: "var(--bg-2, #f6f2ea)",
          border: "1px solid var(--line, rgba(0,0,0,0.12))",
          borderRadius: 14,
          boxShadow: "0 10px 36px rgba(0,0,0,0.18)",
          padding: "16px 18px",
          display: "flex",
          gap: 14,
          alignItems: "center",
        }}
      >
        {/* icona biscotto */}
        <svg
          aria-hidden="true"
          width="34" height="34" viewBox="0 0 24 24" fill="none"
          stroke="var(--gold-deep, #b88a2e)" strokeWidth="1.6"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <circle cx="12" cy="12" r="9" />
          <circle cx="9" cy="9" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="15" cy="11" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="10" cy="15" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="15" cy="16" r="0.9" fill="currentColor" stroke="none" />
        </svg>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ink, #1a1a1a)", marginBottom: 4 }}>
            Cookie e privacy
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-soft, #5b5550)", margin: 0 }}>
            Usiamo solo cookie tecnici necessari al funzionamento (login, preferiti) e cookie di terze parti per autenticazione (Supabase), font (Fontshare) e mappe (OpenStreetMap). Niente cookie di profilazione. Leggi la{" "}
            <Link to="/legal/cookie" style={{ color: "var(--gold-deep, #b88a2e)", textDecoration: "underline" }}>Cookie Policy</Link>
            {" "}e la{" "}
            <Link to="/legal/privacy" style={{ color: "var(--gold-deep, #b88a2e)", textDecoration: "underline" }}>Privacy Policy</Link>.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
          <button className="btn gold sm" onClick={() => save("all")} data-testid="cookie-accept-all">
            Accetta tutti
          </button>
          <button className="btn ghost sm" onClick={() => save("necessary")} data-testid="cookie-necessary-only">
            Solo necessari
          </button>
        </div>
      </div>
    </div>
  );
}
