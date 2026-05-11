import { useEffect, useState, Component } from 'react';
import { supabase, supabaseConfigError } from './supabase';
import Auth from './Auth';
import Daymaker from './Daymaker';

// Error boundary catches JS errors that would otherwise cause a black screen
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error('[Daymaker] Crash:', err, info); }
  render() {
    if (this.state.err) {
      return (
        <ErrorScreen
          title="App-Fehler"
          message={this.state.err.message || String(this.state.err)}
          hint="Browser-Konsole öffnen (Rechtsklick → Untersuchen → Konsole) für Details. Meist hilft ein Refresh oder Service-Worker löschen." />
      );
    }
    return this.props.children;
  }
}

function ErrorScreen({ title, message, hint }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, background: '#0A0F0B', color: '#E5EDE5', fontFamily: '-apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: 440, width: '100%' }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 600, marginBottom: 24 }}>
          Day<span style={{ color: '#7DA888' }}>maker</span>
        </div>
        <div style={{ background: '#16201A', border: '1px solid #C66454', borderRadius: 14, padding: 20 }}>
          <div style={{ color: '#C66454', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>⚠ {title}</div>
          <div style={{ color: '#E5EDE5', fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}>{message}</div>
          {hint && (
            <div style={{ color: '#B8C4B8', fontSize: 13, lineHeight: 1.5, paddingTop: 12, borderTop: '1px solid #25342B' }}>
              {hint}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfigErrorScreen({ error }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, background: '#0A0F0B', color: '#E5EDE5', fontFamily: '-apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 600, marginBottom: 24 }}>
          Day<span style={{ color: '#7DA888' }}>maker</span>
        </div>
        <div style={{ background: '#16201A', border: '1px solid #B8A85C', borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <div style={{ color: '#B8A85C', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>⚙ Konfiguration unvollständig</div>
          <div style={{ color: '#E5EDE5', fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}>{error}</div>
          <div style={{ color: '#B8C4B8', fontSize: 13, lineHeight: 1.6 }}>
            <strong style={{ color: '#7DA888' }}>So fixt du das in Netlify:</strong>
            <ol style={{ paddingLeft: 20, marginTop: 8, marginBottom: 0 }}>
              <li style={{ marginBottom: 4 }}>Netlify Dashboard → deinen Site auswählen</li>
              <li style={{ marginBottom: 4 }}>Site configuration → Environment variables</li>
              <li style={{ marginBottom: 4 }}>"Add a variable" klicken, alle drei setzen:
                <ul style={{ paddingLeft: 16, marginTop: 4 }}>
                  <li><code style={{ background: '#0A0F0B', padding: '2px 6px', borderRadius: 4 }}>VITE_SUPABASE_URL</code></li>
                  <li><code style={{ background: '#0A0F0B', padding: '2px 6px', borderRadius: 4 }}>VITE_SUPABASE_ANON_KEY</code></li>
                  <li><code style={{ background: '#0A0F0B', padding: '2px 6px', borderRadius: 4 }}>ANTHROPIC_API_KEY</code></li>
                </ul>
              </li>
              <li style={{ marginBottom: 4 }}>Werte: Supabase Dashboard → Project Settings → API</li>
              <li style={{ marginBottom: 4 }}>Danach: <strong style={{ color: '#7DA888' }}>Deploys → Trigger deploy → Clear cache and deploy</strong></li>
              <li>Warten (~2 Min) → Seite refreshen</li>
            </ol>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#7E8C82', textAlign: 'center' }}>
          Wichtig: <code style={{ background: '#16201A', padding: '1px 4px', borderRadius: 3 }}>VITE_</code> Präfix muss exakt so sein, sonst ignoriert Vite die Variable.
        </div>
      </div>
    </div>
  );
}

function AppInner() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch(err => {
      console.error('[Daymaker] Session load failed:', err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0F0B', color: '#E5EDE5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 600 }}>
            Day<span style={{ color: '#7DA888' }}>maker</span>
          </div>
          <div style={{ fontSize: 12, color: '#7E8C82', marginTop: 8 }}>lädt...</div>
        </div>
      </div>
    );
  }

  return session ? <Daymaker /> : <Auth />;
}

export default function App() {
  if (supabaseConfigError) return <ConfigErrorScreen error={supabaseConfigError} />;
  return <ErrorBoundary><AppInner /></ErrorBoundary>;
}
