// ============================================================================
// TabBar — barra delle schede stile browser (solo desktop).
// - Position: fixed, stessa altezza della sidebar (top: 14px)
// - Di default mostra un pulsante "Schede ▼" centrato
// - Click → le schede appaiono
// - Tabs aperte: sempre visibili, NESSUN fade sulle tabs.
//   È il contenuto della pagina che sfuma salendo dietro le tabs.
// - Tabs chiuse (solo pulsante): scroll normale, pulsante resta fisso
// ============================================================================
import { useState, useRef } from "react";
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

  if (!isActive) return null;

  const handleClick = (tabId: string, url: string) => {
    switchTab(tabId);
    if (loc.pathname + loc.search !== url) {
      nav(url);
    }
  };

  const handleNewTab = () => {
    openTab("/opere", "Opere");
    nav("/opere");
    setExpanded(true);
  };

  const handleClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTab(tabId);
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
          che scorre verso l'alto e lo fa sfumare. Deve essere un elemento
          separato (non dentro tabbar-container) per non essere intrappolato
          nel suo stacking context. */}
      {expanded && (
        <div className="tabbar-fade-mask" aria-hidden="true" />
      )}

    <div className={`tabbar-container ${expanded ? "expanded" : ""}`}>
      {/* Pulsante toggle "Schede ▼" — centrato, visibile di default */}
      {!expanded && (
        <button
          className="tabbar-toggle"
          onClick={() => setExpanded(true)}
          title="Mostra schede"
        >
          <span className="tabbar-toggle-label">Schede</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      )}

      {/* Barra delle schede — visibile quando expanded=true */}
      {expanded && (
        <div className="tabbar">
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
            {/* Pulsante nascondi schede (restringi) */}
            <button
              className="tabbar-collapse-btn"
              onClick={() => setExpanded(false)}
              title="Nascondi schede"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 15l-6-6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
