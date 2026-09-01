// ============================================================================
// Scorciatoie da tastiera — solo su desktop.
//
// Servono a chi sta consultando l'atlante con le mani sulla tastiera e a chi
// non usa il mouse. Su telefono non hanno senso e restano spente.
//
// Regola che governa tutto: un tasto singolo non deve mai rubare una lettera a
// chi sta scrivendo. Prima di reagire si controlla dove sta il cursore, e se e'
// dentro un campo di testo la scorciatoia non scatta.
//
// I numeri 1-9 sono gli stessi che il menu mostra accanto a ogni sezione: chi
// li ha visti una volta li sa gia'.
// ============================================================================
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { STONES } from "./pages";

/** Rotta della pagina che elenca le scorciatoie. */
export const ROTTA_SCORCIATOIE = "/legal/accessibilita";

export interface Scorciatoia {
  tasti: string;
  cosa: string;
}

/** L'elenco per la pagina Accessibilità: si scrive qui una volta sola, così
 *  quello che si legge e quello che funziona non possono divergere. */
export const SCORCIATOIE: { gruppo: string; voci: Scorciatoia[] }[] = [
  {
    gruppo: "Andare da qualche parte",
    voci: [
      ...STONES.map((s) => ({ tasti: s.num.replace(/^0/, ""), cosa: s.name })),
      { tasti: "H", cosa: "Pagina iniziale" },
      { tasti: "Alt ←", cosa: "Indietro nella cronologia" },
      { tasti: "Alt →", cosa: "Avanti nella cronologia" },
    ],
  },
  {
    gruppo: "Scorrere la pagina",
    voci: [
      { tasti: "J", cosa: "Scendi" },
      { tasti: "K", cosa: "Sali" },
      { tasti: "Barra spaziatrice", cosa: "Scendi di una schermata" },
      { tasti: "⇧ Barra spaziatrice", cosa: "Sali di una schermata" },
      { tasti: "Fn ← / Fn →", cosa: "Cima e fondo della pagina (su tastiere con i tasti Inizio e Fine, quelli)" },
    ],
  },
  {
    gruppo: "Comandi",
    voci: [
      { tasti: "/", cosa: "Vai alla barra di ricerca" },
      { tasti: "M", cosa: "Apri o chiudi il menu" },
      { tasti: "?", cosa: "Questa pagina" },
      { tasti: "Esc", cosa: "Chiudi quello che è aperto, o esci dal campo di testo" },
    ],
  },
];

// Opere e Protagonisti mettono il cursore nella barra di ricerca appena si
// arriva: comodo per chi ci clicca sopra col mouse, ma se ci si e' arrivati
// premendo «1» il campo si mangia il tasto successivo e le scorciatoie
// smettono di funzionare. Chi arriva da tastiera continua a navigare da
// tastiera; il segnale dura giusto il tempo del cambio pagina.
let arrivoDaTastiera = 0;

/** Vero se si e' appena arrivati su questa pagina con una scorciatoia. */
export function arrivatoDaTastiera(): boolean {
  return Date.now() - arrivoDaTastiera < 1500;
}

/** Vero se il cursore e' dentro qualcosa in cui si sta scrivendo. */
function staScrivendo(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function useScorciatoie() {
  const nav = useNavigate();

  useEffect(() => {
    // Su telefono la tastiera non c'e', e i tasti singoli darebbero solo fastidio.
    const desktop = () => window.matchMedia("(min-width: 901px)").matches;

    const scorri = (quanto: number) =>
      window.scrollBy({ top: quanto, behavior: "smooth" });

    const onKey = (e: KeyboardEvent) => {
      if (!desktop()) return;

      // Avanti e indietro con Alt: e' l'unica che convive con un modificatore,
      // perche' ricalca quella del browser.
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === "ArrowLeft") { e.preventDefault(); nav(-1); return; }
        if (e.key === "ArrowRight") { e.preventDefault(); nav(1); return; }
      }

      if (e.key === "Escape" && staScrivendo()) {
        (document.activeElement as HTMLElement).blur();
        return;
      }

      // Da qui in giu' sono tasti singoli: mai mentre si scrive, mai con
      // Ctrl o Cmd premuti (sono scorciatoie del browser).
      if (staScrivendo() || e.ctrlKey || e.metaKey || e.altKey) return;

      // Sezioni 1-9, gli stessi numeri stampati nel menu.
      if (/^[1-9]$/.test(e.key)) {
        const s = STONES[Number(e.key) - 1];
        if (s) { e.preventDefault(); arrivoDaTastiera = Date.now(); nav(s.route); }
        return;
      }

      switch (e.key) {
        case "h":
        case "H":
          e.preventDefault(); arrivoDaTastiera = Date.now(); nav("/"); break;
        case "j":
        case "J":
          e.preventDefault(); scorri(140); break;
        case "k":
        case "K":
          e.preventDefault(); scorri(-140); break;
        case "m":
        case "M":
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("atlante:scorciatoia-menu"));
          break;
        case "/": {
          e.preventDefault();
          const campo = document.querySelector<HTMLInputElement>(
            'main input[type="search"], main input[type="text"], main input:not([type])'
          );
          if (campo) { campo.focus(); campo.select?.(); }
          break;
        }
        case "?":
          e.preventDefault(); nav(ROTTA_SCORCIATOIE); break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav]);
}
