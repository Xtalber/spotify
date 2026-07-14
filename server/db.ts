import fs from 'fs';
import path from 'path';

// Define DB Models Types
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
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
  energy: number; // 1-10 (for cosine recommendation)
  tempo: number; // 1-10 (for cosine recommendation)
  acousticness: number; // 1-10 (for cosine recommendation)
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
  color: string; // Tailwind gradient colors e.g. "from-purple-600 to-indigo-600"
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

export interface MelodiaDatabase {
  users: User[];
  songs: Song[];
  playlists: Playlist[];
  histories: PlayHistory[];
  likedSongs: LikedSong[];
  artists: Artist[];
  genres: Genre[];
  notifications: Notification[];
}

const DB_PATH = path.join(process.cwd(), 'data', 'melodia_db.json');

// Default Seed Data
const DEFAULT_GENRES: Genre[] = [
  { id: '1', name: 'Synthwave', color: 'from-pink-600 to-indigo-600' },
  { id: '2', name: 'Lo-Fi Chill', color: 'from-teal-600 to-blue-600' },
  { id: '3', name: 'Acoustic / Folk', color: 'from-amber-600 to-orange-600' },
  { id: '4', name: 'Cinematic Ambient', color: 'from-cyan-600 to-purple-600' },
  { id: '5', name: 'Cyberpunk Electro', color: 'from-purple-700 to-rose-700' },
];

const DEFAULT_ARTISTS: Artist[] = [
  {
    id: 'a1',
    name: 'Neon Wanderer',
    genre: 'Synthwave',
    avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    bio: 'Pioneering retro-future soundscapes directly from the grid.',
    monthlyListeners: 425000,
  },
  {
    id: 'a2',
    name: 'Coffee & Rain',
    genre: 'Lo-Fi Chill',
    avatarUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=150&auto=format&fit=crop&q=80',
    bio: 'Warm vinyl crackles and mellow guitar loops for studying and cozy afternoons.',
    monthlyListeners: 890000,
  },
  {
    id: 'a3',
    name: 'Elena Rivers',
    genre: 'Acoustic / Folk',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    bio: 'Soul-stirring vocals and heartfelt acoustic strings from the Pacific Northwest.',
    monthlyListeners: 180000,
  },
];

const DEFAULT_SONGS: Song[] = [
  {
    id: 's1',
    title: 'Sunset Grid',
    artist: 'Neon Wanderer',
    album: 'Retro Drive',
    genre: 'Synthwave',
    mood: 'Energetic',
    duration: 372, // 6:12
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&h=500&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&h=500&fit=crop&q=80',
    plays: 24500,
    likes: 1250,
    energy: 9,
    tempo: 8,
    acousticness: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's2',
    title: 'Midnight Arcade',
    artist: 'Neon Wanderer',
    album: 'Retro Drive',
    genre: 'Synthwave',
    mood: 'Dark Synth',
    duration: 424, // 7:04
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80',
    plays: 18400,
    likes: 920,
    energy: 8,
    tempo: 7,
    acousticness: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's3',
    title: 'Warm Brew',
    artist: 'Coffee & Rain',
    album: 'Cafe Sessions',
    genre: 'Lo-Fi Chill',
    mood: 'Relaxed',
    duration: 302, // 5:02
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300&auto=format&fit=crop&q=80',
    plays: 52100,
    likes: 4120,
    energy: 3,
    tempo: 4,
    acousticness: 8,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's4',
    title: 'Raindrops on Vinyl',
    artist: 'Coffee & Rain',
    album: 'Cafe Sessions',
    genre: 'Lo-Fi Chill',
    mood: 'Melancholic',
    duration: 502, // 8:22
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1486556396467-d83d2b23514b?w=300&auto=format&fit=crop&q=80',
    plays: 43200,
    likes: 3410,
    energy: 2,
    tempo: 3,
    acousticness: 9,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's5',
    title: 'Timber Cabin',
    artist: 'Elena Rivers',
    album: 'Folk Tales',
    genre: 'Acoustic / Folk',
    mood: 'Cozy',
    duration: 285, // 4:45
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=300&auto=format&fit=crop&q=80',
    plays: 12000,
    likes: 850,
    energy: 4,
    tempo: 5,
    acousticness: 10,
    createdAt: new Date().toISOString(),
  },
];

// Initialize and ensure DB exists
export function initDB(): MelodiaDatabase {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    const initialData: MelodiaDatabase = {
      users: [
        {
          id: 'u1',
          username: 'admin',
          email: 'admin@melodia.ai',
          // bcrypt hash for "admin123"
          passwordHash: '$2a$10$fWJ00kL7Y/27mF48YhWbQeF00Rymz/eEunN2y6YidW1Fm78K5K9Tq',
          role: 'admin',
          createdAt: new Date().toISOString(),
        }
      ],
      songs: DEFAULT_SONGS,
      playlists: [],
      histories: [],
      likedSongs: [],
      artists: DEFAULT_ARTISTS,
      genres: DEFAULT_GENRES,
      notifications: [
        {
          id: 'n1',
          userId: 'u1',
          title: 'Welcome to Melodia!',
          message: 'Experience premium glassmorphic audio streaming powered by AI-driven smart recommendations.',
          type: 'ai',
          read: false,
          createdAt: new Date().toISOString(),
        }
      ],
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }

  try {
    const content = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.error("Error reading database file, re-initializing", e);
    const emptyDB: MelodiaDatabase = {
      users: [],
      songs: DEFAULT_SONGS,
      playlists: [],
      histories: [],
      likedSongs: [],
      artists: DEFAULT_ARTISTS,
      genres: DEFAULT_GENRES,
      notifications: [],
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(emptyDB, null, 2), 'utf-8');
    return emptyDB;
  }
}

// Save Database back to file
export function saveDB(data: MelodiaDatabase): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error("Failed to save DB file:", e);
  }
}

// Content-Based Filtering using Cosine Similarity between song features
export function getCosineSimilarityRecommendations(
  targetSong: Song,
  allSongs: Song[],
  limit = 5
): Song[] {
  const scoreSong = (s: Song) => {
    if (s.id === targetSong.id) return -1; // skip self
    
    // Dot product of features
    const dotProduct = 
      targetSong.energy * s.energy + 
      targetSong.tempo * s.tempo + 
      targetSong.acousticness * s.acousticness;
      
    // Magnitudes
    const mag1 = Math.sqrt(
      targetSong.energy ** 2 + 
      targetSong.tempo ** 2 + 
      targetSong.acousticness ** 2
    );
    const mag2 = Math.sqrt(
      s.energy ** 2 + 
      s.tempo ** 2 + 
      s.acousticness ** 2
    );
    
    if (mag1 === 0 || mag2 === 0) return 0;
    return dotProduct / (mag1 * mag2);
  };

  return allSongs
    .map(s => ({ song: s, score: scoreSong(s) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.song);
}
