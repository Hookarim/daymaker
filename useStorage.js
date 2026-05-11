import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase';

// Drop-in replacement for the artifact's window.storage hook.
// Same signature: const [value, setValue, loaded] = useStorage(key, defaultValue)
// Difference: persists to Supabase (cloud) instead of artifact-local storage.
//
// Writes are debounced (400ms) so rapid state changes don't hammer the DB.

export function useStorage(key, defaultValue) {
  const [value, setValue] = useState(defaultValue);
  const [loaded, setLoaded] = useState(false);
  const cleanKey = key.replace(/^daymaker:/, '');
  const writeTimerRef = useRef(null);
  const latestValueRef = useRef(defaultValue);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setLoaded(true);
          return;
        }
        const { data, error } = await supabase
          .from('user_data')
          .select('value')
          .eq('user_id', user.id)
          .eq('key', cleanKey)
          .maybeSingle();
        if (error && error.code !== 'PGRST116') {
          console.warn(`Read failed for ${cleanKey}:`, error.message);
        }
        if (!cancelled && data?.value !== undefined && data?.value !== null) {
          setValue(data.value);
          latestValueRef.current = data.value;
        }
      } catch (e) {
        console.error(`Storage read error (${cleanKey}):`, e);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanKey]);

  // Persist with debounce
  const persist = useCallback((newValue) => {
    const resolved = typeof newValue === 'function' ? newValue(latestValueRef.current) : newValue;
    latestValueRef.current = resolved;
    setValue(resolved);

    if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    writeTimerRef.current = setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { error } = await supabase
          .from('user_data')
          .upsert({
            user_id: user.id,
            key: cleanKey,
            value: resolved,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,key' });
        if (error) console.warn(`Write failed for ${cleanKey}:`, error.message);
      } catch (e) {
        console.error(`Storage write error (${cleanKey}):`, e);
      }
    }, 400);
  }, [cleanKey]);

  return [value, persist, loaded];
}

// Convenience: sign out helper for Settings sheet
export const signOut = async () => {
  await supabase.auth.signOut();
};
