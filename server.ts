import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import ytSearch from 'yt-search';
import path from 'path';

async function startServer() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
    },
  });
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/search', async (req, res) => {
    const query = req.query.q as string;
    const source = req.query.source as string || 'youtube';
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    try {
      if (source === 'saavn') {
        const response = await fetch(`https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data && data.data && data.data.results) {
          const songs = data.data.results.map((s: any) => ({
            id: s.id,
            title: s.name,
            thumbnail: s.image && s.image.length > 0 ? s.image[s.image.length - 1].url : '',
            duration: s.duration ? `${Math.floor(s.duration / 60)}:${(s.duration % 60).toString().padStart(2, '0')}` : '0:00',
            author: s.primaryArtists || s.singers || 'Unknown Artist',
            source: 'saavn',
            downloadUrl: s.downloadUrl && s.downloadUrl.length > 0 ? s.downloadUrl[s.downloadUrl.length - 1].url : ''
          }));
          return res.json(songs);
        }
        return res.json([]);
      } else {
        // YouTube Search
        if (process.env.YOUTUBE_API_KEY) {
          try {
            const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(query)}&type=video&key=${process.env.YOUTUBE_API_KEY}`);
            const data = await response.json();
            if (data.items) {
              const videos = data.items.map((item: any) => ({
                id: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
                duration: '', // YouTube search API doesn't return duration directly without another call
                author: item.snippet.channelTitle,
                source: 'youtube'
              }));
              return res.json(videos);
            }
          } catch (e) {
            console.error('Official YouTube API failed, falling back to yt-search', e);
          }
        }

        const results = await ytSearch(query);
        const videos = results.videos.slice(0, 20).map(v => ({
          id: v.videoId,
          title: v.title,
          thumbnail: v.thumbnail,
          duration: v.timestamp,
          author: v.author.name,
          source: 'youtube'
        }));
        return res.json(videos);
      }
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ error: 'Failed to search' });
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
          volume: 100,
          repeatMode: 'off',
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

    socket.on('set-volume', (roomId: string, volume: number) => {
      const room = rooms.get(roomId);
      if (room) {
        room.volume = volume;
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
        if (room.repeatMode === 'one' && room.currentSong) {
          room.currentTime = 0;
          room.isPlaying = true;
        } else if (room.queue.length > 0) {
          if (room.repeatMode === 'all' && room.currentSong) {
            room.queue.push(room.currentSong);
          }
          room.currentSong = room.queue.shift();
          room.isPlaying = true;
          room.currentTime = 0;
        } else {
          if (room.repeatMode === 'all' && room.currentSong) {
            room.currentTime = 0;
            room.isPlaying = true;
          } else {
            room.currentSong = null;
            room.isPlaying = false;
            room.currentTime = 0;
          }
        }
        io.to(roomId).emit('sync-state', room);
      }
    });

    socket.on('toggle-repeat', (roomId: string) => {
      const room = rooms.get(roomId);
      if (room) {
        const modes: ('off' | 'one' | 'all')[] = ['off', 'one', 'all'];
        const currentIndex = modes.indexOf(room.repeatMode || 'off');
        room.repeatMode = modes[(currentIndex + 1) % modes.length];
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
