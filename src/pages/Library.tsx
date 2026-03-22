import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibrary } from '../lib/useLibrary';
import { Music2, Play, Plus, Clock, Heart, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeToggle } from '../components/ThemeToggle';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Library() {
  const navigate = useNavigate();
  const { likedSongs, history, toggleLike, isLiked } = useLibrary();
  const [activeTab, setActiveTab] = useState<'liked' | 'history'>('liked');

  const playSong = (song: any) => {
    // Navigate to public room and play
    navigate('/controller/PUBLIC', { state: { playSong: song } });
  };

  const currentList = activeTab === 'liked' ? likedSongs : history;

  return (
    <div className="min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col font-sans transition-colors overflow-hidden">
      {/* Header */}
      <header className="pt-safe px-6 py-4 border-b border-zinc-200 dark:border-zinc-900 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl shrink-0 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center cursor-pointer" onClick={() => navigate('/')}>
            <Music2 className="w-5 h-5" />
          </div>
          <div className="cursor-pointer" onClick={() => navigate('/')}>
            <h1 className="font-semibold text-lg leading-tight">SyncPlay</h1>
            <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase">Library</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto scrollbar-hide relative">
        <div className="p-4 max-w-2xl mx-auto">
          {/* Tabs */}
          <div className="flex p-2 mb-6 gap-2 border-b border-zinc-200 dark:border-zinc-900">
            <button
              onClick={() => setActiveTab('liked')}
              className={cn(
                "flex-1 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2",
                activeTab === 'liked' 
                  ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white" 
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-700 dark:hover:text-zinc-200"
              )}
            >
              <Heart className="w-4 h-4" />
              Liked Songs
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                "flex-1 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 relative",
                activeTab === 'history' 
                  ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white" 
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-700 dark:hover:text-zinc-200"
              )}
            >
              <Clock className="w-4 h-4" />
              History
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3 pb-safe"
            >
              {currentList.length > 0 ? (
                currentList.map((song, idx) => (
                  <div 
                    key={`${song.id}-${idx}`} 
                    onClick={() => playSong(song)}
                    className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-900/80 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800/50 active:bg-zinc-200 dark:active:bg-zinc-800 cursor-pointer"
                  >
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-zinc-200 dark:bg-zinc-900">
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
                      >
                        <Heart className={cn("w-5 h-5", isLiked(song.id) && "fill-current")} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mx-auto text-zinc-400 dark:text-zinc-700">
                    {activeTab === 'liked' ? <Heart className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
                  </div>
                  <p className="text-zinc-500">
                    {activeTab === 'liked' ? "You haven't liked any songs yet." : "Your listening history is empty."}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
