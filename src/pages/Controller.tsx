import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import YouTube, { YouTubePlayer } from 'react-youtube';
import { socket } from '../lib/socket';
import { RoomState, Song } from '../types';
import { Search, Play, Pause, SkipForward, Plus, ListMusic, X, Loader2, Music2, Headphones, Smartphone, Volume2, Heart, Library, Repeat, Repeat1, Home, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ThemeToggle } from '../components/ThemeToggle';
import { useLibrary } from '../lib/useLibrary';
import { PlaylistSelector } from '../components/PlaylistSelector';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Controller() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'queue'>('home');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showVolume, setShowVolume] = useState(false);
  const [searchSource, setSearchSource] = useState<'youtube' | 'saavn'>('youtube');
  
  const { likedSongs, history, playlists, toggleLike, isLiked, addToHistory } = useLibrary();

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
      if (roomState.volume !== undefined) {
        localPlayerRef.current.setVolume(roomState.volume);
      }
    }
  }, [roomState?.isPlaying, roomState?.volume]);

  useEffect(() => {
    if (roomState?.currentSong) {
      addToHistory(roomState.currentSong);
    }
  }, [roomState?.currentSong?.id]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&source=${searchSource}`);
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

  const addToQueue = (song: Song, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  const toggleRepeat = () => {
    socket.emit('toggle-repeat', roomId);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    socket.emit('seek', roomId, time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    socket.emit('set-volume', roomId, vol);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-[100dvh] bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col font-sans transition-colors overflow-hidden">
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
              if (roomState.volume !== undefined) e.target.setVolume(roomState.volume);
            }}
          />
        </div>
      )}

      {/* Header */}
      <header className="pt-safe px-6 py-4 border-b border-zinc-200 dark:border-zinc-900 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl shrink-0 flex items-center justify-between z-20">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
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
              "p-2 rounded-full transition-colors flex items-center justify-center active:scale-95",
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
      <main className="flex-1 overflow-y-auto scrollbar-hide pb-[220px] relative">
        <div className="p-4 max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'home' ? (
              <motion.div
                key="home"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8 pb-32"
              >
                {/* Top Tracks (History) */}
                <section>
                  <h2 className="text-lg font-semibold mb-4">Top Tracks</h2>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {history.slice(0, 10).map((song, idx) => (
                      <div key={`history-${song.id}-${idx}`} onClick={() => playSongNow(song)} className="w-32 shrink-0 cursor-pointer group">
                        <div className="w-32 h-32 rounded-xl overflow-hidden mb-2 relative">
                          <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="w-8 h-8 text-white fill-current" />
                          </div>
                        </div>
                        <h3 className="font-medium text-sm truncate">{song.title}</h3>
                        <p className="text-xs text-zinc-500 truncate">{song.author}</p>
                      </div>
                    ))}
                    {history.length === 0 && (
                      <p className="text-sm text-zinc-500">No recent tracks.</p>
                    )}
                  </div>
                </section>

                {/* Favorite Tracks */}
                <section>
                  <h2 className="text-lg font-semibold mb-4">Favorite Tracks</h2>
                  <div className="space-y-2">
                    {likedSongs.slice(0, 5).map((song) => (
                      <div key={`liked-${song.id}`} onClick={() => playSongNow(song)} className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900/80 cursor-pointer transition-colors">
                        <img src={song.thumbnail} alt={song.title} className="w-12 h-12 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{song.title}</h3>
                          <p className="text-xs text-zinc-500 truncate">{song.author}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); toggleLike(song); }} className="p-2 text-red-500">
                          <Heart className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                    ))}
                    {likedSongs.length === 0 && (
                      <p className="text-sm text-zinc-500">No favorite tracks yet.</p>
                    )}
                  </div>
                </section>

                {/* Created Playlists */}
                <section>
                  <h2 className="text-lg font-semibold mb-4">Your Playlists</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {playlists.map(playlist => (
                      <div key={playlist.id} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:border-emerald-500/50 transition-colors">
                        <h3 className="font-medium truncate">{playlist.name}</h3>
                        <p className="text-xs text-zinc-500 mt-1">{playlist.songs?.length || 0} tracks</p>
                      </div>
                    ))}
                    {playlists.length === 0 && (
                      <p className="text-sm text-zinc-500 col-span-2">No playlists created.</p>
                    )}
                  </div>
                </section>
              </motion.div>
            ) : activeTab === 'search' ? (
              <motion.div
                key="search"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <form onSubmit={handleSearch} className="relative">
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setSearchSource('youtube')}
                      className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-colors", searchSource === 'youtube' ? "bg-emerald-500 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400")}
                    >
                      YouTube
                    </button>
                    <button
                      type="button"
                      onClick={() => setSearchSource('saavn')}
                      className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-colors", searchSource === 'saavn' ? "bg-emerald-500 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400")}
                    >
                      Saavn API
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search ${searchSource === 'youtube' ? 'YouTube' : 'Saavn'}... (Press Enter)`}
                      className="w-full pl-12 pr-4 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-base placeholder:text-zinc-400 dark:placeholder:text-zinc-600 shadow-sm dark:shadow-none"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500 animate-spin" />
                    )}
                  </div>
                </form>

                <div className="space-y-3">
                  {searchResults.map((song) => (
                    <div 
                      key={song.id} 
                      onClick={() => playSongNow(song)}
                      className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-900/80 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800/50 active:bg-zinc-200 dark:active:bg-zinc-800 cursor-pointer"
                    >
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
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(song);
                          }}
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-colors active:scale-95",
                            isLiked(song.id) 
                              ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" 
                              : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                          )}
                          title="Like"
                        >
                          <Heart className={cn("w-5 h-5", isLiked(song.id) && "fill-current")} />
                        </button>
                        <PlaylistSelector song={song} />
                        <button
                          onClick={(e) => addToQueue(song, e)}
                          className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors active:scale-95"
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
                        <div className="flex gap-1">
                          <PlaylistSelector song={song} />
                          <button
                            onClick={() => removeFromQueue(idx)}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 transition-colors active:scale-95"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
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
                      className="text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 text-sm font-medium active:scale-95 transition-transform"
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

      {/* Fixed Bottom Area */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-zinc-50 dark:from-zinc-950 via-zinc-50/95 dark:via-zinc-950/95 to-transparent pt-12 pb-safe pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          {/* Now Playing Bar (Floating) */}
          {roomState?.currentSong && (
            <div className="mx-4 mb-4 bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-xl shadow-zinc-200/50 dark:shadow-none border border-zinc-200/50 dark:border-zinc-800/50">
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

              {/* Volume Control */}
              <AnimatePresence>
                {showVolume && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex items-center gap-3 mb-4 overflow-hidden"
                  >
                    <Volume2 className="w-4 h-4 text-zinc-400" />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={roomState.volume ?? 100}
                      onChange={handleVolumeChange}
                      className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

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

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleLike(roomState.currentSong!)}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-colors active:scale-95",
                      isLiked(roomState.currentSong.id) 
                        ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" 
                        : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    <Heart className={cn("w-5 h-5", isLiked(roomState.currentSong.id) && "fill-current")} />
                  </button>
                  <button
                    onClick={() => setShowVolume(!showVolume)}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-colors active:scale-95",
                      showVolume ? "bg-emerald-500/10 text-emerald-500" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={togglePlayPause}
                    className="w-12 h-12 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-zinc-900/20 dark:shadow-white/10"
                  >
                    {roomState.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                  </button>
                  <button
                    onClick={playNext}
                    className="w-10 h-10 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors active:scale-95"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                  <button
                    onClick={toggleRepeat}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-colors active:scale-95",
                      roomState.repeatMode === 'one' || roomState.repeatMode === 'all'
                        ? "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                        : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                    title="Toggle Repeat"
                  >
                    {roomState.repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Nav */}
          <div className="flex items-center justify-around px-2 pb-2">
            <button
              onClick={() => setActiveTab('home')}
              className={cn(
                "flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-xl transition-all active:scale-95",
                activeTab === 'home' ? "text-emerald-500 dark:text-emerald-400" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <Home className="w-6 h-6" />
              <span className="text-[10px] font-medium">Home</span>
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={cn(
                "flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-xl transition-all active:scale-95",
                activeTab === 'search' ? "text-emerald-500 dark:text-emerald-400" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <Search className="w-6 h-6" />
              <span className="text-[10px] font-medium">Search</span>
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={cn(
                "flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-xl transition-all relative active:scale-95",
                activeTab === 'queue' ? "text-emerald-500 dark:text-emerald-400" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <ListMusic className="w-6 h-6" />
              <span className="text-[10px] font-medium">Queue</span>
              {roomState?.queue && roomState.queue.length > 0 && (
                <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>
            <button
              onClick={() => navigate('/library')}
              className="flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-xl transition-all active:scale-95 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            >
              <Library className="w-6 h-6" />
              <span className="text-[10px] font-medium">Library</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
