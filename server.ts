import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  initDB,
  saveDB,
  User,
  Song,
  Playlist,
  PlayHistory,
  LikedSong,
  Artist,
  Genre,
  Notification,
  getCosineSimilarityRecommendations,
} from './server/db.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'melodia-secure-super-jwt-secret-key-9921';
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initialize persistent DB
const dbData = initDB();

// Enable JSON parse with larger limits for base64 file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Setup simple CORS-like response headers for security and standard full-stack requests
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('Gemini AI capability initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Gemini Client:', error);
  }
} else {
  console.log('No GEMINI_API_KEY found. Content similarity recommendations will be used as fallback.');
}

// ----------------------------------------------------
// AUTHENTICATION MIDDLEWARE
// ----------------------------------------------------
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'user' | 'admin';
  };
}

function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'Authentication token required.' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err) {
      res.status(403).json({ message: 'Invalid or expired token.' });
      return;
    }
    req.user = decoded;
    next();
  });
}

function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  authenticateToken(req, res, () => {
    if (req.user?.role !== 'admin') {
      res.status(433).json({ message: 'Access denied. Administrator privileges required.' });
      return;
    }
    next();
  });
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. AUTH ROUTES
app.post(['/api/auth/signup', '/api/signup'], async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    res.status(400).json({ message: 'All fields are required.' });
    return;
  }

  const db = initDB();
  const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    res.status(400).json({ message: 'User with this email already exists.' });
    return;
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser: User = {
      id: 'u_' + Math.random().toString(36).substr(2, 9),
      username,
      email: email.toLowerCase(),
      passwordHash,
      role: 'user', // default role
      createdAt: new Date().toISOString(),
      bio: '',
      avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username)}`,
      favoriteGenres: [],
      totalListeningTime: 0,
      followersCount: 124,
      followingCount: 84,
    };

    db.users.push(newUser);
    saveDB(db);

    // Create standard default notification
    const newNotification: Notification = {
      id: 'n_' + Math.random().toString(36).substr(2, 9),
      userId: newUser.id,
      title: 'Welcome to Melodia!',
      message: `Hey ${username}, welcome to your AI cloud music space! Try generating a smart playlist in Library.`,
      type: 'success',
      read: false,
      createdAt: new Date().toISOString(),
    };
    db.notifications.push(newNotification);
    saveDB(db);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
        bio: newUser.bio || '',
        avatarUrl: newUser.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(newUser.username)}`,
        favoriteGenres: newUser.favoriteGenres || [],
        totalListeningTime: newUser.totalListeningTime || 0,
        followersCount: newUser.followersCount || 124,
        followingCount: newUser.followingCount || 84,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during signup.' });
  }
});

app.post(['/api/auth/login', '/api/login'], async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required.' });
    return;
  }

  const db = initDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    res.status(400).json({ message: 'Invalid credentials.' });
    return;
  }

  try {
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ message: 'Invalid credentials.' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt || new Date().toISOString(),
        bio: user.bio || '',
        avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.username)}`,
        favoriteGenres: user.favoriteGenres || [],
        totalListeningTime: user.totalListeningTime || 0,
        followersCount: user.followersCount || 124,
        followingCount: user.followingCount || 84,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login.' });
  }
});

app.get(['/api/auth/me', '/api/me'], authenticateToken, (req: AuthRequest, res: Response) => {
  const db = initDB();
  const user = db.users.find(u => u.id === req.user?.id);
  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt || new Date().toISOString(),
      bio: user.bio || '',
      avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.username)}`,
      favoriteGenres: user.favoriteGenres || [],
      totalListeningTime: user.totalListeningTime || 0,
      followersCount: user.followersCount || 124,
      followingCount: user.followingCount || 84,
    },
  });
});

app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  const db = initDB();
  const user = db.users.find(u => u.email.toLowerCase() === email?.toLowerCase());
  if (!user) {
    res.status(404).json({ message: 'Email not registered.' });
    return;
  }
  // Simulate password reset link
  res.json({ message: 'Password reset instructions have been emailed to you.' });
});

app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    res.status(400).json({ message: 'Required fields missing.' });
    return;
  }
  const db = initDB();
  const userIndex = db.users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  if (userIndex === -1) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    db.users[userIndex].passwordHash = passwordHash;
    saveDB(db);
    res.json({ message: 'Password reset successfully. You can now login.' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password.' });
  }
});

// 1.5 USER PROFILE MANAGEMENT ROUTES
const handleProfileUpdate = (req: AuthRequest, res: Response) => {
  const { username, name, bio, avatarUrl, profilePicture, favoriteGenres } = req.body;
  const db = initDB();
  const user = db.users.find(u => u.id === req.user!.id);
  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }

  const targetUsername = (username || name || '').trim();

  if (targetUsername) {
    const otherUser = db.users.find(u => u.id !== user.id && u.username.toLowerCase() === targetUsername.toLowerCase());
    if (otherUser) {
      res.status(400).json({ message: 'Name/Username is already taken.' });
      return;
    }
    user.username = targetUsername;
  }
  if (bio !== undefined) user.bio = bio;
  
  const targetAvatarUrl = avatarUrl !== undefined ? avatarUrl : profilePicture;
  if (targetAvatarUrl !== undefined) user.avatarUrl = targetAvatarUrl;
  if (favoriteGenres !== undefined) user.favoriteGenres = favoriteGenres;

  saveDB(db);

  const returnedUser = {
    id: user.id,
    username: user.username,
    name: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    bio: user.bio || '',
    avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.username)}`,
    profilePicture: user.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.username)}`,
    favoriteGenres: user.favoriteGenres || [],
    totalListeningTime: user.totalListeningTime || 0,
    followersCount: user.followersCount || 124,
    followingCount: user.followingCount || 84,
  };

  res.json({
    message: 'Profile updated successfully.',
    user: returnedUser
  });
};

app.put('/api/user/profile', authenticateToken, handleProfileUpdate);
app.patch('/api/user/profile', authenticateToken, handleProfileUpdate);
app.put('/api/users/profile', authenticateToken, handleProfileUpdate);
app.patch('/api/users/profile', authenticateToken, handleProfileUpdate);

// Profile Picture Upload Endpoint (integrates with filesystem storage and user profile update)
app.post('/api/user/profile/avatar', authenticateToken, (req: AuthRequest, res: Response) => {
  const { fileName, fileType, fileData } = req.body;

  if (!fileName || !fileType || !fileData) {
    res.status(400).json({ message: 'Missing parameters: fileName, fileType, fileData (Base64).' });
    return;
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const extension = path.extname(fileName).toLowerCase();

  if (!allowedTypes.includes(fileType) && !allowedExtensions.includes(extension)) {
    res.status(400).json({ message: 'Invalid file type. Only JPG, JPEG, PNG and WEBP are accepted.' });
    return;
  }

  try {
    // Strip headers if they exist in the base64 string
    const base64Clean = fileData.replace(/^data:.*?;base64,/, "");
    const buffer = Buffer.from(base64Clean, 'base64');

    // Check size <= 5MB (5 * 1024 * 1024 bytes)
    if (buffer.length > 5 * 1024 * 1024) {
      res.status(400).json({ message: 'File size exceeds 5MB limit.' });
      return;
    }

    const db = initDB();
    const user = db.users.find(u => u.id === req.user!.id);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    // Delete old avatar from local Storage (if it was an uploaded file)
    if (user.avatarUrl && user.avatarUrl.startsWith('/uploads/')) {
      try {
        const oldFileName = path.basename(user.avatarUrl);
        const oldFilePath = path.join(UPLOADS_DIR, oldFileName);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log(`Deleted old avatar from storage: ${oldFilePath}`);
        }
      } catch (err) {
        console.error('Error deleting old avatar file:', err);
      }
    }

    // Save new avatar file
    const safeName = 'avatar_' + user.id + '_' + Date.now() + extension;
    const finalPath = path.join(UPLOADS_DIR, safeName);
    fs.writeFileSync(finalPath, buffer);

    const newUrl = `/uploads/${safeName}`;
    user.avatarUrl = newUrl;
    saveDB(db);

    res.status(200).json({
      success: true,
      url: newUrl,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        bio: user.bio || '',
        avatarUrl: user.avatarUrl,
        favoriteGenres: user.favoriteGenres || [],
        totalListeningTime: user.totalListeningTime || 0,
        followersCount: user.followersCount || 124,
        followingCount: user.followingCount || 84,
      }
    });
  } catch (error) {
    console.error('Error handling avatar upload:', error);
    res.status(500).json({ message: 'Failed to process avatar upload.' });
  }
});

app.put('/api/user/password', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ message: 'Current password and new password are required.' });
    return;
  }

  const db = initDB();
  const user = db.users.find(u => u.id === req.user!.id);
  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }

  try {
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ message: 'Current password is incorrect.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    user.passwordHash = passwordHash;
    saveDB(db);

    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating password.' });
  }
});

app.delete('/api/user/account', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = initDB();
  const userIndex = db.users.findIndex(u => u.id === req.user!.id);
  if (userIndex === -1) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }

  const userId = req.user!.id;

  // Delete user
  db.users.splice(userIndex, 1);

  // Delete user's playlists, liked songs, histories, notifications
  db.playlists = db.playlists.filter(p => p.userId !== userId);
  db.likedSongs = db.likedSongs.filter(l => l.userId !== userId);
  db.histories = db.histories.filter(h => h.userId !== userId);
  db.notifications = db.notifications.filter(n => n.userId !== userId);

  saveDB(db);

  res.json({ message: 'Account deleted successfully.' });
});

app.post('/api/user/listening-time', authenticateToken, (req: AuthRequest, res: Response) => {
  const { seconds } = req.body;
  if (!seconds || isNaN(Number(seconds))) {
    res.status(400).json({ message: 'Valid seconds parameter is required.' });
    return;
  }

  const db = initDB();
  const user = db.users.find(u => u.id === req.user!.id);
  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }

  user.totalListeningTime = (user.totalListeningTime || 0) + Number(seconds);
  saveDB(db);

  res.json({
    message: 'Listening time updated.',
    totalListeningTime: user.totalListeningTime
  });
});

// 2. SONG METADATA & BROWSE ROUTES
app.get('/api/songs', (req: Request, res: Response) => {
  const db = initDB();
  const { search, genre, mood, page, limit } = req.query;

  let filteredSongs = [...db.songs];

  if (search) {
    const searchStr = (search as string).toLowerCase();
    filteredSongs = filteredSongs.filter(
      s =>
        s.title.toLowerCase().includes(searchStr) ||
        s.artist.toLowerCase().includes(searchStr) ||
        s.album.toLowerCase().includes(searchStr)
    );
  }

  if (genre) {
    filteredSongs = filteredSongs.filter(s => s.genre === (genre as string));
  }

  if (mood) {
    filteredSongs = filteredSongs.filter(s => s.mood.toLowerCase() === (mood as string).toLowerCase());
  }

  // Pagination defaults
  const p = parseInt(page as string) || 1;
  const l = parseInt(limit as string) || 20;
  const startIndex = (p - 1) * l;
  const paginatedSongs = filteredSongs.slice(startIndex, startIndex + l);

  res.json({
    songs: paginatedSongs,
    total: filteredSongs.length,
    page: p,
    limit: l,
  });
});

app.get('/api/songs/trending', (req: Request, res: Response) => {
  const db = initDB();
  const trending = [...db.songs].sort((a, b) => b.plays - a.plays).slice(0, 10);
  res.json(trending);
});

app.get('/api/songs/recent', (req: Request, res: Response) => {
  const db = initDB();
  const recent = [...db.songs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);
  res.json(recent);
});

app.get('/api/songs/:id', (req: Request, res: Response) => {
  const db = initDB();
  const song = db.songs.find(s => s.id === req.params.id);
  if (!song) {
    res.status(404).json({ message: 'Song not found.' });
    return;
  }
  res.json(song);
});

// Admin Route: Add Song
app.post('/api/songs', adminOnly, (req: AuthRequest, res: Response) => {
  const { title, artist, album, genre, mood, duration, audioUrl, coverUrl, energy, tempo, acousticness } = req.body;

  if (!title || !artist || !genre || !audioUrl) {
    res.status(400).json({ message: 'Required fields: title, artist, genre, audioUrl.' });
    return;
  }

  const db = initDB();
  const newSong: Song = {
    id: 's_' + Math.random().toString(36).substr(2, 9),
    title,
    artist,
    album: album || 'Single',
    genre,
    mood: mood || 'Calm',
    duration: parseInt(duration) || 180,
    audioUrl,
    coverUrl: coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
    plays: 0,
    likes: 0,
    energy: parseInt(energy) || 5,
    tempo: parseInt(tempo) || 5,
    acousticness: parseInt(acousticness) || 5,
    createdAt: new Date().toISOString(),
  };

  db.songs.push(newSong);
  saveDB(db);

  res.status(201).json(newSong);
});

// Admin Route: Edit Song
app.put('/api/songs/:id', adminOnly, (req: AuthRequest, res: Response) => {
  const db = initDB();
  const songIndex = db.songs.findIndex(s => s.id === req.params.id);

  if (songIndex === -1) {
    res.status(404).json({ message: 'Song not found.' });
    return;
  }

  const updatedSong = {
    ...db.songs[songIndex],
    ...req.body,
    id: db.songs[songIndex].id, // lock ID
  };

  db.songs[songIndex] = updatedSong;
  saveDB(db);

  res.json(updatedSong);
});

// Admin Route: Delete Song
app.delete('/api/songs/:id', adminOnly, (req: AuthRequest, res: Response) => {
  const db = initDB();
  const songIndex = db.songs.findIndex(s => s.id === req.params.id);

  if (songIndex === -1) {
    res.status(404).json({ message: 'Song not found.' });
    return;
  }

  const deleted = db.songs.splice(songIndex, 1);
  saveDB(db);

  res.json({ message: 'Song deleted successfully.', song: deleted[0] });
});

// Record play history & Play Count increment
app.post('/api/songs/:id/play', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = initDB();
  const song = db.songs.find(s => s.id === req.params.id);

  if (!song) {
    res.status(404).json({ message: 'Song not found.' });
    return;
  }

  // Increment play counts
  song.plays = (song.plays || 0) + 1;

  // Add history record
  const newHistory: PlayHistory = {
    id: 'h_' + Math.random().toString(36).substr(2, 9),
    userId: req.user!.id,
    songId: song.id,
    playedAt: new Date().toISOString(),
  };
  db.histories.push(newHistory);
  saveDB(db);

  res.json({ message: 'Playback tracked successfully.', plays: song.plays });
});

// 3. RANGE STREAMING ROUTE
app.get('/api/stream/:id', (req: Request, res: Response) => {
  const db = initDB();
  const song = db.songs.find(s => s.id === req.params.id);

  if (!song) {
    res.status(404).json({ message: 'Audio file not found.' });
    return;
  }

  // If the track is a remote web URL, redirect or stream from URL, otherwise read local upload
  if (song.audioUrl.startsWith('http://') || song.audioUrl.startsWith('https://')) {
    res.redirect(song.audioUrl);
    return;
  }

  // Local uploaded track
  const relativePath = song.audioUrl.replace(/^\/?uploads\//, '');
  const filePath = path.join(UPLOADS_DIR, relativePath);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ message: 'Local audio source file is missing.' });
    return;
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
      return;
    }

    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'audio/mpeg',
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'audio/mpeg',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// 4. PLAYLISTS ROUTES
app.get('/api/playlists', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = initDB();
  // Fetch user playlists and public playlists
  const playlists = db.playlists.filter(
    p => p.userId === req.user!.id || p.isPublic
  );
  res.json(playlists);
});

app.get('/api/playlists/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = initDB();
  const playlist = db.playlists.find(p => p.id === req.params.id);

  if (!playlist) {
    res.status(404).json({ message: 'Playlist not found.' });
    return;
  }

  if (!playlist.isPublic && playlist.userId !== req.user!.id) {
    res.status(403).json({ message: 'This playlist is private.' });
    return;
  }

  // Populate actual songs
  const songs = playlist.songIds
    .map(sid => db.songs.find(s => s.id === sid))
    .filter((s): s is Song => !!s);

  res.json({
    ...playlist,
    songs,
  });
});

app.post('/api/playlists', authenticateToken, (req: AuthRequest, res: Response) => {
  const { name, description, coverUrl, isPublic, songIds } = req.body;

  if (!name) {
    res.status(400).json({ message: 'Playlist name is required.' });
    return;
  }

  const db = initDB();
  const newPlaylist: Playlist = {
    id: 'p_' + Math.random().toString(36).substr(2, 9),
    name,
    description: description || '',
    userId: req.user!.id,
    songIds: songIds || [],
    coverUrl: coverUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80',
    isPublic: isPublic !== undefined ? isPublic : true,
    createdAt: new Date().toISOString(),
  };

  db.playlists.push(newPlaylist);
  saveDB(db);

  res.status(201).json(newPlaylist);
});

app.put('/api/playlists/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = initDB();
  const playlistIndex = db.playlists.findIndex(p => p.id === req.params.id);

  if (playlistIndex === -1) {
    res.status(404).json({ message: 'Playlist not found.' });
    return;
  }

  if (db.playlists[playlistIndex].userId !== req.user!.id) {
    res.status(403).json({ message: 'Access denied. You do not own this playlist.' });
    return;
  }

  const updated = {
    ...db.playlists[playlistIndex],
    ...req.body,
    id: db.playlists[playlistIndex].id, // lock ID
    userId: db.playlists[playlistIndex].userId, // lock User ID
  };

  db.playlists[playlistIndex] = updated;
  saveDB(db);

  res.json(updated);
});

app.delete('/api/playlists/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = initDB();
  const playlistIndex = db.playlists.findIndex(p => p.id === req.params.id);

  if (playlistIndex === -1) {
    res.status(404).json({ message: 'Playlist not found.' });
    return;
  }

  if (db.playlists[playlistIndex].userId !== req.user!.id) {
    res.status(403).json({ message: 'Access denied.' });
    return;
  }

  db.playlists.splice(playlistIndex, 1);
  saveDB(db);

  res.json({ message: 'Playlist deleted successfully.' });
});

// Add Song to Playlist
app.post('/api/playlists/:id/songs', authenticateToken, (req: AuthRequest, res: Response) => {
  const { songId } = req.body;
  if (!songId) {
    res.status(400).json({ message: 'SongId is required.' });
    return;
  }

  const db = initDB();
  const playlist = db.playlists.find(p => p.id === req.params.id);

  if (!playlist) {
    res.status(404).json({ message: 'Playlist not found.' });
    return;
  }

  if (playlist.userId !== req.user!.id) {
    res.status(403).json({ message: 'Access denied.' });
    return;
  }

  if (!playlist.songIds.includes(songId)) {
    playlist.songIds.push(songId);
    saveDB(db);
  }

  res.json(playlist);
});

// Alias Add Song to Playlist
app.post('/api/playlists/:id/add-song', authenticateToken, (req: AuthRequest, res: Response) => {
  const { songId } = req.body;
  if (!songId) {
    res.status(400).json({ message: 'SongId is required.' });
    return;
  }

  const db = initDB();
  const playlist = db.playlists.find(p => p.id === req.params.id);

  if (!playlist) {
    res.status(404).json({ message: 'Playlist not found.' });
    return;
  }

  if (playlist.userId !== req.user!.id) {
    res.status(403).json({ message: 'Access denied.' });
    return;
  }

  if (!playlist.songIds.includes(songId)) {
    playlist.songIds.push(songId);
    saveDB(db);
  }

  res.json(playlist);
});

// Remove Song from Playlist
app.delete('/api/playlists/:id/songs/:songId', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = initDB();
  const playlist = db.playlists.find(p => p.id === req.params.id);

  if (!playlist) {
    res.status(404).json({ message: 'Playlist not found.' });
    return;
  }

  if (playlist.userId !== req.user!.id) {
    res.status(403).json({ message: 'Access denied.' });
    return;
  }

  playlist.songIds = playlist.songIds.filter(id => id !== req.params.songId);
  saveDB(db);

  res.json(playlist);
});

// GET /api/playlists/user
app.get('/api/playlists/user', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = initDB();
  const playlists = db.playlists.filter(p => p.userId === req.user!.id);
  res.json(playlists);
});

// POST /api/playlists/:id/add-song
app.post('/api/playlists/:id/add-song', authenticateToken, (req: AuthRequest, res: Response) => {
  const { songId } = req.body;
  if (!songId) {
    res.status(400).json({ message: 'SongId is required.' });
    return;
  }

  const db = initDB();
  const playlist = db.playlists.find(p => p.id === req.params.id);

  if (!playlist) {
    res.status(404).json({ message: 'Playlist not found.' });
    return;
  }

  if (playlist.userId !== req.user!.id) {
    res.status(403).json({ message: 'Access denied.' });
    return;
  }

  if (!playlist.songIds.includes(songId)) {
    playlist.songIds.push(songId);
    saveDB(db);
  }

  // Populate actual songs
  const songs = playlist.songIds
    .map(sid => db.songs.find(s => s.id === sid))
    .filter((s): s is Song => !!s);

  res.json({
    ...playlist,
    songs,
  });
});

// DELETE /api/playlists/:id/remove-song/:songId
app.delete('/api/playlists/:id/remove-song/:songId', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = initDB();
  const playlist = db.playlists.find(p => p.id === req.params.id);

  if (!playlist) {
    res.status(404).json({ message: 'Playlist not found.' });
    return;
  }

  if (playlist.userId !== req.user!.id) {
    res.status(403).json({ message: 'Access denied.' });
    return;
  }

  playlist.songIds = playlist.songIds.filter(id => id !== req.params.songId);
  saveDB(db);

  // Populate actual songs
  const songs = playlist.songIds
    .map(sid => db.songs.find(s => s.id === sid))
    .filter((s): s is Song => !!s);

  res.json({
    ...playlist,
    songs,
  });
});

// 5. LIKES AND FAVORITES
app.post(['/api/songs/:songId/like', '/api/songs/:id/like'], authenticateToken, (req: AuthRequest, res: Response) => {
  const db = initDB();
  const songId = req.params.songId || req.params.id;
  const song = db.songs.find(s => s.id === songId);

  if (!song) {
    res.status(404).json({ message: 'Song not found.' });
    return;
  }

  const alreadyLiked = db.likedSongs.some(
    l => l.userId === req.user!.id && l.songId === song.id
  );

  if (!alreadyLiked) {
    db.likedSongs.push({
      id: 'l_' + Math.random().toString(36).substring(2, 11),
      userId: req.user!.id,
      songId: song.id,
      likedAt: new Date().toISOString(),
    });
    song.likes = (song.likes || 0) + 1;
    saveDB(db);
  }

  res.json({ liked: true, likesCount: song.likes });
});

app.delete(['/api/songs/:songId/like', '/api/songs/:id/like'], authenticateToken, (req: AuthRequest, res: Response) => {
  const db = initDB();
  const songId = req.params.songId || req.params.id;
  const song = db.songs.find(s => s.id === songId);

  if (!song) {
    res.status(404).json({ message: 'Song not found.' });
    return;
  }

  db.likedSongs = db.likedSongs.filter(
    l => !(l.userId === req.user!.id && l.songId === song.id)
  );

  song.likes = Math.max(0, (song.likes || 1) - 1);
  saveDB(db);

  res.json({ liked: false, likesCount: song.likes });
});

// Retrieve user liked songs
app.get(['/api/users/liked-songs', '/api/library/liked', '/api/likes'], authenticateToken, (req: AuthRequest, res: Response) => {
  const db = initDB();
  const userLikes = db.likedSongs.filter(l => l.userId === req.user!.id);
  const likedSongs = userLikes
    .map(l => db.songs.find(s => s.id === l.songId))
    .filter((s): s is Song => !!s);

  res.json(likedSongs);
});

// Retrieve User History
app.get(['/api/library/history', '/api/history'], authenticateToken, (req: AuthRequest, res: Response) => {
  const db = initDB();
  const userHistory = db.histories
    .filter(h => h.userId === req.user!.id)
    .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());

  const historySongs = userHistory
    .map(h => {
      const song = db.songs.find(s => s.id === h.songId);
      if (song) {
        return {
          ...song,
          playedAt: h.playedAt,
        };
      }
      return null;
    })
    .filter(s => !!s);

  res.json(historySongs);
});

// Add POST /api/history to record playback history
app.post('/api/history', authenticateToken, (req: AuthRequest, res: Response) => {
  const { songId } = req.body;
  if (!songId) {
    res.status(400).json({ message: 'SongId is required.' });
    return;
  }

  const db = initDB();
  const song = db.songs.find(s => s.id === songId);
  if (!song) {
    res.status(404).json({ message: 'Song not found.' });
    return;
  }

  // Increment play counts
  song.plays = (song.plays || 0) + 1;

  // Add history record
  const newHistory: PlayHistory = {
    id: 'h_' + Math.random().toString(36).substr(2, 9),
    userId: req.user!.id,
    songId: song.id,
    playedAt: new Date().toISOString(),
  };
  db.histories.push(newHistory);
  saveDB(db);

  res.json({ message: 'Playback tracked successfully.', plays: song.plays });
});

// 6. AI SMART RECOMMENDATION & CURATION
app.post('/api/ai/recommend', authenticateToken, async (req: AuthRequest, res: Response) => {
  const db = initDB();
  const userLikes = db.likedSongs.filter(l => l.userId === req.user!.id);
  const userHistory = db.histories.filter(h => h.userId === req.user!.id);

  if (db.songs.length === 0) {
    res.status(400).json({ message: 'No songs available in database to recommend.' });
    return;
  }

  // Standard recommendation logic (Content-Based Cosine Similarity)
  let baseSong = db.songs[0];
  if (userLikes.length > 0) {
    const favoriteSongId = userLikes[userLikes.length - 1].songId;
    baseSong = db.songs.find(s => s.id === favoriteSongId) || baseSong;
  } else if (userHistory.length > 0) {
    const lastPlayedId = userHistory[userHistory.length - 1].songId;
    baseSong = db.songs.find(s => s.id === lastPlayedId) || baseSong;
  }

  const recommendations = getCosineSimilarityRecommendations(baseSong, db.songs, 5);
  const recommendedIds = recommendations.map(s => s.id);

  let commentary = "Our matching algorithms detected strong resonances with your acoustic and electronic interests. We curated this custom sound palette for your journey.";

  // If Gemini client is running, use it to craft extremely personal commentary
  if (ai) {
    try {
      const prompt = `You are Melodia's advanced AI Resident Curator. The user has liked tracks from artists like "${baseSong.artist}" (Genre: ${baseSong.genre}, Mood: ${baseSong.mood}). 
      We've computed custom recommendations including titles like ${recommendations.map(s => `"${s.title}"`).join(', ')}. 
      Generate a concise, professional, highly evocative and tailored 2-sentence curator's review (commentary) explaining the mood and synergy of this custom set. Keep it under 60 words and style it like a boutique audiophile streaming platform.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
      });

      if (response.text) {
        commentary = response.text.trim();
      }
    } catch (err) {
      console.error('Gemini content generation failed, using standard fallback.', err);
    }
  }

  // Automatically save this AI Smart Playlist inside the DB for the user!
  const newSmartPlaylist: Playlist = {
    id: 'p_ai_' + Math.random().toString(36).substr(2, 9),
    name: 'AI Curated: ' + baseSong.mood + ' Resonance',
    description: commentary,
    userId: req.user!.id,
    songIds: recommendedIds,
    coverUrl: 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300&auto=format&fit=crop&q=80',
    isPublic: false,
    isAISmart: true,
    createdAt: new Date().toISOString(),
  };

  db.playlists.push(newSmartPlaylist);

  // Send an internal real-time notification to the user about the custom curation!
  db.notifications.push({
    id: 'n_' + Math.random().toString(36).substr(2, 9),
    userId: req.user!.id,
    title: 'New AI Playlist Curation',
    message: `Curator synthesized a bespoke smart playlist based on your affinity to "${baseSong.title}".`,
    type: 'ai',
    read: false,
    createdAt: new Date().toISOString(),
  });

  saveDB(db);

  res.status(201).json({
    playlist: newSmartPlaylist,
    songs: recommendations,
    commentary,
  });
});

app.post('/api/ai/generate-playlist', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { mood, tempo, namePreset } = req.body;
  const db = initDB();
  const userId = req.user!.id;

  const user = db.users.find(u => u.id === userId);
  const userLikes = db.likedSongs.filter(l => l.userId === userId);
  const userHistory = db.histories.filter(h => h.userId === userId);

  if (db.songs.length === 0) {
    res.status(400).json({ message: 'No songs available in the database to generate a playlist.' });
    return;
  }

  const likedSongs = userLikes.map(l => db.songs.find(s => s.id === l.songId)).filter((s): s is Song => !!s);
  const historySongs = userHistory.map(h => db.songs.find(s => s.id === h.songId)).filter((s): s is Song => !!s);

  const favGenres = new Set<string>(user?.favoriteGenres || []);
  likedSongs.forEach(s => favGenres.add(s.genre));
  historySongs.slice(0, 10).forEach(s => favGenres.add(s.genre));

  const favArtists = new Set<string>();
  likedSongs.forEach(s => favArtists.add(s.artist));
  historySongs.slice(0, 10).forEach(s => favArtists.add(s.artist));

  let avgTempo = 5;
  let avgEnergy = 5;
  if (likedSongs.length > 0) {
    avgTempo = likedSongs.reduce((sum, s) => sum + (s.tempo || 5), 0) / likedSongs.length;
    avgEnergy = likedSongs.reduce((sum, s) => sum + (s.energy || 5), 0) / likedSongs.length;
  }

  const allSongs = [...db.songs];
  let selectedSongIds: string[] = [];
  let playlistName = '';
  let playlistDesc = '';

  const presets = [
    'Your Mood Mix',
    'Top Picks For You',
    'Coding Beats',
    'Late Night Vibes',
    'Weekend Mix',
    'Chill Sessions'
  ];

  let successUsingAI = false;
  if (ai) {
    try {
      const songsSummary = allSongs.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        genre: s.genre,
        mood: s.mood,
        tempo: s.tempo,
        energy: s.energy,
        plays: s.plays
      }));

      const prompt = `You are Melodia's brilliant AI Resident Music Curator & Recommendation Engine.
We need you to generate a personalized smart playlist for a user.

### USER LISTENING PROFILE:
- Favorite Genres: ${Array.from(favGenres).join(', ') || 'Various'}
- Favorite Artists: ${Array.from(favArtists).slice(0, 5).join(', ') || 'Various'}
- Number of Liked Tracks: ${likedSongs.length}
- Recent Played Tracks: ${historySongs.slice(0, 5).map(s => `${s.title} by ${s.artist}`).join(', ') || 'None yet'}
- Requested Mood constraint: ${mood || 'Any'}
- Requested Tempo constraint: ${tempo || 'Any'}

### AVAILABLE SONGS IN OUR CATALOG (JSON):
${JSON.stringify(songsSummary, null, 2)}

### INSTRUCTIONS:
1. Select between 3 and 10 song IDs from the available catalog that best fit the user's profile and requested mood/tempo.
2. Select or generate a playlist name from these options, or customize one in a similar tone: ${presets.join(', ')}.
3. Write an evocative, tailored, 2-sentence description ( boutique audiophile streaming platform curator voice).
4. Return ONLY a valid JSON object matching this schema:
{
  "name": "Playlist Name",
  "description": "2-sentence boutique description",
  "songIds": ["id1", "id2", "..."]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      if (response.text) {
        const result = JSON.parse(response.text.trim());
        if (result.name && Array.isArray(result.songIds) && result.songIds.length > 0) {
          playlistName = result.name;
          playlistDesc = result.description || 'Customized smart playlist synthetically aligned to your taste.';
          selectedSongIds = result.songIds.filter((id: string) => allSongs.some(s => s.id === id));
          if (selectedSongIds.length > 0) {
            successUsingAI = true;
          }
        }
      }
    } catch (err) {
      console.error('Gemini Smart Playlist generation failed, falling back to algorithm:', err);
    }
  }

  if (!successUsingAI) {
    const scoredSongs = allSongs.map(song => {
      let score = 0;

      if (favGenres.has(song.genre)) {
        score += 3;
      }
      if (mood && song.mood.toLowerCase() === mood.toLowerCase()) {
        score += 4;
      }

      if (favArtists.has(song.artist)) {
        score += 3;
      }

      if (likedSongs.some(ls => ls.id === song.id)) {
        score += 1.5;
      }
      if (historySongs.some(hs => hs.id === song.id)) {
        score += 1.0;
      }

      const playsBoost = Math.min(2, (song.plays || 0) / 15000);
      score += playsBoost;

      const tempoDiff = Math.abs((song.tempo || 5) - avgTempo);
      score += (10 - tempoDiff) / 2;

      const energyDiff = Math.abs((song.energy || 5) - avgEnergy);
      score += (10 - energyDiff) / 2;

      return { song, score };
    });

    const topScored = scoredSongs
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.song);

    selectedSongIds = topScored.map(s => s.id);

    const presetIndex = Math.floor(Math.random() * presets.length);
    playlistName = namePreset || presets[presetIndex];
    playlistDesc = `We analyzed ${likedSongs.length} liked songs, your recently played tracks, and your favorite artists to synthesize this boutique mix. Optimized for ${mood || 'relaxed focus'} tempo.`;
  }

  const generatedPlaylist: Playlist = {
    id: 'p_ai_' + Math.random().toString(36).substr(2, 9),
    name: playlistName,
    description: playlistDesc,
    userId: userId,
    songIds: selectedSongIds,
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80',
    isPublic: false,
    isAISmart: true,
    createdAt: new Date().toISOString()
  };

  db.playlists.push(generatedPlaylist);

  db.notifications.push({
    id: 'n_' + Math.random().toString(36).substr(2, 9),
    userId: userId,
    title: ' Bespoke smart playlist synthesized!',
    message: `Generated "${playlistName}" containing ${selectedSongIds.length} tracks custom-curated for you.`,
    type: 'ai',
    read: false,
    createdAt: new Date().toISOString()
  });

  saveDB(db);

  const populatedSongs = selectedSongIds
    .map(sid => db.songs.find(s => s.id === sid))
    .filter((s): s is Song => !!s);

  res.status(201).json({
    playlist: generatedPlaylist,
    songs: populatedSongs
  });
});

// 7. FILE UPLOADS (Local Files saved as Base64 payload safely and robustly)
app.post('/api/upload', authenticateToken, (req: AuthRequest, res: Response) => {
  const { fileName, fileType, fileData } = req.body;

  if (!fileName || !fileType || !fileData) {
    res.status(400).json({ message: 'Missing parameters: fileName, fileType, fileData (Base64).' });
    return;
  }

  try {
    // Strip headers if they exist in the base64 string
    const base64Clean = fileData.replace(/^data:.*?;base64,/, "");
    const buffer = Buffer.from(base64Clean, 'base64');

    // Secure file extension
    const extension = path.extname(fileName).toLowerCase();
    const safeName = 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5) + extension;
    const finalPath = path.join(UPLOADS_DIR, safeName);

    fs.writeFileSync(finalPath, buffer);

    // Return the URL
    const url = `/uploads/${safeName}`;
    res.status(201).json({ url, success: true });
  } catch (error) {
    console.error('Error handling upload:', error);
    res.status(500).json({ message: 'Failed to write uploaded file.' });
  }
});

// 8. GENRES & ARTISTS
app.get('/api/genres', (req: Request, res: Response) => {
  const db = initDB();
  res.json(db.genres);
});

app.get('/api/artists', (req: Request, res: Response) => {
  const db = initDB();
  res.json(db.artists);
});

app.get('/api/artists/:id', (req: Request, res: Response) => {
  const db = initDB();
  const artist = db.artists.find(a => a.id === req.params.id);
  if (!artist) {
    res.status(404).json({ message: 'Artist not found.' });
    return;
  }
  res.json(artist);
});

// 9. PROFILE & SYSTEM ANALYTICS (Analytics)
app.get('/api/profile/stats', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = initDB();
  const userLikes = db.likedSongs.filter(l => l.userId === req.user!.id).length;
  const userHistoryCount = db.histories.filter(h => h.userId === req.user!.id).length;
  const userPlaylistsCount = db.playlists.filter(p => p.userId === req.user!.id).length;

  res.json({
    likesCount: userLikes,
    historyCount: userHistoryCount,
    playlistsCount: userPlaylistsCount,
    totalStorageCapacity: 'Unlimited AI Cloud',
  });
});

app.get('/api/admin/analytics', adminOnly, (req: AuthRequest, res: Response) => {
  const db = initDB();
  const totalUsers = db.users.length;
  const totalSongs = db.songs.length;
  const totalPlaylists = db.playlists.length;
  const totalPlays = db.songs.reduce((acc, song) => acc + (song.plays || 0), 0);

  // Computed distributions
  const genreBreakdown: { [key: string]: number } = {};
  db.songs.forEach(s => {
    genreBreakdown[s.genre] = (genreBreakdown[s.genre] || 0) + 1;
  });

  res.json({
    totalUsers,
    totalSongs,
    totalPlaylists,
    totalPlays,
    genreBreakdown,
  });
});

// Retrieve User notifications
app.get('/api/notifications', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = initDB();
  const userNotifications = db.notifications
    .filter(n => n.userId === req.user!.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(userNotifications);
});

app.post(['/api/notifications/read', '/api/notifications/:id/read'], authenticateToken, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = initDB();
  if (id) {
    const notification = db.notifications.find(n => n.id === id && n.userId === req.user!.id);
    if (notification) {
      notification.read = true;
    }
  } else {
    // Mark all as read
    db.notifications.forEach(n => {
      if (n.userId === req.user!.id) {
        n.read = true;
      }
    });
  }
  saveDB(db);
  res.json({ success: true });
});

// ----------------------------------------------------
// VITE OR STATIC FRONTEND SERVING
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Mount Vite middleware in development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted successfully.');
  } else {
    // Serve production built files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static paths mounted.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Melodia streaming platform running on http://localhost:${PORT}`);
  });
}

startServer();
