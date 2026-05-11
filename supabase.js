import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate config — if missing or wrong, App.jsx shows a clear error screen
// instead of crashing into a black screen.
export const supabaseConfigError = (() => {
  if (!url && !key) return 'Beide Variablen fehlen: VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY';
  if (!url) return 'Variable VITE_SUPABASE_URL fehlt';
  if (!key) return 'Variable VITE_SUPABASE_ANON_KEY fehlt';
  if (!url.startsWith('https://')) return 'VITE_SUPABASE_URL muss mit https:// beginnen (du hast: ' + url.slice(0, 40) + '...)';
  if (key.length < 100) return 'VITE_SUPABASE_ANON_KEY scheint zu kurz (sollte ein langer JWT-Token sein, beginnt mit eyJ...)';
  return null;
})();

if (supabaseConfigError) {
  console.error('[Daymaker] Supabase-Konfig:', supabaseConfigError);
}

export const supabase = supabaseConfigError
  ? null
  : createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
