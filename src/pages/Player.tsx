import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube';
import { socket } from '../lib/socket';
import { RoomState } from '../types';
import { Play, Pause, SkipForward, Music, Eye, EyeOff, Music2, Heart, Copy, Check, Repeat, Repeat1 } from 'lucide-react';
import { motion } from 'motion/react';
import { ThemeToggle } from '../components/ThemeToggle';
import { useLibrary } from '../lib/useLibrary';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Player() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [isIdle, setIsIdle] = useState(false);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toggleLike, isLiked, addToHistory } = useLibrary();

  const currentUrl = `${window.location.origin}/controller/${roomId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetIdleTimer = () => {
    setIsIdle(false);
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    if (roomState?.isPlaying && roomState?.currentSong) {
      idleTimeoutRef.current = setTimeout(() => {
        setIsIdle(true);
      }, 3000);
    }
  };

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, [roomState?.isPlaying, roomState?.currentSong]);

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
        if (state.volume !== undefined) {
          playerRef.current.setVolume(state.volume);
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

  useEffect(() => {
    if (roomState?.currentSong) {
      addToHistory(roomState.currentSong);
    }
  }, [roomState?.currentSong?.id]);

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
    
    // We need to use a functional state update or ref to get the latest roomState here,
    // but since onReady fires once, we can just rely on the sync-state event to set volume later.
    // However, if we have it initially:
    if (roomState?.volume !== undefined) {
      event.target.setVolume(roomState.volume);
    } else {
      event.target.setVolume(100);
    }
    
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

  return (
    <div 
      className="min-h-[100dvh] bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white flex flex-col transition-colors relative overflow-hidden"
      onMouseMove={resetIdleTimer}
      onClick={resetIdleTimer}
    >
      {/* Header */}
      <header className={cn(
        "absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between gap-4 z-20 bg-white/50 dark:bg-black/50 backdrop-blur-xl border-b border-zinc-200 dark:border-white/5 pt-safe transition-transform duration-500",
        isIdle ? "-translate-y-full" : "translate-y-0"
      )}>
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
            <Music2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-lg leading-tight">SyncPlay</h1>
            <p className="text-xs text-zinc-500 font-medium">Listen together</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center relative w-full h-[100dvh]">
        {!roomState?.currentSong ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-8 max-w-lg mt-16"
          >
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-zinc-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto border border-zinc-200 dark:border-white/10">
              <Music className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-400 dark:text-white/20" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-light text-zinc-800 dark:text-white/80">Waiting for music...</h2>
              <p className="text-zinc-500 dark:text-white/40 text-base sm:text-lg">
                Connect your phone using the room code below to start playing.
              </p>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-zinc-200/50 dark:shadow-none space-y-6">
              <div className="space-y-2">
                <p className="text-xs sm:text-sm uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-medium">Room Code</p>
                <div className="text-4xl sm:text-5xl font-mono font-bold tracking-widest text-emerald-500 dark:text-emerald-400">
                  {roomId}
                </div>
              </div>
              
              <button
                onClick={handleCopy}
                className="w-full py-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 active:scale-[0.98] text-zinc-900 dark:text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                {copied ? 'Copied!' : 'Copy Invite Link'}
              </button>
            </div>
          </motion.div>
        ) : (
          <div className={cn(
            "w-full relative group bg-zinc-900 transition-all duration-500 flex items-center justify-center",
            isIdle ? "h-[100dvh] max-w-none rounded-none border-none" : "max-w-6xl aspect-video rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-zinc-200 dark:shadow-emerald-500/10 border border-zinc-200 dark:border-white/10"
          )}>
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
            <div className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 sm:via-black/20 to-transparent flex flex-col justify-end p-4 sm:p-10 transition-opacity duration-500",
              isIdle ? "opacity-0 pointer-events-none" : "opacity-100"
            )}>
              <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 sm:gap-0 pb-16 sm:pb-0">
                <div className="space-y-1 sm:space-y-2 max-w-3xl">
                  <h1 className="text-xl sm:text-4xl font-bold text-white line-clamp-2 sm:line-clamp-1">{roomState.currentSong.title}</h1>
                  <p className="text-sm sm:text-xl text-white/60">{roomState.currentSong.author}</p>
                </div>
                
                <div className="flex items-center gap-4 sm:gap-6 self-end sm:self-auto">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLike(roomState.currentSong!); }}
                    className={cn(
                      "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors backdrop-blur-md border border-white/10 active:scale-95",
                      isLiked(roomState.currentSong.id) 
                        ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" 
                        : "bg-black/50 text-white hover:bg-black/70"
                    )}
                    title="Like"
                  >
                    <Heart className={cn("w-4 h-4 sm:w-5 sm:h-5", isLiked(roomState.currentSong.id) && "fill-current")} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowVideo(!showVideo); }}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors backdrop-blur-md border border-white/10 active:scale-95"
                    title={showVideo ? "Hide Video" : "Show Video"}
                  >
                    {showVideo ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); socket.emit('play-pause', roomId, !roomState.isPlaying); }}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                  >
                    {roomState.isPlaying ? <Pause className="w-6 h-6 sm:w-8 sm:h-8" /> : <Play className="w-6 h-6 sm:w-8 sm:h-8 ml-1" />}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); socket.emit('next-song', roomId); }}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10 active:scale-95"
                  >
                    <SkipForward className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); socket.emit('toggle-repeat', roomId); }}
                    className={cn(
                      "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors backdrop-blur-md border border-white/10 active:scale-95",
                      roomState.repeatMode === 'one' || roomState.repeatMode === 'all'
                        ? "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30"
                        : "bg-black/50 text-white hover:bg-black/70"
                    )}
                    title="Toggle Repeat"
                  >
                    {roomState.repeatMode === 'one' ? <Repeat1 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Up Next Bar */}
      {roomState?.queue && roomState.queue.length > 0 && (
        <footer className={cn(
          "absolute bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-200 dark:border-white/5 p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 pb-safe z-20 transition-transform duration-500",
          isIdle ? "translate-y-full" : "translate-y-0"
        )}>
          <span className="text-zinc-500 dark:text-white/40 text-xs sm:text-sm uppercase tracking-wider font-medium whitespace-nowrap">Up Next</span>
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 w-full scrollbar-hide">
            {roomState.queue.map((song, idx) => (
              <div key={`${song.id}-${idx}`} className="flex items-center gap-3 bg-zinc-100 dark:bg-white/5 rounded-xl p-2 pr-4 sm:pr-6 min-w-[200px] sm:min-w-[240px] max-w-[260px] sm:max-w-[300px] border border-zinc-200 dark:border-transparent shrink-0">
                <img src={song.thumbnail} alt={song.title} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover" />
                <div className="overflow-hidden">
                  <p className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-white/90 truncate">{song.title}</p>
                  <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-white/50 truncate">{song.author}</p>
                </div>
              </div>
            ))}
          </div>
        </footer>
      )}
    </div>
  );
}
