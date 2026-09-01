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
import { rottaDiScheda } from "../lib/data";
import { useData } from "../lib/store";
import { AccessoRichiesto, BarraScheda, BannerGitHub, Section } from "../components/ui";
import { useAuth, CONTACT_EMAIL } from "../lib/auth";
import { getFavorites } from "../lib/favorites";
import { getStudied } from "../lib/studied";
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
  const ix = useData();
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [editSuggestions, setEditSuggestions] = useState<EditSuggestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Feedback sincronizzazione (banner verde/rosso)
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

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
      window.dispatchEvent(new Event("atlante:suggestions-changed"));
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
        `✓ Sincronizzato: ${favs.works.length} opere preferite, ${favs.artists.length} autori preferiti, ${studied.length} opere approfondite.`
      );
    } catch (e: any) {
      setSyncFeedback(`✗ Errore di sincronizzazione: ${e.message || "sync fallita"}`);
    } finally {
      setSyncing(false);
    }
  };

  if (!user) {
    return (
      <AccessoRichiesto
        occhiello="Il tuo account"
        titolo="Contributi"
        motivo="Qui compaiono le opere che hai proposto e le correzioni che hai suggerito, con lo stato di ciascuna: in attesa, accolta o respinta."
      />
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
      <BarraScheda />
      <div className="page-head">
        <div className="page-eyebrow"><span className="eyebrow">Il tuo account</span></div>
        <h1 className="page-title">Contributi</h1>
        <p className="page-lead">
          Le opere che hai proposto e le correzioni che hai suggerito, con lo stato di ciascuna.
          Quando qualcuno le revisiona compare un segnale nel menù, e qui trovi la risposta.
        </p>
      </div>
      <div className="page-rule" />

      {error && (
        <div style={{ padding: "12px 16px", background: "rgba(168,72,63,0.08)", color: "#a8483f", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* I quattro numeri raccontano da soli lo stato delle richieste: prima
          erano quattro riquadri colorati, qui restano solo i numeri, nella
          stessa forma usata nelle altre pagine. Quelli a zero non compaiono. */}
      {total > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 30, marginBottom: 24 }}>
          {[
            { n: total, l: "inviate in tutto", c: "var(--ink)" },
            { n: stats.sugPending + stats.editPending, l: "in attesa", c: "var(--c-event)" },
            { n: stats.sugApproved + stats.editApproved, l: "accolte", c: "#3f8a4f" },
            { n: stats.sugRejected + stats.editRejected, l: "non accolte", c: "var(--ink-dim)" },
          ].filter((x) => x.n > 0).map((x) => (
            <div key={x.l}>
              <div className="tnum" style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.1, color: x.c }}>{x.n}</div>
              <div className="smallcaps" style={{ fontSize: 10.5, color: "var(--ink-dim)", marginTop: 2 }}>{x.l}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 26, flexWrap: "wrap", alignItems: "center" }}>
        <Link to="/suggerisci" className="btn gold sm">Proponi una nuova opera</Link>
        <Link to="/opere" className="btn ghost sm">Cerca un'opera da correggere</Link>
        <button className="btn ghost sm" onClick={handleSync} disabled={syncing} style={{ marginLeft: "auto" }}>
          {syncing ? "Sincronizzazione…" : "Aggiorna"}
        </button>
      </div>

      {syncFeedback && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 20, fontSize: 13.5, lineHeight: 1.5,
          background: syncFeedback.startsWith("✓") ? "rgba(63,138,79,0.08)" : "rgba(168,72,63,0.08)",
          color: syncFeedback.startsWith("✓") ? "#3f8a4f" : "#a8483f",
          border: `1px solid ${syncFeedback.startsWith("✓") ? "rgba(63,138,79,0.3)" : "rgba(168,72,63,0.3)"}`,
        }}>
          {syncFeedback}
        </div>
      )}

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
            <Section eyebrow="Nuove opere" title={`Opere che hai proposto (${suggestions.length})`}>
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
            </Section>
          )}

          {/* === SEZIONE 2: SUGGERIMENTI MODIFICHE === */}
          {editSuggestions.length > 0 && (
            <Section eyebrow="Correzioni" title={`Correzioni che hai suggerito (${editSuggestions.length})`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {editSuggestions.map((s) => (
                  <div key={s.id} style={{
                    padding: 14, background: s.status === "approved" ? "rgba(63,138,79,0.04)" : "var(--bg-2)",
                    border: `1px solid ${s.status === "approved" ? "rgba(63,138,79,0.2)" : "var(--line)"}`,
                    borderRadius: 10,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                      <Link to={rottaDiScheda(ix, s.work_id)} style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
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
            </Section>
          )}
        </>
      )}

      <div style={{ marginTop: 30 }}><BannerGitHub /></div>

    </div>
  );
}
