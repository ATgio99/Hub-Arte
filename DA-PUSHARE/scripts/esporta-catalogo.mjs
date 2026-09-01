// ============================================================================
// Esporta il catalogo dal database dentro i file JSON di public/data.
//
// A cosa serve. Il catalogo vive nei JSON: chi clona il repository ha subito
// l'atlante completo e il sito funziona anche senza credenziali. Il database
// resta il banco di lavoro dell'amministratore: le modifiche fatte dalla
// dashboard si vedono online subito (l'app chiede solo le righe cambiate dopo
// la data qui sotto), e quando si vogliono consolidare nel repository si lancia
// questo comando.
//
//   npm run esporta-catalogo
//
// Cosa fa, in ordine:
//   1. scarica le sette tabelle del catalogo;
//   2. le fonde con i JSON — il database vince sulle righe con lo stesso id;
//   3. elimina davvero le righe nascoste (hidden_entities), invece di
//      lasciarle nei file e filtrarle a ogni avvio;
//   4. porta le immagini scelte dall'amministratore dentro le opere, cosi'
//      diventano quelle predefinite per tutti;
//   5. riscrive i JSON e aggiorna public/data/meta.json con la data di export.
//
// Serve solo la chiave anonima: le policy di lettura sono pubbliche.
// ============================================================================
import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const QUI = dirname(fileURLToPath(import.meta.url));
const DATI = join(QUI, "..", "public", "data");

const URL = process.env.VITE_SUPABASE_URL || "https://ddsdvcznziciqdambgom.supabase.co";
const KEY = process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkc2R2Y3puemljaXFkYW1iZ29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMDgzNzcsImV4cCI6MjA5Nzg4NDM3N30.WliliS2vw5dMtIcKUaU7KEm2g8smAjm8fMHaNRb6v5c";

const db = createClient(URL, KEY);

// nome del file JSON -> nome della tabella
const TABELLE = {
  periods: "periods",
  works: "works",
  artists: "artists",
  techniques: "techniques",
  terms: "terms",
  events: "events",
  connections: "connections",
};

// Supabase restituisce al massimo mille righe per volta: qui le prendiamo tutte.
async function scaricaTutto(tabella) {
  const righe = [];
  const PAGINA = 1000;
  for (let da = 0; ; da += PAGINA) {
    const { data, error } = await db.from(tabella).select("*").range(da, da + PAGINA - 1);
    if (error) throw new Error(`${tabella}: ${error.message}`);
    righe.push(...data);
    if (data.length < PAGINA) break;
  }
  return righe;
}

// Le colonne di servizio non hanno senso nei file del catalogo.
const DA_SCARTARE = new Set(["created_at", "updated_at", "modified_by"]);
function ripulisci(riga) {
  const out = {};
  for (const [k, v] of Object.entries(riga)) if (!DA_SCARTARE.has(k)) out[k] = v;
  return out;
}

async function leggiJson(nome) {
  try {
    return JSON.parse(await readFile(join(DATI, `${nome}.json`), "utf8"));
  } catch {
    return [];
  }
}

async function main() {
  console.log("Esporto il catalogo dal database…\n");

  const nascosti = new Set((await scaricaTutto("hidden_entities")).map((r) => r.id));
  console.log(`  voci nascoste da rimuovere: ${nascosti.size}`);

  // Le immagini scelte a mano diventano quelle predefinite delle opere.
  const immagini = new Map();
  for (const r of await scaricaTutto("image_overrides")) {
    if (r.is_global === true && r.url) immagini.set(r.work_id, r.url);
  }
  console.log(`  immagini scelte dall'amministratore: ${immagini.size}\n`);

  const riepilogo = [];

  for (const [file, tabella] of Object.entries(TABELLE)) {
    const daJson = await leggiJson(file);
    const daDb = (await scaricaTutto(tabella)).map(ripulisci);

    // il database vince sulle righe con lo stesso id, le nuove si aggiungono
    const mappa = new Map(daJson.map((r) => [r.id, r]));
    let aggiornate = 0, aggiunte = 0;
    for (const r of daDb) {
      if (mappa.has(r.id)) { mappa.set(r.id, { ...mappa.get(r.id), ...r }); aggiornate++; }
      else { mappa.set(r.id, r); aggiunte++; }
    }

    // le voci nascoste escono davvero dal catalogo
    let rimosse = 0;
    for (const id of nascosti) if (mappa.delete(id)) rimosse++;

    let conImmagine = 0;
    if (file === "works") {
      for (const opera of mappa.values()) {
        const url = immagini.get(opera.id);
        if (url && opera.image_url !== url) { opera.image_url = url; conImmagine++; }
      }
    }

    const finale = [...mappa.values()];
    await writeFile(join(DATI, `${file}.json`), JSON.stringify(finale, null, 1), "utf8");

    riepilogo.push({ file, totale: finale.length, aggiornate, aggiunte, rimosse, conImmagine });
    console.log(
      `  ${file.padEnd(12)} ${String(finale.length).padStart(5)} voci` +
      `  (${aggiornate} aggiornate, ${aggiunte} aggiunte` +
      (rimosse ? `, ${rimosse} rimosse` : "") +
      (conImmagine ? `, ${conImmagine} immagini` : "") + ")"
    );
  }

  // L'app confronta questa data con updated_at per chiedere al database solo
  // le righe modificate dopo l'ultimo export.
  const meta = { esportato_il: new Date().toISOString(), tabelle: riepilogo };
  await writeFile(join(DATI, "meta.json"), JSON.stringify(meta, null, 1), "utf8");

  console.log(`\nFatto. Catalogo allineato al ${meta.esportato_il}.`);
  console.log("Ricordati di pubblicare i JSON aggiornati.");
}

main().catch((e) => { console.error("\nErrore:", e.message); process.exit(1); });
