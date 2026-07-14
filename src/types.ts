export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  bio?: string;
  avatarUrl?: string;
  favoriteGenres?: string[];
  totalListeningTime?: number;
  followersCount?: number;
  followingCount?: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  mood: string;
  duration: number; // in seconds
  audioUrl: string;
  coverUrl: string;
  coverImage?: string;
  plays: number;
  likes: number;
  energy: number;
  tempo: number;
  acousticness: number;
  createdAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  userId: string;
  songIds: string[];
  coverUrl: string;
  isPublic: boolean;
  isAISmart?: boolean;
  createdAt: string;
}

export interface PlayHistory {
  id: string;
  userId: string;
  songId: string;
  playedAt: string;
}

export interface LikedSong {
  id: string;
  userId: string;
  songId: string;
  likedAt: string;
}

export interface Artist {
  id: string;
  name: string;
  genre: string;
  avatarUrl: string;
  bio: string;
  monthlyListeners: number;
}

export interface Genre {
  id: string;
  name: string;
  color: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'alert' | 'ai';
  read: boolean;
  createdAt: string;
}

export interface ProfileStats {
  likesCount: number;
  historyCount: number;
  playlistsCount: number;
  totalStorageCapacity: string;
}

export interface AdminAnalytics {
  totalUsers: number;
  totalSongs: number;
  totalPlaylists: number;
  totalPlays: number;
  genreBreakdown: { [key: string]: number };
}
