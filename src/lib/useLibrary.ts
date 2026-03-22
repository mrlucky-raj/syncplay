import { useState, useEffect } from 'react';
import { Song } from '../types';

export function useLibrary() {
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [history, setHistory] = useState<Song[]>([]);

  useEffect(() => {
    const storedLiked = localStorage.getItem('syncplay_liked');
    const storedHistory = localStorage.getItem('syncplay_history');
    if (storedLiked) setLikedSongs(JSON.parse(storedLiked));
    if (storedHistory) setHistory(JSON.parse(storedHistory));
  }, []);

  const toggleLike = (song: Song) => {
    setLikedSongs(prev => {
      const exists = prev.some(s => s.id === song.id);
      const newLiked = exists 
        ? prev.filter(s => s.id !== song.id)
        : [...prev, song];
      localStorage.setItem('syncplay_liked', JSON.stringify(newLiked));
      return newLiked;
    });
  };

  const isLiked = (songId: string) => likedSongs.some(s => s.id === songId);

  const addToHistory = (song: Song) => {
    setHistory(prev => {
      const filtered = prev.filter(s => s.id !== song.id);
      const newHistory = [song, ...filtered].slice(0, 50); // Keep last 50
      localStorage.setItem('syncplay_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  return { likedSongs, history, toggleLike, isLiked, addToHistory };
}
