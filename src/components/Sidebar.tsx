// ============================================================================
// Sidebar moderna — pannello FLOTTANTE sinistro presente su TUTTE le pagine
// (home 3D inclusa). Carta semitrasparente con blur, hairline, staccata dai
// bordi (margine). Voci numerate 01-08 con icona sottile, sottolineatura
// animata in hover + micro-slide; voce attiva con pallino oro. In basso: slider
// temporale compatto (TimeRangeSlider del sito classico).
// Collassabile a sola colonna di icone (desktop). Su mobile: drawer da hamburger.
// ============================================================================
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { STONES } from "../lib/pages";
import { useAuth, isAdminEmail } from "../lib/auth";
import { useData } from "../lib/store";
import { entityLabel } from "../lib/data";
import { supabase } from "../lib/supabase";
import {
  getLastOpera, clearLastOpera, getLastArtista, clearLastArtista,
  getLastRete, clearLastRete, getLastMappa, clearLastMappa,
  getLastTimeline, clearLastTimeline,
  getLastTest, clearLastTest,
} from "../lib/lastVisited";
import type { EntityType } from "../lib/types";
import TimeRangeSlider from "./TimeRangeSlider";
import { RigaIntervallo, FoglioIntervallo } from "./FiltroTempoFoglio";
import { useIsNarrow } from "../lib/motion";
import IconaSezione from "./IconaSezione";

// icone sottili (stroke 1.5) coerenti, una per pagina
const Icon = ({ id }: { id: string }) => <IconaSezione id={id} />;



// Condiviso fra le due istanze della barra: e' un momento nel tempo, non uno
// stato di un componente, quindi vive fuori da React.
let ultimoControlloRichieste = 0;

function SidebarBody({ collapsed, onToggleCollapse, isHome, onNavigate }: {
  collapsed: boolean; onToggleCollapse: () => void; isHome: boolean; onNavigate?: () => void;
}) {
  const loc = useLocation();
  const nav = useNavigate();
  const { user } = useAuth();
  const ix = useData();
  // Stessa soglia dell'hamburger: sotto i 900px il menu e' un drawer attaccato
  // al bordo, ed e' li' che il cursore del tempo diventa impossibile da usare.
  const suTelefono = useIsNarrow(900);
  const [foglioTempo, setFoglioTempo] = useState(false);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

  // === Memoria ultima opera/artista visitati ===
  // Leggiamo gli ID dal localStorage e li risolviamo nei titoli/nomi tramite
  // il dataset, per mostrare un'etichetta "Continua → <titolo>" nella voce
  // di menu. Rileggiamo al cambio rotta (loc.pathname) così quando l'utente
  // apre una nuova opera/artista la sidebar si aggiorna.
  const [lastOperaId, setLastOperaId] = useState<string | null>(null);
  const [lastArtistaId, setLastArtistaId] = useState<string | null>(null);
  const [lastReteFocus, setLastReteFocus] = useState<string | null>(null);
  const [lastReteQuery, setLastReteQuery] = useState<string>("");
  const [lastMappaCity, setLastMappaCity] = useState<string | null>(null);
  const [lastTimelineId, setLastTimelineId] = useState<string | null>(null);
  // === Test in corso (sessione di quiz salvata) ===
  // Memorizziamo un'etichetta leggibile ("Domanda N di M" o "Ripasso · N di M")
  // da mostrare sotto la voce "Test" del menu. Aggiornata al cambio rotta e
  // quando riceviamo l'evento custom "atlante:last-visited-changed" (emesso
  // dal Test.tsx quando la sessione viene salvata o abbandonata).
  const [lastTestLabel, setLastTestLabel] = useState<string | null>(null);
  const refreshLastTest = () => {
    const saved = getLastTest();
    if (saved && saved.questions.length > 0) {
      const idx = Math.min(saved.idx, saved.questions.length - 1);
      const prefix = saved.mode === "ripasso" ? "Ripasso · " : "";
      setLastTestLabel(`${prefix}Domanda ${idx + 1} di ${saved.questions.length}`);
    } else {
      setLastTestLabel(null);
    }
  };
  useEffect(() => {
    setLastOperaId(getLastOpera());
    setLastArtistaId(getLastArtista());
    const r = getLastRete();
    setLastReteFocus(r?.focusNode ?? null);
    setLastReteQuery(r?.searchQuery ?? "");
    setLastMappaCity(getLastMappa());
    setLastTimelineId(getLastTimeline());
    refreshLastTest();
  }, [loc.pathname]);
  // Ascoltiamo anche un evento custom, così la sidebar si aggiorna in tempo
  // reale se l'utente apre una scheda opera/artista in un altro tab.
  useEffect(() => {
    const onUpdate = () => {
      setLastOperaId(getLastOpera());
      setLastArtistaId(getLastArtista());
      const r = getLastRete();
      setLastReteFocus(r?.focusNode ?? null);
      setLastReteQuery(r?.searchQuery ?? "");
      setLastMappaCity(getLastMappa());
      setLastTimelineId(getLastTimeline());
      refreshLastTest();
    };
    window.addEventListener("atlante:last-visited-changed", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("atlante:last-visited-changed", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);
  const lastOperaTitle = lastOperaId ? ix.workById.get(lastOperaId)?.title : null;
  const lastArtistaName = lastArtistaId ? ix.artistById.get(lastArtistaId)?.name : null;
  // Risolvi il focusNode del grafo (formato "type:id") in un'etichetta leggibile
  const lastReteLabel = (() => {
    if (!lastReteFocus) return null;
    const [type, ...rest] = lastReteFocus.split(":");
    const id = rest.join(":");
    if (!type || !id) return null;
    const label = entityLabel(ix, type as EntityType, id);
    return label || lastReteQuery || null;
  })();
  const lastMappaLabel = lastMappaCity ?? null;
  const lastTimelineLabel = lastTimelineId ? (ix.periodById.get(lastTimelineId)?.name ?? null) : null;

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

    // Questo controllo partiva a ogni `focus` della finestra, senza freno, e
    // partiva due volte perche' la barra e' montata due volte — pannello del
    // desktop e drawer del telefono. Alt-tab ripetuti facevano quattro query
    // ognuno. Ora c'e' un limite condiviso fra le due istanze: al massimo una
    // verifica ogni cinque minuti, salvo quando siamo noi ad aver mandato una
    // proposta, che e' l'unico momento in cui il numero cambia davvero.
    const controllaSeServe = (forzato = false) => {
      const ora = Date.now();
      if (!forzato && ora - ultimoControlloRichieste < 300000) return;
      if (!forzato && document.visibilityState !== "visible") return;
      ultimoControlloRichieste = ora;
      check();
    };

    controllaSeServe();
    const alRientro = () => { if (document.visibilityState === "visible") controllaSeServe(); };
    const suProposta = () => controllaSeServe(true);
    document.addEventListener("visibilitychange", alRientro);
    window.addEventListener("atlante:suggestions-changed", suProposta);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", alRientro);
      window.removeEventListener("atlante:suggestions-changed", suProposta);
    };
  }, [user?.id]);

  return (
    <>
      {/* brand + collapse */}
      <div className="sbx-top">
        <Link to="/" className="sbx-brand" data-testid="sbx-brand" onClick={onNavigate} aria-label="HUB Arte — home">
          {/* stella neurale dorata (logo HUB Arte) */}
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
            <b>HUB Arte</b><i>Atlante Neuronale</i>
          </span>
        </Link>
        {/* Su telefono questo comando chiude il pannello, e allora porta una
            croce: l'hamburger che restava li' era lo stesso segno che l'aveva
            aperto, dalla parte sbagliata. Sul desktop invece comprime, e
            restano le tre linee. */}
        <button className="sbx-collapse" onClick={suTelefono ? onNavigate : onToggleCollapse}
          data-testid={suTelefono ? "sbx-chiudi" : "sbx-collapse"}
          aria-label={suTelefono ? "Chiudi il menù" : collapsed ? "Espandi menù" : "Comprimi menù"}
          title={suTelefono ? "Chiudi" : collapsed ? "Espandi" : "Comprimi"}>
          {suTelefono ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      {/* navigazione 01-09 */}
      <nav className="sbx-nav" data-testid="sbx-nav">
        {STONES.map((p) => {
          const active = loc.pathname === p.route || (isHome === false && loc.pathname.startsWith(p.route) && p.route !== "/");
          // Per Opere e Artisti: logica doppio click
          // 1° click: se c'è un'ultima opera/artista visitata, vai lì
          // 2° click (se già su quella pagina): vai alla home della sezione
          const handleClick = (e: React.MouseEvent) => {
            if (p.id === "opere") {
              const lastOpera = getLastOpera();
              // Se siamo già sulla pagina dell'ultima opera, o non c'è un'ultima opera,
              // vai alla home delle opere
              if (!lastOpera || loc.pathname === `/opera/${lastOpera}`) {
                clearLastOpera();
                window.dispatchEvent(new CustomEvent("atlante:last-visited-changed"));
                e.preventDefault();
                nav("/opere");
                onNavigate?.();
                return;
              }
              // Altrimenti vai all'ultima opera visitata
              e.preventDefault();
              nav(`/opera/${lastOpera}`);
              onNavigate?.();
              return;
            }
            if (p.id === "artisti") {
              const lastArtista = getLastArtista();
              if (!lastArtista || loc.pathname === `/artista/${lastArtista}`) {
                clearLastArtista();
                window.dispatchEvent(new CustomEvent("atlante:last-visited-changed"));
                e.preventDefault();
                nav("/artisti");
                onNavigate?.();
                return;
              }
              e.preventDefault();
              nav(`/artista/${lastArtista}`);
              onNavigate?.();
              return;
            }
            if (p.id === "rete") {
              // Stessa logica di Opere/Artisti:
              // 1° click: se siamo già sulla pagina Rete, emetti "reset" (il grafo
              //    svuota focus + ricerca). Se non siamo sulla Rete ma c'è una
              //    ricerca salvata, vai alla Rete (il grafo ripristinerà lo stato).
              // 2° click (siamo già sulla Rete): emetti "reset" e basta.
              // Nota: il route della Rete è "/grafo" (vedi pages.ts), non "/rete".
              if (loc.pathname === "/grafo" || loc.pathname.startsWith("/grafo")) {
                // Siamo già sulla Rete: resetta il grafo
                clearLastRete();
                window.dispatchEvent(new CustomEvent("atlante:rete-reset"));
                e.preventDefault();
                onNavigate?.();
                return;
              }
              // Non siamo sulla Rete: vai alla Rete (il grafo ripristinerà
              // automaticamente l'ultima ricerca grazie all'useEffect di restore)
              // Niente preventDefault: lascia che il Link navighi normalmente
              onNavigate?.();
              return;
            }
            if (p.id === "mappa") {
              // Stessa logica di Opere/Artisti:
              // 1° click: se c'è un'ultima città salvata e NON siamo sulla sua scheda,
              //    vai alla scheda del luogo. Se siamo già sulla scheda della città
              //    salvata (o non c'è città salvata), vai alla Mappa e resetta.
              const lastCity = getLastMappa();
              if (lastCity && loc.pathname !== `/luogo/${encodeURIComponent(lastCity)}`) {
                e.preventDefault();
                nav(`/luogo/${encodeURIComponent(lastCity)}`);
                onNavigate?.();
                return;
              }
              // Siamo già sulla scheda dell'ultima città, o non c'è città salvata:
              // resetta e vai alla Mappa
              clearLastMappa();
              window.dispatchEvent(new CustomEvent("atlante:last-visited-changed"));
              e.preventDefault();
              nav("/mappa");
              onNavigate?.();
              return;
            }
            if (p.id === "timeline") {
              // Stessa logica di Opere/Artisti:
              // 1° click: se c'è un ultimo periodo salvato e NON siamo sulla sua scheda,
              //    vai alla scheda del periodo. Se siamo già sulla scheda del periodo
              //    salvato (o non c'è periodo salvato), vai alla Timeline e resetta.
              const lastPid = getLastTimeline();
              if (lastPid && loc.pathname !== `/periodo/${lastPid}`) {
                e.preventDefault();
                nav(`/periodo/${lastPid}`);
                onNavigate?.();
                return;
              }
              // Siamo già sulla scheda dell'ultimo periodo, o non c'è periodo salvato:
              // resetta e vai alla Linea del tempo
              clearLastTimeline();
              window.dispatchEvent(new CustomEvent("atlante:last-visited-changed"));
              e.preventDefault();
              nav("/timeline");
              onNavigate?.();
              return;
            }
            if (p.id === "test") {
              // Logica "Continua" per il Test — simile a quella della Rete:
              // 1° click (NON siamo sulla pagina Test): se c'è un test in corso
              //    salvato, vai a /test (la pagina lo ripristinerà automaticamente
              //    dal localStorage). Se non c'è test in corso, vai semplicemente
              //    al setup del quiz.
              // 2° click (siamo GIÀ sulla pagina Test): emetti "atlante:test-reset"
              //    per far abbandonare il test corrente e tornare al setup.
              if (loc.pathname === "/test" || loc.pathname.startsWith("/test")) {
                // Siamo già sulla pagina Test: resetta
                clearLastTest();
                window.dispatchEvent(new CustomEvent("atlante:test-reset"));
                window.dispatchEvent(new CustomEvent("atlante:last-visited-changed"));
                e.preventDefault();
                onNavigate?.();
                return;
              }
              // Non siamo sulla pagina Test: il Link navigherà normalmente a /test,
              // dove la pagina ripristinerà la sessione salvata (se presente).
              onNavigate?.();
              return;
            }
            // Per le altre voci: navigazione normale
            onNavigate?.();
          };
          return (
            <Link key={p.id} to={p.route} onClick={handleClick}
              className={`sbx-item ${active ? "active" : ""} ${
                p.id === "opere" && lastOperaId ? "has-last" :
                p.id === "artisti" && lastArtistaId ? "has-last" :
                p.id === "rete" && lastReteFocus ? "has-last" :
                p.id === "mappa" && lastMappaCity ? "has-last" :
                p.id === "timeline" && lastTimelineId ? "has-last" :
                p.id === "test" && lastTestLabel ? "has-last" : ""
              }`}
              data-testid={`sbx-item-${p.id}`} title={p.name}>
              <span className="sbx-num">{p.num}</span>
              <span className="sbx-ico"><Icon id={p.id} /></span>
              <span className="sbx-label">
                <b style={{ display: "inline-flex", alignItems: "baseline", gap: 5 }}>
                  <span>{p.name}</span>
                  {p.id === "rete" && (
                    <span style={{
                      fontSize: 9, fontWeight: 700,
                      color: "var(--ink-dim)", opacity: 0.5,
                      textTransform: "lowercase", letterSpacing: "0.02em",
                      lineHeight: 1,
                    }}>(beta)</span>
                  )}
                  {p.id === "timeline" && (
                    <span style={{
                      fontSize: 9, fontWeight: 700,
                      color: "var(--ink-dim)", opacity: 0.5,
                      textTransform: "lowercase", letterSpacing: "0.02em",
                      lineHeight: 1,
                    }}>(beta)</span>
                  )}
                </b>
                {/* Etichetta "Continua → <titolo>" — visibile solo se c'è
                    un'ultima opera/artista/ricerca/luogo/periodo salvato e la
                    sidebar NON è collassata. */}
                {p.id === "opere" && lastOperaTitle && !collapsed && (
                  <span className="sbx-continue" data-testid="sbx-continue-opere">
                    <span className="sbx-continue-label">Continua</span>
                    <span className="sbx-continue-name">{lastOperaTitle}</span>
                  </span>
                )}
                {p.id === "artisti" && lastArtistaName && !collapsed && (
                  <span className="sbx-continue" data-testid="sbx-continue-artisti">
                    <span className="sbx-continue-label">Continua</span>
                    <span className="sbx-continue-name">{lastArtistaName}</span>
                  </span>
                )}
                {p.id === "rete" && lastReteLabel && !collapsed && (
                  <span className="sbx-continue" data-testid="sbx-continue-rete">
                    <span className="sbx-continue-label">Continua</span>
                    <span className="sbx-continue-name">{lastReteLabel}</span>
                  </span>
                )}
                {p.id === "mappa" && lastMappaLabel && !collapsed && (
                  <span className="sbx-continue" data-testid="sbx-continue-mappa">
                    <span className="sbx-continue-label">Continua</span>
                    <span className="sbx-continue-name">{lastMappaLabel}</span>
                  </span>
                )}
                {p.id === "timeline" && lastTimelineLabel && !collapsed && (
                  <span className="sbx-continue" data-testid="sbx-continue-timeline">
                    <span className="sbx-continue-label">Continua</span>
                    <span className="sbx-continue-name">{lastTimelineLabel}</span>
                  </span>
                )}
                {p.id === "test" && lastTestLabel && !collapsed && (
                  <span className="sbx-continue" data-testid="sbx-continue-test">
                    <span className="sbx-continue-label">Continua</span>
                    <span className="sbx-continue-name">{lastTestLabel}</span>
                  </span>
                )}
                {/* Niente descrizione sotto il nome: «Opere — Catalogo delle
                    opere» diceva due volte la stessa cosa e raddoppiava
                    l'altezza della riga. La seconda riga resta libera per
                    l'unica cosa che cambia nel tempo, cioe' dove eri rimasto. */}
                <span className="sbx-underline" aria-hidden="true" />
              </span>
              <span className="sbx-dot" aria-hidden="true" />
            </Link>
          );
        })}
      </nav>

      {/* Intervallo storico: sul desktop il cursore sta nel menu, dove col
          mouse si prende senza problemi. Su telefono diventa una riga che apre
          un foglio dal basso — nel menu le maniglie finivano sul bordo dello
          schermo, dove lo scorrimento e' gia' preso dal gesto di sistema. */}
      <div className="sbx-foot">
        <div className="sbx-trs">
          {suTelefono ? (
            <RigaIntervallo onApri={() => setFoglioTempo(true)} />
          ) : (
            <TimeRangeSlider compact />
          )}
        </div>

        {/* Voce profilo per UTENTI NORMALI loggati — mostra badge con richieste
            revisionate dall'admin (pendingReviewCount), pulsa per attirare attenzione. */}
        {user && !isAdminEmail(user.email) && (
          <Link
            to="/profile"
            onClick={onNavigate}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              marginTop: 2, padding: "4px 4px",
              textDecoration: "none", color: "var(--ink-dim)", fontSize: 11.5,
            }}
            title="I tuoi contributi"
            data-testid="sbx-profile"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.1-2.1 2.6-2.4z" />
            </svg>
            <span>Contributi</span>
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
        {user && isAdminEmail(user.email) && (<>
          <Link
            to="/admin"
            onClick={onNavigate}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              marginTop: 2, padding: "4px 4px",
              textDecoration: "none", color: "var(--gold-deep)", fontSize: 11.5, fontWeight: 600,
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
          <Link
            to="/profile"
            onClick={onNavigate}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              marginTop: 2, padding: "4px 4px",
              textDecoration: "none", color: "var(--ink-dim)", fontSize: 11.5,
            }}
            title="I tuoi contributi"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.1-2.1 2.6-2.4z" />
            </svg>
            <span>Contributi</span>
          </Link>
        </>)}

        {/* account / sync indicator */}
        <Link to="/login" onClick={onNavigate} className="sbx-account" data-testid="sbx-account"
          style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, padding: "4px 4px", textDecoration: "none", color: "var(--ink-dim)", fontSize: 11.5 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={user ? "var(--gold)" : "currentColor"} strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="8" r="3.4" />
            <path d="M5 20c1.2-3.6 3.8-5.4 7-5.4s5.8 1.8 7 5.4" />
          </svg>
          <span style={{ color: user ? "var(--gold)" : undefined }}>
            {user ? (user.email?.split("@")[0] ?? "Account") : "Accedi"}
          </span>
          {user && <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--gold)" }}>✓ sync</span>}
        </Link>

        {/* Footer legale. I separatori erano elementi a se' stanti e potevano
            finire a inizio riga, orfani: adesso sono attaccati al link che li
            precede, quindi vanno a capo insieme a lui. L'ordine e' quello
            dell'uso reale, non quello legale. */}
        <div className="sbx-legal">
          {[
            { a: "/legal/progetto", t: "Progetto & IA" },
            { a: "/legal/accessibilita", t: "Accessibilità" },
            { a: "/legal/contatti", t: "Contatti" },
            { a: "/legal/crediti", t: "Crediti" },
            { a: "/legal/privacy", t: "Privacy" },
            { a: "/legal/cookie", t: "Cookie" },
            { a: "/legal/termini", t: "Termini" },
          ].map((v) => (
            <Link key={v.a} to={v.a} onClick={onNavigate}>{v.t}</Link>
          ))}
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

      <FoglioIntervallo aperto={foglioTempo} onChiudi={() => setFoglioTempo(false)} />
    </>
  );
}

export default function Sidebar() {
  const loc = useLocation();
  // Tema scuro disabilitato: la sidebar usa sempre il tema chiaro, anche nella
  // landing page, per coerenza con le altre pagine del sito.
  const isHome = false;
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("atlante.sb.collapsed") === "1"; } catch { return false; }
  });
  const [drawer, setDrawer] = useState(false);

  // chiudi il drawer al cambio rotta
  useEffect(() => { setDrawer(false); }, [loc.pathname]);

  // Quando il drawer si chiude, rimuovi il focus da eventuali elementi al suo
  // interno — evita il warning "Blocked aria-hidden on focused element".
  useEffect(() => {
    if (drawer) return;
    const active = document.activeElement as HTMLElement | null;
    if (active && active.closest?.(".sbx-drawer")) {
      active.blur();
    }
  }, [drawer]);

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

  // La scorciatoia «M» arriva da fuori: il menu e' l'unico a sapere se e'
  // aperto, quindi la decisione resta qui.
  useEffect(() => {
    const onScorciatoia = () => {
      if (window.matchMedia("(max-width: 900px)").matches) setDrawer((d) => !d);
      else toggleCollapse();
    };
    window.addEventListener("atlante:scorciatoia-menu", onScorciatoia);
    return () => window.removeEventListener("atlante:scorciatoia-menu", onScorciatoia);
  });

  const toggleCollapse = () => {
    setCollapsed((c) => {
      const n = !c;
      try { localStorage.setItem("atlante.sb.collapsed", n ? "1" : "0"); } catch {}
      return n;
    });
  };

  return (
    <>
      {/* Il comando che apre il menu, in alto a sinistra. Con il drawer aperto
          non sparisce di colpo: le tre linee si chiudono in croce e il tasto si
          ritira sotto al pannello, cosi' il gesto si vede. A chiudere e' poi la
          ✕ dentro al pannello, che sta dove il pollice la trova. */}
      <button
        className={`sbx-burger ${drawer ? "aperto" : ""}`}
        onClick={() => setDrawer((d) => !d)}
        data-testid="sbx-burger"
        aria-label={drawer ? "Chiudi menù" : "Apri menù"}
        aria-expanded={drawer}
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
