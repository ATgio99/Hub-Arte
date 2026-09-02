# HUB Arte su iPhone

L'atlante gira su iPhone come app vera, non come pagina web salvata sulla home.
Il catalogo è dentro l'app — 1.100 opere, immagini escluse — quindi **funziona
anche senza rete**: in un museo, in metropolitana, in aula.

Aggiornata a settembre 2026, per Capacitor 8.

---

## Cosa serve

- **Mac** con Xcode 15 o successivo (gratis dal Mac App Store)
- **Node.js 18+**
- Un **iPhone** con iOS 16+ e un cavo
- Un **Apple ID** normale — per installare sul proprio telefono non serve
  l'abbonamento da sviluppatore

**CocoaPods non serve più.** Capacitor 8 usa Swift Package Manager: Xcode
scarica da sé quello che occorre alla prima apertura. Le guide che trovi in
rete e parlano di `pod install` si riferiscono a versioni precedenti.

---

## Una volta sola: dire al Mac dove sta Xcode

Se hai installato Xcode dopo gli strumenti da riga di comando, il Mac potrebbe
puntare ancora a quelli. Si vede così:

```bash
xcode-select -p
```

Se risponde `/Library/Developer/CommandLineTools`, correggi (chiede la tua
password):

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

Deve rispondere `/Applications/Xcode.app/Contents/Developer`.

---

## Ogni volta che vuoi portare le modifiche sul telefono

```bash
npm run ios:prepara
```

Compila il sito e copia il risultato dentro il progetto iOS. Poi:

```bash
npm run ios:apri
```

Apre Xcode sul progetto.

---

## La prima volta, dentro Xcode

**1. Collega il tuo Apple ID.** `Xcode → Settings → Accounts → +`, scegli
*Apple ID* ed entra. Basta quello normale, senza abbonamenti.

**2. Scegli chi firma l'app.** Nel pannello di sinistra clicca su **App**, poi
sulla scheda **Signing & Capabilities**. Metti la spunta su *Automatically
manage signing* e in *Team* scegli il tuo nome (comparirà come «Personal
Team»).

Se Xcode si lamenta che l'identificativo è già usato, cambialo: in *Bundle
Identifier* metti qualcosa di tuo, per esempio `com.tuonome.hubarte`.

**3. Collega l'iPhone** al Mac. La prima volta il telefono chiede se ti fidi
del computer: rispondi di sì. Poi, in alto al centro in Xcode, scegli il tuo
iPhone dall'elenco dei dispositivi.

**4. Premi ▶** (o `⌘R`).

**5. Sul telefono, autorizza l'app.** La prima installazione viene bloccata da
iOS. Vai in *Impostazioni → Generali → VPN e gestione dispositivo*, tocca il
tuo Apple ID e scegli *Autorizza*. Poi riapri l'app.

---

## Cosa aspettarsi

**L'app scade dopo sette giorni.** Con un Apple ID gratuito è così: passata la
settimana l'app non si apre più e va reinstallata da Xcode, ripetendo il
passaggio 4. Per una discussione di laurea o una dimostrazione va bene; per
tenerla sul telefono a tempo indeterminato serve l'abbonamento Apple Developer,
99 € l'anno.

**Il catalogo è quello del giorno in cui hai compilato.** L'app parte dai file
che si porta dentro e poi chiede al database solo ciò che è cambiato dopo. Le
correzioni fatte dalla dashboard si vedono quindi anche nell'app, appena c'è
rete. Senza rete resta quello impacchettato, che è comunque completo.

**Le email di conferma e di recupero password rimandano al sito.** Dentro
l'app l'indirizzo di partenza è `capacitor://localhost`, che esiste solo nel
telefono: un link di quel tipo, aperto dalla posta, non porterebbe da nessuna
parte. Chi si registra dall'app conferma quindi su hubarte.it, poi torna
nell'app e accede. È gestito in `src/lib/auth.tsx`.

**Lo scorrimento dal bordo non ruba più il gesto.** Sul sito, in Safari, lo
scorrimento dal bordo sinistro torna indietro nella cronologia, e per questo
l'intervallo storico si apre in un foglio dal basso. Dentro l'app quel gesto
non c'è.

---

## Se qualcosa non va

**«Untrusted Developer» sul telefono** → è il passaggio 5 qui sopra.

**Xcode non vede l'iPhone** → sblocca il telefono, e se non compare il cavo
potrebbe essere solo di ricarica: serve un cavo dati.

**Schermata bianca all'avvio** → non hai compilato prima di sincronizzare.
Rilancia `npm run ios:prepara`.

**Errori di firma** → cambia il *Bundle Identifier* con uno tuo, come al
passaggio 2.

---

## Portarla sull'App Store

Serve l'abbonamento Apple Developer (99 € l'anno) e passare la revisione di
Apple. Un punto da preparare: Apple respinge le app che sono solo un sito web
impacchettato — è la regola 4.2, *minimum functionality*. HUB Arte ha un
argomento serio a favore, e cioè che **funziona per intero senza rete** perché
il catalogo è dentro l'app, ma va sostenuto nella scheda di presentazione, non
dato per scontato.
