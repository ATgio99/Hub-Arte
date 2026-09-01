# Il database di HUB Arte

**Per far girare il sito non serve un database.** Il catalogo — opere, autori,
committenti, periodi, tecniche, termini, connessioni, eventi — vive nei file
JSON dentro `public/data/`. Basta `npm install` e `npm run dev`.

Il database serve per tre cose:

1. **gli account** e ciò che è personale (opere preferite, opere approfondite,
   risultati dei quiz), sincronizzati fra i dispositivi di chi si registra;
2. **la dashboard di amministrazione**, per correggere il catalogo dal sito
   senza ripubblicarlo ogni volta;
3. **i suggerimenti** che gli utenti inviano dalle schede.

## Come funziona il rapporto fra JSON e database

I JSON contengono il catalogo **al momento dell'ultima esportazione**, la cui
data sta in `public/data/meta.json`. All'avvio l'app chiede al database
soltanto le righe modificate **dopo** quella data.

In pratica: se nessuno ha toccato il catalogo dalla dashboard, quelle richieste
tornano vuote e il sito legge tutto dai file. Se invece un amministratore ha
corretto tre opere, quelle tre arrivano dal database e si vedono subito online.

Quando si vogliono riportare le correzioni dentro il repository:

```bash
npm run esporta-catalogo
```

Il comando riscrive i JSON con il contenuto aggiornato, elimina le voci che nel
frattempo sono state nascoste e porta dentro le opere le immagini scelte a mano.
Poi basta pubblicare i file cambiati.

## Preparare un proprio database

Serve solo a chi vuole account e dashboard su un'installazione propria. Crea un
progetto su [supabase.com](https://supabase.com) — il piano gratuito è più che
sufficiente — e lancia nel suo editor SQL, **in quest'ordine**:

| # | File | Cosa crea |
|---|------|-----------|
| 1 | `migration_full_database.sql` | le sette tabelle del catalogo, con le regole di accesso |
| 2 | `migration_works_artists_tables.sql` | colonne aggiuntive di opere e autori |
| 3 | `migration_techniques_table.sql` | la tabella delle tecniche |
| 4 | `migration_hidden_entities.sql` | l'elenco delle voci nascoste |
| 5 | `migration_connections_sort_order.sql` | l'ordinamento delle connessioni |
| 6 | `migration_add_artist_category.sql` | la categoria degli autori |
| 7 | `migration_committenti.sql` | i campi dei committenti |
| 8 | `migration_image_gallery.sql` | la galleria di immagini |
| 9 | `migration_image_overrides_global.sql` | le immagini scelte dagli amministratori |
| 10 | `migration_quiz_sync.sql` | la sincronizzazione dei quiz |
| 11 | `supabase_suggestions.sql` | i suggerimenti di nuove opere |
| 12 | `supabase_edit_suggestions.sql` | i suggerimenti di modifica |

Poi copia `.env.example` in `.env` e inserisci l'indirizzo del progetto e la
chiave anonima. Le tabelle nasceranno vuote: il catalogo continua ad arrivare
dai JSON, ed è quello che vuoi.

Chi può amministrare è deciso in due punti che devono restare allineati:
l'elenco di indirizzi in `src/lib/auth.tsx` e le regole di accesso scritte nei
file qui sopra.

## storico/

Le migrazioni già applicate al database originale: correzioni di dati,
riorganizzazioni della gerarchia dei periodi, importazioni una tantum. Non
servono per una nuova installazione — i dati che producevano sono già nei JSON —
e sono conservate solo come memoria di come il catalogo è cambiato.

## lavoro_scuole/ e lavoro_committenti/

I materiali dei due grandi interventi sul catalogo: la discesa delle opere nelle
scuole e l'attribuzione dei committenti. Contengono le proposte, le motivazioni
di ogni singola scelta e le copie di sicurezza dei file prima delle modifiche.
Utili per rivedere una decisione, non necessari per far funzionare il sito.
