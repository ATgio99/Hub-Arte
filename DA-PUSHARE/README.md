# HUB Arte — atlante di storia dell'arte

> Un atlante per studiare storia dell'arte guardando come le opere stanno fra
> loro: chi le ha fatte, chi le ha pagate, in che periodo. Gratuito, senza
> pubblicità, codice aperto.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Made with React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-purple.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-2-green.svg)](https://supabase.com/)

🌐 **Sito live**: [hubarte.it](https://hubarte.it)

## 📖 Cos'è

Studiando storia dell'arte mi capitava sempre la stessa cosa: sapevo le singole
opere e non vedevo cosa le tenesse insieme. Chi aveva imparato da chi, quali città
contavano in un certo momento, chi tirava fuori i soldi perché una cappella
venisse affrescata. Sui manuali c'è tutto, ma sparso su duecento pagine.

HUB Arte prova a tenere insieme quelle cose:

- 🏛️ **Catalogo opere** — oltre 1.100 schede con autore, committente, datazione, luogo, analisi e innovazioni
- 👤 **Protagonisti** — oltre 600 schede fra autori e committenti, dai papi alle corporazioni di mestiere
- 🕸️ **Grafo 3D** — le connessioni fra opere, artisti, periodi e termini, da girarci dentro
- 📅 **Linea del tempo** — oltre 110 periodi annidati su tre livelli: epoche, correnti, scuole e botteghe
- 🗺️ **Mappa** — dove si trovano le opere, e i legami fra una città e l'altra
- 📚 **Glossario** — oltre 850 termini con definizione
- 🎨 **Tecniche** — oltre 200 procedimenti, ordinati per epoca di comparsa
- 📊 **Statistiche** — come è distribuito il catalogo
- 🎯 **Quiz** — domande costruite dal catalogo con regole fisse, con banca degli errori e statistiche
- 🔗 **oltre 600 connessioni** fra entità: influenze, maestro-allievo, committenze, collaborazioni

### Fin dove arriva il catalogo, e dove si ferma

Il grosso viene da due manuali di storia dell'arte, e il catalogo ne eredita i
confini: **dalla Tarda Antichità al Barocco**, più o meno dal 284 al 1750, con una
geografia europea e una grossa prevalenza italiana. Non aspettarti un panorama
completo dell'arte. Questo è il perimetro di un programma scolastico, con i buchi
che quel perimetro si porta dietro.

Il buco più grosso: **fra gli autori censiti non c'è nemmeno una donna.** Le uniche
donne nel catalogo compaiono come committenti — Isabella d'Este, Galla Placidia,
Eleonora di Toledo, Barbara di Brandeburgo, Giovanna da Piacenza, Atalanta
Baglioni, Yolanda d'Aragona. Non è una mia dimenticanza: i manuali da cui ho
lavorato le artiste non le nominano, e io ho ricopiato quel silenzio. Scriverlo qui
non lo risolve, serve a non farlo passare per un dato di realtà.

C'è poi una cosa da sapere sulla mappa. Il luogo di ogni scheda è **dove l'opera si
trova adesso**, non dove è stata prodotta. Per questo Londra, New York e Washington
pesano tanto: quella è la geografia dei musei, non quella dei cantieri.

### Dove ho usato l'intelligenza artificiale

In diversi punti, e mi sembra giusto dire quali. Ho lavorato con i modelli Claude
di Anthropic, nell'estate del 2026.

1. **Riordinare dati che c'erano già.** Assegnare le opere ai periodi giusti e
   trovare i committenti ha voluto dire passare le schede una per una. Quasi sempre
   il nome del committente era già scritto nel testo («fu commissionata da…»):
   andava tirato fuori e messo in un campo, non inventato.
2. **Buttare giù le prime stesure.** Le descrizioni di alcune scuole e di buona
   parte dei committenti nascono da un modello, a partire dai dati del catalogo.
   Qui non si riordina niente, si scrive: è la parte di cui mi fido meno.

Nessuna proposta è finita dritta nel catalogo. Il lavoro usciva ogni volta come un
elenco da approvare, e l'ho letto voce per voce prima di applicarlo; le motivazioni
di ogni scelta sono in questo repository. Ho fatto girare anche dei controlli
automatici: niente rimandi a schede inesistenti, niente periodi appesi male, date
del committente compatibili con quelle dell'opera. Quello che **non** ho fatto è
riaprire i manuali per ciascuna scheda: ho guardato struttura, coerenza interna e
plausibilità storica, e sono andato a fondo solo dove qualcosa non tornava,
controllando le fonti dei musei. Alcuni casi restano dichiaratamente aperti.

Resta un problema che riguarda lo strumento, non i dati. Un modello linguistico
restituisce lo sguardo dei testi su cui è stato addestrato, quindi ripete il canone
che quei testi danno per scontato e lascia ai margini quello che ai margini c'era
già. Su un catalogo che parte da due manuali il rischio è di ritrovarsi gli stessi
silenzi, con in più l'aria di essere neutrali. Rileggere serve a controllare i
fatti, ma soprattutto a stare attenti a questo.

Di quello che c'è scritto rispondo io, non gli strumenti che ho usato per
scriverlo. Errori ce ne sono: usalo per studiare, ma se stai scrivendo qualcosa che
conta vai a controllare sui manuali.

## ✨ Funzionalità principali

### Per studenti
- ★ **Preferiti** — salva opere e artisti con la stella
- ✓ **Approfondite** — segna le opere che hai studiato
- 🎯 **Quiz su misura** — solo sui tuoi preferiti o sulle opere che hai segnato, con filtro temporale a trascinamento
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

Se vuoi dare una mano, [CONTRIBUTING.md](./CONTRIBUTING.md) spiega:

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

- **Wikimedia Commons** e Wikipedia per le immagini: sono buone per studiare, non
  per lavorarci sopra — per quello servono le riproduzioni dei musei
- **OpenStreetMap** per i dati geografici
- **Fontshare** per i font tipografici
- **Supabase** per il backend (auth, database, realtime)
- **Netlify** per l'hosting (Open Source Plan)
- **Resend** per il servizio SMTP (email di auth)

## 📊 Statistiche progetto

- 1100+ opere
- 600+ schede fra autori e committenti
- 110+ periodi, su tre livelli annidati
- 600+ connessioni fra entità
- 850+ termini di glossario
- 200+ tecniche
- 270+ eventi storici
- 24 tipi di domanda nel quiz

---

⭐ Se ti è utile, lascia una star: [github.com/ATgio99/Hub-Arte](https://github.com/ATgio99/Hub-Arte)
