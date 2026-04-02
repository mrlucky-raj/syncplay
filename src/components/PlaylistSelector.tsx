import { useState, useRef, useEffect } from 'react';
import { Plus, ListMusic } from 'lucide-react';
import { useLibrary } from '../lib/useLibrary';
import { Song } from '../types';
import { cn } from '../lib/utils';

export function PlaylistSelector({ song }: { song: Song }) {
  const { playlists, addSongToPlaylist } = useLibrary();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (playlists.length === 0) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors active:scale-95"
        title="Add to Playlist"
      >
        <ListMusic className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50">
          <div className="p-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
            Add to Playlist
          </div>
          <div className="max-h-48 overflow-y-auto">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={(e) => {
                  e.stopPropagation();
                  addSongToPlaylist(playlist.id, song);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors truncate"
              >
                {playlist.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
