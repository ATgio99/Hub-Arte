// ============================================================================
// Pagine informative: Progetto, Privacy, Cookie, Termini, Crediti, Contatti.
// Rotte: /legal/progetto, /legal/privacy, /legal/cookie, /legal/termini,
//        /legal/crediti, /legal/contatti
// ============================================================================
import { useParams, Link, useNavigate } from "react-router-dom";
import { CONTACT_EMAIL } from "../lib/auth";
import PaginaModificabile from "../components/PaginaModificabile";
import { BannerGitHub } from "../components/ui";
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
    termini: ix.ds.terms.length,
    tecniche: ix.ds.techniques.length,
    connessioni: ix.ds.connections.length,
    donne,
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
    termini: num(c.termini),
    tecniche: num(c.tecniche),
    connessioni: num(c.connessioni),
    donne: String(c.donne.length),
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
        <PaginaModificabile id="progetto" valori={segnapostoCatalogo(c)} titolo={<H1>Il progetto, e come è stato costruito</H1>}>
        <P>Ultimo aggiornamento: agosto 2026.</P>

        <H2>Perché l'ho fatto</H2>
        <P>
          Studiando storia dell'arte mi capitava sempre la stessa cosa: sapevo le singole
          opere e non vedevo cosa le tenesse insieme. Chi aveva imparato da chi, quali città
          contavano in un certo momento, chi tirava fuori i soldi perché una cappella venisse
          affrescata. Sui manuali c'è tutto, ma sparso su duecento pagine.
        </P>
        <P>
          HUB Arte prova a tenere insieme quelle cose. I periodi si contengono l'uno dentro
          l'altro, dall'epoca fino alla singola bottega; ogni opera è legata a chi l'ha fatta
          e, quando si sa, a chi l'ha pagata; la linea del tempo, la mappa e il grafo sono tre
          modi di guardare lo stesso materiale. Il sito è gratuito, senza pubblicità, e il
          codice è pubblico con licenza MIT.
        </P>

        <H2>Da dove vengono i dati</H2>
        <P>
          Ci sono {num(c.opere)} opere, {num(c.protagonisti)} schede fra autori e committenti,
          {" "}{num(c.periodi)} periodi, {num(c.termini)} voci di glossario.
        </P>
        <P>
          Il grosso viene da due manuali di storia dell'arte, e il catalogo ne eredita i
          confini: si va dalla Tarda Antichità al Barocco, più o meno dal 284 al 1750, e la
          geografia è europea con una grossa prevalenza italiana. Non aspettarti quindi un
          panorama completo dell'arte. Questo è il perimetro di un programma scolastico, con
          i buchi che quel perimetro si porta dietro.
        </P>

        <H2>Chi manca</H2>
        <P>
          Fra i {num(c.autori)} autori censiti <b>non c'è nemmeno una donna</b>. Le uniche
          donne nel catalogo — {c.donne.length} — compaiono come committenti:{" "}
          {c.donne.map((d) => d.name).join(", ")}.
        </P>
        <P>
          Non è una mia dimenticanza. I manuali da cui ho lavorato le artiste non le nominano,
          e io ho ricopiato quel silenzio. Scriverlo qui non lo risolve: serve a non far
          passare l'assenza per un dato di realtà. Per rimediare servirebbe una ricerca che
          finora non ho fatto.
        </P>
        <P>
          C'è poi una cosa da sapere sulla mappa. Il luogo che trovi in ogni scheda è{" "}
          <b>dove l'opera si trova adesso</b>, non dove è stata prodotta. Per questo Londra,
          New York e Washington pesano tanto: quella è la geografia dei musei, non quella dei
          cantieri.
        </P>

        <H2>Dove ho usato l'intelligenza artificiale</H2>
        <P>
          In diversi punti, e mi sembra giusto dire quali. Ho lavorato con i modelli Claude di
          Anthropic, nell'estate del 2026.
        </P>
        <ul style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-soft)", margin: "0 0 16px 22px" }}>
          <li>
            <b>Riordinare dati che c'erano già.</b> Assegnare le opere ai periodi giusti e
            trovare i committenti ha voluto dire passare le schede una per una. Quasi sempre
            il nome del committente era già scritto nel testo della scheda («fu commissionata
            da…»): andava tirato fuori e messo in un campo, non inventato.
          </li>
          <li>
            <b>Buttare giù le prime stesure.</b> Le descrizioni di alcune scuole e di buona
            parte dei committenti nascono da un modello, a partire dai dati del catalogo. Qui
            non si riordina niente, si scrive: è la parte di cui mi fido meno.
          </li>
          <li>
            <b>Sciogliere i dubbi.</b> Per le attribuzioni incerte ho fatto controllare le
            fonti — Louvre, Musei Vaticani, Opificio delle Pietre Dure, Treccani, National
            Gallery. Quando neanche il museo si sbilancia, il campo è rimasto vuoto: su 42
            casi, 13 sono ancora aperti.
          </li>
        </ul>

        <H2>Che cosa ho controllato davvero</H2>
        <P>
          Nessuna proposta è finita dritta nel catalogo. Il lavoro usciva ogni volta come un
          elenco da approvare, e l'ho letto voce per voce prima di applicarlo; le motivazioni
          di ogni scelta sono nel repository, chiunque può andarsele a vedere. Ho fatto girare
          anche dei controlli automatici: niente rimandi a schede inesistenti, niente periodi
          appesi male, date del committente compatibili con quelle dell'opera.
        </P>
        <P>
          Quello che <b>non</b> ho fatto è riaprire i manuali per ciascuna delle{" "}
          {num(c.opere)} schede. Ho guardato la struttura, la coerenza interna, se una cosa
          stesse in piedi storicamente, e sono andato a fondo solo dove qualcosa non tornava.
        </P>

        <H2>Un problema che riguarda i modelli</H2>
        <P>
          Un modello linguistico non sbaglia solo le date. Restituisce lo sguardo dei testi su
          cui è stato addestrato, quindi ripete il canone che quei testi danno per scontato e
          lascia ai margini quello che ai margini c'era già. Su un catalogo che parte da due
          manuali il rischio è di ritrovarsi gli stessi silenzi, con in più l'aria di essere
          neutrali. Rileggere serve a controllare i fatti, ma soprattutto a stare attenti a
          questo — che è la parte difficile, perché quello che manca non ti avvisa.
        </P>

        <H2>Quello che il sito non fa</H2>
        <ul style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-soft)", margin: "0 0 16px 22px" }}>
          <li><b>Mentre lo consulti non gira nessun modello.</b> Le pagine sono file già scritti: cercare, aprire una scheda, spostarsi da una sezione all'altra non manda niente a un servizio di intelligenza artificiale.</li>
          <li><b>I quiz non li scrive un modello.</b> Li costruisce un programma che pesca dal catalogo con regole fisse. Se una domanda è sbagliata, è sbagliato il dato.</li>
          <li><b>Quello che fai qui non addestra niente.</b> Preferiti, opere approfondite e risultati dei quiz restano tuoi: vedi la <Link to="/legal/privacy" className="tlink">Privacy Policy</Link>.</li>
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

  if (section === "privacy") {
    return (
      <div className="wrap page"><div>
        <PaginaModificabile id="privacy" valori={segnapostoCatalogo(c)} titolo={<H1>Privacy Policy</H1>}>
        <P>Ultimo aggiornamento: luglio 2026.</P>
        <P>
          HUB Arte — Atlante Neuronale ("il Servizio") è un atlante di studio di Storia dell'Arte
          che raccoglie opere, artisti, periodi, tecniche, luoghi e connessioni. Il Servizio è
          accessibile alla URL <code>https://hubarte.it</code>.
        </P>

        <H2>1. Titolare del trattamento</H2>
        <P>
          Il titolare del trattamento dei dati è il responsabile del progetto HUB Arte.
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
        <PaginaModificabile id="cookie" valori={segnapostoCatalogo(c)} titolo={<H1>Cookie Policy</H1>}>
        <P>Ultimo aggiornamento: luglio 2026.</P>
        <P>
          Questa Cookie Policy spiega quali cookie vengono utilizzati da HUB Arte — Atlante Neuronale
          e come puoi gestirli. I cookie sono piccoli file di testo che il sito salva nel tuo browser
          per garantire il corretto funzionamento delle funzionalità.
        </P>

        <H2>1. Cookie tecnici (sempre attivi)</H2>
        <P>
          Sono necessari per il funzionamento del Servizio e non possono essere disattivati.
          Comprendono:
        </P>
        <ul style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-soft)", margin: "0 0 16px 22px" }}>
          <li>Cookie di sessione Supabase Auth (mantenimento del login tra le pagine).</li>
          <li>localStorage per preferiti, opere studiate, override immagini, impostazioni dell'interfaccia.</li>
        </ul>

        <H2>2. Cookie di terze parti</H2>
        <P>Il Servizio interagisce con i seguenti domini di terze parti, che possono impostare cookie:</P>
        <ul style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-soft)", margin: "0 0 16px 22px" }}>
          <li><b>Supabase</b> (supabase.co): autenticazione e database.</li>
          <li><b>Fontshare</b> (api.fontshare.com): font tipografici (Boska, Zodiak, General Sans).</li>
          <li><b>OpenStreetMap</b> (tile.openstreetmap.org): rendering della mappa geografica.</li>
          <li><b>Wikimedia Commons</b> (upload.wikimedia.org): immagini delle opere.</li>
          <li><b>Netlify</b>: hosting statico; può usare cookie tecnici per il deploy.</li>
        </ul>

        <H2>3. Niente cookie di profilazione</H2>
        <P>
          HUB Arte non utilizza cookie di profilazione, retargeting o tracciamento pubblicitario.
          Non collaboriamo con reti pubblicitarie né con piattaforme di analytics di terze parti
          (Google Analytics, Meta Pixel, ecc.).
        </P>

        <H2>4. Gestione dei cookie</H2>
        <P>
          Puoi sempre bloccare i cookie dalle impostazioni del tuo browser, ma alcune funzionalità
          (login, sincronizzazione preferiti) potrebbero non funzionare correttamente. La scelta
          espressa nel banner iniziale è conservata nel <code>localStorage</code> sotto la chiave
          <code> atlante.cookie.choice</code> e può essere modificata cancellando tale voce.
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
          I presenti Termini regolano l'utilizzo di HUB Arte — Atlante Neuronale ("il Servizio"),
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

        <H2>5. Immagini personalizzate dagli utenti</H2>
        <P>
          Gli utenti autenticati possono sostituire temporaneamente le immagini delle opere con
          URL personalizzati (funzione "Cambia immagine"). Queste modifiche sono locali al
          browser dell'utente e, se sincronizzate, sono visibili solo al proprio account.
          L'utente è responsabile delle immagini caricate e deve rispettare i diritti d'autore.
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
        <PaginaModificabile id="crediti" valori={segnapostoCatalogo(c)} titolo={<H1>Crediti</H1>}>

        <H2>Progetto</H2>
        <P>
          HUB Arte nasce come strumento di studio, per me prima che per chiunque altro. Poi è
          diventato un sito aperto a chi studia storia dell'arte, a chi la insegna e a chi
          semplicemente ci gira dentro per curiosità. Su come è stato costruito, e con quali
          limiti, c'è una pagina apposta:{" "}
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
          imparato da questi due manuali. Le schede però sono riscritte, non ricopiate. Un
          autore, una data, un luogo, una tecnica sono fatti, e i fatti non appartengono a
          nessuno; il modo di raccontarli sì, ed è mio.
        </P>
        <ul style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-soft)", margin: "0 0 16px 22px" }}>
          <li>
            G. Dorfles, A. Vettese, E. Princi, <i>Civiltà d'arte</i>, Atlas, Bergamo — vol. 3.
          </li>
          <li>
            E. Demartini, C. Gatti, E. Tonetti, E. P. Villa, <i>Con gli occhi dell'arte</i>,
            Rizzoli Education (Mondadori Education), Milano 2022 — voll. 2, 3, 4.
          </li>
        </ul>
        <P>
          Se un riferimento è incompleto o attribuito male, scrivimi a{" "}
          <Mailto subject="Correzione crediti" /> e lo sistemo.
        </P>

        <H2>Immagini</H2>
        <P>
          Le immagini vengono quasi tutte da <b>Wikimedia Commons</b> e da siti di musei e
          istituzioni. Sotto ognuna trovi il nome del sito da cui arriva, ricavato dal suo
          indirizzo e collegato alla pagina d'origine, dove ci sono autore e licenza. Sono
          riproduzioni buone per studiare, non per lavorarci sopra: per quello servono le
          riproduzioni scientifiche dei musei.
        </P>

        <H2>Codice</H2>
        <P>
          Licenza MIT: il codice si può leggere, correggere, copiare e usare per farne una
          propria versione. Il repository sta su{" "}
          <a href="https://github.com/ATgio99/Hub-Arte" target="_blank" rel="noopener noreferrer" className="tlink">GitHub</a>,
          insieme ai materiali di lavoro sul catalogo — le proposte di attribuzione, il perché
          di ogni scelta, i controlli che ho fatto.
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
