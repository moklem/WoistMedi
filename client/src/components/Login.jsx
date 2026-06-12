import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      onLogin(data.token, { username: data.username, friendCode: data.friendCode });
    } catch {
      setError('Netzwerkfehler');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.logo}>📍</div>
        <h1 style={s.title}>Wo ist Medi?</h1>
        <p style={s.sub}>medi Meisterschaft 2026</p>

        <div style={s.tabs}>
          <button style={mode === 'login' ? s.tabOn : s.tab} onClick={() => setMode('login')}>Anmelden</button>
          <button style={mode === 'register' ? s.tabOn : s.tab} onClick={() => setMode('register')}>Registrieren</button>
        </div>

        <form onSubmit={submit} style={s.form}>
          <input style={s.input} placeholder="Benutzername" value={username}
            onChange={e => setUsername(e.target.value)} autoComplete="username" required />
          <input style={s.input} type="password" placeholder="Passwort (min. 6 Zeichen)" value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
          {error && <p style={s.err}>{error}</p>}
          <button style={s.btn} disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
          </button>
        </form>
      </div>
    </div>
  );
}

const s = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'linear-gradient(135deg,#0f0f1a,#1a1a2e)' },
  card: { background: '#16213e', borderRadius: '16px', padding: '40px 32px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 60px rgba(0,0,0,.5)' },
  logo: { fontSize: '48px', textAlign: 'center', marginBottom: '12px' },
  title: { fontSize: '28px', fontWeight: '700', textAlign: 'center' },
  sub: { fontSize: '13px', textAlign: 'center', color: '#888', margin: '4px 0 28px' },
  tabs: { display: 'flex', marginBottom: '24px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #0f3460' },
  tab: { flex: 1, padding: '10px', background: 'transparent', border: 'none', color: '#888', fontSize: '14px' },
  tabOn: { flex: 1, padding: '10px', background: '#e94560', border: 'none', color: '#fff', fontSize: '14px', fontWeight: '600' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '14px 16px', borderRadius: '8px', border: '1px solid #0f3460', background: '#0f0f1a', color: '#eee', fontSize: '16px' },
  err: { color: '#e94560', fontSize: '13px', textAlign: 'center' },
  btn: { padding: '14px', borderRadius: '8px', background: '#e94560', border: 'none', color: '#fff', fontSize: '16px', fontWeight: '600', marginTop: '4px' },
};
