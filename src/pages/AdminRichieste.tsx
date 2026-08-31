// ============================================================================
// AdminRichieste — dashboard SOLO ADMIN per gestire le richieste utenti.
// Rotta: /admin/richieste
//
// Mostra due tabelle:
//   1. Suggerimenti opere nuove (user_suggestions)
//   2. Suggerimenti modifiche opere (user_edit_suggestions)
//
// Per ogni richiesta l'admin può:
//   - Vedere i dettagli (utente, opera, contenuto, motivazione)
//   - Approvare → status='approved', salva admin_note
//   - Rifiutare → status='rejected', salva admin_note
//   - Eliminare (solo se già approved/rejected)
//
// I filtri permettono di vedere solo pending, approved, rejected o tutte.
// ============================================================================
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth, isAdminEmail, CONTACT_EMAIL } from "../lib/auth";
import { useData } from "../lib/store";

interface SuggestionRow {
  id: string;
  user_email: string;
  title: string;
  artist: string | null;
  year: string | null;
  location: string | null;
  image_url: string | null;
  description: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface EditSuggestionRow {
  id: string;
  user_email: string;
  work_id: string;
  work_title: string;
  field: string;
  current_value: string | null;
  proposed_value: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";
type Tab = "new" | "edit";

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

export default function AdminRichieste() {
  const { user, isAdmin } = useAuth();
  const ix = useData();

  const [tab, setTab] = useState<Tab>("new");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [editSuggestions, setEditSuggestions] = useState<EditSuggestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Per ogni riga, tiene traccia dell'admin_note in editing
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const [sugRes, editRes] = await Promise.all([
        supabase.from("user_suggestions")
          .select("id, user_email, title, artist, year, location, image_url, description, status, admin_note, created_at, reviewed_at")
          .order("created_at", { ascending: false }),
        supabase.from("user_edit_suggestions")
          .select("id, user_email, work_id, work_title, field, current_value, proposed_value, reason, status, admin_note, created_at, reviewed_at")
          .order("created_at", { ascending: false }),
      ]);
      if (sugRes.error) throw sugRes.error;
      if (editRes.error) throw editRes.error;
      setSuggestions((sugRes.data as SuggestionRow[]) || []);
      setEditSuggestions((editRes.data as EditSuggestionRow[]) || []);
      // Precompila le note
      const notesMap: Record<string, string> = {};
      for (const s of (sugRes.data || [])) if (s.admin_note) notesMap[s.id] = s.admin_note;
      for (const s of (editRes.data || [])) if (s.admin_note) notesMap[s.id] = s.admin_note;
      setNotes(notesMap);
    } catch (e: any) {
      setError(e.message || "Errore caricamento richieste");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  // Redirect se non admin
  if (!user) {
    return (
      <div className="wrap page" style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: "clamp(26px,4vw,38px)", marginBottom: 16 }}>Area admin</h1>
        <p style={{ fontSize: 16, color: "var(--ink-soft)" }}>
          Per accedere a questa pagina devi avere un account amministratore.
        </p>
        <Link to="/login" className="btn gold" style={{ marginTop: 18 }}>Accedi</Link>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="wrap page" style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: "clamp(26px,4vw,38px)", marginBottom: 16 }}>Accesso negato</h1>
        <p style={{ fontSize: 16, color: "var(--ink-soft)" }}>
          Questa pagina è riservata agli amministratori. Il tuo account ({user.email}) non è autorizzato.
        </p>
        <Link to="/" className="btn ghost" style={{ marginTop: 18 }}>← Torna alla home</Link>
      </div>
    );
  }

  const actOnSuggestion = async (id: string, status: "approved" | "rejected") => {
    setActing((a) => ({ ...a, [id]: true }));
    const note = notes[id]?.trim() || null;
    const { error } = await supabase.from("user_suggestions")
      .update({ status, admin_note: note, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    setActing((a) => ({ ...a, [id]: false }));
    if (error) { alert("Errore: " + error.message); return; }
    await load();
    window.dispatchEvent(new Event("atlante:suggestions-changed"));
  };

  const actOnEditSuggestion = async (id: string, status: "approved" | "rejected") => {
    setActing((a) => ({ ...a, [id]: true }));
    const note = notes[id]?.trim() || null;
    const { error } = await supabase.from("user_edit_suggestions")
      .update({ status, admin_note: note, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    setActing((a) => ({ ...a, [id]: false }));
    if (error) { alert("Errore: " + error.message); return; }
    await load();
    window.dispatchEvent(new Event("atlante:suggestions-changed"));
  };

  const deleteSuggestion = async (id: string) => {
    if (!confirm("Eliminare definitivamente questa richiesta? L'azione è irreversibile.")) return;
    const { error } = await supabase.from("user_suggestions").delete().eq("id", id);
    if (error) { alert("Errore: " + error.message); return; }
    await load();
    window.dispatchEvent(new Event("atlante:suggestions-changed"));
  };
  const deleteEditSuggestion = async (id: string) => {
    if (!confirm("Eliminare definitivamente questa richiesta di modifica? L'azione è irreversibile.")) return;
    const { error } = await supabase.from("user_edit_suggestions").delete().eq("id", id);
    if (error) { alert("Errore: " + error.message); return; }
    await load();
    window.dispatchEvent(new Event("atlante:suggestions-changed"));
  };

  const fmtDate = (s: string) => new Date(s).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  // Filtri
  const filteredSug = statusFilter === "all" ? suggestions : suggestions.filter(s => s.status === statusFilter);
  const filteredEdit = statusFilter === "all" ? editSuggestions : editSuggestions.filter(s => s.status === statusFilter);

  const counts = {
    sug: {
      pending: suggestions.filter(s => s.status === "pending").length,
      approved: suggestions.filter(s => s.status === "approved").length,
      rejected: suggestions.filter(s => s.status === "rejected").length,
      total: suggestions.length,
    },
    edit: {
      pending: editSuggestions.filter(s => s.status === "pending").length,
      approved: editSuggestions.filter(s => s.status === "approved").length,
      rejected: editSuggestions.filter(s => s.status === "rejected").length,
      total: editSuggestions.length,
    },
  };
  const currentCounts = tab === "new" ? counts.sug : counts.edit;

  return (
    <div className="wrap page">
      <div className="page-head" style={{ marginBottom: 18 }}>
        <div className="page-eyebrow"><span className="eyebrow">Amministrazione</span></div>
        <h1 className="page-title">Dashboard admin</h1>
        <p className="page-lead">
          Qui trovi tutte le richieste inviate dagli utenti: proposte di nuove opere e suggerimenti di modifica a opere esistenti.
          Puoi approvarle, rifiutarle o eliminarle. L'utente riceverà la notifica del tuo responso nella sua pagina "Impostazioni profilo".
        </p>
      </div>

      {/* Info admin + link database editor */}
      <div style={{ padding: "12px 16px", background: "var(--bg-2)", borderRadius: 10, marginBottom: 20, fontSize: 13.5, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div><b>Account admin:</b> {user.email}</div>
        <Link to="/admin/database" className="btn gold sm">🗄️ Editor database completo →</Link>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "rgba(168,72,63,0.08)", color: "#a8483f", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          ⚠️ {error}
        </div>
      )}

      {/* TAB: nuove opere / modifiche */}
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--line)", marginBottom: 18 }}>
        <button
          onClick={() => setTab("new")}
          style={{
            padding: "10px 18px", background: "none", border: 0, borderBottom: `2px solid ${tab === "new" ? "var(--gold-deep)" : "transparent"}`,
            cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: tab === "new" ? 600 : 400, color: tab === "new" ? "var(--gold-deep)" : "var(--ink-dim)",
          }}
        >
          🖼️ Proposte nuove opere
          {counts.sug.pending > 0 && (
            <span style={{ marginLeft: 8, padding: "1px 8px", borderRadius: 999, background: "var(--c-event)", color: "#fff", fontSize: 11, fontWeight: 700 }}>
              {counts.sug.pending}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("edit")}
          style={{
            padding: "10px 18px", background: "none", border: 0, borderBottom: `2px solid ${tab === "edit" ? "var(--gold-deep)" : "transparent"}`,
            cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: tab === "edit" ? 600 : 400, color: tab === "edit" ? "var(--gold-deep)" : "var(--ink-dim)",
          }}
        >
          ✎ Suggerimenti di modifica
          {counts.edit.pending > 0 && (
            <span style={{ marginLeft: 8, padding: "1px 8px", borderRadius: 999, background: "var(--c-event)", color: "#fff", fontSize: 11, fontWeight: 700 }}>
              {counts.edit.pending}
            </span>
          )}
        </button>
      </div>

      {/* FILTRO STATO */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "var(--ink-dim)" }}>Stato:</span>
        {(["pending", "approved", "rejected", "all"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`chip ${statusFilter === s ? "active" : ""}`}
            style={{ fontSize: 12.5 }}
          >
            {s === "all" ? "Tutte" : STATUS_LABEL[s as SuggestionRow["status"]]}
            {s !== "all" && currentCounts[s as keyof typeof currentCounts] > 0 && (
              <span style={{ marginLeft: 6, fontWeight: 600 }}>{currentCounts[s as keyof typeof currentCounts]}</span>
            )}
            {s === "all" && <span style={{ marginLeft: 6, fontWeight: 600 }}>{currentCounts.total}</span>}
          </button>
        ))}
        <button onClick={load} className="btn ghost sm" style={{ marginLeft: "auto" }} title="Ricarica">
          ↻ Ricarica
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
      ) : tab === "new" ? (
        // === TAB: PROPOSTE NUOVE OPERE ===
        filteredSug.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--ink-dim)", fontSize: 14 }}>
            Nessuna proposta in questa categoria.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filteredSug.map((s) => (
              <div key={s.id} style={{
                padding: 18, background: "var(--bg-2)", border: `1px solid ${s.status === "pending" ? "var(--gold)" : "var(--line)"}`,
                borderRadius: 12,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                      <h3 style={{ fontSize: 18, margin: 0 }}>{s.title}</h3>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: "#fff", background: STATUS_COLOR[s.status],
                        padding: "3px 9px", borderRadius: 999,
                      }}>{STATUS_LABEL[s.status]}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-dim)" }}>
                      {s.artist && <span>✎ {s.artist}</span>}
                      {s.artist && s.year && <span> · </span>}
                      {s.year && <span>📅 {s.year}</span>}
                      {s.location && <span> · 📍 {s.location}</span>}
                    </div>
                    <div className="faint" style={{ fontSize: 11, marginTop: 4 }}>
                      Inviata da <b>{s.user_email}</b> il {fmtDate(s.created_at)}
                      {s.reviewed_at && ` · Revisionata il ${fmtDate(s.reviewed_at)}`}
                    </div>
                  </div>
                  {s.image_url && (
                    <a href={s.image_url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
                      <img src={s.image_url} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6, border: "1px solid var(--line)" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </a>
                  )}
                </div>

                {s.description && (
                  <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink-soft)", margin: "8px 0 0" }}>{s.description}</p>
                )}

                {/* Nota admin */}
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--ink-dim)" }}>
                    Nota admin (visibile all'utente)
                  </label>
                  <textarea
                    value={notes[s.id] || ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [s.id]: e.target.value }))}
                    placeholder="Es. Opera aggiunta al database. / Opera non rilevante per l'atlante."
                    rows={2}
                    style={{
                      width: "100%", resize: "vertical", padding: "8px 10px",
                      border: "1px solid var(--line)", borderRadius: 6, background: "var(--bg)",
                      color: "var(--ink)", fontSize: 13, fontFamily: "inherit",
                    }}
                    maxLength={500}
                  />
                </div>

                {/* Azioni */}
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {s.status !== "approved" && (
                    <button
                      className="btn gold sm"
                      onClick={() => actOnSuggestion(s.id, "approved")}
                      disabled={acting[s.id]}
                      style={{ background: "#3f8a4f", borderColor: "#3f8a4f" }}
                    >
                      ✓ Approva
                    </button>
                  )}
                  {s.status !== "rejected" && (
                    <button
                      className="btn ghost sm"
                      onClick={() => actOnSuggestion(s.id, "rejected")}
                      disabled={acting[s.id]}
                      style={{ color: "#a8483f", borderColor: "#a8483f" }}
                    >
                      ✗ Rifiuta
                    </button>
                  )}
                  <button
                    className="btn ghost sm"
                    onClick={() => deleteSuggestion(s.id)}
                    style={{ marginLeft: "auto", color: "var(--ink-dim)" }}
                    title="Elimina definitivamente"
                  >
                    🗑️ Elimina
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // === TAB: SUGGERIMENTI MODIFICHE ===
        filteredEdit.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--ink-dim)", fontSize: 14 }}>
            Nessun suggerimento di modifica in questa categoria.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filteredEdit.map((s) => {
              const work = ix.workById.get(s.work_id);
              return (
                <div key={s.id} style={{
                  padding: 18, background: "var(--bg-2)", border: `1px solid ${s.status === "pending" ? "var(--gold)" : "var(--line)"}`,
                  borderRadius: 12,
                }}>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                      <Link to={`/opera/${s.work_id}`} style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
                        {s.work_title}
                      </Link>
                      <span style={{
                        fontSize: 10.5, color: "var(--ink-dim)",
                        fontFamily: "ui-monospace, monospace",
                        background: "var(--bg)", padding: "2px 7px", borderRadius: 4,
                        border: "1px solid var(--line)",
                      }} title="ID opera">{s.work_id}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: "#fff", background: STATUS_COLOR[s.status],
                        padding: "3px 9px", borderRadius: 999,
                      }}>{STATUS_LABEL[s.status]}</span>
                    </div>
                    <div className="faint" style={{ fontSize: 11 }}>
                      Inviata da <b>{s.user_email}</b> il {fmtDate(s.created_at)}
                      {s.reviewed_at && ` · Revisionata il ${fmtDate(s.reviewed_at)}`}
                    </div>
                  </div>

                  {/* Differenza valore */}
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 14px", fontSize: 13.5, padding: "10px 12px", background: "var(--bg)", borderRadius: 8, marginBottom: 10 }}>
                    <span style={{ color: "var(--ink-dim)", fontWeight: 600 }}>Campo:</span>
                    <span>{FIELD_LABELS[s.field] || s.field}</span>
                    <span style={{ color: "var(--ink-dim)", fontWeight: 600 }}>Attuale:</span>
                    <span style={{ color: "var(--ink-dim)" }}>{s.current_value || <em>(vuoto)</em>}</span>
                    <span style={{ color: "var(--gold-deep)", fontWeight: 600 }}>Proposto:</span>
                    <span style={{ color: "var(--gold-deep)" }}>{s.proposed_value}</span>
                  </div>

                  {s.reason && (
                    <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-soft)", margin: "0 0 8px" }}>
                      <b>Motivazione:</b> {s.reason}
                    </p>
                  )}

                  {/* Nota admin */}
                  <div style={{ marginTop: 8 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--ink-dim)" }}>
                      Nota admin (visibile all'utente)
                    </label>
                    <textarea
                      value={notes[s.id] || ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [s.id]: e.target.value }))}
                      placeholder="Es. Modifica applicata al database. / Fonte non attendibile."
                      rows={2}
                      style={{
                        width: "100%", resize: "vertical", padding: "8px 10px",
                        border: "1px solid var(--line)", borderRadius: 6, background: "var(--bg)",
                        color: "var(--ink)", fontSize: 13, fontFamily: "inherit",
                      }}
                      maxLength={500}
                    />
                  </div>

                  {/* Azioni */}
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    {s.status !== "approved" && (
                      <button
                        className="btn gold sm"
                        onClick={() => actOnEditSuggestion(s.id, "approved")}
                        disabled={acting[s.id]}
                        style={{ background: "#3f8a4f", borderColor: "#3f8a4f" }}
                      >
                        ✓ Approva
                      </button>
                    )}
                    {s.status !== "rejected" && (
                      <button
                        className="btn ghost sm"
                        onClick={() => actOnEditSuggestion(s.id, "rejected")}
                        disabled={acting[s.id]}
                        style={{ color: "#a8483f", borderColor: "#a8483f" }}
                      >
                        ✗ Rifiuta
                      </button>
                    )}
                    <button
                      className="btn ghost sm"
                      onClick={() => deleteEditSuggestion(s.id)}
                      style={{ marginLeft: "auto", color: "var(--ink-dim)" }}
                      title="Elimina definitivamente"
                    >
                      🗑️ Elimina
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      <div style={{ marginTop: 32, padding: "14px 16px", background: "var(--bg-2)", borderRadius: 10, fontSize: 13, color: "var(--ink-dim)" }}>
        <b>ℹ️ Nota:</b> quando approvi o rifiuti una richiesta, l'utente riceve una notifica
        (badge che pulsa nella sidebar) e può vedere il tuo responso nella sua pagina{" "}
        <Link to="/profile" style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>Impostazioni profilo</Link>.
        Per inserire l'opera nel database o modificare i metadati, usa l'{" "}
        <Link to="/admin/database" style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>editor database completo</Link>{" "}
        (l'approvazione qui è solo un flag di stato, non esegue automaticamente la modifica nel DB).
      </div>
    </div>
  );
}
