// ============================================================================
// L'ascolto: un'icona, e i comandi solo se li si chiede.
//
// Prima era una barra larga in fondo alla finestra. Sbagliato per due motivi:
// occupava lo spazio della lettura anche a chi non l'aveva chiesta, e stando
// al centro finiva sotto la barra laterale su schermo largo e sotto il velo
// del menu su telefono.
//
// Ora è un pulsante tondo in basso a destra — dove il pollice arriva e dove
// non c'è nient'altro — e si apre in una scheda piccola solo quando serve.
// Chi non lo vuole vedere lo spegne dalla pagina Accessibilità.
//
// La voce resta quella del sistema operativo (vedi lib/lettura.ts). Le voci
// «da personaggio» che macOS installa — Rocko, Grandma, Shelley — non servono
// a leggere una scheda: restano disponibili, ma sotto, e in cima ci sono
// quelle vere.
// ============================================================================
import { useEffect, useState } from "react";
import { lettore, EVENTO_LETTURA, LETTURA_ATTIVA, letturaAttiva } from "../lib/lettura";

function usaLettore() {
  const [, forza] = useState(0);
  useEffect(() => {
    const suCambio = () => forza((v) => v + 1);
    window.addEventListener(EVENTO_LETTURA, suCambio);
    window.addEventListener(LETTURA_ATTIVA, suCambio);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.addEventListener?.("voiceschanged", suCambio);
    }
    return () => {
      window.removeEventListener(EVENTO_LETTURA, suCambio);
      window.removeEventListener(LETTURA_ATTIVA, suCambio);
      if ("speechSynthesis" in window) {
        window.speechSynthesis.removeEventListener?.("voiceschanged", suCambio);
      }
    };
  }, []);
  return lettore;
}

/** Quanto dura, all'incirca: 950 caratteri al minuto a velocità normale. */
function durata(caratteri: number, velocita: number): string {
  const minuti = caratteri / (950 * velocita);
  return minuti < 1 ? "meno di un minuto" : `circa ${Math.round(minuti)} min`;
}

function Cuffie({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="2.5" y="13.5" width="4.5" height="7" rx="2" />
      <rect x="17" y="13.5" width="4.5" height="7" rx="2" />
    </svg>
  );
}

export default function Lettore() {
  const l = usaLettore();
  const [aperto, setAperto] = useState(false);
  const [impostazioni, setImpostazioni] = useState(false);

  useEffect(() => {
    const scrive = () => {
      const a = document.activeElement as HTMLElement | null;
      return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!l.haTesto || !letturaAttiva() || scrive() || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        if (e.shiftKey) { l.ferma(); return; }
        setAperto(true);
        l.leggi();
      } else if (e.key === ".") { e.preventDefault(); l.saltaBlocco(1); }
      else if (e.key === ",") { e.preventDefault(); l.saltaBlocco(-1); }
      else if (e.key === "+" || e.key === "=") { e.preventDefault(); l.cambiaVelocita(l.velocita + 0.1); }
      else if (e.key === "-") { e.preventDefault(); l.cambiaVelocita(l.velocita - 0.1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [l]);

  if (!l.haTesto || !l.disponibile || !letturaAttiva()) return null;

  const legge = l.stato === "legge";
  const { pezzo, totale } = l.avanzamento;
  const caratteri = l.blocchi.reduce((n, b) => n + b.testo.length, 0);
  const quanto = totale ? Math.round((pezzo / totale) * 100) : 0;

  // ── Chiuso: un pulsante e basta ───────────────────────────────────────
  if (!aperto) {
    return (
      <button
        className={`lettore-bolla ${legge ? "legge" : ""}`}
        onClick={() => setAperto(true)}
        title={legge ? "Sto leggendo — apri i comandi" : `Ascolta la pagina · ${durata(caratteri, l.velocita)} · tasto L`}
        aria-label={legge ? "Lettura in corso: apri i comandi" : "Ascolta la pagina ad alta voce"}
        data-testid="lettore-bolla"
      >
        <Cuffie />
        {legge && <span className="lettore-onda" aria-hidden="true"><i /><i /><i /></span>}
      </button>
    );
  }

  // ── Aperto: una scheda piccola, nell'angolo ───────────────────────────
  const voci = l.voci();
  const consigliate = voci.filter((v) => !l.vocePerModoDiDire(v));
  const altre = voci.filter((v) => l.vocePerModoDiDire(v));
  const scelta = voci.find((v) => v.voiceURI === l.voceScelta)?.voiceURI ?? voci[0]?.voiceURI;

  return (
    <div className="lettore-scheda" role="region" aria-label="Ascolta la pagina" data-testid="lettore">
      <div className="lettore-testa">
        <span className="lettore-titolo">
          <Cuffie size={15} />
          {legge ? "Sto leggendo" : l.stato === "pausa" ? "In pausa" : "Ascolta la pagina"}
        </span>
        <button className="lettore-chiudi" onClick={() => setAperto(false)}
          title="Riduci a icona" aria-label="Riduci a icona" data-testid="lettore-riduci">⌄</button>
      </div>

      {l.stato === "ferma" ? (
        <p className="lettore-nota">{l.titolo} · {durata(caratteri, l.velocita)}</p>
      ) : (
        <>
          <div className="lettore-barra" aria-hidden="true"><span style={{ width: `${quanto}%` }} /></div>
          <p className="lettore-frase" aria-live="polite">{l.frase}</p>
        </>
      )}

      <div className="lettore-comandi">
        <button className="lettore-t" onClick={() => l.saltaBlocco(-1)} disabled={l.stato === "ferma"}
          title="Paragrafo precedente · tasto ," aria-label="Paragrafo precedente">⏮</button>
        <button className="lettore-t lettore-t-grande" onClick={() => l.leggi()}
          title="Leggi o metti in pausa · tasto L" aria-label={legge ? "Metti in pausa" : "Leggi"}
          data-testid="lettore-leggi">{legge ? "⏸" : "▶"}</button>
        <button className="lettore-t" onClick={() => l.saltaBlocco(1)} disabled={l.stato === "ferma"}
          title="Paragrafo successivo · tasto ." aria-label="Paragrafo successivo">⏭</button>
        <button className="lettore-t" onClick={() => l.ferma()} disabled={l.stato === "ferma"}
          title="Ferma · ⇧L" aria-label="Ferma" data-testid="lettore-ferma">⏹</button>
        <button className={`lettore-t lettore-t-fine ${impostazioni ? "acceso" : ""}`}
          onClick={() => setImpostazioni((v) => !v)} aria-expanded={impostazioni}
          title="Voce e velocità" aria-label="Voce e velocità" data-testid="lettore-impostazioni">⚙</button>
      </div>

      {impostazioni && (
        <div className="lettore-opzioni">
          <label className="lettore-campo">
            <span>Voce</span>
            {voci.length === 0 ? (
              <span className="lettore-nota">Nessuna voce italiana su questo dispositivo.</span>
            ) : (
              <select value={scelta} onChange={(e) => l.scegliVoce(e.target.value)} data-testid="lettore-voce">
                {consigliate.length > 0 && (
                  <optgroup label="Per leggere">
                    {consigliate.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name}{v.localService ? "" : " · di rete"}
                      </option>
                    ))}
                  </optgroup>
                )}
                {altre.length > 0 && (
                  <optgroup label="Voci di carattere">
                    {altre.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
                  </optgroup>
                )}
              </select>
            )}
          </label>

          <label className="lettore-campo">
            <span>Velocità <b className="tnum">{l.velocita.toFixed(1)}×</b></span>
            <input type="range" min={0.5} max={2} step={0.1} value={l.velocita}
              onChange={(e) => l.cambiaVelocita(Number(e.target.value))} data-testid="lettore-velocita" />
          </label>

          <p className="lettore-nota">
            Le voci sono quelle installate qui: il testo non esce dal dispositivo. Su Mac e iPhone
            se ne scaricano di molto migliori — cercare quelle <b>migliorate</b> o <b>premium</b> in
            Impostazioni → Accessibilità → Contenuto pronunciato → Voci → Italiano.
          </p>
        </div>
      )}
    </div>
  );
}
