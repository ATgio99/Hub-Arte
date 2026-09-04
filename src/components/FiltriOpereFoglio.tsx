// ============================================================================
// FiltriOpereFoglio — i filtri delle Opere su schermo stretto.
//
// Nella pagina Opere i filtri sono sei: ricerca, tipo, periodo, preferiti,
// approfondite, complessi. Su un telefono occupavano quattro righe sotto il
// titolo, e la prima opera finiva sotto la piega: si arrivava al catalogo
// scorrendo oltre i comandi per cercarlo.
//
// Qui resta fuori solo la ricerca, che e' quella che si usa sempre, e il resto
// entra in un foglio che sale dal basso — lo stesso dell'intervallo storico,
// stesse classi e stesso gesto, perche' due fogli che si comportano diversi
// nella stessa app si imparano due volte.
//
// Il tasto dice quanti filtri sono accesi: un filtro attivo che non si vede e'
// il modo piu' rapido per far credere a qualcuno che il catalogo sia vuoto.
// ============================================================================
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

export type StatoApprofondite = "" | "studied" | "not-studied";

export interface StatoFiltri {
  type: string; setType: (v: string) => void; tipi: string[];
  period: string; setPeriod: (v: string) => void;
  periodOpts: { id: string; label: string; n: number }[];
  senzaPeriodo: number; chiaveSenzaPeriodo: string;
  favOnly: boolean; setFavOnly: (v: boolean) => void; nFav: number;
  /** "" nessun filtro, "studied" solo approfondite, "not-studied" solo da fare. */
  studiedFilter: StatoApprofondite; setStudiedFilter: (v: StatoApprofondite) => void;
  nStudiate: number; nDaStudiare: number;
  grouped: boolean; setGrouped: (v: boolean) => void; nGruppi: number;
  onAzzera: () => void;
  quante: number;
}

/** Quanti filtri sono accesi, ricerca esclusa: quella si vede da sola. */
export function contaFiltri(s: StatoFiltri): number {
  return [s.type, s.period, s.favOnly ? "1" : "", s.studiedFilter, s.grouped ? "1" : ""]
    .filter(Boolean).length;
}

export function BottoneFiltri({ attivi, onApri }: { attivi: number; onApri: () => void }) {
  return (
    <button className={`chip fav-chip ${attivi > 0 ? "active" : ""}`} onClick={onApri}
      data-testid="apri-foglio-filtri" aria-haspopup="dialog"
      style={{ flexShrink: 0 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" aria-hidden style={{ marginRight: 5 }}>
        <path d="M4 6h16M7 12h10M10 18h4" />
      </svg>
      Filtri{attivi > 0 ? ` (${attivi})` : ""}
    </button>
  );
}

export function FoglioFiltri({ aperto, onChiudi, s }:
  { aperto: boolean; onChiudi: () => void; s: StatoFiltri }) {

  useEffect(() => {
    if (!aperto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onChiudi(); };
    window.addEventListener("keydown", onKey);
    // Lo scorrimento del corpo si blocca qui perche' questo foglio, a
    // differenza di quello dell'intervallo, si apre dalla pagina e non da un
    // menu che l'ha gia' bloccato.
    const prima = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prima;
    };
  }, [aperto, onChiudi]);

  const attivi = contaFiltri(s);

  return createPortal(
    <AnimatePresence>
      {aperto && (
        <>
          <motion.div className="fint-velo"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }} onClick={onChiudi} />

          <motion.div className="fint-foglio" role="dialog" aria-modal="true"
            aria-label="Filtri del catalogo" data-testid="foglio-filtri"
            initial={{ y: "101%" }} animate={{ y: 0 }} exit={{ y: "101%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}>

            <div className="fint-maniglia" aria-hidden />

            <div className="fint-testa">
              <h2>Filtri</h2>
              {attivi > 0 && (
                <button className="fint-azzera" onClick={s.onAzzera} data-testid="foglio-filtri-azzera">
                  Azzera
                </button>
              )}
            </div>

            <div className="ffilt-corpo">
              <label className="ffilt-campo">
                <span className="ffilt-et">Tipo</span>
                <select className="input" value={s.type} onChange={(e) => s.setType(e.target.value)}
                  data-testid="foglio-select-type">
                  <option value="">Ogni tipo</option>
                  {s.tipi.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>

              <label className="ffilt-campo">
                <span className="ffilt-et">Periodo</span>
                <select className="input" value={s.period} onChange={(e) => s.setPeriod(e.target.value)}
                  data-testid="foglio-select-period">
                  <option value="">Ogni periodo</option>
                  {s.periodOpts.map((p) => <option key={p.id} value={p.id}>{p.label} ({p.n})</option>)}
                  {s.senzaPeriodo > 0 && (
                    <option value={s.chiaveSenzaPeriodo}>Senza periodo assegnato ({s.senzaPeriodo})</option>
                  )}
                </select>
              </label>

              <div className="ffilt-campo">
                <span className="ffilt-et">Le mie</span>
                <div className="ffilt-chip">
                  <button className={`chip fav-chip ${s.favOnly ? "active" : ""}`}
                    onClick={() => s.setFavOnly(!s.favOnly)} data-testid="foglio-fav-only">
                    ★ Preferiti{s.nFav > 0 ? ` (${s.nFav})` : ""}
                  </button>
                  <button className={`chip fav-chip ${s.studiedFilter === "studied" ? "active" : ""}`}
                    onClick={() => s.setStudiedFilter(s.studiedFilter === "studied" ? "" : "studied")}
                    data-testid="foglio-studied">
                    ✓ Approfondite{s.nStudiate > 0 ? ` (${s.nStudiate})` : ""}
                  </button>
                  <button className={`chip fav-chip ${s.studiedFilter === "not-studied" ? "active" : ""}`}
                    onClick={() => s.setStudiedFilter(s.studiedFilter === "not-studied" ? "" : "not-studied")}
                    data-testid="foglio-not-studied">
                    ○ Da approfondire{s.nDaStudiare > 0 ? ` (${s.nDaStudiare})` : ""}
                  </button>
                </div>
              </div>

              <div className="ffilt-campo">
                <span className="ffilt-et">Vista</span>
                <div className="ffilt-chip">
                  <button className={`chip ${s.grouped ? "active" : ""}`}
                    onClick={() => s.setGrouped(!s.grouped)} data-testid="foglio-grouped">
                    ⛨ Complessi{s.nGruppi > 0 ? ` (${s.nGruppi})` : ""}
                  </button>
                </div>
              </div>
            </div>

            <div className="ffilt-fondo">
              <button className="btn gold" onClick={onChiudi} data-testid="foglio-filtri-fatto"
                style={{ width: "100%", justifyContent: "center" }}>
                Vedi {s.quante} {s.quante === 1 ? "opera" : "opere"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
