// ============================================================================
// La barra dell'ascolto.
//
// Compare in fondo alla pagina solo dove c'è qualcosa da leggere — una scheda,
// un artista, un periodo — e sparisce altrove: un comando che non serve non
// deve stare lì a farsi guardare.
//
// I comandi sono quattro, grandi abbastanza da prendersi col pollice, e ognuno
// ha la sua scorciatoia: chi ascolta perché non vede lo schermo non usa il
// mouse. La voce e la velocità si scelgono e restano scelte.
//
// Sul primo tasto c'è scritto quanto manca, non «play»: chi ascolta vuole
// sapere se sta per iniziare un minuto o dieci.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { lettore, EVENTO_LETTURA } from "../lib/lettura";

function usaLettore() {
  const [, forza] = useState(0);
  useEffect(() => {
    const suCambio = () => forza((v) => v + 1);
    window.addEventListener(EVENTO_LETTURA, suCambio);
    // Le voci arrivano in ritardo: al primo caricamento `getVoices()` è vuoto
    // e si popola quando il sistema ha finito di elencarle.
    if ("speechSynthesis" in window) {
      window.speechSynthesis.addEventListener?.("voiceschanged", suCambio);
    }
    return () => {
      window.removeEventListener(EVENTO_LETTURA, suCambio);
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
  if (minuti < 1) return "meno di un minuto";
  return `${Math.round(minuti)} min`;
}

export default function Lettore() {
  const l = usaLettore();
  const [aperto, setAperto] = useState(false);
  const barra = useRef<HTMLDivElement>(null);

  // Le scorciatoie stanno qui e non nel modulo generale perché valgono solo
  // quando c'è del testo caricato: altrove il tasto L non deve fare niente.
  useEffect(() => {
    const scrive = () => {
      const a = document.activeElement as HTMLElement | null;
      return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!l.haTesto || scrive() || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        if (e.shiftKey) l.ferma(); else l.leggi();
      } else if (e.key === ".") { e.preventDefault(); l.saltaBlocco(1); }
      else if (e.key === ",") { e.preventDefault(); l.saltaBlocco(-1); }
      else if (e.key === "+" || e.key === "=") { e.preventDefault(); l.cambiaVelocita(l.velocita + 0.1); }
      else if (e.key === "-") { e.preventDefault(); l.cambiaVelocita(l.velocita - 0.1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [l]);

  if (!l.haTesto) return null;

  if (!l.disponibile) {
    return (
      <div className="lettore" role="note">
        <span className="lettore-nota">
          Questo browser non sa leggere ad alta voce. Su Safari, Chrome ed Edge la funzione c'è.
        </span>
      </div>
    );
  }

  const voci = l.voci();
  const caratteri = l.blocchi.reduce((n, b) => n + b.testo.length, 0);
  const { pezzo, totale } = l.avanzamento;
  const legge = l.stato === "legge";

  return (
    <div className="lettore" ref={barra} role="region" aria-label="Ascolta la pagina">
      <div className="lettore-riga">
        <button
          className="lettore-tasto lettore-tasto-primo"
          onClick={() => l.leggi()}
          aria-pressed={legge}
          data-testid="lettore-leggi"
          title="Leggi ad alta voce  ·  tasto L"
        >
          <span aria-hidden="true">{legge ? "⏸" : "▶"}</span>
          <span>
            {legge ? "Pausa" : l.stato === "pausa" ? "Riprendi" : "Ascolta la pagina"}
            {l.stato === "ferma" && (
              <span className="lettore-durata"> · {durata(caratteri, l.velocita)}</span>
            )}
          </span>
        </button>

        {l.stato !== "ferma" && (
          <>
            <button className="lettore-tasto" onClick={() => l.saltaBlocco(-1)}
              title="Paragrafo precedente · tasto ," aria-label="Paragrafo precedente">⏮</button>
            <button className="lettore-tasto" onClick={() => l.saltaBlocco(1)}
              title="Paragrafo successivo · tasto ." aria-label="Paragrafo successivo">⏭</button>
            <button className="lettore-tasto" onClick={() => l.ferma()}
              title="Ferma · ⇧L" aria-label="Ferma la lettura" data-testid="lettore-ferma">⏹</button>
            <span className="lettore-avanzamento tnum" aria-hidden="true">{pezzo}/{totale}</span>
          </>
        )}

        <button
          className="lettore-tasto lettore-tasto-impostazioni"
          onClick={() => setAperto((v) => !v)}
          aria-expanded={aperto}
          title="Voce e velocità"
          data-testid="lettore-impostazioni"
        >
          Voce
        </button>
      </div>

      {/* Quello che si sta sentendo, scritto: serve a chi ci vede poco e segue
          con gli occhi, e a chi legge in un posto dove non può alzare il volume. */}
      {l.stato !== "ferma" && (
        <div className="lettore-frase" aria-live="polite">{l.frase}</div>
      )}

      {aperto && (
        <div className="lettore-impostazioni">
          <label className="lettore-campo">
            <span>Voce</span>
            {voci.length === 0 ? (
              <span className="lettore-nota">
                Nessuna voce italiana installata su questo dispositivo.
              </span>
            ) : (
              <select
                value={voci.find((v) => v.voiceURI === l.voceScelta)?.voiceURI ?? voci[0].voiceURI}
                onChange={(e) => l.scegliVoce(e.target.value)}
                data-testid="lettore-voce"
              >
                {voci.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name}{v.localService ? "" : " (di rete)"}
                  </option>
                ))}
              </select>
            )}
          </label>

          <label className="lettore-campo">
            <span>Velocità <b className="tnum">{l.velocita.toFixed(1)}×</b></span>
            <input
              type="range" min={0.5} max={2} step={0.1}
              value={l.velocita}
              onChange={(e) => l.cambiaVelocita(Number(e.target.value))}
              data-testid="lettore-velocita"
            />
          </label>

          <p className="lettore-nota">
            La voce è quella installata sul dispositivo: il testo non esce da qui e non serve
            la rete. Su Mac e iPhone se ne scaricano di migliori da Impostazioni →
            Accessibilità → Contenuto pronunciato → Voci.
          </p>
        </div>
      )}
    </div>
  );
}
