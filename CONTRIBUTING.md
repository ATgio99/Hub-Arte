# Contribuire a HUB Art — Atlante Neuronale

Grazie per il tuo interesse nel contribuire al progetto! 🎨

## 📋 Indice

- [Come contribuire](#come-contribuire)
- [Setup ambiente di sviluppo](#setup-ambiente-di-sviluppo)
- [Standard del codice](#standard-del-codice)
- [Segnalazione bug](#segnalazione-bug)
- [Proposta di nuove funzionalità](#proposta-di-nuove-funzionalità)
- [Pull request](#pull-request)
- [Codice di condotta](#codice-di-condotta)

## Come contribuire

Ci sono molti modi per contribuire al progetto:

- 🐛 **Segnalare bug** aprendo una [Issue](../../issues)
- 💡 **Proporre funzionalità** aprendo una Issue con il tag `enhancement`
- 📝 **Migliorare la documentazione** (README, commenti al codice, guide)
- 🌍 **Tradurre** l'interfaccia in altre lingue
- 🎨 **Aggiungere opere o artisti** al dataset (vedi sezione Dataset)
- 💻 **Scrivere codice** risolvendo Issue esistenti

## Setup ambiente di sviluppo

### Prerequisiti

- Node.js 18+ e npm
- Un browser moderno (Chrome, Firefox, Safari, Edge)
- Git

### Installazione

```bash
# 1. Fork del repository su GitHub
# 2. Clone del tuo fork
git clone https://github.com/<tuo-username>/hubart.git
cd hubart

# 3. Aggiungi l'upstream remote
git remote add upstream https://github.com/<origin-owner>/hubart.git

# 4. Installa le dipendenze
npm install

# 5. Avvia il server di sviluppo
npm run dev
```

Il sito sarà disponibile su http://localhost:5173

### Build di produzione

```bash
npm run build      # genera la cartella dist/
npm run preview    # anteprima del build di produzione
```

### Variabili d'ambiente

Copia `.env.example` in `.env` e personalizza i valori se vuoi usare un tuo progetto Supabase. I valori di default funzionano out-of-the-box con il progetto HUB Art ufficiale.

```bash
cp .env.example .env
```

## Standard del codice

### TypeScript / React

- Usa **TypeScript** per tutto il codice nuovo
- Componenti React in stile **funzionale** (no class component)
- **Hooks** per la logica di stato
- Nomenclatura:
  - Componenti: `PascalCase` (es. `WorkCard.tsx`)
  - Funzioni/variabili: `camelCase`
  - Costanti: `UPPER_SNAKE_CASE`
  - File: `PascalCase.tsx` per componenti, `kebab-case.ts` per utility

### CSS

- Variabili CSS definite in `src/index.css` (es. `--gold`, `--ink`, `--bg`)
- Evitare CSS inline quando possibile (usare classi in `app.css` o `index.css`)
- Mobile-first responsive design

### Struttura file

```
src/
├── components/    # Componenti riutilizzabili (Sidebar, ui, ecc.)
├── lib/           # Logica business (auth, supabase, sync, data, ecc.)
├── pages/         # Pagine/rotte React (Opere, Opera, Grafo, ecc.)
├── three/         # Codice Three.js per la scena 3D della home
├── App.tsx        # Router principale
├── main.tsx       # Entry point
├── index.css      # Stili globali + variabili CSS
└── app.css        # Stili dei componenti
```

### Commit

Seguiamo la convenzione [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <descrizione breve>

<descrizione estesa opzionale>
```

Tipi comuni:
- `feat`: nuova funzionalità
- `fix`: bug fix
- `docs`: solo documentazione
- `style`: formattazione, nessun cambiamento di codice
- `refactor`: refactoring del codice
- `perf`: miglioramento performance
- `test`: aggiunta/modifica test
- `chore`: task di manutenzione

Esempi:
```
feat: aggiunto slider temporale nel quiz

fix: risolto bug allineamento icone StudiedCheck in Opera.tsx

docs: aggiornato README con istruzioni deploy Netlify
```

## Segnalazione bug

Prima di aprire una Issue per un bug:

1. **Cerca nelle Issue esistenti** se il bug è già stato segnalato
2. **Verifica che il bug sia riproducibile** sull'ultima versione (`main` branch)
3. Apri una nuova Issue con:
   - **Titolo chiaro** che descrive il problema
   - **Passi per riprodurre** il bug
   - **Comportamento atteso** vs **comportamento osservato**
   - **Screenshot** se rilevante
   - **Ambiente**: browser, OS, dispositivo
   - **Eventuali errori** in console

## Proposta di nuove funzionalità

1. Apri una Issue con tag `enhancement`
2. Descrivi chiaramente **cosa** vorresti e **perché**
3. Se possibile, includi mockup o esempi
4. Aspetta feedback dai maintainer prima di iniziare a sviluppare

## Pull request

1. **Crea un branch** dal `main`:
   ```bash
   git checkout -b feat/nuova-funzionalita
   ```
2. **Fai commit piccoli e atomici** seguendo la convenzione Conventional Commits
3. **Testa** che tutto funzioni:
   ```bash
   npm run build
   ```
4. **Pusha** il branch sul tuo fork:
   ```bash
   git push origin feat/nuova-funzionalita
   ```
5. **Apri una Pull Request** verso `main` del repository upstream
6. Nella descrizione della PR includi:
   - Riferimento all'Issue risolta (es. `Closes #123`)
   - Descrizione dei cambiamenti
   - Screenshot se rilevante
7. Rispondi ai feedback dei reviewer

### Checklist PR

- [ ] Il codice compila senza errori (`npm run build`)
- [ ] Ho testato manualmente le modifiche
- [ ] Ho aggiornato la documentazione se necessario
- [ ] Ho aggiunto test se rilevante
- [ ] I commit seguono la convenzione Conventional Commits
- [ ] Non ho committato file sensibili (`.env`, credenziali, ecc.)

## Dataset

Il dataset delle opere, artisti, periodi, tecniche e termini è in `public/data/*.json`. Per proporre aggiunte o correzioni al dataset:

1. Apri una Issue descrivendo cosa vorresti aggiungere/correggere
2. Per opere/artisti nuovi: usa il form "Suggerisci opera" sul sito (rotta `/suggerisci`)
3. Per correzioni a opere esistenti: usa il pulsante "✎ Suggerisci modifica" sulla scheda dell'opera

I maintainer valuteranno le proposte e le integreranno nel dataset.

## Codice di condotta

Partecipando a questo progetto accetti di mantenere un tono rispettoso e inclusivo. Comportamenti harassivi, discriminatori o tossici non saranno tollerati. Vedi il [Code of Conduct](./CODE_OF_CONDUCT.md) per dettagli.

## License

Contribuendo al progetto, accetti che le tue modifiche saranno rilasciate sotto la [MIT License](./LICENSE).

---

Grazie per il tuo contributo! 🙌
