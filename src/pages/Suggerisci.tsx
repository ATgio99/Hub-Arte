// ============================================================================
// Suggerisci — form per proporre una nuova opera all'atlante.
// Scrive su Supabase (public.user_suggestions). Se l'utente non è loggato,
// mostra un fallback con email diretta. Mostra anche la lista dei propri
// suggerimenti inviati (con stato pending/approved/rejected).
// ============================================================================
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth, CONTACT_EMAIL } from "../lib/auth";

interface UserSuggestionRow {
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

const STATUS_META: Record<UserSuggestionRow["status"], { label: string; color: string }> = {
  pending: { label: "In attesa", color: "var(--c-event, #a8483f)" },
  approved: { label: "Approvata", color: "#3f8a4f" },
  rejected: { label: "Rifiutata", color: "#7a7a7a" },
};

export default function Suggerisci() {
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [year, setYear] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const [list, setList] = useState<UserSuggestionRow[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const loadMine = useCallback(async () => {
    if (!user) { setList([]); setListLoading(false); return; }
    setListLoading(true);
    const { data, error } = await supabase
      .from("user_suggestions")
      .select("id, title, artist, year, location, description, status, admin_note, created_at, reviewed_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setList(data as UserSuggestionRow[]);
    setListLoading(false);
  }, [user]);

  useEffect(() => { loadMine(); }, [loadMine]);

  // Reset "atlante:sugg-seen:<uid>" quando visitiamo la pagina (abbiamo visto le revisioni)
  useEffect(() => {
    if (!user) return;
    try { localStorage.setItem(`atlante:sugg-seen:${user.id}`, String(Date.now())); } catch { /* ignore */ }
  }, [user]);

  if (!user) {
    return (
      <div className="wrap page" style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: "clamp(26px,4vw,38px)", letterSpacing: "-.02em", marginBottom: 16 }}>Suggerisci un'opera</h1>
        <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--ink-soft)" }}>
          Per proporre una nuova opera all'atlante devi avere un account. La funzione permette di
          tracciare lo stato della tua proposta e ricevere una risposta dagli amministratori.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--ink-soft)", marginTop: 12 }}>
          In alternativa, puoi scriverci direttamente a{" "}
          <a href={`mailto:${CONTACT_EMAIL}?subject=Suggerimento opera`} className="tlink">{CONTACT_EMAIL}</a>.
        </p>
        <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
          <Link to="/login" className="btn gold">Accedi o registrati</Link>
          <Link to="/opere" className="btn ghost">Torna alle opere</Link>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(false);
    if (!title.trim()) { setError("Il titolo è obbligatorio."); return; }
    if (imageUrl && !/^https?:\/\/.+/i.test(imageUrl.trim())) { setError("URL immagine non valido."); return; }

    setSending(true);
    const { error } = await supabase.from("user_suggestions").insert({
      user_id: user.id,
      user_email: user.email ?? "",
      title: title.trim(),
      artist: artist.trim() || null,
      year: year.trim() || null,
      location: location.trim() || null,
      image_url: imageUrl.trim() || null,
      description: description.trim() || null,
    });
    setSending(false);

    if (error) {
      setError(`Errore invio: ${error.message}. Riprova o scrivici a ${CONTACT_EMAIL}.`);
      return;
    }
    setOk(true);
    setTitle(""); setArtist(""); setYear(""); setLocation(""); setImageUrl(""); setDescription("");
    loadMine();
    window.dispatchEvent(new Event("atlante:suggestions-changed"));
  };

  return (
    <div className="wrap page" style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: "clamp(28px,4vw,42px)", letterSpacing: "-.02em", marginBottom: 8 }}>Suggerisci un'opera</h1>
      <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--ink-soft)", marginBottom: 22, maxWidth: "62ch" }}>
        Conosci un'opera che non è ancora nell'atlante? Proponila qui. Gli amministratori
        valuteranno il suggerimento e potrai seguirne lo stato in questa pagina.
      </p>

      <form onSubmit={submit} className="card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Titolo opera *</label>
          <input className="input" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="es. Pala di Brera" maxLength={200} required
            style={{ width: "100%", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg)", color: "var(--ink)", fontSize: 14 }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Autore / bottega</label>
            <input className="input" type="text" value={artist} onChange={(e) => setArtist(e.target.value)}
              placeholder="es. Piero della Francesca" maxLength={120}
              style={{ width: "100%", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg)", color: "var(--ink)", fontSize: 14 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Datazione</label>
            <input className="input" type="text" value={year} onChange={(e) => setYear(e.target.value)}
              placeholder="es. 1472-1474" maxLength={60}
              style={{ width: "100%", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg)", color: "var(--ink)", fontSize: 14 }} />
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Luogo</label>
          <input className="input" type="text" value={location} onChange={(e) => setLocation(e.target.value)}
            placeholder="es. Pinacoteca di Brera, Milano" maxLength={200}
            style={{ width: "100%", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg)", color: "var(--ink)", fontSize: 14 }} />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>URL immagine (opzionale)</label>
          <input className="input" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://upload.wikimedia.org/…" maxLength={500}
            style={{ width: "100%", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg)", color: "var(--ink)", fontSize: 14 }} />
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Suggerimento: usa un'immagine da Wikimedia Commons (tasto destro → "Copia indirizzo immagine").
          </p>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Descrizione / motivazione</label>
          <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Perché dovrebbe essere nell'atlante? Quali innovazioni o legami con altre opere?" rows={4}
            style={{ width: "100%", resize: "vertical", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg)", color: "var(--ink)", fontSize: 14, fontFamily: "inherit" }}
            maxLength={800} />
        </div>

        {error && (
          <div style={{ color: "#a8483f", fontSize: 13.5, padding: "8px 12px", background: "rgba(168,72,63,0.08)", borderRadius: 8 }}>
            {error}
          </div>
        )}
        {ok && (
          <div style={{ color: "#3f8a4f", fontSize: 13.5, padding: "8px 12px", background: "rgba(63,138,79,0.08)", borderRadius: 8 }}>
            ✓ Suggerimento inviato. Lo trovi nell'elenco qui sotto con stato "In attesa".
          </div>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button type="submit" className="btn gold" disabled={sending || !title.trim()}>
            {sending ? "Invio in corso…" : "Invia suggerimento →"}
          </button>
          <Link to="/opere" className="btn ghost">Annulla</Link>
        </div>
      </form>

      {/* Elenco dei propri suggerimenti */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>I tuoi suggerimenti</h2>
        {listLoading ? (
          <div style={{ textAlign: "center", padding: 24 }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
        ) : list.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: "var(--ink-dim)", fontSize: 13.5 }}>
            Non hai ancora suggerito nessuna opera.{" "}
            <Link to="/suggerisci" style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>Suggeriscine una →</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {list.map((s) => {
              const meta = STATUS_META[s.status];
              return (
                <div key={s.id} style={{
                  padding: 14,
                  background: s.status === "approved" ? "rgba(63,138,79,0.06)" : "var(--bg-2)",
                  border: `1px solid ${s.status === "approved" ? "rgba(63,138,79,0.25)" : "var(--line)"}`,
                  borderRadius: 10,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                    <b style={{ fontSize: 15.5 }}>{s.title}</b>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fff", background: meta.color, padding: "3px 9px", borderRadius: 999 }}>
                      {meta.label}
                    </span>
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
                    <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(184,138,46,0.08)", borderRadius: 6, fontSize: 13 }}>
                      <b>Nota admin:</b> {s.admin_note}
                    </div>
                  )}
                  <div className="faint" style={{ fontSize: 11, marginTop: 8 }}>
                    Inviato il {new Date(s.created_at).toLocaleString("it-IT")}
                    {s.reviewed_at && ` · Revisionato il ${new Date(s.reviewed_at).toLocaleString("it-IT")}`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
