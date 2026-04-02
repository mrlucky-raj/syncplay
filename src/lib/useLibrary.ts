import { useState, useEffect } from 'react';
import { Song, Playlist } from '../types';
import { db, auth } from './firebase';
import { ref, onValue, set, push, remove } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';

export function useLibrary() {
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [history, setHistory] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const likedRef = ref(db, `users/${userId}/likedSongs`);
    const historyRef = ref(db, `users/${userId}/history`);
    const playlistsRef = ref(db, `users/${userId}/playlists`);

    const unsubLiked = onValue(likedRef, (snapshot) => {
      const data = snapshot.val();
      setLikedSongs(data ? Object.values(data) : []);
    });

    const unsubHistory = onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      setHistory(data ? Object.values(data) : []);
    });

    const unsubPlaylists = onValue(playlistsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsedPlaylists = Object.entries(data).map(([id, p]: [string, any]) => ({
          id,
          ...p,
          songs: p.songs ? Object.values(p.songs) : []
        }));
        setPlaylists(parsedPlaylists);
      } else {
        setPlaylists([]);
      }
    });

    return () => {
      unsubLiked();
      unsubHistory();
      unsubPlaylists();
    };
  }, [userId]);

  const toggleLike = (song: Song) => {
    if (!userId) return;
    const exists = likedSongs.some(s => s.id === song.id);
    const likedRef = ref(db, `users/${userId}/likedSongs`);
    
    if (exists) {
      // Find the key to remove
      onValue(likedRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const key = Object.keys(data).find(k => data[k].id === song.id);
          if (key) {
            remove(ref(db, `users/${userId}/likedSongs/${key}`));
          }
        }
      }, { onlyOnce: true });
    } else {
      push(likedRef, song);
    }
  };

  const isLiked = (songId: string) => likedSongs.some(s => s.id === songId);

  const addToHistory = (song: Song) => {
    if (!userId) return;
    const historyRef = ref(db, `users/${userId}/history`);
    
    onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const key = Object.keys(data).find(k => data[k].id === song.id);
        if (key) {
          remove(ref(db, `users/${userId}/history/${key}`));
        }
      }
      push(historyRef, song);
      
      // Optional: limit history size
    }, { onlyOnce: true });
  };

  const createPlaylist = (name: string) => {
    if (!userId) return;
    const playlistsRef = ref(db, `users/${userId}/playlists`);
    push(playlistsRef, {
      name,
      createdAt: Date.now()
    });
  };

  const addSongToPlaylist = (playlistId: string, song: Song) => {
    if (!userId) return;
    const playlistSongsRef = ref(db, `users/${userId}/playlists/${playlistId}/songs`);
    push(playlistSongsRef, song);
  };

  return { likedSongs, history, playlists, toggleLike, isLiked, addToHistory, createPlaylist, addSongToPlaylist };
}
