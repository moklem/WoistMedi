import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

export default function FriendsPage({ user, token }) {
  const [friends, setFriends] = useState([]);
  const [friendCode, setFriendCode] = useState(user?.friendCode || '');
  const [inputCode, setInputCode] = useState('');
  const [msg, setMsg] = useState({ text: '', ok: true });
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = () =>
    fetch('/api/friends', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setFriends(d.friends || []); setFriendCode(d.friendCode || ''); });

  useEffect(() => { load(); }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(friendCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const addFriend = async (e) => {
    e.preventDefault();
    setMsg({ text: '', ok: true });
    const res = await fetch('/api/friends/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ friendCode: inputCode })
    });
    const data = await res.json();
    if (!res.ok) { setMsg({ text: data.error, ok: false }); return; }
    setMsg({ text: `${data.friend.username} hinzugefügt! ✓`, ok: true });
    setInputCode('');
    load();
  };

  const removeFriend = async (friendId) => {
    await fetch(`/api/friends/${friendId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    load();
  };

  return (
    <div style={s.page}>
      <header style={s.header}>
        <Link to="/" style={s.back}>← Karte</Link>
        <h2 style={s.title}>Freunde</h2>
        <div style={{ width: '60px' }} />
      </header>

      <div style={s.content}>
        {/* My code */}
        <div style={s.card}>
          <h3 style={s.sec}>Mein Code</h3>
          <div style={s.codeRow}>
            <span style={s.code}>{friendCode}</span>
            <button style={s.btn2} onClick={copyCode}>{copied ? '✓ Kopiert' : 'Kopieren'}</button>
            <button style={s.btn2} onClick={() => setShowQR(v => !v)}>{showQR ? 'Schließen' : 'QR'}</button>
          </div>
          {showQR && (
            <div style={s.qrWrap}>
              <QRCodeSVG value={friendCode} size={180} bgColor="#ffffff" fgColor="#0f0f1a" level="M" />
              <p style={s.qrHint}>Lass einen Freund diesen Code scannen</p>
            </div>
          )}
        </div>

        {/* Add friend */}
        <div style={s.card}>
          <h3 style={s.sec}>Freund hinzufügen</h3>
          <form onSubmit={addFriend} style={s.addRow}>
            <input
              style={s.input}
              placeholder="8-stelliger Code"
              value={inputCode}
              onChange={e => setInputCode(e.target.value.toUpperCase())}
              maxLength={8}
              autoCapitalize="characters"
            />
            <button style={s.addBtn} type="submit">+</button>
          </form>
          {msg.text && <p style={{ ...s.msgText, color: msg.ok ? '#4ade80' : '#e94560' }}>{msg.text}</p>}
        </div>

        {/* Friend list */}
        <div style={s.card}>
          <h3 style={s.sec}>Freunde ({friends.length})</h3>
          {friends.length === 0 ? (
            <p style={s.empty}>Noch keine Freunde. Teile deinen Code!</p>
          ) : (
            <div style={s.list}>
              {friends.map(f => (
                <div key={f.userId} style={s.row}>
                  <div style={s.avatar}>{f.username[0].toUpperCase()}</div>
                  <span style={s.name}>{f.username}</span>
                  <button style={s.del} onClick={() => removeFriend(f.userId)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#0f0f1a', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#16213e', borderBottom: '1px solid #0f3460' },
  back: { color: '#e94560', textDecoration: 'none', fontSize: '15px', fontWeight: '600', width: '60px' },
  title: { color: '#eee', fontSize: '18px' },
  content: { flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px', width: '100%', margin: '0 auto' },
  card: { background: '#16213e', borderRadius: '12px', padding: '20px', border: '1px solid #0f3460' },
  sec: { color: '#eee', fontSize: '15px', fontWeight: '700', marginBottom: '14px' },
  codeRow: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  code: { fontFamily: 'monospace', fontSize: '22px', fontWeight: '700', color: '#e94560', letterSpacing: '4px', flex: 1 },
  btn2: { background: '#0f3460', border: 'none', color: '#eee', padding: '8px 12px', borderRadius: '8px', fontSize: '13px' },
  qrWrap: { marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', background: '#fff', padding: '16px', borderRadius: '12px' },
  qrHint: { color: '#333', fontSize: '13px' },
  addRow: { display: 'flex', gap: '8px' },
  input: { flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #0f3460', background: '#0f0f1a', color: '#eee', fontSize: '16px', fontFamily: 'monospace', letterSpacing: '2px', textTransform: 'uppercase' },
  addBtn: { padding: '12px 18px', background: '#e94560', border: 'none', color: '#fff', borderRadius: '8px', fontSize: '20px', fontWeight: '700' },
  msgText: { fontSize: '13px', marginTop: '8px' },
  empty: { color: '#888', fontSize: '14px' },
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  row: { display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: '8px', background: '#0f0f1a' },
  avatar: { width: '36px', height: '36px', borderRadius: '50%', background: '#e94560', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '15px', flexShrink: 0 },
  name: { flex: 1, color: '#eee', fontSize: '15px' },
  del: { background: 'none', border: 'none', color: '#888', fontSize: '16px', padding: '4px' },
};
