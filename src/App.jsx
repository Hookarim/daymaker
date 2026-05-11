import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import Auth from './Auth';
import Daymaker from './Daymaker';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0F0B', color: '#E5EDE5' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 600 }}>Day<span style={{ color: '#7DA888' }}>maker</span></div>
        <div style={{ fontSize: 12, color: '#7E8C82', marginTop: 8 }}>lädt...</div>
      </div>
    </div>
  );

  return session ? <Daymaker /> : <Auth />;
}
