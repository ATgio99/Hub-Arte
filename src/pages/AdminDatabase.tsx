// ============================================================================
// AdminDatabase — pagina stile sito per gestire TUTTO il database.
// Rotta: /admin/database (solo admin loggati).
//
// 7 tab:
//   1. Opere (works)
//   2. Artisti (artists)
//   3. Periodi (periods)
//   4. Tecniche (techniques)
//   5. Termini (terms)
//   6. Eventi (events)
//   7. Connessioni (connections)
//
// Ogni tab ha:
//   - Tabella con ricerca + filtro
//   - Pulsante "+ Nuovo" per aggiungere
//   - Click su riga → apre EditorDrawer laterale
//   - Elimina con conferma
//   - Badge "DB" / "JSON" per distinguere la fonte
// ============================================================================
import { useEffect, useState, useMemo, useCallback, useRef, memo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useData } from "../lib/store";
import { computeWorkGroups, workGroupMap } from "../lib/data";
import EditorDrawer from "../components/EditorDrawer";
import EntitySelector from "../components/EntitySelector";
import type { Work, Artist, Period, Technique, Term, ArtEvent, Connection } from "../lib/types";

type Tab = "works" | "artists" | "periods" | "techniques" | "terms" | "events" | "connections" | "complessi";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "works", label: "Opere", icon: "🖼️" },
  { id: "artists", label: "Artisti", icon: "👤" },
  { id: "periods", label: "Periodi", icon: "📅" },
  { id: "techniques", label: "Tecniche", icon: "🎨" },
  { id: "terms", label: "Termini", icon: "📚" },
  { id: "events", label: "Eventi", icon: "⚡" },
  { id: "connections", label: "Connessioni", icon: "🔗" },
  { id: "complessi", label: "Complessi", icon: "🏛️" },
];

function slugify(s: string): string {
  return String(s).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim()
    .replace(/\s+/g, "-").replace(/-+/g, "-")
    .slice(0, 80);
}

interface DbRow { id: string; modified_by?: string | null; [k: string]: any; }

export default function AdminDatabase() {
  const { user, isAdmin } = useAuth();
  const ix = useData();
  const [tab, setTab] = useState<Tab>("works");
  const [search, setSearch] = useState("");
  const [dbIds, setDbIds] = useState<Set<string>>(new Set());
  const [loadingDb, setLoadingDb] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newId, setNewId] = useState<string | null>(null);

  // Carica gli ID presenti nel DB (per mostrare badge "DB" vs "JSON")
  const loadDbIds = useCallback(async (currentTab: Tab) => {
    // "complessi" non è una tabella DB reale: deriva dai metadati delle opere.
    // Salta la query (che fallirebbe con "relation does not exist") e mostra
    // il conteggio derivato dal dataset.
    if (currentTab === "complessi") {
      setDbIds(new Set());
      setLoadingDb(false);
      return;
    }
    setLoadingDb(true);
    try {
      const { data, error } = await supabase.from(currentTab).select("id");
      if (!error && data) {
        setDbIds(new Set(data.map((r: any) => r.id)));
      } else {
        setDbIds(new Set());
      }
    } catch {
      setDbIds(new Set());
    } finally {
      setLoadingDb(false);
    }
  }, []);

  useEffect(() => { loadDbIds(tab); }, [tab, loadDbIds]);

  // Redirect se non admin
  if (!user) {
    return (
      <div className="wrap page" style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: "clamp(26px,4vw,38px)", marginBottom: 16 }}>Area admin</h1>
        <p style={{ fontSize: 16, color: "var(--ink-soft)" }}>
          Per accedere a questa pagina devi avere un account amministratore.
        </p>
        <Link to="/login" className="btn gold" style={{ marginTop: 18 }}>Accedi</Link>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="wrap page" style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: "clamp(26px,4vw,38px)", marginBottom: 16 }}>Accesso negato</h1>
        <p style={{ fontSize: 16, color: "var(--ink-soft)" }}>
          Questa pagina è riservata agli amministratori.
        </p>
        <Link to="/" className="btn ghost" style={{ marginTop: 18 }}>← Torna alla home</Link>
      </div>
    );
  }

  // Dati per tab corrente
  const currentData = useMemo<DbRow[]>(() => {
    let arr: DbRow[] = [];
    switch (tab) {
      case "works": arr = ix.ds.works; break;
      case "artists": arr = ix.ds.artists; break;
      case "periods": arr = ix.ds.periods; break;
      case "techniques": arr = ix.ds.techniques; break;
      case "terms": arr = ix.ds.terms; break;
      case "events": arr = ix.ds.events; break;
      case "connections": arr = ix.ds.connections; break;
      case "complessi": arr = []; break; // gestito da ComplessiView
    }
    // Filtro search
    if (!search.trim()) return arr;
    const q = search.toLowerCase().trim();
    return arr.filter((r) => {
      const txt = JSON.stringify(r).toLowerCase();
      return txt.includes(q);
    });
  }, [tab, search, ix]);

  const dbCount = dbIds.size;
  const totalCount = currentData.length;

  // Apri drawer per modifica
  const openEdit = (id: string) => {
    setEditingId(id);
    setNewId(null);
    setDrawerOpen(true);
  };

  // Apri drawer per nuovo
  const openNew = () => {
    const baseId = `nuovo-${Date.now().toString(36)}`;
    setNewId(baseId);
    setEditingId(baseId);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => { setEditingId(null); setNewId(null); }, 200);
    // Ricarica gli ID dal DB
    loadDbIds(tab);
  };

  // Elimina riga
  const deleteRow = async (id: string) => {
    let label = id;
    const r = currentData.find(x => x.id === id);
    if (r) {
      label = (r as any).title || (r as any).name || (r as any).term || id;
    }
    const confirmed = window.confirm(
      `⚠️ CONFERMA ELIMINAZIONE\n\n` +
      `Stai per eliminare dal database (${tab}):\n\n` +
      `${label}\n` +
      `ID: ${id}\n\n` +
      `Questa azione è irreversibile.\n\n` +
      `Vuoi procedere?`
    );
    if (!confirmed) return;
    try {
      // Prima prova a eliminare dal DB
      const { error } = await supabase.from(tab).delete().eq("id", id);
      // Poi inserisci in hidden_entities per nascondere eventuali record JSON
      await supabase.from("hidden_entities").upsert(
        { id, table_name: tab, hidden_by: user?.email || null },
        { onConflict: "id" }
      );
      if (error && !error.message.includes("No rows")) { alert("Errore: " + error.message); return; }
      window.dispatchEvent(new Event("hubart-works-changed"));
      try { const bc = new BroadcastChannel("hubart-admin"); bc.postMessage({ type: "changed", ts: Date.now() }); bc.close(); } catch {}
      loadDbIds(tab);
    } catch (e: any) {
      alert("Errore: " + e.message);
    }
  };

  // Stili comuni
  const thStyle: React.CSSProperties = {
    textAlign: "left", padding: "10px 12px", fontSize: 11,
    textTransform: "uppercase", letterSpacing: "0.05em",
    color: "var(--ink-dim)", fontWeight: 600,
    borderBottom: "1px solid var(--line)",
  };
  const tdStyle: React.CSSProperties = {
    padding: "10px 12px", borderBottom: "1px solid var(--line)",
    fontSize: 13, verticalAlign: "top",
  };
  const dbBadge = (id: string) => (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
      background: dbIds.has(id) ? "rgba(63,138,79,0.15)" : "var(--bg-2)",
      color: dbIds.has(id) ? "#3f8a4f" : "var(--ink-dim)",
    }}>
      {dbIds.has(id) ? "DB" : "JSON"}
    </span>
  );
  const actions = (id: string) => (
    <div style={{ display: "flex", gap: 4 }}>
      <button
        onClick={() => openEdit(id)}
        title="Modifica"
        style={{
          background: "none", border: "1px solid var(--line)", borderRadius: 4,
          cursor: "pointer", padding: "3px 8px", fontSize: 13,
        }}
      >✎</button>
      <button
        onClick={() => deleteRow(id)}
        title="Elimina"
        style={{
          background: "none", border: "1px solid var(--line)", borderRadius: 4,
          cursor: "pointer", padding: "3px 8px", fontSize: 13,
          color: "#a8483f",
        }}
      >🗑️</button>
    </div>
  );

  return (
    <div className="wrap page">
      {/* Header */}
      <div className="page-head" style={{ marginBottom: 18 }}>
        <div className="page-eyebrow">
          <span className="eyebrow">Pannello amministratore</span>
        </div>
        <h1 className="page-title">Database editor</h1>
        <p className="page-lead">
          Modifica tutte le entità del catalogo: opere, artisti, periodi, tecniche, termini, eventi e connessioni.
          I cambiamenti sono salvati nel database Supabase e sono visibili immediatamente a tutti gli utenti.
        </p>
      </div>

      {/* Info + link */}
      <div style={{
        padding: "12px 16px", background: "var(--bg-2)", borderRadius: 10,
        marginBottom: 20, fontSize: 13.5, display: "flex",
        justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center",
      }}>
        <div>
          <b>Account admin:</b> {user.email}
          {" · "}
          <Link to="/admin" style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>
            ← Torna alle richieste utenti
          </Link>
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>
          {tab === "complessi"
            ? <>Tab corrente: <b>{totalCount}</b> complessi · derivati dai metadati delle opere</>
            : <>Tab corrente: <b>{dbCount}</b> righe nel DB · <b>{totalCount}</b> totali visibili</>
          }
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--line)", marginBottom: 16, overflowX: "auto", flexWrap: "nowrap" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSearch(""); }}
            style={{
              padding: "10px 16px", background: "none", border: 0,
              borderBottom: `2px solid ${tab === t.id ? "var(--gold-deep)" : "transparent"}`,
              cursor: "pointer", fontFamily: "inherit", fontSize: 13.5,
              fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? "var(--gold-deep)" : "var(--ink-dim)",
              whiteSpace: "nowrap",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Toolbar: ricerca + nuovo */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder={`Cerca in ${TABS.find(t => t.id === tab)?.label?.toLowerCase()}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 240, padding: "9px 12px",
            border: "1px solid var(--line)", borderRadius: 6,
            background: "var(--bg)", color: "var(--ink)", fontSize: 13.5,
          }}
        />
        <button
          onClick={openNew}
          className="btn gold sm"
          style={{ whiteSpace: "nowrap", display: tab === "complessi" ? "none" : "inline-flex" }}
          disabled={tab === "complessi"}
          title={tab === "complessi" ? "I complessi sono generati automaticamente dal dataset" : undefined}
        >
          + Nuovo
        </button>
      </div>

      {/* TABELLA — renderer per ogni tab */}
      <div style={{
        background: "var(--bg)", border: "1px solid var(--line)",
        borderRadius: 10, overflow: "hidden", maxHeight: 540, overflowY: "auto",
      }}>
        {/* Complessi — render dedicato, PRIMA del check currentData.length === 0 */}
        {tab === "complessi" ? (
          <ComplessiView ix={ix} search={search} openEdit={openEdit} />
        ) : loadingDb ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div className="spinner" style={{ margin: "0 auto" }} />
          </div>
        ) : currentData.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--ink-dim)", fontSize: 14 }}>
            Nessun elemento trovato.
          </div>
        ) : tab === "works" ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Titolo</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Anno</th>
                <th style={thStyle}>Città</th>
                <th style={thStyle}>Fonte</th>
                <th style={thStyle}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {currentData.slice(0, 200).map((w: Work) => (
                <tr key={w.id} style={{ cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-2)"} onMouseLeave={(e) => e.currentTarget.style.background = ""}>
                  <td style={tdStyle} onClick={() => openEdit(w.id)}>
                    <div style={{ fontWeight: 500 }}>{w.title}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-dim)", fontFamily: "ui-monospace, monospace" }}>{w.id}</div>
                  </td>
                  <td style={tdStyle} onClick={() => openEdit(w.id)}>{w.type}</td>
                  <td style={tdStyle} onClick={() => openEdit(w.id)}>{w.year_start && w.year_end ? `${w.year_start}–${w.year_end}` : (w.year_end || w.year_start || "—")}</td>
                  <td style={tdStyle} onClick={() => openEdit(w.id)}>{w.location_city || "—"}</td>
                  <td style={tdStyle}>{dbBadge(w.id)}</td>
                  <td style={tdStyle}>{actions(w.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : tab === "artists" ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Nome</th>
                <th style={thStyle}>Ruolo</th>
                <th style={thStyle}>Anni</th>
                <th style={thStyle}>Periodi</th>
                <th style={thStyle}>Fonte</th>
                <th style={thStyle}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {currentData.slice(0, 200).map((a: Artist) => {
                const periodNames = (a.period_ids || []).map(pid => ix.periodById.get(pid)?.name).filter(Boolean);
                return (
                  <tr key={a.id} style={{ cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-2)"} onMouseLeave={(e) => e.currentTarget.style.background = ""}>
                    <td style={tdStyle} onClick={() => openEdit(a.id)}>
                      <div style={{ fontWeight: 500 }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-dim)", fontFamily: "ui-monospace, monospace" }}>{a.id}</div>
                    </td>
                    <td style={tdStyle} onClick={() => openEdit(a.id)}>{a.role || "—"}</td>
                    <td style={tdStyle} onClick={() => openEdit(a.id)}>{a.birth || a.death ? `${a.birth ?? "?"}–${a.death ?? "?"}` : "—"}</td>
                    <td style={tdStyle} onClick={() => openEdit(a.id)}>{periodNames.join(", ") || "—"}</td>
                    <td style={tdStyle}>{dbBadge(a.id)}</td>
                    <td style={tdStyle}>{actions(a.id)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : tab === "periods" ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Nome</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Anni</th>
                <th style={thStyle}>Regioni</th>
                <th style={thStyle}>Fonte</th>
                <th style={thStyle}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {currentData.slice(0, 200).map((p: Period) => (
                <tr key={p.id} style={{ cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-2)"} onMouseLeave={(e) => e.currentTarget.style.background = ""}>
                  <td style={tdStyle} onClick={() => openEdit(p.id)}>
                    <div style={{ fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-dim)", fontFamily: "ui-monospace, monospace" }}>{p.id}</div>
                  </td>
                  <td style={tdStyle} onClick={() => openEdit(p.id)}>{p.type}</td>
                  <td style={tdStyle} onClick={() => openEdit(p.id)}>{p.year_start}–{p.year_end}</td>
                  <td style={tdStyle} onClick={() => openEdit(p.id)}>{(p.regions || []).join(", ") || "—"}</td>
                  <td style={tdStyle}>{dbBadge(p.id)}</td>
                  <td style={tdStyle}>{actions(p.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : tab === "techniques" ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Nome</th>
                <th style={thStyle}>Categoria</th>
                <th style={thStyle}>Definizione</th>
                <th style={thStyle}>Fonte</th>
                <th style={thStyle}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {currentData.slice(0, 200).map((t: Technique) => (
                <tr key={t.id} style={{ cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-2)"} onMouseLeave={(e) => e.currentTarget.style.background = ""}>
                  <td style={tdStyle} onClick={() => openEdit(t.id)}>
                    <div style={{ fontWeight: 500 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-dim)", fontFamily: "ui-monospace, monospace" }}>{t.id}</div>
                  </td>
                  <td style={tdStyle} onClick={() => openEdit(t.id)}>{t.category}</td>
                  <td style={tdStyle} onClick={() => openEdit(t.id)}>{(t.definition || "").slice(0, 80)}{(t.definition || "").length > 80 ? "…" : ""}</td>
                  <td style={tdStyle}>{dbBadge(t.id)}</td>
                  <td style={tdStyle}>{actions(t.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : tab === "terms" ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Termine</th>
                <th style={thStyle}>Categoria</th>
                <th style={thStyle}>Definizione</th>
                <th style={thStyle}>Fonte</th>
                <th style={thStyle}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {currentData.slice(0, 200).map((t: Term) => (
                <tr key={t.id} style={{ cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-2)"} onMouseLeave={(e) => e.currentTarget.style.background = ""}>
                  <td style={tdStyle} onClick={() => openEdit(t.id)}>
                    <div style={{ fontWeight: 500 }}>{t.term}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-dim)", fontFamily: "ui-monospace, monospace" }}>{t.id}</div>
                  </td>
                  <td style={tdStyle} onClick={() => openEdit(t.id)}>{t.category}{t.is_archetype ? " · ⭐ archetipo" : ""}</td>
                  <td style={tdStyle} onClick={() => openEdit(t.id)}>{(t.definition || "").slice(0, 80)}{(t.definition || "").length > 80 ? "…" : ""}</td>
                  <td style={tdStyle}>{dbBadge(t.id)}</td>
                  <td style={tdStyle}>{actions(t.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : tab === "events" ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Titolo</th>
                <th style={thStyle}>Anno</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Descrizione</th>
                <th style={thStyle}>Fonte</th>
                <th style={thStyle}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {currentData.slice(0, 200).map((e: ArtEvent) => (
                <tr key={e.id} style={{ cursor: "pointer" }} onMouseEnter={(e2) => e2.currentTarget.style.background = "var(--bg-2)"} onMouseLeave={(e2) => e2.currentTarget.style.background = ""}>
                  <td style={tdStyle} onClick={() => openEdit(e.id)}>
                    <div style={{ fontWeight: 500 }}>{e.title}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-dim)", fontFamily: "ui-monospace, monospace" }}>{e.id}</div>
                  </td>
                  <td style={tdStyle} onClick={() => openEdit(e.id)}>{e.year}{e.year_end ? `–${e.year_end}` : ""}</td>
                  <td style={tdStyle} onClick={() => openEdit(e.id)}>{e.kind}</td>
                  <td style={tdStyle} onClick={() => openEdit(e.id)}>{(e.description || "").slice(0, 80)}{(e.description || "").length > 80 ? "…" : ""}</td>
                  <td style={tdStyle}>{dbBadge(e.id)}</td>
                  <td style={tdStyle}>{actions(e.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : tab === "connections" ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Source</th>
                <th style={thStyle}>Target</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Descrizione</th>
                <th style={thStyle}>Fonte</th>
                <th style={thStyle}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {currentData.slice(0, 200).map((c: Connection) => (
                <tr key={c.id} style={{ cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-2)"} onMouseLeave={(e) => e.currentTarget.style.background = ""}>
                  <td style={tdStyle} onClick={() => openEdit(c.id)}>
                    <div style={{ fontWeight: 500 }}>{c.source_type}: {c.source_id}</div>
                  </td>
                  <td style={tdStyle} onClick={() => openEdit(c.id)}>
                    <div style={{ fontWeight: 500 }}>{c.target_type}: {c.target_id}</div>
                  </td>
                  <td style={tdStyle} onClick={() => openEdit(c.id)}>{c.kind}</td>
                  <td style={tdStyle} onClick={() => openEdit(c.id)}>{(c.description || "").slice(0, 80)}{(c.description || "").length > 80 ? "…" : ""}</td>
                  <td style={tdStyle}>{dbBadge(c.id)}</td>
                  <td style={tdStyle}>{actions(c.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        {currentData.length > 200 && (
          <div style={{ padding: 12, textAlign: "center", color: "var(--ink-dim)", fontSize: 12 }}>
            Mostrando le prime 200 righe di {currentData.length}. Usa la ricerca per filtrare.
          </div>
        )}
      </div>

      {/* Editor a tutto schermo per modificare opere */}
      {tab === "works" && editingId && (
        <EditorDrawer
          workId={editingId}
          open={drawerOpen}
          onClose={closeDrawer}
          fullscreen={true}
        />
      )}

      {/* Per le altre tab, editor a tutto schermo generico */}
      {tab !== "works" && editingId && drawerOpen && (
        <GenericEditorDrawer
          table={tab}
          rowId={editingId}
          open={drawerOpen}
          onClose={closeDrawer}
          isNew={!!newId}
        />
      )}

      {/* Footer informativo */}
      <div style={{
        marginTop: 32, padding: "14px 16px", background: "var(--bg-2)",
        borderRadius: 10, fontSize: 13, color: "var(--ink-dim)",
      }}>
        <b>ℹ️ Come funziona:</b>
        <ul style={{ margin: "8px 0 0 18px", lineHeight: 1.6 }}>
          <li>Le modifiche sono salvate nel database Supabase.</li>
          <li>Le righe con badge <b style={{ color: "#3f8a4f" }}>DB</b> sono già nel database.</li>
          <li>Le righe con badge <b>JSON</b> provengono dal file statico: per modificarle, l'app creerà una copia nel DB che sovrascrive il JSON.</li>
          <li>Tutti gli utenti vedranno le modifiche dopo un refresh della pagina.</li>
          <li>L'eliminazione rimuove solo dal DB. Se la riga esiste anche nel JSON, riapparirà con i valori originali.</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// ComplessiView — mostra i gruppi di opere (complessi/architetture con
// più opere collegate). Non è una tabella DB: deriva dai metadati delle opere.
// ============================================================================
function ComplessiView({ ix, search, openEdit }: { ix: ReturnType<typeof useData>; search: string; openEdit: (id: string) => void }) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [newPlace, setNewPlace] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newWorkId, setNewWorkId] = useState("");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null);
  const [editPlaceName, setEditPlaceName] = useState("");
  const [addWorkToGroup, setAddWorkToGroup] = useState<string | null>(null);
  const [addWorkId, setAddWorkId] = useState("");

  const groups = useMemo(() => {
    const g = computeWorkGroups(ix.ds);
    return [...g.values()].sort((a, b) => b.works.length - a.works.length);
  }, [ix.ds]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return groups;
    return groups.filter(g =>
      (g.name + " " + (g.city ?? "")).toLowerCase().includes(q)
    );
  }, [groups, q]);

  // Opere senza complesso (per il form "nuovo complesso")
  const orphanWorks = useMemo(() => {
    const inGroup = new Set<string>();
    for (const g of groups) for (const w of g.works) inGroup.add(w.id);
    return ix.ds.works
      .filter(w => !inGroup.has(w.id) && w.location_place)
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, 200);
  }, [ix.ds.works, groups]);

  const notifyChanged = () => {
    window.dispatchEvent(new Event("hubart-works-changed"));
    try { const bc = new BroadcastChannel("hubart-admin"); bc.postMessage({ type: "changed", ts: Date.now() }); bc.close(); } catch {}
  };

  const renameComplex = async (oldName: string, cityName: string | null) => {
    const newName = editPlaceName.trim();
    if (!newName || newName === oldName) { setEditingGroupName(null); return; }
    // Trova tutte le opere del gruppo e aggiorna location_place
    const group = groups.find(g => g.name === oldName && (g.city ?? null) === cityName);
    if (!group) return;
    const updates = group.works.map(w =>
      supabase.from("works").upsert({ id: w.id, location_place: newName, modified_by: null }, { onConflict: "id" })
    );
    await Promise.all(updates);
    setEditingGroupName(null);
    setEditPlaceName("");
    notifyChanged();
  };

  const removeWorkFromComplex = async (workId: string) => {
    // Rimuove l'opera dal complesso impostando location_place a null
    if (!confirm("Rimuovere quest'opera dal complesso? Il suo location_place verrà cancellato.")) return;
    const { error } = await supabase.from("works").upsert({
      id: workId, location_place: null, modified_by: null,
    }, { onConflict: "id" });
    if (error) alert("Errore: " + error.message);
    else notifyChanged();
  };

  const addWorkToComplex = async (groupName: string) => {
    if (!addWorkId.trim()) return;
    const { error } = await supabase.from("works").upsert({
      id: addWorkId.trim(), location_place: groupName, modified_by: null,
    }, { onConflict: "id" });
    if (error) alert("Errore: " + error.message);
    else { setAddWorkToGroup(null); setAddWorkId(""); notifyChanged(); }
  };

  const deleteComplex = async (groupName: string, cityName: string | null) => {
    if (!confirm(`Eliminare il complesso "${groupName}"? Tutte le opere verranno rimosse dal complesso (location_place cancellato).`)) return;
    const group = groups.find(g => g.name === groupName && (g.city ?? null) === cityName);
    if (!group) return;
    const updates = group.works.map(w =>
      supabase.from("works").upsert({ id: w.id, location_place: null, modified_by: null }, { onConflict: "id" })
    );
    await Promise.all(updates);
    notifyChanged();
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 12, fontSize: 13, color: "var(--ink-dim)" }}>
        📊 <b>{groups.length}</b> complessi trovati. Clicca su un'opera per aprirne l'editor completo,
        o usa i pulsanti per rinominare, aggiungere/rimuovere opere ed eliminare complessi.
      </div>

      {/* Pulsante nuovo complesso */}
      <button
        className="btn gold sm"
        onClick={() => setShowNewForm(!showNewForm)}
        style={{ marginBottom: 12 }}
      >
        {showNewForm ? "− Annulla" : "+ Crea nuovo complesso"}
      </button>

      {/* Form nuovo complesso */}
      {showNewForm && (
        <div style={{
          padding: 16, background: "var(--bg-2)", borderRadius: 10,
          marginBottom: 16, border: "1px solid var(--gold)",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Crea nuovo complesso</div>
          <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 10px" }}>
            Seleziona un'opera esistente e assegnale un nuovo "Luogo / edificio". Tutte le opere con lo stesso luogo verranno raggruppate automaticamente.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <select
              value={newWorkId}
              onChange={(e) => setNewWorkId(e.target.value)}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, background: "var(--bg)" }}
            >
              <option value="">— Seleziona un'opera da assegnare al complesso —</option>
              {orphanWorks.map(w => (
                <option key={w.id} value={w.id}>{w.title} ({w.location_city || "?"})</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Nome del complesso (es. Basilica di San Francesco)"
              value={newPlace}
              onChange={(e) => setNewPlace(e.target.value)}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, background: "var(--bg)" }}
            />
            <input
              type="text"
              placeholder="Città (opzionale, usa quella dell'opera se vuoto)"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, background: "var(--bg)" }}
            />
            {saveMsg && <div style={{ fontSize: 13, color: saveMsg.startsWith("✓") ? "#3f8a4f" : "#a8483f" }}>{saveMsg}</div>}
            <button className="btn gold sm" onClick={createComplex} disabled={!newWorkId || !newPlace.trim()}>
              💾 Crea complesso
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: "var(--ink-dim)", fontSize: 14 }}>
          Nessun complesso trovato.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((g, i) => {
            const key = `${g.city ?? ""}|${g.name.toLowerCase()}|${i}`;
            const parent = g.parent;
            return (
              <div key={key} style={{
                padding: 14, background: "var(--bg-2)",
                border: "1px solid var(--line)", borderRadius: 10,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    {editingGroupName === key ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          type="text" value={editPlaceName} onChange={(e) => setEditPlaceName(e.target.value)}
                          style={{ padding: "5px 8px", border: "1px solid var(--gold)", borderRadius: 4, fontSize: 14, fontFamily: "inherit", flex: 1 }}
                          autoFocus
                        />
                        <button className="btn gold sm" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => renameComplex(g.name, g.city ?? null)}>Salva</button>
                        <button className="btn ghost sm" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setEditingGroupName(null)}>Annulla</button>
                      </div>
                    ) : (
                      <div style={{ fontWeight: 600, fontSize: 15, cursor: "pointer" }}
                        onClick={() => { setEditingGroupName(key); setEditPlaceName(g.name); }}
                        title="Clicca per rinominare">
                        {g.name}
                      </div>
                    )}
                    <div style={{ fontSize: 11.5, color: "var(--ink-dim)" }}>
                      {g.city ? <>📍 {g.city} · </> : null}
                      <b>{g.works.length}</b> opere · capofila: <Link to={`/opera/${parent.id}`} style={{ color: "var(--gold-deep)", textDecoration: "underline" }}>{parent.title}</Link>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button onClick={() => { setEditingGroupName(key); setEditPlaceName(g.name); }}
                      style={{ background: "none", border: "1px solid var(--line)", borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontSize: 12 }}
                      title="Rinomina complesso">✎</button>
                    <button onClick={() => setAddWorkToGroup(addWorkToGroup === key ? null : key)}
                      style={{ background: "none", border: "1px solid var(--line)", borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontSize: 12 }}
                      title="Aggiungi opera al complesso">+</button>
                    <button onClick={() => deleteComplex(g.name, g.city ?? null)}
                      style={{ background: "none", border: "1px solid var(--line)", borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontSize: 12, color: "#a8483f" }}
                      title="Elimina complesso">🗑️</button>
                  </div>
                </div>

                {/* Form aggiungi opera */}
                {addWorkToGroup === key && (
                  <div style={{ marginTop: 10, padding: 10, background: "var(--bg)", borderRadius: 6, border: "1px solid var(--gold)" }}>
                    <div style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 6 }}>Aggiungi un'opera al complesso "{g.name}":</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <select
                        value={addWorkId}
                        onChange={(e) => setAddWorkId(e.target.value)}
                        style={{ flex: 1, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 4, fontSize: 13, fontFamily: "inherit" }}
                      >
                        <option value="">— Seleziona un'opera —</option>
                        {orphanWorks.map(w => (
                          <option key={w.id} value={w.id}>{w.title} ({w.location_city || "?"})</option>
                        ))}
                      </select>
                      <button className="btn gold sm" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => addWorkToComplex(g.name)}>Aggiungi</button>
                      <button className="btn ghost sm" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => setAddWorkToGroup(null)}>Annulla</button>
                    </div>
                  </div>
                )}

                {/* Opere del complesso con pulsante rimuovi */}
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  {g.works.map((w) => (
                    <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <button
                        onClick={() => openEdit(w.id)}
                        style={{
                          fontSize: 12, padding: "4px 10px", borderRadius: "6px 0 0 6px",
                          background: "var(--bg)", border: "1px solid var(--line)", borderRight: 0,
                          color: "var(--ink-soft)", cursor: "pointer", fontFamily: "inherit",
                        }}
                        title={`Modifica "${w.title}"`}
                      >
                        ✎ {w.title.length > 32 ? w.title.slice(0, 30) + "…" : w.title}
                      </button>
                      <button
                        onClick={() => removeWorkFromComplex(w.id)}
                        style={{
                          fontSize: 12, padding: "4px 6px", borderRadius: "0 6px 6px 0",
                          background: "var(--bg)", border: "1px solid var(--line)",
                          color: "#a8483f", cursor: "pointer", fontFamily: "inherit",
                        }}
                        title="Rimuovi dal complesso"
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// GenericEditorDrawer — per tabelle diverse da works (artisti, periodi, ecc.)
// Architettura a 2 livelli (come EditorDrawer) per evitare perdita di focus.
//
// FIX FOCUS-LOSS: usiamo un pattern di "stato mutabile tramite ref + versione".
//   - rowRef.current è l'oggetto row MUTABILE (modificato in place)
//   - versionCounter si incrementa solo quando vogliamo forzare il re-render
//   - Gli input sono UNCONTROLLED: leggono da rowRef.current e scrivono in rowRef.current
//   - In questo modo, digitare non causa re-rendering → il focus NON si perde
// ============================================================================

// Traduzioni dei nomi dei campi tecnici in italiano comprensibile
const FIELD_LABELS_IT: Record<string, string> = {
  id: "ID (slug)",
  name: "Nome",
  title: "Titolo",
  term: "Termine",
  aka: "Alias / nomi alternativi",
  birth: "Anno nascita",
  death: "Anno morte",
  period_ids: "Periodi associati",
  period_id: "Periodo",
  parent_id: "Periodo genitore",
  role: "Ruolo",
  bio: "Biografia",
  innovations: "Innovazioni",
  type: "Tipo",
  year_start: "Anno inizio",
  year_end: "Anno fine",
  year: "Anno",
  regions: "Regioni",
  summary: "Sintesi",
  historical_context: "Contesto storico",
  key_innovations: "Innovazioni chiave",
  definition: "Definizione",
  introduced_by: "Introdotto da (artista)",
  first_period_id: "Prima comparsa (periodo)",
  evolution: "Evoluzione",
  category: "Categoria",
  description: "Descrizione",
  kind: "Tipo",
  is_archetype: "È un archetipo",
  source_type: "Tipo entità origine",
  source_id: "Entità origine",
  target_type: "Tipo entità destinazione",
  target_id: "Entità destinazione",
  date_text: "Datazione testuale",
  artist_ids: "Artisti",
  technique_ids: "Tecniche",
  materials: "Materiali",
  location_city: "Città",
  location_place: "Luogo / edificio",
  lat: "Latitudine",
  lon: "Longitudine",
  book: "Libro",
  chapter: "Capitolo",
  page: "Pagina",
  source_file: "File sorgente",
  importance: "Importanza",
  analysis: "Analisi",
  term_ids: "Termini glossario",
  image_url: "URL immagine",
  image_thumb: "URL thumbnail",
  image_source: "Fonte immagine",
};

// Campi che dovrebbero essere textarea (testo lungo)
const LONG_TEXT_FIELDS = new Set([
  "definition", "evolution", "analysis", "bio",
  "summary", "description", "historical_context", "date_text",
]);

// Campi con select predefiniti (enum)
const SELECT_OPTIONS: Record<string, string[]> = {
  "techniques.category": ["pittorica", "scultorea", "architettonica", "musiva", "altra"],
  "works.type": ["architettura", "pittura", "scultura", "mosaico", "miniatura",
    "oreficeria", "urbanistica", "tela", "tavola", "polittico", "rilievo",
    "affresco", "altro"],
  "works.book": ["1", "2"],
  "works.importance": ["1", "2", "3"],
  "works.image_source": ["commons", "wikiart", "museo", "altro"],
  "periods.type": ["epoca", "corrente", "popolo"],
  "terms.category": ["architettura", "pittura", "scultura", "iconografia", "generale"],
  "events.kind": ["politico", "religioso", "culturale", "tecnologico"],
  "connections.kind": ["influenza", "contaminazione", "rielaborazione",
    "evoluzione", "contrasto", "committenza", "maestro-allievo"],
  "connections.source_type": ["period", "artist", "work", "technique", "event", "term"],
  "connections.target_type": ["period", "artist", "work", "technique", "event", "term"],
};

// Campi che referenziano entità in altre tabelle (per i selettori intelligenti)
// Mappa: nomeCampo → { table, mode } dove table è la tabella DB da cui pescare
const REF_FIELDS: Record<string, { table: string; mode: "single" | "multi" }> = {
  "artists.period_ids": { table: "periods", mode: "multi" },
  "techniques.first_period_id": { table: "periods", mode: "single" },
  "techniques.introduced_by": { table: "artists", mode: "single" },
  "terms.period_ids": { table: "periods", mode: "multi" },
  "events.period_id": { table: "periods", mode: "single" },
  "periods.parent_id": { table: "periods", mode: "single" },
  "connections.source_id": { table: "auto", mode: "single" }, // dipende da source_type
  "connections.target_id": { table: "auto", mode: "single" }, // dipende da target_type
};

// Stili e Field per il GenericEditorDrawer — DEFINITI A LIVELLO DI MODULO.
// Se fossero dentro Inner, ad ogni re-render sarebbero funzioni nuove
// → React smonterebbe e rimonterebbe i children → focus perso sugli input.
const genLabelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600,
  color: "var(--ink-dim)", marginBottom: 4, textTransform: "uppercase",
  letterSpacing: "0.04em",
};
const genInputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", border: "1px solid var(--line)",
  borderRadius: 6, background: "var(--bg)", color: "var(--ink)",
  fontSize: 13, fontFamily: "inherit",
};
function GenField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label style={genLabelStyle}>
        {label}
        {required && <span style={{ color: "#a8483f", marginLeft: 4 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// INNER: NON ha useData(). Tutte le props sono stabili.
function GenericEditorDrawerInner({
  table,
  rowId,
  open,
  onClose,
  userEmail,
  initialRow,
  isNew,
  dataset,
}: {
  table: Tab;
  rowId: string;
  open: boolean;
  onClose: () => void;
  userEmail: string | null;
  initialRow: any | null;
  isNew: boolean;
  dataset: { periods: any[]; artists: any[]; techniques: any[]; terms: any[]; works: any[]; events: any[]; connections: any[] };
}) {
  // Stato mutabile tramite ref: l'oggetto row viene modificato in place.
  // Solo quando cambiano initialRow/rowId, viene ricreato da zero.
  const rowRef = useRef<any>(initialRow ? { ...initialRow } : { id: rowId });
  // Version counter: si incrementa quando vogliamo forzare il re-render
  // (es. dopo un salvataggio riuscito, per aggiornare il titolo nell'header).
  const [, forceRender] = useState(0);
  const forceUpdate = () => forceRender(v => v + 1);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (initialRow) {
      const clean = { ...initialRow };
      for (const k of Object.keys(clean)) if (k.startsWith("_")) delete clean[k];
      rowRef.current = clean;
    } else {
      rowRef.current = { id: rowId };
    }
    setError(null);
    setOk(false);
    forceUpdate();
  }, [initialRow, rowId]);

  if (!open) return null;

  const row = rowRef.current;
  if (!row) return null;

  const META_FIELDS = ["created_at", "updated_at", "modified_by"];
  const fields = Object.keys(row).filter((k) => !META_FIELDS.includes(k) && !k.startsWith("_"));

  // Helper per aggiornare un campo senza causare re-render (input non controllati)
  const setField = (field: string, value: any) => {
    rowRef.current = { ...rowRef.current, [field]: value };
    setOk(false);
  };

  // Helper per ottenere le opzioni di un selettore entità
  const getEntityOptions = (refTable: string) => {
    switch (refTable) {
      case "periods": return dataset.periods.map(p => ({ id: p.id, label: p.name, subtitle: `${p.year_start}–${p.year_end}` }));
      case "artists": return dataset.artists.map(a => ({ id: a.id, label: a.name, subtitle: a.role || undefined }));
      case "techniques": return dataset.techniques.map(t => ({ id: t.id, label: t.name, subtitle: t.category }));
      case "terms": return dataset.terms.map(t => ({ id: t.id, label: t.term, subtitle: t.category }));
      case "works": return dataset.works.map(w => ({ id: w.id, label: w.title, subtitle: w.location_city || undefined }));
      case "events": return dataset.events.map(e => ({ id: e.id, label: e.title, subtitle: String(e.year) }));
      default: return [];
    }
  };

  const save = async () => {
    if (!userEmail) return;
    setError(null);
    setOk(false);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rowRef.current)) {
        if (k.startsWith("_")) continue;
        if (k === "created_at" || k === "updated_at") continue;
        payload[k] = v;
      }
      payload.modified_by = userEmail;

      // Validazione minima per nuove righe
      if (isNew) {
        if (!payload.id || String(payload.id).trim() === "") {
          throw new Error("L'ID è obbligatorio per creare una nuova riga.");
        }
        if (table === "techniques" && (!payload.name || String(payload.name).trim() === "")) {
          throw new Error("Il nome della tecnica è obbligatorio.");
        }
        if (table === "works" && (!payload.title || String(payload.title).trim() === "")) {
          throw new Error("Il titolo dell'opera è obbligatorio.");
        }
        if (table === "artists" && (!payload.name || String(payload.name).trim() === "")) {
          throw new Error("Il nome dell'artista è obbligatorio.");
        }
        if (table === "periods" && (!payload.name || String(payload.name).trim() === "")) {
          throw new Error("Il nome del periodo è obbligatorio.");
        }
        if (table === "terms" && (!payload.term || String(payload.term).trim() === "")) {
          throw new Error("Il termine è obbligatorio.");
        }
        if (table === "events" && (!payload.title || String(payload.title).trim() === "")) {
          throw new Error("Il titolo dell'evento è obbligatorio.");
        }
      }

      const { error } = await supabase.from(table).upsert(payload, { onConflict: "id" });
      if (error) throw error;
      setOk(true);
      window.dispatchEvent(new Event("hubart-works-changed"));
      try {
        const bc = new BroadcastChannel("hubart-admin");
        bc.postMessage({ type: "changed", ts: Date.now() });
        bc.close();
      } catch {}
      forceUpdate(); // aggiorna header col nuovo nome
    } catch (e: any) {
      setError(`Errore: ${e.message || "sconosciuto"}`);
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    const label = row.name || row.term || row.title || row.id;
    const confirmed = window.confirm(
      `⚠️ CONFERMA ELIMINAZIONE\n\n` +
      `Stai per eliminare definitivamente dal database (${table}):\n\n` +
      `Nome: ${label}\n` +
      `ID: ${row.id}\n\n` +
      `Questa azione è irreversibile.\n\n` +
      `Vuoi procedere?`
    );
    if (!confirmed) return;
    setSaving(true);
    setError(null);
    try {
      // Prova a eliminare dal DB (se esiste)
      await supabase.from(table).delete().eq("id", row.id);
      // Inserisci in hidden_entities per nascondere eventuali record JSON
      await supabase.from("hidden_entities").upsert(
        { id: row.id, table_name: table, hidden_by: userEmail },
        { onConflict: "id" }
      );
      window.dispatchEvent(new Event("hubart-works-changed"));
      try {
        const bc = new BroadcastChannel("hubart-admin");
        bc.postMessage({ type: "changed", ts: Date.now() });
        bc.close();
      } catch {}
      onClose();
    } catch (e: any) {
      setError(`Errore: ${e.message || "sconosciuto"}`);
    } finally {
      setSaving(false);
    }
  };

  // Stili e Field sono definiti a livello di modulo (genLabelStyle, genInputStyle, GenField)
  // per evitare che vengano ricreati ad ogni re-render → focus loss.

  // Etichetta leggibile per il tipo di tabella
  const tableLabel = table === "complessi" ? "complesso" : table;

  return (
    <>
      <aside
        style={{
          position: "fixed", inset: 0, zIndex: 910,
          background: "var(--bg)", overflowY: "auto",
          display: "flex", flexDirection: "column",
          animation: "fadeIn .2s",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "16px max(20px, calc((100vw - 720px) / 2)) 14px",
          borderBottom: "1px solid var(--line)",
          position: "sticky", top: 0, background: "var(--bg)", zIndex: 1,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
              {tableLabel} · {isNew ? "NUOVA RIGA" : "Admin"}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, marginTop: 2 }}>
              {isNew
                ? `Nuova riga in ${tableLabel}`
                : (row.name || row.term || row.title || row.id)}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: 0, cursor: "pointer",
              color: "var(--ink-dim)", fontSize: 22, lineHeight: 1,
              padding: "4px 8px", borderRadius: 6,
            }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{
          padding: "24px max(20px, calc((100vw - 720px) / 2)) 100px",
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          {error && (
            <div style={{ padding: "10px 12px", background: "rgba(168,72,63,0.08)", color: "#a8483f", borderRadius: 6, fontSize: 13 }}>
              ⚠️ {error}
            </div>
          )}
          {ok && (
            <div style={{ padding: "10px 12px", background: "rgba(63,138,79,0.08)", color: "#3f8a4f", borderRadius: 6, fontSize: 13 }}>
              ✓ Salvato nel database
            </div>
          )}

          {/* Banner "NUOVA RIGA" se isNew */}
          {isNew && (
            <div style={{
              padding: "10px 12px", background: "rgba(212,160,23,0.1)",
              color: "var(--gold-deep)", borderRadius: 6, fontSize: 13,
              border: "1px solid rgba(212,160,23,0.3)",
            }}>
              ✨ Stai creando una nuova riga in <b>{tableLabel}</b>.
              Compila almeno i campi obbligatori (ID + nome/titolo) e premi Salva.
            </div>
          )}

          {fields.map((field) => {
            const value = row[field];
            const isArray = Array.isArray(value);
            const isBoolean = typeof value === "boolean";
            const isNumber = typeof value === "number";
            const isNull = value == null;

            // Etichetta italiana
            const label = FIELD_LABELS_IT[field] || field;
            const required = isNew && (field === "id" || field === "name" || field === "title" || field === "term");

            // Campi in sola lettura (ID per righe esistenti)
            const isReadOnlyId = field === "id" && !isNew;

            // Select predefinite (enum)
            const selectKey = `${table}.${field}`;
            const selectOpts = SELECT_OPTIONS[selectKey];

            // Riferimenti a entità in altre tabelle
            const refConfig = REF_FIELDS[selectKey];

            // Per connections: source_id/target_id dipendono dal source_type/target_type
            const isConnectionRef = table === "connections" && (field === "source_id" || field === "target_id");
            let connectionRefTable: string | null = null;
            if (isConnectionRef) {
              const typeField = field === "source_id" ? "source_type" : "target_type";
              const typeValue = row[typeField];
              if (typeValue === "period") connectionRefTable = "periods";
              else if (typeValue === "artist") connectionRefTable = "artists";
              else if (typeValue === "work") connectionRefTable = "works";
              else if (typeValue === "technique") connectionRefTable = "techniques";
              else if (typeValue === "event") connectionRefTable = "events";
              else if (typeValue === "term") connectionRefTable = "terms";
            }

            // Campi con selettore entità (EntitySelector)
            if (refConfig && refConfig.table !== "auto") {
              return (
                <GenField key={field} label={label}>
                  <EntitySelector
                    mode={refConfig.mode}
                    options={getEntityOptions(refConfig.table)}
                    selected={value}
                    onChange={(v) => setField(field, v)}
                    placeholder={`Cerca ${refConfig.table}…`}
                  />
                </GenField>
              );
            }

            // Connections source_id/target_id con tipo dinamico
            if (isConnectionRef) {
              if (!connectionRefTable) {
                return (
                  <GenField key={field} label={label}>
                    <div style={{ ...genInputStyle, opacity: 0.6, fontStyle: "italic" }}>
                      Seleziona prima il «{field === "source_id" ? "Tipo entità origine" : "Tipo entità destinazione"}»
                    </div>
                  </GenField>
                );
              }
              return (
                <GenField key={field} label={`${label} (${connectionRefTable})`}>
                  <EntitySelector
                    mode="single"
                    options={getEntityOptions(connectionRefTable)}
                    selected={value}
                    onChange={(v) => setField(field, v)}
                    placeholder={`Cerca ${connectionRefTable}…`}
                  />
                </GenField>
              );
            }

            // Campi in sola lettura (ID per righe esistenti)
            if (isReadOnlyId) {
              return (
                <GenField key={field} label={label}>
                  <input type="text" defaultValue={String(value ?? "")} disabled style={{ ...genInputStyle, opacity: 0.6, cursor: "not-allowed" }} />
                </GenField>
              );
            }

            // Select predefinite (enum)
            if (selectOpts) {
              return (
                <GenField key={field} label={label}>
                  <select
                    defaultValue={String(value ?? "")}
                    onChange={(e) => {
                      const v = e.target.value;
                      setField(field, isNumber ? Number(v) : v);
                    }}
                    style={genInputStyle}
                  >
                    {selectOpts.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </GenField>
              );
            }

            // Array (textarea, un valore per riga)
            if (isArray) {
              return (
                <GenField key={field} label={label}>
                  <textarea
                    defaultValue={value.join("\n")}
                    onChange={(e) => setField(field, e.target.value.split("\n").map(s => s.trim()).filter(Boolean))}
                    style={{ ...genInputStyle, minHeight: 60, resize: "vertical", fontFamily: "ui-monospace, monospace", fontSize: 12 }}
                    placeholder="Un valore per riga"
                  />
                </GenField>
              );
            }

            // Testo lungo (textarea)
            if (LONG_TEXT_FIELDS.has(field)) {
              return (
                <GenField key={field} label={label}>
                  <textarea
                    defaultValue={String(value ?? "")}
                    onChange={(e) => setField(field, e.target.value || null)}
                    style={{ ...genInputStyle, minHeight: 80, resize: "vertical" }}
                  />
                </GenField>
              );
            }

            // Boolean
            if (isBoolean) {
              return (
                <GenField key={field} label={label}>
                  <select
                    defaultValue={String(value)}
                    onChange={(e) => setField(field, e.target.value === "true")}
                    style={genInputStyle}
                  >
                    <option value="false">No</option>
                    <option value="true">Sì</option>
                  </select>
                </GenField>
              );
            }

            // Numero
            if (isNumber) {
              return (
                <GenField key={field} label={label}>
                  <input
                    type="number"
                    defaultValue={value ?? ""}
                    onChange={(e) => setField(field, e.target.value ? Number(e.target.value) : null)}
                    style={genInputStyle}
                  />
                </GenField>
              );
            }

            // Null (campo vuoto)
            if (isNull) {
              return (
                <GenField key={field} label={label}>
                  <input
                    type="text"
                    defaultValue=""
                    placeholder="(vuoto)"
                    onChange={(e) => setField(field, e.target.value || null)}
                    style={genInputStyle}
                  />
                </GenField>
              );
            }

            // Stringa normale
            return (
              <GenField key={field} label={label} required={required}>
                <input
                  type="text"
                  defaultValue={String(value)}
                  onChange={(e) => setField(field, e.target.value)}
                  style={genInputStyle}
                />
              </GenField>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          position: "sticky", bottom: 0, left: 0, right: 0,
          padding: "12px max(20px, calc((100vw - 720px) / 2))", borderTop: "1px solid var(--line)",
          background: "var(--bg)", display: "flex", gap: 8, justifyContent: "flex-end",
          boxShadow: "0 -4px 12px rgba(0,0,0,0.04)",
        }}>
          {!isNew && (
            <button
              className="btn ghost sm"
              onClick={del}
              disabled={saving}
              style={{ marginRight: "auto", color: "#a8483f", borderColor: "#a8483f" }}
            >🗑️ Elimina</button>
          )}
          <button className="btn ghost sm" onClick={onClose} disabled={saving}>Annulla</button>
          <button
            className="btn gold sm"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Salvataggio…" : isNew ? "✨ Crea" : "💾 Salva"}
          </button>
        </div>
      </aside>
    </>
  );
}

const GenericEditorDrawerInnerMemo = memo(GenericEditorDrawerInner, (prev, next) =>
  prev.table === next.table &&
  prev.rowId === next.rowId &&
  prev.open === next.open &&
  prev.onClose === next.onClose &&
  prev.userEmail === next.userEmail &&
  prev.initialRow === next.initialRow &&
  prev.isNew === next.isNew &&
  prev.dataset === next.dataset
);

// Template di default per nuove righe (così l'editor mostra i campi giusti
// con valori sensati invece di un form vuoto con solo "id").
const NEW_ROW_TEMPLATES: Record<Tab, () => any> = {
  works: () => ({
    id: "", title: "", artist_ids: [], period_id: null, date_text: "",
    year_start: null, year_end: null, type: "altro", technique_ids: [],
    materials: [], location_city: null, location_place: null,
    lat: null, lon: null, book: 1, chapter: 0, page: 0, source_file: "",
    importance: 2, summary: "", analysis: null, innovations: [], term_ids: [],
    image_url: "", image_thumb: "", image_source: "commons",
  }),
  artists: () => ({
    id: "", name: "", aka: [], birth: null, death: null,
    period_ids: [], role: "", bio: "", innovations: [],
  }),
  periods: () => ({
    id: "", name: "", type: "epoca", year_start: 1400, year_end: 1500,
    regions: [], summary: "", historical_context: "", parent_id: null,
    key_innovations: [],
  }),
  techniques: () => ({
    id: "", name: "", definition: "", introduced_by: null,
    first_period_id: null, evolution: "", category: "altra",
  }),
  terms: () => ({
    id: "", term: "", definition: "", category: "generale",
    period_ids: [], is_archetype: false,
  }),
  events: () => ({
    id: "", year: 1400, year_end: null, title: "", description: "",
    kind: "culturale", period_id: null,
  }),
  connections: () => ({
    id: "", source_type: "work", source_id: "", target_type: "work",
    target_id: "", kind: "influenza", description: "",
  }),
  complessi: () => ({ id: "", name: "", works: [] }),
};

// OUTER: legge ix, congel initialRow quando il drawer è aperto
function GenericEditorDrawer({
  table,
  rowId,
  open,
  onClose,
  isNew,
}: {
  table: Tab;
  rowId: string;
  open: boolean;
  onClose: () => void;
  isNew: boolean;
}) {
  const ix = useData();
  const { user } = useAuth();
  const [frozenRow, setFrozenRow] = useState<any>(null);
  // Congela anche il dataset quando il drawer è aperto (così le modifiche al DB
  // non causano re-render dell'editor mentre l'utente sta digitando).
  const [frozenDataset, setFrozenDataset] = useState<any>(null);

  useEffect(() => {
    if (open) {
      if (!frozenRow) {
        // Se è una nuova riga, usa il template precompilato
        if (isNew) {
          const template = NEW_ROW_TEMPLATES[table]();
          template.id = rowId === "nuovo" ? "" : rowId;
          setFrozenRow(template);
        } else {
          let arr: any[] = [];
          switch (table) {
            case "works": arr = ix.ds.works; break;
            case "artists": arr = ix.ds.artists; break;
            case "periods": arr = ix.ds.periods; break;
            case "techniques": arr = ix.ds.techniques; break;
            case "terms": arr = ix.ds.terms; break;
            case "events": arr = ix.ds.events; break;
            case "connections": arr = ix.ds.connections; break;
          }
          const existing = arr.find(r => r.id === rowId);
          setFrozenRow(existing || null);
        }
        // Congela il dataset per i selettori entità
        setFrozenDataset({
          periods: ix.ds.periods,
          artists: ix.ds.artists,
          techniques: ix.ds.techniques,
          terms: ix.ds.terms,
          works: ix.ds.works,
          events: ix.ds.events,
          connections: ix.ds.connections,
        });
      }
    } else {
      if (frozenRow !== null) setFrozenRow(null);
      if (frozenDataset !== null) setFrozenDataset(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rowId, table, ix, isNew]);

  if (!open) return null;

  return (
    <GenericEditorDrawerInnerMemo
      table={table}
      rowId={rowId}
      open={open}
      onClose={onClose}
      userEmail={user?.email || null}
      initialRow={frozenRow}
      isNew={isNew}
      dataset={frozenDataset || { periods: [], artists: [], techniques: [], terms: [], works: [], events: [], connections: [] }}
    />
  );
}
