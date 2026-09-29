// ============================================================================
// Mappa della scheda LUOGO: la citta' vista da vicino, con un punto per ogni
// edificio che custodisce le opere, e un piccolo riquadro d'Europa che dice
// dove si trova. Accanto, l'elenco dei luoghi: un clic porta la mappa sul
// punto e ne apre il riquadro.
//
// Molte opere hanno solo le coordinate della citta' (non dell'edificio): in
// quel caso finiscono tutte nello stesso punto, e il riquadro di quel punto
// elenca tutti i luoghi che vi cadono.
// ============================================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from "react-leaflet";
import type { CircleMarker as LCircleMarker } from "leaflet";
import { Link } from "react-router-dom";
import type { Work } from "../lib/types";
import { nomeBreveLuogo } from "../lib/data";

const BASE = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const NOMI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

interface Luogo { nome: string; opere: Work[]; complessoId: string | null; }
interface Punto { chiave: string; lat: number; lon: number; luoghi: Luogo[]; n: number; }

const SENZA_LUOGO = "Altri luoghi in città";

function distanzaKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = Math.PI / 180, x = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r), y = (b.lat - a.lat) * r;
  return Math.sqrt(x * x + y * y) * 6371;
}

function Inquadra({ punti }: { punti: Punto[] }) {
  const map = useMap();
  useEffect(() => {
    if (!punti.length) return;
    const t = setTimeout(() => {
      map.invalidateSize();
      // Si inquadra il nucleo della citta': i luoghi a meno di 3 km dal punto
      // con piu' opere. Quelli fuori (Fiesole, una villa in campagna) restano
      // raggiungibili dall'elenco senza costringere la mappa a rimpicciolirsi.
      const [c] = punti;
      const vicini = punti.filter((p) => distanzaKm(p, c) < 3);
      const usa = vicini.length >= 2 ? vicini : punti;
      if (usa.length === 1) map.setView([usa[0].lat, usa[0].lon], 14);
      else {
        const lats = usa.map((p) => p.lat), lons = usa.map((p) => p.lon);
        map.fitBounds([[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]], { padding: [48, 48], maxZoom: 16 });
      }
    }, 80);
    return () => clearTimeout(t);
  }, [punti, map]);
  return null;
}

// Tiene un riferimento alla mappa per poterla muovere dall'elenco.
function Aggancio({ onMap }: { onMap: (m: ReturnType<typeof useMap>) => void }) {
  const map = useMap();
  useEffect(() => { onMap(map); }, [map, onMap]);
  return null;
}

export default function MappaCitta({ city, works, complessoDi }:
  { city: string; works: Work[]; complessoDi: (w: Work) => string | null }) {

  // Luoghi della citta' (nome breve dell'edificio), ognuno con le sue opere.
  const luoghi = useMemo<Luogo[]>(() => {
    const m = new Map<string, Luogo>();
    for (const w of works) {
      const nome = (w.location_place && nomeBreveLuogo(w.location_place)) || SENZA_LUOGO;
      const k = nome.toLowerCase();
      if (!m.has(k)) m.set(k, { nome, opere: [], complessoId: null });
      m.get(k)!.opere.push(w);
    }
    for (const l of m.values()) {
      const conta = new Map<string, number>();
      for (const w of l.opere) { const c = complessoDi(w); if (c) conta.set(c, (conta.get(c) ?? 0) + 1); }
      let max = 1;
      for (const [id, n] of conta) if (n > max) { max = n; l.complessoId = id; }
    }
    return [...m.values()].sort((a, b) => (a.nome === SENZA_LUOGO ? 1 : 0) - (b.nome === SENZA_LUOGO ? 1 : 0) || b.opere.length - a.opere.length);
  }, [works, complessoDi]);

  // Punti sulla mappa: un luogo cade dove cade la maggior parte delle sue opere.
  const { punti, puntoDi } = useMemo(() => {
    const m = new Map<string, Punto>(); const puntoDi = new Map<string, string>();
    for (const l of luoghi) {
      const conta = new Map<string, { lat: number; lon: number; n: number }>();
      for (const w of l.opere) {
        if (w.lat == null || w.lon == null) continue;
        const k = `${w.lat.toFixed(4)},${w.lon.toFixed(4)}`;
        const e = conta.get(k) ?? { lat: w.lat, lon: w.lon, n: 0 }; e.n++; conta.set(k, e);
      }
      const best = [...conta.entries()].sort((a, b) => b[1].n - a[1].n)[0];
      if (!best) continue;
      const [k, c] = best;
      if (!m.has(k)) m.set(k, { chiave: k, lat: c.lat, lon: c.lon, luoghi: [], n: 0 });
      const p = m.get(k)!; p.luoghi.push(l); p.n += l.opere.length; puntoDi.set(l.nome, k);
    }
    return { punti: [...m.values()].sort((a, b) => b.n - a.n), puntoDi };
  }, [luoghi]);

  const centro = useMemo<[number, number] | null>(() => {
    if (!punti.length) return null;
    const p = punti[0]; return [p.lat, p.lon];
  }, [punti]);

  const [attivo, setAttivo] = useState<string | null>(null);
  const mappa = useRef<ReturnType<typeof useMap> | null>(null);
  const marker = useRef<Record<string, LCircleMarker | null>>({});
  const maxN = Math.max(...punti.map((p) => p.n), 1);

  if (!punti.length || !centro) return null;

  const vaiA = (nome: string) => {
    const k = puntoDi.get(nome); if (!k) return;
    const p = punti.find((x) => x.chiave === k); if (!p || !mappa.current) return;
    setAttivo(k);
    const m = mappa.current;
    // Il riquadro si apre a volo finito, cosi' la mappa puo' spostarsi quanto
    // serve per mostrarlo intero.
    const apri = () => { const mk = marker.current[k]; if (mk && !mk.isPopupOpen()) mk.openPopup(); };
    m.once("moveend", apri);
    setTimeout(apri, 900); // se la mappa era gia' li', il volo non parte e moveend non arriva
    m.flyTo([p.lat, p.lon], Math.max(m.getZoom(), 15), { duration: 0.6 });
  };

  return (
    <section className="citta-mappa" aria-label={`Mappa di ${city}`}>
      <div className="stage citta-mappa-stage">
        <MapContainer center={centro} zoom={13} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
          <TileLayer url={BASE} attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors" maxZoom={18} />
          <TileLayer url={NOMI} maxZoom={18} />
          <Inquadra punti={punti} />
          <Aggancio onMap={(m) => { mappa.current = m; }} />
          {punti.map((p) => {
            const on = attivo === p.chiave;
            return (
              <CircleMarker key={p.chiave} center={[p.lat, p.lon]} radius={5 + Math.sqrt(p.n / maxN) * 11}
                ref={(r) => { marker.current[p.chiave] = r as LCircleMarker | null; }}
                eventHandlers={{ click: () => setAttivo(p.chiave), popupclose: () => setAttivo((a) => (a === p.chiave ? null : a)) }}
                pathOptions={{ color: "#8f6a1d", fillColor: on ? "#b88a2e" : "#caa14a", fillOpacity: on ? 0.85 : 0.6, weight: on ? 2 : 1.2 }}>
                <Tooltip direction="top" offset={[0, -6]} opacity={1} className="citta-tip">
                  {p.luoghi.length === 1 ? p.luoghi[0].nome : `${p.luoghi.length} luoghi`} · {p.n}
                </Tooltip>
                <Popup maxWidth={280} autoPanPadding={[24, 24]}>
                  <div className="citta-pop">
                    {p.luoghi.map((l) => (
                      <div key={l.nome} className="citta-pop-luogo">
                        <div className="citta-pop-nome">{l.nome}</div>
                        <div className="citta-pop-n">{l.opere.length} {l.opere.length === 1 ? "opera" : "opere"}
                          {l.complessoId && <> · <Link to={`/complesso/${l.complessoId}`}>apri il complesso</Link></>}
                        </div>
                        <ul>
                          {l.opere.slice(0, 6).map((w) => <li key={w.id}><Link to={`/opera/${w.id}`}>{w.title}</Link></li>)}
                          {l.opere.length > 6 && <li className="citta-pop-altre">e altre {l.opere.length - 6}</li>}
                        </ul>
                      </div>
                    ))}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Dove si trova la citta': un'Europa piccola e ferma, con un punto solo,
            in alto a destra (lo zoom sta a sinistra, i crediti in basso). */}
        <div className="citta-locator" aria-hidden="true">
          <MapContainer center={centro} zoom={3} zoomControl={false} attributionControl={false} dragging={false}
            scrollWheelZoom={false} doubleClickZoom={false} touchZoom={false} boxZoom={false} keyboard={false}
            style={{ height: "100%", width: "100%" }}>
            <TileLayer url={BASE} maxZoom={6} />
            <CircleMarker center={centro} radius={9} pathOptions={{ color: "#8f6a1d", weight: 1, fillColor: "#caa14a", fillOpacity: 0.25 }} />
            <CircleMarker center={centro} radius={3.5} pathOptions={{ color: "#8f6a1d", weight: 1.5, fillColor: "#8f6a1d", fillOpacity: 1 }} />
          </MapContainer>
          <span className="citta-locator-nome">{city}</span>
        </div>
      </div>

      <div className="citta-luoghi">
        <h2 className="citta-luoghi-titolo">Dove si trovano le opere</h2>
        <p className="citta-luoghi-nota">{luoghi.length === 1 ? "Un luogo" : `${luoghi.length} luoghi`} in città. Scegli un nome per vederlo sulla mappa.</p>
        <ol className="citta-luoghi-lista">
          {luoghi.map((l) => {
            const k = puntoDi.get(l.nome);
            const on = !!k && attivo === k;
            return (
              <li key={l.nome}>
                <button type="button" className={`citta-luogo ${on ? "on" : ""}`} onClick={() => vaiA(l.nome)} disabled={!k}
                  aria-pressed={on}>
                  <span className="citta-luogo-nome">{l.nome}</span>
                  <span className="citta-luogo-n tnum">{l.opere.length}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
