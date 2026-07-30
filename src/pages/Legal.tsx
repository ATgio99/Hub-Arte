// ============================================================================
// Pagine legali: Privacy, Cookie, Termini, Crediti, Contatti.
// Rotte: /legal/privacy, /legal/cookie, /legal/termini, /legal/crediti, /legal/contatti
// ============================================================================
import { useParams, Link, useNavigate } from "react-router-dom";
import { CONTACT_EMAIL } from "../lib/auth";

function BackButton() {
  const nav = useNavigate();
  return (
    <button className="btn ghost sm" onClick={() => nav(-1)} style={{ marginBottom: 22 }} data-testid="legal-back">
      ← Indietro
    </button>
  );
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
  const nav = useNavigate();

  if (section === "privacy") {
    return (
      <div className="wrap page" style={{ maxWidth: 760 }}>
        <BackButton />
        <H1>Privacy Policy</H1>
        <P>Ultimo aggiornamento: luglio 2026.</P>
        <P>
          HUB Art — Atlante Neuronale ("il Servizio") è un atlante di studio di Storia dell'Arte
          che raccoglie opere, artisti, periodi, tecniche, luoghi e connessioni. Il Servizio è
          accessibile alla URL <code>https://warm-cassata-b06e4d.netlify.app</code>.
        </P>

        <H2>1. Titolare del trattamento</H2>
        <P>
          Il titolare del trattamento dei dati è il responsabile del progetto HUB Art.
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
      </div>
    );
  }

  if (section === "cookie") {
    return (
      <div className="wrap page" style={{ maxWidth: 760 }}>
        <BackButton />
        <H1>Cookie Policy</H1>
        <P>Ultimo aggiornamento: luglio 2026.</P>
        <P>
          Questa Cookie Policy spiega quali cookie vengono utilizzati da HUB Art — Atlante Neuronale
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
          HUB Art non utilizza cookie di profilazione, retargeting o tracciamento pubblicitario.
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
      </div>
    );
  }

  if (section === "termini") {
    return (
      <div className="wrap page" style={{ maxWidth: 760 }}>
        <BackButton />
        <H1>Termini e condizioni</H1>
        <P>Ultimo aggiornamento: luglio 2026.</P>

        <H2>1. Oggetto</H2>
        <P>
          I presenti Termini regolano l'utilizzo di HUB Art — Atlante Neuronale ("il Servizio"),
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
      </div>
    );
  }

  if (section === "crediti") {
    return (
      <div className="wrap page" style={{ maxWidth: 760 }}>
        <BackButton />
        <H1>Crediti</H1>

        <H2>Progetto</H2>
        <P>
          HUB Art — Atlante Neuronale è un atlante interattivo di Storia dell'Arte pensato per
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

        <H2>Immagini</H2>
        <P>
          Tutte le immagini delle opere provengono da <b>Wikimedia Commons</b> o da fonti pubbliche
          istituzionali (musei, soprintendenze). Per ogni immagine è possibile consultare la fonte
          facendo clic sull'immagine stessa o visitando la pagina Commons originale.
        </P>

        <H2>Contatti</H2>
        <P>
          Per segnalazioni, suggerimenti, richieste di collaborazione o problemi tecnici, scrivi a{" "}
          <Mailto /> oppure visita la pagina <Link to="/legal/contatti" className="tlink">Contatti</Link>.
        </P>
      </div>
    );
  }

  if (section === "contatti") {
    return (
      <div className="wrap page" style={{ maxWidth: 760 }}>
        <BackButton />
        <H1>Contatti</H1>
        <P>
          Per qualsiasi comunicazione relativa a HUB Art — Atlante Neuronale, puoi scrivere
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

        <H2>Sostieni il progetto</H2>
        <P>
          HUB Art è gratuito e senza pubblicità. Se ti è utile, considera una donazione per
          supportare lo sviluppo e i costi di hosting.
        </P>
        <div style={{ marginTop: 12 }}>
          <a href="https://www.buymeacoffee.com/ATgio" target="_blank" rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600,
              background: "#ffdd00", color: "#000", textDecoration: "none",
              border: "1px solid #e6c800",
            }}>
            ☕ Buy me a coffee
          </a>
        </div>
      </div>
    );
  }

  // sezione non riconosciuta → redirect alla home
  nav("/");
  return null;
}
