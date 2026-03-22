import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import YouTube, { YouTubePlayer } from 'react-youtube';
import { socket } from '../lib/socket';
import { RoomState, Song } from '../types';
import { Search, Play, Pause, SkipForward, Plus, ListMusic, X, Loader2, Music2, Headphones, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ThemeToggle } from '../components/ThemeToggle';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Controller() {
  const { roomId } = useParams<{ roomId: string }>();
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'queue'>('search');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Local Playback State
  const [isLocalPlaying, setIsLocalPlaying] = useState(false);
  const localPlayerRef = useRef<YouTubePlayer | null>(null);

  useEffect(() => {
    if (!roomId) return;

    socket.connect();
    socket.emit('join-room', roomId, 'controller');

    socket.on('sync-state', (state: RoomState) => {
      setRoomState(state);
      // Parse duration from current song if available
      if (state.currentSong?.duration) {
        const parts = state.currentSong.duration.split(':').map(Number);
        let totalSeconds = 0;
        if (parts.length === 3) {
          totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
          totalSeconds = parts[0] * 60 + parts[1];
        }
        setDuration(totalSeconds);
      }
    });

    socket.on('time-update', (time: number) => {
      setCurrentTime(time);
    });

    return () => {
      socket.off('sync-state');
      socket.off('time-update');
      socket.disconnect();
    };
  }, [roomId]);

  // Sync local player state
  useEffect(() => {
    if (localPlayerRef.current && roomState) {
      if (roomState.isPlaying) {
        localPlayerRef.current.playVideo();
      } else {
        localPlayerRef.current.pauseVideo();
      }
    }
  }, [roomState?.isPlaying]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
      const response = await fetch(`${BACKEND_URL}/api/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value);
    }, 500);
  };

  const addToQueue = (song: Song) => {
    socket.emit('add-to-queue', roomId, song);
    setSearchQuery('');
    setSearchResults([]);
    setActiveTab('queue');
  };

  const playSongNow = (song: Song) => {
    socket.emit('play-song', roomId, song);
    setSearchQuery('');
    setSearchResults([]);
    setActiveTab('queue');
  };

  const removeFromQueue = (index: number) => {
    socket.emit('remove-from-queue', roomId, index);
  };

  const togglePlayPause = () => {
    if (roomState?.currentSong) {
      socket.emit('play-pause', roomId, !roomState.isPlaying);
    }
  };

  const playNext = () => {
    socket.emit('next-song', roomId);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    socket.emit('seek', roomId, time);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col font-sans transition-colors">
      {/* Hidden Local Player */}
      {isLocalPlaying && roomState?.currentSong && (
        <div className="absolute w-0 h-0 opacity-0 pointer-events-none overflow-hidden">
          <YouTube
            videoId={roomState.currentSong.id}
            opts={{
              playerVars: {
                autoplay: roomState.isPlaying ? 1 : 0,
                playsinline: 1,
                controls: 0,
              }
            }}
            onReady={(e) => {
              localPlayerRef.current = e.target;
              e.target.seekTo(currentTime, true);
              if (roomState.isPlaying) e.target.playVideo();
            }}
          />
        </div>
      )}

      {/* Header */}
      <header className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-900 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center">
            <Music2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-lg leading-tight">SyncPlay</h1>
            <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase">Room: {roomId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLocalPlaying(!isLocalPlaying)}
            className={cn(
              "p-2 rounded-full transition-colors flex items-center justify-center",
              isLocalPlaying 
                ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400" 
                : "hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400"
            )}
            title={isLocalPlaying ? "Stop Local Playback" : "Play on this device"}
          >
            {isLocalPlaying ? <Headphones className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
          </button>
          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1"></div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex p-4 gap-2 border-b border-zinc-200 dark:border-zinc-900">
          <button
            onClick={() => setActiveTab('search')}
            className={cn(
              "flex-1 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2",
              activeTab === 'search' 
                ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white" 
                : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-700 dark:hover:text-zinc-200"
            )}
          >
            <Search className="w-4 h-4" />
            Search
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={cn(
              "flex-1 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 relative",
              activeTab === 'queue' 
                ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white" 
                : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-700 dark:hover:text-zinc-200"
            )}
          >
            <ListMusic className="w-4 h-4" />
            Queue
            {roomState?.queue && roomState.queue.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
          <AnimatePresence mode="wait">
            {activeTab === 'search' ? (
              <motion.div
                key="search"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={onSearchChange}
                    placeholder="Search YouTube..."
                    className="w-full pl-12 pr-4 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-base placeholder:text-zinc-400 dark:placeholder:text-zinc-600 shadow-sm dark:shadow-none"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500 animate-spin" />
                  )}
                </div>

                <div className="space-y-3">
                  {searchResults.map((song) => (
                    <div key={song.id} className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-900/80 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800/50">
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-zinc-200 dark:bg-zinc-900">
                        <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover" />
                        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-medium backdrop-blur-sm">
                          {song.duration}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate text-sm mb-1">{song.title}</h3>
                        <p className="text-xs text-zinc-500 truncate">{song.author}</p>
                      </div>
                      <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => playSongNow(song)}
                          className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors"
                          title="Play Now"
                        >
                          <Play className="w-4 h-4 ml-0.5" />
                        </button>
                        <button
                          onClick={() => addToQueue(song)}
                          className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                          title="Add to Queue"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {!isSearching && searchQuery && searchResults.length === 0 && (
                    <div className="text-center py-12 text-zinc-500">
                      No results found for "{searchQuery}"
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="queue"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {roomState?.queue && roomState.queue.length > 0 ? (
                  <div className="space-y-3 pb-32">
                    <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4 px-2">Up Next</h3>
                    {roomState.queue.map((song, idx) => (
                      <div key={`${song.id}-${idx}`} className="flex items-center gap-4 p-3 rounded-2xl bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/30 shadow-sm dark:shadow-none">
                        <div className="w-8 text-center text-zinc-400 dark:text-zinc-600 text-sm font-medium">{idx + 1}</div>
                        <img src={song.thumbnail} alt={song.title} className="w-12 h-12 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-zinc-900 dark:text-zinc-200 truncate text-sm">{song.title}</h3>
                          <p className="text-xs text-zinc-500 truncate">{song.author}</p>
                        </div>
                        <button
                          onClick={() => removeFromQueue(idx)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mx-auto text-zinc-400 dark:text-zinc-700">
                      <ListMusic className="w-8 h-8" />
                    </div>
                    <p className="text-zinc-500">Your queue is empty.</p>
                    <button 
                      onClick={() => setActiveTab('search')}
                      className="text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 text-sm font-medium"
                    >
                      Search for music
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Now Playing Bar (Sticky Bottom) */}
      {roomState?.currentSong && (
        <div className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 p-4 pb-safe shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] dark:shadow-none">
          <div className="max-w-md mx-auto">
            {/* Progress Bar */}
            <div className="flex items-center gap-3 mb-4 text-xs font-mono text-zinc-500">
              <span>{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
              />
              <span>{roomState.currentSong.duration}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <img 
                  src={roomState.currentSong.thumbnail} 
                  alt="Now Playing" 
                  className="w-12 h-12 rounded-lg object-cover shadow-md shadow-black/10 dark:shadow-black/50"
                />
                <div className="min-w-0 pr-4">
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm truncate">{roomState.currentSong.title}</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{roomState.currentSong.author}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <button
                  onClick={togglePlayPause}
                  className="w-12 h-12 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-zinc-900/20 dark:shadow-white/10"
                >
                  {roomState.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                </button>
                <button
                  onClick={playNext}
                  className="w-10 h-10 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
