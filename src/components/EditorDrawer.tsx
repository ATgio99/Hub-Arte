// ============================================================================
// EditorDrawer — finestra laterale a destra (o fullscreen) per modificare
// un'opera in-place, con selettori intelligenti per ogni campo.
//
// Architettura a 2 livelli per evitare il bug del focus perso:
//   - EditorDrawerOuter (con useData): legge ix, ma passa un SNAPSHOT
//     immutabile a Inner. Snapshot viene ricreato SOLO quando il drawer
//     è chiuso (così quando è aperto, anche se ix cambia, le props sono
//     stabili e Inner non re-renderizza).
//   - EditorDrawerInner (memo, NO useData): gestisce tutto lo state del form.
//     Re-renderizza SOLO se cambiano workId, open, fullscreen, onClose.
// ============================================================================
import { useState, useEffect, useRef, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useData } from "../lib/store";
import EntitySelector from "./EntitySelector";
import type { Work, Artist, Period, Technique, Term, Dataset } from "../lib/types";

const WORK_TYPES = ["architettura", "pittura", "scultura", "mosaico", "miniatura", "oreficeria", "urbanistica", "tavola", "tela", "polittico", "rilievo", "affresco", "altro"];

function slugify(s: string): string {
  return String(s).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim()
    .replace(/\s+/g, "-").replace(/-+/g, "-")
    .slice(0, 80);
}

// Campo form — DEFINITO A LIVELLO DI MODULO (non dentro Inner).
// Se lo definissimo dentro Inner, ad ogni re-render sarebbe una funzione nuova
// → React smonterebbe e rimonterebbe i children → focus perso sugli input.
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

// Campi del DB works (tutti gli altri vengono strippati prima dell'upsert)
const WORK_DB_FIELDS = [
  "id", "title", "artist_ids", "period_id", "date_text", "year_start", "year_end",
  "type", "technique_ids", "materials", "location_city", "location_place",
  "lat", "lon", "book", "chapter", "page", "source_file", "importance",
  "summary", "analysis", "innovations", "term_ids",
  "image_url", "image_thumb", "image_source", "image_gallery", "modified_by",
];

function buildCleanPayload(work: Work, modifiedBy: string): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of WORK_DB_FIELDS) {
    if (field === "modified_by") {
      payload[field] = modifiedBy;
    } else if (field in work) {
      payload[field] = (work as any)[field];
    }
  }
  for (const k of ["date_text", "location_city", "location_place", "source_file", "summary", "analysis", "image_url", "image_thumb", "image_source", "period_id"]) {
    if (payload[k] === "") payload[k] = null;
  }
  return payload;
}

// Snapshot del dataset passato a Inner (stabile mentre il drawer è aperto)
interface DatasetSnapshot {
  periods: Period[];
  artists: Artist[];
  techniques: Technique[];
  terms: Term[];
  works: Work[];  // per coordinate città
}

// ---- MentionTextarea: textarea con autocomplete @nome ----------------------
// Quando l'utente digita @, mostra un dropdown con opere/artisti filtrati.
// L'utente seleziona e il nome viene inserito nel testo.
function MentionTextarea({ value, onChange, placeholder, style, ix }: {
  value: string; onChange: (v: string) => void; placeholder?: string; style?: any; ix: any;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Lista opere + artisti per l'autocomplete
  const allItems = useMemo(() => {
    const items: { label: string; type: string }[] = [];
    for (const a of ix.ds.artists) items.push({ label: a.name, type: "artista" });
    for (const w of ix.ds.works) items.push({ label: w.title, type: "opera" });
    return items.sort((a, b) => a.label.localeCompare(b.label));
  }, [ix.ds.artists, ix.ds.works]);

  // Filtra in base alla query
  const filtered = useMemo(() => {
    if (!mentionQuery) return allItems.slice(0, 10);
    const q = mentionQuery.toLowerCase();
    return allItems.filter(x => x.label.toLowerCase().includes(q)).slice(0, 10);
  }, [mentionQuery, allItems]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(val);

    // Cerca @ prima del cursore
    const beforeCursor = val.slice(0, cursorPos);
    const atMatch = beforeCursor.match(/@([A-Za-z0-9'àéèìòùÀÉÈÌÒÙ\-. ]*)$/);

    if (atMatch) {
      setShowMentions(true);
      setMentionQuery(atMatch[1]);
      setMentionStart(cursorPos - atMatch[0].length);
      setSelectedIdx(0);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (label: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const val = textarea.value;
    const before = val.slice(0, mentionStart);
    const after = val.slice(textarea.selectionStart);
    const newVal = before + "@" + label + " " + after;
    onChange(newVal);
    setShowMentions(false);
    // Posiziona il cursore dopo il tag inserito
    setTimeout(() => {
      const pos = (before + "@" + label + " ").length;
      textarea.focus();
      textarea.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showMentions || filtered.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(filtered[selectedIdx].label); }
    else if (e.key === "Escape") { e.preventDefault(); setShowMentions(false); }
  };

  return (
    <div style={{ position: "relative" }}>
      <textarea
        ref={textareaRef}
        defaultValue={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowMentions(false), 200)}
        placeholder={placeholder}
        style={style}
      />
      {showMentions && filtered.length > 0 && (
        <div style={{
          position: "absolute", zIndex: 100, left: 0, right: 0,
          background: "var(--bg)", border: "1px solid var(--line)",
          borderRadius: 8, maxHeight: 200, overflowY: "auto",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        }}>
          {filtered.map((item, i) => (
            <button
              key={i}
              onMouseDown={(e) => { e.preventDefault(); insertMention(item.label); }}
              style={{
                display: "flex", width: "100%", padding: "8px 12px",
                background: i === selectedIdx ? "rgba(184,138,46,0.1)" : "transparent",
                border: 0, cursor: "pointer", textAlign: "left",
                fontFamily: "inherit", fontSize: 13, color: "var(--ink)",
                gap: 8, alignItems: "center",
              }}
            >
              <span style={{ fontSize: 10, color: "var(--ink-dim)", textTransform: "uppercase", fontWeight: 600, minWidth: 50 }}>{item.type}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  INNER — il vero drawer. NON ha useData(). Tutte le props sono stabili.
//
//  FIX FOCUS-LOSS: usiamo un pattern di "stato mutabile tramite ref + versione".
//    - workRef.current è l'oggetto work MUTABILE (modificato in place)
//    - forceUpdate() si chiama solo quando vogliamo forzare il re-render
//    - Gli input sono UNCONTROLLED: leggono da defaultValue e scrivono in workRef.current
//    - In questo modo, digitare non causa re-rendering → il focus NON si perde
// ═══════════════════════════════════════════════════════════════════════
function EditorDrawerInner({
  workId,
  open,
  onClose,
  fullscreen,
  userEmail,
  dataset,
  initialWork,
}: {
  workId: string | null;
  open: boolean;
  fullscreen: boolean;
  onClose: () => void;
  userEmail: string | null;
  dataset: DatasetSnapshot;
  initialWork: Work | null;
}) {
  // Stato mutabile tramite ref: l'oggetto work viene modificato in place.
  const workRef = useRef<Work | null>(initialWork);
  // idField ref (per sync con work.id quando è new)
  const idFieldRef = useRef<string>(initialWork?.id || "");
  const [, forceRender] = useState(0);
  const forceUpdate = () => forceRender(v => v + 1);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isNew, setIsNew] = useState(!initialWork);

  // Entità create localmente (durante la sessione di editing)
  const [localArtists, setLocalArtists] = useState<Artist[]>([]);
  const [localPeriods, setLocalPeriods] = useState<Period[]>([]);
  const [localTechniques, setLocalTechniques] = useState<Technique[]>([]);
  const [localTerms, setLocalTerms] = useState<Term[]>([]);

  // Quando initialWork cambia (es. cambio opera), aggiorna workRef
  useEffect(() => {
    if (initialWork) {
      const clean = { ...initialWork };
      delete (clean as any)._orig_image_url;
      delete (clean as any)._orig_image_thumb;
      workRef.current = clean;
      idFieldRef.current = clean.id;
      setIsNew(false);
    } else if (workId) {
      // Nuova opera
      workRef.current = {
        id: workId, title: "", artist_ids: [], period_id: "", date_text: "",
        year_start: null, year_end: null, type: "pittura", technique_ids: [],
        materials: [], location_city: null, location_place: null, lat: null, lon: null,
        book: 1, chapter: 0, page: 0, source_file: "", importance: 2,
        summary: "", analysis: null, innovations: [], term_ids: [],
        image_url: "", image_thumb: "", image_source: "commons", image_gallery: [],
      };
      idFieldRef.current = workId;
      setIsNew(true);
    } else {
      workRef.current = null;
    }
    setError(null);
    setOk(false);
    setLocalArtists([]);
    setLocalPeriods([]);
    setLocalTechniques([]);
    setLocalTerms([]);
    forceUpdate();
  }, [initialWork, workId]);

  // ESC per chiudere
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Mappa città → coordinate (calcolata dal dataset snapshot)
  const cityCoords = useMemo(() => {
    const m = new Map<string, { lat: number; lon: number }>();
    for (const w of dataset.works) {
      if (w.location_city && w.lat != null && w.lon != null) {
        if (!m.has(w.location_city)) m.set(w.location_city, { lat: w.lat, lon: w.lon });
      }
    }
    return m;
  }, [dataset]);

  // Opzioni selettori (dataset + entità locali)
  const allArtists = useMemo(() => [...dataset.artists, ...localArtists], [dataset.artists, localArtists]);
  const allPeriods = useMemo(() => [...dataset.periods, ...localPeriods], [dataset.periods, localPeriods]);
  const allTechniques = useMemo(() => [...dataset.techniques, ...localTechniques], [dataset.techniques, localTechniques]);
  const allTerms = useMemo(() => [...dataset.terms, ...localTerms], [dataset.terms, localTerms]);
  const allCities = useMemo(() => {
    const s = new Set<string>();
    for (const w of dataset.works) if (w.location_city) s.add(w.location_city);
    return [...s].sort();
  }, [dataset.works]);

  if (!open) return null;
  const work = workRef.current;
  if (!work) return null;

  // Helper per aggiornare un campo SENZA causare re-render (input non controllati)
  const set = <K extends keyof Work>(key: K, value: Work[K]) => {
    workRef.current = { ...workRef.current!, [key]: value };
    setOk(false);
  };

  const setCity = (city: string | null) => {
    const coords = city ? cityCoords.get(city) : null;
    workRef.current = {
      ...workRef.current!,
      location_city: city,
      lat: coords ? coords.lat : workRef.current!.lat,
      lon: coords ? coords.lon : workRef.current!.lon,
    };
    setOk(false);
    // Forza update per mostrare/nascondere la nota "✓ Coordinate auto-compilate"
    forceUpdate();
  };

  const notifyAppChanged = () => {
    window.dispatchEvent(new Event("hubart-works-changed"));
    try {
      const bc = new BroadcastChannel("hubart-admin");
      bc.postMessage({ type: "changed", ts: Date.now() });
      bc.close();
    } catch {}
  };

  const createArtist = async (name: string): Promise<string> => {
    const id = slugify(name);
    const newArtist: Artist = { id, name, aka: [], birth: null, death: null, period_ids: [], role: "", bio: "", innovations: [] };
    const { error } = await supabase.from("artists").upsert({ ...newArtist, modified_by: userEmail }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    setLocalArtists(prev => [...prev, newArtist]);
    notifyAppChanged();
    return id;
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

  const createTechnique = async (name: string): Promise<string> => {
    const id = slugify(name);
    const newTech: Technique = { id, name, definition: "", introduced_by: null, first_period_id: null, evolution: "", category: "altra" };
    const { error } = await supabase.from("techniques").upsert({ ...newTech, modified_by: userEmail }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    setLocalTechniques(prev => [...prev, newTech]);
    notifyAppChanged();
    return id;
  };

  const createTerm = async (name: string): Promise<string> => {
    const id = slugify(name);
    const newTerm: Term = { id, term: name, definition: "", category: "generale", period_ids: [], is_archetype: false };
    const { error } = await supabase.from("terms").upsert({ ...newTerm, modified_by: userEmail }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    setLocalTerms(prev => [...prev, newTerm]);
    notifyAppChanged();
    return id;
  };

  const save = async () => {
    if (!workRef.current || !userEmail) return;
    const currentWork = workRef.current;
    setError(null);
    setOk(false);
    if (!currentWork.title.trim()) { setError("Il titolo è obbligatorio."); return; }

    let finalId = isNew ? (idFieldRef.current.trim() || slugify(currentWork.title)) : currentWork.id;
    if (!finalId) { setError("ID non valido."); return; }

    const payload = buildCleanPayload({ ...currentWork, id: finalId, title: currentWork.title.trim() }, userEmail);

    setSaving(true);
    try {
      const { error } = await supabase.from("works").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      setOk(true);
      notifyAppChanged();
      workRef.current = { ...currentWork, id: finalId, title: currentWork.title.trim() };
      idFieldRef.current = finalId;
      setIsNew(false);
      forceUpdate(); // aggiorna header col nuovo titolo
    } catch (e: any) {
      setError(`Errore salvataggio: ${e.message || "errore sconosciuto"}`);
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!workRef.current || isNew) return;
    const currentWork = workRef.current;
    const confirmed = window.confirm(
      `⚠️ CONFERMA ELIMINAZIONE\n\n` +
      `Stai per eliminare definitivamente dal database:\n\n` +
      `Titolo: ${currentWork.title}\n` +
      `ID: ${currentWork.id}\n\n` +
      `Questa azione è irreversibile.\n` +
      `Se l'opera esiste anche nel file JSON statico, riapparirà con i valori originali.\n\n` +
      `Vuoi procedere?`
    );
    if (!confirmed) return;
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from("works").delete().eq("id", currentWork.id);
      if (error) throw error;
      notifyAppChanged();
      onClose();
    } catch (e: any) {
      setError(`Errore eliminazione: ${e.message || "errore sconosciuto"}`);
    } finally {
      setSaving(false);
    }
  };

  // Stili e Field sono definiti a livello di modulo (non qui dentro)
  // per evitare che vengano ricreati ad ogni re-render → focus loss.

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
                  {isNew ? "Nuova opera" : "Modifica opera"} · Admin
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, marginTop: 2 }}>
                  {work.title || "(senza titolo)"}
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
                <div style={{ padding: "10px 12px", background: "rgba(63,138,79,0.08)", color: "#3f8a4f", borderRadius: 6, fontSize: 13 }}>✓ Opera salvata nel database</div>
              )}

              <Field label="ID (slug)">
                <input type="text" defaultValue={idFieldRef.current}
                  onChange={(e) => { idFieldRef.current = e.target.value; if (isNew) set("id", e.target.value as any); }}
                  disabled={!isNew}
                  style={{ ...inputStyle, opacity: isNew ? 1 : 0.6, fontFamily: "ui-monospace, monospace", fontSize: 12 }}
                />
              </Field>

              <Field label="Titolo *">
                <input type="text" defaultValue={work.title} onChange={(e) => set("title", e.target.value)} style={inputStyle} placeholder="es. Volta della Cappella Sistina" />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Tipo">
                  <select defaultValue={work.type} onChange={(e) => set("type", e.target.value as Work["type"])} style={inputStyle}>
                    {WORK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Importanza">
                  <select defaultValue={String(work.importance)} onChange={(e) => set("importance", Number(e.target.value) as Work["importance"])} style={inputStyle}>
                    <option value="1">1 · Minore</option>
                    <option value="2">2 · Importante</option>
                    <option value="3">3 · Capitale</option>
                  </select>
                </Field>
              </div>

              <Field label="Periodo">
                <EntitySelector
                  mode="single"
                  options={allPeriods.map(p => ({ id: p.id, label: p.name, subtitle: `${p.year_start}–${p.year_end}` }))}
                  selected={work.period_id || null}
                  onChange={(v) => set("period_id", (v as string) || "")}
                  placeholder="Cerca periodo…"
                  allowCreate={true}
                  onCreate={createPeriod}
                  createLabel="Nuovo periodo"
                />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12 }}>
                <Field label="Anno inizio">
                  <input type="number" defaultValue={work.year_start ?? ""} onChange={(e) => set("year_start", e.target.value ? Number(e.target.value) : null)} style={inputStyle} placeholder="-300" />
                </Field>
                <Field label="Anno fine">
                  <input type="number" defaultValue={work.year_end ?? ""} onChange={(e) => set("year_end", e.target.value ? Number(e.target.value) : null)} style={inputStyle} />
                </Field>
                <Field label="Datazione testuale">
                  <input type="text" defaultValue={work.date_text} onChange={(e) => set("date_text", e.target.value)} style={inputStyle} placeholder="1485-1490" />
                </Field>
              </div>

              <Field label="Artisti">
                <EntitySelector
                  mode="multi"
                  options={allArtists.map(a => ({ id: a.id, label: a.name, subtitle: a.role || undefined }))}
                  selected={work.artist_ids}
                  onChange={(v) => set("artist_ids", (v as string[]) || [])}
                  placeholder="Cerca artista…"
                  allowCreate={true}
                  onCreate={createArtist}
                  createLabel="Nuovo artista"
                />
              </Field>

              <Field label="Città (auto-coordinate)">
                <input
                  type="text"
                  defaultValue={work.location_city || ""}
                  onChange={(e) => setCity(e.target.value || null)}
                  list="cities-list"
                  placeholder="Inizia a digitare… (es. Firenze)"
                  style={inputStyle}
                />
                <datalist id="cities-list">
                  {allCities.map(c => <option key={c} value={c} />)}
                </datalist>
                {work.location_city && cityCoords.has(work.location_city) && (
                  <div style={{ fontSize: 11, color: "var(--gold-deep)", marginTop: 4 }}>
                    ✓ Coordinate auto-compilate: {cityCoords.get(work.location_city)?.lat}, {cityCoords.get(work.location_city)?.lon}
                  </div>
                )}
              </Field>

              <Field label="Luogo / edificio">
                <input type="text" defaultValue={work.location_place || ""} onChange={(e) => set("location_place", e.target.value || null)} style={inputStyle} placeholder="Basilica di San Pietro" />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Latitudine">
                  <input type="number" step="0.0001" defaultValue={work.lat ?? ""} onChange={(e) => set("lat", e.target.value ? Number(e.target.value) : null)} style={inputStyle} />
                </Field>
                <Field label="Longitudine">
                  <input type="number" step="0.0001" defaultValue={work.lon ?? ""} onChange={(e) => set("lon", e.target.value ? Number(e.target.value) : null)} style={inputStyle} />
                </Field>
              </div>

              <Field label="Tecniche">
                <EntitySelector
                  mode="multi"
                  options={allTechniques.map(t => ({ id: t.id, label: t.name, subtitle: t.category }))}
                  selected={work.technique_ids}
                  onChange={(v) => set("technique_ids", (v as string[]) || [])}
                  placeholder="Cerca tecnica…"
                  allowCreate={true}
                  onCreate={createTechnique}
                  createLabel="Nuova tecnica"
                />
              </Field>

              <Field label="Materiali (separati da virgola)">
                <input type="text" defaultValue={(work.materials || []).join(", ")} onChange={(e) => set("materials", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} style={inputStyle} placeholder="marmo, bronzo…" />
              </Field>

              <Field label="Termini glossario">
                <EntitySelector
                  mode="multi"
                  options={allTerms.map(t => ({ id: t.id, label: t.term, subtitle: t.category }))}
                  selected={work.term_ids}
                  onChange={(v) => set("term_ids", (v as string[]) || [])}
                  placeholder="Cerca termine…"
                  allowCreate={true}
                  onCreate={createTerm}
                  createLabel="Nuovo termine"
                />
              </Field>

              <Field label="Sintesi">
                <MentionTextarea value={work.summary} onChange={(v) => set("summary", v)} placeholder="Breve descrizione… (usa @ per taggare opere o artisti)" style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} ix={{ ds: { artists: allArtists, works: dataset.works } }} />
              </Field>
              <Field label="Analisi">
                <MentionTextarea value={work.analysis || ""} onChange={(v) => set("analysis", v || null)} placeholder="Analisi critica… (usa @ per taggare opere o artisti)" style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} ix={{ ds: { artists: allArtists, works: dataset.works } }} />
              </Field>
              <Field label="Innovazioni (una per riga)">
                <textarea defaultValue={(work.innovations || []).join("\n")} onChange={(e) => set("innovations", e.target.value.split("\n").map(s => s.trim()).filter(Boolean))} style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} />
              </Field>

              <Field label="URL immagine principale">
                <input type="url" defaultValue={work.image_url || ""} onChange={(e) => set("image_url", e.target.value)} style={inputStyle} placeholder="https://…" />
              </Field>
              <Field label="URL thumbnail">
                <input type="url" defaultValue={work.image_thumb || ""} onChange={(e) => set("image_thumb", e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Fonte immagine">
                <input type="text" defaultValue={work.image_source || ""} onChange={(e) => set("image_source", e.target.value)} style={inputStyle} placeholder="commons" />
              </Field>

              <Field label="Galleria immagini aggiuntive (un URL per riga)">
                <textarea
                  defaultValue={(work.image_gallery || []).join("\n")}
                  onChange={(e) => set("image_gallery", e.target.value.split("\n").map(s => s.trim()).filter(Boolean))}
                  style={{ ...inputStyle, minHeight: 70, resize: "vertical", fontFamily: "ui-monospace, monospace", fontSize: 12 }}
                  placeholder="https://…&#10;https://…"
                />
              </Field>
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
                {saving ? "Salvataggio…" : isNew ? "✨ Crea opera" : "💾 Salva nel database"}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// Memo: Inner re-renderizza SOLO se cambiano queste props (tutte stabili
// quando il drawer è aperto perché passato dal parent Outer che congela
// initialWork e dataset).
const EditorDrawerInnerMemo = memo(EditorDrawerInner, (prev, next) =>
  prev.workId === next.workId &&
  prev.open === next.open &&
  prev.fullscreen === next.fullscreen &&
  prev.onClose === next.onClose &&
  prev.userEmail === next.userEmail &&
  prev.initialWork === next.initialWork &&
  prev.dataset === next.dataset
);

// ═══════════════════════════════════════════════════════════════════════
//  OUTER — legge ix dal context, ma congel initialWork e dataset quando
//  il drawer è APERTO. Solo quando si CHIUDE, ricarica dal dataset.
//  Così Inner NON riceve mai props nuove durante la digitazione.
// ═══════════════════════════════════════════════════════════════════════
export default function EditorDrawer({
  workId,
  open,
  onClose,
  fullscreen = false,
}: {
  workId: string | null;
  open: boolean;
  onClose: () => void;
  fullscreen?: boolean;
}) {
  const ix = useData();
  const { user } = useAuth();

  // Congela initialWork e dataset quando il drawer è aperto.
  // Quando si chiude (open=false), resetto per la prossima apertura.
  const [frozenWork, setFrozenWork] = useState<Work | null>(null);
  const [frozenDataset, setFrozenDataset] = useState<DatasetSnapshot | null>(null);

  useEffect(() => {
    if (open) {
      // Apertura: congela solo se non già congelato (evita di sovrascrivere durante la digitazione)
      if (!frozenWork) {
        const w = workId ? ix.workById.get(workId) : null;
        setFrozenWork(w || null);
      }
      if (!frozenDataset) {
        setFrozenDataset({
          periods: ix.ds.periods,
          artists: ix.ds.artists,
          techniques: ix.ds.techniques,
          terms: ix.ds.terms,
          works: ix.ds.works,
        });
      }
    } else {
      // Chiusura: reset congelamento
      if (frozenWork !== null) setFrozenWork(null);
      if (frozenDataset !== null) setFrozenDataset(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, workId, ix]);

  // Se il drawer è chiuso o non ho ancora congelato, non renderizzare Inner
  if (!open || !frozenDataset) return null;

  return (
    <EditorDrawerInnerMemo
      workId={workId}
      open={open}
      onClose={onClose}
      fullscreen={fullscreen}
      userEmail={user?.email || null}
      dataset={frozenDataset}
      initialWork={frozenWork}
    />
  );
}
