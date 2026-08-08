// ============================================================================
// Auth context — login, signup, sessione utente con Supabase Auth
// ============================================================================
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "./supabase";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
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

// Determina il redirect URL dopo conferma email.
// Usa SOLO l'origin (senza path) perché Supabase Auth ha una whitelist
// di URL consentiti. Se includiamo /login o /#/login, Supabase potrebbe
// rifiutarlo con un errore 500 se non è nella lista Redirect URLs.
function getRedirectTo(): string {
  if (typeof window !== "undefined") {
    // Ritorna solo l'origin: https://hubarte.it o https://hubarte.netlify.app
    return window.location.origin;
  }
  return "";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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
      (_event, session) => {
        setSession(session);
        const u = session?.user ?? null;
        setUser(u);
        setIsAdmin(isAdminEmail(u?.email));
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const redirectTo = getRedirectTo();
    let result;
    try {
      result = await supabase.auth.signUp({
        email,
        password,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });
    } catch (e: any) {
      // Errore di rete o eccezione
      const msg = e?.message || e?.toString() || "Errore di rete durante la registrazione.";
      return { error: typeof msg === "string" ? msg : "Errore di rete. Controlla la connessione." };
    }
    const { data, error } = result;
    if (error) {
      // Log completo per debug (visibile nella console del browser: F12 → Console)
      console.error("[auth.signUp] Errore raw Supabase:", error);
      console.error("[auth.signUp] Type:", typeof error, "Message:", error?.message, "Name:", error?.name, "Status:", error?.status);
      // Estrai il messaggio in modo robusto (a volte error è un oggetto complesso)
      let msg: string;
      if (typeof error === "string") {
        msg = error;
      } else if (error.message && typeof error.message === "string") {
        msg = error.message;
      } else if (error.name && typeof error.name === "string") {
        msg = error.name;
      } else {
        // Se non riusciamo a estrarre un messaggio, serializziamo in modo sicuro
        try {
          msg = JSON.stringify(error);
          if (msg === "{}" || msg === "") msg = "Errore sconosciuto durante la registrazione.";
        } catch {
          msg = "Errore sconosciuto durante la registrazione.";
        }
      }
      // Traduzioni messaggi comuni di Supabase
      if (msg.includes("User already registered")) return { error: "Questo email è già registrata. Prova ad accedere." };
      if (msg.includes("Password should be at least")) return { error: "La password deve avere almeno 6 caratteri." };
      if (msg.includes("Unable to validate email")) return { error: "Email non valida." };
      if (msg.includes("rate limit") || msg.includes("Rate limit")) return { error: "Troppi tentativi. Riprova tra qualche minuto." };
      if (msg.includes("smtp") || msg.includes("SMTP") || msg.includes("Email not sent") || msg.includes("email_not_sent")) {
        return { error: "Errore nell'invio dell'email di conferma. Verifica la configurazione SMTP su Supabase (Dashboard → Authentication → Providers → Email)." };
      }
      if (msg.includes("signup_disabled") || msg.includes("Signup disabled")) {
        return { error: "La registrazione è temporaneamente disabilitata. Riprova più tardi." };
      }
      // Se il messaggio è vuoto o solo punteggiatura
      if (!msg || msg.trim().length === 0 || msg === "{}") {
        return { error: "Errore durante la registrazione. Possibile problema di configurazione SMTP. Verifica su Supabase Dashboard → Authentication → Providers → Email." };
      }
      return { error: msg };
    }
    return { error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    let result;
    try {
      result = await supabase.auth.signInWithPassword({ email, password });
    } catch (e: any) {
      const msg = e?.message || e?.toString() || "Errore di rete durante l'accesso.";
      return { error: typeof msg === "string" ? msg : "Errore di rete. Controlla la connessione." };
    }
    const { data, error } = result;
    if (error) {
      console.error("[auth.signIn] Errore raw Supabase:", error);
      console.error("[auth.signIn] Type:", typeof error, "Message:", error?.message, "Name:", error?.name, "Status:", error?.status);
      let msg: string;
      if (typeof error === "string") {
        msg = error;
      } else if (error.message && typeof error.message === "string") {
        msg = error.message;
      } else if (error.name && typeof error.name === "string") {
        msg = error.name;
      } else {
        try {
          msg = JSON.stringify(error);
          if (msg === "{}" || msg === "") msg = "Errore sconosciuto durante l'accesso.";
        } catch {
          msg = "Errore sconosciuto durante l'accesso.";
        }
      }
      // Traduzioni messaggi comuni
      if (msg.includes("Invalid login credentials")) return { error: "Email o password non corretti." };
      if (msg.includes("Email not confirmed")) return { error: "Devi confermare la tua email prima di accedere. Controlla la casella di posta (anche spam)." };
      if (msg.includes("rate limit") || msg.includes("Rate limit")) return { error: "Troppi tentativi di accesso. Riprova tra qualche minuto." };
      if (msg.includes("User not found")) return { error: "Nessun account trovato con questa email." };
      if (!msg || msg.trim().length === 0 || msg === "{}") {
        return { error: "Errore durante l'accesso. Riprova." };
      }
      return { error: msg };
    }
    return { error: null };
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

    await supabase.auth.signOut();
  }, []);

  return (
    <AuthCtx.Provider value={{ user, session, loading, isAdmin, signUp, signIn, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth fuori da AuthProvider");
  return ctx;
}
