// ============================================================================
// Sidebar moderna — pannello FLOTTANTE sinistro presente su TUTTE le pagine
// (home 3D inclusa). Carta semitrasparente con blur, hairline, staccata dai
// bordi (margine). Voci numerate 01-08 con icona sottile, sottolineatura
// animata in hover + micro-slide; voce attiva con pallino oro. In basso: slider
// temporale compatto (TimeRangeSlider del sito classico).
// Collassabile a sola colonna di icone (desktop). Su mobile: drawer da hamburger.
// ============================================================================
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { STONES } from "../lib/pages";
import { useAuth, isAdminEmail } from "../lib/auth";
import { supabase } from "../lib/supabase";
import TimeRangeSlider from "./TimeRangeSlider";

// icone sottili (stroke 1.5) coerenti, una per pagina
function Icon({ id }: { id: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (id) {
    case "opere": return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M4 8h16M9 3v18" /></svg>;
    case "artisti": return <svg {...common}><circle cx="12" cy="8" r="3.4" /><path d="M5 20c1.2-3.6 3.8-5.4 7-5.4s5.8 1.8 7 5.4" /></svg>;
    case "rete": return <svg {...common}><circle cx="6" cy="6" r="2" /><circle cx="18" cy="8" r="2" /><circle cx="9" cy="18" r="2" /><path d="M8 7l8 1M8 8l1 8M17 10l-7 7" /></svg>;
    case "timeline": return <svg {...common}><path d="M3 12h18" /><circle cx="7" cy="12" r="1.6" /><circle cx="13" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /><path d="M7 12V7M13 12v5M19 12V8" /></svg>;
    case "mappa": return <svg {...common}><path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2z" /><path d="M9 4v14M15 6v14" /></svg>;
    case "glossario": return <svg {...common}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></svg>;
    case "tecniche": return <svg {...common}><path d="M14 4l6 6-9 9-6 1 1-6 8-10z" /><path d="M12 6l6 6" /></svg>;
    case "statistiche": return <svg {...common}><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></svg>;
    case "test": return <svg {...common}><path d="M9 11l2 2 4-4" /><rect x="4" y="4" width="16" height="16" rx="2" /></svg>;
    default: return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>;
  }
}


function SidebarBody({ collapsed, onToggleCollapse, isHome, onNavigate }: {
  collapsed: boolean; onToggleCollapse: () => void; isHome: boolean; onNavigate?: () => void;
}) {
  const loc = useLocation();
  const { user } = useAuth();
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

  // Badge notifiche — logica diversa per admin vs utenti normali:
  //  - ADMIN: conta richieste pendenti degli utenti (pending in user_suggestions + user_edit_suggestions)
  //  - UTENTI NORMALI: conta proprie richieste revisionate dopo l'ultimo "visto"
  //    (reviewed_at > timestamp localStorage atlante:sugg-seen:<uid>)
  useEffect(() => {
    if (!user) { setPendingReviewCount(0); return; }
    const admin = isAdminEmail(user.email);
    let cancelled = false;

    const check = async () => {
      try {
        if (admin) {
          // ADMIN: conta richieste pendenti (suggerimenti nuove opere + modifiche)
          const [sugRes, editRes] = await Promise.all([
            supabase.from("user_suggestions").select("id", { count: "exact", head: true }).eq("status", "pending"),
            supabase.from("user_edit_suggestions").select("id", { count: "exact", head: true }).eq("status", "pending"),
          ]);
          const total = (sugRes.count || 0) + (editRes.count || 0);
          if (!cancelled) setPendingReviewCount(total);
        } else {
          // UTENTE NORMALE: conta proprie richieste revisionate dopo ultimo "visto"
          const seen = Number(localStorage.getItem(`atlante:sugg-seen:${user.id}`) || 0);
          const [sugRes, editRes] = await Promise.all([
            supabase.from("user_suggestions")
              .select("reviewed_at", { count: "exact" })
              .eq("user_id", user.id)
              .not("reviewed_at", "is", null),
            supabase.from("user_edit_suggestions")
              .select("reviewed_at", { count: "exact" })
              .eq("user_id", user.id)
              .not("reviewed_at", "is", null),
          ]);
          // Conta quelle revisionate dopo "seen"
          let count = 0;
          for (const r of (sugRes.data || [])) {
            if (r.reviewed_at && new Date(r.reviewed_at).getTime() > seen) count++;
          }
          for (const r of (editRes.data || [])) {
            if (r.reviewed_at && new Date(r.reviewed_at).getTime() > seen) count++;
          }
          if (!cancelled) setPendingReviewCount(count);
        }
      } catch { /* ignore */ }
    };

    check();
    const interval = setInterval(check, 30000);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [user]);

  return (
    <>
      {/* brand + collapse */}
      <div className="sbx-top">
        <Link to="/" className="sbx-brand" data-testid="sbx-brand" onClick={onNavigate} aria-label="HUB Art — home">
          {/* stella neurale dorata (logo HUB Art) */}
          <svg className="sbx-mono" width="30" height="30" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <g stroke="var(--gold)" strokeWidth="2" strokeLinecap="round">
              <path d="M24 24 L24 7 M24 24 L24 41 M24 24 L8 24 M24 24 L40 24" />
              <path d="M24 24 L12.7 12.7 M24 24 L35.3 35.3 M24 24 L35.3 12.7 M24 24 L12.7 35.3" strokeWidth="1.5" />
            </g>
            <circle cx="24" cy="24" r="5" fill="var(--gold)" />
            <circle cx="24" cy="7" r="2.4" fill="var(--gold)" />
            <circle cx="40" cy="24" r="2.4" fill="var(--gold)" />
            <circle cx="24" cy="41" r="2" fill="var(--gold)" opacity=".85" />
            <circle cx="8" cy="24" r="2" fill="var(--gold)" opacity=".85" />
            <circle cx="12.7" cy="12.7" r="1.7" fill="var(--gold)" opacity=".7" />
            <circle cx="35.3" cy="35.3" r="1.7" fill="var(--gold)" opacity=".7" />
            <circle cx="35.3" cy="12.7" r="1.7" fill="var(--gold)" opacity=".7" />
            <circle cx="12.7" cy="35.3" r="1.7" fill="var(--gold)" opacity=".7" />
          </svg>
          <span className="sbx-brand-txt">
            <b>HUB Art</b><i>Atlante Neuronale</i>
          </span>
        </Link>
        <button className="sbx-collapse" onClick={onToggleCollapse} data-testid="sbx-collapse"
          aria-label={collapsed ? "Espandi menù" : "Comprimi menù"} title={collapsed ? "Espandi" : "Comprimi"}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d={collapsed ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"} />
          </svg>
        </button>
      </div>

      {/* navigazione 01-09 */}
      <nav className="sbx-nav" data-testid="sbx-nav">
        {STONES.map((p) => {
          const active = loc.pathname === p.route || (isHome === false && loc.pathname.startsWith(p.route) && p.route !== "/");
          return (
            <Link key={p.id} to={p.route} onClick={onNavigate}
              className={`sbx-item ${active ? "active" : ""}`}
              data-testid={`sbx-item-${p.id}`} title={p.name}>
              <span className="sbx-num">{p.num}</span>
              <span className="sbx-ico"><Icon id={p.id} /></span>
              <span className="sbx-label">
                <b>{p.name}</b>
                <i>{p.desc}</i>
                <span className="sbx-underline" aria-hidden="true" />
              </span>
              <span className="sbx-dot" aria-hidden="true" />
            </Link>
          );
        })}
      </nav>

      {/* slider temporale */}
      <div className="sbx-foot">
        <div className="sbx-trs">
          <TimeRangeSlider compact />
        </div>

        {/* Voce profilo per UTENTI NORMALI loggati — mostra badge con richieste
            revisionate dall'admin (pendingReviewCount), pulsa per attirare attenzione. */}
        {user && !isAdminEmail(user.email) && (
          <Link
            to="/profile"
            onClick={onNavigate}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              marginTop: 4, padding: "6px 4px",
              textDecoration: "none", color: "var(--ink-dim)", fontSize: 12,
            }}
            title="Vedi il tuo profilo e lo storico delle tue richieste"
            data-testid="sbx-profile"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c1.2-4 4-6 8-6s6.8 2 8 6" />
            </svg>
            <span>Impostazioni profilo</span>
            {pendingReviewCount > 0 && (
              <span
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  marginLeft: "auto", minWidth: 18, height: 18, padding: "0 5px",
                  borderRadius: 999, background: "var(--c-event, #a8483f)",
                  color: "#fff", fontSize: 10, fontWeight: 700,
                  boxShadow: "0 1px 4px rgba(168,72,63,0.5)",
                  animation: "pulse 2s ease-in-out infinite",
                }}
                aria-label={`${pendingReviewCount} richieste revisionate dall'admin`}
              >
                {pendingReviewCount}
              </span>
            )}
          </Link>
        )}

        {/* Voce dashboard per ADMIN loggati — mostra badge con richieste pendenti degli utenti */}
        {user && isAdminEmail(user.email) && (
          <Link
            to="/admin"
            onClick={onNavigate}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              marginTop: 4, padding: "6px 4px",
              textDecoration: "none", color: "var(--gold-deep)", fontSize: 12, fontWeight: 600,
            }}
            title="Gestisci le richieste degli utenti"
            data-testid="sbx-admin"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
            </svg>
            <span>Dashboard admin</span>
            {pendingReviewCount > 0 && (
              <span
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  marginLeft: "auto", minWidth: 18, height: 18, padding: "0 5px",
                  borderRadius: 999, background: "var(--c-event, #a8483f)",
                  color: "#fff", fontSize: 10, fontWeight: 700,
                  boxShadow: "0 1px 4px rgba(168,72,63,0.5)",
                  animation: "pulse 2s ease-in-out infinite",
                }}
                aria-label={`${pendingReviewCount} richieste in attesa di revisione`}
              >
                {pendingReviewCount}
              </span>
            )}
          </Link>
        )}

        {/* account / sync indicator */}
        <Link to="/login" onClick={onNavigate} className="sbx-account" data-testid="sbx-account"
          style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, padding: "6px 4px", textDecoration: "none", color: "var(--ink-dim)", fontSize: 12 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={user ? "var(--gold)" : "currentColor"} strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="8" r="3.4" />
            <path d="M5 20c1.2-3.6 3.8-5.4 7-5.4s5.8 1.8 7 5.4" />
          </svg>
          <span style={{ color: user ? "var(--gold)" : undefined }}>
            {user ? (user.email?.split("@")[0] ?? "Account") : "Accedi"}
          </span>
          {user && <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--gold)" }}>✓ sync</span>}
        </Link>

        {/* footer legale — link alle pagine legali */}
        <div
          className="sbx-legal"
          style={{
            marginTop: 10, paddingTop: 8,
            borderTop: "1px solid var(--line)",
            display: "flex", flexWrap: "wrap", gap: "4px 10px",
            fontSize: 10.5, color: "var(--ink-dim)",
          }}
        >
          <Link to="/legal/privacy" onClick={onNavigate} style={{ color: "inherit", textDecoration: "none" }}>Privacy</Link>
          <span>·</span>
          <Link to="/legal/cookie" onClick={onNavigate} style={{ color: "inherit", textDecoration: "none" }}>Cookie</Link>
          <span>·</span>
          <Link to="/legal/termini" onClick={onNavigate} style={{ color: "inherit", textDecoration: "none" }}>Termini</Link>
          <span>·</span>
          <Link to="/legal/crediti" onClick={onNavigate} style={{ color: "inherit", textDecoration: "none" }}>Crediti</Link>
          <span>·</span>
          <Link to="/legal/contatti" onClick={onNavigate} style={{ color: "inherit", textDecoration: "none" }}>Contatti</Link>
        </div>

        {/* Netlify badge — richiesto per il Netlify Open Source Plan.
            Deve essere visibile su tutte le pagine (sidebar è sempre presente). */}
        <a
          href="https://www.netlify.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            marginTop: 6, fontSize: 10, color: "var(--ink-dim, #7a7570)",
            textDecoration: "none", opacity: 0.7,
          }}
          title="Hosted on Netlify — Open Source Plan"
        >
          <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M163.35 24.5L32 96v64l131.35 71.5L224 200V56L163.35 24.5zm-2.7 28L192 67v122l-31.35 14.5L64 145.5v-35L160.65 52.5z"/>
          </svg>
          Hosted on Netlify
        </a>
      </div>
    </>
  );
}

export default function Sidebar() {
  const loc = useLocation();
  const isHome = loc.pathname === "/";
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("atlante.sb.collapsed") === "1"; } catch { return false; }
  });
  const [drawer, setDrawer] = useState(false);

  // chiudi il drawer al cambio rotta
  useEffect(() => { setDrawer(false); }, [loc.pathname]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawer(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  // Blocca scroll del body quando il drawer è aperto (evita bug su mobile)
  useEffect(() => {
    if (drawer) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawer]);

  const toggleCollapse = () => {
    setCollapsed((c) => {
      const n = !c;
      try { localStorage.setItem("atlante.sb.collapsed", n ? "1" : "0"); } catch {}
      return n;
    });
  };

  return (
    <>
      {/* hamburger mobile (in alto a sinistra) — nascosto quando il drawer è aperto */}
      <button
        className="sbx-burger"
        onClick={() => setDrawer(true)}
        data-testid="sbx-burger"
        aria-label="Apri menù"
        style={{ display: drawer ? "none" : undefined }}
      >
        <span /><span /><span />
      </button>

      {/* pannello flottante desktop */}
      <aside className={`sbx ${collapsed ? "collapsed" : ""} ${isHome ? "on-home" : ""}`} data-testid="sidebar">
        <SidebarBody collapsed={collapsed} onToggleCollapse={toggleCollapse} isHome={isHome} />
      </aside>

      {/* drawer mobile */}
      <div className={`sbx-scrim ${drawer ? "show" : ""}`} onClick={() => setDrawer(false)} data-testid="sbx-scrim" />
      <aside className={`sbx sbx-drawer ${drawer ? "open" : ""}`} data-testid="sidebar-drawer" aria-hidden={!drawer}>
        <SidebarBody collapsed={false} onToggleCollapse={() => setDrawer(false)} isHome={isHome} onNavigate={() => setDrawer(false)} />
      </aside>
    </>
  );
}
