import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, type ReactNode, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { pageVariants, usePrefersReducedMotion } from "./lib/motion";
import { useScorciatoie } from "./lib/scorciatoie";
import { useAuth } from "./lib/auth";
import { pullFromCloud, pushToCloud, fullSync, subscribeToRealtime, pullGlobalImageOverrides, pullQuizFromCloud, pullImageOverrides } from "./lib/sync";
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

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let pollInterval: any;
    let globalPollInterval: any;
    let imagePollInterval: any;
    let quizCleanup: (() => void) | undefined;

    (async () => {
      // Scarica sempre gli override globali (anche per anonimi)
      await pullGlobalImageOverrides();

      if (!user) {
        // ANONIMO: polla solo i globali ogni 5 MINUTI (prima era 30s).
        // Le immagini globali cambiano raramente (solo quando l'admin le modifica),
        // non serve controllare ogni 30s.
        globalPollInterval = setInterval(async () => {
          await pullGlobalImageOverrides();
        }, 300000); // 5 minuti
        return;
      }

      // Per gli utenti autenticati: PUSH + PULL (sync completo)
      await fullSync(user);
      cleanup = subscribeToRealtime(user);

      // Polling automatico ogni 30 secondi: scarica SOLO favorites + studied.
      // NON scarica quiz (solo al login + dopo quiz) né image_overrides
      // (solo al login + ogni 5 min) — per ridurre il traffico API.
      pollInterval = setInterval(async () => {
        console.log("[sync] Auto-poll: pulling favorites+studied...");
        await pullFromCloud(user);
      }, 30000);

      // Polling immagini ogni 5 MINUTI (prima era nel pullFromCloud ogni 30s).
      // Le immagini cambiano raramente, non serve controllarle spesso.
      imagePollInterval = setInterval(async () => {
        console.log("[sync] Image poll: pulling image overrides...");
        await pullImageOverrides(user);
      }, 300000); // 5 minuti

      // Dopo un quiz completato: pull immediato delle quiz stats/errors
      // (evento dispatchato da quizStore.recordSession)
      const onQuizCompleted = () => {
        console.log("[sync] Quiz completed: pulling quiz data from cloud...");
        pullQuizFromCloud(user);
      };
      window.addEventListener("atlante:quiz-completed", onQuizCompleted);
      quizCleanup = () => {
        window.removeEventListener("atlante:quiz-completed", onQuizCompleted);
      };
    })();

    return () => {
      if (cleanup) cleanup();
      if (quizCleanup) quizCleanup();
      if (pollInterval) clearInterval(pollInterval);
      if (globalPollInterval) clearInterval(globalPollInterval);
      if (imagePollInterval) clearInterval(imagePollInterval);
    };
  }, [user]);
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
