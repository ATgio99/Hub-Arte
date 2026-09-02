// ============================================================================
// SuggerisciModifica — form per proporre una modifica a una scheda esistente.
// Rotte: /suggerisci-modifica?work=<id>  oppure  ?artist=<id>
//
// Vale per le opere e per le schede di autori e committenti: chi arriva qui da
// una scheda trova gia' scritto di che cosa sta parlando, e sceglie solo quale
// campo correggere. I campi proposti cambiano secondo il tipo di scheda —
// chiedere la «datazione testuale» di un autore non avrebbe senso.
//
// Scrive su Supabase (public.user_edit_suggestions). La tabella nasce per le
// opere e ha una colonna work_id: ci mettiamo l'id della scheda qualunque essa
// sia, perche' gli id di opere e autori non si sovrappongono mai (verificato:
// zero collisioni su 1115 opere e 623 schede). Chi legge la richiesta capisce
// il tipo cercando l'id nei due indici.
//
// Solo utenti autenticati non-admin: gli admin hanno il tasto «Modifica».
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { BarraScheda } from "../components/ui";
import { useAuth, CONTACT_EMAIL } from "../lib/auth";
import { useData } from "../lib/store";
import { isCommittente } from "../lib/data";

type FieldKey =
  | "title" | "summary" | "analysis" | "date_text" | "year_start" | "year_end"
  | "type" | "location_city" | "location_place" | "materials"
  | "image_url" | "image_thumb" | "image_source"
  | "artist" | "period" | "technique" | "term"
  | "name" | "aka" | "birth" | "death" | "role" | "bio" | "innovations";

const FIELD_LABELS: Record<FieldKey, string> = {
  title: "Titolo",
  summary: "Sintesi / descrizione breve",
  analysis: "Analisi critica",
  date_text: "Datazione testuale",
  year_start: "Anno inizio",
  year_end: "Anno fine",
  type: "Tipologia",
  location_city: "Città",
  location_place: "Luogo / edificio",
  materials: "Materiali",
  image_url: "URL immagine",
  image_thumb: "URL thumbnail",
  image_source: "Fonte immagine",
  artist: "Autore / artisti",
  period: "Periodo",
  technique: "Tecnica",
  term: "Termine di glossario",
  name: "Nome",
  aka: "Altri nomi con cui è conosciuto",
  birth: "Anno di nascita",
  death: "Anno di morte",
  role: "Ruolo",
  bio: "Biografia",
  innovations: "Innovazioni",
};

const CAMPI_OPERA: FieldKey[] = [
  "title", "summary", "analysis", "date_text", "year_start", "year_end",
  "type", "location_city", "location_place", "materials",
  "image_url", "image_thumb", "image_source",
  "artist", "period", "technique", "term",
];

const CAMPI_AUTORE: FieldKey[] = [
  "name", "aka", "role", "birth", "death", "bio", "innovations",
  "period", "location_city",
];

export default function SuggerisciModifica() {
  const { user, isAdmin } = useAuth();
  const ix = useData();
  const nav = useNavigate();
  const [params] = useSearchParams();

  // La scheda di partenza puo' essere un'opera o un autore/committente.
  const idOpera = params.get("work") ?? "";
  const idAutore = params.get("artist") ?? "";
  const w = idOpera ? ix.workById.get(idOpera) : undefined;
  const a = idAutore ? ix.artistById.get(idAutore) : undefined;

  const tipo: "work" | "artist" = idAutore ? "artist" : "work";
  const workId = idAutore || idOpera;
  const record = (a ?? w) as unknown as Record<string, unknown> | undefined;
  const campi = tipo === "artist" ? CAMPI_AUTORE : CAMPI_OPERA;
  const rottaScheda = tipo === "artist" ? `/artista/${workId}` : `/opera/${workId}`;
  const nomeTipo = tipo === "artist"
    ? (a && isCommittente(a) ? "il committente" : "l'autore")
    : "l'opera";

  const [field, setField] = useState<FieldKey>(idAutore ? "name" : "title");
  const [currentValue, setCurrentValue] = useState<string>("");
  const [proposedValue, setProposedValue] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  // Quando cambia scheda o campo, precompila «valore attuale»
  useEffect(() => {
    if (!record) { setCurrentValue(""); return; }
    const v = record[field];
    if (v == null) setCurrentValue("");
    else if (Array.isArray(v)) setCurrentValue(v.join(", "));
    else setCurrentValue(String(v));
  }, [record, field]);

  // Cambiando tipo di scheda il campo scelto potrebbe non esistere piu'.
  useEffect(() => {
    if (!campi.includes(field)) setField(campi[0]);
  }, [campi, field]);

  const workTitle = useMemo(() => a?.name ?? w?.title ?? workId, [a, w, workId]);

  // Redirect se admin → torna alla scheda (usano il tasto Modifica)
  useEffect(() => {
    if (isAdmin && workId) nav(rottaScheda, { replace: true });
  }, [isAdmin, workId, rottaScheda, nav]);

  if (!user) {
    return (
      <div className="wrap page" style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: "clamp(26px,4vw,38px)", letterSpacing: "-.02em", marginBottom: 16 }}>Suggerisci una modifica</h1>
        <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--ink-soft)" }}>
          Per proporre una modifica a una scheda devi avere un account. La funzione permette di
          tracciare lo stato della tua proposta e ricevere una risposta dagli amministratori.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--ink-soft)", marginTop: 12 }}>
          In alternativa, puoi scriverci direttamente a{" "}
          <a href={`mailto:${CONTACT_EMAIL}?subject=Modifica scheda: ${workTitle}`} className="tlink">{CONTACT_EMAIL}</a>.
        </p>
        <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
          <Link to="/login" className="btn gold">Accedi o registrati</Link>
          {workId && <Link to={rottaScheda} className="btn ghost">Torna alla scheda</Link>}
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="wrap page" style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: "clamp(26px,4vw,38px)", marginBottom: 16 }}>Scheda non trovata</h1>
        <p style={{ fontSize: 16, color: "var(--ink-soft)" }}>
          La scheda indicata non è nell'atlante. Controlla l'indirizzo, oppure torna al catalogo.
        </p>
        <Link to={tipo === "artist" ? "/artisti" : "/opere"} className="btn ghost" style={{ marginTop: 18 }}>
          ← Torna al catalogo
        </Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setOk(false);
    if (!proposedValue.trim()) { setError("Il valore proposto è obbligatorio."); return; }

    setSending(true);
    const { error } = await supabase.from("user_edit_suggestions").insert({
      user_id: user.id,
      user_email: user.email ?? "",
      work_id: workId,
      work_title: workTitle,
      field,
      current_value: currentValue || null,
      proposed_value: proposedValue.trim(),
      reason: reason.trim() || null,
    });
    setSending(false);

    if (error) {
      setError(`Errore invio: ${error.message}. Riprova o scrivici a ${CONTACT_EMAIL}.`);
      return;
    }
    setOk(true);
    setProposedValue(""); setReason("");
    window.dispatchEvent(new Event("atlante:suggestions-changed"));
  };

  return (
    <div className="wrap page" style={{ maxWidth: 720 }}>
      <BarraScheda />
      <h1 style={{ fontSize: "clamp(26px,4vw,38px)", letterSpacing: "-.02em", marginBottom: 8 }}>
        Suggerisci una modifica
      </h1>
      <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--ink-soft)", marginBottom: 8 }}>
        Stai proponendo una modifica a {nomeTipo}{" "}
        <Link to={rottaScheda} style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>
          {workTitle}
        </Link>.
      </p>
      <p className="muted" style={{ fontSize: 13, marginBottom: 22 }}>
        Indica quale campo correggere e il valore che proponi. Gli amministratori valuteranno la proposta.
      </p>

      <form onSubmit={submit} className="card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Campo da modificare</label>
          <select
            value={field}
            onChange={(e) => setField(e.target.value as FieldKey)}
            className="input"
            style={{ width: "100%", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg)", color: "var(--ink)", fontSize: 14 }}
          >
            {campi.map((f) => (
              <option key={f} value={f}>{FIELD_LABELS[f]}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Valore attuale</label>
          <textarea
            className="input"
            value={currentValue}
            readOnly
            rows={2}
            placeholder="(vuoto)"
            style={{ width: "100%", resize: "vertical", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-2)", color: "var(--ink-soft)", fontSize: 14, fontFamily: "inherit" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Valore proposto *</label>
          <textarea
            className="input"
            value={proposedValue}
            onChange={(e) => setProposedValue(e.target.value)}
            rows={3}
            placeholder="Il nuovo valore che proponi"
            style={{ width: "100%", resize: "vertical", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg)", color: "var(--ink)", fontSize: 14, fontFamily: "inherit" }}
            maxLength={1000}
            required
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Motivazione (opzionale)</label>
          <textarea
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Perché proponi questa modifica? Es. fonti, errore di datazione, autore errato…"
            rows={3}
            style={{ width: "100%", resize: "vertical", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg)", color: "var(--ink)", fontSize: 14, fontFamily: "inherit" }}
            maxLength={600}
          />
        </div>

        {error && (
          <div style={{ color: "#a8483f", fontSize: 13.5, padding: "8px 12px", background: "rgba(168,72,63,0.08)", borderRadius: 8 }}>
            {error}
          </div>
        )}
        {ok && (
          <div style={{ color: "#3f8a4f", fontSize: 13.5, padding: "8px 12px", background: "rgba(63,138,79,0.08)", borderRadius: 8 }}>
            ✓ Suggerimento inviato. Gli amministratori lo valuteranno.
          </div>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
          <button type="submit" className="btn gold sm" disabled={sending || !proposedValue.trim()}>
            {sending ? "Invio in corso…" : "Invia suggerimento →"}
          </button>
          <Link to={`/opera/${workId}`} className="btn ghost sm">Annulla</Link>
        </div>
      </form>
    </div>
  );
}
