// ============================================================================
// Scheda LUOGO: tutte le opere conservate in una città, gli artisti e i periodi
// rappresentati, i collegamenti con le altre città. Raggiungibile dal grafo,
// dalla mappa (marker e lista centri) e dalle schede opera.
// ============================================================================
import { useMemo, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useData, useTimeRange } from "../lib/store";
import { WorkCard, EntityLink, FilterNote, Empty, BarraScheda, Section } from "../components/ui";
import { isCommittente, fmtYear, computeWorkGroups, workGroupMap, nomeBreveLuogo } from "../lib/data";
import { setLastMappa } from "../lib/lastVisited";

export default function Luogo() {
  const { name = "" } = useParams();
  const city = decodeURIComponent(name);
  const ix = useData();
  const nav = useNavigate();
  const { workIn } = useTimeRange();

  // Salva la città come ultima visitata dalla Mappa (per il ritorno via menu)
  useEffect(() => {
    setLastMappa(city);
    window.dispatchEvent(new CustomEvent("atlante:last-visited-changed"));
  }, [city]);

  const allHere = useMemo(() => ix.ds.works.filter((w) => w.location_city === city), [ix, city]);
  const works = useMemo(() => allHere.filter(workIn), [allHere, workIn]);

  const artists = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of works) for (const a of w.artist_ids ?? []) m.set(a, (m.get(a) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [works]);

  // Chi ha commissionato qui: sia chi ha sede in citta', sia chi ha voluto
  // opere che si trovano qui. Sono la stessa domanda vista da due lati, e
  // insieme raccontano la vicenda della committenza in questo luogo.
  const committenti = useMemo(() => {
    const m = new Map<string, { n: number; sede: boolean }>();
    for (const w of works)
      for (const cid of w.committente_ids ?? []) {
        const e = m.get(cid) ?? { n: 0, sede: false };
        e.n++; m.set(cid, e);
      }
    for (const a of ix.ds.artists)
      if (a.location_city === city && isCommittente(a)) {
        const e = m.get(a.id) ?? { n: 0, sede: false };
        e.sede = true; m.set(a.id, e);
      }
    return [...m.entries()]
      .map(([id, v]) => ({ id, ...v, a: ix.artistById.get(id) }))
      .filter((x) => x.a)
      .sort((x, y) => (x.a!.birth ?? x.a!.death ?? 9999) - (y.a!.birth ?? y.a!.death ?? 9999));
  }, [works, ix, city]);

  const committentiPerSecolo = useMemo(() => {
    const m = new Map<number, typeof committenti>();
    for (const c of committenti) {
      const anno = c.a!.birth ?? c.a!.death;
      const sec = anno != null ? Math.floor((anno - 1) / 100) + 1 : 0;
      if (!m.has(sec)) m.set(sec, []);
      m.get(sec)!.push(c);
    }
    return [...m.entries()].sort((a, b) => (a[0] || 99) - (b[0] || 99));
  }, [committenti]);

  // In quali edifici si trovano le opere: una citta' non e' un punto solo,
  // e sapere che venti opere stanno nella stessa chiesa cambia la lettura.
  //
  // Si raggruppa sul nome breve, non sul campo cosi' com'e': nel catalogo certi
  // luoghi sono frasi intere («Galleria degli Uffizi, ma collocazione
  // originaria…») che come etichetta sfondano la pagina e che, scritte in due
  // modi diversi, spezzerebbero in due lo stesso edificio. Il nome breve e' poi
  // la stessa chiave con cui si formano i complessi, quindi da qui si puo'
  // aprire il complesso invece di restare fermi su un'etichetta morta.
  const gruppi = useMemo(() => computeWorkGroups(ix.ds), [ix.ds]);
  const gruppoDiOpera = useMemo(() => workGroupMap(gruppi), [gruppi]);
  const edifici = useMemo(() => {
    // Chiave minuscola per non spezzare in due lo stesso edificio quando il
    // catalogo scrive «Basilica di Santa Croce» e «basilica di Santa Croce».
    const m = new Map<string, { nome: string; opere: typeof works }>();
    for (const w of works) {
      if (!w.location_place) continue;
      const nome = nomeBreveLuogo(w.location_place);
      if (!nome) continue;
      const chiave = nome.toLowerCase();
      if (!m.has(chiave)) m.set(chiave, { nome, opere: [] });
      m.get(chiave)!.opere.push(w);
    }
    return [...m.values()]
      .filter((e) => e.opere.length > 1)
      .sort((a, b) => b.opere.length - a.opere.length)
      .map(({ nome, opere }) => {
        // Il complesso si ricava dalle opere stesse, non dal nome del gruppo:
        // un gruppo prende il nome dal luogo piu' frequente fra le sue opere,
        // che non e' per forza l'edificio da cui si sta guardando.
        const conteggio = new Map<string, number>();
        for (const w of opere) {
          const g = gruppoDiOpera.get(w.id);
          if (g) conteggio.set(g.parent.id, (conteggio.get(g.parent.id) ?? 0) + 1);
        }
        let complessoId: string | null = null;
        let max = 1;
        for (const [id, n] of conteggio) if (n > max) { max = n; complessoId = id; }
        return { nome, n: opere.length, complessoId };
      });
  }, [works, gruppoDiOpera]);

  const arco = useMemo(() => {
    const anni = works.flatMap((w) => [w.year_start, w.year_end].filter((y): y is number => y != null));
    return anni.length ? { da: Math.min(...anni), a: Math.max(...anni) } : null;
  }, [works]);

  const periods = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of works) if (w.period_id) m.set(w.period_id, (m.get(w.period_id) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [works]);

  // Quante altre città sono legate a questa da una connessione fra opere.
  // Serve solo alla frase di apertura: l'elenco degli accostamenti uno per uno
  // stava nella pagina e diceva poco, la mappa mostrava punti-città e non
  // edifici, quindi entrambi sono stati tolti.
  const cittaLegate = useMemo(() => {
    const here = new Set(works.map((w) => w.id));
    const altre = new Set<string>();
    for (const c of ix.ds.connections) {
      if (c.source_type !== "work" || c.target_type !== "work") continue;
      const sHere = here.has(c.source_id), tHere = here.has(c.target_id);
      if (sHere === tHere) continue; // o entrambe qui o nessuna
      const other = ix.workById.get(sHere ? c.target_id : c.source_id);
      if (other?.location_city) altre.add(other.location_city);
    }
    return [...altre].sort();
  }, [ix, works]);

  if (!allHere.length) {
    return (
      <div className="wrap page">
        <BarraScheda />
        <div className="page-head"><h1 className="page-title">{city}</h1></div>
        <Empty msg="Nessuna opera registrata in questo luogo." />
        <Link className="btn sm ghost" to="/mappa" style={{ marginTop: 14 }}>← Torna alla mappa</Link>
      </div>
    );
  }

  return (
    <div className="wrap page" style={{ paddingBottom: 40 }}>
      <BarraScheda />
      <div className="page-head">
        <div className="page-eyebrow"><span className="eyebrow" style={{ color: "#4f7d72" }}>Luogo</span></div>
        <h1 className="page-title">{city}</h1>
        <p className="page-lead">
          {allHere.length} opere del programma sono conservate qui{arco ? `, dal ${fmtYear(arco.da)} al ${fmtYear(arco.a)}` : ""}{cittaLegate.length > 1 ? `, con legami documentati verso ${cittaLegate.length} altre città` : ""}.
        </p>
      </div>
      <div className="page-rule" />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 26, marginBottom: 22 }}>
        {[
          { n: works.length, l: works.length === 1 ? "opera" : "opere" },
          { n: artists.length, l: artists.length === 1 ? "autore" : "autori" },
          { n: committenti.length, l: committenti.length === 1 ? "committente" : "committenti" },
          { n: edifici.length, l: edifici.length === 1 ? "edificio" : "edifici" },
          { n: periods.length, l: periods.length === 1 ? "periodo" : "periodi" },
        ].filter((x) => x.n > 0).map((x) => (
          <div key={x.l}>
            <div className="tnum" style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.1 }}>{x.n}</div>
            <div className="smallcaps" style={{ fontSize: 10.5, color: "var(--ink-dim)" }}>{x.l}</div>
          </div>
        ))}
      </div>

      <div className="filterbar" style={{ marginBottom: 18 }}>
        <FilterNote total={allHere.length} shown={works.length} noun="opere" />
      </div>


      {(artists.length > 0 || periods.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 26 }}>
          {periods.length > 0 && (
            <div>
              <div className="smallcaps" style={{ marginBottom: 8 }}>Periodi rappresentati</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {periods.slice(0, 10).map(([pid, n]) => (
                  <Link key={pid} className="badge-period" to={`/periodo/${pid}`}>{ix.periodById.get(pid)?.name ?? pid} · {n}</Link>
                ))}
              </div>
            </div>
          )}
          {artists.length > 0 && (
            <div>
              <div className="smallcaps" style={{ marginBottom: 8 }}>Artisti presenti</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {artists.slice(0, 12).map(([aid, n]) => (
                  <EntityLink key={aid} type="artist" id={aid} className="chip sm" label={`${ix.artistById.get(aid)?.name ?? aid} · ${n}`} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {committentiPerSecolo.length > 0 && (
        <Section eyebrow="Committenza" title={`Chi ha commissionato qui (${committenti.length})`}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14 }}>
            {committentiPerSecolo.map(([sec, gruppo]) => (
              <div key={sec}>
                <div className="smallcaps" style={{ marginBottom: 7, color: "var(--gold-deep)" }}>
                  {sec ? `${sec}° secolo` : "Enti, corporazioni e famiglie"} · {gruppo.length}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minWidth: 0 }}>
                  {gruppo.map(({ id, n, a }) => (
                    <EntityLink
                      key={id} type="artist" id={id} className="chip sm"
                      label={n > 0 ? `${a!.name} · ${n}` : a!.name}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {edifici.length > 0 && (
        <Section eyebrow="Topografia" title={`Dove si trovano, in città (${edifici.length})`}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {edifici.map(({ nome, n, complessoId }) => complessoId ? (
              <Link key={nome} to={`/complesso/${complessoId}`} className="chip sm"
                title={`Apri il complesso: ${nome}`}>{nome} · {n}</Link>
            ) : (
              <span key={nome} className="chip sm" style={{ cursor: "default" }}>{nome} · {n}</span>
            ))}
          </div>
        </Section>
      )}

      <div className="smallcaps" style={{ margin: "6px 0 12px" }}>Le opere ({works.length})</div>
      <div className="grid-works">
        {works.map((w) => (
          <WorkCard key={w.id} work={w} subtitle={[w.date_text, ix.periodById.get(w.period_id)?.name].filter(Boolean).join(" · ")} />
        ))}
      </div>
    </div>
  );
}
