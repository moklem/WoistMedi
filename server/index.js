require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const friendsRoutes = require('./routes/friends');
const { verifyToken } = require('./middleware/auth');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

const isDev = process.env.NODE_ENV !== 'production';

const io = new Server(server, {
  cors: isDev ? { origin: 'http://localhost:5173', credentials: true } : {}
});

if (isDev) {
  app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
}
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/woistmedi')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/friends', friendsRoutes);

// Exposes server-configured map URL so all users get the same map
app.get('/api/config', (req, res) => {
  res.json({ mapUrl: process.env.MAP_IMAGE_URL || null });
});

if (!isDev) {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) =>
    res.sendFile(path.join(__dirname, '../client/dist/index.html'))
  );
}

// In-memory: { [userId]: { x, y, username } }
const locationStore = {};
// { [userId]: socketId }
const userSockets = {};

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('No token'));
  const decoded = verifyToken(token);
  if (!decoded) return next(new Error('Invalid token'));
  socket.userId = decoded.userId;
  socket.username = decoded.username;
  next();
});

async function getFriendIds(userId) {
  const user = await User.findById(userId).select('friends');
  return user ? user.friends.map(f => f.userId.toString()) : [];
}

io.on('connection', async (socket) => {
  const userId = socket.userId;
  userSockets[userId] = socket.id;

  const friendIds = await getFriendIds(userId);

  const friendLocations = {};
  friendIds.forEach(fid => {
    if (locationStore[fid]) friendLocations[fid] = locationStore[fid];
  });
  socket.emit('initial-locations', friendLocations);

  friendIds.forEach(fid => {
    if (userSockets[fid]) {
      io.to(userSockets[fid]).emit('friend-online', { userId, username: socket.username });
    }
  });

  socket.on('update-location', async ({ x, y }) => {
    locationStore[userId] = { x, y, username: socket.username };
    const fids = await getFriendIds(userId);
    fids.forEach(fid => {
      if (userSockets[fid]) {
        io.to(userSockets[fid]).emit('location-update', { userId, x, y, username: socket.username });
      }
    });
  });

  socket.on('clear-location', async () => {
    delete locationStore[userId];
    const fids = await getFriendIds(userId);
    fids.forEach(fid => {
      if (userSockets[fid]) {
        io.to(userSockets[fid]).emit('location-cleared', { userId });
      }
    });
  });

  socket.on('disconnect', () => {
    delete userSockets[userId];
    setTimeout(() => {
      if (!userSockets[userId]) delete locationStore[userId];
    }, 10 * 60 * 1000);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server on port ${PORT}`));
