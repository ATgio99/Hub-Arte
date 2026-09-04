// ============================================================================
// Pagine informative: Progetto, Privacy, Cookie, Termini, Crediti, Contatti.
// Rotte: /legal/progetto, /legal/privacy, /legal/cookie, /legal/termini,
//        /legal/crediti, /legal/contatti, /legal/accessibilita
// ============================================================================
import { useParams, Link, useNavigate } from "react-router-dom";
import { CONTACT_EMAIL } from "../lib/auth";
import PaginaModificabile from "../components/PaginaModificabile";
import Bibliografia from "../components/Bibliografia";
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
        <PaginaModificabile id="progetto" valori={segnapostoCatalogo(c)} titolo={<H1>Il progetto, e come è stato costruito</H1>}>
        <P>Ultimo aggiornamento: agosto 2026.</P>

        <H2>Perché l'ho fatto</H2>
        <P>
          Studiando storia dell'arte mi capitava sempre la stessa cosa: sapevo le singole opere
          e non vedevo cosa le tenesse insieme. Che Masaccio e Masolino avessero dipinto nella
          stessa cappella lo sapevo; che a pagarla fosse stato un mercante di seta che si
          chiamava Felice Brancacci, no. Sui manuali c'è, ma tre capitoli più in là.
        </P>
        <P>
          Da qui l'idea di un catalogo tenuto insieme dalle relazioni invece che dall'ordine
          delle pagine. I periodi si contengono l'uno dentro l'altro su tre livelli — {num(c.epoche)} epoche, {num(c.correnti)} correnti, {num(c.scuole)} fra scuole e botteghe —
          e un'opera sta nel più stretto che la contiene: non nel «Quattrocento», ma nella
          bottega di Giotto o nel cantiere di Santa Maria del Fiore. Ogni opera è legata a chi
          l'ha eseguita e, dove risulta, a chi l'ha pagata. La linea del tempo, la mappa e il
          grafo interrogano lo stesso materiale in tre modi diversi.
        </P>
        <P>
          È gratuito, non ha pubblicità, non chiede di registrarsi per leggere, e il codice è
          pubblico con licenza MIT.
        </P>

        <H2>Da dove vengono i dati</H2>
        <P>
          {num(c.opere)} opere, {num(c.protagonisti)} schede fra autori e committenti,
          {" "}{num(c.periodi)} periodi, {num(c.termini)} voci di glossario,
          {" "}{num(c.connessioni)} legami documentati fra le une e gli altri.
        </P>
        <P>
          Il grosso l'ho ricavato da due manuali di storia dell'arte, e il catalogo ne eredita
          i confini: dalla Tarda Antichità al Barocco, e un'Europa in cui l'Italia pesa più di
          tutto il resto messo insieme — Firenze da sola vale 185 opere, quante Parigi, Londra,
          Madrid, Vienna e Berlino sommate. Non è un panorama dell'arte. È il perimetro di un
          programma di studio, con i buchi che quel perimetro si porta dietro: niente arte
          islamica se non di sponda, niente Asia, niente Africa, niente America precolombiana.
        </P>

        <H2>Chi manca</H2>
        <P>
          Fra i {num(c.autori)} autori censiti <b>non c'è nemmeno una donna</b>. Le uniche
          donne nel catalogo — {c.donne.length} — compaiono come committenti:{" "}
          {c.donne.map((d) => d.name).join(", ")}.
        </P>
        <P>
          Non è una mia dimenticanza, ed è peggio così: i manuali da cui ho lavorato le artiste
          non le nominano, e io ho ricopiato quel silenzio senza accorgermene finché non ho
          contato. Anguissola, Fontana, Gentileschi non ci sono perché non c'erano nel libro.
          Scriverlo qui non lo risolve — serve solo a non far passare l'assenza per un dato di
          realtà. Rimediare vuol dire aprire altre fonti e rifare il lavoro, e non l'ho fatto.
        </P>
        <P>
          C'è poi una cosa da sapere sulla mappa. Il luogo di ogni scheda è{" "}
          <b>dove l'opera si trova adesso</b>, non dove è stata fatta. Quaranta opere risultano
          a Londra e quindici a New York: nessuna delle due città le ha prodotte. Quella è la
          geografia dei musei, e in trasparenza la storia di come ci sono finite.
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
            Gallery. Quando neanche il museo si sbilancia, il campo è rimasto vuoto: su 42 casi
            esaminati, 13 sono ancora aperti, e nelle schede si vede che lo sono.
          </li>
        </ul>

        <H2>Che cosa ho controllato davvero</H2>
        <P>
          Nessuna proposta è finita dritta nel catalogo. Il lavoro usciva ogni volta come un
          elenco da approvare, e l'ho letto voce per voce prima di applicarlo; le motivazioni
          di ogni scelta sono nel repository, chiunque può andarsele a vedere. Poi ho fatto
          girare dei controlli automatici, che hanno pescato cose che a occhio non avevo visto:
          venti committenti citati da qualche opera ma senza una scheda propria, cinque
          mecenati finiti per sbaglio fra gli autori delle opere che avevano pagato, un Cosimo
          I con la data di morte sbagliata di trentasette anni.
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

  if (section === "accessibilita") {
    return (
      <div className="wrap page"><div>
        <PaginaModificabile id="accessibilita" valori={segnapostoCatalogo(c)} titolo={<H1>Accessibilità e scorciatoie</H1>}>
        <P>
          L'atlante si può usare interamente da tastiera. Le scorciatoie qui sotto valgono su
          computer; su telefono e tablet non sono attive.
        </P>
        <P>
          I numeri sono gli stessi che vedi accanto a ogni voce del menu: <b>2</b> porta ai
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
        <PaginaModificabile id="crediti" valori={segnapostoCatalogo(c)} titolo={<H1>Crediti</H1>}>

        <H2>Progetto</H2>
        <P>
          HUB Arte l'ho cominciato per studiare, e per un po' è servito solo a me. L'ho messo
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
          imparato dai manuali elencati qui sotto in bibliografia. Le schede però sono
          riscritte, non ricopiate. Che il Tributo sia di Masaccio e stia al Carmine è un
          fatto, e i fatti non sono di nessuno; il modo di raccontarli sì, e quello è mio. Se
          qualcuno degli editori ritiene che da qualche parte abbia passato il segno, mi
          scriva e correggo. Se un riferimento è incompleto o attribuito male, scrivimi a{" "}
          <Mailto subject="Correzione crediti" /> e lo sistemo.
        </P>

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

        {/* Fuori dal blocco riscrivibile: l'elenco si genera dalla tabella
            delle fonti, e un testo personalizzato non deve poterlo nascondere. */}
        <Bibliografia />
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
