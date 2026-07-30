# HUB Art — Guida all'installazione su iPhone (iOS)

## Panoramica

HUB Art è stato convertito in un'app iOS nativa usando **Capacitor**. L'app funziona completamente offline e non richiede un server Python — tutte le operazioni CRUD sulle opere avvengono tramite localStorage del browser integrato.

---

## Requisiti

- **Mac** con macOS 13+ (Ventura o successivo)
- **Xcode 15+** (gratis dal Mac App Store)
- **Node.js 18+** (scarica da nodejs.org)
- Il tuo **iPhone** con iOS 16+
- Un **cavo USB** per collegare l'iPhone al Mac
- Un **Apple ID** (gratis — non serve l'abbonamento sviluppatore per testare sul tuo dispositivo)

---

## Metodo 1: Installazione tramite Xcode (Consigliato)

### Passo 1: Installa le dipendenze

Apri il **Terminale** sul Mac e naviga nella cartella del progetto:

```bash
cd /percorso/alla/cartella/progetto
npm install
```

### Passo 2: Compila il progetto web

```bash
npx vite build
```

### Passo 3: Sincronizza con iOS

```bash
npx cap sync ios
```

### Passo 4: Apri Xcode

```bash
npx cap open ios
```

Questo apre Xcode con il progetto `App.xcworkspace`.

### Passo 5: Configura il tuo Apple ID in Xcode

1. In Xcode, vai su **Xcode → Settings (⌘,) → Accounts**
2. Clicca **"+"** in basso a sinistra
3. Seleziona **Apple ID** e accedi con il tuo ID Apple
4. Nella lista dei team, vedrai il tuo "Personal Team"

### Passo 6: Seleziona il tuo team di firma

1. Nel navigator di sinistra di Xcode, clicca su **App** (il progetto principale)
2. Nel tab **Signing & Capabilities**:
   - Seleziona il tuo **Team** (Personal Team)
   - Xcode genererà automaticamente un **Bundle Identifier** (es. `com.hubart.atlante`)
   - Assicurati che **Automatically manage signing** sia attivo

### Passo 7: Collega l'iPhone e installa

1. Collega il tuo iPhone al Mac con il cavo USB
2. Sull'iPhone, quando compare "Fidati di questo computer?", premi **Fidati**
3. In Xcode, in alto al centro, nel menu a tendina dei dispositivi:
   - Seleziona il tuo **iPhone** (dovrebbe apparire con il suo nome)
4. Premi il pulsante **▶ Run** (o ⌘R) in Xcode
5. L'app verrà compilata e installata sul tuo iPhone!

### Passo 8: Autorizza lo sviluppatore sull'iPhone

La prima volta che lanci l'app, iOS potrebbe bloccarla:

1. Vai su **Impostazioni → Generali → VPN e gestione dispositivo**
2. Trova il tuo Apple ID sotto "Sviluppatore app"
3. Premi **Fidati di [tuo-nome]**
4. Ora puoi aprire l'app HUB Art!

> ⚠️ **Nota**: Le app firmate con un Apple ID gratuito scadono dopo **7 giorni**. Dovrai reinstallarle riaprendo Xcode e premendo ▶ Run. Per evitare questo, puoi iscriverti all'Apple Developer Program (€99/anno).

---

## Metodo 2: PWA — Aggiungi alla schermata Home (Senza Mac!)

Se non hai un Mac, puoi usare l'app come **PWA (Progressive Web App)** direttamente da Safari:

### Passo 1: Ospita l'app su un server

Puoi usare qualsiasi servizio di hosting gratuito:
- **Netlify** (netlify.com) — trascina la cartella `dist/`
- **Vercel** (vercel.com) — importa il progetto
- **GitHub Pages** — carica la cartella `dist/`
- Oppure avvia il server locale: `npx serve dist`

### Passo 2: Apri in Safari sull'iPhone

1. Apri **Safari** sull'iPhone
2. Vai all'URL dell'app (es. `https://tuosito.netlify.app`)

### Passo 3: Aggiungi alla Home

1. Premi il pulsante **Condividi** (icona quadrato con freccia ↑)
2. Scorri e premi **"Aggiungi alla Home"**
3. Dai un nome all'app (es. "HUB Art")
4. Premi **Aggiungi**

L'app apparirà come un'icona sulla tua Home e si aprirà a schermo intero senza la barra di Safari!

> ✅ Questo metodo NON richiede un Mac, Xcode, o un abbonamento Apple Developer.

---

## Struttura del progetto iOS

```
progetto/
├── ios/                        ← Progetto Xcode (generato da Capacitor)
│   └── App/
│       ├── App.xcworkspace     ← Apri QUESTO file in Xcode
│       ├── App/
│       │   ├── public/         ← I file web compilati (da dist/)
│       │   └── Info.plist      ← Configurazione iOS
│       └── Podfile
├── src/                        ← Codice sorgente React
├── dist/                       ← Build web (usato da Capacitor)
├── capacitor.config.ts         ← Configurazione Capacitor
└── package.json
```

---

## Funzionalità nell'app iOS

| Funzionalità | Stato | Note |
|---|---|---|
| 🔍 Navigazione completa | ✅ | Tutte le pagine funzionano |
| 🗺️ Mappa interattiva | ✅ | Leaflet funziona su WKWebView |
| 🎮 Animazione 3D Basilica | ✅ | Three.js/WebGL supportato |
| 📊 Grafo neurale | ✅ | Force-graph 2D/3D |
| 📅 Linea del tempo (periodi + artisti) | ✅ | Touch scroll e pinch zoom |
| ✏️ CRUD opere | ✅ | Tramite pagina /admin.html (localStorage) |
| 🎯 Quiz e test | ✅ | Funziona offline |
| 📱 Offline | ✅ | I dati JSON sono inclusi nell'app |
| 🔗 Font web | ⚠️ | Richiede connessione per i font la prima volta |

---

## Comandi utili

```bash
# Ricompila dopo modifiche al codice sorgente
npx vite build && npx cap sync ios

# Apri Xcode
npx cap open ios

# Solo sincronizzazione web → iOS (senza ricompilare il web)
npx cap copy ios

# Aggiorna i plugin nativi
npx cap update ios
```

---

## Personalizzazione

### Cambiare il nome dell'app
Modifica `capacitor.config.ts`:
```typescript
appName: 'HUB Art',  // ← cambia qui
```

### Cambiare l'icona
1. Prepara un'immagine 1024×1024 PNG
2. Usa [App Icon Generator](https://www.appicon.co/) per generare tutti i formati
3. In Xcode, vai su **Assets.xcassets → AppIcon** e trascina le icone

### Cambiare il colore della splash screen
Modifica `capacitor.config.ts`:
```typescript
plugins: {
  SplashScreen: {
    backgroundColor: '#1a1a1a',  // ← cambia qui
  },
}
```

---

## Risoluzione problemi

### "Untrusted Developer" sull'iPhone
Vai su **Impostazioni → Generali → VPN e gestione dispositivo** → fai fiducia del tuo Apple ID.

### L'app non carica i font
I font da fontshare.com richiedono una connessione internet la prima volta. Dopo il primo caricamento, il browser li memorizza nella cache. Per uso completamente offline, scarica i font e inseriscili localmente.

### L'app si apre ma mostra schermata bianca
Assicurati di aver eseguito `npx cap sync ios` dopo `npx vite build`. I file web devono essere copiati nella cartella iOS.

### Errori di firma in Xcode
Assicurati che il Bundle Identifier sia unico. Se `com.hubart.atlante` è già preso, cambialo in qualcosa come `com.tuonome.hubart`.

### Le modifiche alle opere non si vedono
Le modifiche fatte dalla pagina admin sono salvate in localStorage. Se l'app viene reinstallata, le modifiche vengono perse. Per renderle permanenti, modifica il file `public/data/works.json` prima di ricompilare.
