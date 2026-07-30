# HUB Art — Migration SQL Supabase

Questa cartella contiene tutti gli script SQL da eseguire nel **SQL Editor di Supabase** per attivare le nuove funzionalità.

**URL del progetto**: https://supabase.com/dashboard/project/ddsdvcznziciqdambgom/sql/new

---

## Ordine di esecuzione (OBBLIGATORIO)

Esegui gli script nell'ordine indicato. Ciascuno è indipendente ma per evitare conflitti conviene seguirlo.

### 1. `migration_image_overrides_global.sql` — Immagini globali admin (PUNTO 3)

**SCOPO**: Rende le immagini override degli admin visibili a tutti gli utenti (non più private per utente).

**Cosa fa**:
- Aggiunge la colonna `is_global BOOLEAN` alla tabella `image_overrides`
- Crea indici unici parziali: 1 override globale per opera, 1 override privato per (utente, opera)
- Aggiorna le RLS policies:
  - Tutti (anche anonimi) possono SELECT gli override globali
  - Solo admin può INSERT/UPDATE/DELETE gli override con `is_global=true`
  - Ogni utente può gestire i propri override con `is_global=false`

**ESECUZIONE OPZIONALE** (in fondo allo script): converti gli override già fatti dall'admin in globali. Scommenta le ultime righe se vuoi farlo.

**Effetto dopo l'esecuzione**:
- Quando un admin cambia immagine di un'opera → cambia per tutti gli utenti
- Quando un utente normale cambia immagine → cambia solo per lui

---

### 2. `migration_works_artists_tables.sql` — Tabelle opere e artisti nel DB (PUNTO 2)

**SCOPO**: Crea le tabelle `works` e `artists` nel DB Supabase per permettere all'admin di aggiungere/modificare/eliminare opere e artisti.

**Cosa fa**:
- Crea tabella `works` con tutti i campi del JSON (id, title, artist_ids, period_id, anno, luogo, immagini, ecc.)
- Crea tabella `artists` con tutti i campi del JSON (id, name, role, birth, death, period_ids, bio, ecc.)
- Aggiunge indici per ricerche frequenti (periodo, tipo, anno, GIN per array)
- Aggiunge trigger `updated_at` automatico
- RLS policies:
  - TUTTI (anonimi + autenticati) possono SELECT
  - SOLO admin può INSERT/UPDATE/DELETE

**Effetto dopo l'esecuzione**:
- L'admin può accedere a `/admin.html`, fare login e gestire opere/artisti
- Le opere/artisti nel DB sovrascrivono quelli del JSON (stesso id)
- Le opere/artisti nuovi (solo nel DB) vengono aggiunti al catalogo
- Il frontend legge prima dal DB, poi fa fallback al JSON

---

### 3. `supabase_suggestions.sql` — Tabella user_suggestions (già eseguito?)

Verifica che questa tabella esista già (creata nella sessione precedente). Se non esiste, esegui lo script.

**SCOPO**: Tabella dove gli utenti possono proporre nuove opere.

---

### 4. `supabase_edit_suggestions.sql` — Tabella user_edit_suggestions (già eseguito?)

Verifica che questa tabella esista già. Se non esiste, esegui lo script.

**SCOPO**: Tabella dove gli utenti possono proporre modifiche a opere esistenti.

---

## Come verificare che le migration siano state applicate

Dopo aver eseguito gli script, verifica:

1. **Tabella `image_overrides` ha la colonna `is_global`**:
   ```sql
   SELECT column_name, data_type FROM information_schema.columns
   WHERE table_name = 'image_overrides' AND column_name = 'is_global';
   ```
   Deve restituire 1 riga.

2. **Tabelle `works` e `artists` esistono**:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name IN ('works', 'artists');
   ```
   Deve restituire 2 righe.

3. **Policies RLS attive**:
   ```sql
   SELECT tablename, policyname, cmd FROM pg_policies
   WHERE schemaname = 'public' AND tablename IN ('works', 'artists', 'image_overrides')
   ORDER BY tablename, policyname;
   ```
   Deve restituire tutte le policies create dagli script.

---

## Cosa succede se NON esegui le migration

| Feature | Senza migration | Con migration |
|---------|----------------|---------------|
| **Quiz slider** (PUNTO 1) | ✅ Funziona (codice lato client) | ✅ Funziona |
| **Bug account** (PUNTO 3) | ⚠️ Funziona ma senza immagini globali. Gli admin possono cambiare immagini solo nel proprio browser (override privato). | ✅ Gli admin cambiano immagini per tutti gli utenti |
| **Admin editor** (PUNTO 2) | ❌ L'admin.html fa login ma non può salvare nulla (tabelle non esistono) | ✅ Admin può creare/modificare/eliminare opere e artisti nel DB |

**Raccomandazione**: esegui ALMENO le migration 1 e 2 per attivare tutte le feature. La 3 e 4 probabilmente sono già state eseguite nella sessione precedente.

---

## Credenziali admin

Gli account admin autorizzati sono (definiti nel codice in `src/lib/auth.tsx`):
- `hubarte@proton.me`
- `atgio@proton.me`

Questi account devono essere registrati su Supabase Auth (Authentication → Users). Le RLS policies verificano `auth.jwt() ->> 'email'` per autorizzare le scritture.

Per aggiungere un nuovo admin:
1. Registrare l'account su Supabase Auth
2. Aggiungere l'email in `src/lib/auth.tsx` → `ADMIN_EMAILS`
3. Aggiornare le RLS policies nei file SQL (sostituire `'hubarte@proton.me', 'atgio@proton.me'` con la lista completa)
4. Eseguire di nuovo gli script SQL (le policy verranno sostituite)
