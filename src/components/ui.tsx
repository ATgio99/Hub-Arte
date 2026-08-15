import { ReactNode, CSSProperties, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { Work, EntityType } from "../lib/types";
import { useData } from "../lib/store";
import { entityLabel, resolveEntity, WorkGroup, ENTITY_LABEL } from "../lib/data";
import { useCountUp, useInViewOnce, revealContainer, revealItem, revealItemSoft, EASE_OUT, usePrefersReducedMotion } from "../lib/motion";
import { useFavorites, toggleFavorite, FavType } from "../lib/favorites";
import { useStudied, toggleStudied } from "../lib/studied";

// ---- Stella preferiti (opere e artisti) ------------------------------------
export function FavStar({ type, id, size = 18, className }: { type: FavType; id: string; size?: number; className?: string }) {
  const favs = useFavorites();
  const on = (type === "work" ? favs.works : favs.artists).includes(id);
  return (
    <button
      type="button"
      className={`fav-star ${on ? "on" : ""} ${className ?? ""}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(type, id); }}
      title={on ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
      aria-label={on ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
      aria-pressed={on}
      data-testid={`fav-${type}-${id}`}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.45 6.2 20.5l1.1-6.47L2.6 9.45l6.5-.95L12 2.6z" />
      </svg>
    </button>
  );
}

// ---- Spunta "approfondita" (opere) -----------------------------------------
export function StudiedCheck({ id, size = 18, className }: { id: string; size?: number; className?: string }) {
  const studied = useStudied();
  const on = studied.includes(id);
  return (
    <button
      type="button"
      className={`studied-check ${on ? "on" : ""} ${className ?? ""}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleStudied(id); }}
      title={on ? "Segna come non approfondita" : "Segna come approfondita"}
      aria-label={on ? "Segna come non approfondita" : "Segna come approfondita"}
      aria-pressed={on}
      data-testid={`studied-${id}`}
      style={{
        background: "none", border: 0, padding: 0, cursor: "pointer",
        color: on ? "var(--c-technique)" : "var(--ink-dim)", opacity: on ? 1 : 0.45,
        transition: "color .2s, opacity .2s",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    </button>
  );
}

// ---- Numero che conta (KPI) -----------------------------------------------
export function CountUp({ value, decimals = 0, suffix = "", className, style }:
  { value: number; decimals?: number; suffix?: string; className?: string; style?: CSSProperties }) {
  const { ref, seen } = useInViewOnce(0.4);
  const n = useCountUp(value, { start: seen, decimals });
  return <span ref={ref as any} className={className} style={style} data-testid="countup">{n.toLocaleString("it-IT")}{suffix}</span>;
}

// ---- Reveal con stagger (entra in viewport una volta) ----------------------
export function Reveal({ children, className, style, delay = 0, soft = false }:
  { children: ReactNode; className?: string; style?: CSSProperties; delay?: number; soft?: boolean }) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return <div className={className} style={style}>{children}</div>;
  return (
    <motion.div className={className} style={style}
      initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}
      variants={soft ? revealItemSoft : revealItem} transition={{ delay }}>
      {children}
    </motion.div>
  );
}

// contenitore con stagger dei figli (usa <RevealChild/> dentro)
export function RevealGroup({ children, className, style, amount = 0.15 }:
  { children: ReactNode; className?: string; style?: CSSProperties; amount?: number }) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return <div className={className} style={style}>{children}</div>;
  return (
    <motion.div className={className} style={style}
      initial="hidden" whileInView="show" viewport={{ once: true, amount }}
      variants={revealContainer}>
      {children}
    </motion.div>
  );
}
export function RevealChild({ children, className, style, soft = false }:
  { children: ReactNode; className?: string; style?: CSSProperties; soft?: boolean }) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return <div className={className} style={style}>{children}</div>;
  return <motion.div className={className} style={style} variants={soft ? revealItemSoft : revealItem}>{children}</motion.div>;
}

export { EASE_OUT };

// ---- Logo (SVG inline, mark a costellazione) ------------------------------
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="Atlante di Storia dell'Arte" fill="none">
      <circle cx="16" cy="16" r="3" fill="var(--gold)" />
      <circle cx="7" cy="9" r="1.6" fill="var(--amber)" />
      <circle cx="25" cy="8" r="1.6" fill="var(--gold-deep)" />
      <circle cx="8" cy="24" r="1.6" fill="var(--gold-deep)" />
      <circle cx="24" cy="24" r="1.6" fill="var(--amber)" />
      <g stroke="var(--gold-deep)" strokeWidth="1.1" opacity="0.85">
        <path d="M16 16 L7 9 M16 16 L25 8 M16 16 L8 24 M16 16 L24 24" />
      </g>
    </svg>
  );
}

// ---- Colore / rotte per tipo entità ---------------------------------------
export const ENTITY_COLOR: Record<EntityType, string> = {
  period: "var(--c-period)", artist: "var(--c-artist)", work: "var(--c-work)",
  technique: "var(--c-technique)", term: "var(--c-term)", event: "var(--c-event)",
};

export const ENTITY_ROUTE: Record<EntityType, string> = {
  period: "/periodo", artist: "/artista", work: "/opera",
  technique: "/tecniche", term: "/glossario", event: "/timeline",
};

// rotta navigabile per un'entità (gestisce term/technique con query/anchor)
export function entityHref(type: EntityType, id: string): string {
  if (type === "term") return `/glossario?t=${id}`;
  if (type === "technique") return `/tecniche?t=${id}`;
  if (type === "event") return `/timeline`;
  return `${ENTITY_ROUTE[type]}/${id}`;
}

/** Link universale a qualunque entità: rende ogni menzione cliccabile. */
export function EntityLink({ type, id, label, className }: { type: EntityType; id: string; label?: string; className?: string }) {
  const ix = useData();
  const exists = !!resolveEntity(ix, type, id);
  const txt = label ?? entityLabel(ix, type, id);
  if (!exists) return <span className={className}>{txt}</span>;
  return <Link to={entityHref(type, id)} className={className ?? "tlink"} data-testid={`elink-${type}-${id}`}>{txt}</Link>;
}

// ---- RichText: parsa @nome nel testo e lo trasforma in link cliccabili ----
// Cerca @SeguitoDaParole e matcha contro opere e artisti del dataset.
// Se matcha, crea un Link. Se non matcha, mostra il testo senza @.
// Supporta anche @id-esatto (es. @andrea-mantegna) per matching preciso.
export function RichText({ text }: { text: string }) {
  const ix = useData();
  const [popup, setPopup] = useState<{ type: EntityType; id: string } | null>(null);

  const lookup = useMemo(() => {
    const map = new Map<string, { type: EntityType; id: string; label: string }>();
    for (const a of ix.ds.artists) {
      map.set(a.name.toLowerCase(), { type: "artist", id: a.id, label: a.name });
      map.set(a.id.toLowerCase(), { type: "artist", id: a.id, label: a.name });
      for (const aka of a.aka) map.set(aka.toLowerCase(), { type: "artist", id: a.id, label: aka });
    }
    for (const w of ix.ds.works) {
      map.set(w.title.toLowerCase(), { type: "work", id: w.id, label: w.title });
      map.set(w.id.toLowerCase(), { type: "work", id: w.id, label: w.title });
    }
    return map;
  }, [ix.ds.artists, ix.ds.works]);

  // Split del testo mantenendo i @tag
  // La regex cattura @ seguito da parole (lettere, numeri, apostrofi, trattini, spazi tra parole)
  // ma si ferma alla punteggiatura (,.;:!?)]} newline) o fine stringa.
  // Lo spazio finale viene trimmato nel matching.
  const parts = text.split(/(@[A-Za-z0-9'àéèìòùÀÉÈÌÒÙ](?:[A-Za-z0-9'àéèìòùÀÉÈÌÒÙ\-. ]*[A-Za-z0-9'àéèìòùÀÉÈÌÒÙ\-.])?)/g);

  const closePopup = () => { setPopup(null); document.body.style.overflow = ""; };

  useEffect(() => {
    if (!popup) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closePopup(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [popup]);

  return (
    <>
      {parts.map((part, i) => {
        if (!part.startsWith("@")) return <span key={i}>{part}</span>;
        const query = part.slice(1).trim().toLowerCase();
        let match = lookup.get(query);
        if (!match) {
          for (const [key, val] of lookup) {
            if (key.startsWith(query) || query.startsWith(key)) { match = val; break; }
          }
        }
        if (match) {
          return (
            <button key={i} onClick={() => setPopup({ type: match!.type, id: match!.id })} className="tlink" style={{ background: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit", fontWeight: 500, textDecoration: "underline", textDecorationColor: "var(--gold)", textUnderlineOffset: "2px" }}>
              {match.label}
            </button>
          );
        }
        return <span key={i}>{part.slice(1)}</span>;
      })}
      {popup && <EntityPopup type={popup.type} id={popup.id} onClose={closePopup} />}
    </>
  );
}

function EntityPopup({ type, id, onClose }: { type: EntityType; id: string; onClose: () => void }) {
  const ix = useData();
  const entity = resolveEntity(ix, type, id);
  if (!entity) return null;
  const label = entityLabel(ix, type, id);
  const href = entityHref(type, id);
  const eyebrow = ENTITY_LABEL[type] || type;
  let image: string | undefined;
  let preview: string | undefined;
  let meta: string | undefined;
  if (type === "work") {
    const w = entity as Work;
    image = w.image_thumb || w.image_url;
    preview = w.summary;
    const period = ix.periodById.get(w.period_id);
    meta = [period?.name, w.date_text, w.location_city].filter(Boolean).join(" · ");
  } else if (type === "artist") {
    const a = entity as any;
    preview = a.bio;
    meta = [a.role, a.birth != null ? `${a.birth}–${a.death ?? ""}` : null].filter(Boolean).join(" · ");
  }
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, animation: "fadeIn .15s" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg)", borderRadius: 14, maxWidth: 380, width: "100%", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px -12px rgba(0,0,0,0.25)", border: "1px solid var(--line)" }}>
        {image && <div style={{ width: "100%", aspectRatio: "4/3", overflow: "hidden", background: "var(--bg-2)" }}><img src={image} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.currentTarget.style.display = "none"; }} /></div>}
        <div style={{ padding: "16px 18px", overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div className="eyebrow" style={{ marginBottom: 4, fontSize: 10 }}>{eyebrow}</div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 19, lineHeight: 1.2, marginBottom: 4 }}>{label}</h3>
              {meta && <div className="muted" style={{ fontSize: 13 }}>{meta}</div>}
            </div>
            <button onClick={onClose} aria-label="Chiudi" style={{ background: "none", border: 0, cursor: "pointer", color: "var(--ink-dim)", fontSize: 20, lineHeight: 1, padding: "2px 6px", flexShrink: 0 }}>✕</button>
          </div>
          {preview && <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 12, marginBottom: 0 }}>{preview.length > 200 ? preview.slice(0, 200) + "…" : preview}</p>}
        </div>
        <div style={{ padding: "12px 18px", borderTop: "1px solid var(--line)", flexShrink: 0 }}>
          <Link to={href} onClick={onClose} className="btn gold sm" style={{ width: "100%", textAlign: "center", justifyContent: "center" }}>Apri scheda →</Link>
        </div>
      </div>
    </div>
  );
}

// ---- Immagine opera con placeholder elegante ------------------------------
export function WorkImage({ work, className, style }: { work: Work; className?: string; style?: any }) {
  const src = work.image_thumb || work.image_url;
  if (!src) {
    return (
      <div className={`img-placeholder ${className ?? ""}`} style={style}>
        <div style={{ textAlign: "center", padding: 14 }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ opacity: .7 }}>
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="M21 15l-5-5L5 21" />
          </svg>
          <div style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", marginTop: 8, color: "var(--ink-faint)" }}>
            Immagine non disponibile
          </div>
        </div>
      </div>
    );
  }
  return (
    <img
      src={src} alt={work.title} loading="lazy" className={className} style={style}
      onError={(e) => {
        const t = e.currentTarget;
        if (work.image_url && t.src !== work.image_url) { t.src = work.image_url; return; }
        t.style.display = "none";
      }}
    />
  );
}

// ---- Card opera (galleria) con badge periodo cliccabile -------------------
export function WorkCard({ work, subtitle, showStudied, group }: { work: Work; subtitle?: string; showStudied?: boolean; group?: WorkGroup | null }) {
  const ix = useData();
  const period = ix.periodById.get(work.period_id);
  const studied = useStudied();
  const isStudied = studied.includes(work.id);
  return (
    <div className={`card workcard ${isStudied ? "workcard-studied" : ""}`} data-testid={`card-work-${work.id}`}>
      <Link to={`/opera/${work.id}`} className="workcard-img">
        <WorkImage work={work} />
        {period && (
          <span className="workcard-badge">
            <span className="badge-period">{period.name}</span>
          </span>
        )}
        {work.importance === 3 && <span className="workcard-imp">✦</span>}
        {isStudied && <span className="workcard-studied-badge" title="Approfondita">✓</span>}
        {group && (
          <span
            className="workcard-complex-overlay"
            title={`Apri il complesso: ${group.name}`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <Link to={`/complesso/${group.parent.id}`} onClick={(e) => e.stopPropagation()}>
              🏛️ Apri complesso
            </Link>
          </span>
        )}
      </Link>
      <div className="workcard-body">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, justifyContent: "space-between" }}>
          <Link to={`/opera/${work.id}`} style={{ minWidth: 0 }}>
            <h4 className="workcard-title">{work.title}</h4>
          </Link>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {showStudied !== false && <StudiedCheck id={work.id} size={16} />}
            <FavStar type="work" id={work.id} size={16} />
          </div>
        </div>
        {work.artist_ids.length > 0 && (
          <div className="workcard-artist">
            {work.artist_ids.map((aid, i) => {
              const a = ix.artistById.get(aid);
              if (!a) return null;
              return <span key={aid}>{i > 0 && ", "}<EntityLink type="artist" id={aid} label={a.name} /></span>;
            })}
          </div>
        )}
        <div className="workcard-sub">
          {subtitle ?? [work.location_city, work.date_text].filter(Boolean).join(" · ")}
        </div>
      </div>
    </div>
  );
}

// ---- Card gruppo opere (complesso architettonico) -------------------------
// Layout verticale identico a WorkCard, con sezione espandibile sotto
export function WorkGroupCard({ group, expanded, onToggle }: { group: WorkGroup; expanded: boolean; onToggle: () => void }) {
  const ix = useData();
  const studied = useStudied();
  const studiedInGroup = group.works.filter(w => studied.includes(w.id)).length;
  const period = ix.periodById.get(group.parent.period_id);
  return (
    <div className="card workcard workgroup-card" data-testid={`group-${group.name}`}>
      {/* Immagine + badge — identico a WorkCard */}
      <div className="workcard-img" style={{ position: "relative", cursor: "pointer" }} onClick={onToggle}>
        <WorkImage work={group.parent} />
        {period && (
          <span className="workcard-badge">
            <span className="badge-period">{period.name}</span>
          </span>
        )}
        <span className="workgroup-count">{group.works.length} opere</span>
        <span
          className="workcard-complex-overlay"
          title={`Apri il complesso: ${group.name}`}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <Link to={`/complesso/${group.parent.id}`} onClick={(e) => e.stopPropagation()}>
            🏛️ Apri complesso
          </Link>
        </span>
      </div>

      {/* Corpo — identico a WorkCard ma con expand */}
      <div className="workcard-body">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, justifyContent: "space-between" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h4 className="workcard-title">{group.name}</h4>
          </div>
          <button onClick={onToggle} style={{ background: "none", border: 0, padding: "4px 0 0", cursor: "pointer", color: "var(--ink-dim)", lineHeight: 1, transition: "transform .2s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
            ▾
          </button>
        </div>
        <div className="workcard-sub">
          {[group.city, period?.name].filter(Boolean).join(" · ")}
        </div>

        {/* Mini progresso approfondite */}
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 4, background: "var(--line)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${(studiedInGroup / group.works.length) * 100}%`, height: "100%", background: studiedInGroup === group.works.length ? "var(--c-technique)" : "var(--gold)", borderRadius: 2, transition: "width .3s" }} />
          </div>
          <span className="tnum" style={{ fontSize: 11, color: studiedInGroup === group.works.length ? "var(--c-technique)" : "var(--ink-dim)" }}>{studiedInGroup}/{group.works.length}</span>
        </div>
      </div>

      {/* Lista espandibile */}
      {expanded && (
        <div className="workgroup-children">
          {group.works.map(w => {
            const wStudied = studied.includes(w.id);
            return (
              <Link key={w.id} to={`/opera/${w.id}`} className="workgroup-child">
                <span className="tag" style={{ fontSize: 10, padding: "1px 6px", whiteSpace: "nowrap" }}>{w.type}</span>
                <span className="workgroup-child-title">{w.title}</span>
                {wStudied && <span style={{ color: "var(--c-technique)", fontSize: 14, flexShrink: 0 }}>✓</span>}
                {w.importance === 3 && <span style={{ color: "var(--gold-deep)", fontSize: 12, flexShrink: 0 }}>✦</span>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- Sezione numerata ------------------------------------------------------
export function Section({ num, eyebrow, title, children, right }:
  { num?: string; eyebrow?: string; title?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="section">
      {(eyebrow || title) && (
        <div className="section-head">
          <div>
            {(num || eyebrow) && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                {num && <span className="sec-num">{num}</span>}
                {eyebrow && <span className="eyebrow">{eyebrow}</span>}
              </div>
            )}
            {title && <h2 className="section-title">{title}</h2>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ msg }: { msg: string }) {
  return <div className="muted" style={{ padding: "40px 0", textAlign: "center", fontSize: 14 }}>{msg}</div>;
}

// ---- Empty state quando il filtro temporale nasconde tutto ---------------
// Mostra un messaggio in semiopacità + una grafica che riproduce la linea
// del tempo con le maniglie da trascinare per allargare l'intervallo.
export function EmptyTimeRange({ noun = "opere" }: { noun?: string }) {
  return (
    <div style={{
      padding: "48px 24px", textAlign: "center", opacity: 0.7,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
    }}>
      {/* Grafica linea del tempo con maniglie */}
      <svg width="220" height="60" viewBox="0 0 220 60" fill="none" style={{ maxWidth: "100%" }}>
        {/* Linea orizzontale */}
        <line x1="20" y1="30" x2="200" y2="30" stroke="var(--ink-dim)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
        {/* Tratto selezionato (sottile, in mezzo) */}
        <line x1="80" y1="30" x2="140" y2="30" stroke="var(--gold)" strokeWidth="3" opacity="0.7" />
        {/* Maniglia sinistra */}
        <g>
          <circle cx="80" cy="30" r="7" fill="var(--gold)" opacity="0.9" />
          <circle cx="80" cy="30" r="3" fill="#fff" />
        </g>
        {/* Maniglia destra */}
        <g>
          <circle cx="140" cy="30" r="7" fill="var(--gold)" opacity="0.9" />
          <circle cx="140" cy="30" r="3" fill="#fff" />
        </g>
        {/* Freccia sinistra che indica "allarga a sinistra" */}
        <g opacity="0.8">
          <path d="M 60 18 L 50 30 L 60 42" stroke="var(--gold-deep)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="50" y1="30" x2="72" y2="30" stroke="var(--gold-deep)" strokeWidth="2" strokeLinecap="round" opacity="0" />
        </g>
        {/* Freccia destra che indica "allarga a destra" */}
        <g opacity="0.8">
          <path d="M 160 18 L 170 30 L 160 42" stroke="var(--gold-deep)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="148" y1="30" x2="170" y2="30" stroke="var(--gold-deep)" strokeWidth="2" strokeLinecap="round" opacity="0" />
        </g>
        {/* Etichette anni ai bordi */}
        <text x="20" y="52" fontSize="9" fill="var(--ink-dim)" textAnchor="middle" fontFamily="ui-monospace, monospace">300</text>
        <text x="200" y="52" fontSize="9" fill="var(--ink-dim)" textAnchor="middle" fontFamily="ui-monospace, monospace">1600</text>
      </svg>

      <div style={{ maxWidth: "44ch" }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ink-soft)", marginBottom: 6 }}>
          Nessuna {noun} nell'intervallo temporale selezionato
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.55 }}>
          Apri il menù principale (☰ in alto a sinistra) e usa la <b>linea del tempo</b> per
          allargare l'intervallo: trascina le maniglie <span style={{ color: "var(--gold)" }}>●</span> verso
          l'esterno per includere più anni, oppure premi «Reset» per tornare a tutto l'arco.
        </div>
      </div>
    </div>
  );
}

// ---- Nota filtro temporale attivo (mostrata in cima alle viste) -----------
export function FilterNote({ total, shown, noun = "elementi" }: { total: number; shown: number; noun?: string }) {
  if (shown === total) return null;
  return (
    <div className="filter-note" data-testid="filter-note">
      Filtro temporale attivo · <b>{shown}</b> di {total} {noun}
    </div>
  );
}

export function WorkGallery({ work }: { work: Work }) {
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const pinchStart = useRef({ dist: 0, scale: 1 });
  const images: string[] = [];
  const main = work.image_thumb || work.image_url;
  if (main) images.push(main);
  if (work.image_gallery && Array.isArray(work.image_gallery)) {
    for (const url of work.image_gallery) {
      if (url && url.trim() && !images.includes(url.trim())) images.push(url.trim());
    }
  }
  const n = images.length;
  if (n === 0) {
    return (
      <div className="opera-img card" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 14 }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ opacity: .7 }}>
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="M21 15l-5-5L5 21" />
          </svg>
          <div style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", marginTop: 8, color: "var(--ink-faint)" }}>Immagine non disponibile</div>
        </div>
      </div>
    );
  }
  const prev = useCallback(() => { setIdx(i => (i - 1 + n) % n); setScale(1); setPan({ x: 0, y: 0 }); }, [n]);
  const next = useCallback(() => { setIdx(i => (i + 1) % n); setScale(1); setPan({ x: 0, y: 0 }); }, [n]);

  const resetZoom = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  // Wheel zoom (desktop)
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => Math.max(1, Math.min(5, s * delta)));
  }, []);

  // Mouse drag pan (desktop)
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
  }, [scale, pan]);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: panStart.current.x + (e.clientX - dragStart.current.x),
      y: panStart.current.y + (e.clientY - dragStart.current.y),
    });
  }, [isDragging]);
  const onMouseUp = useCallback(() => setIsDragging(false), []);

  // Touch pinch zoom (mobile)
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStart.current = { dist: Math.hypot(dx, dy), scale };
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panStart.current = { ...pan };
    }
  }, [scale, pan]);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const newScale = Math.max(1, Math.min(5, pinchStart.current.scale * (dist / pinchStart.current.dist)));
      setScale(newScale);
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      setPan({
        x: panStart.current.x + (e.touches[0].clientX - dragStart.current.x),
        y: panStart.current.y + (e.touches[0].clientY - dragStart.current.y),
      });
    }
  }, [isDragging, scale]);
  const onTouchEnd = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setZoom(false); resetZoom(); }
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "+" || e.key === "=") setScale(s => Math.min(5, s * 1.2));
      else if (e.key === "-") setScale(s => Math.max(1, s * 0.8));
      else if (e.key === "0") resetZoom();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [zoom, prev, next]);
  useEffect(() => { setIdx(0); resetZoom(); }, [work.id]);

  // Reset zoom quando cambia immagine
  useEffect(() => { resetZoom(); }, [idx]);

  return (
    <>
      <div className="opera-img card" style={{ position: "relative", overflow: "hidden", cursor: "pointer" }} onClick={() => { setZoom(true); resetZoom(); }} role="button" tabIndex={0} aria-label="Clicca per ingrandire" onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setZoom(true); resetZoom(); } }}>
        <img src={images[idx]} alt={`${work.title} — immagine ${idx + 1} di ${n}`} style={{ maxWidth: "100%", maxHeight: "72vh", width: "auto", height: "auto", objectFit: "contain", background: "var(--bg)", display: "block", margin: "0 auto" }} onError={(e) => { e.currentTarget.style.opacity = "0.2"; }} />
        {n > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Immagine precedente" style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: "50%", background: "rgba(251,248,241,0.85)", backdropFilter: "blur(4px)", border: "1px solid var(--line)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)", zIndex: 2, opacity: 0.8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Immagine successiva" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: "50%", background: "rgba(251,248,241,0.85)", backdropFilter: "blur(4px)", border: "1px solid var(--line)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)", zIndex: 2, opacity: 0.8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 2 }}>
              {images.map((_, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); }} aria-label={`Vai all'immagine ${i + 1}`} style={{ width: i === idx ? 20 : 8, height: 8, borderRadius: 4, background: i === idx ? "var(--gold)" : "rgba(184,138,46,0.35)", border: 0, cursor: "pointer", transition: "all .2s", padding: 0 }} />
              ))}
            </div>
            <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(251,248,241,0.85)", backdropFilter: "blur(4px)", borderRadius: 999, padding: "3px 10px", fontSize: 12, color: "var(--ink-dim)", fontWeight: 600, zIndex: 2, border: "1px solid var(--line)" }}>{idx + 1} / {n}</div>
          </>
        )}
      </div>
      {zoom && (
        <div
          onClick={() => { if (scale <= 1) { setZoom(false); resetZoom(); } }}
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            background: "rgba(0,0,0,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-out",
            padding: 24, animation: "fadeIn .2s",
            touchAction: "none",
          }}
        >
          <img
            src={images[idx]}
            alt={`${work.title} — immagine ${idx + 1} di ${n}`}
            style={{
              maxWidth: "100%", maxHeight: "100%", objectFit: "contain",
              borderRadius: 4, boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
              transform: `scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`,
              transformOrigin: "center",
              transition: isDragging ? "none" : "transform 0.15s ease-out",
              cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-out",
            }}
            onClick={e => {
              e.stopPropagation();
              if (scale > 1) { resetZoom(); }
              else { setZoom(false); }
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            draggable={false}
          />

          {/* Pulsante chiudi */}
          <button onClick={() => { setZoom(false); resetZoom(); }} aria-label="Chiudi" style={{ position: "fixed", top: 18, right: 18, zIndex: 10001, width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", fontSize: 22, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>

          {/* Controlli zoom (desktop) */}
          <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 10001, display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={e => { e.stopPropagation(); setScale(s => Math.max(1, s * 0.8)); }} aria-label="Zoom out" style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>−</button>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, minWidth: 50, textAlign: "center" }}>{Math.round(scale * 100)}%</span>
            <button onClick={e => { e.stopPropagation(); setScale(s => Math.min(5, s * 1.2)); }} aria-label="Zoom in" style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>+</button>
            {scale > 1 && <button onClick={e => { e.stopPropagation(); resetZoom(); }} aria-label="Reset zoom" style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Reset zoom"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9" /><polyline points="3 4 3 12 11 12" /></svg></button>}
          </div>

          {/* Frecce navigazione */}
          {n > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); prev(); }} aria-label="Precedente" style={{ position: "fixed", left: 18, top: "50%", transform: "translateY(-50%)", zIndex: 10001, width: 50, height: 50, borderRadius: "50%", background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <button onClick={e => { e.stopPropagation(); next(); }} aria-label="Successiva" style={{ position: "fixed", right: 18, top: "50%", transform: "translateY(-50%)", zIndex: 10001, width: 50, height: 50, borderRadius: "50%", background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
