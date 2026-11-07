import { useState } from "react";
// ============================================================================
// Pagine informative: Progetto, Privacy, Cookie, Termini, Crediti, Contatti.
// Rotte: /legal/progetto, /legal/privacy, /legal/cookie, /legal/termini,
//        /legal/crediti, /legal/contatti, /legal/accessibilita
// ============================================================================
import { useParams, Link, useNavigate } from "react-router-dom";
import { CONTACT_EMAIL } from "../lib/auth";
import PaginaModificabile from "../components/PaginaModificabile";
import Bibliografia from "../components/Bibliografia";
import { letturaAttiva, accendiLettura } from "../lib/lettura";
import { BannerGitHub } from "../components/ui";
import { SCORCIATOIE } from "../lib/scorciatoie";
import { useData } from "../lib/store";
import { isCommittente } from "../lib/data";

function useConteggi() {
  const ix = useData();
  const autori = ix.ds.artists.filter((a) => !isCommittente(a));
  const committenti = ix.ds.artists.filter(isCommittente);
  // Le donne fra chi ha commissionato: elenco esplicito, perche' il genere non
  // e' un dato del catalogo e non va indovinato dai nomi.
  const DONNE_COMMITTENTI = [
    "isabella-deste", "galla-placidia", "eleonora-di-toledo", "barbara-di-brandeburgo",
    "giovanna-da-piacenza", "atalanta-baglioni", "yolanda-daragona",
  ];
  const donne = ix.ds.artists.filter((a) => DONNE_COMMITTENTI.includes(a.id));
  return {
    opere: ix.ds.works.length,
    protagonisti: ix.ds.artists.length,
    autori: autori.length,
    committenti: committenti.length,
    periodi: ix.ds.periods.length,
    // I tre livelli si contano, non si ricavano per differenza: il totale
    // cambia a ogni revisione del catalogo e una sottrazione fissa mentirebbe.
    epoche: ix.ds.periods.filter((p) => p.type === "epoca").length,
    correnti: ix.ds.periods.filter((p) => p.type === "corrente").length,
    scuole: ix.ds.periods.filter((p) => p.type === "scuola").length,
    termini: ix.ds.terms.length,
    tecniche: ix.ds.techniques.length,
    connessioni: ix.ds.connections.length,
    donne,
    conImmagine: ix.ds.works.filter((w) => w.image_url || w.image_thumb).length,
  };
}

const num = (n: number) => n.toLocaleString("it-IT");

/** Valori del catalogo utilizzabili nel testo come {opere}, {autori}, … */
function segnapostoCatalogo(c: ReturnType<typeof useConteggi>): Record<string, string> {
  return {
    opere: num(c.opere),
    protagonisti: num(c.protagonisti),
    autori: num(c.autori),
    committenti: num(c.committenti),
    periodi: num(c.periodi),
    epoche: num(c.epoche),
    correnti: num(c.correnti),
    scuole: num(c.scuole),
    termini: num(c.termini),
    tecniche: num(c.tecniche),
    connessioni: num(c.connessioni),
    donne: String(c.donne.length),
    conImmagine: num(c.conImmagine),
    nomiDonne: c.donne.map((d) => d.name).join(", "),
  };
}

function H1({ children }: { children: React.ReactNode }) {
  return <h1 style={{ fontSize: "clamp(28px,4vw,42px)", letterSpacing: "-.02em", marginBottom: 18 }}>{children}</h1>;
}
function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 22, marginTop: 28, marginBottom: 10, fontFamily: "var(--font-display)" }}>{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--ink-soft)", margin: "0 0 12px" }}>{children}</p>;
}
function Mailto({ subject }: { subject?: string }) {
  const href = subject ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}` : `mailto:${CONTACT_EMAIL}`;
  return <a href={href} className="tlink">{CONTACT_EMAIL}</a>;
}

export default function Legal() {
  const { section = "" } = useParams();
  const c = useConteggi();
  const nav = useNavigate();

  if (section === "progetto") {
    return (
      <div className="wrap page"><div>
        <PaginaModificabile id="progetto" valori={segnapostoCatalogo(c)} titolo={<H1>Il progetto: fonti, metodo e limiti</H1>}>
        <P>Ultimo aggiornamento: novembre 2026.</P>

        <H2>Domanda e obiettivo</H2>
        <P>
          Base Arte nasce da una difficoltà incontrata studiando storia dell'arte: conoscere le
          singole opere non bastava a vedere i legami tra chi le realizzava, chi le commissionava
          e i contesti in cui prendevano forma.
        </P>
        <P>
          La domanda da cui parte il progetto è questa: che cosa diventa visibile quando le opere
          si esplorano attraverso le loro relazioni, oltre che attraverso l'ordine del manuale?
          L'obiettivo è offrire a chi studia storia dell'arte un modo per orientarsi tra opere,
          persone, periodi e luoghi.
        </P>

        <H2>Fonti e perimetro</H2>
        <P>
          Il catalogo comprende {num(c.opere)} opere, {num(c.protagonisti)} schede tra autori e
          committenti, {num(c.periodi)} periodi, {num(c.termini)} voci di glossario e
          {" "}{num(c.connessioni)} connessioni. La base principale sono due manuali:
          <i> Con gli occhi dell'arte</i>, volumi 2 e 3 (E. Demartini, C. Gatti, E. Tonetti,
          E. P. Villa, Rizzoli Education, 2022). I riferimenti sono elencati nella pagina
          <Link to="/legal/crediti" className="tlink">Crediti</Link>; le schede sono rielaborate,
          non trascritte.
        </P>
        <P>
          I periodi sono articolati in {num(c.epoche)} epoche, {num(c.correnti)} correnti e
          {num(c.scuole)} scuole o botteghe. Un'opera è assegnata al livello più specifico
          disponibile. La mappa, la linea del tempo e il grafo consentono di esplorare lo stesso
          catalogo da prospettive diverse.
        </P>
        <P>
          Questo perimetro riflette le fonti e il programma di studio da cui il progetto è
          partito. Il percorso va dalla Tarda Antichità al Barocco e dedica all'Italia più spazio
          che ad altre aree. Base Arte non è una ricognizione complessiva delle storie dell'arte:
          l'arte islamica è presente solo marginalmente; Asia, Africa e America precolombiana
          sono escluse.
        </P>

        <H2>Che cosa aggiunge il progetto</H2>
        <P>
          Base Arte non propone nuove attribuzioni né nuove scoperte storico-artistiche.
          Il suo contributo è nell'organizzazione e nell'esplorazione dei dati: rende navigabili
          alcuni legami che nei manuali si trovano in sezioni diverse. Questa utilità è una
          scelta di progetto, non un risultato didattico misurato.
        </P>

        <H2>Chi manca</H2>
        <P>
          Fra i {num(c.autori)} autori censiti non compare nessuna donna. Le {c.donne.length}
          donne presenti nel catalogo figurano come committenti: {c.donne.map((d) => d.name).join(", ")}.
        </P>
        <P>
          I manuali di partenza non includono artiste come Sofonisba Anguissola, Lavinia Fontana
          e Artemisia Gentileschi. Non ho ancora ampliato il corpus con altre fonti per
          documentare queste assenze e correggerle. Segnalare la lacuna non la colma, ma evita
          di confondere il perimetro delle fonti con la realtà storica.
        </P>
        <P>
          La mappa indica dove si trova oggi un'opera, non dove è stata realizzata. Rappresenta
          quindi la distribuzione attuale delle collezioni. Non va letta come una mappa dei
          luoghi di produzione.
        </P>

        <H2>Come ho usato l'intelligenza artificiale</H2>
        <P>
          Nell'estate del 2026 ho usato modelli Claude di Anthropic per organizzare alcuni dati
          già presenti, preparare prime stesure di alcune descrizioni e raccogliere informazioni
          su attribuzioni incerte.
        </P>
        <ul style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-soft)", margin: "0 0 16px 22px" }}>
          <li><b>Organizzazione dei dati.</b> Ho esaminato le schede per collegare le opere ai periodi e individuare i committenti. Nella maggior parte dei casi, il committente era già nominato nel testo della scheda.</li>
          <li><b>Prime stesure.</b> Le descrizioni di alcune scuole e di diversi committenti sono state preparate a partire dai dati del catalogo. Una formulazione plausibile non equivale a una verifica storica.</li>
          <li><b>Attribuzioni incerte.</b> Ho consultato le informazioni di istituzioni come Louvre, Musei Vaticani, Opificio delle Pietre Dure, Treccani e National Gallery. Quando il dato resta incerto, la scheda lo segnala.</li>
        </ul>

        <H2>Che cosa ho verificato</H2>
        <P>
          Ho esaminato le proposte prima di applicarle e ho usato controlli automatici per
          individuare incoerenze nei dati. Tra i problemi trovati: committenti citati ma privi
          di una scheda, mecenati classificati come autori e un errore nella data di morte di
          Cosimo I. I materiali di lavoro e le motivazioni delle scelte sono disponibili nel
          repository GitHub.
        </P>
        <P>
          Non ho ricontrollato ciascuna delle {num(c.opere)} schede confrontandola di nuovo con
          i manuali. Ho verificato la struttura e la coerenza interna del catalogo e ho
          approfondito i casi che presentavano dubbi. Questo controllo non equivale a una
          verifica completa delle fonti.
        </P>
        <P>
          Nel modello dati pubblicato, le connessioni non hanno sempre un riferimento
          bibliografico puntuale associato alla singola relazione. Perciò la presenza di un
          collegamento nel grafo non è, da sola, una prova documentaria. Consideralo un
          orientamento da verificare sulle fonti.
        </P>
        <P>
          Nel sito e nei materiali del repository consultabili non è documentata una prova
          d'uso con un gruppo di studio. Non posso quindi affermare che l'utilità didattica
          dell'interfaccia sia stata valutata con chi la usa.
        </P>

        <H2>Limiti dei modelli e del catalogo</H2>
        <P>
          I modelli linguistici possono riprodurre le gerarchie e le omissioni dei testi da cui
          apprendono. Se lavorano su un catalogo già basato su due manuali, possono ripeterne i
          limiti dando alle informazioni un'apparenza di neutralità. Rileggere aiuta a
          controllare i fatti; non basta però a individuare tutto ciò che le fonti escludono.
        </P>

        <H2>Che cosa fa il sito mentre lo consulti</H2>
        <ul style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-soft)", margin: "0 0 16px 22px" }}>
          <li><b>Non attiva modelli di intelligenza artificiale.</b> Le pagine e le schede sono già scritte; consultarle non invia richieste a un modello.</li>
          <li><b>I quiz seguono regole fisse.</b> Le domande sono composte a partire dai dati del catalogo, non generate da un modello.</li>
          <li><b>I dati personali sono descritti nella <Link to="/legal/privacy" className="tlink">Privacy Policy</Link>.</b></li>
        </ul>

        <H2>Errori e segnalazioni</H2>
        <P>
          Di quello che c'è scritto rispondo io, non gli strumenti che ho usato per scriverlo.
          Errori ce ne saranno: date sbagliate, attribuzioni discutibili, sviste. Usa il sito
          per studiare, ma se stai scrivendo qualcosa che conta vai a controllare sui manuali.
        </P>
        <P>
          Segnalare è il modo più utile per dare una mano: da ogni scheda puoi proporre una
          correzione, oppure scrivimi a <Mailto subject="Segnalazione errore nel catalogo" />.
        </P>
        </PaginaModificabile>
      </div></div>
    );
  }

  if (section === "accessibilita") {
    return (
      <div className="wrap page"><div>
        <PaginaModificabile id="accessibilita" valori={segnapostoCatalogo(c)} titolo={<H1>Accessibilità e scorciatoie</H1>}>
        <P>
          Puoi usare la maggior parte dell'atlante da tastiera. Il grafo tridimensionale è l'eccezione descritta più avanti. Le scorciatoie qui sotto valgono su
          computer; su telefono e tablet non sono attive.
        </P>
        <P>
          I numeri corrispondono a quelli accanto alle voci del menu: <b>2</b> porta ai
          Protagonisti perché nel menu quella voce è la 02. Un tasto non fa mai niente mentre
          stai scrivendo in un campo di testo.
        </P>

        {SCORCIATOIE.map((g) => (
          <div key={g.gruppo}>
            <H2>{g.gruppo}</H2>
            <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 6 }}>
              <tbody>
                {g.voci.map((v) => (
                  <tr key={v.tasti} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                    <td style={{ padding: "7px 14px 7px 0", width: 150, verticalAlign: "top" }}>
                      <kbd style={{
                        display: "inline-block", padding: "3px 8px", borderRadius: 6,
                        border: "1px solid var(--line)", borderBottomWidth: 2,
                        background: "var(--bg-1)", fontSize: 12.5, fontFamily: "inherit",
                        fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap",
                      }}>{v.tasti}</kbd>
                    </td>
                    <td style={{ padding: "7px 0", fontSize: 15, color: "var(--ink-soft)" }}>{v.cosa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <H2>Ascoltare le schede</H2>
        <P>
          Le schede delle opere, dei protagonisti e dei periodi si possono ascoltare. La funzione
          è spenta: si accende qui, e da quel momento in basso a destra compare un pulsante con
          le cuffie — il tasto <b>L</b> fa la stessa cosa. Legge il titolo, chi e quando, dove si
          trova, e poi la sintesi, la lettura dell'opera e le novità, annunciando ogni sezione;
          il paragrafo in corso si illumina appena, e la frase che si sente è scritta anche nel
          riquadro, per chi la segue con gli occhi o non può alzare il volume.
        </P>
        <InterruttoreLettura />
        <P>
          <b>Sul telefono, se non si sente nulla</b>, quasi sempre non è il sito: la voce del
          browser segue l'interruttore del silenzioso, quello sul fianco dell'iPhone. Toglilo e
          alza il volume mentre la lettura è in corso. Se anche così resta muta, chiudi e
          riapri la scheda del browser: iOS ogni tanto lascia il sintetizzatore in un vicolo
          cieco, e il sito prova a rimediare da solo ma non sempre ci riesce.
        </P>
        <P>
          La voce è quella installata sul dispositivo: <b>il testo non esce da qui</b>, non passa
          da nessun servizio e funziona anche senza rete. Il rovescio è che la qualità non
          dipende dal sito ma da quali voci hai installato — e quelle che i sistemi mettono di
          serie possono avere una qualità meno naturale.
        </P>

        <H2>Installare una voce di sintesi più naturale</H2>
        <P>
          Vale la pena farlo una volta sola: sono gratis, si scaricano dal sistema operativo e
          poi valgono per tutto — non solo per questo sito. Le voci buone si riconoscono dalla
          parola <b>migliorata</b>, <b>premium</b>, <b>naturale</b> o <b>neurale</b> nel nome.
          Dopo averle installate, ricarica la pagina: l'elenco delle voci si legge all'avvio.
        </P>
        <ul style={{ fontSize: 16, lineHeight: 1.75, color: "var(--ink-soft)", margin: "0 0 16px 22px" }}>
          <li>
            <b>iPhone e iPad</b> — Impostazioni → Accessibilità → Contenuto pronunciato → Voci →
            Italiano. Tocca una voce e poi la nuvoletta per scaricarla: quelle marcate
            «Premium» o «Migliorata» pesano qualche decina di megabyte e cambiano tutto. Le voci
            di Siri, invece, restano riservate al sistema: nessun sito può usarle.
          </li>
          <li>
            <b>Mac</b> — Impostazioni di Sistema → Accessibilità → Contenuto pronunciato → accanto
            a «Voce di sistema» apri il menu e scegli <i>Gestisci voci…</i> → Italiano. Scarica
            <i>Alice (Migliorata)</i> o una delle Premium. Le voci come Rocko, Grandma o Shelley
            sono voci di carattere per gli avvisi: qui le trovi in fondo all'elenco, sotto la
            loro etichetta.
          </li>
          <li>
            <b>Android</b> — Impostazioni → Accessibilità → Output sintesi vocale (in certe
            versioni sta sotto «Gestione generale» o «Lingua e inserimento»). Come motore scegli
            <i>Sintesi vocale di Google</i>, poi Installa dati vocali → Italiano e prendi una
            voce ad alta qualità. Chrome usa quelle.
          </li>
          <li>
            <b>Windows 11</b> — Impostazioni → Accessibilità → Assistente vocale → Aggiungi voci
            naturali: sono le migliori che Windows abbia, e una volta installate le vede anche il
            browser. Le altre stanno in Impostazioni → Ora e lingua → Voce → Gestisci voci.
            Su Edge, in più, sono disponibili delle voci di rete Microsoft, che però richiedono
            la connessione.
          </li>
          <li>
            <b>Linux</b> — la sintesi passa da <code>speech-dispatcher</code>, e la voce che
            quasi tutte le distribuzioni installano di serie è <code>espeak-ng</code>, che è
            comprensibile ma metallica. Per l'italiano si sente molto meglio <b>RHVoice</b>
            (pacchetto <code>rhvoice</code> più la voce italiana), oppure <code>festival</code>
            con le voci MBROLA. Dopo l'installazione riavvia il browser, non solo la pagina.
          </li>
        </ul>
        <P>
          Se sul tuo dispositivo non c'è nessuna voce italiana, il pannello te lo dice invece di
          leggere con l'accento sbagliato.
        </P>

        <H2>Il resto della tastiera</H2>
        <P>
          Il tasto <b>Tab</b> passa da un elemento all'altro nell'ordine in cui stanno nella
          pagina, e quello che riceve il fuoco viene evidenziato. <b>Invio</b> apre il
          collegamento o preme il tasto su cui sei.
        </P>

        <H2>Movimento ridotto</H2>
        <P>
          Se nel sistema hai chiesto di ridurre le animazioni, l'atlante lo rispetta: le
          transizioni fra le pagine e i numeri che salgono da soli restano fermi. Non c'è niente
          da impostare qui.
        </P>

        <H2>Quello che non va ancora bene</H2>
        <P>
          Il grafo tridimensionale si esplora col mouse e da tastiera non è utilizzabile. Le
          stesse informazioni — chi è legato a chi, e con quale tipo di legame — si trovano però
          nella sezione «Connessioni» in fondo a ogni scheda, che è testo normale e si legge con
          qualsiasi strumento.
        </P>
        <P>
          Le immagini delle opere hanno come testo alternativo il titolo dell'opera, che è poco:
          una descrizione vera di che cosa si vede non c'è. È un lavoro che va fatto.
        </P>
        <P>
          Se incontri una barriera che qui non è scritta, <Mailto subject="Accessibilità" /> —
          è la segnalazione più utile che puoi mandare.
        </P>
        </PaginaModificabile>
      </div></div>
    );
  }

  if (section === "privacy") {
    return (
      <div className="wrap page"><div>
        <PaginaModificabile id="privacy" valori={segnapostoCatalogo(c)} titolo={<H1>Informativa sulla privacy</H1>}>
        <P>Ultimo aggiornamento: luglio 2026.</P>
        <P>
          Base Arte ("il Servizio") è un atlante di studio di storia dell'arte
          che raccoglie opere, artisti, periodi, tecniche, luoghi e connessioni. Il Servizio è
          accessibile alla URL <code>https://basearte.it</code>.
        </P>

        <H2>1. Titolare del trattamento</H2>
        <P>
          Il titolare del trattamento dei dati è il responsabile del progetto Base Arte.
          Per qualsiasi richiesta relativa ai tuoi dati puoi scrivere a <Mailto subject="Privacy" />.
        </P>

        <H2>2. Tipi di dati trattati</H2>
        <P>Il Servizio tratta le seguenti categorie di dati personali:</P>
        <ul style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-soft)", margin: "0 0 16px 22px" }}>
          <li><b>Dati di autenticazione</b>: indirizzo email e password (hash) per l'accesso al tuo account tramite Supabase Auth.</li>
          <li><b>Dati di utilizzo locali</b>: preferiti, opere studiate, override immagini e impostazioni, salvati nel tuo browser (localStorage) e — se sei autenticato — sincronizzati sul database cloud.</li>
          <li><b>Suggerimenti</b>: eventuali suggerimenti di nuove opere o modifiche che invii tramite l'apposita sezione (visibili agli amministratori).</li>
          <li><b>Dati di traffico</b>: Netlify può registrare indirizzi IP, orari e URL richiesti per finalità di sicurezza e statistiche aggregate.</li>
        </ul>

        <H2>3. Base giuridica</H2>
        <P>
          Il trattamento dei dati si basa sul tuo consenso (art. 6 lett. a del GDPR) al momento
          della registrazione e sull'esecuzione di un contratto (art. 6 lett. b) per fornire le
          funzionalità richieste (preferiti, sincronizzazione cloud).
        </P>

        <H2>4. Conservazione</H2>
        <P>
          I dati di account e preferiti sono conservati finché il tuo account è attivo. Puoi
          richiedere la cancellazione in qualsiasi momento scrivendo a <Mailto subject="Cancellazione account" />.
        </P>

        <H2>5. Trasferimenti a terzi</H2>
        <P>
          I dati sono ospitati da Supabase (PostgreSQL europeo) per autenticazione e database,
          Netlify per il deployment del frontend, Fontshare per i font web, OpenStreetMap per le
          mappe e Wikimedia Commons per le immagini delle opere. Nessun dato personale viene venduto
          o ceduto a fini commerciali.
        </P>

        <H2>6. I tuoi diritti</H2>
        <P>
          Hai diritto di accesso, rettifica, cancellazione, portabilità e opposizione al trattamento.
          Per esercitare i tuoi diritti scrivi a <Mailto subject="Diritti GDPR" />. Hai diritto di
          proporre reclamo al Garante per la protezione dei dati personali.
        </P>

        <H2>7. Cookie</H2>
        <P>
          Per i cookie utilizzati si rinvia alla <Link to="/legal/cookie" className="tlink">Cookie Policy</Link>.
        </P>
        </PaginaModificabile>
      </div></div>
    );
  }

  if (section === "cookie") {
    return (
      <div className="wrap page"><div>
        <PaginaModificabile id="cookie" valori={segnapostoCatalogo(c)} titolo={<H1>Cookie e dati salvati nel browser</H1>}>
        <P>Ultimo aggiornamento: luglio 2026.</P>
        <P>
          Questa Cookie Policy spiega quali cookie vengono utilizzati da Base Arte — Atlante di storia dell'arte
          e come puoi gestirli. I cookie sono piccoli file di testo che il sito salva nel tuo browser
          per garantire il corretto funzionamento delle funzionalità.
        </P>

        <H2>1. Memorie tecniche del browser</H2>
        <P>
          Sono necessari per il funzionamento del Servizio e non possono essere disattivati.
          Comprendono:
        </P>
        <ul style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-soft)", margin: "0 0 16px 22px" }}>
          <li>Cookie di sessione Supabase Auth (mantenimento del login tra le pagine).</li>
          <li>localStorage per preferiti, opere studiate, override immagini, impostazioni dell'interfaccia.</li>
        </ul>

        <H2>2. Servizi esterni</H2>
        <P>Il sito carica i seguenti servizi esterni. Possono usare cookie o ricevere dati tecnici necessari alla richiesta:</P>
        <ul style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-soft)", margin: "0 0 16px 22px" }}>
          <li><b>Supabase</b> (supabase.co): autenticazione e database.</li>
          <li><b>Fontshare</b> (api.fontshare.com): font tipografici (Boska, Zodiak, General Sans).</li>
          <li><b>OpenStreetMap</b> (tile.openstreetmap.org): rendering della mappa geografica.</li>
          <li><b>Esri</b> (server.arcgisonline.com): sfondo cartografico della pagina Mappa (Light Gray Canvas).</li>
          <li><b>Wikimedia Commons</b> (upload.wikimedia.org): immagini delle opere.</li>
          <li><b>Netlify</b>: hosting statico; può usare cookie tecnici per il deploy.</li>
        </ul>

        <H2>3. Niente cookie di profilazione</H2>
        <P>
          Base Arte non utilizza cookie di profilazione, retargeting o tracciamento pubblicitario.
          Non collaboriamo con reti pubblicitarie né con piattaforme di analytics di terze parti
          (Google Analytics, Meta Pixel, ecc.).
        </P>

        <H2>4. Preferenze e dati salvati nel browser</H2>
        <P>
          La scelta espressa nel banner e alcuni dati d'uso sono salvati nel browser tramite localStorage, una memoria distinta dai cookie. Se cancelli i dati di Base Arte dalle impostazioni del browser, potresti dover accedere di nuovo e perdere preferiti non sincronizzati.
        </P>
        </PaginaModificabile>
      </div></div>
    );
  }

  if (section === "termini") {
    return (
      <div className="wrap page"><div>
        <PaginaModificabile id="termini" valori={segnapostoCatalogo(c)} titolo={<H1>Termini e condizioni</H1>}>
        <P>Ultimo aggiornamento: luglio 2026.</P>

        <H2>1. Oggetto</H2>
        <P>
          I presenti Termini regolano l'utilizzo di Base Arte — Atlante di storia dell'arte ("il Servizio"),
          un atlante di studio di Storia dell'Arte. Accedendo al Servizio accetti integralmente
          i presenti Termini.
        </P>

        <H2>2. Licenza d'uso</H2>
        <P>
          I contenuti testuali (schede, analisi, glossario) sono forniti per finalità di studio,
          didattica e ricerca. È consentita la consultazione e l'uso personale. È vietata la
          ripubblicazione dei contenuti senza autorizzazione.
        </P>

        <H2>3. Immagini delle opere</H2>
        <P>
          Le immagini delle opere provengono da Wikimedia Commons o da fonti pubbliche. Per le
          immagini provenienti da Wikimedia Commons, l'autore e la licenza sono consultabili
          cliccando sull'immagine stessa o visitando la pagina Commons originale.
        </P>

        <H2>4. Segnalazioni</H2>
        <P>
          Se sei titolare dei diritti di un'immagine e ritieni che la sua pubblicazione violi i
          tuoi diritti, scrivi a <Mailto subject="Diritti d'autore" />. L'immagine sarà rimossa
          tempestivamente.
        </P>

        <H2>5. Sostituzione delle immagini</H2>
        <P>
          Le fotografie delle opere possono essere sostituite solo dagli amministratori, e la
          sostituzione vale per tutti: entra nel catalogo. Chi trova un'immagine sbagliata può
          segnalarla dalla scheda dell'opera con "Richiedi modifica". Fino a settembre 2026
          esisteva anche una sostituzione privata, visibile al solo account che l'aveva fatta:
          non è più possibile, e quelle correzioni non vengono più applicate.
        </P>

        <H2>6. Responsabilità</H2>
        <P>
          Le schede sono scritte a scopo didattico. Ci metto attenzione, ma non posso
          garantire che non ci siano errori: se ne trovi uno, segnalalo dalla pagina Contatti.
        </P>

        <H2>7. Modifiche</H2>
        <P>
          Ci riserviamo il diritto di modificare i presenti Termini. Le modifiche saranno
          efficaci dalla pubblicazione su questa pagina.
        </P>
        </PaginaModificabile>
      </div></div>
    );
  }

  if (section === "crediti") {
    return (
      <div className="wrap page"><div>
        <PaginaModificabile id="crediti" valori={segnapostoCatalogo(c)} titolo={<H1>Crediti</H1>}
          blocchi={{ bibliografia: <Bibliografia /> }}>

        <H2>Progetto</H2>
        <P>
          Base Arte l'ho cominciato per studiare, e per un po' è servito solo a me. L'ho messo
          online quando mi sono accorto che le domande a cui rispondeva — chi ha pagato questa
          cappella, quale bottega stava dietro a questo cantiere — se le fa chiunque apra un
          manuale. Su come è costruito e su che cosa non contiene c'è una pagina a parte:{" "}
          <Link to="/legal/progetto" className="tlink">Il progetto</Link>.
        </P>

        <H2>Tecnologie</H2>
        <ul style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-soft)", margin: "0 0 16px 22px" }}>
          <li><b>React</b> + <b>Vite</b> + <b>TypeScript</b> — framework frontend</li>
          <li><b>Supabase</b> — autenticazione e database cloud (PostgreSQL)</li>
          <li><b>Three.js</b> — scena 3D della home (cattedrale)</li>
          <li><b>react-force-graph-3d</b> — grafo neuronale delle connessioni</li>
          <li><b>Leaflet</b> + <b>OpenStreetMap</b> — mappa geografica</li>
          <li><b>Framer Motion</b> — animazioni delle transizioni</li>
          <li><b>Fontshare</b> — tipografie Boska, Zodiak, General Sans</li>
          <li><b>Netlify</b> — hosting e deploy continuo</li>
          <li><b>Capacitor</b> — packaging iOS (PWA)</li>
        </ul>



        <H2>Testi di riferimento</H2>
        <P>
          Datazioni, attribuzioni, contesti: quasi tutto quello che c'è nel catalogo l'ho
          imparato da questi manuali. I numeri sono quelli dei pallini accanto al titolo delle
          opere, così ogni scheda dice da dove viene. Le schede però sono riscritte, non
          ricopiate: che il Tributo sia di Masaccio e stia al Carmine è un fatto, e i fatti non
          sono di nessuno; il modo di raccontarli sì, e quello è mio. Se un riferimento è
          incompleto o attribuito male, scrivimi a{" "}
          <Mailto subject="Correzione crediti" /> e lo sistemo.
        </P>
        <Bibliografia />

        <H2>Immagini</H2>
        <P>
          {num(c.conImmagine)} opere su {num(c.opere)} hanno un'immagine, e vengono quasi tutte
          da <b>Wikimedia Commons</b> o dai siti dei musei. Sotto ognuna c'è scritto da dove
          arriva: il nome lo ricava il sito dall'indirizzo dell'immagine, e porta alla pagina
          d'origine dove stanno autore e licenza. Non è un archivio fotografico — sono
          riproduzioni buone per riconoscere un'opera e studiarla, non per giudicarne il
          colore. Per quello servono le riproduzioni scientifiche dei musei.
        </P>

        <H2>Codice</H2>
        <P>
          Licenza MIT: si può leggere, correggere, copiare, e farne una versione propria anche
          per un'altra materia — la struttura non ha niente di specificamente artistico. Il
          repository sta su{" "}
          <a href="https://github.com/ATgio99/Hub-Arte" target="_blank" rel="noopener noreferrer" className="tlink">GitHub</a>,
          insieme ai materiali di lavoro: le proposte di attribuzione una per una, il perché di
          ogni scelta, i controlli che ho fatto e quelli che non ho fatto.
        </P>

        <H2>Contatti</H2>
        <P>
          Per qualsiasi cosa: <Mailto />, oppure la pagina{" "}
          <Link to="/legal/contatti" className="tlink">Contatti</Link>.
        </P>
        </PaginaModificabile>
      </div></div>
    );
  }

  if (section === "contatti") {
    return (
      <div className="wrap page"><div>
        <PaginaModificabile id="contatti" valori={segnapostoCatalogo(c)} titolo={<H1>Contatti</H1>}>
        <P>
          Scrivimi a <Mailto />. Rispondo io, quindi ci può volere qualche giorno.
        </P>

        <H2>Argomenti</H2>
        <ul style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-soft)", margin: "0 0 16px 22px" }}>
          <li><b>Errori nel catalogo</b>: una data sbagliata, un autore attribuito male, un luogo impreciso.</li>
          <li><b>Diritti d'autore</b>: rimozione di un'immagine, rivendicazione di diritti.</li>
          <li><b>Proposte</b>: un'opera che manca, una funzione che servirebbe, qualcosa che nell'interfaccia non torna.</li>
          <li><b>Malfunzionamenti</b>: pagine che non caricano, problemi su un dispositivo particolare.</li>
        </ul>

        <H2>Se un'immagine è tua</H2>
        <P>
          Scrivimi con oggetto «Copyright», dicendomi di quale opera e quale immagine si
          tratta e su cosa vanti i diritti. Rispondo entro sette giorni e, se serve, la tolgo.
        </P>

        <H2>Cancellare l'account</H2>
        <P>
          Mandami una email dall'indirizzo con cui ti sei registrato, oggetto «Cancellazione
          account». Cancello l'account e tutto quello che ci sta attaccato.
        </P>

        <H2>Hosting e infrastruttura</H2>
        <P>
          Il sito è ospitato da{" "}
          <a href="https://www.netlify.com" target="_blank" rel="noopener noreferrer" className="tlink">Netlify</a>{" "}
          tramite il loro{" "}
          <a href="https://www.netlify.com/open-source" target="_blank" rel="noopener noreferrer" className="tlink">Open Source Plan</a>{" "}
          per i progetti open source. Account, database e sincronizzazione stanno su{" "}
          <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="tlink">Supabase</a>.
          Il codice è pubblico su GitHub, licenza MIT.
        </P>

        <div style={{ marginTop: 26 }}><BannerGitHub /></div>
        </PaginaModificabile>
      </div></div>
    );
  }

  // sezione non riconosciuta → redirect alla home
  nav("/");
  return null;
}

// Un interruttore, non una pagina di impostazioni: la funzione è una sola e
// chi la vuole spegnere la trova dove è spiegata.
function InterruttoreLettura() {
  const [attiva, setAttiva] = useState(letturaAttiva());
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 10, margin: "6px 0 18px",
      padding: "10px 14px", border: "1px solid var(--line)", borderRadius: 10,
      background: "var(--bg-1)", cursor: "pointer", maxWidth: "56ch",
    }}>
      <input
        type="checkbox"
        checked={attiva}
        onChange={(e) => { accendiLettura(e.target.checked); setAttiva(e.target.checked); }}
        data-testid="interruttore-lettura"
      />
      <span style={{ fontSize: 15, color: "var(--ink-soft)" }}>
        <b>Attiva l'ascolto ad alta voce</b> — aggiunge il pulsante con le cuffie sulle schede
      </span>
    </label>
  );
}
