import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import ytSearch from 'yt-search';
import path from 'path';
import cors from 'cors';

async function startServer() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
    },
  });
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/search', async (req, res) => {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    try {
      const results = await ytSearch(query);
      const videos = results.videos.slice(0, 20).map(v => ({
        id: v.videoId,
        title: v.title,
        thumbnail: v.thumbnail,
        duration: v.timestamp,
        author: v.author.name,
      }));
      res.json(videos);
    } catch (error) {
      console.error('YouTube search error:', error);
      res.status(500).json({ error: 'Failed to search YouTube' });
    }
  });

  // Socket.IO logic
  const rooms = new Map<string, any>();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (roomId: string, role: 'player' | 'controller') => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId} as ${role}`);
      
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          queue: [],
          currentSong: null,
          isPlaying: false,
          currentTime: 0,
        });
      }

      // Send current state to the newly joined client
      socket.emit('sync-state', rooms.get(roomId));
    });

    socket.on('add-to-queue', (roomId: string, song: any) => {
      const room = rooms.get(roomId);
      if (room) {
        room.queue.push(song);
        if (!room.currentSong) {
          room.currentSong = room.queue.shift();
          room.isPlaying = true;
        }
        io.to(roomId).emit('sync-state', room);
      }
    });

    socket.on('play-pause', (roomId: string, isPlaying: boolean) => {
      const room = rooms.get(roomId);
      if (room) {
        room.isPlaying = isPlaying;
        io.to(roomId).emit('sync-state', room);
      }
    });

    socket.on('next-song', (roomId: string) => {
      const room = rooms.get(roomId);
      if (room) {
        if (room.queue.length > 0) {
          room.currentSong = room.queue.shift();
          room.isPlaying = true;
          room.currentTime = 0;
        } else {
          room.currentSong = null;
          room.isPlaying = false;
          room.currentTime = 0;
        }
        io.to(roomId).emit('sync-state', room);
      }
    });

    socket.on('play-song', (roomId: string, song: any) => {
       const room = rooms.get(roomId);
       if (room) {
         room.currentSong = song;
         room.isPlaying = true;
         room.currentTime = 0;
         io.to(roomId).emit('sync-state', room);
       }
    });

    socket.on('remove-from-queue', (roomId: string, index: number) => {
      const room = rooms.get(roomId);
      if (room) {
        room.queue.splice(index, 1);
        io.to(roomId).emit('sync-state', room);
      }
    });

    socket.on('sync-time', (roomId: string, currentTime: number) => {
      const room = rooms.get(roomId);
      if (room) {
        room.currentTime = currentTime;
        // Don't broadcast to everyone to avoid feedback loops, 
        // maybe only broadcast if it's a seek event
        socket.to(roomId).emit('time-update', currentTime);
      }
    });

    socket.on('seek', (roomId: string, time: number) => {
      const room = rooms.get(roomId);
      if (room) {
        room.currentTime = time;
        io.to(roomId).emit('seek-to', time);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
