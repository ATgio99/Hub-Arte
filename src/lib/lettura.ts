// ============================================================================
// Leggere ad alta voce.
//
// Serve a chi non vede o vede male, ma non solo: serve anche a chi studia
// camminando, a chi ha una dislessia, a chi dopo due ore di schermo non regge
// più una scheda di quattromila caratteri. Un atlante che si può ascoltare è
// un atlante che si può usare in più modi.
//
// Come. La voce è quella del sistema operativo, via `speechSynthesis`: è già
// nel browser, non costa niente, non manda niente a nessuno — il testo non
// esce dal dispositivo — e funziona anche senza rete. Le voci italiane di
// macOS e iOS sono buone; su Android sono discrete; su Windows si sente che
// sono sintetiche. Una voce «bella» davvero — quelle neurali che si sentono
// negli audiolibri — richiederebbe un servizio a pagamento e una chiave su un
// server, e per un progetto gratuito e aperto sarebbe la cosa sbagliata da
// legarsi addosso.
//
// Due accorgimenti che fanno la differenza fra una lettura usabile e una che
// si abbandona dopo dieci secondi:
//
//   1. Il testo si spezza in frasi. Un `SpeechSynthesisUtterance` lungo un
//      capitolo, su Chrome, si tronca dopo qualche minuto e la pausa non
//      riprende dal punto giusto. Frase per frase, invece, si può stare in
//      pausa, saltare avanti, tornare indietro, e la pagina sa sempre che cosa
//      sta leggendo.
//   2. Si dice da dove viene quello che si sente. Prima di ogni blocco la voce
//      annuncia l'occhiello — «Sintesi», «Lettura dell'opera» — perché chi
//      ascolta non ha la pagina davanti a fare da mappa.
// ============================================================================

export interface BloccoLettura {
  /** Serve alla pagina per illuminare quello che si sta leggendo. */
  id: string;
  /** «Sintesi», «Lettura dell'opera»: annunciato prima del testo. */
  occhiello?: string;
  testo: string;
}

type Stato = "ferma" | "legge" | "pausa";

interface Pezzo {
  bloccoId: string;
  indiceBlocco: number;
  testo: string;
}

const CHIAVE_VOCE = "atlante.lettura.voce";
const CHIAVE_VELOCITA = "atlante.lettura.velocita";

export const EVENTO_LETTURA = "atlante:lettura-cambiata";

class Lettore {
  blocchi: BloccoLettura[] = [];
  private pezzi: Pezzo[] = [];
  private indice = 0;
  stato: Stato = "ferma";
  velocita = 1;
  voceScelta: string | null = null;
  titolo = "";
  /** Cambia a ogni partenza. Serve perché `cancel()` fa scattare comunque
   *  l'`onend` della frase interrotta: senza un contrassegno, quella vecchia
   *  faceva avanzare l'indice mentre la nuova era già partita, e saltando un
   *  paragrafo la lettura scivolava fino in fondo da sola. */
  private turno = 0;

  constructor() {
    if (typeof window === "undefined") return;
    try {
      this.voceScelta = localStorage.getItem(CHIAVE_VOCE);
      const v = Number(localStorage.getItem(CHIAVE_VELOCITA));
      if (v >= 0.5 && v <= 2) this.velocita = v;
    } catch { /* niente memoria: si parte dai valori normali */ }
  }

  get disponibile(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  get haTesto(): boolean { return this.blocchi.length > 0; }

  /** Il blocco che si sta leggendo: la pagina lo illumina. */
  get bloccoCorrente(): string | null {
    return this.stato === "ferma" ? null : (this.pezzi[this.indice]?.bloccoId ?? null);
  }

  get avanzamento(): { pezzo: number; totale: number } {
    return { pezzo: this.indice + 1, totale: this.pezzi.length };
  }

  get frase(): string { return this.pezzi[this.indice]?.testo ?? ""; }

  // ── Le voci ───────────────────────────────────────────────────────────
  //
  // Si preferisce l'italiano, e fra le italiane quelle «migliorate»: i nomi
  // cambiano da sistema a sistema (Enhanced, Premium, Natural, Siri) ma la
  // parola c'è quasi sempre, e la differenza si sente. Le voci locali vengono
  // prima di quelle di rete, che si interrompono quando la linea va giù.
  voci(): SpeechSynthesisVoice[] {
    if (!this.disponibile) return [];
    const tutte = window.speechSynthesis.getVoices();
    const italiane = tutte.filter((v) => v.lang.toLowerCase().startsWith("it"));
    const punteggio = (v: SpeechSynthesisVoice) => {
      let p = 0;
      if (/enhanced|premium|natural|neural|siri/i.test(v.name)) p -= 10;
      if (v.localService) p -= 3;
      if (/compact|eloquence/i.test(v.name)) p += 5;
      return p;
    };
    return italiane.sort((a, b) => punteggio(a) - punteggio(b) || a.name.localeCompare(b.name));
  }

  private voce(): SpeechSynthesisVoice | undefined {
    const elenco = this.voci();
    if (elenco.length === 0) return undefined;
    return elenco.find((v) => v.voiceURI === this.voceScelta) ?? elenco[0];
  }

  scegliVoce(voiceURI: string) {
    this.voceScelta = voiceURI;
    try { localStorage.setItem(CHIAVE_VOCE, voiceURI); } catch { /* ignore */ }
    if (this.stato === "legge") { const i = this.indice; this.ferma(); this.parti(i); }
    this.avvisa();
  }

  cambiaVelocita(v: number) {
    this.velocita = Math.min(2, Math.max(0.5, Number(v.toFixed(2))));
    try { localStorage.setItem(CHIAVE_VELOCITA, String(this.velocita)); } catch { /* ignore */ }
    if (this.stato === "legge") { const i = this.indice; this.ferma(); this.parti(i); }
    this.avvisa();
  }

  // ── Il testo ──────────────────────────────────────────────────────────
  carica(titolo: string, blocchi: BloccoLettura[]) {
    const cambiato =
      titolo !== this.titolo ||
      blocchi.length !== this.blocchi.length ||
      blocchi.some((b, i) => b.testo !== this.blocchi[i]?.testo);
    if (!cambiato) return;
    if (this.stato !== "ferma") this.ferma();
    this.titolo = titolo;
    this.blocchi = blocchi.filter((b) => b.testo?.trim());
    this.pezzi = this.spezza(this.blocchi);
    this.indice = 0;
    this.avvisa();
  }

  svuota() {
    if (this.stato !== "ferma") this.ferma();
    this.blocchi = []; this.pezzi = []; this.titolo = ""; this.indice = 0;
    this.avvisa();
  }

  /** Frasi, non paragrafi: è l'unità su cui si può stare in pausa e tornare
   *  indietro. Le abbreviazioni con il punto — «sec.», «a.C.» — non devono
   *  spezzare la frase in mezzo. */
  private spezza(blocchi: BloccoLettura[]): Pezzo[] {
    const fuori: Pezzo[] = [];
    blocchi.forEach((b, i) => {
      if (b.occhiello) fuori.push({ bloccoId: b.id, indiceBlocco: i, testo: b.occhiello + "." });
      const testo = b.testo.replace(/\s+/g, " ").trim();
      // Si taglia dopo punto, esclamativo o interrogativo solo quando segue
      // una maiuscola: «sec.» e «a.C.» non devono spezzare la frase a metà.
      const CONFINE = "\u0001";
      const frasi = testo
        .replace(/([.!?])\s+(?=[A-ZÀ-Ý«"'(])/g, "$1" + CONFINE)
        .split(CONFINE)
        .map((f) => f.trim())
        .filter(Boolean);
      // Le frasi lunghissime si tagliano anche sui punti e virgola: chi ascolta
      // ha bisogno di respiri, e la pausa deve avere dove appoggiarsi.
      for (const f of frasi) {
        if (f.length <= 320) { fuori.push({ bloccoId: b.id, indiceBlocco: i, testo: f }); continue; }
        for (const p of f.split(/;\s+/)) {
          if (p.trim()) fuori.push({ bloccoId: b.id, indiceBlocco: i, testo: p.trim() });
        }
      }
    });
    return fuori;
  }

  // ── I comandi ─────────────────────────────────────────────────────────
  leggi() {
    if (!this.disponibile || this.pezzi.length === 0) return;
    if (this.stato === "legge") { this.pausa(); return; }
    if (this.stato === "pausa") { this.riprendi(); return; }
    this.parti(0);
  }

  private parti(da: number) {
    this.turno++;
    window.speechSynthesis.cancel();
    this.indice = Math.max(0, Math.min(da, this.pezzi.length - 1));
    this.stato = "legge";
    this.avvisa();
    this.dilloDa(this.indice, this.turno);
  }

  private dilloDa(i: number, turno: number) {
    if (turno !== this.turno) return;
    if (i >= this.pezzi.length) { this.ferma(); return; }
    const u = new SpeechSynthesisUtterance(this.pezzi[i].testo);
    const v = this.voce();
    if (v) u.voice = v;
    u.lang = v?.lang ?? "it-IT";
    u.rate = this.velocita;
    u.pitch = 1;
    u.onend = () => {
      // La frase interrotta da `cancel()` arriva qui lo stesso: se non è più
      // il suo turno non deve toccare niente.
      if (turno !== this.turno || this.stato !== "legge") return;
      this.indice = i + 1;
      if (this.indice >= this.pezzi.length) { this.ferma(); return; }
      this.avvisa();
      this.dilloDa(this.indice, turno);
    };
    u.onerror = () => {
      if (turno !== this.turno || this.stato !== "legge") return;
      this.ferma();
    };
    window.speechSynthesis.speak(u);
  }

  pausa() {
    if (!this.disponibile || this.stato !== "legge") return;
    this.turno++;
    // `pause()` su alcune versioni di Chrome non riprende mai: si ferma la
    // frase in corso e si riparte da quella, che è indistinguibile all'orecchio.
    window.speechSynthesis.cancel();
    this.stato = "pausa";
    this.avvisa();
  }

  riprendi() {
    if (this.stato !== "pausa") return;
    this.parti(this.indice);
  }

  ferma() {
    if (!this.disponibile) return;
    this.turno++;
    window.speechSynthesis.cancel();
    this.stato = "ferma";
    this.indice = 0;
    this.avvisa();
  }

  /** Avanti e indietro di un blocco intero, non di una frase: chi ascolta
   *  salta un paragrafo, non una virgola. */
  saltaBlocco(direzione: 1 | -1) {
    if (this.pezzi.length === 0) return;
    const ora = this.pezzi[this.indice]?.indiceBlocco ?? 0;
    const voluto = ora + direzione;
    const i = this.pezzi.findIndex((p) => p.indiceBlocco === voluto);
    if (i < 0) {
      if (direzione < 0) this.parti(0);
      return;
    }
    if (this.stato === "ferma") { this.indice = i; this.avvisa(); return; }
    this.parti(i);
  }

  private avvisa() {
    window.dispatchEvent(new CustomEvent(EVENTO_LETTURA));
  }
}

export const lettore = new Lettore();

// ── L'aggancio per le pagine ───────────────────────────────────────────────
//
// Una pagina dichiara che cosa c'è da leggere e in che ordine; quando la si
// lascia, la voce si ferma. L'ordine è quello in cui uno leggerebbe a voce
// alta: titolo, chi e quando, poi il testo.
import { useEffect, useState } from "react";

export function useTestoLeggibile(titolo: string, blocchi: BloccoLettura[]) {
  const impronta = titolo + "|" + blocchi.map((b) => b.id + b.testo.length).join("|");
  useEffect(() => {
    lettore.carica(titolo, blocchi);
    return () => lettore.svuota();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impronta]);
}

/** Il blocco che si sta ascoltando, per illuminarlo nella pagina. */
export function useBloccoLetto(): string | null {
  const [, forza] = useState(0);
  useEffect(() => {
    const suCambio = () => forza((v) => v + 1);
    window.addEventListener(EVENTO_LETTURA, suCambio);
    return () => window.removeEventListener(EVENTO_LETTURA, suCambio);
  }, []);
  return lettore.bloccoCorrente;
}
