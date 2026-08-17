// ============================================================================
// ArtistEditorDrawer — finestra laterale a destra (o fullscreen) per modificare
// un artista in-place, con selettori intelligenti per ogni campo.
//
// Architettura a 2 livelli (come EditorDrawer):
//   - ArtistEditorDrawerOuter (con useData): legge ix, ma passa un SNAPSHOT
//     immutabile a Inner.
//   - ArtistEditorDrawerInner (memo, NO useData): gestisce tutto lo state del form.
//
// Permette di:
//   - Modificare tutti i campi di Artist (nome, aka, nascita, morte, periodi, ruolo, bio, innovazioni)
//   - Creare un artista nuovo
//   - Eliminare un artista (DB + hidden_entities per oscurare JSON)
//   - Gestire le connessioni (maestro-allievo, influenza, ecc.) che coinvolgono l'artista
//     - Lista connessioni esistenti con eliminazione
//     - Form per aggiungere nuova connessione (tipo, target, descrizione)
// ============================================================================
import { useState, useEffect, useRef, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useData } from "../lib/store";
import EntitySelector from "./EntitySelector";
import type { Artist, Period, Connection, Dataset, EntityType } from "../lib/types";
import { ENTITY_LABEL, KIND_LABEL, entityLabel } from "../lib/data";

function slugify(s: string): string {
  return String(s).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim()
    .replace(/\s+/g, "-").replace(/-+/g, "-")
    .slice(0, 80);
}

// Stili condivisi (definiti a livello di modulo)
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600,
  color: "var(--ink-dim)", marginBottom: 4, textTransform: "uppercase",
  letterSpacing: "0.04em",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", border: "1px solid var(--line)",
  borderRadius: 6, background: "var(--bg)", color: "var(--ink)",
  fontSize: 13, fontFamily: "inherit",
};
function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: "#a8483f", marginLeft: 4 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// Campi del DB artists
const ARTIST_DB_FIELDS = [
  "id", "name", "aka", "birth", "death", "period_ids", "role", "bio", "innovations",
] as const;

function buildCleanPayload(artist: Artist, modifiedBy: string): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of ARTIST_DB_FIELDS) {
    if (field === "id" || field === "name" || field === "aka" || field === "period_ids" || field === "role" || field === "bio" || field === "innovations" || field === "birth" || field === "death") {
      payload[field] = (artist as any)[field];
    }
  }
  payload.modified_by = modifiedBy;
  // Normalizza empty string → null
  if (payload.role === "") payload.role = null;
  if (payload.bio === "") payload.bio = null;
  return payload;
}

// Tipi entità per la select delle connessioni
const ENTITY_TYPES: EntityType[] = ["period", "artist", "work", "technique", "event", "term"];
const CONN_KINDS = ["influenza", "contaminazione", "rielaborazione", "evoluzione", "contrasto", "committenza", "maestro-allievo"];

// Snapshot del dataset passato a Inner
interface DatasetSnapshot {
  periods: Period[];
  artists: Artist[];
  works: any[];
  techniques: any[];
  terms: any[];
  events: any[];
  connections: Connection[];
  // Mappe indicizzate per resolveEntity / entityLabel
  periodById: Map<string, Period>;
  artistById: Map<string, Artist>;
  workById: Map<string, any>;
  techById: Map<string, any>;
  termById: Map<string, any>;
  eventById: Map<string, any>;
}

// ═══════════════════════════════════════════════════════════════════════
//  INNER — il vero drawer. NON ha useData(). Tutte le props sono stabili.
// ═══════════════════════════════════════════════════════════════════════
function ArtistEditorDrawerInner({
  artistId,
  open,
  onClose,
  fullscreen,
  userEmail,
  dataset,
  initialArtist,
  initialConnections,
}: {
  artistId: string | null;
  open: boolean;
  fullscreen: boolean;
  onClose: () => void;
  userEmail: string | null;
  dataset: DatasetSnapshot;
  initialArtist: Artist | null;
  initialConnections: Connection[];
}) {
  const artistRef = useRef<Artist | null>(initialArtist);
  const idFieldRef = useRef<string>(initialArtist?.id || "");
  const [, forceRender] = useState(0);
  const forceUpdate = () => forceRender(v => v + 1);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isNew, setIsNew] = useState(!initialArtist);

  // Stato connessioni (lista + form per aggiungere)
  const [connections, setConnections] = useState<Connection[]>(initialConnections);
  const [showConnForm, setShowConnForm] = useState(false);
  const [newConnKind, setNewConnKind] = useState<string>("maestro-allievo");
  const [newConnDirection, setNewConnDirection] = useState<"outgoing" | "incoming">("outgoing");
  const [newConnEntityType, setNewConnEntityType] = useState<EntityType>("artist");
  const [newConnEntityId, setNewConnEntityId] = useState<string>("");
  const [newConnDesc, setNewConnDesc] = useState("");

  // Stato per EDIT connessione esistente
  const [editingConnId, setEditingConnId] = useState<string | null>(null);
  const [editConnKind, setEditConnKind] = useState<string>("maestro-allievo");
  const [editConnDirection, setEditConnDirection] = useState<"outgoing" | "incoming">("outgoing");
  const [editConnEntityType, setEditConnEntityType] = useState<EntityType>("artist");
  const [editConnEntityId, setEditConnEntityId] = useState<string>("");
  const [editConnDesc, setEditConnDesc] = useState("");

  // Periodi locali (creati inline durante la sessione)
  const [localPeriods, setLocalPeriods] = useState<Period[]>([]);

  useEffect(() => {
    if (initialArtist) {
      artistRef.current = { ...initialArtist };
      idFieldRef.current = initialArtist.id;
      setIsNew(false);
    } else if (artistId) {
      artistRef.current = {
        id: artistId, name: "", aka: [], birth: null, death: null,
        period_ids: [], role: "", bio: "", innovations: [],
      };
      idFieldRef.current = artistId;
      setIsNew(true);
    } else {
      artistRef.current = null;
    }
    setConnections(initialConnections);
    setError(null);
    setOk(false);
    setLocalPeriods([]);
    setShowConnForm(false);
    setNewConnEntityId("");
    setNewConnDesc("");
    forceUpdate();
  }, [initialArtist, artistId, initialConnections]);

  // ESC per chiudere
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const allPeriods = useMemo(() => [...dataset.periods, ...localPeriods], [dataset.periods, localPeriods]);

  if (!open) return null;
  const a = artistRef.current;
  if (!a) return null;

  const set = <K extends keyof Artist>(key: K, value: Artist[K]) => {
    artistRef.current = { ...artistRef.current!, [key]: value };
    setOk(false);
  };

  const notifyAppChanged = () => {
    window.dispatchEvent(new Event("hubart-works-changed"));
    try {
      const bc = new BroadcastChannel("hubart-admin");
      bc.postMessage({ type: "changed", ts: Date.now() });
      bc.close();
    } catch {}
  };

  const createPeriod = async (name: string): Promise<string> => {
    const id = slugify(name);
    const newPeriod: Period = { id, name, type: "epoca", year_start: 1400, year_end: 1500, regions: [], summary: "", historical_context: "", parent_id: null, key_innovations: [] };
    const { error } = await supabase.from("periods").upsert({ ...newPeriod, modified_by: userEmail }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    setLocalPeriods(prev => [...prev, newPeriod]);
    notifyAppChanged();
    return id;
  };

  // Opzioni EntitySelector per tipo entità (per form nuova connessione)
  const getEntityOptionsForType = (type: EntityType) => {
    switch (type) {
      case "period": return allPeriods.map(p => ({ id: p.id, label: p.name, subtitle: `${p.year_start}–${p.year_end}` }));
      case "artist": return dataset.artists.filter(x => x.id !== a.id).map(x => ({ id: x.id, label: x.name, subtitle: x.role || undefined }));
      case "work": return dataset.works.map(w => ({ id: w.id, label: w.title, subtitle: w.location_city || undefined }));
      case "technique": return dataset.techniques.map(t => ({ id: t.id, label: t.name, subtitle: t.category }));
      case "term": return dataset.terms.map(t => ({ id: t.id, label: t.term, subtitle: t.category }));
      case "event": return dataset.events.map(e => ({ id: e.id, label: e.title, subtitle: String(e.year) }));
      default: return [];
    }
  };

  const save = async () => {
    if (!artistRef.current || !userEmail) return;
    const current = artistRef.current;
    setError(null);
    setOk(false);
    if (!current.name.trim()) { setError("Il nome è obbligatorio."); return; }

    let finalId = isNew ? (idFieldRef.current.trim() || slugify(current.name)) : current.id;
    if (!finalId) { setError("ID non valido."); return; }

    const payload = buildCleanPayload({ ...current, id: finalId, name: current.name.trim() }, userEmail);

    setSaving(true);
    try {
      const { error } = await supabase.from("artists").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      setOk(true);
      notifyAppChanged();
      artistRef.current = { ...current, id: finalId, name: current.name.trim() };
      idFieldRef.current = finalId;
      setIsNew(false);
      forceUpdate();
    } catch (e: any) {
      setError(`Errore salvataggio: ${e.message || "errore sconosciuto"}`);
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!artistRef.current || isNew) return;
    const current = artistRef.current;
    const confirmed = window.confirm(
      `⚠️ CONFERMA ELIMINAZIONE\n\n` +
      `Stai per eliminare definitivamente:\n\n` +
      `Nome: ${current.name}\n` +
      `ID: ${current.id}\n\n` +
      `L'artista verrà rimosso dal database E oscurato dal file JSON statico.\n` +
      `Questa azione è irreversibile.\n\nVuoi procedere?`
    );
    if (!confirmed) return;
    setSaving(true);
    setError(null);
    try {
      const { error: delErr } = await supabase.from("artists").delete().eq("id", current.id);
      if (delErr) throw delErr;
      await supabase.from("hidden_entities").upsert(
        { id: current.id, table_name: "artists", hidden_by: userEmail },
        { onConflict: "id" }
      );
      notifyAppChanged();
      onClose();
    } catch (e: any) {
      setError(`Errore eliminazione: ${e.message || "errore sconosciuto"}`);
    } finally {
      setSaving(false);
    }
  };

  // === GESTIONE CONNESSIONI ===
  const deleteConnection = async (connId: string) => {
    if (!confirm("Eliminare questa connessione?")) return;
    try {
      const { error } = await supabase.from("connections").delete().eq("id", connId);
      if (error) throw error;
      setConnections(prev => prev.filter(c => c.id !== connId));
      notifyAppChanged();
    } catch (e: any) {
      alert("Errore eliminazione connessione: " + e.message);
    }
  };

  const addConnection = async () => {
    if (!newConnEntityId) { alert("Seleziona un'entità da collegare."); return; }
    const connId = `conn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const isOutgoing = newConnDirection === "outgoing";
    const newConn: Connection = {
      id: connId,
      source_type: isOutgoing ? "artist" : newConnEntityType,
      source_id: isOutgoing ? a.id : newConnEntityId,
      target_type: isOutgoing ? newConnEntityType : "artist",
      target_id: isOutgoing ? newConnEntityId : a.id,
      kind: newConnKind as any,
      description: newConnDesc.trim(),
      sort_order: connections.length, // mette in fondo alla lista
    };
    try {
      const { error } = await supabase.from("connections").upsert({
        ...newConn, modified_by: userEmail,
      }, { onConflict: "id" });
      if (error) throw error;
      setConnections(prev => [...prev, newConn]);
      setShowConnForm(false);
      setNewConnEntityId("");
      setNewConnDesc("");
      notifyAppChanged();
    } catch (e: any) {
      alert("Errore creazione connessione: " + e.message);
    }
  };

  // === EDIT CONNESSIONE ESISTENTE ===
  const startEditConnection = (c: Connection) => {
    const isOutgoing = c.source_type === "artist" && c.source_id === a.id;
    const otherType = isOutgoing ? c.target_type : c.source_type;
    const otherId = isOutgoing ? c.target_id : c.source_id;
    setEditingConnId(c.id);
    setEditConnKind(c.kind);
    setEditConnDirection(isOutgoing ? "outgoing" : "incoming");
    setEditConnEntityType(otherType);
    setEditConnEntityId(otherId);
    setEditConnDesc(c.description || "");
  };

  const cancelEditConnection = () => {
    setEditingConnId(null);
    setEditConnEntityId("");
    setEditConnDesc("");
  };

  const saveEditConnection = async () => {
    if (!editingConnId) return;
    if (!editConnEntityId) { alert("Seleziona un'entità da collegare."); return; }
    const conn = connections.find(c => c.id === editingConnId);
    if (!conn) return;
    const isOutgoing = editConnDirection === "outgoing";
    const updated: Connection = {
      ...conn,
      source_type: isOutgoing ? "artist" : editConnEntityType,
      source_id: isOutgoing ? a.id : editConnEntityId,
      target_type: isOutgoing ? editConnEntityType : "artist",
      target_id: isOutgoing ? editConnEntityId : a.id,
      kind: editConnKind as any,
      description: editConnDesc.trim(),
    };
    try {
      const { error } = await supabase.from("connections").upsert({
        ...updated, modified_by: userEmail,
      }, { onConflict: "id" });
      if (error) throw error;
      setConnections(prev => prev.map(c => c.id === editingConnId ? updated : c));
      cancelEditConnection();
      notifyAppChanged();
    } catch (e: any) {
      alert("Errore salvataggio connessione: " + e.message);
    }
  };

  // === RIORDINO CONNESSIONI (sort_order) ===
  // Le connessioni sono ordinate per sort_order. Lo spostamento scambia
  // i sort_order di due connessioni adiacenti.
  const sortedConnections = useMemo(() => {
    return [...connections].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [connections]);

  const moveConnection = async (connId: string, direction: "up" | "down") => {
    const idx = sortedConnections.findIndex(c => c.id === connId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sortedConnections.length) return;
    const conn1 = sortedConnections[idx];
    const conn2 = sortedConnections[swapIdx];
    const order1 = conn1.sort_order ?? idx;
    const order2 = conn2.sort_order ?? swapIdx;
    // Scambia i sort_order
    try {
      await Promise.all([
        supabase.from("connections").update({ sort_order: order2 }).eq("id", conn1.id),
        supabase.from("connections").update({ sort_order: order1 }).eq("id", conn2.id),
      ]);
      // Aggiorna lo stato locale
      setConnections(prev => prev.map(c => {
        if (c.id === conn1.id) return { ...c, sort_order: order2 };
        if (c.id === conn2.id) return { ...c, sort_order: order1 };
        return c;
      }));
      notifyAppChanged();
    } catch (e: any) {
      alert("Errore riordino connessione: " + e.message);
    }
  };

  const bodyPad = fullscreen ? "24px max(20px, calc((100vw - 720px) / 2)) 100px" : "16px 20px 80px";

  return (
    <AnimatePresence>
      {open && (
        <>
          {!fullscreen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }} onClick={onClose}
              style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
            />
          )}
          <motion.aside
            initial={fullscreen ? { opacity: 0, y: 20 } : { x: "100%" }}
            animate={fullscreen ? { opacity: 1, y: 0 } : { x: 0 }}
            exit={fullscreen ? { opacity: 0, y: 20 } : { x: "100%" }}
            transition={fullscreen ? { duration: 0.25 } : { type: "spring", damping: 28, stiffness: 320 }}
            style={fullscreen ? {
              position: "fixed", inset: 0, zIndex: 910, background: "var(--bg)",
              overflowY: "auto", display: "flex", flexDirection: "column",
            } : {
              position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 910,
              width: "min(540px, 92vw)", background: "var(--bg)",
              borderLeft: "1px solid var(--line)", overflowY: "auto",
              boxShadow: "-8px 0 30px rgba(0,0,0,0.12)",
              display: "flex", flexDirection: "column",
            }}
          >
            {/* Header */}
            <div style={{
              padding: fullscreen ? "16px max(20px, calc((100vw - 720px) / 2)) 14px" : "16px 20px 14px",
              borderBottom: "1px solid var(--line)",
              position: "sticky", top: 0, background: "var(--bg)", zIndex: 1,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                  {isNew ? "Nuovo artista" : "Modifica artista"} · Admin
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, marginTop: 2 }}>
                  {a.name || "(senza nome)"}
                </div>
              </div>
              <button onClick={onClose} style={{ background: "none", border: 0, cursor: "pointer", color: "var(--ink-dim)", fontSize: 22, lineHeight: 1, padding: "4px 8px", borderRadius: 6 }} aria-label="Chiudi">✕</button>
            </div>

            {/* Body */}
            <div style={{ padding: bodyPad, display: "flex", flexDirection: "column", gap: 14 }}>
              {error && (
                <div style={{ padding: "10px 12px", background: "rgba(168,72,63,0.08)", color: "#a8483f", borderRadius: 6, fontSize: 13 }}>⚠️ {error}</div>
              )}
              {ok && (
                <div style={{ padding: "10px 12px", background: "rgba(63,138,79,0.08)", color: "#3f8a4f", borderRadius: 6, fontSize: 13 }}>✓ Artista salvato nel database</div>
              )}

              <Field label="ID (slug)" required={isNew}>
                <input type="text" defaultValue={idFieldRef.current}
                  onChange={(e) => { idFieldRef.current = e.target.value; if (isNew) set("id", e.target.value as any); }}
                  disabled={!isNew}
                  style={{ ...inputStyle, opacity: isNew ? 1 : 0.6, fontFamily: "ui-monospace, monospace", fontSize: 12 }}
                />
              </Field>

              <Field label="Nome" required>
                <input type="text" defaultValue={a.name} onChange={(e) => set("name", e.target.value)} style={inputStyle} placeholder="es. Giotto di Bondone" />
              </Field>

              <Field label="Alias / nomi alternativi (uno per riga)">
                <textarea
                  defaultValue={a.aka.join("\n")}
                  onChange={(e) => set("aka", e.target.value.split("\n").map(s => s.trim()).filter(Boolean))}
                  style={{ ...inputStyle, minHeight: 60, resize: "vertical", fontFamily: "ui-monospace, monospace", fontSize: 12 }}
                  placeholder="es. Giotto&#10;Angiolo di Bondone"
                />
              </Field>

              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <Field label="Anno nascita">
                    <input type="number" defaultValue={a.birth ?? ""} onChange={(e) => set("birth", e.target.value ? Number(e.target.value) : null)} style={inputStyle} />
                  </Field>
                </div>
                <div style={{ flex: 1 }}>
                  <Field label="Anno morte">
                    <input type="number" defaultValue={a.death ?? ""} onChange={(e) => set("death", e.target.value ? Number(e.target.value) : null)} style={inputStyle} />
                  </Field>
                </div>
              </div>

              <Field label="Ruolo">
                <input type="text" defaultValue={a.role} onChange={(e) => set("role", e.target.value)} style={inputStyle} placeholder="es. Pittore e architetto" />
              </Field>

              <Field label="Periodi associati">
                <EntitySelector
                  mode="multi"
                  options={allPeriods.map(p => ({ id: p.id, label: p.name, subtitle: `${p.year_start}–${p.year_end}` }))}
                  selected={a.period_ids}
                  onChange={(v) => set("period_ids", (v as string[]) || [])}
                  placeholder="Cerca periodo…"
                  allowCreate={true}
                  onCreate={createPeriod}
                  createLabel="Nuovo periodo"
                />
              </Field>

              <Field label="Biografia">
                <textarea
                  defaultValue={a.bio}
                  onChange={(e) => set("bio", e.target.value)}
                  style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
                  placeholder="Biografia dell'artista…"
                />
              </Field>

              <Field label="Innovazioni (una per riga)">
                <textarea
                  defaultValue={a.innovations.join("\n")}
                  onChange={(e) => set("innovations", e.target.value.split("\n").map(s => s.trim()).filter(Boolean))}
                  style={{ ...inputStyle, minHeight: 80, resize: "vertical", fontFamily: "ui-monospace, monospace", fontSize: 12 }}
                  placeholder="es. Introduce la prospettiva&#10;Innova la rappresentazione spaziale"
                />
              </Field>

              {/* === SEZIONE CONNESSIONI === */}
              {!isNew && (
                <div style={{
                  marginTop: 10, padding: 14, background: "var(--bg-2)",
                  borderRadius: 10, border: "1px solid var(--line)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>🔗 Connessioni ({connections.length})</div>
                    <button className="btn gold sm" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => setShowConnForm(!showConnForm)}>
                      {showConnForm ? "− Annulla" : "+ Aggiungi"}
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 10px" }}>
                    Maestri, allievi, influenze e altre relazioni che coinvolgono questo artista.
                  </p>

                  {/* Form nuova connessione */}
                  {showConnForm && (
                    <div style={{ padding: 10, background: "var(--bg)", borderRadius: 6, border: "1px solid var(--gold)", marginBottom: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div>
                        <label style={{ ...labelStyle, marginBottom: 4 }}>Tipo di relazione</label>
                        <select value={newConnKind} onChange={(e) => setNewConnKind(e.target.value)} style={inputStyle}>
                          {CONN_KINDS.map(k => <option key={k} value={k}>{KIND_LABEL[k] || k}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ ...labelStyle, marginBottom: 4 }}>Direzione</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="button" onClick={() => setNewConnDirection("outgoing")}
                            style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${newConnDirection === "outgoing" ? "var(--gold)" : "var(--line)"}`, background: newConnDirection === "outgoing" ? "rgba(212,160,23,0.1)" : "var(--bg)", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                            {a.name || "Quest'artista"} → Altro
                          </button>
                          <button type="button" onClick={() => setNewConnDirection("incoming")}
                            style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${newConnDirection === "incoming" ? "var(--gold)" : "var(--line)"}`, background: newConnDirection === "incoming" ? "rgba(212,160,23,0.1)" : "var(--bg)", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                            Altro → {a.name || "Quest'artista"}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label style={{ ...labelStyle, marginBottom: 4 }}>Tipo entità da collegare</label>
                        <select value={newConnEntityType} onChange={(e) => setNewConnEntityType(e.target.value as EntityType)} style={inputStyle}>
                          {ENTITY_TYPES.map(t => <option key={t} value={t}>{ENTITY_LABEL[t]}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ ...labelStyle, marginBottom: 4 }}>Entità da collegare</label>
                        <EntitySelector
                          mode="single"
                          options={getEntityOptionsForType(newConnEntityType)}
                          selected={newConnEntityId || null}
                          onChange={(v) => setNewConnEntityId((v as string) || "")}
                          placeholder={`Cerca ${ENTITY_LABEL[newConnEntityType].toLowerCase()}…`}
                        />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, marginBottom: 4 }}>Descrizione (opzionale)</label>
                        <textarea
                          value={newConnDesc}
                          onChange={(e) => setNewConnDesc(e.target.value)}
                          style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
                          placeholder="es. Allievo presso la bottega di…"
                        />
                      </div>
                      <button className="btn gold sm" onClick={addConnection}>🔗 Crea connessione</button>
                    </div>
                  )}

                  {/* Lista connessioni esistenti (ordinate per sort_order) */}
                  {sortedConnections.length === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--ink-dim)", fontStyle: "italic", padding: 8 }}>
                      Nessuna connessione. Clicca "Aggiungi" per crearne una.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {sortedConnections.map((c, idx) => {
                        const isOutgoing = c.source_type === "artist" && c.source_id === a.id;
                        const ot = isOutgoing ? c.target_type : c.source_type;
                        const oid = isOutgoing ? c.target_id : c.source_id;
                        const arrow = isOutgoing ? "→" : "←";
                        const isEditing = editingConnId === c.id;
                        const isFirst = idx === 0;
                        const isLast = idx === sortedConnections.length - 1;
                        return (
                          <div key={c.id} style={{ padding: "8px 10px", background: "var(--bg)", borderRadius: 6, border: "1px solid var(--line)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {/* Pulsanti su/giù per riordino */}
                              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                <button
                                  onClick={() => moveConnection(c.id, "up")}
                                  disabled={isFirst}
                                  style={{
                                    background: "none", border: "1px solid var(--line)", borderRadius: 3,
                                    padding: "1px 6px", cursor: isFirst ? "not-allowed" : "pointer",
                                    fontSize: 10, lineHeight: 1.4, color: "var(--ink-dim)",
                                    opacity: isFirst ? 0.3 : 1,
                                  }}
                                  title="Sposta su">▲</button>
                                <button
                                  onClick={() => moveConnection(c.id, "down")}
                                  disabled={isLast}
                                  style={{
                                    background: "none", border: "1px solid var(--line)", borderRadius: 3,
                                    padding: "1px 6px", cursor: isLast ? "not-allowed" : "pointer",
                                    fontSize: 10, lineHeight: 1.4, color: "var(--ink-dim)",
                                    opacity: isLast ? 0.3 : 1,
                                  }}
                                  title="Sposta giù">▼</button>
                              </div>
                              <span style={{ background: "var(--bg-2)", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, color: "var(--gold-deep)" }}>
                                {KIND_LABEL[c.kind] || c.kind}
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>
                                  {a.name} <span style={{ color: "var(--ink-dim)" }}>{arrow}</span> {entityLabel(dataset as any, ot, oid)}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>{ENTITY_LABEL[ot]}</div>
                                {c.description && <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>{c.description}</div>}
                              </div>
                              {/* Pulsanti modifica + elimina */}
                              <button
                                onClick={() => isEditing ? cancelEditConnection() : startEditConnection(c)}
                                style={{
                                  background: "none", border: "1px solid var(--line)", borderRadius: 4,
                                  padding: "3px 6px", cursor: "pointer", fontSize: 12, color: "var(--ink-soft)",
                                }}
                                title={isEditing ? "Annulla modifica" : "Modifica connessione"}
                              >{isEditing ? "✕" : "✎"}</button>
                              <button
                                onClick={() => deleteConnection(c.id)}
                                style={{ background: "none", border: 0, color: "#a8483f", cursor: "pointer", fontSize: 14, padding: 4 }}
                                title="Elimina connessione">🗑️</button>
                            </div>

                            {/* Form di EDIT inline (solo per la connessione in modifica) */}
                            {isEditing && (
                              <div style={{ marginTop: 10, padding: 10, background: "var(--bg-2)", borderRadius: 6, border: "1px solid var(--gold)", display: "flex", flexDirection: "column", gap: 8 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--gold-deep)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                  Modifica connessione
                                </div>
                                <div>
                                  <label style={{ ...labelStyle, marginBottom: 4 }}>Tipo di relazione</label>
                                  <select value={editConnKind} onChange={(e) => setEditConnKind(e.target.value)} style={inputStyle}>
                                    {CONN_KINDS.map(k => <option key={k} value={k}>{KIND_LABEL[k] || k}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label style={{ ...labelStyle, marginBottom: 4 }}>Direzione</label>
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <button type="button" onClick={() => setEditConnDirection("outgoing")}
                                      style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${editConnDirection === "outgoing" ? "var(--gold)" : "var(--line)"}`, background: editConnDirection === "outgoing" ? "rgba(212,160,23,0.1)" : "var(--bg)", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                                      {a.name || "Quest'artista"} → Altro
                                    </button>
                                    <button type="button" onClick={() => setEditConnDirection("incoming")}
                                      style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${editConnDirection === "incoming" ? "var(--gold)" : "var(--line)"}`, background: editConnDirection === "incoming" ? "rgba(212,160,23,0.1)" : "var(--bg)", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                                      Altro → {a.name || "Quest'artista"}
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <label style={{ ...labelStyle, marginBottom: 4 }}>Tipo entità da collegare</label>
                                  <select value={editConnEntityType} onChange={(e) => setEditConnEntityType(e.target.value as EntityType)} style={inputStyle}>
                                    {ENTITY_TYPES.map(t => <option key={t} value={t}>{ENTITY_LABEL[t]}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label style={{ ...labelStyle, marginBottom: 4 }}>Entità da collegare</label>
                                  <EntitySelector
                                    mode="single"
                                    options={getEntityOptionsForType(editConnEntityType)}
                                    selected={editConnEntityId || null}
                                    onChange={(v) => setEditConnEntityId((v as string) || "")}
                                    placeholder={`Cerca ${ENTITY_LABEL[editConnEntityType].toLowerCase()}…`}
                                  />
                                </div>
                                <div>
                                  <label style={{ ...labelStyle, marginBottom: 4 }}>Descrizione (opzionale)</label>
                                  <textarea
                                    value={editConnDesc}
                                    onChange={(e) => setEditConnDesc(e.target.value)}
                                    style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
                                    placeholder="es. Allievo presso la bottega di…"
                                  />
                                </div>
                                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                  <button className="btn ghost sm" onClick={cancelEditConnection}>Annulla</button>
                                  <button className="btn gold sm" onClick={saveEditConnection}>💾 Salva</button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              position: "sticky", bottom: 0, left: 0, right: 0,
              padding: fullscreen ? "12px max(20px, calc((100vw - 720px) / 2))" : "12px 20px",
              borderTop: "1px solid var(--line)", background: "var(--bg)",
              display: "flex", gap: 8, justifyContent: "flex-end",
              boxShadow: "0 -4px 12px rgba(0,0,0,0.04)",
            }}>
              {!isNew && (
                <button className="btn ghost sm" onClick={del} disabled={saving}
                  style={{ marginRight: "auto", color: "#a8483f", borderColor: "#a8483f" }}>
                  🗑️ Elimina
                </button>
              )}
              <button className="btn ghost sm" onClick={onClose} disabled={saving}>Annulla</button>
              <button className="btn gold sm" onClick={save} disabled={saving}>
                {saving ? "Salvataggio…" : isNew ? "✨ Crea artista" : "💾 Salva nel database"}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

const ArtistEditorDrawerInnerMemo = memo(ArtistEditorDrawerInner, (prev, next) =>
  prev.artistId === next.artistId &&
  prev.open === next.open &&
  prev.fullscreen === next.fullscreen &&
  prev.onClose === next.onClose &&
  prev.userEmail === next.userEmail &&
  prev.initialArtist === next.initialArtist &&
  prev.initialConnections === next.initialConnections &&
  prev.dataset === next.dataset
);

// ═══════════════════════════════════════════════════════════════════════
//  OUTER — legge ix dal context, congela initialArtist e connections quando
//  il drawer è APERTO.
// ═══════════════════════════════════════════════════════════════════════
export default function ArtistEditorDrawer({
  artistId,
  open,
  onClose,
  fullscreen = false,
}: {
  artistId: string | null;
  open: boolean;
  onClose: () => void;
  fullscreen?: boolean;
}) {
  const ix = useData();
  const { user } = useAuth();

  const [frozenArtist, setFrozenArtist] = useState<Artist | null>(null);
  const [frozenConnections, setFrozenConnections] = useState<Connection[]>([]);
  const [frozenDataset, setFrozenDataset] = useState<DatasetSnapshot | null>(null);

  useEffect(() => {
    if (open) {
      if (!frozenArtist) {
        const a = artistId ? ix.artistById.get(artistId) : null;
        setFrozenArtist(a || null);
      }
      if (!frozenDataset) {
        setFrozenDataset({
          periods: ix.ds.periods,
          artists: ix.ds.artists,
          works: ix.ds.works,
          techniques: ix.ds.techniques,
          terms: ix.ds.terms,
          events: ix.ds.events,
          connections: ix.ds.connections,
          periodById: ix.periodById,
          artistById: ix.artistById,
          workById: ix.workById,
          techById: ix.techById,
          termById: ix.termById,
          eventById: ix.eventById,
        });
      }
      // Sempre aggiorna le connessioni quando si apre
      if (artistId) {
        const conns = ix.ds.connections.filter(
          c => (c.source_type === "artist" && c.source_id === artistId) ||
               (c.target_type === "artist" && c.target_id === artistId)
        );
        setFrozenConnections(conns);
      }
    } else {
      if (frozenArtist !== null) setFrozenArtist(null);
      if (frozenDataset !== null) setFrozenDataset(null);
      if (frozenConnections.length > 0) setFrozenConnections([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, artistId, ix]);

  if (!open || !frozenDataset) return null;

  return (
    <ArtistEditorDrawerInnerMemo
      artistId={artistId}
      open={open}
      onClose={onClose}
      fullscreen={fullscreen}
      userEmail={user?.email || null}
      dataset={frozenDataset}
      initialArtist={frozenArtist}
      initialConnections={frozenConnections}
    />
  );
}
