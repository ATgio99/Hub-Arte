// ============================================================================
// Landing — pagina di benvenuto concisa e accattivante.
// Presenta il progetto come opensource con link al repo GitHub.
// ============================================================================
import { Link } from "react-router-dom";
import { useData } from "../lib/store";
import { CountUp } from "../components/ui";
import { useInViewOnce, EASE_OUT, usePrefersReducedMotion } from "../lib/motion";
import { motion } from "framer-motion";

const GITHUB_URL = "https://github.com/ATgio99/Hub-Arte";

export default function Landing() {
  const ix = useData();
  const reduced = usePrefersReducedMotion();
  const { ref, seen } = useInViewOnce(0.1);

  const stats = [
    { n: ix.ds.works.length, l: "Opere" },
    { n: ix.ds.artists.length, l: "Artisti" },
    { n: ix.ds.periods.length, l: "Periodi" },
    { n: ix.ds.terms.length, l: "Termini" },
    { n: ix.ds.techniques.length, l: "Tecniche" },
    { n: ix.ds.connections.length, l: "Connessioni" },
  ];

  const features = [
    { icon: "🖼️", title: "Catalogo opere", desc: "Schede dettagliate con immagini, analisi e innovazioni" },
    { icon: "🕸️", title: "Grafo neuronale", desc: "Visualizza le connessioni tra opere, artisti e periodi in 3D" },
    { icon: "📅", title: "Timeline multilivello", desc: "Periodi, eventi e artisti su una linea del tempo navigabile" },
    { icon: "🗺️", title: "Mappa geografica", desc: "Esplora i luoghi che custodiscono le opere" },
    { icon: "🎯", title: "Quiz interattivo", desc: "Mettiti alla prova con 18 tipi di domanda generati dal dataset" },
    { icon: "📚", title: "Glossario", desc: "Termini tecnici e definizioni sempre a portata di mano" },
  ];

  return (
    <div className="wrap page" style={{ maxWidth: 900, margin: "0 auto", padding: "20px 18px 60px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginTop: 20, marginBottom: 40 }}>
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
        >
          {/* Logo stella neurale */}
          <svg width="56" height="56" viewBox="0 0 48 48" fill="none" style={{ margin: "0 auto 16px" }}>
            <g stroke="var(--gold)" strokeWidth="2" strokeLinecap="round">
              <path d="M24 24 L24 7 M24 24 L24 41 M24 24 L8 24 M24 24 L40 24" />
              <path d="M24 24 L12.7 12.7 M24 24 L35.3 35.3 M24 24 L35.3 12.7 M24 24 L12.7 35.3" strokeWidth="1.5" />
            </g>
            <circle cx="24" cy="24" r="5" fill="var(--gold)" />
            <circle cx="24" cy="7" r="2.4" fill="var(--gold)" />
            <circle cx="40" cy="24" r="2.4" fill="var(--gold)" />
            <circle cx="24" cy="41" r="2" fill="var(--gold)" opacity=".85" />
            <circle cx="8" cy="24" r="2" fill="var(--gold)" opacity=".85" />
          </svg>

          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: "clamp(32px, 6vw, 52px)",
            lineHeight: 1.05, letterSpacing: "-.025em", marginBottom: 12,
          }}>
            HUB Art
          </h1>
          <p style={{
            fontSize: "clamp(16px, 3vw, 20px)", color: "var(--ink-soft)",
            maxWidth: "52ch", margin: "0 auto 12px", lineHeight: 1.55,
          }}>
            Atlante Neuronale di Storia dell'Arte — uno strumento di studio
            interattivo per esplorare opere, artisti e connessioni.
          </p>
          <p style={{
            fontSize: "clamp(14px, 2.5vw, 16px)", color: "var(--gold-deep)",
            fontWeight: 600, margin: "0 auto 24px", lineHeight: 1.5,
          }}>
            🎓 Gratuito · Open source · Senza pubblicità
          </p>

          {/* CTA */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
            <Link to="/opere" className="btn gold" style={{ fontSize: 15, padding: "12px 28px" }}>
              Esplora le opere →
            </Link>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
              className="btn ghost" style={{ fontSize: 15, padding: "12px 28px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 8 }}>
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </a>
          </div>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 12, color: "var(--ink-dim)",
            background: "var(--bg-2)", padding: "4px 12px", borderRadius: 999,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3f8a4f" }} />
            Progetto opensource · Licenza MIT
          </div>
        </motion.div>
      </div>

      {/* Stats */}
      <div ref={ref as any} style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
        gap: 12, marginBottom: 40, maxWidth: 700, margin: "0 auto 40px",
      }}>
        {stats.map((s, i) => (
          <motion.div
            key={s.l}
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: (seen || reduced) ? 1 : 0, y: (seen || reduced) ? 0 : 16 }}
            transition={{ duration: 0.5, ease: EASE_OUT, delay: reduced ? 0 : Math.min(i * 0.06, 0.3) }}
            style={{
              textAlign: "center", padding: "16px 8px",
              background: "var(--bg-2)", borderRadius: 10,
            }}
          >
            <div style={{ fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 700, color: "var(--gold-deep)" }}>
              <CountUp value={s.n} />
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>
              {s.l}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Features — card eleganti con bordo oro sottile */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 16, maxWidth: 840, margin: "0 auto 40px",
      }}>
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: (seen || reduced) ? 1 : 0, y: (seen || reduced) ? 0 : 20 }}
            transition={{ duration: 0.5, ease: EASE_OUT, delay: reduced ? 0 : Math.min(0.2 + i * 0.08, 0.6) }}
            style={{
              padding: "24px 22px", background: "var(--bg)", border: "1px solid var(--line)",
              borderRadius: 14, position: "relative", overflow: "hidden",
              transition: "border-color .2s, box-shadow .2s",
            }}
          >
            {/* Linea decorativa oro in alto */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 2,
              background: "linear-gradient(90deg, transparent, var(--gold), transparent)",
              opacity: 0.5,
            }} />
            {/* Icona SVG elegante invece di emoji */}
            <div style={{
              width: 40, height: 40, borderRadius: 10, marginBottom: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(184,138,46,0.1)",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold-deep)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                {i === 0 && <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></>}
                {i === 1 && <><circle cx="6" cy="6" r="2" /><circle cx="18" cy="8" r="2" /><circle cx="9" cy="18" r="2" /><path d="M8 7l8 1M8 8l1 8M17 10l-7 7" /></>}
                {i === 2 && <><path d="M3 12h18" /><circle cx="7" cy="12" r="1.5" /><circle cx="13" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /><path d="M7 12V7M13 12v5M19 12V8" /></>}
                {i === 3 && <><path d="M9 4L4 6v14l5-2 6 2 5-2V4l-5 2-6-2z" /><path d="M9 4v14M15 6v14" /></>}
                {i === 4 && <><path d="M9 11l2 2 4-4" /><rect x="4" y="4" width="16" height="16" rx="2" /></>}
                {i === 5 && <><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></>}
              </svg>
            </div>
            <h3 style={{ fontSize: 17, marginBottom: 6, fontFamily: "var(--font-display)" }}>{f.title}</h3>
            <p style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55, margin: 0 }}>{f.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: "center", padding: "24px 0", borderTop: "1px solid var(--line)",
        marginTop: 20,
      }}>
        <p style={{ fontSize: 13, color: "var(--ink-dim)", marginBottom: 8 }}>
          Dati: Wikimedia Commons · Mappe: OpenStreetMap
        </p>
        {/* Badge Netlify — richiesto per il Netlify Open Source Plan */}
        <a href="https://www.netlify.com" target="_blank" rel="noopener noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 12, color: "var(--ink-dim)", textDecoration: "none",
            marginBottom: 10, opacity: 0.8,
          }}
          title="Hosted on Netlify — Open Source Plan"
        >
          <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M163.35 24.5L32 96v64l131.35 71.5L224 200V56L163.35 24.5zm-2.7 28L192 67v122l-31.35 14.5L64 145.5v-35L160.65 52.5z"/>
          </svg>
          Hosted on Netlify
        </a>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", fontSize: 12 }}>
          <Link to="/legal/privacy" style={{ color: "var(--ink-dim)", textDecoration: "none" }}>Privacy</Link>
          <Link to="/legal/cookie" style={{ color: "var(--ink-dim)", textDecoration: "none" }}>Cookie</Link>
          <Link to="/legal/termini" style={{ color: "var(--ink-dim)", textDecoration: "none" }}>Termini</Link>
          <Link to="/legal/crediti" style={{ color: "var(--ink-dim)", textDecoration: "none" }}>Crediti</Link>
          <Link to="/legal/contatti" style={{ color: "var(--ink-dim)", textDecoration: "none" }}>Contatti</Link>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
            style={{ color: "var(--ink-dim)", textDecoration: "none" }}>
            GitHub ↗
          </a>
        </div>

        {/* Donazioni */}
        <div style={{
          marginTop: 20, padding: "16px 20px", background: "var(--bg-2)", borderRadius: 12,
          display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 10,
        }}>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0, lineHeight: 1.5 }}>
            HUB Art è gratuito e senza pubblicità. Se ti è utile, considera una donazione 💛
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <a href="https://www.buymeacoffee.com/hubart" target="_blank" rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                background: "#ffdd00", color: "#000", textDecoration: "none",
                border: "1px solid #e6c800",
              }}>
              ☕ Buy me a coffee
            </a>
            <a href="https://www.paypal.me/ATgio" target="_blank" rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                background: "#0070ba", color: "#fff", textDecoration: "none",
                border: "1px solid #005ea6",
              }}>
              💙 PayPal
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
