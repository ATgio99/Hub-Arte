// ============================================================================
// La bibliografia.
//
// Ogni scheda del catalogo viene da un libro. Prima quel dato stava in fondo
// alla scheda, scritto per esteso — una riga di prosa per dire da dove — e con
// due o tre titoli diventava un paragrafo che nessuno leggeva. Ora accanto al
// titolo dell'opera c'è un numero in un pallino, e il numero rimanda qui: è il
// modo in cui funzionano le note nei libri, che è il posto da cui questo
// catalogo viene.
//
// L'elenco non è testo scritto a mano: si genera dalla tabella `fonti`, così
// un titolo aggiunto da una scheda compare qui da solo, e uno corretto si
// corregge in un posto solo. Per questo sta fuori dal blocco riscrivibile
// della pagina: se fosse dentro, un testo personalizzato lo farebbe sparire.
//
// Chi amministra può aggiungere e correggere un titolo da qui, senza passare
// dall'editor del database: la bibliografia si tiene in ordine mentre si
// scrive, non dopo.
// ============================================================================
import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useData } from "../lib/store";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { bibliografia, citazione, riferimento, ancoraFonte, prossimoNumero, opereDiFonte } from "../lib/fonti";
import type { Fonte } from "../lib/types";

const VUOTA = (numero: number): Fonte => ({
  id: "", numero, titolo: "", autori: null, editore: null, anno: null, volume: null, note: null,
});

function idDaTitolo(titolo: string, volume: string | null): string {
  const base = `${titolo} ${volume ?? ""}`.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return base.slice(0, 60);
}

export default function Bibliografia() {
  const ix = useData();
  const { isAdmin, user } = useAuth();
  const { hash } = useLocation();
  const [inModifica, setInModifica] = useState<Fonte | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const voci = useMemo(() => bibliografia(ix.ds), [ix.ds]);
  const puntata = hash.replace("#", "");

  // Con le rotte a cancelletto il browser non porta da solo alla voce puntata:
  // l'indirizzo ne contiene gia' uno, e il secondo non lo guarda nessuno.
  useEffect(() => {
    if (!puntata) return;
    const el = document.getElementById(puntata);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [puntata, voci.length]);

  return (
    <div style={{ marginTop: 34 }}>
      <h2 style={{ fontSize: 22, marginBottom: 6, fontFamily: "var(--font-display)" }}>Bibliografia</h2>
      <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.6, maxWidth: "64ch", marginBottom: 18 }}>
        I numeri sono quelli dei pallini accanto al titolo delle opere: ogni scheda dice da quale
        libro viene. Le schede però sono riscritte, non ricopiate.
      </p>

      {voci.length === 0 && (
        <p className="faint" style={{ fontSize: 13.5 }}>Nessun titolo in bibliografia.</p>
      )}

      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
        {voci.map((f) => {
          const ancora = ancoraFonte(f);
          const mirata = puntata === ancora;
          const quante = opereDiFonte(ix.ds, f.id).length;
          return (
            <li
              key={f.id}
              id={ancora}
              style={{
                display: "flex", gap: 12, alignItems: "baseline",
                padding: "10px 12px", borderRadius: 10,
                border: `1px solid ${mirata ? "var(--gold)" : "var(--line)"}`,
                background: mirata ? "color-mix(in srgb, var(--gold) 8%, transparent)" : "var(--bg-1)",
                scrollMarginTop: 90,
              }}
              data-testid={`voce-${ancora}`}
            >
              <span style={{
                flexShrink: 0, width: 24, height: 24, borderRadius: "50%",
                border: "1px solid var(--gold)", color: "var(--gold-deep)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 600,
              }}>{f.numero ?? "?"}</span>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 16 }}>
                  <i>{citazione(f)}</i>
                </div>
                {riferimento(f) && (
                  <div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>{riferimento(f)}</div>
                )}
                {f.note && <div className="faint" style={{ fontSize: 12.5, marginTop: 2 }}>{f.note}</div>}
                <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>
                  {quante > 0
                    ? <Link className="tlink" to={`/opere?fonte=${encodeURIComponent(f.id)}`}>
                        {quante} {quante === 1 ? "scheda" : "schede"}
                      </Link>
                    : "nessuna scheda la cita"}
                  {isAdmin && (
                    <>
                      {" · "}
                      <button
                        onClick={() => { setInModifica(f); setErrore(null); }}
                        style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "var(--gold)", textDecoration: "underline", fontSize: 12 }}
                      >modifica</button>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {isAdmin && !inModifica && (
        <button
          className="btn ghost sm"
          style={{ marginTop: 14 }}
          onClick={() => { setInModifica(VUOTA(prossimoNumero(ix.ds))); setErrore(null); }}
          data-testid="btn-nuova-fonte"
        >
          + Aggiungi un titolo
        </button>
      )}

      {isAdmin && inModifica && (
        <ModuloFonte
          fonte={inModifica}
          email={user?.email ?? null}
          errore={errore}
          setErrore={setErrore}
          onFatto={() => setInModifica(null)}
        />
      )}
    </div>
  );
}

// ── Il modulo, uno solo per aggiungere e per correggere ────────────────────
function ModuloFonte({ fonte, email, errore, setErrore, onFatto }: {
  fonte: Fonte; email: string | null; errore: string | null;
  setErrore: (s: string | null) => void; onFatto: () => void;
}) {
  const nuova = !fonte.id;
  const [v, setV] = useState<Fonte>(fonte);
  const [salvando, setSalvando] = useState(false);

  const campo = (k: keyof Fonte, etichetta: string, tipo = "text") => (
    <label style={{ display: "grid", gap: 4 }}>
      <span className="eyebrow" style={{ fontSize: 10 }}>{etichetta}</span>
      <input
        type={tipo}
        value={(v[k] as any) ?? ""}
        onChange={(e) => setV({ ...v, [k]: tipo === "number"
          ? (e.target.value ? Number(e.target.value) : null)
          : (e.target.value || null) } as Fonte)}
        style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg-1)", fontSize: 14 }}
      />
    </label>
  );

  const salva = async () => {
    if (!v.titolo?.trim()) { setErrore("Il titolo è obbligatorio."); return; }
    setSalvando(true); setErrore(null);
    // L'id si ricava dal titolo solo alla creazione: cambiarlo dopo
    // spezzerebbe i rimandi delle schede che gia' citano questo libro.
    const id = nuova ? idDaTitolo(v.titolo, v.volume) : v.id;
    const { error } = await supabase.from("fonti").upsert(
      { ...v, id, titolo: v.titolo.trim(), modified_by: email }, { onConflict: "id" });
    setSalvando(false);
    if (error) { setErrore(error.message); return; }
    window.dispatchEvent(new CustomEvent("hubart-works-changed"));
    onFatto();
  };

  return (
    <div style={{ marginTop: 14, padding: 16, borderRadius: 12, border: "1px solid var(--line)", background: "var(--bg-1)" }}>
      <div className="eyebrow" style={{ marginBottom: 12 }}>
        {nuova ? `Nuovo titolo — sarà il numero ${v.numero}` : `Titolo [${v.numero}]`}
      </div>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
        {campo("titolo", "Titolo *")}
        {campo("volume", "Volume")}
        {campo("autori", "Autori")}
        {campo("editore", "Editore")}
        {campo("anno", "Anno", "number")}
        {campo("numero", "Numero in bibliografia", "number")}
      </div>
      <div style={{ marginTop: 10 }}>{campo("note", "Note")}</div>

      {errore && <p style={{ color: "#a8483f", fontSize: 13, marginTop: 10 }}>{errore}</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button className="btn gold sm" onClick={salva} disabled={salvando} data-testid="btn-salva-fonte">
          {salvando ? "Salvo…" : "Salva"}
        </button>
        <button className="btn ghost sm" onClick={onFatto}>Annulla</button>
      </div>
    </div>
  );
}
