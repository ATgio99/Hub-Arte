import { ReactNode, CSSProperties, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { Work, EntityType } from "../lib/types";
import { useData } from "../lib/store";
import { entityLabel, resolveEntity, WorkGroup } from "../lib/data";
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
export function WorkCard({ work, subtitle, showStudied }: { work: Work; subtitle?: string; showStudied?: boolean }) {
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

// ---- Sezione numerata (opzionalmente collassabile) --------------------------
export function Section({ num, eyebrow, title, children, right, collapsible = false, defaultCollapsed = false }:
  { num?: string; eyebrow?: string; title?: string; children: ReactNode; right?: ReactNode;
    collapsible?: boolean; defaultCollapsed?: boolean }) {
  const [open, setOpen] = useState(!defaultCollapsed);
  if (collapsible) {
    return (
      <section className="section section-collapsible">
        <button
          type="button"
          className="section-head section-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          style={{ width: "100%", textAlign: "left", cursor: "pointer", background: "transparent", border: 0, padding: 0, font: "inherit", color: "inherit" }}
        >
          <div>
            {(num || eyebrow) && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                {num && <span className="sec-num">{num}</span>}
                {eyebrow && <span className="eyebrow">{eyebrow}</span>}
              </div>
            )}
            {title && <h2 className="section-title">{title}</h2>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {right}
            {/* Badge "Apri/Chiudi" — affordance esplicita che la sezione è collassabile */}
            <span className={`section-toggle-badge ${open ? "open" : "closed"}`} aria-hidden="true">
              <span className="section-toggle-badge-text">{open ? "Chiudi" : "Apri"}</span>
              <span className="section-chevron" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </span>
          </div>
        </button>
        {open && <div className="section-body">{children}</div>}
      </section>
    );
  }
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

// ---- Nota filtro temporale attivo (mostrata in cima alle viste) -----------
export function FilterNote({ total, shown, noun = "elementi" }: { total: number; shown: number; noun?: string }) {
  if (shown === total) return null;
  return (
    <div className="filter-note" data-testid="filter-note">
      Filtro temporale attivo · <b>{shown}</b> di {total} {noun}
    </div>
  );
}
