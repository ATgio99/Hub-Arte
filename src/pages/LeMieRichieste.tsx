// ============================================================================
// LeMieRichieste — pagina per UTENTI normali (loggati, non admin).
// Rotta: /le-mie-richieste
//
// Mostra lo storico di TUTTE le richieste inviate dall'utente:
//   1. Proposte di nuove opere (user_suggestions)
//   2. Suggerimenti di modifica a opere esistenti (user_edit_suggestions)
//
// Per ogni richiesta: stato (pending/approved/rejected), data, contenuto,
// nota admin (se presente). Link all'opera per le modifiche proposte.
// ============================================================================
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth, CONTACT_EMAIL } from "../lib/auth";
import { getFavorites, clearAllFavorites } from "../lib/favorites";
import { getStudied, clearAllStudied } from "../lib/studied";
import { fullSync } from "../lib/sync";

interface SuggestionRow {
  id: string;
  title: string;
  artist: string | null;
  year: string | null;
  location: string | null;
  description: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface EditSuggestionRow {
  id: string;
  work_id: string;
  work_title: string;
  field: string;
  proposed_value: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const STATUS_LABEL: Record<SuggestionRow["status"], string> = {
  pending: "In attesa",
  approved: "Approvata",
  rejected: "Rifiutata",
};
const STATUS_COLOR: Record<SuggestionRow["status"], string> = {
  pending: "var(--c-event, #a8483f)",
  approved: "#3f8a4f",
  rejected: "#7a7a7a",
};

const FIELD_LABELS: Record<string, string> = {
  title: "Titolo", summary: "Sintesi", analysis: "Analisi", date_text: "Datazione",
  year_start: "Anno inizio", year_end: "Anno fine", type: "Tipologia",
  location_city: "Città", location_place: "Luogo", materials: "Materiali",
  image_url: "URL immagine", image_thumb: "Thumbnail", image_source: "Fonte immagine",
  importance: "Importanza", artist: "Autore", period: "Periodo",
  technique: "Tecnica", term: "Termine",
};

export default function LeMieRichieste() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [editSuggestions, setEditSuggestions] = useState<EditSuggestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Feedback sincronizzazione (banner verde/rosso)
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  // Azzeramento progressi (zona pericolosa)
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [sugRes, editRes] = await Promise.all([
        supabase.from("user_suggestions")
          .select("id, title, artist, year, location, description, status, admin_note, created_at, reviewed_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("user_edit_suggestions")
          .select("id, work_id, work_title, field, proposed_value, reason, status, admin_note, created_at, reviewed_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      if (sugRes.error) throw sugRes.error;
      if (editRes.error) throw editRes.error;
      setSuggestions((sugRes.data as SuggestionRow[]) || []);
      setEditSuggestions((editRes.data as EditSuggestionRow[]) || []);
      // Reset del contatore "visto" — l'utente sta visualizzando le richieste ora
      try { localStorage.setItem(`atlante:sugg-seen:${user.id}`, String(Date.now())); } catch {}
    } catch (e: any) {
      setError(e.message || "Errore caricamento richieste");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // ---- SINCRONIZZAZIONE CLOUD ----
  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    setSyncFeedback(null);
    try {
      await fullSync(user);
      const favs = getFavorites();
      const studied = getStudied();
      setSyncFeedback(
        `✓ Sincronizzato! ${favs.works.length + favs.artists.length} preferiti, ${studied.length} approfondite nel cloud.`
      );
    } catch (e: any) {
      setSyncFeedback(`✗ Errore di sincronizzazione: ${e.message || "sync fallita"}`);
    } finally {
      setSyncing(false);
    }
  };

  // ---- AZZERA TUTTI I PROGRESSI (zona pericolosa) ----
  const handleResetProgress = async () => {
    if (!user) return;
    const confirmed = window.confirm(
      "⚠️ CONFERMA AZZERAMENTO TOTALE\n\n" +
      "Stai per cancellare TUTTI i tuoi progressi:\n" +
      "  • Tutti i preferiti (★)\n" +
      "  • Tutte le opere approfondite (✓)\n" +
      "  • I dati corrispondenti sul cloud Supabase\n\n" +
      "Questa azione è IRREVERSIBILE.\n\nVuoi procedere?"
    );
    if (!confirmed) return;

    setResetting(true);
    setSyncFeedback("⏳ Azzeramento in corso...");

    // 1) Pulisci localStorage SUBITO (sincrono) — feedback immediato
    try {
      localStorage.removeItem("atlante:favorites");
      localStorage.removeItem("atlante:studied");
      window.dispatchEvent(new CustomEvent("atlante:favs-changed"));
      window.dispatchEvent(new CustomEvent("atlante:studied-changed"));
    } catch { /* ignore */ }

    // 2) Attendi la delete su Supabase con Promise.all
    try {
      await Promise.all([
        clearAllFavorites(),
        clearAllStudied(),
      ]);
    } catch { /* ignore — il localStorage è già pulito */ }

    // 3) Ricarica dopo 2 secondi per mostrare il feedback
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  if (!user) {
    return (
      <div className="wrap page" style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: "clamp(26px,4vw,38px)", marginBottom: 16 }}>Le mie richieste</h1>
        <p style={{ fontSize: 16, color: "var(--ink-soft)" }}>
          Per vedere lo storico delle tue richieste devi avere un account.
        </p>
        <p style={{ fontSize: 16, color: "var(--ink-soft)", marginTop: 12 }}>
          In alternativa, puoi scriverci a{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="tlink">{CONTACT_EMAIL}</a>.
        </p>
        <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
          <Link to="/login" className="btn gold">Accedi o registrati</Link>
          <Link to="/opere" className="btn ghost">Torna alle opere</Link>
        </div>
      </div>
    );
  }

  const fmtDate = (s: string) => new Date(s).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  // Statistiche
  const stats = {
    sugPending: suggestions.filter(s => s.status === "pending").length,
    sugApproved: suggestions.filter(s => s.status === "approved").length,
    sugRejected: suggestions.filter(s => s.status === "rejected").length,
    editPending: editSuggestions.filter(s => s.status === "pending").length,
    editApproved: editSuggestions.filter(s => s.status === "approved").length,
    editRejected: editSuggestions.filter(s => s.status === "rejected").length,
  };

  const total = suggestions.length + editSuggestions.length;

  return (
    <div className="wrap page">
      <div className="page-head" style={{ marginBottom: 18 }}>
        <div className="page-eyebrow"><span className="sec-num">★</span><span className="eyebrow">Il tuo account</span></div>
        <h1 className="page-title">Impostazioni profilo</h1>
        <p className="page-lead">
          Qui trovi lo storico di tutte le richieste che hai inviato: proposte di nuove opere e suggerimenti di modifica.
          Quando un admin le revisiona, riceverai una notifica (badge che pulsa nel menù) e potrai vedere il responso qui.
        </p>
      </div>

      {/* Info utente */}
      <div style={{ padding: "12px 16px", background: "var(--bg-2)", borderRadius: 10, marginBottom: 20, fontSize: 13.5 }}>
        <b>Account:</b> {user.email}
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "rgba(168,72,63,0.08)", color: "#a8483f", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Riepilogo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
        <div style={{ padding: "14px 16px", background: "var(--bg-2)", borderRadius: 10, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--ink)" }}>{total}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>Totale</div>
        </div>
        <div style={{ padding: "14px 16px", background: "rgba(168,72,63,0.06)", borderRadius: 10, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--c-event)" }}>{stats.sugPending + stats.editPending}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>In attesa</div>
        </div>
        <div style={{ padding: "14px 16px", background: "rgba(63,138,79,0.06)", borderRadius: 10, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#3f8a4f" }}>{stats.sugApproved + stats.editApproved}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>Approvate</div>
        </div>
        <div style={{ padding: "14px 16px", background: "var(--bg-2)", borderRadius: 10, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--ink-dim)" }}>{stats.sugRejected + stats.editRejected}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>Rifiutate</div>
        </div>
      </div>

      {/* Azione nuova richiesta */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        <Link to="/suggerisci" className="btn gold sm">+ Proponi una nuova opera</Link>
        <Link to="/opere" className="btn ghost sm">Cerca un'opera da modificare</Link>
        <button className="btn ghost sm" onClick={handleSync} disabled={syncing || resetting}>
          {syncing ? "↻ Sincronizzazione…" : "↻ Sincronizza ora"}
        </button>
      </div>

      {/* Banner feedback sincronizzazione (verde/rosso) */}
      {syncFeedback && (
        <div style={{
          padding: "12px 16px",
          borderRadius: 10,
          marginBottom: 20,
          fontSize: 14,
          lineHeight: 1.5,
          background: syncFeedback.startsWith("✓")
            ? "rgba(63,138,79,0.08)"
            : syncFeedback.startsWith("⏳")
              ? "rgba(184,138,46,0.08)"
              : "rgba(168,72,63,0.08)",
          color: syncFeedback.startsWith("✓")
            ? "#3f8a4f"
            : syncFeedback.startsWith("⏳")
              ? "var(--gold-deep, #b88a2e)"
              : "#a8483f",
          border: `1px solid ${
            syncFeedback.startsWith("✓")
              ? "rgba(63,138,79,0.3)"
              : syncFeedback.startsWith("⏳")
                ? "rgba(184,138,46,0.3)"
                : "rgba(168,72,63,0.3)"
          }`,
          fontWeight: 500,
        }}>
          {syncFeedback}
        </div>
      )}

      {/* Link rapido sezione */}
      <div style={{ marginBottom: 18 }}>
        <a
          href="#sez-proposte"
          style={{ fontSize: 13, color: "var(--gold-deep)", textDecoration: "underline", marginRight: 14 }}
        >🖼️ Proposte nuove opere ({suggestions.length})</a>
        <a
          href="#sez-modifiche"
          style={{ fontSize: 13, color: "var(--gold-deep)", textDecoration: "underline" }}
        >✎ Suggerimenti di modifica ({editSuggestions.length})</a>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
      ) : total === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--ink-dim)", fontSize: 14, background: "var(--bg-2)", borderRadius: 10 }}>
          Non hai ancora inviato nessuna richiesta.
          <br />
          <Link to="/suggerisci" style={{ color: "var(--gold-deep)", textDecoration: "underline", marginTop: 8, display: "inline-block" }}>
            Proponi la tua prima opera →
          </Link>
        </div>
      ) : (
        <>
          {/* === SEZIONE 1: PROPOSTE NUOVE OPERE === */}
          {suggestions.length > 0 && (
            <div id="sez-proposte" style={{ marginBottom: 32, scrollMarginTop: 80 }}>
              <h2 style={{ fontSize: 18, marginBottom: 12, fontFamily: "var(--font-display)" }}>
                🖼️ Proposte nuove opere
                <span style={{ fontSize: 13, color: "var(--ink-dim)", fontWeight: 400, marginLeft: 8 }}>({suggestions.length})</span>
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {suggestions.map((s) => (
                  <div key={s.id} style={{
                    padding: 14, background: s.status === "approved" ? "rgba(63,138,79,0.04)" : "var(--bg-2)",
                    border: `1px solid ${s.status === "approved" ? "rgba(63,138,79,0.2)" : "var(--line)"}`,
                    borderRadius: 10,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                      <b style={{ fontSize: 15.5 }}>{s.title}</b>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: "#fff", background: STATUS_COLOR[s.status],
                        padding: "3px 9px", borderRadius: 999,
                      }}>{STATUS_LABEL[s.status]}</span>
                    </div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                      {s.artist && <span>{s.artist}</span>}
                      {s.artist && s.year && <span> · </span>}
                      {s.year && <span>{s.year}</span>}
                      {s.location && <span> · {s.location}</span>}
                    </div>
                    {s.description && (
                      <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink-soft)", margin: "8px 0 0" }}>{s.description}</p>
                    )}
                    {s.admin_note && (
                      <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(184,138,46,0.08)", borderRadius: 6, fontSize: 13, borderLeft: "3px solid var(--gold)" }}>
                        <b style={{ color: "var(--gold-deep)" }}>Nota dell'admin:</b>
                        <div style={{ marginTop: 4 }}>{s.admin_note}</div>
                      </div>
                    )}
                    <div className="faint" style={{ fontSize: 11, marginTop: 10 }}>
                      Inviata il {fmtDate(s.created_at)}
                      {s.reviewed_at && ` · Revisionata il ${fmtDate(s.reviewed_at)}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === SEZIONE 2: SUGGERIMENTI MODIFICHE === */}
          {editSuggestions.length > 0 && (
            <div id="sez-modifiche" style={{ marginBottom: 32, scrollMarginTop: 80 }}>
              <h2 style={{ fontSize: 18, marginBottom: 12, fontFamily: "var(--font-display)" }}>
                ✎ Suggerimenti di modifica
                <span style={{ fontSize: 13, color: "var(--ink-dim)", fontWeight: 400, marginLeft: 8 }}>({editSuggestions.length})</span>
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {editSuggestions.map((s) => (
                  <div key={s.id} style={{
                    padding: 14, background: s.status === "approved" ? "rgba(63,138,79,0.04)" : "var(--bg-2)",
                    border: `1px solid ${s.status === "approved" ? "rgba(63,138,79,0.2)" : "var(--line)"}`,
                    borderRadius: 10,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                      <Link to={`/opera/${s.work_id}`} style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
                        {s.work_title}
                      </Link>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: "#fff", background: STATUS_COLOR[s.status],
                        padding: "3px 9px", borderRadius: 999,
                      }}>{STATUS_LABEL[s.status]}</span>
                    </div>
                    <div style={{ fontSize: 13, marginTop: 6, display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 10px" }}>
                      <span className="muted">Campo:</span>
                      <span>{FIELD_LABELS[s.field] || s.field}</span>
                      <span className="muted">Valore proposto:</span>
                      <span style={{ color: "var(--gold-deep)" }}>{s.proposed_value}</span>
                    </div>
                    {s.reason && (
                      <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink-soft)", margin: "8px 0 0" }}>
                        <b>Motivazione:</b> {s.reason}
                      </p>
                    )}
                    {s.admin_note && (
                      <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(184,138,46,0.08)", borderRadius: 6, fontSize: 13, borderLeft: "3px solid var(--gold)" }}>
                        <b style={{ color: "var(--gold-deep)" }}>Nota dell'admin:</b>
                        <div style={{ marginTop: 4 }}>{s.admin_note}</div>
                      </div>
                    )}
                    <div className="faint" style={{ fontSize: 11, marginTop: 10 }}>
                      Inviata il {fmtDate(s.created_at)}
                      {s.reviewed_at && ` · Revisionata il ${fmtDate(s.reviewed_at)}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== ZONA PERICOLOSA ===== */}
      <div style={{
        marginTop: 40, padding: 18,
        background: "rgba(168,72,63,0.04)",
        border: "1px solid rgba(168,72,63,0.3)",
        borderRadius: 12,
      }}>
        <h2 style={{
          fontSize: 17, marginBottom: 8, fontFamily: "var(--font-display)",
          color: "#a8483f",
        }}>
          ⚠️ Zona pericolosa
        </h2>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-soft)", marginBottom: 14, maxWidth: "62ch" }}>
          Qui puoi azzerare completamente i tuoi progressi: tutti i preferiti (★) e le opere approfondite (✓) verranno
          cancellati sia da questo browser che dal cloud. <b>L'azione è irreversibile.</b>
        </p>
        <button
          onClick={handleResetProgress}
          disabled={resetting || syncing}
          className="btn sm"
          style={{
            background: "#a8483f", color: "#fff", borderColor: "#a8483f",
            cursor: resetting ? "wait" : "pointer",
          }}
        >
          {resetting ? "⏳ Azzeramento in corso..." : "🗑️ Azzera tutti i progressi"}
        </button>
      </div>

      {/* Donazioni */}
      <div style={{
        marginTop: 24, padding: "20px", background: "var(--bg-2)", borderRadius: 12,
        textAlign: "center",
      }}>
        <h2 style={{ fontSize: 18, marginBottom: 8, fontFamily: "var(--font-display)" }}>
          Sostieni il progetto
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--ink-soft)", margin: "0 0 14px", lineHeight: 1.55 }}>
          HUB Art è gratuito e senza pubblicità. Se ti è utile, considera una donazione per
          supportare lo sviluppo e i costi di hosting.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <a href="https://www.buymeacoffee.com/ATgio" target="_blank" rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600,
              background: "#ffdd00", color: "#000", textDecoration: "none",
              border: "1px solid #e6c800",
            }}>
            ☕ Buy me a coffee
          </a>
        </div>
      </div>
    </div>
  );
}
