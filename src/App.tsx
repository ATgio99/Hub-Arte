import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, type ReactNode, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { pageVariants, usePrefersReducedMotion } from "./lib/motion";
import { useScorciatoie } from "./lib/scorciatoie";
import { useAuth } from "./lib/auth";
import { pullFromCloud, fullSync, subscribeToRealtime, pullGlobalImageOverrides, pullImageOverrides } from "./lib/sync";
import Sidebar from "./components/Sidebar";
import CookieConsent from "./components/CookieConsent";
import LoginPrompt from "./components/LoginPrompt";
import Timeline from "./pages/Timeline";
import Luogo from "./pages/Luogo";
import Artisti from "./pages/Artisti";
import Opere from "./pages/Opere";
import Opera from "./pages/Opera";
import Complesso from "./pages/Complesso";
import Periodo from "./pages/Periodo";
import Artista from "./pages/Artista";
import Glossario from "./pages/Glossario";
import Tecniche from "./pages/Tecniche";
import Test from "./pages/Test";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import Legal from "./pages/Legal";
import Suggerisci from "./pages/Suggerisci";
import SuggerisciModifica from "./pages/SuggerisciModifica";
import AdminRichieste from "./pages/AdminRichieste";
import AdminDatabase from "./pages/AdminDatabase";
import LeMieRichieste from "./pages/LeMieRichieste";
import "./app.css";

// La home 3D carica il modulo Three solo qui (lazy): le pagine interne non lo toccano.
const Home3D = lazy(() => import("./pages/Home3D"));
// Pagine "pesanti" lazy: Grafo (react-force-graph-3d → three) e Mappa (leaflet)
// non devono entrare nel bundle iniziale della home.
const Grafo = lazy(() => import("./pages/Grafo"));
const Mappa = lazy(() => import("./pages/Mappa"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

function PageTransition({ pathname, children }: { pathname: string; children: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return <>{children}</>;
  return (
    <motion.div key={pathname} variants={pageVariants} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

/** Hook che sincronizza i dati dal cloud quando l'utente fa login.
 *  Per gli utenti anonimi scarica SOLO gli override globali (immagini admin). */
function useSyncOnLogin() {
  const { user } = useAuth();

  // La dipendenza e' l'identificativo, non l'oggetto: Supabase emette un evento
  // di autenticazione a ogni rinnovo del token e a ogni rientro sulla scheda, e
  // ogni volta consegna un oggetto utente nuovo. Con `[user]` questo effetto si
  // rismontava di continuo; con `[user?.id]` si rismonta solo quando cambia
  // davvero la persona collegata.
  const userId = user?.id;

  useEffect(() => {
    if (!userId || !user) {
      // Anonimo: le immagini scelte dagli admin si leggono una volta sola.
      // Prima venivano richieste ogni 5 minuti anche a chi non ha un account:
      // 288 chiamate al giorno per visitatore, per un dato che cambia una volta
      // ogni tanto e che l'esportazione del catalogo porta comunque nei JSON.
      pullGlobalImageOverrides();
      return;
    }

    // Il canale si apre subito, prima di qualunque attesa: se lo si apriva dopo
    // un await, un rilancio dell'effetto nel frattempo lasciava indietro un
    // canale che nessuno poteva piu' chiudere.
    const chiudiCanale = subscribeToRealtime(user);

    let vivo = true;
    (async () => {
      await pullGlobalImageOverrides();
      if (!vivo) return;
      await fullSync(user);
    })();

    // Niente polling a orologio: ci si riallinea quando si torna sulla scheda,
    // e non piu' di una volta ogni tre minuti. La pausa puo' essere lunga
    // perche' il canale realtime ora consegna anche le rimozioni, non solo le
    // aggiunte: questo e' diventato una rete di sicurezza per quando la
    // connessione e' caduta, non piu' l'unico modo di accorgersi di una
    // cancellazione.
    let ultimoAllineamento = Date.now();
    const alRientro = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - ultimoAllineamento < 180000) return;
      ultimoAllineamento = Date.now();
      pullFromCloud(user);
    };
    document.addEventListener("visibilitychange", alRientro);

    // A fine quiz i dati sono appena stati mandati da noi: rileggerli subito
    // era un viaggio di ritorno per informazioni che avevamo gia'.
    const onQuizCompleted = () => { ultimoAllineamento = Date.now(); };
    window.addEventListener("atlante:quiz-completed", onQuizCompleted);

    return () => {
      vivo = false;
      chiudiCanale();
      document.removeEventListener("visibilitychange", alRientro);
      window.removeEventListener("atlante:quiz-completed", onQuizCompleted);
    };
  }, [userId]);
}

export default function App() {
  const loc = useLocation();
  const isHome = loc.pathname === "/";
  // Scroll in cima ad ogni cambio rotta. Usa rAF + timeout per essere sicuri
  // che la nuova pagina sia renderizzata prima di scrollare (altrimenti lo
  // scroll avviene sulla pagina vecchia e non ha effetto).
  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      // Anche sull'eventuale contenitore scrollabile
      const shell = document.querySelector(".shell3d");
      if (shell) (shell as HTMLElement).scrollTop = 0;
      const content = document.querySelector(".content3d");
      if (content) (content as HTMLElement).scrollTop = 0;
    };
    // Subito
    scrollToTop();
    // Al prossimo frame (dopo render React)
    requestAnimationFrame(scrollToTop);
    // E anche dopo 100ms (per pagine lazy-loaded)
    const t = setTimeout(scrollToTop, 100);
    return () => clearTimeout(t);
  }, [loc.pathname, loc.search]);

  // Sincronizza dal cloud al login
  useSyncOnLogin();
  useScorciatoie();

  return (
    <div className={`shell3d ${isHome ? "is-home" : ""}`}>
      {/* Sidebar moderna su TUTTE le pagine (home inclusa) */}
      <Sidebar />

      <div className="content3d">
        {isHome ? (
          <main className="page-host">
            <Landing />
          </main>
        ) : (
          <main className="page-host">
            <PageTransition pathname={loc.pathname}>
              <Suspense fallback={<div className="h3d-loader" data-testid="page-suspense"><div className="spinner" /></div>}>
                <Routes location={loc}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/grafo" element={<Grafo />} />
                  <Route path="/timeline" element={<Timeline />} />
                  <Route path="/mappa" element={<Mappa />} />
                  <Route path="/luogo/:name" element={<Luogo />} />
                  <Route path="/opere" element={<Opere />} />
                  <Route path="/opera/:id" element={<Opera />} />
                  <Route path="/complesso/:id" element={<Complesso />} />
                  <Route path="/periodo/:id" element={<Periodo />} />
                  <Route path="/artisti" element={<Artisti />} />
                  <Route path="/artista/:id" element={<Artista />} />
                  <Route path="/glossario" element={<Glossario />} />
                  <Route path="/tecniche" element={<Tecniche />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/test" element={<Test />} />
                  <Route path="/suggerisci" element={<Suggerisci />} />
                  <Route path="/suggerisci-modifica" element={<SuggerisciModifica />} />
                  <Route path="/profile" element={<LeMieRichieste />} />
                  <Route path="/admin" element={<AdminRichieste />} />
                  <Route path="/admin/database" element={<AdminDatabase />} />
                  <Route path="/legal" element={<Legal />} />
                  <Route path="/legal/:section" element={<Legal />} />
                </Routes>
              </Suspense>
            </PageTransition>
          </main>
        )}
      </div>

      {/* Banner cookie — solo finché l'utente non ha scelto */}
      <CookieConsent />
      <LoginPrompt />
    </div>
  );
}
