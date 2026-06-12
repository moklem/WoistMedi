import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';

const COLORS = ['#e94560','#4ade80','#60a5fa','#f59e0b','#a78bfa','#f472b6','#34d399','#fb923c'];
const LS_KEY = 'woistmedi_mapurl';

export default function MapView({ user, token, onLogout }) {
  const [socket, setSocket] = useState(null);
  const [myPin, setMyPin] = useState(null);
  const [friendPins, setFriendPins] = useState({});
  const [connected, setConnected] = useState(false);
  const [friends, setFriends] = useState([]);
  const [mapError, setMapError] = useState(false);
  const [mapUrl, setMapUrl] = useState(() => localStorage.getItem(LS_KEY) || '/lageplan.svg');
  const [showUrlBar, setShowUrlBar] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const imgRef = useRef(null);

  const colorFor = (userId) => {
    const idx = friends.findIndex(f => f.userId === userId);
    return COLORS[(idx < 0 ? 0 : idx) % COLORS.length];
  };

  // Fetch server-configured map URL if no local override
  useEffect(() => {
    if (!localStorage.getItem(LS_KEY)) {
      fetch('/api/config')
        .then(r => r.json())
        .then(d => { if (d.mapUrl) setMapUrl(d.mapUrl); })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    fetch('/api/friends', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setFriends(d.friends || []));
  }, [token]);

  useEffect(() => {
    const s = io({ auth: { token }, transports: ['websocket'] });
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('initial-locations', locs => setFriendPins(locs));
    s.on('location-update', ({ userId, x, y, username }) =>
      setFriendPins(p => ({ ...p, [userId]: { x, y, username } }))
    );
    s.on('location-cleared', ({ userId }) =>
      setFriendPins(p => { const n = { ...p }; delete n[userId]; return n; })
    );
    setSocket(s);
    return () => s.disconnect();
  }, [token]);

  // Reset error when URL changes
  useEffect(() => { setMapError(false); }, [mapUrl]);

  const handleClick = (e) => {
    if (showUrlBar) return;
    const img = imgRef.current;
    if (!img || mapError) return;
    const r = img.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100));
    const pin = { x: +x.toFixed(2), y: +y.toFixed(2) };
    setMyPin(pin);
    socket?.emit('update-location', pin);
  };

  const clearPin = () => {
    setMyPin(null);
    socket?.emit('clear-location');
  };

  const saveUrl = () => {
    const url = urlDraft.trim();
    if (url) {
      localStorage.setItem(LS_KEY, url);
      setMapUrl(url);
    }
    setShowUrlBar(false);
    setUrlDraft('');
  };

  const resetUrl = () => {
    localStorage.removeItem(LS_KEY);
    setMapUrl('/lageplan.svg');
    setShowUrlBar(false);
    setUrlDraft('');
  };

  return (
    <div style={s.page}>
      <header style={s.header}>
        <span style={s.title}>📍 Wo ist Medi?</span>
        <div style={s.right}>
          <span style={{ ...s.dot, background: connected ? '#4ade80' : '#e94560' }} />
          <button style={s.icon} onClick={() => { setUrlDraft(mapUrl); setShowUrlBar(v => !v); }} title="Karte einstellen">🗺</button>
          <Link to="/friends" style={s.icon} title="Freunde">👥</Link>
          <button style={s.icon} onClick={onLogout} title="Abmelden">⏻</button>
        </div>
      </header>

      {showUrlBar && (
        <div style={s.urlBar}>
          <input
            style={s.urlInput}
            placeholder="Bild-URL einfügen (https://...jpg)"
            value={urlDraft}
            onChange={e => setUrlDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveUrl()}
            autoFocus
          />
          <button style={s.urlSave} onClick={saveUrl}>✓</button>
          <button style={s.urlReset} onClick={resetUrl} title="Zurücksetzen">↺</button>
        </div>
      )}

      <div style={{ ...s.mapWrap, cursor: mapError ? 'default' : 'crosshair' }} onClick={handleClick}>
        {mapError ? (
          <div style={s.errBox}>
            <p style={{ fontSize: '48px' }}>🗺️</p>
            <p style={{ fontWeight: '600', marginTop: '12px' }}>Karte konnte nicht geladen werden</p>
            <p style={{ fontSize: '13px', color: '#888', marginTop: '8px', textAlign: 'center', maxWidth: '280px' }}>
              Tippe auf 🗺 oben und füge eine Bild-URL ein
            </p>
          </div>
        ) : (
          <div style={s.mapContainer}>
            <img
              ref={imgRef}
              src={mapUrl}
              alt="Lageplan"
              style={s.mapImg}
              draggable={false}
              onError={() => setMapError(true)}
              onLoad={() => setMapError(false)}
            />
            {myPin && <Pin x={myPin.x} y={myPin.y} label="Du" color="#e94560" isMe />}
            {Object.entries(friendPins).map(([uid, loc]) => (
              <Pin key={uid} x={loc.x} y={loc.y} label={loc.username} color={colorFor(uid)} />
            ))}
          </div>
        )}
      </div>

      <footer style={s.footer}>
        <span style={s.hint}>
          {myPin
            ? `Dein Pin gesetzt ✓ (${myPin.x}%, ${myPin.y}%)`
            : 'Tippe auf die Karte um deinen Standort zu setzen'}
        </span>
        {myPin && (
          <button style={s.clearBtn} onClick={(e) => { e.stopPropagation(); clearPin(); }}>
            Entfernen
          </button>
        )}
      </footer>
    </div>
  );
}

function Pin({ x, y, label, color, isMe }) {
  return (
    <div style={{
      position: 'absolute', left: `${x}%`, top: `${y}%`,
      transform: 'translate(-50%,-100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      pointerEvents: 'none', zIndex: isMe ? 10 : 5,
      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.6))'
    }}>
      <div style={{
        background: color, color: '#fff', fontSize: '11px', fontWeight: '700',
        padding: '3px 7px', borderRadius: '10px', whiteSpace: 'nowrap', marginBottom: '2px'
      }}>{label}</div>
      <div style={{
        width: 0, height: 0,
        borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
        borderTop: `10px solid ${color}`
      }} />
    </div>
  );
}

const s = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0f0f1a' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#16213e', borderBottom: '1px solid #0f3460', flexShrink: 0 },
  title: { fontWeight: '700', fontSize: '16px' },
  right: { display: 'flex', alignItems: 'center', gap: '14px' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' },
  icon: { background: 'none', border: 'none', fontSize: '20px', color: '#eee', textDecoration: 'none', padding: '4px', lineHeight: 1 },
  urlBar: { display: 'flex', gap: '8px', padding: '10px 12px', background: '#0f3460', borderBottom: '1px solid #1a4a7a', flexShrink: 0 },
  urlInput: { flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid #1a4a7a', background: '#0a0a12', color: '#eee', fontSize: '14px' },
  urlSave: { padding: '8px 14px', background: '#4ade80', border: 'none', color: '#000', borderRadius: '6px', fontWeight: '700', fontSize: '16px' },
  urlReset: { padding: '8px 14px', background: '#555', border: 'none', color: '#eee', borderRadius: '6px', fontSize: '16px' },
  mapWrap: { flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: '#0a0a12' },
  errBox: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#eee', padding: '40px', width: '100%' },
  mapContainer: { position: 'relative', display: 'inline-block', userSelect: 'none' },
  mapImg: { display: 'block', maxWidth: '100%', maxHeight: 'calc(100vh - 120px)', userSelect: 'none' },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#16213e', borderTop: '1px solid #0f3460', flexShrink: 0, gap: '12px', minHeight: '52px' },
  hint: { color: '#888', fontSize: '13px', flex: 1 },
  clearBtn: { background: '#e94560', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' },
};
