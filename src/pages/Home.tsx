import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, MonitorPlay, Smartphone } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col items-center justify-center p-6 transition-colors">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-12"
      >
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 mb-4">
            <Music className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">SyncPlay</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-lg">
            Listen together, control from anywhere.
          </p>
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-8 space-y-6 shadow-xl shadow-zinc-200/50 dark:shadow-none transition-colors">
            <div className="flex items-center gap-4 text-zinc-800 dark:text-zinc-300">
              <MonitorPlay className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
              <h2 className="text-xl font-medium">Host a Player</h2>
            </div>
            <p className="text-zinc-500 text-sm">
              Create a new room and use this device as the main screen and speaker.
            </p>
            <button
              onClick={handleCreateRoom}
              className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors"
            >
              Start Player
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-zinc-50 dark:bg-zinc-950 text-zinc-400 dark:text-zinc-500 transition-colors">OR</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-8 space-y-6 shadow-xl shadow-zinc-200/50 dark:shadow-none transition-colors">
            <div className="flex items-center gap-4 text-zinc-800 dark:text-zinc-300">
              <Smartphone className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
              <h2 className="text-xl font-medium">Join as Remote</h2>
            </div>
            <p className="text-zinc-500 text-sm">
              Enter a room code to control the music from your phone or another device.
            </p>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="Enter Room Code (e.g. A1B2C3)"
                className="w-full px-4 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-center text-lg tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal text-zinc-900 dark:text-zinc-50"
                maxLength={6}
              />
              <button
                type="submit"
                disabled={!roomId.trim()}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-500 text-white rounded-xl font-medium transition-colors"
              >
                Connect Remote
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
