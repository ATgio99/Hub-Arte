// ============================================================================
// Login — componente per accedere o registrarsi con email e password
// Include export/import dati per migrare dalla vecchia versione
// ============================================================================
import { useState } from "react";
import { useAuth } from "../lib/auth";
import { fullSync } from "../lib/sync";
import { getFavorites, setFavorites } from "../lib/favorites";
import { getStudied, setStudied } from "../lib/studied";
import { getOverrides, setOverrides } from "../lib/imageOverrides";

export default function Login() {
  const { signIn, signUp, signOut, user, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importResult, setImportResult] = useState<string | null>(null);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <div className="spinner" />
      </div>
    );
  }

  // ---- EXPORT: genera JSON con tutti i dati locali ----
  const handleExport = () => {
    const data = {
      favorites: getFavorites(),
      studied: getStudied(),
      imageOverrides: getOverrides(),
      exportedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(data);
    navigator.clipboard.writeText(json).then(() => {
      setSyncResult("✓ Dati copiati negli appunti! Incollali nella nuova versione.");
    }).catch(() => {
      // Fallback: mostra il JSON in un textarea
      setImportJson(json);
      setShowImport(true);
      setSyncResult("Copia il JSON dal campo sotto.");
    });
  };

  // ---- IMPORT: carica JSON nella nuova versione ----
  const handleImport = () => {
    setImportResult(null);
    doImport(importJson);
  };

  // ---- IMPORT DA FILE ----
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      doImport(text);
    };
    reader.readAsText(file);
  };

  const doImport = (jsonStr: string) => {
    setImportResult(null);
    try {
      const data = JSON.parse(jsonStr);
      if (typeof data !== "object" || data === null) {
        setImportResult("✗ JSON non valido. Incolla i dati esportati dalla vecchia versione.");
        return;
      }

      let imported = 0;

      // Import preferiti (merge)
      if (data.favorites) {
        const current = getFavorites();
        const incomingWorks = Array.isArray(data.favorites.works) ? data.favorites.works : [];
        const incomingArtists = Array.isArray(data.favorites.artists) ? data.favorites.artists : [];
        const mergedWorks = [...new Set([...current.works, ...incomingWorks])];
        const mergedArtists = [...new Set([...current.artists, ...incomingArtists])];
        const addedW = mergedWorks.length - current.works.length;
        const addedA = mergedArtists.length - current.artists.length;
        setFavorites({ works: mergedWorks, artists: mergedArtists });
        imported += addedW + addedA;
      }

      // Import approfondite (merge)
      if (Array.isArray(data.studied)) {
        const current = getStudied();
        const merged = [...new Set([...current, ...data.studied])];
        const added = merged.length - current.length;
        setStudied(merged);
        imported += added;
      }

      // Import immagini (merge)
      if (data.imageOverrides && typeof data.imageOverrides === "object") {
        const current = getOverrides();
        let added = 0;
        for (const [k, v] of Object.entries(data.imageOverrides as any)) {
          if (!current[k]) {
            current[k] = typeof v === "object" && v !== null ? v : { url: String(v), setAt: new Date().toISOString() };
            added++;
          }
        }
        if (added > 0) {
          setOverrides(current);
          imported += added;
        }
      }

      setImportResult(`✓ Importati ${imported} nuovi elementi! Se sei loggato, clicca "Sincronizza ora" per mandarli sul cloud.`);
      setImportJson("");
    } catch (e: any) {
      setImportResult(`✗ Errore: JSON non valido. Controlla di aver copiato tutto.`);
    }
  };

  // Utente loggato — mostra profilo + sync + import/export
  if (user) {
    const favs = getFavorites();
    const studied = getStudied();
    const overrides = getOverrides();

    const handleSync = async () => {
      setSyncing(true);
      setSyncResult(null);
      try {
        await fullSync(user);
        const updatedFavs = getFavorites();
        const updatedStudied = getStudied();
        const updatedOverrides = getOverrides();
        const totalUpdated = updatedFavs.works.length + updatedFavs.artists.length;
        setSyncResult(`✓ Sincronizzato! ${totalUpdated} preferiti, ${updatedStudied.length} approfondite, ${Object.keys(updatedOverrides).length} immagini nel cloud.`);
      } catch (e: any) {
        setSyncResult(`✗ Errore: ${e.message || "sync fallita"}`);
      }
      setSyncing(false);
    };

    return (
      <div className="card" style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 700, fontSize: 16, flexShrink: 0,
          }}>
            {(user.email?.[0] ?? "U").toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.email}
            </div>
            <div style={{ fontSize: 12, color: "var(--c-technique)" }}>Sincronizzazione attiva ✓</div>
          </div>
        </div>

        {/* Riepilogo dati */}
        <div style={{
          padding: "12px 14px", borderRadius: 8, background: "var(--bg-2)",
          border: "1px solid var(--line-soft)", fontSize: 13, lineHeight: 1.7,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 12, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-dim)" }}>
            I tuoi dati
          </div>
          <div>★ <b>{favs.works.length}</b> opere preferite · <b>{favs.artists.length}</b> artisti preferiti</div>
          <div>✓ <b>{studied.length}</b> opere approfondite</div>
          <div>🖼 <b>{Object.keys(overrides).length}</b> immagini personalizzate</div>
        </div>

        {/* Sync */}
        <button className="btn gold sm" onClick={handleSync} disabled={syncing} style={{ marginTop: 4 }}>
          {syncing ? "Sincronizzazione…" : "↻ Sincronizza ora con il cloud"}
        </button>

        {syncResult && (
          <div style={{ fontSize: 13, lineHeight: 1.4, color: syncResult.startsWith("✓") ? "var(--c-technique)" : "var(--c-event)" }}>
            {syncResult}
          </div>
        )}

        {/* Export / Import */}
        <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 12, marginTop: 4 }}>
          <div className="smallcaps" style={{ marginBottom: 8 }}>Esporta / Importa dati</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn sm" onClick={handleExport}>
              📋 Esporta dati
            </button>
            <button className="btn sm" onClick={() => setShowImport(!showImport)}>
              {showImport ? "Chiudi import" : "📥 Importa dati"}
            </button>
          </div>

          {showImport && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 6, lineHeight: 1.5 }}>
                Incolla il JSON esportato dalla vecchia versione, oppure carica il file JSON scaricato. I dati verranno uniti (merge) — non verrà perso nulla.
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{
                  padding: "7px 14px", borderRadius: 8, border: "1px solid var(--line)",
                  background: "var(--bg-1)", cursor: "pointer", fontSize: 13, fontWeight: 500,
                }}>
                  📁 Carica file JSON
                  <input type="file" accept=".json" onChange={handleFileImport} style={{ display: "none" }} />
                </label>
                <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>oppure incolla sotto:</span>
              </div>
              <textarea
                value={importJson}
                onChange={e => setImportJson(e.target.value)}
                placeholder='Incolla il JSON qui... {"favorites":{...},"studied":[...],...}'
                style={{
                  width: "100%", height: 100, padding: "8px 10px",
                  border: "1px solid var(--line)", borderRadius: 8,
                  background: "var(--bg)", color: "var(--ink)", fontSize: 12,
                  fontFamily: "monospace", resize: "vertical",
                }}
              />
              <button className="btn gold sm" onClick={handleImport} disabled={!importJson.trim()} style={{ marginTop: 6 }}>
                Importa e unisci
              </button>
              {importResult && (
                <div style={{ fontSize: 13, lineHeight: 1.4, marginTop: 6, color: importResult.startsWith("✓") ? "var(--c-technique)" : "var(--c-event)" }}>
                  {importResult}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5 }}>
          La sincronizzazione spinge i tuoi dati locali sul cloud e scarica eventuali dati da altri dispositivi.
        </div>

        <button className="btn ghost sm" onClick={signOut} style={{ alignSelf: "flex-start", marginTop: 4 }}>
          Esci
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSent(false);

    if (!email.trim() || !password.trim()) {
      setError("Inserisci email e password.");
      return;
    }
    if (password.length < 6) {
      setError("La password deve avere almeno 6 caratteri.");
      return;
    }

    if (mode === "signup") {
      const { error: err } = await signUp(email.trim(), password);
      if (err) {
        setError(err);
      } else {
        setSent(true);
      }
    } else {
      const { error: err } = await signIn(email.trim(), password);
      if (err) setError(err);
    }
  };

  return (
    <div className="card" style={{ padding: "28px 32px", maxWidth: 420 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>Account</div>
      <h3 style={{ fontSize: 22, fontFamily: "var(--font-display)", marginBottom: 16 }}>
        {mode === "login" ? "Accedi" : "Registrati"}
      </h3>

      {sent ? (
        <div>
          <p style={{ fontSize: 14.5, lineHeight: 1.6 }}>
            Ti abbiamo inviato un'email di conferma a <b>{email}</b>.
            Clicca il link nell'email per attivare l'account, poi torna qui ad accedere.
          </p>
          <button className="btn ghost sm" onClick={() => { setSent(false); setMode("login"); }} style={{ marginTop: 12 }}>
            Torna al login
          </button>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="filter-label">Email</label>
              <input type="email" className="input" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com" autoComplete="email" style={{ width: "100%" }} />
            </div>
            <div>
              <label className="filter-label">Password</label>
              <input type="password" className="input" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Almeno 6 caratteri"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                style={{ width: "100%" }} />
            </div>

            {error && (
              <div style={{ color: "#a8483f", fontSize: 13, lineHeight: 1.4 }}>{error}</div>
            )}

            <button type="submit" className="btn gold sm" style={{ marginTop: 4 }}>
              {mode === "login" ? "Accedi →" : "Registrati →"}
            </button>

            <div style={{ fontSize: 13, color: "var(--ink-dim)" }}>
              {mode === "login" ? (
                <>Non hai un account?{" "}
                  <button type="button" onClick={() => { setMode("signup"); setError(null); }}
                    style={{ background: "none", border: 0, padding: 0, color: "var(--gold)", cursor: "pointer", textDecoration: "underline", fontSize: 13 }}>
                    Registrati
                  </button>
                </>
              ) : (
                <>Hai già un account?{" "}
                  <button type="button" onClick={() => { setMode("login"); setError(null); }}
                    style={{ background: "none", border: 0, padding: 0, color: "var(--gold)", cursor: "pointer", textDecoration: "underline", fontSize: 13 }}>
                    Accedi
                  </button>
                </>
              )}
            </div>
          </form>

          {/* Import dati anche senza login */}
          <div style={{ borderTop: "1px solid var(--line-soft)", marginTop: 16, paddingTop: 14 }}>
            <button className="btn sm" onClick={() => setShowImport(!showImport)}>
              {showImport ? "Chiudi" : "📥 Importa dati dalla vecchia versione"}
            </button>

            {showImport && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: "var(--ink-dim)", marginBottom: 8, lineHeight: 1.5 }}>
                  <b style={{ color: "var(--ink)" }}>Come migrare i tuoi dati:</b><br />
                  1. Apri la <b>vecchia versione</b> nel browser e apri il file <b>export.html</b><br />
                  2. Clicca <b>"Scarica file JSON"</b> per scaricare i tuoi dati<br />
                  3. Torna qui e carica il file, oppure incolla il JSON:
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <label style={{
                    padding: "7px 14px", borderRadius: 8, border: "1px solid var(--line)",
                    background: "var(--bg-1)", cursor: "pointer", fontSize: 13, fontWeight: 500,
                  }}>
                    📁 Carica file JSON
                    <input type="file" accept=".json" onChange={handleFileImport} style={{ display: "none" }} />
                  </label>
                  <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>oppure incolla sotto:</span>
                </div>
                <textarea
                  value={importJson}
                  onChange={e => setImportJson(e.target.value)}
                  placeholder='Incolla il JSON qui... {"favorites":{...},"studied":[...],...}'
                  style={{
                    width: "100%", height: 100, padding: "8px 10px",
                    border: "1px solid var(--line)", borderRadius: 8,
                    background: "var(--bg)", color: "var(--ink)", fontSize: 12,
                    fontFamily: "monospace", resize: "vertical",
                  }}
                />
                <button className="btn gold sm" onClick={handleImport} disabled={!importJson.trim()} style={{ marginTop: 6 }}>
                  Importa e unisci
                </button>
                {importResult && (
                  <div style={{ fontSize: 13, lineHeight: 1.4, marginTop: 6, color: importResult.startsWith("✓") ? "var(--c-technique)" : "var(--c-event)" }}>
                    {importResult}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ marginTop: 16, padding: "10px 12px", borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--line-soft)", fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-dim)" }}>
            <b style={{ color: "var(--ink)" }}>Come funziona la sincronizzazione</b><br />
            Quando accedi, i tuoi ★ preferiti, ✓ approfondite e 🖼 immagini personalizzate vengono inviati al cloud e scaricati su tutti i tuoi dispositivi collegati allo stesso account.
          </div>
        </>
      )}
    </div>
  );
}
