# HUB Arte — atlante di storia dell'arte

> Strumento di studio che mette in relazione opere, chi le ha fatte, chi le ha
> volute e i periodi in cui sono nate. Gratuito, senza pubblicità, open source.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Made with React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-purple.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-2-green.svg)](https://supabase.com/)

🌐 **Sito live**: [hubarte.it](https://hubarte.it)

## 📖 Cos'è

HUB Art è un atlante digitale di Storia dell'Arte pensato per studenti, docenti e appassionati. Combina diverse modalità di esplorazione in un'unica interfaccia:

- 🏛️ **Catalogo opere** — oltre 1.100 opere con schede dettagliate (autore, committente, datazione, luogo, analisi, innovazioni)
- 👤 **Protagonisti** — oltre 600 schede fra autori e committenti, dai papi alle corporazioni di mestiere
- 🕸️ **Grafo neuronale 3D** — visualizzazione interattiva delle connessioni tra opere, artisti, periodi e termini
- 📅 **Timeline gerarchica** — oltre 110 periodi su tre livelli annidati: epoche, correnti, scuole e botteghe
- 🗺️ **Mappa geografica** — opere e luoghi su mappa Leaflet/OpenStreetMap
- 📚 **Glossario** — oltre 850 termini di storia dell'arte con definizioni
- 🎨 **Indice tecniche** — oltre 200 tecniche artistiche catalogate
- 📊 **Dashboard statistiche** — dati aggregati sull'atlante
- 🎯 **Quiz interattivo** — 18 tipi di domanda generati dinamicamente dal dataset, con banca errori e statistiche
- 🔗 **oltre 600 connessioni** tra entità (influenze, maestro-allievo, committenze, collaborazioni)

### Il perimetro del catalogo, e che cosa resta fuori

Questi numeri sono il risultato di una selezione, e ogni selezione esclude:
dichiararne i confini fa parte della descrizione del progetto.

Il nucleo dei contenuti nasce da un manuale universitario italiano di storia
dell'arte e ne eredita il perimetro. **L'arco cronologico va dalla Tarda Antichità
al Barocco** (284–1750 circa); l'orizzonte è europeo, con netta prevalenza
italiana. Non è un atlante di storia dell'arte: è l'atlante di un programma di
studio.

Il limite più netto riguarda chi il catalogo lascia fuori. **Fra gli autori censiti non compare
alcuna artista donna.** Le sole donne presenti sono committenti: Isabella d'Este, Galla Placidia, Eleonora di Toledo, Barbara di
Brandeburgo, Giovanna da Piacenza, Atalanta Baglioni, Yolanda d'Aragona. Questa
assenza riproduce quella dei manuali da cui il catalogo deriva; registrarla non la
corregge, ma evita di presentarla come neutralità.

Un secondo limite riguarda la geografia: il luogo registrato per ogni opera è
**dove l'opera si trova oggi**, non dove è stata prodotta. La mappa descrive
quindi la geografia della conservazione — ed è la ragione per cui Londra, New York
e Washington vi compaiono con un peso che nulla dice sui luoghi di produzione.

### Come è stato costruito, e dove ha lavorato l'intelligenza artificiale

Una parte del lavoro è stata svolta con l'assistenza di modelli linguistici
(famiglia Claude di Anthropic, agosto 2026). Le funzioni sono state due, e vanno
distinte:

1. **Riordino di dati già presenti.** L'assegnazione delle opere ai periodi e
   l'individuazione dei committenti sono state ricavate esaminando le schede una
   per una: nella maggior parte dei casi il dato era già scritto nel testo e
   andava estratto e reso strutturato, non prodotto.
2. **Redazione di testi in prima stesura.** Le schede di alcune scuole e di gran
   parte dei committenti sono state scritte in bozza a partire dai dati del
   catalogo. Qui non si riordina: si produce prosa interpretativa, e la cautela
   richiesta è maggiore.

Ogni proposta è stata prodotta come elenco da approvare, mai scritta direttamente
nel catalogo, e le motivazioni di ciascuna sono conservate nel repository. Sono
stati eseguiti controlli sistematici di coerenza (riferimenti esistenti, gerarchia
dei periodi, compatibilità cronologica fra committente e opera). **Non** è stata
condotta una verifica bibliografica indipendente di ciascuna delle schede:
la revisione ha riguardato struttura, coerenza interna e plausibilità storica, con
approfondimento sulle sole attribuzioni segnalate come dubbie, esaminate su fonti
museali; una parte di esse resta dichiaratamente aperta.

Resta un limite che riguarda lo strumento e non i dati: un modello linguistico
restituisce lo sguardo prevalente nei testi su cui è stato addestrato, e tende
quindi a riprodurre il canone storiografico dominante, rendendo ancora meno
visibile ciò che è già ai margini. Applicato a un catalogo che eredita il
perimetro di un manuale, rischia di funzionare come amplificatore di quel canone.
La revisione umana ha perciò una funzione non solo di controllo dei fatti ma di
correzione di prospettiva.

La responsabilità scientifica di quanto è pubblicato è di chi cura il progetto,
non degli strumenti impiegati per costruirlo. Il catalogo contiene errori: è uno
strumento di studio, non una fonte da citare in un lavoro accademico.

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

Fatto: il sito è in funzione con il catalogo completo. **Non serve configurare un
database**, perché opere, autori, periodi, termini, tecniche e connessioni stanno
nei file JSON in `public/data/`.

### Variabili d'ambiente (facoltative)
Servono solo per gli account e la dashboard di amministrazione. Senza, il sito
funziona in sola lettura — che è tutto quel che serve per consultarlo o
svilupparci sopra.
```bash
cp .env.example .env
# inserisci indirizzo e chiave anonima del tuo progetto Supabase
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

## 🗄️ Dove stanno i dati

Il catalogo vive nei JSON di `public/data/`, uno per tipo di entità. È la fonte
di verità del progetto: chi clona il repository ha l'atlante completo, e il sito
gira senza credenziali.

Il database serve per gli account, la sincronizzazione fra dispositivi, i
suggerimenti degli utenti e la dashboard di amministrazione. Contiene le stesse
tabelle del catalogo, ma l'app **non le rilegge tutte a ogni avvio**: chiede solo
le righe modificate dopo la data di `public/data/meta.json`. Così le correzioni
fatte dalla dashboard si vedono subito online, e finché non si tocca nulla quelle
richieste tornano vuote.

Per riportare nel repository le modifiche fatte dalla dashboard:

```bash
npm run esporta-catalogo
```

Riscrive i JSON, rimuove le voci nel frattempo nascoste e porta dentro le opere
le immagini scelte dagli amministratori. Poi si pubblicano i file cambiati.

Le istruzioni per allestire un proprio database sono in
[`supabase/README.md`](supabase/README.md).

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

- **Wikimedia Commons** e Wikipedia per le immagini delle opere: sono riproduzioni
  a scopo di studio, non riproduzioni scientifiche verificate
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
