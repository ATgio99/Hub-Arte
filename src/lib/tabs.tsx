// ============================================================================
// TabContext — sistema di gestione schede stile browser.
// Permette di avere multiple "schede" aperte, ognuna con il suo URL e titolo.
// Solo desktop (window.innerWidth >= 768). Su mobile, il sistema è disattivato
// e il routing funziona normalmente con una sola scheda.
// ============================================================================
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export interface Tab {
  id: string;
  url: string;        // URL corrente della scheda (es. "/opera/basilica-superiore")
  title: string;      // Titolo mostrato nella tab bar
  icon?: string;      // Emoji/icona opzionale
}

interface TabContextType {
  tabs: Tab[];
  activeTabId: string | null;
  isActive: boolean;  // true se il sistema tabs è attivo (solo desktop)
  // Apre una nuova scheda con l'URL specificato
  openTab: (url: string, title?: string) => void;
  // Chiude una scheda
  closeTab: (tabId: string) => void;
  // Cambia scheda attiva
  switchTab: (tabId: string) => void;
  // Aggiorna URL/titolo della scheda attiva (chiamato dal router ad ogni navigazione)
  updateActiveTab: (url: string, title?: string) => void;
  // Riordina le schede (drag-and-drop)
  reorderTabs: (fromIndex: number, toIndex: number) => void;
}

const TabCtx = createContext<TabContextType | null>(null);

const STORAGE_KEY = "atlante.tabs.v1";
const MAX_TABS = 5; // limite massimo di schede aperte

// Deriva il titolo dall'URL (fallback se non specificato)
function deriveTitle(url: string): string {
  if (url === "/" || url === "") return "Home";
  // Rimuovi query string
  const path = url.split("?")[0];
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return "Home";
  // Mappa rotte note → titoli
  const routeTitles: Record<string, string> = {
    "opere": "Opere",
    "artisti": "Artisti",
    "grafo": "Rete",
    "timeline": "Timeline",
    "mappa": "Mappa",
    "glossario": "Glossario",
    "tecniche": "Tecniche",
    "dashboard": "Statistiche",
    "test": "Quiz",
    "suggerisci": "Suggerisci",
    "suggerisci-modifica": "Suggerisci modifica",
    "profile": "Le mie richieste",
    "admin": "Richieste admin",
    "admin/database": "Database",
    "login": "Accedi",
    "legal": "Note legali",
    "complesso": "Complesso",
    "luogo": "Luogo",
  };
  // Se è /opera/:id, /artista/:id, /periodo/:id — usa l'ID come titolo
  // (verrà aggiornato con il titolo vero dal componente)
  if (segments.length >= 2 && routeTitles[segments[0]]) {
    return routeTitles[segments[0]];
  }
  // Fallback: prima lettera maiuscola del primo segmento
  return segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
}

export function TabProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Rileva se è desktop (>= 768px)
  useEffect(() => {
    const check = () => setIsActive(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Carica tabs da localStorage all'avvio (solo desktop)
  useEffect(() => {
    if (!isActive) {
      setInitialized(true);
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { tabs: Tab[]; activeTabId: string };
        if (parsed.tabs && parsed.tabs.length > 0) {
          setTabs(parsed.tabs);
          setActiveTabId(parsed.activeTabId || parsed.tabs[0].id);
          setInitialized(true);
          return;
        }
      }
    } catch { /* ignore */ }
    // Se non ci sono tabs salvate, crea una scheda iniziale con l'URL corrente
    const currentUrl = window.location.hash.replace("#", "") || "/";
    const newTab: Tab = {
      id: `tab-${Date.now().toString(36)}`,
      url: currentUrl,
      title: deriveTitle(currentUrl),
    };
    setTabs([newTab]);
    setActiveTabId(newTab.id);
    setInitialized(true);
  }, [isActive]);

  // Salva tabs su localStorage quando cambiano
  useEffect(() => {
    if (!isActive || !initialized) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs, activeTabId }));
    } catch { /* ignore */ }
  }, [tabs, activeTabId, isActive, initialized]);

  const openTab = useCallback((url: string, title?: string) => {
    const newTab: Tab = {
      id: `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      url,
      title: title || deriveTitle(url),
    };
    setTabs(prev => {
      // Se abbiamo già raggiunto il limite massimo, chiudi la prima scheda
      // (la più vecchia) prima di aprirne una nuova
      if (prev.length >= MAX_TABS) {
        return [...prev.slice(1), newTab];
      }
      return [...prev, newTab];
    });
    // Attiva la nuova scheda
    setActiveTabId(newTab.id);
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === tabId);
      if (idx < 0) return prev;
      const newTabs = prev.filter(t => t.id !== tabId);
      // Se la scheda chiusa era attiva, attiva quella adiacente
      if (activeTabId === tabId) {
        const newActive = newTabs[Math.min(idx, newTabs.length - 1)];
        if (newActive) {
          setActiveTabId(newActive.id);
        } else {
          // Nessuna scheda rimasta: apri una nuova home
          const homeTab: Tab = {
            id: `tab-${Date.now().toString(36)}`,
            url: "/",
            title: "Home",
          };
          setActiveTabId(homeTab.id);
          return [homeTab];
        }
      }
      return newTabs;
    });
  }, [activeTabId]);

  const switchTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  const updateActiveTab = useCallback((url: string, title?: string) => {
    setTabs(prev => prev.map(t =>
      t.id === activeTabId
        ? { ...t, url, title: title || deriveTitle(url) }
        : t
    ));
  }, [activeTabId]);

  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    setTabs(prev => {
      if (fromIndex < 0 || fromIndex >= prev.length) return prev;
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const newTabs = [...prev];
      const [moved] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, moved);
      return newTabs;
    });
  }, []);

  // Se il sistema non è attivo (mobile), non fornire il context
  // (i componenti useranno il routing normale)
  if (!isActive) {
    // Su mobile: routing normale, nessuna tab bar
    return <TabCtx.Provider value={{
      tabs: [], activeTabId: null, isActive: false,
      openTab: () => {}, closeTab: () => {}, switchTab: () => {},
      updateActiveTab: () => {}, reorderTabs: () => {},
    }}>{children}</TabCtx.Provider>;
  }

  return (
    <TabCtx.Provider value={{
      tabs, activeTabId, isActive,
      openTab, closeTab, switchTab, updateActiveTab, reorderTabs,
    }}>
      {children}
    </TabCtx.Provider>
  );
}

export function useTabs(): TabContextType {
  const ctx = useContext(TabCtx);
  if (!ctx) throw new Error("useTabs fuori dal TabProvider");
  return ctx;
}
