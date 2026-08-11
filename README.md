# HUB Art — Atlante Neuronale

> Atlante di studio interattivo per l'esame di Storia dell'Arte: grafo neuronale 3D, timeline multilivello, mappa geografica, schede opere e modalità quiz.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Made with React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-purple.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-2-green.svg)](https://supabase.com/)

🌐 **Sito live**: [hubarte.it](https://hubarte.it)

## 📖 Cos'è

HUB Art è un atlante digitale di Storia dell'Arte pensato per studenti, docenti e appassionati. Combina diverse modalità di esplorazione in un'unica interfaccia:

- 🏛️ **Catalogo opere** — 1100+ opere con schede dettagliate (autore, datazione, luogo, analisi, innovazioni)
- 👤 **Catalogo artisti** — 300+ artisti con biografie e opere collegate
- 🕸️ **Grafo neuronale 3D** — visualizzazione interattiva delle connessioni tra opere, artisti, periodi e termini
- 📅 **Timeline multilivello** — periodi, eventi e artisti su una linea del tempo navigabile
- 🗺️ **Mappa geografica** — opere e luoghi su mappa Leaflet/OpenStreetMap
- 📚 **Glossario** — 800+ termini di storia dell'arte con definizioni
- 🎨 **Indice tecniche** — 200+ tecniche artistiche catalogate
- 📊 **Dashboard statistiche** — dati aggregati sull'atlante
- 🎯 **Quiz interattivo** — 18 tipi di domanda generati dinamicamente dal dataset, con banca errori e statistiche
- 🔗 **400+ connessioni** tra entità (influenze, maestro-allievo, committenze, evoluzioni)

## ✨ Funzionalità principali

### Per studenti
- ★ **Preferiti** — salva opere e artisti con la stella
- ✓ **Approfondite** — segna le opere che hai studiato
- 🎯 **Quiz personalizzato** — fai quiz solo sui tuoi preferiti o sulle opere approfondite, con filtro temporale a trascinamento
- 📈 **Statistiche personali** — tracciamento dei progressi nei quiz
- ☁️ **Sincronizzazione cloud** — preferiti e progressi salvati su Supabase, accessibili da qualsiasi dispositivo
- 🔐 **Recupero password** — reset password via email

### Per contributori
- 📝 **Suggerisci nuove opere** — proponi opere da aggiungere all'atlante
- ✎ **Suggerisci modifiche** — segnala correzioni a opere esistenti (datazione, autore, luogo, ecc.)
- 📬 **Casella avvisi** — ricevi notifiche quando l'admin revisiona le tue richieste

### Per amministratori
- 🔐 **Dashboard admin** — gestisci le richieste degli utenti (approva/rifiuta con nota)
- 🖼️ **Editor database** — crea, modifica, elimina opere, artisti, periodi, tecniche, termini, eventi e connessioni direttamente nel DB Supabase
- 🌐 **Immagini globali** — gli admin possono cambiare le immagini delle opere per tutti gli utenti
- 🏛️ **Gestione complessi** — raggruppa opere per complesso architettonico

## 🛠️ Stack tecnologico

| Categoria | Tecnologia |
|-----------|------------|
| **Frontend** | React 18, TypeScript 5, Vite 5 |
| **Stile** | CSS custom (variabili CSS, no framework) |
| **Routing** | React Router 6 (HashRouter) |
| **Animazioni** | Framer Motion 11 |
| **3D** | Three.js 0.169 |
| **Grafo 3D** | react-force-graph-3d 1.24 |
| **Mappe** | Leaflet 1.9 + react-leaflet 4.2 |
| **Backend/DB** | Supabase 2 (PostgreSQL, Auth, Realtime, SMTP Resend) |
| **Mobile** | Capacitor 8 (packaging iOS PWA) |
| **Hosting** | Netlify (Open Source Plan) |
| **Font** | Fontshare (Boska, Zodiak, General Sans) |
| **Email** | Resend (SMTP per auth/email) |

## 🚀 Quick start

### Prerequisiti
- Node.js 18+ e npm
- Browser moderno

### Installazione
```bash
git clone https://github.com/ATgio99/Hub-Arte.git
cd Hub-Arte
npm install
```

### Sviluppo
```bash
npm run dev
# → http://localhost:5173
```

### Build produzione
```bash
npm run build      # genera dist/
npm run preview    # anteprima build
```

### Variabili d'ambiente
Il progetto funziona out-of-the-box con il progetto Supabase ufficiale. Per usarne uno tuo:
```bash
cp .env.example .env
# modifica .env con le tue credenziali Supabase
```

## 📦 Deploy

### Netlify (consigliato)
1. Fork del repository
2. Connetti il repo a [Netlify](https://app.netlify.com/start)
3. Configurazione automatica via `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: 20
4. Deploy automatico ad ogni push su `main`

### Deploy manuale
```bash
npm run build
# trascina la cartella dist/ su https://app.netlify.com/drop
```

## 🗄️ Database Supabase

Lo schema SQL è in `supabase/`. Esegui gli script nel [SQL Editor di Supabase](https://supabase.com/dashboard/project/ddsdvcznziciqdambgom/sql/new) seguendo l'ordine indicato in `supabase/README.md`:

1. `migration_full_database.sql` — tabelle base (periods, works, artists, techniques, terms, events, connections) + RLS
2. `migration_techniques_table.sql` — tabella techniques (verifica/completa)
3. `migration_image_overrides_global.sql` — immagini override globali (admin)
4. `migration_retroactive_global_images.sql` — converte override admin esistenti in globali
5. `migration_pdf_missing.sql` — 800+ record estratti da libro di storia dell'arte (opere, artisti, connessioni, ecc.)

### Sicurezza
- **RLS (Row Level Security)** attiva su tutte le tabelle
- **Anon key pubblica** by design 
- **Admin authorization** via JWT email verification nelle RLS policies
- **Service role key** NON è nel codice 

## 📁 Struttura del progetto

```
hubart/
├── public/
│   ├── data/           # dataset JSON statici (works, artists, periods, ...)
│   ├── textures/       # texture PBR per scena 3D
│   ├── manifest.json   # PWA manifest
│   └── _headers        # header Netlify (cache, security)
├── src/
│   ├── components/     # componenti riutilizzabili (Sidebar, ui, CookieConsent, ...)
│   ├── lib/            # logica business (auth, supabase, sync, data, store, ...)
│   ├── pages/          # pagine React (Landing, Opere, Opera, Grafo, Mappa, ...)
│   ├── three/          # scena 3D Three.js (cathedral.ts)
│   ├── App.tsx         # router principale
│   └── main.tsx        # entry point
├── supabase/           # migration SQL + README
├── ios/                # progetto Capacitor per PWA iOS
├── netlify.toml        # config deploy Netlify
├── .env.example        # template variabili d'ambiente
├── LICENSE             # MIT
├── CONTRIBUTING.md     # guida per contributori
└── CODE_OF_CONDUCT.md  # codice di condotta
```

## 🤝 Contribuire

Le contribuzioni sono benvenute! Vedi [CONTRIBUTING.md](./CONTRIBUTING.md) per:

- Come segnalare bug
- Come proporre funzionalità
- Standard del codice
- Come aprire Pull Request
- Come aggiungere opere al dataset

## 📜 Licenza

Distribuito sotto licenza **MIT**. Vedi [LICENSE](./LICENSE) per dettagli.

## 📬 Contatti

- 🌐 **Sito**: [hubarte.it](https://hubarte.it)
- 📧 **Email**: `hubarte@pm.me`
- 🐛 **Bug report**: [GitHub Issues](../../issues)
- 💬 **Discussioni**: [GitHub Discussions](../../discussions)
- 💻 **Codice**: [github.com/ATgio99/Hub-Arte](https://github.com/ATgio99/Hub-Arte)

## 🙏 Riconoscimenti

- **Wikimedia Commons** per le immagini delle opere
- **OpenStreetMap** per i dati geografici
- **Fontshare** per i font tipografici
- **Supabase** per il backend (auth, database, realtime)
- **Netlify** per l'hosting (Open Source Plan)
- **Resend** per il servizio SMTP (email di auth)

## 📊 Statistiche progetto

- 1100+ opere catalogate
- 300+ artisti
- 90+ periodi storici
- 400+ connessioni tra entità
- 800+ termini del glossario
- 200+ tecniche artistiche
- 18 tipi di domanda nel quiz
- 130+ eventi storici

---

⭐ Se questo progetto ti è utile, lascia una star su GitHub! [github.com/ATgio99/Hub-Arte](https://github.com/ATgio99/Hub-Arte)
