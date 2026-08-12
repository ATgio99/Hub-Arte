// ============================================================================
// Login — componente per accedere o registrarsi con email e password
// Include export/import dati per migrare dalla vecchia versione
// ============================================================================
import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { fullSync } from "../lib/sync";
import { getFavorites, setFavorites, clearAllFavorites } from "../lib/favorites";
import { getStudied, setStudied, clearAllStudied } from "../lib/studied";
import { getOverrides, setOverrides, getGlobalOverrides, setGlobalOverrides } from "../lib/imageOverrides";

export default function Login() {
  const { signIn, signUp, signOut, user, loading, resetPassword, updateNewPassword, passwordRecoveryActive } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotSending, setForgotSending] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryPw, setRecoveryPw] = useState("");
  const [recoveryPwConfirm, setRecoveryPwConfirm] = useState("");
  const [recoveryMsg, setRecoveryMsg] = useState<string | null>(null);
  const [recoverySending, setRecoverySending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importResult, setImportResult] = useState<string | null>(null);
  const [showAccount, setShowAccount] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [changingPw, setChangingPw] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  // Azzeramento progressi (zona pericolosa)
  const [resetting, setResetting] = useState(false);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <div className="spinner" />
      </div>
    );
  }

  // ---- EXPORT: genera JSON con tutti i dati locali e scarica un file ----
  // Include: preferiti, approfondite, override immagini PRIVATI e GLOBALI.
  // NOTA: i globali di solito vengono riscaricati dal cloud al login, ma
  // li esportiamo comunque per backup completo (utile se l'utente è admin
  // o per ripristinare su un altro browser senza attendere il sync).
  const handleExport = () => {
    const data = {
      favorites: getFavorites(),
      studied: getStudied(),
      imageOverrides: getOverrides(),           // privati dell'utente
      globalImageOverrides: getGlobalOverrides(), // globali (admin o scaricati dal cloud)
      exportedAt: new Date().toISOString(),
      version: 2, // versione del formato JSON (per futuri upgrade)
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hubart-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const counts = {
      favs: data.favorites.works.length + data.favorites.artists.length,
      studied: data.studied.length,
      priv: Object.keys(data.imageOverrides).length,
      glob: Object.keys(data.globalImageOverrides).length,
    };
    setSyncResult(`✓ Backup scaricato! ${counts.favs} preferiti, ${counts.studied} approfondite, ${counts.priv} immagini private, ${counts.glob} globali.`);
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

      // Import immagini PRIVATE (merge — non sovrascive esistenti)
      if (data.imageOverrides && typeof data.imageOverrides === "object") {
        const current = getOverrides();
        let added = 0;
        for (const [k, v] of Object.entries(data.imageOverrides as any)) {
          if (!current[k]) {
            const entry: any = typeof v === "object" && v !== null
              ? { ...v, isGlobal: false }
              : { url: String(v), setAt: new Date().toISOString(), isGlobal: false };
            // Assicurati che i campi obbligatori ci siano
            if (typeof entry.url === "string" && entry.url.trim()) {
              current[k] = entry;
              added++;
            }
          }
        }
        if (added > 0) {
          setOverrides(current);
          imported += added;
        }
      }

      // Import immagini GLOBALI (merge — non sovrascive esistenti)
      // NOTA: di solito i globali vengono riscaricati dal cloud al login,
      // ma se l'utente sta importando un backup offline, li ripristiniamo.
      if (data.globalImageOverrides && typeof data.globalImageOverrides === "object") {
        const current = getGlobalOverrides();
        let added = 0;
        for (const [k, v] of Object.entries(data.globalImageOverrides as any)) {
          if (!current[k]) {
            const entry: any = typeof v === "object" && v !== null
              ? { ...v, isGlobal: true }
              : { url: String(v), setAt: new Date().toISOString(), isGlobal: true };
            if (typeof entry.url === "string" && entry.url.trim()) {
              current[k] = entry;
              added++;
            }
          }
        }
        if (added > 0) {
          setGlobalOverrides(current);
          imported += added;
        }
      }

      // Retrocompatibilità: vecchio formato salvava tutto in "imageOverrides"
      // senza distinguere privati/globali. Se non c'è globalImageOverrides ma
      // alcuni entry di imageOverrides hanno isGlobal=true, splittali.
      if (!data.globalImageOverrides && data.imageOverrides) {
        const globMap = getGlobalOverrides();
        let moved = 0;
        for (const [k, v] of Object.entries(data.imageOverrides as any)) {
          const isGlob = typeof v === "object" && v !== null && (v as any).isGlobal === true;
          if (isGlob && !globMap[k] && typeof (v as any).url === "string") {
            globMap[k] = { ...(v as any), isGlobal: true };
            moved++;
          }
        }
        if (moved > 0) {
          setGlobalOverrides(globMap);
          imported += moved;
        }
      }

      setImportResult(`✓ Importati ${imported} nuovi elementi! Se sei loggato, clicca "Sincronizza ora" per mandarli sul cloud.`);
      setImportJson("");
    } catch (e: any) {
      setImportResult(`✗ Errore: JSON non valido. Controlla di aver copiato tutto.`);
    }
  };

  // ---- RECUPERO PASSWORD ----
  useEffect(() => {
    if (passwordRecoveryActive) { setRecoveryMode(true); setForgotMode(false); }
  }, [passwordRecoveryActive]);

  const handleForgotPassword = async () => {
    setForgotMsg(null);
    if (!forgotEmail.trim()) { setForgotMsg("Inserisci la tua email."); return; }
    setForgotSending(true);
    const { error } = await resetPassword(forgotEmail.trim());
    setForgotSending(false);
    if (error) setForgotMsg("✗ " + error);
    else { setForgotMsg("✓ Email di recupero inviata! Controlla la casella di posta (anche spam)."); setForgotEmail(""); }
  };

  const handleRecoveryUpdate = async () => {
    setRecoveryMsg(null);
    if (!recoveryPw.trim()) { setRecoveryMsg("Inserisci la nuova password."); return; }
    if (recoveryPw.length < 6) { setRecoveryMsg("La password deve avere almeno 6 caratteri."); return; }
    if (recoveryPw !== recoveryPwConfirm) { setRecoveryMsg("Le password non coincidono."); return; }
    setRecoverySending(true);
    const { error } = await updateNewPassword(recoveryPw.trim());
    setRecoverySending(false);
    if (error) setRecoveryMsg("✗ " + error);
    else { setRecoveryMsg("✓ Password aggiornata con successo!"); setRecoveryPw(""); setRecoveryPwConfirm(""); setRecoveryMode(false); setTimeout(() => window.location.reload(), 1500); }
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

    // ---- AZZERA TUTTI I PROGRESSI (zona pericolosa) ----
    const handleResetProgress = async () => {
      const confirmed = window.confirm(
        "⚠️ CONFERMA AZZERAMENTO TOTALE\n\n" +
        "Stai per cancellare TUTTI i tuoi progressi:\n" +
        "  • Tutti i preferiti (★)\n" +
        "  • Tutte le opere approfondite (✓)\n" +
        "  • I dati corrispondenti sul cloud Supabase\n\n" +
        "Questa azione è IRREVERSIBILE.\n\nVuoi procedere?"
      );
      if (!confirmed) return;

      setResetting(true);
      setSyncResult("⏳ Azzeramento in corso...");

      // 1) Pulisci localStorage SUBITO (sincrono) — feedback immediato
      try {
        localStorage.removeItem("atlante:favorites");
        localStorage.removeItem("atlante:studied");
        localStorage.removeItem("atlante:favorites-tombstones");
        localStorage.removeItem("atlante:studied-tombstones");
        window.dispatchEvent(new CustomEvent("atlante:favs-changed"));
        window.dispatchEvent(new CustomEvent("atlante:studied-changed"));
      } catch { /* ignore */ }

      // 2) Attendi la delete su Supabase con Promise.all
      try {
        await Promise.all([
          clearAllFavorites(),
          clearAllStudied(),
        ]);
      } catch { /* ignore — il localStorage è già pulito */ }

      // 3) Ricarica dopo 2 secondi per mostrare il feedback
      setTimeout(() => {
        window.location.reload();
      }, 2000);
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

        {/* Export / Import / Account */}
        <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 12, marginTop: 4 }}>
          <div className="smallcaps" style={{ marginBottom: 8 }}>Account, dati e sincronizzazione</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn sm" onClick={handleExport}>
              💾 Esporta dati (JSON)
            </button>
            <button className="btn sm" onClick={() => setShowImport(!showImport)}>
              {showImport ? "Chiudi import" : "📥 Importa dati"}
            </button>
          </div>

          {/* Cambia email — sempre visibile */}
          <div style={{ marginTop: 12, padding: 14, background: "var(--bg-1)", borderRadius: 10, border: "1px solid var(--line)" }}>
            <div className="smallcaps" style={{ marginBottom: 8 }}>Cambia email</div>
            <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: "0 0 8px" }}>
              Email attuale: <b>{user?.email}</b>
            </p>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Nuova email"
              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, fontFamily: "inherit", marginBottom: 8 }}
            />
            {emailMsg && <div style={{ fontSize: 12, marginBottom: 6, color: emailMsg.startsWith("✓") ? "#3f8a4f" : "#a8483f" }}>{emailMsg}</div>}
            <button
              className="btn gold sm"
              disabled={changingEmail || !newEmail.trim() || newEmail.trim() === user?.email}
              onClick={async () => {
                setChangingEmail(true); setEmailMsg(null);
                const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
                setChangingEmail(false);
                if (error) setEmailMsg("✗ " + error.message);
                else setEmailMsg("✓ Email aggiornata! Controlla entrambe le caselle email per confermare il cambio.");
              }}
            >
              {changingEmail ? "Invio…" : "Cambia email"}
            </button>
          </div>

          {/* Cambia password — sempre visibile, due campi */}
          <div style={{ marginTop: 12, padding: 14, background: "var(--bg-1)", borderRadius: 10, border: "1px solid var(--line)" }}>
            <div className="smallcaps" style={{ marginBottom: 8 }}>Cambia password</div>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPwMsg(null); }}
              placeholder="Nuova password (min. 6 caratteri)"
              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, fontFamily: "inherit", marginBottom: 8 }}
            />
            <input
              type="password"
              value={newPasswordConfirm}
              onChange={(e) => { setNewPasswordConfirm(e.target.value); setPwMsg(null); }}
              placeholder="Ripeti la nuova password"
              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, fontFamily: "inherit", marginBottom: 8 }}
            />
            {pwMsg && <div style={{ fontSize: 12, marginBottom: 6, color: pwMsg.startsWith("✓") ? "#3f8a4f" : "#a8483f" }}>{pwMsg}</div>}
            <button
              className="btn gold sm"
              disabled={changingPw || !newPassword.trim() || newPassword.length < 6}
              onClick={async () => {
                if (newPassword !== newPasswordConfirm) {
                  setPwMsg("✗ Le password non coincidono. Riprova.");
                  return;
                }
                setChangingPw(true); setPwMsg(null);
                const { error } = await supabase.auth.updateUser({ password: newPassword.trim() });
                setChangingPw(false);
                if (error) setPwMsg("✗ " + error.message);
                else {
                  setPwMsg("✓ Password aggiornata!");
                  setNewPassword("");
                  setNewPasswordConfirm("");
                }
              }}
            >
              {changingPw ? "Invio…" : "Cambia password"}
            </button>
          </div>

          {/* ===== ZONA PERICOLOSA: Azzera progressi ===== */}
          <div style={{
            marginTop: 12, padding: 14,
            background: "rgba(168,72,63,0.04)",
            border: "1px solid rgba(168,72,63,0.3)",
            borderRadius: 10,
          }}>
            <div className="smallcaps" style={{ marginBottom: 8, color: "#a8483f" }}>⚠️ Zona pericolosa</div>
            <p style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-soft)", margin: "0 0 10px" }}>
              Azzeri tutti i preferiti (★) e le opere approfondite (✓) — sia da questo browser che dal cloud.
              <b> L'azione è irreversibile.</b>
            </p>
            <button
              onClick={handleResetProgress}
              disabled={resetting || syncing}
              className="btn sm"
              style={{
                background: "#a8483f", color: "#fff", borderColor: "#a8483f",
                cursor: resetting ? "wait" : "pointer",
              }}
            >
              {resetting ? "⏳ Azzeramento…" : "🗑️ Azzera tutti i progressi"}
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
      ) : recoveryMode ? (
        <>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Recupero password</div>
          <h3 style={{ fontSize: 22, fontFamily: "var(--font-display)", marginBottom: 8 }}>Imposta nuova password</h3>
          <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55, marginBottom: 16 }}>Inserisci la nuova password per il tuo account.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="filter-label">Nuova password</label>
              <input type="password" className="input" value={recoveryPw} onChange={e => setRecoveryPw(e.target.value)} placeholder="Almeno 6 caratteri" autoComplete="new-password" style={{ width: "100%" }} />
            </div>
            <div>
              <label className="filter-label">Conferma password</label>
              <input type="password" className="input" value={recoveryPwConfirm} onChange={e => setRecoveryPwConfirm(e.target.value)} placeholder="Ripeti la nuova password" autoComplete="new-password" style={{ width: "100%" }} onKeyDown={e => { if (e.key === "Enter") handleRecoveryUpdate(); }} />
            </div>
            {recoveryMsg && <div style={{ fontSize: 13, lineHeight: 1.5, padding: "10px 12px", borderRadius: 6, background: recoveryMsg.startsWith("✓") ? "rgba(63,138,79,0.08)" : "rgba(168,72,63,0.08)", color: recoveryMsg.startsWith("✓") ? "#3f8a4f" : "#a8483f", border: `1px solid ${recoveryMsg.startsWith("✓") ? "rgba(63,138,79,0.2)" : "rgba(168,72,63,0.2)"}` }}>{recoveryMsg}</div>}
            <button className="btn gold sm" onClick={handleRecoveryUpdate} disabled={recoverySending} style={{ marginTop: 4 }}>{recoverySending ? "Aggiornamento…" : "Aggiorna password →"}</button>
          </div>
        </>
      ) : forgotMode ? (
        <>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Recupero password</div>
          <h3 style={{ fontSize: 22, fontFamily: "var(--font-display)", marginBottom: 8 }}>Password dimenticata?</h3>
          <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55, marginBottom: 16 }}>Inserisci la tua email: ti invieremo un link per reimpostare la password.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="filter-label">Email</label>
              <input type="email" className="input" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="tu@email.com" autoComplete="email" style={{ width: "100%" }} onKeyDown={e => { if (e.key === "Enter") handleForgotPassword(); }} />
            </div>
            {forgotMsg && <div style={{ fontSize: 13, lineHeight: 1.5, padding: "10px 12px", borderRadius: 6, background: forgotMsg.startsWith("✓") ? "rgba(63,138,79,0.08)" : "rgba(168,72,63,0.08)", color: forgotMsg.startsWith("✓") ? "#3f8a4f" : "#a8483f", border: `1px solid ${forgotMsg.startsWith("✓") ? "rgba(63,138,79,0.2)" : "rgba(168,72,63,0.2)"}` }}>{forgotMsg}</div>}
            <button className="btn gold sm" onClick={handleForgotPassword} disabled={forgotSending} style={{ marginTop: 4 }}>{forgotSending ? "Invio in corso…" : "Invia link di recupero →"}</button>
            <button type="button" onClick={() => { setForgotMode(false); setForgotMsg(null); setForgotEmail(""); }} style={{ background: "none", border: 0, padding: 0, color: "var(--gold)", cursor: "pointer", textDecoration: "underline", fontSize: 13, textAlign: "left" }}>← Torna al login</button>
          </div>
        </>
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

            {mode === "login" && (
              <button type="button" onClick={() => { setForgotMode(true); setForgotMsg(null); setError(null); }} style={{ background: "none", border: 0, padding: 0, color: "var(--ink-dim)", cursor: "pointer", textDecoration: "underline", fontSize: 12.5, textAlign: "left", marginTop: 2 }}>Password dimenticata?</button>
            )}
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
