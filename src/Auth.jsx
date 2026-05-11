import { useState } from 'react';
import { supabase } from './supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin }
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      setError(e.message || 'Login fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  if (sent) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#0A0F0B', color: '#E5EDE5' }}>
      <div style={{ maxWidth: 380, width: '100%', padding: 20, background: '#16201A', border: '1px solid #7DA888', borderRadius: 12, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>✉️</div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Check deine E-Mails</h2>
        <p style={{ color: '#B8C4B8', fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>Wir haben einen Login-Link an <strong>{email}</strong> geschickt.</p>
        <button onClick={() => { setSent(false); setEmail(''); }} style={{ padding: '10px 16px', background: 'transparent', color: '#7DA888', border: '1px solid #7DA88866', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>Andere E-Mail verwenden</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#0A0F0B', color: '#E5EDE5' }}>
      <div style={{ maxWidth: 380, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 36, fontWeight: 600, marginBottom: 8 }}>Day<span style={{ color: '#7DA888' }}>maker</span></h1>
          <p style={{ color: '#7E8C82', fontSize: 14, lineHeight: 1.5 }}>Dein täglicher Tracker für Aufgaben, Finanzen, Fitness und Kontakte</p>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#7E8C82', marginBottom: 6, fontWeight: 500 }}>E-Mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="dein@email.com" required disabled={loading}
              style={{ width: '100%', padding: '14px', background: '#16201A', border: '1px solid #25342B', borderRadius: 12, color: '#E5EDE5', fontSize: 16, outline: 'none', boxSizing: 'border-box' }} autoFocus />
          </div>
          <button type="submit" disabled={loading || !email.trim()}
            style={{ width: '100%', padding: '14px', background: '#7DA888', color: '#0A0F0B', border: 'none', borderRadius: 12, fontWeight: 600, fontSize: 15, cursor: 'pointer', opacity: loading || !email.trim() ? 0.5 : 1 }}>
            {loading ? 'Sende Link...' : 'Magic Link senden'}
          </button>
          {error && <div style={{ marginTop: 12, padding: 12, background: 'rgba(198,100,84,0.15)', border: '1px solid #C66454', borderRadius: 10, color: '#C66454', fontSize: 13 }}>{error}</div>}
        </form>
      </div>
    </div>
  );
}
