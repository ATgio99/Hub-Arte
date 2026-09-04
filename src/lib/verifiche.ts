// ============================================================================
// Le schede verificate.
//
// Il catalogo è di 1115 opere, scritte a più riprese, e certi errori si vedono
// solo leggendo la scheda per intero: lo Spinario ellenistico archiviato sotto
// l'Umanesimo fiorentino perché il manuale lo cita lì, un ritratto del Fayyum
// con la fotografia di Nefertiti. Senza un segno di cosa è già stato letto, la
// revisione ricomincia da capo ogni volta.
//
// La spunta la mettono solo gli amministratori (lo dicono anche le regole del
// database), ma la lettura è di tutti: costa una chiamata sola, e serve tanto
// alla scheda quanto alla dashboard.
//
// La copia in memoria evita che ogni scheda aperta rifaccia la domanda al
// server; l'evento avvisa chi la sta guardando quando cambia.
// ============================================================================
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export const VERIFICHE_EVENT = "atlante:verifiche-cambiate";

export interface Verifica {
  entity_type: string;
  entity_id: string;
  verificata_il: string;
  verificata_da: string | null;
  nota: string | null;
}

let _cache: Map<string, Verifica> | null = null;
let _inCorso: Promise<Map<string, Verifica>> | null = null;

function chiave(tipo: string, id: string) { return `${tipo}:${id}`; }

/** Le verifiche, lette una volta sola e poi tenute in memoria. */
export async function caricaVerifiche(forza = false): Promise<Map<string, Verifica>> {
  if (_cache && !forza) return _cache;
  if (_inCorso && !forza) return _inCorso;

  _inCorso = (async () => {
    const { data, error } = await supabase
      .from("verifiche")
      .select("entity_type, entity_id, verificata_il, verificata_da, nota");
    const mappa = new Map<string, Verifica>();
    if (!error) {
      for (const r of data ?? []) mappa.set(chiave(r.entity_type, r.entity_id), r as Verifica);
    } else {
      console.error("[verifiche] lettura non riuscita:", error.message);
    }
    _cache = mappa;
    _inCorso = null;
    return mappa;
  })();

  return _inCorso;
}

function avvisa() {
  window.dispatchEvent(new CustomEvent(VERIFICHE_EVENT));
}

/**
 * Mette o toglie la spunta. Ritorna lo stato in cui l'opera è rimasta, così
 * chi chiama non deve rileggere.
 *
 * La copia in memoria si aggiorna subito e la chiamata al server viene dopo:
 * la spunta deve rispondere al tocco, non alla rete. Se il server rifiuta —
 * non sei amministratore, la rete non c'è — si torna indietro.
 */
export async function commutaVerifica(
  entityId: string,
  opts: { tipo?: string; email?: string | null } = {}
): Promise<boolean> {
  const tipo = opts.tipo ?? "work";
  const mappa = await caricaVerifiche();
  const k = chiave(tipo, entityId);
  const eraVerificata = mappa.has(k);
  const prima = mappa.get(k);

  if (eraVerificata) mappa.delete(k);
  else mappa.set(k, {
    entity_type: tipo, entity_id: entityId,
    verificata_il: new Date().toISOString(),
    verificata_da: opts.email ?? null, nota: null,
  });
  avvisa();

  const { error } = eraVerificata
    ? await supabase.from("verifiche").delete().eq("entity_type", tipo).eq("entity_id", entityId)
    : await supabase.from("verifiche").upsert(
        { entity_type: tipo, entity_id: entityId, verificata_da: opts.email ?? null,
          verificata_il: new Date().toISOString() },
        { onConflict: "entity_type,entity_id" });

  if (error) {
    console.error("[verifiche] scrittura non riuscita:", error.message);
    if (eraVerificata && prima) mappa.set(k, prima); else mappa.delete(k);
    avvisa();
    return eraVerificata;
  }
  return !eraVerificata;
}

/**
 * Le verifiche in un componente. `pronte` distingue «non ancora caricate» da
 * «nessuna verifica»: senza, ogni scheda lampeggerebbe «da verificare» per un
 * istante prima di sapere la verità.
 */
export function useVerifiche(tipo = "work") {
  const [mappa, setMappa] = useState<Map<string, Verifica>>(_cache ?? new Map());
  const [pronte, setPronte] = useState(_cache !== null);

  useEffect(() => {
    let vivo = true;
    caricaVerifiche().then((m) => {
      if (!vivo) return;
      setMappa(new Map(m));
      setPronte(true);
    });
    const aggiorna = () => { if (_cache) setMappa(new Map(_cache)); };
    window.addEventListener(VERIFICHE_EVENT, aggiorna);
    return () => { vivo = false; window.removeEventListener(VERIFICHE_EVENT, aggiorna); };
  }, []);

  return {
    pronte,
    /** Vero se quella scheda è già stata controllata. */
    verificata: (id: string) => mappa.has(chiave(tipo, id)),
    dettaglio: (id: string) => mappa.get(chiave(tipo, id)) ?? null,
    /** Quante ne sono state verificate, di questo tipo. */
    quante: [...mappa.values()].filter((v) => v.entity_type === tipo).length,
    tutte: mappa,
  };
}
