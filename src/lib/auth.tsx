// ============================================================================
// Auth context — login, signup, sessione utente con Supabase Auth
// ============================================================================
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "./supabase";
import { resetSubscriptions } from "./sync";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updateNewPassword: (newPassword: string) => Promise<{ error: string | null }>;
  passwordRecoveryActive: boolean;
}

const AuthCtx = createContext<AuthState | null>(null);

// Email degli amministratori (può modificare i metadati delle opere direttamente).
// Questi indirizzi NON vengono mai mostrati nella UI: sono usati solo lato codice
// (per determinare isAdmin) e lato database (nelle RLS policies di Supabase).
export const ADMIN_EMAILS = ["hubarte@proton.me", "atgio@proton.me"];
// Email di contatto PUBBLICA (mostrata nei contatti, nei footer, nei form).
// Alias ProtonMail breve.
export const CONTACT_EMAIL = "hubarte@pm.me";

/** Restituisce true se l'email fornita appartiene a un amministratore */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// Determina il redirect URL dopo conferma email (deve essere l'URL corrente dell'app)
function getRedirectTo(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

let _passwordRecoveryActive = false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [, forceRecoveryRender] = useState(0);
  const triggerRecoveryUpdate = () => forceRecoveryRender(v => v + 1);

  useEffect(() => {
    // Recupera sessione esistente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const u = session?.user ?? null;
      setUser(u);
      setIsAdmin(isAdminEmail(u?.email));
      setLoading(false);
    }).catch(() => {
      // Se fallisce (es. PWA senza rete), prosegui senza sessione
      setLoading(false);
    });

    // Ascolta cambiamenti auth (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        const u = session?.user ?? null;
        setUser(u);
        setIsAdmin(isAdminEmail(u?.email));
        setLoading(false);

        if (event === "PASSWORD_RECOVERY") {
          _passwordRecoveryActive = true;
          triggerRecoveryUpdate();
          if (typeof window !== "undefined" && !window.location.hash.includes("/login")) {
            window.location.hash = "#/login";
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const redirectTo = getRedirectTo();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const redirectTo = getRedirectTo();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || undefined,
      });
      if (error) {
        let msg = error.message || "Errore durante l'invio dell'email.";
        if (msg.includes("User not found")) msg = "Nessun account trovato con questa email.";
        if (msg.includes("rate limit")) msg = "Troppi tentativi. Riprova tra qualche minuto.";
        return { error: msg };
      }
      return { error: null };
    } catch (e: any) {
      return { error: e?.message || "Errore di rete." };
    }
  }, []);

  const updateNewPassword = useCallback(async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        let msg = error.message || "Errore durante l'aggiornamento.";
        if (msg.includes("Password should be at least")) msg = "La password deve avere almeno 6 caratteri.";
        return { error: msg };
      }
      _passwordRecoveryActive = false;
      return { error: null };
    } catch (e: any) {
      return { error: e?.message || "Errore di rete." };
    }
  }, []);

  const signOut = useCallback(async () => {
    // Pulisci TUTTI i dati utente dal localStorage PRIMA di fare signOut,
    // così il prossimo utente che fa login su questo browser non eredita
    // i preferiti/approfonditi/override dell'utente precedente (bug critico).
    // I dati restano salvati sul cloud (Supabase) per l'account che sta uscendo.
    try {
      const keysToClear = [
        "atlante:favorites",
        "atlante:studied",
        "atlante:image-overrides",         // override privati
        // NON cancellare "atlante:image-overrides-global" (sono condivisi!)
        "atlante:quiz.errors.v1",
        "atlante:quiz.stats.v1",
        "atlante:quiz-kinds",
        "atlante:quiz-periods",
        "atlante:sb.collapsed",
        "atlante:sugg-seen",               // prefix — le chiavi reali sono atlante:sugg-seen:<uid>
        "atlante.timerange.v1",
        "atlante.cookie.choice",
      ];
      // Cancella le chiavi esatte
      keysToClear.forEach((k) => { try { localStorage.removeItem(k); } catch {} });
      // Cancella tutte le chiavi che iniziano con "atlante:sugg-seen:" (per-utente)
      const allKeys = Object.keys(localStorage);
      allKeys.forEach((k) => {
        if (k.startsWith("atlante:sugg-seen:")) {
          try { localStorage.removeItem(k); } catch {}
        }
      });
      // Dispiega eventi per far aggiornare i componenti React
      window.dispatchEvent(new CustomEvent("atlante:favs-changed"));
      window.dispatchEvent(new CustomEvent("atlante:studied-changed"));
      window.dispatchEvent(new CustomEvent("atlante:overrides-changed"));
    } catch { /* ignore */ }

    // Reset delle sottoscrizioni realtime, così il prossimo login le ricrea
    resetSubscriptions();

    await supabase.auth.signOut();
  }, []);

  return (
    <AuthCtx.Provider value={{ user, session, loading, isAdmin, signUp, signIn, signOut, resetPassword, updateNewPassword, passwordRecoveryActive: _passwordRecoveryActive }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth fuori da AuthProvider");
  return ctx;
}
