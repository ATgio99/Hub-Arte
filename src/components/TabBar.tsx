// ============================================================================
// TabBar — barra delle schede stile browser (solo desktop).
// - Position: fixed, stessa altezza della sidebar (top: 14px)
// - Di default: linea minimal con testo "Schede" e freccia
// - Click → le schede appaiono con animazione (slide down)
// - Tabs aperte: sempre visibili, NESSUN fade sulle tabs.
//   È il contenuto della pagina che sfuma salendo dietro le tabs.
// - Ogni tab mantiene la propria scroll position
// ============================================================================
import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTabs } from "../lib/tabs";

export default function TabBar() {
  const { tabs, activeTabId, isActive, openTab, closeTab, switchTab, reorderTabs } = useTabs();
  const nav = useNavigate();
  const loc = useLocation();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);
  const [expanded, setExpanded] = useState(false);

  // === Scroll position per tab ===
  // Salva la scroll position quando si cambia tab, e ripristinala quando si torna.
  const scrollPositions = useRef<Record<string, number>>({});

  // Salva lo scroll corrente quando l'URL cambia (prima di navigare)
  useEffect(() => {
    const saveScroll = () => {
      if (activeTabId) {
        scrollPositions.current[activeTabId] = window.scrollY;
      }
    };
    // Salva prima della navigazione
    window.addEventListener("scroll", () => {
      if (activeTabId) {
        scrollPositions.current[activeTabId] = window.scrollY;
      }
    }, { passive: true });
    return () => {};
  }, [activeTabId]);

  // Ripristina lo scroll quando cambia la scheda attiva
  useEffect(() => {
    if (!expanded || !activeTabId) return;
    const savedScroll = scrollPositions.current[activeTabId] || 0;
    // Aspetta che la pagina sia renderizzata
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.scrollTo(0, savedScroll);
      }, 50);
    });
  }, [activeTabId, expanded, loc.pathname]);

  if (!isActive) return null;

  const handleClick = (tabId: string, url: string) => {
    // Salva la scroll position della tab corrente prima di cambiare
    if (activeTabId) {
      scrollPositions.current[activeTabId] = window.scrollY;
    }
    switchTab(tabId);
    if (loc.pathname + loc.search !== url) {
      nav(url);
    }
  };

  const handleNewTab = () => {
    if (activeTabId) {
      scrollPositions.current[activeTabId] = window.scrollY;
    }
    openTab("/opere", "Opere");
    nav("/opere");
    setExpanded(true);
  };

  const handleClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    // Rimuovi la scroll position salvata
    delete scrollPositions.current[tabId];
    closeTab(tabId);
  };

  const handleToggle = () => {
    setExpanded(prev => !prev);
  };

  // === Drag-and-drop ===
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIndex !== null && dragIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      reorderTabs(dragIndex, index);
    }
    setDragIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  };

  return (
    <>
      {/* Gradient mask: quando le tabs sono aperte, copre il contenuto
          che scorre verso l'alto e lo fa sfumare. */}
      {expanded && (
        <div className="tabbar-fade-mask" aria-hidden="true" />
      )}

      <div className={`tabbar-container ${expanded ? "expanded" : ""}`}>
        {/* Pulsante toggle minimal — linea con testo e freccia */}
        {!expanded && (
          <button
            className="tabbar-toggle"
            onClick={handleToggle}
            title="Mostra schede"
          >
            <span className="tabbar-toggle-label">Schede</span>
            <span className="tabbar-toggle-line" />
            <svg className="tabbar-toggle-arrow" width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 1l5 5 5-5" />
            </svg>
          </button>
        )}

        {/* Barra delle schede — visibile quando expanded=true, con animazione */}
        {expanded && (
          <div className="tabbar tabbar-animated">
            <div className="tabbar-tabs">
              {tabs.map((tab, index) => {
                const isActiveTab = tab.id === activeTabId;
                const isDragging = dragIndex === index;
                const isDragOver = dragOverIndex === index;
                return (
                  <div
                    key={tab.id}
                    role="tab"
                    aria-selected={isActiveTab}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onClick={() => handleClick(tab.id, tab.url)}
                    className={`tabbar-tab ${isActiveTab ? "active" : ""} ${isDragging ? "dragging" : ""} ${isDragOver ? "drag-over" : ""}`}
                    title={tab.title}
                  >
                    <span className="tabbar-tab-title">{tab.title}</span>
                    <button
                      className="tabbar-tab-close"
                      onClick={(e) => handleClose(e, tab.id)}
                      aria-label="Chiudi scheda"
                      title="Chiudi"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
              {/* Pulsante nuova scheda */}
              <button
                className="tabbar-new"
                onClick={handleNewTab}
                aria-label="Nuova scheda"
                title="Nuova scheda"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
              {/* Pulsante nascondi schede — minimal come il toggle */}
              <button
                className="tabbar-collapse-btn"
                onClick={handleToggle}
                title="Nascondi schede"
              >
                <svg className="tabbar-toggle-arrow-up" width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 7l5-5 5 5" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
