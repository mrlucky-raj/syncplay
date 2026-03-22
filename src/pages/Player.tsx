import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube';
import { socket } from '../lib/socket';
import { RoomState } from '../types';
import { QrCode, Play, Pause, SkipForward, Volume2, Music, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { ThemeToggle } from '../components/ThemeToggle';

export default function Player() {
  const { roomId } = useParams<{ roomId: string }>();
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [volume, setVolume] = useState(100);
  const [showVideo, setShowVideo] = useState(true);

  useEffect(() => {
    if (!roomId) return;

    socket.connect();
    socket.emit('join-room', roomId, 'player');

    socket.on('sync-state', (state: RoomState) => {
      setRoomState(state);
      
      if (playerRef.current && isReady) {
        if (state.isPlaying) {
          playerRef.current.playVideo();
        } else {
          playerRef.current.pauseVideo();
        }
      }
    });

    socket.on('seek-to', (time: number) => {
      if (playerRef.current && isReady) {
        playerRef.current.seekTo(time, true);
      }
    });

    return () => {
      socket.off('sync-state');
      socket.off('seek-to');
      socket.disconnect();
    };
  }, [roomId, isReady]);

  // MediaSession API for background playback controls
  useEffect(() => {
    if ('mediaSession' in navigator && roomState?.currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: roomState.currentSong.title,
        artist: roomState.currentSong.author,
        artwork: [
          { src: roomState.currentSong.thumbnail, sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        socket.emit('play-pause', roomId, true);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        socket.emit('play-pause', roomId, false);
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        socket.emit('next-song', roomId);
      });
    }
  }, [roomState?.currentSong, roomId]);

  // Periodic time sync
  useEffect(() => {
    const interval = setInterval(async () => {
      if (playerRef.current && isReady && roomState?.isPlaying) {
        const currentTime = await playerRef.current.getCurrentTime();
        socket.emit('sync-time', roomId, currentTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [roomId, isReady, roomState?.isPlaying]);

  const onReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
    setIsReady(true);
    event.target.setVolume(volume);
    
    if (roomState?.isPlaying) {
      event.target.playVideo();
    }
  };

  const onStateChange = (event: YouTubeEvent) => {
    // 0 = ended, 1 = playing, 2 = paused
    if (event.data === 0) {
      socket.emit('next-song', roomId);
    } else if (event.data === 1 && roomState?.isPlaying === false) {
      // User clicked play on the player itself
      socket.emit('play-pause', roomId, true);
    } else if (event.data === 2 && roomState?.isPlaying === true) {
      // User clicked pause on the player itself
      socket.emit('play-pause', roomId, false);
    }
  };

  const currentUrl = `${window.location.origin}/controller/${roomId}`;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white flex flex-col transition-colors">
      {/* Header */}
      <header className="p-6 flex items-center justify-between z-10 bg-white/50 dark:bg-black/50 backdrop-blur-xl border-b border-zinc-200 dark:border-white/5">
        <div className="flex items-center gap-4">
          <div className="bg-zinc-100 dark:bg-white/10 px-6 py-3 rounded-2xl border border-zinc-200 dark:border-white/5">
            <span className="text-zinc-500 dark:text-white/50 text-sm uppercase tracking-widest mr-3">Room Code</span>
            <span className="text-2xl font-mono font-bold tracking-widest text-emerald-500 dark:text-emerald-400">{roomId}</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-zinc-500 dark:text-white/50">
            <div className="flex flex-col items-end text-sm">
              <span>Scan or visit</span>
              <span className="text-zinc-900 dark:text-white font-medium">{currentUrl}</span>
            </div>
            <QrCode className="w-10 h-10 text-zinc-800 dark:text-white/80" />
          </div>
          <div className="w-px h-8 bg-zinc-200 dark:bg-white/10"></div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center relative p-8">
        {!roomState?.currentSong ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6 max-w-lg"
          >
            <div className="w-32 h-32 bg-zinc-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-zinc-200 dark:border-white/10">
              <Music className="w-12 h-12 text-zinc-400 dark:text-white/20" />
            </div>
            <h2 className="text-3xl font-light text-zinc-800 dark:text-white/80">Waiting for music...</h2>
            <p className="text-zinc-500 dark:text-white/40 text-lg">
              Connect your phone using the room code <strong className="text-zinc-900 dark:text-white">{roomId}</strong> to start playing.
            </p>
          </motion.div>
        ) : (
          <div className="w-full max-w-6xl aspect-video rounded-3xl overflow-hidden shadow-2xl shadow-zinc-200 dark:shadow-emerald-500/10 border border-zinc-200 dark:border-white/10 relative group bg-zinc-900">
            <YouTube
              videoId={roomState.currentSong.id}
              opts={{
                width: '100%',
                height: '100%',
                playerVars: {
                  autoplay: 1,
                  controls: 0, // Hide controls for a cleaner look
                  disablekb: 1,
                  modestbranding: 1,
                  rel: 0,
                  showinfo: 0,
                  iv_load_policy: 3,
                  playsinline: 1, // Allow background playback on mobile
                },
              }}
              onReady={onReady}
              onStateChange={onStateChange}
              className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${showVideo ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              iframeClassName="w-full h-full object-cover"
            />
            
            {/* Thumbnail Overlay when video is hidden */}
            {!showVideo && (
              <img 
                src={roomState.currentSong.thumbnail} 
                alt={roomState.currentSong.title}
                className="absolute inset-0 w-full h-full object-cover opacity-60"
              />
            )}
            
            {/* Overlay Info (visible on hover or pause) */}
            <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-10 transition-opacity duration-500 ${roomState.isPlaying && showVideo ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
              <div className="flex items-end justify-between">
                <div className="space-y-2 max-w-3xl">
                  <h1 className="text-4xl font-bold text-white line-clamp-1">{roomState.currentSong.title}</h1>
                  <p className="text-xl text-white/60">{roomState.currentSong.author}</p>
                </div>
                
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => setShowVideo(!showVideo)}
                    className="w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors backdrop-blur-md border border-white/10"
                    title={showVideo ? "Hide Video" : "Show Video"}
                  >
                    {showVideo ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <button 
                    onClick={() => socket.emit('play-pause', roomId, !roomState.isPlaying)}
                    className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    {roomState.isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                  </button>
                  <button 
                    onClick={() => socket.emit('next-song', roomId)}
                    className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10"
                  >
                    <SkipForward className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Up Next Bar */}
      {roomState?.queue && roomState.queue.length > 0 && (
        <footer className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-200 dark:border-white/5 p-6 flex items-center gap-6">
          <span className="text-zinc-500 dark:text-white/40 text-sm uppercase tracking-wider font-medium whitespace-nowrap">Up Next</span>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {roomState.queue.map((song, idx) => (
              <div key={`${song.id}-${idx}`} className="flex items-center gap-3 bg-zinc-100 dark:bg-white/5 rounded-xl p-2 pr-6 min-w-[240px] max-w-[300px] border border-zinc-200 dark:border-transparent">
                <img src={song.thumbnail} alt={song.title} className="w-12 h-12 rounded-lg object-cover" />
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white/90 truncate">{song.title}</p>
                  <p className="text-xs text-zinc-500 dark:text-white/50 truncate">{song.author}</p>
                </div>
              </div>
            ))}
          </div>
        </footer>
      )}
    </div>
  );
}
