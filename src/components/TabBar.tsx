// ============================================================================
// TabBar — barra delle schede in alto (stile browser Chrome).
// Mostra le schede aperte con titolo, pulsante chiudi, e drag-and-drop.
// Solo desktop (>= 768px). Su mobile non viene renderizzato.
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

  // Se il sistema tabs non è attivo (mobile), non renderizzare
  if (!isActive) return null;

  // Quando si clicca su una scheda, naviga al suo URL e attivala
  const handleClick = (tabId: string, url: string) => {
    switchTab(tabId);
    // Naviga all'URL della scheda (solo se diverso da quello corrente)
    if (loc.pathname + loc.search !== url) {
      nav(url);
    }
  };

  // Pulsante "+" — apre una nuova scheda sulla home
  const handleNewTab = () => {
    openTab("/");
    nav("/");
  };

  // Chiudi scheda — previeni propagazione (altrimenti attiva la scheda)
  const handleClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTab(tabId);
    // Dopo la chiusura, naviga all'URL della nuova scheda attiva
    // (useEffect in App.tsx gestirà la navigazione quando activeTabId cambia)
    setTimeout(() => {
      const activeTab = tabs.find(t => t.id !== tabId);
      // Se c'è ancora una scheda attiva, naviga al suo URL
      // (closeTab aggiorna activeTabId internamente)
    }, 0);
  };

  // === Drag-and-drop ===
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // Necessario per Firefox
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

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragCounter.current++;
    if (dragIndex !== null && dragIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
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
    <div className="tabbar" role="tablist" aria-label="Schede aperte">
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
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragLeave={handleDragLeave}
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
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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
      </div>
    </div>
  );
}
