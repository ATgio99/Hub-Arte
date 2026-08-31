// ============================================================================
// PaginaModificabile — permette a chi amministra di riscrivere il testo delle
// pagine informative (crediti, termini, privacy, contatti, progetto) dal sito.
//
// Come funziona: se nel database esiste un testo per questa pagina, viene
// mostrato al posto di quello scritto nel codice; se non esiste, si vede il
// testo predefinito. Cancellando il testo salvato si torna al predefinito,
// quindi una modifica non e' mai definitiva.
//
// Il formato accettato e' volutamente minimo — titoli, elenchi, grassetto,
// collegamenti — perche' queste pagine devono restare leggibili, non diventare
// un editor di documenti.
// ============================================================================
import { useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { BarraScheda } from "./ui";

// --- resa del testo ---------------------------------------------------------
// ## titolo · - elenco · **grassetto** · [testo](indirizzo)
function inline(t: string, k: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(t))) {
    if (m.index > last) out.push(t.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      out.push(<b key={`${k}-b${i++}`}>{tok.slice(2, -2)}</b>);
    } else {
      const testo = tok.slice(1, tok.indexOf("]"));
      const href = tok.slice(tok.indexOf("(") + 1, -1);
      const esterno = /^https?:/.test(href);
      out.push(
        <a key={`${k}-a${i++}`} href={href} className="tlink"
          {...(esterno ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{testo}</a>
      );
    }
    last = m.index + tok.length;
  }
  if (last < t.length) out.push(t.slice(last));
  return out;
}

function Reso({ testo }: { testo: string }) {
  const blocchi = testo.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <>
      {blocchi.map((b, i) => {
        const righe = b.split("\n");
        if (righe[0].startsWith("## ")) {
          return (
            <h2 key={i} style={{ fontSize: 22, marginTop: 28, marginBottom: 10, fontFamily: "var(--font-display)" }}>
              {inline(righe[0].slice(3), `h${i}`)}
            </h2>
          );
        }
        if (righe.every((r) => r.trim().startsWith("- "))) {
          return (
            <ul key={i} style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-soft)", margin: "0 0 16px 22px" }}>
              {righe.map((r, j) => <li key={j}>{inline(r.trim().slice(2), `l${i}-${j}`)}</li>)}
            </ul>
          );
        }
        return (
          <p key={i} style={{ fontSize: 16, lineHeight: 1.65, color: "var(--ink-soft)", margin: "0 0 12px" }}>
            {inline(b, `p${i}`)}
          </p>
        );
      })}
    </>
  );
}

// Segnaposto ammessi nel testo: restano collegati al catalogo anche dopo una
// modifica manuale, cosi' i conteggi non diventano numeri fissi.
// Es. scrivendo {opere} nel testo si legge sempre il totale aggiornato.
function applicaSegnaposto(testo: string, valori: Record<string, string>): string {
  return testo.replace(/\{(\w+)\}/g, (intero, chiave) =>
    Object.prototype.hasOwnProperty.call(valori, chiave) ? valori[chiave] : intero);
}

// Converte in testo semplice il contenuto gia' impaginato, per poterlo
// modificare senza riscriverlo da capo. I numeri riconosciuti tornano a essere
// segnaposto, altrimenti resterebbero congelati al valore del giorno.
function daPaginaATesto(radice: HTMLElement, valori: Record<string, string>): string {
  const pezzi: string[] = [];
  const inverso = (t: string) => {
    for (const [chiave, valore] of Object.entries(valori)) {
      if (valore && valore.length > 1) t = t.split(valore).join(`{${chiave}}`);
    }
    return t;
  };
  radice.querySelectorAll(":scope > *").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    const testo = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!testo) return;
    if (tag === "h2") pezzi.push("## " + inverso(testo));
    else if (tag === "ul" || tag === "ol") {
      const voci: string[] = [];
      el.querySelectorAll("li").forEach((li) => {
        const t = (li.textContent || "").replace(/\s+/g, " ").trim();
        if (t) voci.push("- " + inverso(t));
      });
      if (voci.length) pezzi.push(voci.join("\n"));
    } else pezzi.push(inverso(testo));
  });
  return pezzi.join("\n\n");
}

export default function PaginaModificabile({ id, titolo, valori, children }:
  { id: string; titolo?: ReactNode; valori?: Record<string, string>; children: ReactNode }) {
  const { isAdmin, user } = useAuth();
  const [testo, setTesto] = useState<string | null>(null);
  const [caricato, setCaricato] = useState(false);
  const [aperto, setAperto] = useState(false);
  const [bozza, setBozza] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const contenitore = useRef<HTMLDivElement>(null);
  const seg = valori ?? {};

  const carica = useCallback(async () => {
    try {
      const { data } = await supabase.from("page_texts").select("contenuto").eq("id", id).maybeSingle();
      setTesto(data?.contenuto?.trim() ? data.contenuto : null);
    } catch { setTesto(null); }
    setCaricato(true);
  }, [id]);

  useEffect(() => { carica(); }, [carica]);

  const salva = async () => {
    setSalvando(true); setErrore(null);
    try {
      const { error } = await supabase.from("page_texts")
        .upsert({ id, contenuto: bozza, modified_by: user?.email ?? null }, { onConflict: "id" });
      if (error) throw new Error(error.message);
      setTesto(bozza.trim() ? bozza : null);
      setAperto(false);
    } catch (e: any) {
      setErrore(e?.message || "Errore nel salvataggio.");
    } finally { setSalvando(false); }
  };

  const ripristina = async () => {
    setSalvando(true); setErrore(null);
    try {
      const { error } = await supabase.from("page_texts").delete().eq("id", id);
      if (error) throw new Error(error.message);
      setTesto(null); setAperto(false);
    } catch (e: any) {
      setErrore(e?.message || "Errore nel ripristino.");
    } finally { setSalvando(false); }
  };

  // Finche' non si sa se esiste un testo salvato si mostra il predefinito:
  // evita che la pagina lampeggi a ogni apertura.
  const contenuto = caricato && testo ? <Reso testo={applicaSegnaposto(testo, seg)} /> : children;

  return (
    <>
      <BarraScheda azioni={
        isAdmin ? (
          <button
            className="btn ghost sm"
            style={{ fontSize: 12.5, whiteSpace: "nowrap" }}
            onClick={() => {
              // Senza un testo salvato si parte da quello attualmente a video,
              // convertito in forma modificabile: nessuno deve riscrivere una
              // pagina da capo solo per correggere una riga.
              const iniziale = testo ?? (contenitore.current ? daPaginaATesto(contenitore.current, seg) : "");
              setBozza(iniziale);
              setAperto(true);
            }}
            data-testid={`modifica-pagina-${id}`}
            title="Riscrivi il testo di questa pagina"
          >
            ✎ Modifica pagina{testo ? " · personalizzata" : ""}
          </button>
        ) : null
      } />

      {/* La barra sopra resta larga quanto l'area di lettura; il testo invece
          si ferma a una misura leggibile e sta al centro. */}
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {titolo}
        <div ref={contenitore}>{contenuto}</div>
      </div>

      <AnimatePresence>
        {aperto && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !salvando && setAperto(false)}
              style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(0,0,0,.3)" }}
            />
            <motion.aside
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              style={{
                position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 910,
                width: "min(640px, 96vw)", background: "var(--bg)", borderLeft: "1px solid var(--line)",
                display: "flex", flexDirection: "column",
              }}
            >
              <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--line)" }}>
                <div className="eyebrow" style={{ marginBottom: 4 }}>Testo della pagina</div>
                <div style={{ fontSize: 18, fontFamily: "var(--font-display)" }}>{id}</div>
              </div>

              <div style={{ padding: "14px 20px", fontSize: 12.5, color: "var(--ink-dim)", lineHeight: 1.6, borderBottom: "1px solid var(--line-soft)" }}>
                Riga vuota fra un paragrafo e l'altro. <code>## Titolo</code> per un titolo,
                <code> - voce</code> per un elenco, <code>**grassetto**</code>,
                <code> [testo](indirizzo)</code> per un collegamento.
                <br />
                Se salvi con il campo vuoto, o usi «Torna al testo originale», la pagina riprende
                quello scritto nel codice.
                {Object.keys(seg).length > 0 && (
                  <>
                    <br /><br />
                    <b>Numeri che si aggiornano da soli.</b> Scrivendo{" "}
                    {Object.keys(seg).map((k, i) => (
                      <span key={k}>{i > 0 && ", "}<code>{"{" + k + "}"}</code></span>
                    ))}{" "}
                    il testo mostra sempre il valore attuale del catalogo, anche fra un anno.
                    Sono già al posto giusto nel testo qui sotto: conviene lasciarli.
                  </>
                )}
              </div>

              <textarea
                value={bozza}
                onChange={(e) => setBozza(e.target.value)}
                spellCheck
                placeholder="Scrivi qui il testo della pagina…"
                style={{
                  flex: 1, margin: "14px 20px", padding: 14, resize: "none",
                  border: "1px solid var(--line)", borderRadius: 10,
                  background: "var(--bg-1)", color: "var(--ink)",
                  fontSize: 14, lineHeight: 1.6, fontFamily: "inherit",
                }}
              />

              {errore && <div style={{ color: "#a8483f", fontSize: 13, padding: "0 20px 10px" }}>{errore}</div>}

              <div style={{ display: "flex", gap: 8, padding: "14px 20px", borderTop: "1px solid var(--line)" }}>
                <button className="btn gold sm" onClick={salva} disabled={salvando}>
                  {salvando ? "Salvataggio…" : "Salva"}
                </button>
                <button className="btn ghost sm" onClick={() => setAperto(false)} disabled={salvando}>Annulla</button>
                {testo && (
                  <button className="btn ghost sm" style={{ marginLeft: "auto", color: "#a8483f" }}
                    onClick={ripristina} disabled={salvando}>
                    Torna al testo originale
                  </button>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
