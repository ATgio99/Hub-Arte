// ============================================================================
// EntitySelector — selettore di entità con ricerca, multi-select e creazione.
//
// Props:
//   - mode: "single" | "multi"
//   - options: lista entità disponibili { id, label, subtitle? }
//   - selected: id (single) o id[] (multi) o null
//   - onChange: callback con nuovo selected
//   - placeholder: testo search input
//   - allowCreate: se true, mostra "+ Nuovo" per creare entità on-the-fly
//   - onCreate: async (name) => id — salva su Supabase e ritorna il nuovo id
//   - createLabel: testo del bottone "Nuovo" (es. "Nuovo artista")
//
// Caratteristiche:
//   - Ricerca case-insensitive su label, id e subtitle
//   - Click per selezionare/deselezionare
//   - Chip rimuovibili per le entità selezionate
//   - Creazione inline: input nome → salva → auto-seleziona
//   - Chiude dropdown su click outside o ESC
// ============================================================================
import { useState, useRef, useEffect, memo } from "react";

export interface EntityOption {
  id: string;
  label: string;
  subtitle?: string;
}

function EntitySelectorImpl({
  mode,
  options,
  selected,
  onChange,
  placeholder = "Cerca…",
  allowCreate = false,
  onCreate,
  createLabel = "Nuovo",
  disabled = false,
}: {
  mode: "single" | "multi";
  options: EntityOption[];
  selected: string | string[] | null;
  onChange: (selected: string | string[] | null) => void;
  placeholder?: string;
  allowCreate?: boolean;
  onCreate?: (name: string) => Promise<string>;
  createLabel?: string;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating2, setCreating2] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); setCreating(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const selectedIds: string[] = mode === "multi"
    ? (selected as string[]) || []
    : selected ? [selected as string] : [];

  const selectedEntities = selectedIds
    .map(id => options.find(o => o.id === id))
    .filter(Boolean) as EntityOption[];

  const q = search.toLowerCase().trim();
  const filtered = q
    ? options.filter(o =>
        o.label.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        (o.subtitle || "").toLowerCase().includes(q)
      )
    : options;

  const toggle = (id: string) => {
    if (mode === "single") {
      onChange(id);
      setOpen(false);
      setSearch("");
    } else {
      const current = (selected as string[]) || [];
      if (current.includes(id)) {
        onChange(current.filter(x => x !== id));
      } else {
        onChange([...current, id]);
      }
    }
  };

  const remove = (id: string) => {
    if (mode === "single") {
      onChange(null);
    } else {
      const current = (selected as string[]) || [];
      onChange(current.filter(x => x !== id));
    }
  };

  const handleCreate = async () => {
    if (!onCreate || !createName.trim()) return;
    setCreating2(true);
    setCreateError(null);
    try {
      const newId = await onCreate(createName.trim());
      if (mode === "single") {
        onChange(newId);
      } else {
        const current = (selected as string[]) || [];
        onChange([...current, newId]);
      }
      setCreateName("");
      setCreating(false);
      setSearch("");
      setOpen(false);
    } catch (e: any) {
      setCreateError(e.message || "Errore creazione");
    } finally {
      setCreating2(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", border: "1px solid var(--line)",
    borderRadius: 6, background: "var(--bg)", color: "var(--ink)",
    fontSize: 13, fontFamily: "inherit",
    opacity: disabled ? 0.6 : 1,
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Selected chips */}
      {selectedEntities.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
          {selectedEntities.map(e => (
            <span key={e.id} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 8px", background: "rgba(184,138,46,0.1)",
              border: "1px solid var(--gold)", borderRadius: 4,
              fontSize: 12, color: "var(--ink)",
            }}>
              {e.label}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(e.id)}
                  style={{
                    background: "none", border: 0, cursor: "pointer",
                    padding: 0, fontSize: 14, color: "var(--ink-dim)", lineHeight: 1,
                    marginLeft: 2,
                  }}
                  aria-label={`Rimuovi ${e.label}`}
                >×</button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setOpen(true); setCreating(false); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        style={inputStyle}
      />

      {/* Dropdown */}
      {open && !disabled && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1000,
          background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 6,
          marginTop: 2, maxHeight: 280, overflowY: "auto",
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        }}>
          {/* Results */}
          {filtered.length === 0 && !allowCreate && (
            <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--ink-dim)" }}>
              Nessun risultato
            </div>
          )}
          {filtered.slice(0, 100).map(o => {
            const isSel = selectedIds.includes(o.id);
            return (
              <div
                key={o.id}
                onClick={() => toggle(o.id)}
                style={{
                  padding: "8px 12px", cursor: "pointer", fontSize: 13,
                  background: isSel ? "rgba(184,138,46,0.08)" : "transparent",
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                  borderBottom: "1px solid var(--line-soft, rgba(0,0,0,0.04))",
                }}
                onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "var(--bg-2)"; }}
                onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {o.label}
                  </div>
                  {o.subtitle && (
                    <div style={{ fontSize: 11, color: "var(--ink-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {o.subtitle}
                    </div>
                  )}
                </div>
                {isSel && <span style={{ color: "var(--gold-deep)", fontSize: 14, flexShrink: 0 }}>✓</span>}
              </div>
            );
          })}
          {filtered.length > 100 && (
            <div style={{ padding: "6px 12px", fontSize: 11, color: "var(--ink-dim)", textAlign: "center" }}>
              +{filtered.length - 100} altri… affina la ricerca
            </div>
          )}

          {/* Create new */}
          {allowCreate && !creating && (
            <div
              onClick={() => { setCreating(true); setCreateName(search); setCreateError(null); }}
              style={{
                padding: "10px 12px", cursor: "pointer", fontSize: 13,
                borderTop: "1px solid var(--line)",
                color: "var(--gold-deep)", fontWeight: 500,
                background: "var(--bg-2)",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(184,138,46,0.1)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-2)"}
            >
              + {createLabel}{search.trim() ? ` "${search.trim()}"` : "…"}
            </div>
          )}

          {/* Create form */}
          {creating && (
            <div style={{ padding: "12px", borderTop: "1px solid var(--line)", background: "var(--bg-2)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--ink-dim)" }}>
                Crea nuovo elemento:
              </div>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreate(); } }}
                placeholder="Nome…"
                autoFocus
                style={{
                  width: "100%", padding: "6px 8px", border: "1px solid var(--line)",
                  borderRadius: 4, fontSize: 13, marginBottom: 6, fontFamily: "inherit",
                  background: "var(--bg)", color: "var(--ink)",
                }}
              />
              {createError && (
                <div style={{ fontSize: 11, color: "#a8483f", marginBottom: 6 }}>⚠️ {createError}</div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!createName.trim() || creating2}
                  className="btn gold sm"
                  style={{ fontSize: 12, padding: "4px 12px" }}
                >
                  {creating2 ? "…" : "Crea"}
                </button>
                <button
                  type="button"
                  onClick={() => { setCreating(false); setCreateName(""); setCreateError(null); }}
                  className="btn ghost sm"
                  style={{ fontSize: 12, padding: "4px 12px" }}
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(EntitySelectorImpl, (prev, next) =>
  prev.mode === next.mode &&
  prev.options === next.options &&
  prev.selected === next.selected &&
  prev.placeholder === next.placeholder &&
  prev.allowCreate === next.allowCreate &&
  prev.createLabel === next.createLabel &&
  prev.disabled === next.disabled &&
  prev.onChange === next.onChange &&
  prev.onCreate === next.onCreate
);
