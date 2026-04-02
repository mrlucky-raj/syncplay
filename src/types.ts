export interface Song {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  author: string;
  source?: 'youtube' | 'saavn';
  downloadUrl?: string;
}

export interface Playlist {
  id: string;
  name: string;
  songs: Song[];
  createdAt: number;
}

export interface RoomState {
  queue: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  repeatMode: 'off' | 'one' | 'all';
}
