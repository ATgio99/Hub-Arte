// ============================================================================
// Supabase client — connessione al database cloud per sincronizzazione
// ============================================================================
// Le credenziali sono pubbliche by design (anon key, non service_role).
// La sicurezza è garantita dalle RLS policies lato server.
// Vedi: https://supabase.com/docs/guides/auth/row-level-security
//
// Per personalizzare (es. fork del progetto): copia .env.example in .env
// e modifica i valori VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
// ============================================================================
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  "https://ddsdvcznziciqdambgom.supabase.co";

const SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkc2R2Y3puemljaXFkYW1iZ29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMDgzNzcsImV4cCI6MjA5Nzg4NDM3N30.WliliS2vw5dMtIcKUaU7KEm2g8smAjm8fMHaNRb6v5c";

// Custom storage che usa localStorage direttamente — evita problemi
// con Safari ITP e PWA dove i cookie di terze parti vengono bloccati
const customStorage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // localStorage pieno o bloccato
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

// Detect se l'URL contiene un token di recovery (evita conflitti con HashRouter)
const urlHasAuthData = typeof window !== "undefined" &&
  (window.location.hash.includes("access_token=") ||
   window.location.search.includes("code="));

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: customStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: urlHasAuthData,
  },
});
