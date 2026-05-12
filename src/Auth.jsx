import { useState } from 'react';
import { supabase } from './supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendCode = async (e) => {
    e?.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;
      setStep('code');
    } catch (e) {
      setError(e.message || 'Senden fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e) => {
    e?.preventDefault();
    const cleanCode = code.trim().replace(/\s/g, '');
    if (cleanCode.length !== 6) {
      setError('Code muss 6 Ziffern lang sein');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: cleanCode,
        type: 'email'
      });
      if (error) throw error;
    } catch (e) {
      setError(e.message || 'Code ungültig oder abgelaufen');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, background: '#0A0F0B', color: '#E5EDE5'
    }}>
      <div style={{ maxWidth: 380, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 36, fontWeight: 600, marginBottom: 8 }}>
            Day<span style={{ color: '#7DA888' }}>maker</span>
          </h1>
          <p style={{ color: '#7E8C82', fontSize: 14, lineHeight: 1.5 }}>
            Dein täglicher Tracker für Aufgaben, Finanzen, Fitness und Kontakte
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={sendCode}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#7E8C82', marginBottom: 6, fontWeight: 500 }}>
                E-Mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="dein@email.com"
                required
                disabled={loading}
                style={{
                  width: '100%', padding: '14px',
                  background: '#16201A', border: '1px solid #25342B',
                  borderRadius: 12, color: '#E5EDE5', fontSize: 16,
                  outline: 'none', boxSizing: 'border-box'
                }}
                autoFocus
                autoComplete="email"
                inputMode="email"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              style={{
                width: '100%', padding: '14px',
                background: '#7DA888', color: '#0A0F0B',
                border: 'none', borderRadius: 12, fontWeight: 600, fontSize: 15,
                cursor: 'pointer', opacity: loading || !email.trim() ? 0.5 : 1
              }}
            >
              {loading ? 'Sende Code...' : 'Login-Code anfordern'}
            </button>

            {error && (
              <div style={{
                marginTop: 12, padding: 12,
                background: 'rgba(198, 100, 84, 0.15)',
                border: '1px solid #C66454',
                borderRadius: 10, color: '#C66454', fontSize: 13
              }}>
                {error}
              </div>
            )}

            <p style={{ marginTop: 20, fontSize: 12, color: '#7E8C82', textAlign: 'center', lineHeight: 1.5 }}>
              Wir senden dir einen 6-stelligen Code per E-Mail.
              Keine Passwörter — bleibst auf diesem Gerät eingeloggt.
            </p>
          </form>
        ) : (
          <form onSubmit={verifyCode}>
            <div style={{
              padding: 16, background: '#16201A', border: '1px solid #25342B',
              borderRadius: 12, marginBottom: 16
            }}>
              <div style={{ fontSize: 13, color: '#B8C4B8', marginBottom: 4 }}>Code gesendet an:</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{email}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#7E8C82', marginBottom: 6, fontWeight: 500 }}>
                6-stelliger Code aus E-Mail
              </label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="123456"
                required
                disabled={loading}
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                style={{
                  width: '100%', padding: '14px',
                  background: '#16201A', border: '1px solid #25342B',
                  borderRadius: 12, color: '#E5EDE5', fontSize: 22,
                  outline: 'none', boxSizing: 'border-box',
                  textAlign: 'center', letterSpacing: '0.4em',
                  fontFamily: 'JetBrains Mono, monospace'
                }}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              style={{
                width: '100%', padding: '14px',
                background: '#7DA888', color: '#0A0F0B',
                border: 'none', borderRadius: 12, fontWeight: 600, fontSize: 15,
                cursor: 'pointer', opacity: loading || code.length !== 6 ? 0.5 : 1
              }}
            >
              {loading ? 'Prüfe...' : 'Einloggen'}
            </button>

            {error && (
              <div style={{
                marginTop: 12, padding: 12,
                background: 'rgba(198, 100, 84, 0.15)',
                border: '1px solid #C66454',
                borderRadius: 10, color: '#C66454', fontSize: 13
              }}>
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={() => { setStep('email'); setCode(''); setError(null); }}
              style={{
                width: '100%', padding: '10px',
                background: 'transparent', color: '#7DA888',
                border: 'none', fontSize: 13, cursor: 'pointer', marginTop: 12
              }}
            >
              Andere E-Mail verwenden
            </button>

            <p style={{ marginTop: 12, fontSize: 11, color: '#7E8C82', textAlign: 'center', lineHeight: 1.5 }}>
              Code nicht angekommen? Check Spam-Ordner.
              Code läuft nach ~10 Min ab — dann neu anfordern.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
