export interface Song {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  author: string;
}

export interface RoomState {
  queue: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
}
