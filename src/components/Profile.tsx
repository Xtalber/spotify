import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Song, Playlist, Genre } from '../types';
import {
  User as UserIcon, Camera, Key, Trash2, LogOut, Heart, Music, Clock,
  Edit2, Check, Sparkles, ArrowLeft, Upload, Loader2, AlertCircle, Play, Pause
} from 'lucide-react';

interface ProfileProps {
  user: User | null;
  setUser: (user: User | null) => void;
  userPlaylists: Playlist[];
  playHistory: any[];
  songs: Song[];
  genres: Genre[];
  onLogout: () => void;
  onPlaySong: (song: Song) => void;
  onBack: () => void;
  triggerToast?: (title: string, message: string, type: 'success' | 'alert' | 'ai') => void;
  refreshUserData?: () => void;
  setCurrentTab?: (tab: string) => void;
  likedSongIds: string[];
  currentSong?: Song | null;
  isPlaying?: boolean;
}

export default function Profile({
  user,
  setUser,
  userPlaylists,
  playHistory,
  songs,
  genres,
  onLogout,
  onPlaySong,
  onBack,
  triggerToast,
  refreshUserData,
  setCurrentTab,
  likedSongIds = [],
  currentSong,
  isPlaying,
}: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit profile form state
  const [editUsername, setEditUsername] = useState(user?.username || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState(user?.avatarUrl || '');
  const [editFavGenres, setEditFavGenres] = useState<string[]>(user?.favoriteGenres || []);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  const hasChanges =
    editUsername.trim() !== (user?.username || '') ||
    editBio.trim() !== (user?.bio || '') ||
    editAvatarUrl.trim() !== (user?.avatarUrl || '') ||
    JSON.stringify([...editFavGenres].sort()) !== JSON.stringify([...(user?.favoriteGenres || [])].sort());

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // Delete account input
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Image Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-white min-h-[50vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 rounded-2xl max-w-sm text-center border border-white/5"
        >
          <UserIcon className="w-12 h-12 text-brand-violet mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-bold mb-2">No Active Session</h2>
          <p className="text-sm text-white/60">Please register or log in to access your custom audiophile profile.</p>
        </motion.div>
      </div>
    );
  }

  // Format date
  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown';

  // Format listening time
  const formatListeningTime = (seconds?: number) => {
    const totalSecs = seconds || 0;
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Avatar presets
  const avatarPresets = [
    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.username)}`,
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  ];

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');

    // Input Validation
    if (!editUsername || editUsername.trim().length < 3) {
      const errMsg = 'Name must be at least 3 characters long.';
      setEditError(errMsg);
      if (triggerToast) triggerToast('Validation Error', errMsg, 'alert');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('melodia_token')}`,
        },
        body: JSON.stringify({
          name: editUsername.trim(),
          bio: editBio.trim(),
          profilePicture: editAvatarUrl.trim(),
          favoriteGenres: editFavGenres,
        }),
      });

      const data = await response.json();
      if (response.ok && data.user) {
        setUser(data.user);
        setEditSuccess('Profile updated successfully.');
        if (triggerToast) {
          triggerToast('Success', 'Profile updated successfully.', 'success');
        }
        if (refreshUserData) {
          refreshUserData();
        }
        setTimeout(() => {
          setIsEditing(false);
          setEditSuccess('');
        }, 1200);
      } else {
        const errMsg = data.message || 'Failed to update profile.';
        setEditError(errMsg);
        if (triggerToast) triggerToast('Update Failed', errMsg, 'alert');
      }
    } catch (err) {
      const errMsg = 'Network error. Please try again.';
      setEditError(errMsg);
      if (triggerToast) triggerToast('Network Error', errMsg, 'alert');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('melodia_token')}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setPassSuccess('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setIsChangingPassword(false);
          setPassSuccess('');
        }, 1500);
      } else {
        setPassError(data.message || 'Failed to change password.');
      }
    } catch (err) {
      setPassError('Network error. Please try again.');
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');

    if (deleteInput !== 'DELETE') {
      setDeleteError('Please type "DELETE" to confirm.');
      return;
    }

    try {
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('melodia_token')}`,
        },
      });

      if (response.ok) {
        onLogout();
      } else {
        const data = await response.json();
        setDeleteError(data.message || 'Failed to delete account.');
      }
    } catch (err) {
      setDeleteError('Network error. Please try again.');
    }
  };

  const toggleGenre = (genreName: string) => {
    if (editFavGenres.includes(genreName)) {
      setEditFavGenres(editFavGenres.filter(g => g !== genreName));
    } else {
      setEditFavGenres([...editFavGenres, genreName]);
    }
  };

  // Profile Image Selection & Upload Flow
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    setUploadSuccess('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (< 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('File size exceeds the 5MB maximum limit.');
      return;
    }

    // Validate type (JPG, JPEG, PNG, WEBP)
    const allowedExtensions = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedExtensions.includes(file.type.toLowerCase()) && 
        !['.jpg', '.jpeg', '.png', '.webp'].some(ext => file.name.toLowerCase().endsWith(ext))) {
      setUploadError('Invalid file type. Only JPG, JPEG, PNG and WEBP are accepted.');
      return;
    }

    setSelectedFile(file);

    // Read local file preview URL
    const reader = new FileReader();
    reader.onload = () => {
      setUploadPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    setUploadPreview(null);
    setUploadProgress(null);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAvatarUpload = () => {
    if (!selectedFile || !uploadPreview) return;

    setUploadError('');
    setUploadProgress(0);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/user/profile/avatar', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('melodia_token')}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      setUploadProgress(null);
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const res = JSON.parse(xhr.responseText);
          setUser(res.user);
          setUploadSuccess('Profile picture updated!');
          setSelectedFile(null);
          setUploadPreview(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          setTimeout(() => setUploadSuccess(''), 2000);
        } catch (e) {
          setUploadError('Invalid response received from the server.');
        }
      } else {
        try {
          const res = JSON.parse(xhr.responseText);
          setUploadError(res.message || 'Failed to upload profile picture.');
        } catch (e) {
          setUploadError(`Server returned error code: ${xhr.status}`);
        }
      }
    };

    xhr.onerror = () => {
      setUploadProgress(null);
      setUploadError('Network connection failed. Please check your network.');
    };

    xhr.send(JSON.stringify({
      fileName: selectedFile.name,
      fileType: selectedFile.type,
      fileData: uploadPreview
    }));
  };

  return (
    <div className="space-y-8 text-white">
      {/* Sticky Top Header Navigation bar */}
      <div className="sticky top-0 z-30 bg-[#050508]/80 backdrop-blur-md py-4 border-b border-white/5 -mx-4 md:-mx-8 px-4 md:px-8 flex items-center justify-between mb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/60 hover:text-white font-medium transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back</span>
        </button>
        <span className="text-xs font-mono text-white/30 tracking-widest uppercase">My Profile</span>
      </div>

      {/* Main Profile Grid: Premium responsive 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column (User Card & Direct Settings Actions) - stacks nicely on tablet/mobile */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 rounded-3xl border border-white/5 relative overflow-hidden shadow-2xl">
            {/* Ambient glows inside card */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-violet/10 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-magenta/5 blur-2xl rounded-full pointer-events-none" />

            <div className="flex flex-col items-center text-center space-y-4">
              {/* Profile Avatar Holder with Hover overlay */}
              <div className="relative group shrink-0">
                <motion.div 
                  className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-white/10 group-hover:border-brand-violet/60 transition-colors shadow-lg relative bg-[#12121a] flex items-center justify-center"
                  whileHover={{ scale: 1.02 }}
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.username}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserIcon className="w-12 h-12 text-white/20" />
                  )}

                  {/* Hover Camera icon to trigger file picker */}
                  <button
                    onClick={triggerFileSelect}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-200 text-white gap-1 cursor-pointer"
                    title="Change Profile Picture"
                  >
                    <Camera className="w-6 h-6 text-brand-violet animate-pulse" />
                    <span className="text-[10px] font-mono tracking-wide uppercase">Upload</span>
                  </button>
                </motion.div>
                
                {/* Hidden File input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  className="hidden"
                />
              </div>

              {/* Uploading Progress State Card */}
              <AnimatePresence>
                {uploadPreview && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="w-full bg-white/5 border border-white/5 p-3 rounded-xl space-y-3"
                  >
                    <p className="text-xs text-white/80 font-semibold font-mono">Upload Selected Image?</p>
                    <div className="flex items-center justify-center gap-3">
                      <img src={uploadPreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                      <div className="flex-1 text-left">
                        <p className="text-[10px] text-white/40 font-mono truncate">{selectedFile?.name}</p>
                        <p className="text-[10px] text-white/60">{(selectedFile!.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>

                    {uploadProgress !== null && (
                      <div className="space-y-1">
                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-brand-violet h-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-[9px] font-mono text-brand-cyan text-right">Uploading... {uploadProgress}%</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={cancelUpload}
                        disabled={uploadProgress !== null}
                        className="px-3 py-1.5 rounded-lg text-[10px] bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAvatarUpload}
                        disabled={uploadProgress !== null}
                        className="px-3 py-1.5 rounded-lg text-[10px] bg-gradient-to-r from-brand-violet to-brand-magenta text-white font-bold transition-transform hover:scale-105 active:scale-95 flex items-center gap-1 cursor-pointer"
                      >
                        {uploadProgress !== null ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        Confirm
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Status notifications for uploads */}
              {uploadError && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-300 text-[11px] rounded-xl flex items-center gap-2 w-full">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="text-left font-sans">{uploadError}</span>
                </div>
              )}
              {uploadSuccess && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] rounded-xl flex items-center gap-2 w-full">
                  <Check className="w-4 h-4 shrink-0" />
                  <span className="text-left font-sans">{uploadSuccess}</span>
                </div>
              )}

              {/* Name Details */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-2.5 flex-wrap">
                  <h1 className="font-display font-bold text-2xl tracking-tight text-white">{user.username}</h1>
                  <span className="px-2.5 py-0.5 text-[9px] font-mono tracking-wider uppercase bg-brand-violet/20 border border-brand-violet/30 text-brand-violet rounded-full">
                    {user.role}
                  </span>
                </div>
                <p className="text-white/40 text-xs font-mono">{user.email}</p>
                <p className="text-xs text-white/40 pt-1 font-mono">Member since {joinDate}</p>
              </div>

              {/* Bio Block */}
              <p className="text-xs text-white/70 italic bg-white/2 border border-white/5 p-3.5 rounded-2xl w-full text-center leading-relaxed">
                {user.bio || "No biography provided yet. Express your musical identity here."}
              </p>

              {/* Followers count row */}
              <div className="flex items-center gap-8 justify-center w-full pt-1">
                <div className="text-center">
                  <span className="block font-display font-bold text-base text-white">{user.followersCount || 124}</span>
                  <span className="text-[9px] text-white/40 font-mono uppercase tracking-widest">Followers</span>
                </div>
                <div className="text-center border-l border-white/5 pl-8">
                  <span className="block font-display font-bold text-base text-white">{user.followingCount || 84}</span>
                  <span className="text-[9px] text-white/40 font-mono uppercase tracking-widest">Following</span>
                </div>
              </div>

              {/* Sidebar Action Buttons inside Left Column */}
              <div className="flex flex-col gap-2.5 w-full pt-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (setCurrentTab) {
                      setCurrentTab('profile/edit');
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-violet to-brand-magenta text-xs font-semibold hover:opacity-95 transition-all shadow-md shadow-brand-violet/20 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Profile Card
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsChangingPassword(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5 text-white/55" />
                  Change Password
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/5 hover:bg-red-500/15 border border-red-500/10 text-red-400 hover:text-red-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500/70" />
                  Delete Account
                </motion.button>
              </div>

            </div>
          </div>
        </div>

        {/* Right Column (Insights Grid, Genres, and Recently Played) - stacks beautifully */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Listening Insights Cards */}
          <div className="space-y-4">
            <h2 className="text-lg font-display font-bold tracking-tight text-white flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-brand-violet" />
              Acoustic Analytics
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <motion.div 
                className="glass-card p-4.5 rounded-2xl flex items-center gap-3.5 border border-white/5 shadow-lg"
                whileHover={{ y: -3 }}
              >
                <div className="p-2.5 rounded-xl bg-brand-violet/10 border border-brand-violet/20 text-brand-violet">
                  <Music className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="block text-[9px] font-mono text-white/40 uppercase tracking-widest">Playlists</span>
                  <span className="font-display font-bold text-xl text-white">{userPlaylists.length}</span>
                </div>
              </motion.div>

              <motion.div 
                className="glass-card p-4.5 rounded-2xl flex items-center gap-3.5 border border-white/5 shadow-lg"
                whileHover={{ y: -3 }}
              >
                <div className="p-2.5 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan">
                  <Clock className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="block text-[9px] font-mono text-white/40 uppercase tracking-widest">Air Time</span>
                  <span className="font-display font-bold text-xl text-white">{formatListeningTime(user.totalListeningTime)}</span>
                </div>
              </motion.div>

              <motion.div 
                className="glass-card p-4.5 rounded-2xl flex items-center gap-3.5 border border-white/5 shadow-lg col-span-2 md:col-span-1"
                whileHover={{ y: -3 }}
              >
                <div className="p-2.5 rounded-xl bg-brand-magenta/10 border border-brand-magenta/20 text-brand-magenta">
                  <Heart className="w-4.5 h-4.5 fill-brand-magenta" />
                </div>
                <div>
                  <span className="block text-[9px] font-mono text-white/40 uppercase tracking-widest">Liked Tracks</span>
                  <span className="font-display font-bold text-xl text-white">{likedSongIds.length}</span>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Favorite Genres Displays */}
          <div className="glass-card p-5.5 rounded-2xl border border-white/5 space-y-3 shadow-lg">
            <h3 className="font-semibold text-white/80 text-xs font-mono tracking-widest uppercase">My Favorite Genres</h3>
            {user.favoriteGenres && user.favoriteGenres.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {user.favoriteGenres.map((g, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 text-xs font-medium bg-brand-violet/10 border border-brand-violet/20 rounded-full text-white/95"
                  >
                    {g}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/40 italic">No custom genres assigned. Click Edit Profile below to set yours.</p>
            )}
          </div>

          {/* Recently Played / History Column */}
          <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-5 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-display font-bold tracking-tight text-white flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-brand-violet" />
                Recently Tracked Stream
              </h2>
              <span className="font-mono text-[9px] text-white/30 uppercase tracking-widest">{playHistory.length} Tracks Logged</span>
            </div>

            {playHistory.length > 0 ? (
              <div className="space-y-1 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
                {playHistory.map((item, idx) => {
                  const song = songs.find(s => s.id === item.songId);
                  if (!song) return null;
                  const isCurrent = song.id === currentSong?.id;
                  const playedTime = new Date(item.playedAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <motion.div
                      key={idx}
                      onClick={() => onPlaySong(song)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 group cursor-pointer ${
                        isCurrent 
                          ? 'border-brand-magenta/30 bg-white/5 shadow-md shadow-brand-violet/5' 
                          : 'border-transparent hover:bg-white/5 hover:border-white/5'
                      }`}
                      whileHover={{ x: 3 }}
                    >
                      <div className="flex items-center gap-3 w-3/4">
                        <div className="relative shrink-0">
                          <img
                            src={song.coverImage || song.coverUrl}
                            alt={song.title}
                            className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.src = "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=500&h=500&fit=crop&q=80";
                            }}
                          />
                          <div className={`absolute inset-0 bg-black/40 transition-opacity rounded-lg flex items-center justify-center text-white ${
                            isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}>
                            {isCurrent && isPlaying ? (
                              <Pause className="w-3.5 h-3.5 fill-white" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />
                            )}
                          </div>
                        </div>
                        <div className="overflow-hidden">
                          <p className={`text-sm font-semibold truncate transition-colors ${
                            isCurrent ? 'text-brand-magenta text-glow animate-pulse' : 'text-white group-hover:text-brand-violet'
                          }`}>
                            {song.title}
                          </p>
                          <p className={`text-xs truncate ${isCurrent ? 'text-brand-magenta/80' : 'text-white/50'}`}>{song.artist}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-mono ${isCurrent ? 'text-brand-magenta/70' : 'text-white/40'}`}>{playedTime}</p>
                        <span className={`text-[10px] font-mono transition-opacity ${
                          isCurrent 
                            ? 'text-brand-magenta opacity-100 text-glow' 
                            : 'text-brand-violet opacity-0 group-hover:opacity-100'
                        }`}>
                          {isCurrent && isPlaying ? 'Playing' : 'Play'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center text-white/30">
                <Music className="w-10 h-10 mb-3 text-white/15" />
                <p className="text-sm font-medium">Listening queue history is empty.</p>
                <p className="text-xs text-white/25 max-w-xs mt-1">Play any track in explore, home, or search to trigger playback logging.</p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* CHANGE PASSWORD MODAL */}
      <AnimatePresence>
        {isChangingPassword && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-white/10"
            >
              <div className="p-6 border-b border-white/5 bg-black/40 flex items-center justify-between">
                <h2 className="text-xl font-display font-bold">Secure Password Reset</h2>
                <button
                  onClick={() => setIsChangingPassword(false)}
                  className="text-white/40 hover:text-white transition-colors font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
                {passError && (
                  <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{passError}</span>
                  </div>
                )}
                {passSuccess && (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>{passSuccess}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono text-white/60 uppercase tracking-wider">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full glass-input px-4 py-3 rounded-xl text-sm text-white"
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono text-white/60 uppercase tracking-wider">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full glass-input px-4 py-3 rounded-xl text-sm text-white"
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono text-white/60 uppercase tracking-wider">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full glass-input px-4 py-3 rounded-xl text-sm text-white"
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsChangingPassword(false)}
                    className="px-5 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-violet to-brand-magenta text-sm font-semibold text-white cursor-pointer"
                  >
                    Reset Password
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE ACCOUNT MODAL */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-red-500/25"
            >
              <div className="p-6 border-b border-white/5 bg-red-950/20 flex items-center justify-between">
                <h2 className="text-xl font-display font-bold text-red-400">Irreversible Deletion</h2>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-white/40 hover:text-white transition-colors font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleDeleteAccount} className="p-6 space-y-4">
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-xs rounded-xl leading-relaxed space-y-2">
                  <p className="font-bold">⚠️ CRITICAL ACTION WARNING:</p>
                  <p>Deleting your Melodia account will completely clear your profile, saved playlist history, liked songs catalog, and custom AI databases from our core servers.</p>
                  <p className="font-bold">This operation is absolutely irreversible.</p>
                </div>

                {deleteError && (
                  <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 text-xs rounded-xl font-mono flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{deleteError}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-mono text-white/60">
                    Please type <span className="font-bold text-red-400">DELETE</span> to authorize your account destruction:
                  </label>
                  <input
                    type="text"
                    required
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    className="w-full glass-input px-4 py-3 rounded-xl text-sm border-red-500/10 focus:border-red-500 font-mono tracking-widest text-center text-white"
                    placeholder="DELETE"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteInput('');
                      setDeleteError('');
                    }}
                    className="px-5 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 0.98 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Destroy Account
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
