# Netlify Open Source Plan — Guida alla richiesta

Questo documento contiene **tutte le informazioni** per richiedere il Netlify Open Source Plan per il progetto HUB Art.

## 📋 Requisiti di Netlify (ufficiali)

Netlify offre un **Open Source Plan gratuito** per progetti open source. I requisiti ufficiali (vedi [Netlify Open Source Policy](https://www.netlify.com/legal/open-source-policy)) sono:

### ✅ Criteri obbligatori

1. **Licenza OSI-approved** — Il progetto deve avere una licenza approvata dalla Open Source Initiative (MIT, Apache 2.0, GPL, ecc.). HUB Art usa **MIT** ✓
2. **Repository pubblico** — Il codice sorgente deve essere pubblico su GitHub/GitLab/Bitbucket ✓
3. **Code of Conduct** — Il progetto deve avere un Code of Conduct visibile ✓ (già creato in `CODE_OF_CONDUCT.md`)
4. **Link a Netlify visibile** — Il sito pubblicato deve avere un link a Netlify visibile nella home page o in tutte le pagine interne ⚠️ (da aggiungere)
5. **Progetto non commerciale** — Il sito non deve essere a scopo di lucro diretto ✓

### ✅ Cosa include il piano Open Source

- **Bandwidth illimitata** (vs 100GB/mo del Free Plan)
- **Build minutes illimitati** (vs 300/min del Free Plan)
- **Concurrent builds** multipli
- **Edge Functions** incluse
- **Form submissions** illimitate
- **Tutte le feature Pro** gratis

## 🚀 Come fare la richiesta

### Step 1: Prepara il repository GitHub

Prima di fare la richiesta, assicurati che il repo abbia:

- [x] File `LICENSE` (MIT) — già presente ✓
- [x] File `CODE_OF_CONDUCT.md` — già presente ✓
- [x] File `CONTRIBUTING.md` — già presente ✓
- [x] File `README.md` con descrizione progetto — già presente ✓
- [ ] **Link a Netlify visibile nel sito** — vedi Step 2

### Step 2: Aggiungi il link a Netlify nel sito

Netlify richiede che il sito pubblicato abbia un link visibile a `https://www.netlify.com`. Possiamo aggiungerlo in due modi:

**Opzione A — Nel footer della sidebar** (consigliato, è visibile su tutte le pagine):

Apri `src/components/Sidebar.tsx` e aggiungi dopo il footer legale (verso riga 220):

```tsx
{/* Netlify badge — richiesto per Open Source Plan */}
<a
  href="https://www.netlify.com"
  target="_blank"
  rel="noopener noreferrer"
  style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    marginTop: 6, fontSize: 10, color: "var(--ink-faint)",
    textDecoration: "none", opacity: 0.7,
  }}
  title="Hosted on Netlify"
>
  <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
    <path d="M163.35 24.5L32 96v64l131.35 71.5L224 200V56L163.35 24.5zm-2.7 28L192 67v122l-31.35 14.5L64 145.5v-35L160.65 52.5z"/>
  </svg>
  Hosted on Netlify
</a>
```

**Opzione B — Nel footer della pagina Contatti** (`/legal/contatti`):

Apri `src/pages/Legal.tsx` e aggiungi in fondo alla sezione `contatti`:

```tsx
<div style={{ marginTop: 24, padding: "12px 16px", background: "var(--bg-2)", borderRadius: 8, fontSize: 13, color: "var(--ink-dim)" }}>
  <b>Hosting:</b> questo sito è generosamente ospitato da{" "}
  <a href="https://www.netlify.com" target="_blank" rel="noopener noreferrer" className="tlink">Netlify</a>{" "}
  tramite il loro <a href="https://www.netlify.com/open-source" target="_blank" rel="noopener noreferrer" className="tlink">Open Source Plan</a>.
</div>
```

**Raccomandazione: implementa entrambe** (Opzione A + B) per maggiore sicurezza.

### Step 3: Build e deploy iniziale

Prima di fare la richiesta, il sito deve essere **già online su Netlify** (anche con il Free Plan):

```bash
# Build locale
npm run build

# Deploy via drag&drop
# 1. Vai su https://app.netlify.com/drop
# 2. Trascina la cartella dist/
# 3. Annota l'URL generato (es. https://warm-cassata-b06e4d.netlify.app)
```

Oppure connetti il repo GitHub a Netlify (consigliato, vedi Step 5).

### Step 4: Compila il form di richiesta

Vai sul form ufficiale: **https://opensource-form.netlify.com**

Campi da compilare:

| Campo | Valore da inserire |
|-------|-------------------|
| **Name** | Il tuo nome completo |
| **E-mail associated with the Netlify account** | L'email usata per registrarti su Netlify |
| **License of your project** | `MIT` |
| **Project name** | `HUB Art — Atlante Neuronale` |
| **Project URL** | L'URL del sito già deployato (es. `https://warm-cassata-b06e4d.netlify.app`) |
| **Repository URL** | `https://github.com/<tuo-username>/hubart` |
| **Project description** | Vedi testo pronto qui sotto ↓ |

### Testo pronto per "Project description"

Copia/incolla questo testo nel form:

```
HUB Art — Atlante Neuronale è un atlante digitale open source di Storia dell'Arte
pensato per studenti, docenti e appassionati. Combina in un'unica interfaccia:
catalogo di 974 opere e 259 artisti, grafo neuronale 3D delle connessioni,
timeline multilivello, mappa geografica, glossario di 672 termini, indice di
93 tecniche artistiche e una modalità quiz interattiva con 18 tipi di domanda.

Il progetto è pensato come strumento didattico gratuito per la preparazione
all'esame di Storia dell'Arte. Tutti i contenuti (opere, schede, analisi)
sono originali o derivati da fonti pubbliche (Wikimedia Commons).

Tecnologie: React 18, TypeScript, Vite, Three.js, Supabase, Leaflet.
Licenza: MIT (codice) / CC-BY-SA 4.0 (contenuti didattici).
Hosting attuale: Netlify Free Plan (in attesa di upgrade a Open Source Plan
per gestire il traffico crescente di studenti).

Il progetto ha un link visibile a Netlify nel footer della sidebar (visibile
su tutte le pagine) e nella pagina Contatti.

Repository: https://github.com/<tuo-username>/hubart
Sito: https://warm-cassata-b06e4d.netlify.app
```

### Step 5: Aspetta la revisione

Netlify revisiona le richieste entro **5-10 giorni lavorativi**. Riceverai una email di conferma o eventuali richieste di chiarimenti.

## 📝 Checklist finale prima della richiesta

- [x] Repository pubblico su GitHub
- [x] File `LICENSE` (MIT) presente
- [x] File `CODE_OF_CONDUCT.md` presente
- [x] File `CONTRIBUTING.md` presente
- [x] File `README.md` completo e professionale
- [ ] Link a Netlify visibile nel sito (Step 2)
- [ ] Sito già deployato su Netlify (anche Free Plan)
- [ ] Form compilato su https://opensource-form.netlify.com

## 🔗 Link utili

- **Form di richiesta**: https://opensource-form.netlify.com
- **Policy ufficiale**: https://www.netlify.com/legal/open-source-policy
- **Pagina Open Source Plan**: https://www.netlify.com/open-source
- **Community support**: https://answers.netlify.com (tag `open-source`)

## ❓ FAQ

**Q: Posso avere più progetti Open Source Plan?**
A: Sì, ogni progetto deve fare richiesta separata ma è possibile averne multipli.

**Q: Cosa succede se la richiesta viene rifiutata?**
A: Puoi correggere i problemi segnalati e rifare la richiesta. Il Free Plan resta attivo.

**Q: Il piano è permanente?**
A: Sì, finché il progetto resta open source e rispetta i criteri. Netlify fa revisioni periodiche.

**Q: Posso usare un dominio personalizzato?**
A: Sì, il piano Open Source include domini personalizzati gratuiti (con SSL automatico).

---

**Nota importante**: Questo documento è una guida basata sulle policy Netlify pubbliche al 2026. Verifica sempre la policy ufficiale più recente su https://www.netlify.com/legal/open-source-policy prima di fare la richiesta.
