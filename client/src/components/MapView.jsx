import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';

const COLORS = ['#e94560','#4ade80','#60a5fa','#f59e0b','#a78bfa','#f472b6','#34d399','#fb923c'];

export default function MapView({ user, token, onLogout }) {
  const [socket, setSocket] = useState(null);
  const [myPin, setMyPin] = useState(null);
  const [friendPins, setFriendPins] = useState({});
  const [connected, setConnected] = useState(false);
  const [friends, setFriends] = useState([]);
  const [mapError, setMapError] = useState(false);
  const imgRef = useRef(null);

  const colorFor = (userId) => {
    const idx = friends.findIndex(f => f.userId === userId);
    return COLORS[(idx < 0 ? 0 : idx) % COLORS.length];
  };

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

  const handleClick = (e) => {
    const img = imgRef.current;
    if (!img) return;
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

  return (
    <div style={s.page}>
      <header style={s.header}>
        <span style={s.headerTitle}>📍 Wo ist Medi?</span>
        <div style={s.headerRight}>
          <span style={{ ...s.dot, background: connected ? '#4ade80' : '#e94560' }} />
          <Link to="/friends" style={s.iconBtn} title="Freunde">👥</Link>
          <button style={s.iconBtn} onClick={onLogout} title="Abmelden">⏻</button>
        </div>
      </header>

      <div style={s.mapWrap} onClick={handleClick}>
        {mapError ? (
          <div style={s.placeholder}>
            <p style={{ fontSize: '48px' }}>🗺️</p>
            <p style={{ fontSize: '16px', fontWeight: '600', marginTop: '12px' }}>Lageplan nicht gefunden</p>
            <p style={{ fontSize: '13px', color: '#888', marginTop: '8px', textAlign: 'center', maxWidth: '280px' }}>
              Füge die Karte als <code>client/public/lageplan.jpg</code> hinzu
            </p>
          </div>
        ) : (
          <div style={s.mapContainer}>
            <img
              ref={imgRef}
              src="/lageplan.jpg"
              alt="Lageplan medi Meisterschaft 2026"
              style={s.mapImg}
              draggable={false}
              onError={() => setMapError(true)}
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
            ? `Dein Pin gesetzt ✓  (${myPin.x}%, ${myPin.y}%)`
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
      position: 'absolute',
      left: `${x}%`,
      top: `${y}%`,
      transform: 'translate(-50%, -100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      pointerEvents: 'none',
      zIndex: isMe ? 10 : 5,
      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.6))'
    }}>
      <div style={{
        background: color,
        color: '#fff',
        fontSize: '11px',
        fontWeight: '700',
        padding: '3px 7px',
        borderRadius: '10px',
        whiteSpace: 'nowrap',
        marginBottom: '2px',
      }}>{label}</div>
      <div style={{
        width: 0, height: 0,
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: `10px solid ${color}`,
      }} />
    </div>
  );
}

const s = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0f0f1a' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#16213e', borderBottom: '1px solid #0f3460', flexShrink: 0 },
  headerTitle: { fontWeight: '700', fontSize: '16px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '14px' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' },
  iconBtn: { background: 'none', border: 'none', fontSize: '20px', color: '#eee', textDecoration: 'none', padding: '4px', lineHeight: 1 },
  mapWrap: { flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', cursor: 'crosshair', background: '#0a0a12' },
  placeholder: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#eee', height: '100%', minHeight: '300px' },
  mapContainer: { position: 'relative', display: 'inline-block', userSelect: 'none' },
  mapImg: { display: 'block', maxWidth: '100%', maxHeight: 'calc(100vh - 110px)', userSelect: 'none' },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#16213e', borderTop: '1px solid #0f3460', flexShrink: 0, gap: '12px', minHeight: '52px' },
  hint: { color: '#888', fontSize: '13px', flex: 1 },
  clearBtn: { background: '#e94560', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' },
};
