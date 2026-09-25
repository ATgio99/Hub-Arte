// ============================================================================
// Le pagine che Google puo' leggere.
//
// Il sito e' un'applicazione a pagina unica: tutte le schede stanno dopo il
// cancelletto (basearte.it/#/opera/spinario) e per un motore di ricerca quello
// e' un indirizzo solo, la home. Per farsi trovare servono indirizzi veri, uno
// per scheda, con dentro il testo.
//
// Questo script gira dopo `vite build` e scrive dentro dist/:
//   - una pagina per ogni opera, autore o committente, periodo, citta',
//     termine del glossario e tecnica (basearte.it/opera/spinario/ e cosi' via),
//     con titolo, descrizione, dati strutturati e il testo della scheda;
//   - le pagine indice delle sezioni (/opere/, /artisti/, /glossario/…);
//   - la home con il suo testo, sitemap.xml, robots.txt e 404.html.
//
// Chi apre una di queste pagine col browser non resta sulla versione statica:
// un piccolo script la porta subito sulla scheda interattiva corrispondente
// (/#/opera/spinario) prima che parta l'applicazione. Il testo statico serve a
// chi non esegue JavaScript e a far capire a Google che cosa c'e' in pagina;
// l'indirizzo canonico resta quello senza cancelletto.
//
// I dati sono quelli del sito: i JSON di public/data con sopra le righe
// corrette su Supabase, le voci nascoste tolte e le immagini scelte a mano.
// Se il database non risponde si usano i JSON da soli, e la build non si ferma.
//
//   node scripts/genera-pagine.mjs      (lo lancia gia' `npm run build`)
// ============================================================================
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { transformWithEsbuild } from "vite";

const QUI = dirname(fileURLToPath(import.meta.url));
const RADICE = join(QUI, "..");
const DATI = join(RADICE, "public", "data");
const DIST = join(RADICE, "dist");

const SITO = "https://basearte.it";
const NOME = "Base Arte";
const SOTTOTITOLO = "Atlante di storia dell'arte";
const GITHUB = "https://github.com/ATgio99/Hub-Arte";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://ddsdvcznziciqdambgom.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkc2R2Y3puemljaXFkYW1iZ29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMDgzNzcsImV4cCI6MjA5Nzg4NDM3N30.WliliS2vw5dMtIcKUaU7KEm2g8smAjm8fMHaNRb6v5c";

// ---------------------------------------------------------------------------
// Dati
// ---------------------------------------------------------------------------
const TABELLE = ["periods", "works", "artists", "techniques", "terms", "connections", "fonti"];

async function tabella(nome) {
  const righe = [];
  for (let da = 0; ; da += 1000) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${nome}?select=*`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Range: `${da}-${da + 999}` },
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) throw new Error(`${nome}: ${r.status}`);
    const pagina = await r.json();
    righe.push(...pagina);
    if (pagina.length < 1000) break;
  }
  return righe;
}

async function caricaDati() {
  const ds = {};
  for (const t of TABELLE) ds[t] = JSON.parse(await readFile(join(DATI, `${t}.json`), "utf8"));
  try {
    const nascosti = new Set((await tabella("hidden_entities")).map((r) => r.id));
    const immagini = new Map();
    for (const r of await tabella("image_overrides")) if (r.is_global === true && r.url) immagini.set(r.work_id, r.url);
    for (const t of TABELLE) {
      const mappa = new Map(ds[t].map((r) => [r.id, r]));
      for (const r of await tabella(t)) mappa.set(r.id, mappa.has(r.id) ? { ...mappa.get(r.id), ...r } : r);
      for (const id of nascosti) mappa.delete(id);
      ds[t] = [...mappa.values()];
    }
    for (const w of ds.works) {
      const url = immagini.get(w.id);
      if (url) { w.image_url = url; w.image_thumb = url; }
    }
    console.log("  dati: JSON + database");
  } catch (e) {
    console.warn(`  dati: solo JSON (database non raggiungibile: ${e.message})`);
  }
  return ds;
}

// Le menzioni nei testi (@Mantegna) si leggono con lo stesso codice del sito.
async function caricaMenzioni() {
  const sorgente = await readFile(join(RADICE, "src", "lib", "menzioni.ts"), "utf8");
  const { code } = await transformWithEsbuild(sorgente, "menzioni.ts", { loader: "ts", format: "esm" });
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

// ---------------------------------------------------------------------------
// Strumenti
// ---------------------------------------------------------------------------
const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Per le cartelle: minuscole, niente accenti. «cattedrale-cefalù» → «cattedrale-cefalu».
function slug(s) {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/['’]/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "voce";
}

// Assegna a ogni voce un indirizzo unico, anche se due id diventano uguali.
function assegnaSlug(voci, chiave) {
  const usati = new Set(), mappa = new Map();
  for (const v of voci) {
    let s = slug(chiave(v)), n = 2;
    while (usati.has(s)) s = `${slug(chiave(v))}-${n++}`;
    usati.add(s); mappa.set(v.id ?? chiave(v), s);
  }
  return mappa;
}

function taglia(testo, max = 158) {
  const t = String(testo ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const corto = t.slice(0, max - 1);
  return corto.slice(0, Math.max(corto.lastIndexOf(" "), max - 20)).replace(/[,;:.\s]+$/, "") + "…";
}

const anni = (a, b) => {
  const f = (x) => (x == null ? "" : x < 0 ? `${-x} a.C.` : String(x));
  if (a == null && b == null) return "";
  if (a === b || b == null) return f(a);
  return `${f(a)}–${f(b)}`;
};

const ETICHETTE_LEGAME = {
  influenza: "influenza", contaminazione: "contaminazione", rielaborazione: "rielaborazione",
  evoluzione: "evoluzione", contrasto: "contrasto", committenza: "committenza",
  "maestro-allievo": "maestro e allievo", collaborazione: "collaborazione", autore: "autore", luogo: "luogo",
};
const TIPI_OPERA = {
  architettura: "Architettura", pittura: "Pittura", scultura: "Scultura", mosaico: "Mosaico",
  miniatura: "Miniatura", oreficeria: "Oreficeria", urbanistica: "Urbanistica", altro: "Altro",
};

// ---------------------------------------------------------------------------
// Pagina
// ---------------------------------------------------------------------------
const STILE = `<style>
.seo{max-width:780px;margin:0 auto;padding:32px 20px 64px;font-family:"General Sans",system-ui,sans-serif;color:#231c14;background:#f6f1e8;line-height:1.6}
.seo a{color:#8a6420}
.seo h1{font-family:Boska,Georgia,serif;font-weight:500;font-size:clamp(30px,5vw,46px);line-height:1.1;margin:.3em 0 .2em}
.seo h2{font-family:Boska,Georgia,serif;font-weight:500;font-size:22px;margin:1.8em 0 .4em}
.seo .briciole,.seo .meta{font-size:14px;color:#6b5d4c}
.seo .apri{display:inline-block;margin:18px 0;padding:10px 20px;border-radius:10px;background:#231c14;color:#f6f1e8;text-decoration:none;font-weight:600}
.seo img{display:block;max-width:100%;height:auto;border-radius:10px;margin:12px 0}
.seo ul{padding-left:1.2em}
.seo footer{margin-top:48px;font-size:13px;color:#6b5d4c}
</style>`;

let MODELLO = "";

/** Una pagina completa a partire dall'index.html di Vite. */
function pagina({ percorso, titolo, descrizione, rotta, corpo, jsonld = [], immagine, tipoOg = "article" }) {
  const url = `${SITO}${percorso}`;
  const img = immagine || `${SITO}/og-image.png`;
  const testa = [
    `<title>${esc(titolo)}</title>`,
    `<meta name="description" content="${esc(descrizione)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:site_name" content="${NOME}" />`,
    `<meta property="og:title" content="${esc(titolo)}" />`,
    `<meta property="og:description" content="${esc(descrizione)}" />`,
    `<meta property="og:type" content="${tipoOg}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(img)}" />`,
    `<meta property="og:locale" content="it_IT" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    ...jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`),
    // Chi arriva col browser passa subito alla scheda interattiva.
    rotta ? `<script>if(!location.hash)history.replaceState(null,"","/#${rotta}")</script>` : "",
    STILE,
  ].filter(Boolean).join("\n    ");

  let html = MODELLO
    .replace(/<title>[\s\S]*?<\/title>\s*/, "")
    .replace(/\s*<meta name="description"[^>]*>/, "")
    .replace(/\s*<meta property="og:[^"]+"[^>]*>/g, "")
    .replace("</head>", `    ${testa}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root"><div class="seo">${corpo}\n<footer><a href="/">${NOME}</a> — ${SOTTOTITOLO}. Gratuito, open source, senza pubblicità. Prima si chiamava HUB Arte.</footer></div></div>`);
  return html;
}

// Il modello di Vite usa percorsi relativi (./assets/…), che servono all'app
// iOS. Nelle pagine dentro le cartelle vanno resi assoluti.
function modelloAssoluto(indexHtml) {
  return indexHtml.replace(/(href|src)="\.\//g, '$1="/');
}

// ---------------------------------------------------------------------------
// Generazione
// ---------------------------------------------------------------------------
async function main() {
  console.log("Genero le pagine per i motori di ricerca…");
  const ds = await caricaDati();
  const { indiceMenzioni, spezzaMenzioni, senzaMenzioni, cittaAttuale } = await caricaMenzioni();
  const indice = indiceMenzioni(ds);

  const indexHtml = await readFile(join(DIST, "index.html"), "utf8");
  MODELLO = modelloAssoluto(indexHtml);

  const byId = (arr) => new Map(arr.map((x) => [x.id, x]));
  const opere = byId(ds.works), persone = byId(ds.artists), periodi = byId(ds.periods);
  const termini = byId(ds.terms), tecniche = byId(ds.techniques), fonti = byId(ds.fonti);

  const slugOpera = assegnaSlug(ds.works, (w) => w.id);
  const slugPersona = assegnaSlug(ds.artists, (a) => a.id);
  const slugPeriodo = assegnaSlug(ds.periods, (p) => p.id);
  const slugTermine = assegnaSlug(ds.terms, (t) => t.id);
  const slugTecnica = assegnaSlug(ds.techniques, (t) => t.id);

  // Le citta', con il nome di oggi (Costantinopoli → Istanbul).
  const citta = new Map();
  for (const x of [...ds.works, ...ds.artists]) {
    const c = x.location_city?.trim();
    if (c) { const n = cittaAttuale(c); if (!citta.has(n)) citta.set(n, { nome: n, opere: [], persone: [] }); }
  }
  for (const w of ds.works) if (w.location_city?.trim()) citta.get(cittaAttuale(w.location_city.trim())).opere.push(w);
  for (const a of ds.artists) if (a.location_city?.trim()) citta.get(cittaAttuale(a.location_city.trim())).persone.push(a);
  const slugCitta = assegnaSlug([...citta.values()].map((c) => ({ id: c.nome })), (c) => c.id);

  const url = {
    opera: (id) => `/opera/${slugOpera.get(id)}/`,
    persona: (id) => `/artista/${slugPersona.get(id)}/`,
    periodo: (id) => `/periodo/${slugPeriodo.get(id)}/`,
    termine: (id) => `/glossario/${slugTermine.get(id)}/`,
    tecnica: (id) => `/tecniche/${slugTecnica.get(id)}/`,
    citta: (nome) => `/luogo/${slugCitta.get(nome)}/`,
  };
  const link = {
    opera: (id) => opere.has(id) ? `<a href="${url.opera(id)}">${esc(opere.get(id).title)}</a>` : "",
    persona: (id) => persone.has(id) ? `<a href="${url.persona(id)}">${esc(persone.get(id).name)}</a>` : "",
    periodo: (id) => periodi.has(id) ? `<a href="${url.periodo(id)}">${esc(periodi.get(id).name)}</a>` : "",
    termine: (id) => termini.has(id) ? `<a href="${url.termine(id)}">${esc(termini.get(id).term)}</a>` : "",
    tecnica: (id) => tecniche.has(id) ? `<a href="${url.tecnica(id)}">${esc(tecniche.get(id).name)}</a>` : "",
    citta: (c) => { const n = cittaAttuale(c); return citta.has(n) ? `<a href="${url.citta(n)}">${esc(c)}</a>` : esc(c); },
  };
  const perEntita = { work: link.opera, artist: link.persona, period: link.periodo, term: link.termine, technique: link.tecnica };

  // Il testo di una scheda in HTML: menzioni diventano link, a capo diventano paragrafi.
  const testo = (t) => String(t ?? "").split(/\n{2,}/).filter((p) => p.trim()).map((par) =>
    "<p>" + spezzaMenzioni(par, indice).map((pz) => {
      const m = pz.menzione;
      if (!m) return esc(pz.testo);
      if (m.type === "city") return link.citta(m.id).replace(/>[^<]*</, `>${esc(m.label)}<`);
      const f = perEntita[m.type];
      const a = f ? f(m.id) : "";
      return a ? a.replace(/>[^<]*</, `>${esc(m.label)}<`) : esc(pz.testo);
    }).join("").replace(/\n/g, "<br>") + "</p>").join("\n");
  const piatto = (t) => senzaMenzioni(String(t ?? ""), indice);
  const elenco = (voci) => voci.filter(Boolean).length ? `<ul>${voci.filter(Boolean).map((v) => `<li>${v}</li>`).join("")}</ul>` : "";
  const briciole = (...pezzi) => `<nav class="briciole"><a href="/">${NOME}</a>${pezzi.map((p) => ` › ${p}`).join("")}</nav>`;
  const bottone = (rotta, etichetta = "Apri la scheda interattiva") => `<a class="apri" href="/#${rotta}">${etichetta} →</a>`;
  const jsonBriciole = (voci) => ({
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [{ name: NOME, item: `${SITO}/` }, ...voci].map((v, i) => ({ "@type": "ListItem", position: i + 1, name: v.name, item: v.item })),
  });

  // I legami di una voce, dall'una o dall'altra parte.
  const legamiDi = (tipo, id) => ds.connections.filter((c) =>
    (c.source_type === tipo && c.source_id === id) || (c.target_type === tipo && c.target_id === id));
  const legami = (tipo, id) => {
    const righe = legamiDi(tipo, id).map((c) => {
      const altroTipo = c.source_type === tipo && c.source_id === id ? c.target_type : c.source_type;
      const altroId = c.source_type === tipo && c.source_id === id ? c.target_id : c.source_id;
      const f = perEntita[altroTipo];
      const a = f ? f(altroId) : "";
      if (!a) return "";
      return `${a} <span class="meta">(${esc(ETICHETTE_LEGAME[c.kind] ?? c.kind)})</span>${c.description ? ` — ${esc(piatto(c.description))}` : ""}`;
    }).filter(Boolean);
    return righe.length ? `<h2>Legami</h2>${elenco(righe)}` : "";
  };

  const pagine = []; // { percorso, html }
  const aggiungi = (percorso, opzioni) => pagine.push({ percorso, html: pagina({ percorso, ...opzioni }) });

  // --- Opere ---------------------------------------------------------------
  for (const w of ds.works) {
    const autori = (w.artist_ids ?? []).map((id) => persone.get(id)).filter(Boolean);
    const committenti = (w.committente_ids ?? []).map((id) => persone.get(id)).filter(Boolean);
    const periodo = periodi.get(w.period_id);
    const luogo = [w.location_place, w.location_city].filter(Boolean).join(", ");
    const nomiAutori = autori.map((a) => a.name).join(", ");
    const descr = taglia(piatto(w.summary) || `${w.title}${nomiAutori ? `, ${nomiAutori}` : ""}${w.date_text ? `, ${w.date_text}` : ""}.`);
    const titolo = `${w.title}${nomiAutori ? ` di ${nomiAutori}` : ""} | ${NOME}`;
    const fontiOpera = (w.fonte_ids ?? []).map((id) => fonti.get(id)).filter(Boolean);
    const corpo = [
      briciole(`<a href="/opere/">Opere</a>`, periodo ? link.periodo(periodo.id) : ""),
      `<h1>${esc(w.title)}</h1>`,
      `<p class="meta">${[
        autori.map((a) => link.persona(a.id)).join(", "),
        esc(w.date_text || anni(w.year_start, w.year_end)),
        w.location_place ? esc(w.location_place) : "",
        w.location_city ? link.citta(w.location_city) : "",
      ].filter(Boolean).join(" · ")}</p>`,
      w.image_url ? `<img src="${esc(w.image_url)}" alt="${esc(w.title)}${nomiAutori ? `, ${esc(nomiAutori)}` : ""}" loading="lazy" referrerpolicy="no-referrer" />` : "",
      bottone(`/opera/${w.id}`),
      testo(w.summary),
      w.analysis ? `<h2>Analisi</h2>${testo(w.analysis)}` : "",
      (w.innovations ?? []).length ? `<h2>Innovazioni</h2>${elenco(w.innovations.map((i) => esc(piatto(i))))}` : "",
      `<h2>Scheda</h2>${elenco([
        `Tipo: ${esc(TIPI_OPERA[w.type] ?? w.type)}`,
        periodo ? `Periodo: ${link.periodo(periodo.id)}` : "",
        autori.length ? `Autore: ${autori.map((a) => link.persona(a.id)).join(", ")}` : "",
        committenti.length ? `Committente: ${committenti.map((a) => link.persona(a.id)).join(", ")}` : "",
        w.date_text ? `Datazione: ${esc(w.date_text)}` : "",
        luogo ? `Luogo: ${[w.location_place ? esc(w.location_place) : "", w.location_city ? link.citta(w.location_city) : ""].filter(Boolean).join(", ")}` : "",
        (w.technique_ids ?? []).length ? `Tecniche: ${w.technique_ids.map(link.tecnica).filter(Boolean).join(", ")}` : "",
        (w.materials ?? []).length ? `Materiali: ${w.materials.map(esc).join(", ")}` : "",
        (w.term_ids ?? []).length ? `Termini: ${w.term_ids.map(link.termine).filter(Boolean).join(", ")}` : "",
        fontiOpera.length ? `Fonte: ${fontiOpera.map((f) => esc(f.volume ? `${f.titolo}, vol. ${f.volume}` : f.titolo)).join("; ")}` : "",
      ])}`,
      legami("work", w.id),
    ].join("\n");
    const jsonld = [{
      "@context": "https://schema.org",
      "@type": "VisualArtwork",
      name: w.title,
      url: `${SITO}${url.opera(w.id)}`,
      description: piatto(w.summary) || undefined,
      image: w.image_url || undefined,
      creator: autori.length ? autori.map((a) => ({ "@type": a.is_collective ? "Organization" : "Person", name: a.name, url: `${SITO}${url.persona(a.id)}` })) : undefined,
      funder: committenti.length ? committenti.map((a) => ({ "@type": a.is_collective ? "Organization" : "Person", name: a.name, url: `${SITO}${url.persona(a.id)}` })) : undefined,
      dateCreated: w.date_text || undefined,
      artform: TIPI_OPERA[w.type] ?? undefined,
      artMedium: (w.materials ?? []).join(", ") || undefined,
      locationCreated: w.location_city ? { "@type": "Place", name: w.location_city } : undefined,
      contentLocation: luogo ? { "@type": "Place", name: luogo } : undefined,
      inLanguage: "it",
    }, jsonBriciole([
      { name: "Opere", item: `${SITO}/opere/` },
      ...(periodo ? [{ name: periodo.name, item: `${SITO}${url.periodo(periodo.id)}` }] : []),
      { name: w.title, item: `${SITO}${url.opera(w.id)}` },
    ])];
    aggiungi(url.opera(w.id), { titolo, descrizione: descr, rotta: `/opera/${w.id}`, corpo, jsonld, immagine: w.image_url });
  }

  // --- Autori e committenti -------------------------------------------------
  for (const a of ds.artists) {
    const committente = a.category === "committenti";
    const fatte = ds.works.filter((w) => (w.artist_ids ?? []).includes(a.id));
    const volute = ds.works.filter((w) => (w.committente_ids ?? []).includes(a.id));
    const date = anni(a.birth, a.death);
    const descr = taglia(piatto(a.bio) || `${a.name}${a.role ? `, ${a.role}` : ""}${date ? ` (${date})` : ""}. ${fatte.length ? `Opere: ${fatte.slice(0, 4).map((w) => w.title).join(", ")}.` : ""}`);
    const titolo = `${a.name}${date ? ` (${date})` : ""}${committente ? " — committente" : ""} | ${NOME}`;
    const corpo = [
      briciole(`<a href="/artisti/">Protagonisti</a>`),
      `<h1>${esc(a.name)}</h1>`,
      `<p class="meta">${[a.role ? esc(a.role) : "", date ? esc(date) : "", a.location_city ? link.citta(a.location_city) : "",
        (a.period_ids ?? []).map(link.periodo).filter(Boolean).join(", ")].filter(Boolean).join(" · ")}</p>`,
      (a.aka ?? []).length ? `<p class="meta">Noto anche come: ${a.aka.map(esc).join(", ")}</p>` : "",
      bottone(`/artista/${a.id}`),
      testo(a.bio),
      (a.innovations ?? []).length ? `<h2>Innovazioni</h2>${elenco(a.innovations.map((i) => esc(piatto(i))))}` : "",
      fatte.length ? `<h2>Opere</h2>${elenco(fatte.map((w) => `${link.opera(w.id)}${w.date_text ? ` <span class="meta">(${esc(w.date_text)})</span>` : ""}`))}` : "",
      volute.length ? `<h2>Opere commissionate</h2>${elenco(volute.map((w) => `${link.opera(w.id)}${w.date_text ? ` <span class="meta">(${esc(w.date_text)})</span>` : ""}`))}` : "",
      legami("artist", a.id),
    ].join("\n");
    const persona = {
      "@context": "https://schema.org",
      "@type": a.is_collective ? "Organization" : "Person",
      name: a.name,
      alternateName: (a.aka ?? []).length ? a.aka : undefined,
      url: `${SITO}${url.persona(a.id)}`,
      description: piatto(a.bio) || a.role || undefined,
      ...(a.is_collective ? {} : {
        birthDate: a.birth != null ? String(a.birth) : undefined,
        deathDate: a.death != null ? String(a.death) : undefined,
        jobTitle: a.role || undefined,
      }),
    };
    const img = fatte.find((w) => w.image_url)?.image_url ?? volute.find((w) => w.image_url)?.image_url;
    aggiungi(url.persona(a.id), {
      titolo, descrizione: descr, rotta: `/artista/${a.id}`, corpo, immagine: img, tipoOg: "profile",
      jsonld: [persona, jsonBriciole([{ name: "Protagonisti", item: `${SITO}/artisti/` }, { name: a.name, item: `${SITO}${url.persona(a.id)}` }])],
    });
  }

  // --- Periodi --------------------------------------------------------------
  const TIPO_PERIODO = { epoca: "Epoca", corrente: "Corrente", scuola: "Scuola" };
  for (const p of ds.periods) {
    const figli = ds.periods.filter((x) => x.parent_id === p.id).sort((a, b) => a.year_start - b.year_start);
    const padre = periodi.get(p.parent_id);
    const opereP = ds.works.filter((w) => w.period_id === p.id).sort((a, b) => (a.year_start ?? 0) - (b.year_start ?? 0));
    const autoriP = ds.artists.filter((a) => (a.period_ids ?? []).includes(p.id));
    const date = anni(p.year_start, p.year_end);
    const titolo = `${p.name} (${date}) — storia dell'arte | ${NOME}`;
    const descr = taglia(piatto(p.summary) || `${p.name}, ${date}.`);
    const corpo = [
      briciole(`<a href="/timeline/">Linea del tempo</a>`, padre ? link.periodo(padre.id) : ""),
      `<h1>${esc(p.name)}</h1>`,
      `<p class="meta">${[TIPO_PERIODO[p.type] ?? "", esc(date), (p.regions ?? []).map(esc).join(", ")].filter(Boolean).join(" · ")}</p>`,
      bottone(`/periodo/${p.id}`),
      testo(p.summary),
      p.historical_context ? `<h2>Contesto storico</h2>${testo(p.historical_context)}` : "",
      (p.key_innovations ?? []).length ? `<h2>Innovazioni</h2>${elenco(p.key_innovations.map((i) => esc(piatto(i))))}` : "",
      figli.length ? `<h2>Correnti e scuole</h2>${elenco(figli.map((f) => `${link.periodo(f.id)} <span class="meta">(${esc(anni(f.year_start, f.year_end))})</span>`))}` : "",
      autoriP.length ? `<h2>Protagonisti</h2>${elenco(autoriP.map((a) => link.persona(a.id)))}` : "",
      opereP.length ? `<h2>Opere</h2>${elenco(opereP.map((w) => `${link.opera(w.id)}${w.date_text ? ` <span class="meta">(${esc(w.date_text)})</span>` : ""}`))}` : "",
      legami("period", p.id),
    ].join("\n");
    aggiungi(url.periodo(p.id), {
      titolo, descrizione: descr, rotta: `/periodo/${p.id}`, corpo, immagine: opereP.find((w) => w.image_url)?.image_url,
      jsonld: [jsonBriciole([{ name: "Linea del tempo", item: `${SITO}/timeline/` }, { name: p.name, item: `${SITO}${url.periodo(p.id)}` }])],
    });
  }

  // --- Citta' ---------------------------------------------------------------
  for (const c of citta.values()) {
    const storici = Object.entries({ Costantinopoli: "Istanbul", Bisanzio: "Istanbul" }).filter(([, o]) => o === c.nome).map(([s]) => s);
    const nomeCompleto = storici.length ? `${c.nome} (${storici.join(", ")})` : c.nome;
    const titolo = `Arte a ${c.nome}: opere e artisti | ${NOME}`;
    const descr = taglia(`Le opere d'arte a ${nomeCompleto} nel catalogo di ${NOME}: ${c.opere.slice(0, 5).map((w) => w.title).join(", ")}${c.opere.length > 5 ? " e altre" : ""}.`);
    const perLuogo = new Map();
    for (const w of c.opere) { const k = w.location_place || "Altri luoghi"; if (!perLuogo.has(k)) perLuogo.set(k, []); perLuogo.get(k).push(w); }
    const corpo = [
      briciole(`<a href="/mappa/">Mappa</a>`),
      `<h1>Arte a ${esc(nomeCompleto)}</h1>`,
      `<p class="meta">${c.opere.length} opere${c.persone.length ? ` · ${c.persone.length} committenti con sede qui` : ""}</p>`,
      bottone(`/luogo/${encodeURIComponent(c.nome)}`, "Apri sulla mappa interattiva"),
      ...[...perLuogo.entries()].map(([luogo, ws]) => `<h2>${esc(luogo)}</h2>${elenco(ws.map((w) => `${link.opera(w.id)}${(w.artist_ids ?? []).length ? ` — ${w.artist_ids.map(link.persona).filter(Boolean).join(", ")}` : ""}${w.date_text ? ` <span class="meta">(${esc(w.date_text)})</span>` : ""}`))}`),
      c.persone.length ? `<h2>Committenti e istituzioni</h2>${elenco(c.persone.map((a) => link.persona(a.id)))}` : "",
    ].join("\n");
    aggiungi(url.citta(c.nome), {
      titolo, descrizione: descr, rotta: `/luogo/${encodeURIComponent(c.nome)}`, corpo, immagine: c.opere.find((w) => w.image_url)?.image_url,
      jsonld: [{ "@context": "https://schema.org", "@type": "Place", name: c.nome, alternateName: storici.length ? storici : undefined, url: `${SITO}${url.citta(c.nome)}` },
        jsonBriciole([{ name: "Mappa", item: `${SITO}/mappa/` }, { name: c.nome, item: `${SITO}${url.citta(c.nome)}` }])],
    });
  }

  // --- Termini del glossario ------------------------------------------------
  for (const t of ds.terms) {
    const conTermine = ds.works.filter((w) => (w.term_ids ?? []).includes(t.id));
    const titolo = `${t.term}: significato in storia dell'arte | ${NOME}`;
    const descr = taglia(`${t.term}: ${piatto(t.definition)}`);
    const corpo = [
      briciole(`<a href="/glossario/">Glossario</a>`),
      `<h1>${esc(t.term)}</h1>`,
      `<p class="meta">${[t.category ? `Glossario · ${esc(t.category)}` : "Glossario", (t.period_ids ?? []).map(link.periodo).filter(Boolean).join(", ")].filter(Boolean).join(" · ")}</p>`,
      testo(t.definition),
      bottone(`/glossario?t=${encodeURIComponent(t.id)}`, "Apri nel glossario interattivo"),
      conTermine.length ? `<h2>Opere in cui compare</h2>${elenco(conTermine.map((w) => link.opera(w.id)))}` : "",
      legami("term", t.id),
    ].join("\n");
    aggiungi(url.termine(t.id), {
      titolo, descrizione: descr, rotta: `/glossario?t=${encodeURIComponent(t.id)}`, corpo,
      jsonld: [{
        "@context": "https://schema.org", "@type": "DefinedTerm", name: t.term, description: piatto(t.definition),
        url: `${SITO}${url.termine(t.id)}`, inDefinedTermSet: { "@type": "DefinedTermSet", name: `Glossario di ${NOME}`, url: `${SITO}/glossario/` },
      }, jsonBriciole([{ name: "Glossario", item: `${SITO}/glossario/` }, { name: t.term, item: `${SITO}${url.termine(t.id)}` }])],
    });
  }

  // --- Tecniche -------------------------------------------------------------
  for (const t of ds.techniques) {
    const conTecnica = ds.works.filter((w) => (w.technique_ids ?? []).includes(t.id));
    const titolo = `${t.name}: la tecnica artistica | ${NOME}`;
    const descr = taglia(`${t.name}: ${piatto(t.definition)}`);
    const corpo = [
      briciole(`<a href="/tecniche/">Tecniche</a>`),
      `<h1>${esc(t.name)}</h1>`,
      `<p class="meta">${[t.category ? `Tecnica ${esc(t.category)}` : "Tecnica", t.first_period_id ? `dal periodo: ${link.periodo(t.first_period_id)}` : ""].filter(Boolean).join(" · ")}</p>`,
      testo(t.definition),
      t.introduced_by ? `<p><b>Origine:</b> ${esc(piatto(t.introduced_by))}</p>` : "",
      t.evolution ? `<h2>Evoluzione</h2>${testo(t.evolution)}` : "",
      bottone(`/tecniche?t=${encodeURIComponent(t.id)}`, "Apri nelle tecniche interattive"),
      conTecnica.length ? `<h2>Opere realizzate con questa tecnica</h2>${elenco(conTecnica.map((w) => link.opera(w.id)))}` : "",
      legami("technique", t.id),
    ].join("\n");
    aggiungi(url.tecnica(t.id), {
      titolo, descrizione: descr, rotta: `/tecniche?t=${encodeURIComponent(t.id)}`, corpo, immagine: conTecnica.find((w) => w.image_url)?.image_url,
      jsonld: [{ "@context": "https://schema.org", "@type": "DefinedTerm", name: t.name, description: piatto(t.definition), url: `${SITO}${url.tecnica(t.id)}` },
        jsonBriciole([{ name: "Tecniche", item: `${SITO}/tecniche/` }, { name: t.name, item: `${SITO}${url.tecnica(t.id)}` }])],
    });
  }

  // --- Indici delle sezioni -------------------------------------------------
  const perPeriodo = new Map();
  for (const w of ds.works) { if (!perPeriodo.has(w.period_id)) perPeriodo.set(w.period_id, []); perPeriodo.get(w.period_id).push(w); }
  const periodiOrdinati = [...ds.periods].sort((a, b) => a.year_start - b.year_start || a.name.localeCompare(b.name));
  const sezione = (percorso, titolo, h1, intro, rotta, contenuto) => aggiungi(percorso, {
    titolo: `${titolo} | ${NOME}`, descrizione: taglia(intro), rotta, tipoOg: "website",
    corpo: [briciole(esc(h1)), `<h1>${esc(h1)}</h1>`, `<p>${esc(intro)}</p>`, bottone(rotta, "Apri la versione interattiva"), contenuto].join("\n"),
    jsonld: [jsonBriciole([{ name: h1, item: `${SITO}${percorso}` }])],
  });

  sezione("/opere/", "Catalogo delle opere d'arte", "Opere",
    `Il catalogo di ${NOME}: ${ds.works.length} opere dalla Tarda Antichità al Barocco, con autore, committente, datazione, luogo, analisi e innovazioni.`,
    "/opere",
    periodiOrdinati.filter((p) => perPeriodo.has(p.id)).map((p) => `<h2>${link.periodo(p.id)}</h2>${elenco(perPeriodo.get(p.id).map((w) => link.opera(w.id)))}`).join("\n"));

  const autoriOrd = ds.artists.filter((a) => a.category !== "committenti").sort((a, b) => a.name.localeCompare(b.name, "it"));
  const committentiOrd = ds.artists.filter((a) => a.category === "committenti").sort((a, b) => a.name.localeCompare(b.name, "it"));
  sezione("/artisti/", "Artisti e committenti", "Protagonisti",
    `Gli artisti e i committenti della storia dell'arte nel catalogo di ${NOME}: ${autoriOrd.length} autori e ${committentiOrd.length} committenti, dai papi alle corporazioni di mestiere.`,
    "/artisti",
    `<h2>Autori</h2>${elenco(autoriOrd.map((a) => link.persona(a.id)))}<h2>Committenti</h2>${elenco(committentiOrd.map((a) => link.persona(a.id)))}`);

  const radici = periodiOrdinati.filter((p) => !p.parent_id || !periodi.has(p.parent_id));
  const albero = (p) => {
    const figli = periodiOrdinati.filter((x) => x.parent_id === p.id);
    return `${link.periodo(p.id)} <span class="meta">(${esc(anni(p.year_start, p.year_end))})</span>${figli.length ? `<ul>${figli.map((f) => `<li>${albero(f)}</li>`).join("")}</ul>` : ""}`;
  };
  sezione("/timeline/", "Linea del tempo della storia dell'arte", "Linea del tempo",
    `Epoche, correnti e scuole della storia dell'arte, dalla Tarda Antichità al Barocco: ${ds.periods.length} periodi annidati su tre livelli.`,
    "/timeline", elenco(radici.map(albero)));

  const cittaOrd = [...citta.values()].sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  sezione("/mappa/", "Mappa dell'arte: città e luoghi", "Mappa",
    `Dove si trovano le opere del catalogo di ${NOME}: ${cittaOrd.length} città, dall'Italia al resto d'Europa.`,
    "/mappa", elenco(cittaOrd.map((c) => `${link.citta(c.nome)} <span class="meta">(${c.opere.length})</span>`)));

  const terminiOrd = [...ds.terms].sort((a, b) => a.term.localeCompare(b.term, "it"));
  sezione("/glossario/", "Glossario di storia dell'arte", "Glossario",
    `${ds.terms.length} termini di storia dell'arte con la loro definizione: architettura, pittura, scultura e iconografia.`,
    "/glossario", elenco(terminiOrd.map((t) => `${link.termine(t.id)} — ${esc(taglia(piatto(t.definition), 140))}`)));

  const tecnicheOrd = [...ds.techniques].sort((a, b) => a.name.localeCompare(b.name, "it"));
  sezione("/tecniche/", "Tecniche artistiche", "Tecniche",
    `${ds.techniques.length} tecniche e procedimenti artistici, dall'affresco alla fusione a cera persa, con la loro storia.`,
    "/tecniche", elenco(tecnicheOrd.map((t) => `${link.tecnica(t.id)} — ${esc(taglia(piatto(t.definition), 140))}`)));

  sezione("/grafo/", "Il grafo delle connessioni", "Rete",
    `Le connessioni fra opere, artisti, periodi e termini in un grafo 3D da esplorare: influenze, rapporti maestro-allievo, committenze e collaborazioni.`,
    "/grafo", "");
  sezione("/test/", "Quiz di storia dell'arte", "Test",
    `Quiz di storia dell'arte costruiti dal catalogo: riconosci opere, autori, periodi e termini, con la banca degli errori per ripassare.`,
    "/test", "");

  // --- Home -----------------------------------------------------------------
  const descrHome = `${NOME} (già HUB Arte) è un atlante gratuito e open source per studiare storia dell'arte: ${ds.works.length} opere, ${ds.artists.length} artisti e committenti, periodi, glossario, mappa, grafo delle connessioni e quiz.`;
  const home = {
    titolo: `${NOME} — ${SOTTOTITOLO} (già HUB Arte)`,
    descrizione: taglia(descrHome, 170),
    tipoOg: "website",
    corpo: [
      `<h1>${NOME}</h1>`,
      `<p><b>${SOTTOTITOLO}.</b> Prima si chiamava HUB Arte: stesso atlante, nome e indirizzo nuovi.</p>`,
      `<p>${esc(descrHome)} Pensato per studenti e docenti, senza pubblicità.</p>`,
      elenco([
        `<a href="/opere/">Opere</a> — ${ds.works.length} schede con analisi e innovazioni`,
        `<a href="/artisti/">Protagonisti</a> — autori e committenti`,
        `<a href="/timeline/">Linea del tempo</a> — epoche, correnti e scuole`,
        `<a href="/mappa/">Mappa</a> — le città dell'arte`,
        `<a href="/glossario/">Glossario</a> — ${ds.terms.length} termini`,
        `<a href="/tecniche/">Tecniche</a> — ${ds.techniques.length} procedimenti`,
        `<a href="/grafo/">Rete</a> — il grafo delle connessioni`,
        `<a href="/test/">Test</a> — quiz per ripassare`,
      ]),
      `<h2>Periodi</h2>${elenco(radici.map((p) => link.periodo(p.id)))}`,
    ].join("\n"),
    jsonld: [
      {
        "@context": "https://schema.org", "@type": "WebSite", name: NOME,
        alternateName: ["HUB Arte", "HubArte", "Hub Arte", "BaseArte", "Base Arte atlante"],
        url: `${SITO}/`, inLanguage: "it", description: descrHome,
      },
      {
        "@context": "https://schema.org", "@type": "Organization", name: NOME,
        alternateName: ["HUB Arte", "HubArte"], url: `${SITO}/`, logo: `${SITO}/icon-512.png`, sameAs: [GITHUB],
      },
    ],
  };
  // La home e' la stessa index.html dell'app, con in piu' testo e metadati.
  // Resta con i percorsi relativi di Vite, che servono all'app iOS.
  const modelloApp = MODELLO;
  MODELLO = indexHtml;
  const htmlHome = pagina({ percorso: "/", ...home });
  MODELLO = modelloApp;

  // 404: le pagine che non esistono rispondono 404, non con la home.
  const html404 = pagina({
    percorso: "/404.html", titolo: `Pagina non trovata | ${NOME}`, descrizione: "Questa pagina non esiste.", tipoOg: "website",
    corpo: `<h1>Pagina non trovata</h1><p>Questa pagina non esiste, o ha cambiato indirizzo.</p><p><a class="apri" href="/">Vai alla home di ${NOME} →</a></p>`,
  }).replace(/\s*<link rel="canonical"[^>]*>/, "").replace(/\s*<script type="module"[^>]*><\/script>/, "").replace("</head>", `  <meta name="robots" content="noindex" />\n  </head>`);

  // --- Scrittura ------------------------------------------------------------
  for (const cartella of ["opera", "artista", "periodo", "luogo", "glossario", "tecniche", "opere", "artisti", "timeline", "mappa", "grafo", "test"]) {
    await rm(join(DIST, cartella), { recursive: true, force: true });
  }
  for (const p of pagine) {
    const cartella = join(DIST, ...decodeURI(p.percorso).split("/").filter(Boolean));
    await mkdir(cartella, { recursive: true });
    await writeFile(join(cartella, "index.html"), p.html, "utf8");
  }
  await writeFile(join(DIST, "index.html"), htmlHome, "utf8");
  await writeFile(join(DIST, "404.html"), html404, "utf8");

  const oggi = new Date().toISOString().slice(0, 10);
  const urls = ["/", ...pagine.map((p) => p.percorso)];
  await writeFile(join(DIST, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${esc(SITO + encodeURI(u))}</loc><lastmod>${oggi}</lastmod></url>`).join("\n") +
    `\n</urlset>\n`, "utf8");
  await writeFile(join(DIST, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITO}/sitemap.xml\n`, "utf8");

  const conta = (pre) => pagine.filter((p) => p.percorso.startsWith(pre)).length;
  console.log(`  ${pagine.length + 1} pagine: ${conta("/opera/")} opere, ${conta("/artista/")} protagonisti, ` +
    `${conta("/periodo/")} periodi, ${conta("/luogo/")} città, ${conta("/glossario/") - 1} termini, ${conta("/tecniche/") - 1} tecniche`);
  console.log("  sitemap.xml, robots.txt, 404.html");
}

main().catch((e) => { console.error("Errore nella generazione delle pagine:", e); process.exit(1); });
