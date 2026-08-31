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
        <PaginaModificabile id="progetto" valori={segnapostoCatalogo(c)} titolo={<H1>Il progetto, i suoi limiti, e come è stato costruito</H1>}>
        <P>Ultimo aggiornamento: agosto 2026.</P>

        <H2>Che cos'è</H2>
        <P>
          HUB Arte è un atlante di storia dell'arte pensato come strumento di studio. Prova a
          rendere visibile ciò che un elenco di schede non mostra: come le opere si richiamano
          fra loro, chi ha imparato da chi, quali città e quali corti hanno reso possibile un
          certo modo di dipingere o di costruire, e chi ha pagato perché accadesse.
        </P>
        <P>
          Per questo il catalogo è organizzato per relazioni: i periodi si contengono l'un
          l'altro dall'epoca alla singola bottega; ogni opera è legata a chi l'ha eseguita e,
          dove documentato, a chi l'ha commissionata; la linea del tempo, la mappa e il grafo
          sono tre modi di interrogare lo stesso materiale. È gratuito, senza pubblicità e
          open source con licenza MIT.
        </P>

        <H2>Che cosa contiene, e che cosa non contiene</H2>
        <P>
          Il catalogo raccoglie {num(c.opere)} opere, {num(c.protagonisti)} schede fra autori e
          committenti, {num(c.periodi)} periodi, {num(c.termini)} termini di glossario. Questi
          numeri non sono un merito: sono il risultato di una selezione, e ogni selezione esclude.
        </P>
        <P>
          Il nucleo dei contenuti nasce da un manuale universitario italiano di storia
          dell'arte e ne eredita il perimetro: <b>l'arco cronologico va dalla Tarda Antichità
          al Barocco</b> (284–1750 circa) e l'orizzonte geografico è europeo, con una netta
          prevalenza italiana. Non è un atlante di storia dell'arte: è l'atlante di un
          programma di studio.
        </P>
        <P>
          Il limite più evidente riguarda chi il catalogo lascia fuori. <b>Fra i {num(c.autori)} autori
          censiti non compare alcuna artista donna.</b> Le sole donne presenti — {c.donne.length} — sono
          committenti: {c.donne.map((d) => d.name).join(", ")}. Questa assenza riproduce quella dei
          manuali da cui il catalogo deriva; registrarla qui non la corregge, ma è il primo
          passo per non spacciarla per neutralità. Colmarla richiede un lavoro di ricerca che
          il progetto non ha ancora fatto.
        </P>

        <P>
          Un secondo limite riguarda la geografia: il luogo registrato per ogni opera è
          <b>dove l'opera si trova oggi</b>, non dove è stata prodotta. La mappa descrive
          quindi la geografia della conservazione, ed è la ragione per cui Londra, New York e
          Washington vi compaiono con un peso che nulla dice sui luoghi di produzione.
        </P>

        <H2>Come è stato costruito, e dove ha lavorato l'intelligenza artificiale</H2>
        <P>
          Una parte del lavoro è stata svolta con l'assistenza di modelli linguistici di
          grandi dimensioni (famiglia Claude di Anthropic, agosto 2026). Dichiararlo in modo
          preciso è parte del metodo, non una formalità.
        </P>
        <P>Dove sono stati usati, e come:</P>
        <ul style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-soft)", margin: "0 0 16px 22px" }}>
          <li>
            <b>Riordino di dati già esistenti.</b> L'assegnazione delle opere ai periodi e
            l'individuazione dei committenti sono state ottenute esaminando le schede una per
            una: nella maggior parte dei casi il dato era <i>già scritto</i> nel testo della
            scheda e andava estratto e reso strutturato, non inventato. Questa è la parte in
            cui il modello ha lavorato come acceleratore su materiale esistente.
          </li>
          <li>
            <b>Redazione di testi in bozza.</b> Le schede descrittive di alcune scuole e di
            gran parte dei committenti sono state scritte in prima stesura da un modello, a
            partire dai dati del catalogo. Qui non si riordina: si produce prosa
            interpretativa, ed è la parte che richiede più cautela.
          </li>
          <li>
            <b>Verifica delle attribuzioni dubbie.</b> I casi incerti sono stati sciolti
            consultando fonti museali e bibliografiche (Louvre, Musei Vaticani, Opificio delle
            Pietre Dure, Treccani, National Gallery). Dove la fonte dichiara di non sapere, il
            campo è rimasto vuoto: su 42 casi esaminati, 13 restano aperti.
          </li>
        </ul>

        <H2>Che cosa significa, qui, "revisione umana"</H2>
        <P>
          È il punto in cui è facile essere generici, quindi conviene essere precisi su ciò
          che è stato fatto e su ciò che non lo è stato.
        </P>
        <P>
          Ogni proposta è stata prodotta come <i>elenco da approvare</i>, mai scritta
          direttamente nel catalogo: le assegnazioni sono state esaminate e autorizzate voce
          per voce prima di essere applicate, e le motivazioni di ciascuna sono conservate nel
          repository pubblico. Sono stati inoltre eseguiti controlli sistematici di coerenza:
          nessun riferimento a entità inesistenti, nessuna incoerenza nella gerarchia dei
          periodi, date compatibili fra committente e opera.
        </P>
        <P>
          Quello che <b>non</b> è stato fatto è una verifica bibliografica indipendente di
          ciascuna delle {num(c.opere)} schede. La revisione ha riguardato la struttura, la coerenza
          interna e la plausibilità storica, con approfondimento sulle sole attribuzioni
          segnalate come dubbie. È una revisione reale, ma parziale, e va letta per quello che è.
        </P>

        <H2>Il limite che riguarda i modelli, e non i dati</H2>
        <P>
          Un modello linguistico non sbaglia soltanto le date. Restituisce lo sguardo
          prevalente nei testi su cui è stato addestrato: tende quindi a riprodurre il canone
          storiografico dominante, le sue gerarchie e le sue formule, e a rendere ancora meno
          visibile ciò che è già ai margini. Applicato a un catalogo che eredita il perimetro
          di un manuale, <b>rischia di funzionare come un amplificatore di quel canone</b>.
        </P>
        <P>
          Ne consegue che la revisione umana non ha soltanto una funzione di controllo dei
          fatti, ma di correzione di prospettiva — ed è la parte del lavoro più difficile da
          garantire, perché ciò che manca non segnala la propria assenza.
        </P>

        <H2>Dove l'intelligenza artificiale non c'entra</H2>
        <ul style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-soft)", margin: "0 0 16px 22px" }}>
          <li><b>Mentre consulti il sito non gira alcun modello.</b> Le pagine sono file già scritti: navigare, cercare, aprire una scheda non invia nulla a un servizio di intelligenza artificiale.</li>
          <li><b>I quiz non sono generati da un modello</b>, ma da un programma che pesca dal catalogo secondo regole fisse. Se una domanda è imprecisa, l'errore è nel dato.</li>
          <li><b>Quello che fai non addestra nulla.</b> Preferiti, opere approfondite e risultati dei quiz restano tuoi: vedi la <Link to="/legal/privacy" className="tlink">Privacy Policy</Link>.</li>
        </ul>

        <H2>Responsabilità e segnalazioni</H2>
        <P>
          La responsabilità scientifica di quanto è pubblicato è di chi cura il progetto, non
          degli strumenti impiegati per costruirlo. Il catalogo contiene certamente errori:
          date imprecise, attribuzioni discutibili, sviste. È uno strumento di studio, non una
          fonte da citare in un lavoro accademico — verifica sui manuali e sulle fonti quando
          la cosa conta.
        </P>
        <P>
          Le segnalazioni sono il modo più utile per contribuire: da ogni scheda puoi proporre
          una correzione, oppure scrivere a <Mailto subject="Segnalazione errore nel catalogo" />.
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
          Le schede delle opere sono redatte a scopo didattico. Pur impegnandoci per
          l'accuratezza dei dati, non garantiamo l'assenza di errori. Le segnalazioni sono
          benvenute: vedi la sezione Contatti.
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
          HUB Arte — Atlante Neuronale è un atlante interattivo di Storia dell'Arte pensato per
          studenti, docenti e appassionati. Combina grafo neuronale, timeline multilivello, mappa
          geografica, schede opere e glossario in un'unica interfaccia.
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
          Le informazioni del catalogo — opere, datazioni, attribuzioni, contesti — derivano dallo
          studio dei seguenti manuali. I testi delle schede sono rielaborazioni, non riproduzioni:
          i dati di fatto (autore, data, luogo, tecnica) non sono materia coperta da diritto
          d'autore, mentre la formulazione è originale.
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
          Se un riferimento risulta incompleto o attribuito in modo impreciso, segnalalo a <Mailto subject="Correzione crediti" />:
          viene corretto.
        </P>

        <H2>Immagini</H2>
        <P>
          Le immagini delle opere provengono in larga parte da <b>Wikimedia Commons</b> e da fonti
          pubbliche istituzionali. Sotto ogni immagine il sito indica il sito di provenienza, ricavato
          automaticamente dal suo indirizzo e collegato alla pagina di origine, dove si trovano
          autore e licenza. Le riproduzioni hanno scopo di studio e non sostituiscono riproduzioni
          scientifiche verificate.
        </P>

        <H2>Codice</H2>
        <P>
          Il progetto è open source con licenza MIT: chiunque può leggerne il codice, segnalare
          errori, proporre correzioni o farne una versione propria. Il repository è su{" "}
          <a href="https://github.com/ATgio99/Hub-Arte" target="_blank" rel="noopener noreferrer" className="tlink">GitHub</a>,
          dove sono pubblici anche i materiali di lavoro sul catalogo: le proposte di attribuzione,
          le motivazioni di ogni scelta e i controlli effettuati.
        </P>

        <H2>Contatti</H2>
        <P>
          Per segnalazioni, suggerimenti, richieste di collaborazione o problemi tecnici, scrivi a{" "}
          <Mailto /> oppure visita la pagina <Link to="/legal/contatti" className="tlink">Contatti</Link>.
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
          Per qualsiasi comunicazione relativa a HUB Arte — Atlante Neuronale, puoi scrivere
          all'indirizzo <Mailto />.
        </P>

        <H2>Argomenti</H2>
        <ul style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-soft)", margin: "0 0 16px 22px" }}>
          <li><b>Segnalazioni errori</b>: datazioni sbagliate, autori errati, luoghi imprecisi — le segnalazioni sono benvenute e ci aiutano a migliorare l'atlante.</li>
          <li><b>Diritti d'autore</b>: per richieste di rimozione immagini o rivendicazione di diritti.</li>
          <li><b>Suggerimenti</b>: proposte di nuove opere da inserire, nuove funzionalità, miglioramenti dell'interfaccia.</li>
          <li><b>Bug</b>: malfunzionamenti dell'app, errori di caricamento, problemi su dispositivi specifici.</li>
        </ul>

        <H2>Segnalazione errori</H2>
        <P>
          Se trovi un errore in una scheda opera (datazione sbagliata, autore errato, luogo
          impreciso), scrivici indicando l'opera e il problema. Le segnalazioni sono benvenute.
        </P>

        <H2>Segnalazione violazione copyright</H2>
        <P>
          Per segnalare l'uso improprio di un'immagine: invia una email con oggetto "Copyright"
          specificando l'opera, l'immagine e i tuoi diritti. Risponderemo entro 7 giorni.
        </P>

        <H2>Richiesta cancellazione account</H2>
        <P>
          Per richiedere la cancellazione del tuo account e di tutti i dati associati (GDPR,
          diritto all'oblio): invia una email dal tuo indirizzo registrato con oggetto
          "Cancellazione account".
        </P>

        <H2>Hosting e infrastruttura</H2>
        <P>
          Questo sito è generosamente ospitato da{" "}
          <a href="https://www.netlify.com" target="_blank" rel="noopener noreferrer" className="tlink">Netlify</a>{" "}
          tramite il loro{" "}
          <a href="https://www.netlify.com/open-source" target="_blank" rel="noopener noreferrer" className="tlink">Open Source Plan</a>{" "}
          per progetti open source. Il backend (autenticazione, database, realtime) è gestito da{" "}
          <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="tlink">Supabase</a>.
          Il codice sorgente del progetto è pubblico su GitHub sotto licenza MIT.
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
