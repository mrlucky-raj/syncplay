import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, MonitorPlay, Smartphone, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { ThemeToggle } from '../components/ThemeToggle';

export default function Home() {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateRoom = () => {
    const newRoomId = generateRoomId();
    navigate(`/player/${newRoomId}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      navigate(`/controller/${roomId.toUpperCase()}`);
    }
  };

  const handleJoinPublic = () => {
    navigate('/controller/PUBLIC');
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col font-sans transition-colors overflow-hidden">
      {/* Header */}
      <header className="pt-safe px-6 py-4 border-b border-zinc-200 dark:border-zinc-900 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl shrink-0 flex items-center justify-between z-20">
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-lg leading-tight">SyncPlay</h1>
            <p className="text-xs text-zinc-500 font-medium">Listen together, control from anywhere</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-hide flex flex-col items-center justify-center p-6 pt-safe pb-safe">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl space-y-12"
        >
          <div className="flex flex-col md:flex-row gap-8 items-stretch justify-center">
            {/* Host Card */}
            <div className="flex-1 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-8 flex flex-col shadow-xl shadow-zinc-200/50 dark:shadow-none transition-colors">
              <div className="flex items-center gap-4 text-zinc-800 dark:text-zinc-300 mb-6">
                <MonitorPlay className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
                <h2 className="text-xl font-medium">Host a Player</h2>
              </div>
              <p className="text-zinc-500 text-sm mb-8 flex-1">
                Create a new room and use this device as the main screen and speaker.
              </p>
              <button
                onClick={handleCreateRoom}
                className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 active:scale-[0.98] text-white rounded-xl font-medium transition-all"
              >
                Start Player
              </button>
            </div>

            {/* Join Card */}
            <div className="flex-1 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-8 flex flex-col shadow-xl shadow-zinc-200/50 dark:shadow-none transition-colors">
              <div className="flex items-center gap-4 text-zinc-800 dark:text-zinc-300 mb-6">
                <Smartphone className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
                <h2 className="text-xl font-medium">Join as Remote</h2>
              </div>
              <p className="text-zinc-500 text-sm mb-8 flex-1">
                Enter a room code to control the music from your phone or another device.
              </p>
              <form onSubmit={handleJoinRoom} className="space-y-4 mt-auto">
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="Enter Room Code"
                  className="w-full px-4 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-center text-lg tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal text-zinc-900 dark:text-zinc-50"
                  maxLength={6}
                />
                <button
                  type="submit"
                  disabled={!roomId.trim()}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 active:scale-[0.98] disabled:active:scale-100 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-500 text-white rounded-xl font-medium transition-all"
                >
                  Connect Remote
                </button>
              </form>
            </div>
          </div>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-zinc-50 dark:bg-zinc-950 text-zinc-400 dark:text-zinc-500 transition-colors">OR</span>
            </div>
          </div>

          {/* Public Room Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => navigate('/player/PUBLIC')}
              className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                <MonitorPlay className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">Host Public Player</div>
                <div className="text-xs text-zinc-500">Fixed room for everyone</div>
              </div>
            </button>
            <button
              onClick={() => navigate('/controller/PUBLIC')}
              className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">Join Public Remote</div>
                <div className="text-xs text-zinc-500">Control the public room</div>
              </div>
            </button>
          </div>

        </motion.div>
      </main>
    </div>
  );
}
