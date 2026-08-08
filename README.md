# HUB Art — Atlante Neuronale

> Atlante di studio interattivo per l'esame di Storia dell'Arte: grafo neuronale 3D, timeline multilivello, mappa geografica, schede opere e modalità quiz.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Made with React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-purple.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-2-green.svg)](https://supabase.com/)

## 📖 Cos'è

HUB Art è un atlante digitale di Storia dell'Arte pensato per studenti, docenti e appassionati. Combina diverse modalità di esplorazione in un'unica interfaccia:

- 🏛️ **Catalogo opere** — 974 opere con schede dettagliate (autore, datazione, luogo, analisi, innovazioni)
- 👤 **Catalogo artisti** — 259 artisti con biografie e opere collegate
- 🕸️ **Grafo neuronale 3D** — visualizzazione interattiva delle connessioni tra opere, artisti, periodi e termini
- 📅 **Timeline multilivello** — periodi, eventi e artisti su una linea del tempo navigabile
- 🗺️ **Mappa geografica** — opere e luoghi su mappa Leaflet/OpenStreetMap
- 📚 **Glossario** — 672 termini di storia dell'arte con definizioni
- 🎨 **Indice tecniche** — 93 tecniche artistiche catalogate
- 📊 **Dashboard statistiche** — dati aggregati sull'atlante
- 🎯 **Quiz interattivo** — 18 tipi di domanda generati dinamicamente dal dataset, con banca errori e statistiche
- 🏠 **Home 3D** — scena Three.js di una cattedrale come landing page

## ✨ Funzionalità principali

### Per studenti
- ★ **Preferiti** — salva opere e artisti con la stella
- ✓ **Approfondite** — segna le opere che hai studiato
- 🎯 **Quiz personalizzato** — fai quiz solo sui tuoi preferiti o sulle opere approfondite, con filtro temporale a trascinamento
- 📈 **Statistiche personali** —跟踪 dei progressi nei quiz
- ☁️ **Sincronizzazione cloud** — preferiti e progressi salvati su Supabase, accessibili da qualsiasi dispositivo

### Per contributori
- 📝 **Suggerisci nuove opere** — proponi opere da aggiungere all'atlante
- ✎ **Suggerisci modifiche** — segnala correzioni a opere esistenti (datazione, autore, luogo, ecc.)
- 📬 **Casella avvisi** — ricevi notifiche quando l'admin revisiona le tue richieste

### Per amministratori
- 🔐 **Dashboard admin** — gestisci le richieste degli utenti (approva/rifiuta con nota)
- 🖼️ **Editor database** — crea, modifica, elimina opere e artisti direttamente nel DB Supabase
- 🌐 **Immagini globali** — gli admin possono cambiare le immagini delle opere per tutti gli utenti

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
| **Backend/DB** | Supabase 2 (PostgreSQL, Auth, Realtime) |
| **Mobile** | Capacitor 8 (packaging iOS PWA) |
| **Hosting** | Netlify |
| **Font** | Fontshare (Boska, Zodiak, General Sans) |

## 🚀 Quick start

### Prerequisiti
- Node.js 18+ e npm
- Browser moderno

### Installazione
```bash
git clone https://github.com/<tuo-username>/hubart.git
cd hubart
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

1. `migration_image_overrides_global.sql` — immagini override globali (admin)
2. `migration_works_artists_tables.sql` — tabelle `works` e `artists` per editor admin
3. `supabase_suggestions.sql` — tabella richieste utenti (opere nuove)
4. `supabase_edit_suggestions.sql` — tabella richieste modifiche utenti

### Sicurezza
- **RLS (Row Level Security)** attiva su tutte le tabelle
- **Anon key pubblica** by design (non è una chiave segreta)
- **Admin authorization** via JWT email verification nelle RLS policies
- **Service role key** NON è nel codice (è segreta e va usata solo lato server)

## 📁 Struttura del progetto

```
hubart/
├── public/
│   ├── data/           # dataset JSON statici (works, artists, periods, ...)
│   ├── textures/       # texture PBR per scena 3D
│   ├── admin.html      # editor DB per admin (vanilla JS + Supabase)
│   ├── manifest.json   # PWA manifest
│   └── _headers        # header Netlify (cache, security)
├── src/
│   ├── components/     # componenti riutilizzabili (Sidebar, ui, CookieConsent, ...)
│   ├── lib/            # logica business (auth, supabase, sync, data, store, ...)
│   ├── pages/          # pagine React (Home3D, Opere, Opera, Grafo, Mappa, ...)
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

- 📧 Email: `hubarte@pm.me`
- 🐛 Bug report: [GitHub Issues](../../issues)
- 💬 Discussioni: [GitHub Discussions](../../discussions)

## 🙏 Riconoscimenti

- **Wikimedia Commons** per le immagini delle opere
- **OpenStreetMap** per i dati geografici
- **Fontshare** per i font tipografici
- **Supabase** per il backend
- **Netlify** per l'hosting

## 📊 Statistiche progetto

- 974 opere catalogate
- 259 artisti
- 51 periodi storici
- 329 connessioni tra entità
- 672 termini del glossario
- 93 tecniche artistiche
- 18 tipi di domanda nel quiz

---

⭐ Se questo progetto ti è utile, lascia una star su GitHub!
