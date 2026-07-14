import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Genre } from '../types';
import {
  ArrowLeft, Camera, Upload, Loader2, AlertCircle, Check, Key, Trash2, User as UserIcon
} from 'lucide-react';

interface EditProfileProps {
  user: User | null;
  setUser: (user: User | null) => void;
  genres: Genre[];
  onLogout: () => void;
  onBack: () => void;
  triggerToast?: (title: string, message: string, type: 'success' | 'alert' | 'ai') => void;
  refreshUserData?: () => void;
}

export default function EditProfile({
  user,
  setUser,
  genres,
  onLogout,
  onBack,
  triggerToast,
  refreshUserData,
}: EditProfileProps) {
  // Edit profile form state
  const [editUsername, setEditUsername] = useState(user?.username || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState(user?.avatarUrl || '');
  const [editFavGenres, setEditFavGenres] = useState<string[]>(user?.favoriteGenres || []);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Delete account input
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Image Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarPresets = [
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Jazz`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Beat`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Melody`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Synth`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Groove`,
    `https://api.dicebear.com/7.x/adventurer/svg?seed=Acoustic`,
  ];

  const toggleGenre = (genreName: string) => {
    if (editFavGenres.includes(genreName)) {
      setEditFavGenres(editFavGenres.filter(g => g !== genreName));
    } else {
      setEditFavGenres([...editFavGenres, genreName]);
    }
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
          setEditAvatarUrl(res.user.avatarUrl);
          setUploadSuccess('Profile picture uploaded successfully!');
          setSelectedFile(null);
          setUploadPreview(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          if (triggerToast) triggerToast('Success', 'Profile picture updated!', 'success');
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

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!editUsername || editUsername.trim().length < 3) {
      const errMsg = 'Name must be at least 3 characters long.';
      setErrorMsg(errMsg);
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
        setSuccessMsg('Profile updated successfully.');
        if (triggerToast) {
          triggerToast('Success', 'Profile updated successfully.', 'success');
        }
        if (refreshUserData) {
          refreshUserData();
        }
        setTimeout(() => {
          onBack();
        }, 1000);
      } else {
        const errMsg = data.message || 'Failed to update profile.';
        setErrorMsg(errMsg);
        if (triggerToast) triggerToast('Update Failed', errMsg, 'alert');
      }
    } catch (err) {
      const errMsg = 'Network error. Please try again.';
      setErrorMsg(errMsg);
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

    if (newPassword.length < 6) {
      setPassError('Password must be at least 6 characters long.');
      return;
    }

    setIsChangingPassword(true);

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
        if (triggerToast) triggerToast('Success', 'Password changed successfully!', 'success');
        setTimeout(() => {
          setPassSuccess('');
        }, 3000);
      } else {
        setPassError(data.message || 'Failed to change password.');
      }
    } catch (err) {
      setPassError('Network error. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');

    if (deleteInput !== 'DELETE') {
      setDeleteError('Please type "DELETE" to confirm.');
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('melodia_token')}`,
        },
      });

      if (response.ok) {
        if (triggerToast) triggerToast('Account Deleted', 'Your profile and storage have been removed.', 'success');
        onLogout();
      } else {
        const data = await response.json();
        setDeleteError(data.message || 'Failed to delete account.');
      }
    } catch (err) {
      setDeleteError('Network error. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/60 text-white overflow-hidden relative" id="edit-profile-page">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-black/80 backdrop-blur-md z-40 border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-white/70 hover:text-white"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-display font-bold tracking-tight text-white">Edit Profile</h1>
            <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Identity Settings Grid</p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="text-xs text-white/40 hover:text-white transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 scrollbar-thin pb-36">
        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* PROFILE PHOTO SELECTION */}
        <section className="glass rounded-2xl p-5 border border-white/5 space-y-4">
          <h2 className="text-xs font-mono text-white/50 uppercase tracking-widest border-b border-white/5 pb-2">Profile Photo</h2>
          
          <div className="flex flex-col md:flex-row gap-6 items-center">
            {/* Current Photo Preview / Upload selector */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-brand-violet/10 border-2 border-brand-violet/30 flex items-center justify-center relative">
                {uploadPreview ? (
                  <img src={uploadPreview} alt="New Preview" className="w-full h-full object-cover" />
                ) : editAvatarUrl ? (
                  <img src={editAvatarUrl} alt={user?.username} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-8 h-8 text-brand-violet/50" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center rounded-2xl cursor-pointer"
                title="Change Photo"
              >
                <Camera className="w-5 h-5 text-white mb-1" />
                <span className="text-[9px] font-mono uppercase tracking-wider text-white">Choose File</span>
              </button>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className="hidden"
              />
            </div>

            {/* Upload flow indicators or presets */}
            <div className="flex-1 w-full space-y-3">
              {uploadPreview && (
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-white/40 font-mono truncate max-w-[200px]">{selectedFile?.name}</p>
                      <p className="text-[10px] text-white/60">
                        {selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(2) : 0} MB
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={cancelUpload}
                        disabled={uploadProgress !== null}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] bg-white/5 hover:bg-white/10 text-white/60 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAvatarUpload}
                        disabled={uploadProgress !== null}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] bg-brand-violet hover:bg-brand-violet/90 text-white font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {uploadProgress !== null ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        Upload
                      </button>
                    </div>
                  </div>
                  {uploadProgress !== null && (
                    <div className="space-y-1">
                      <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                        <div className="bg-brand-violet h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <p className="text-[9px] font-mono text-brand-cyan text-right">Uploading... {uploadProgress}%</p>
                    </div>
                  )}
                </div>
              )}

              {uploadError && (
                <p className="text-xs text-red-400 font-medium">{uploadError}</p>
              )}
              {uploadSuccess && (
                <p className="text-xs text-emerald-400 font-medium">{uploadSuccess}</p>
              )}

              {/* Presets Grid */}
              <div className="space-y-2">
                <span className="block text-[10px] text-white/40 font-mono uppercase tracking-wider">Or Select Preset Avatar</span>
                <div className="flex gap-2 items-center overflow-x-auto pb-1 scrollbar-thin">
                  {avatarPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditAvatarUrl(preset)}
                      className={`relative shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        editAvatarUrl === preset ? 'border-brand-violet scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={preset} alt="preset" className="w-10 h-10 object-cover" />
                      {editAvatarUrl === preset && (
                        <div className="absolute inset-0 bg-brand-violet/20 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Image URL input */}
              <div className="space-y-1">
                <span className="block text-[10px] text-white/40 font-mono">Or Paste Custom Image URL:</span>
                <input
                  type="url"
                  value={editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  className="w-full glass-input px-3 py-2 text-xs rounded-xl text-white bg-black/20 border border-white/10 focus:outline-none focus:border-brand-violet"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
            </div>
          </div>
        </section>

        {/* PRIMARY PROFILE METADATA */}
        <section className="glass rounded-2xl p-5 border border-white/5 space-y-5">
          <h2 className="text-xs font-mono text-white/50 uppercase tracking-widest border-b border-white/5 pb-2">Profile Metadata</h2>

          {/* Name Input */}
          <div className="space-y-2">
            <label className="block text-xs font-mono text-white/60 uppercase tracking-wider">Name</label>
            <input
              type="text"
              required
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              className="w-full glass-input px-4 py-3 rounded-xl text-sm text-white bg-black/20 border border-white/10 focus:outline-none focus:border-brand-violet"
              placeholder="Choose an identity"
            />
          </div>

          {/* Bio Input */}
          <div className="space-y-2">
            <label className="block text-xs font-mono text-white/60 uppercase tracking-wider">Bio</label>
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              className="w-full glass-input px-4 py-3 rounded-xl text-sm h-24 resize-none text-white bg-black/20 border border-white/10 focus:outline-none focus:border-brand-violet"
              placeholder="Introduce yourself to the audiophile grid..."
            />
          </div>

          {/* Email read-only */}
          <div className="space-y-2">
            <label className="block text-xs font-mono text-white/40 uppercase tracking-wider">Email Address (Read Only)</label>
            <input
              type="text"
              readOnly
              disabled
              value={user?.email || ''}
              className="w-full glass-input px-4 py-3 rounded-xl text-sm text-white/40 bg-black/40 border border-white/5 cursor-not-allowed"
            />
          </div>
        </section>

        {/* FAVORITE GENRE SELECTION */}
        <section className="glass rounded-2xl p-5 border border-white/5 space-y-4">
          <h2 className="text-xs font-mono text-white/50 uppercase tracking-widest border-b border-white/5 pb-2">Favorite Genres</h2>
          <p className="text-[10px] text-white/40">Select your favorite genres to help curate recommended content logs:</p>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2.5 border border-white/5 rounded-xl bg-black/20 scrollbar-thin">
            {genres.map((genre) => {
              const isFav = editFavGenres.includes(genre.name);
              return (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => toggleGenre(genre.name)}
                  className={`px-3 py-2 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                    isFav
                      ? 'bg-brand-violet/35 border-brand-violet text-white shadow-md shadow-brand-violet/10'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {genre.name}
                </button>
              );
            })}
          </div>
        </section>

        {/* SECURE PASSWORD RESET */}
        <section className="glass rounded-2xl p-5 border border-white/5 space-y-4">
          <h2 className="text-xs font-mono text-white/50 uppercase tracking-widest border-b border-white/5 pb-2">Change Password</h2>
          
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {passError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passError}</span>
              </div>
            )}
            {passSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{passSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-white/60">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs text-white bg-black/20 border border-white/10 focus:outline-none focus:border-brand-violet"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-white/60">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs text-white bg-black/20 border border-white/10 focus:outline-none focus:border-brand-violet"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-white/60">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs text-white bg-black/20 border border-white/10 focus:outline-none focus:border-brand-violet"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isChangingPassword || !currentPassword || !newPassword}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isChangingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Reset Password
              </button>
            </div>
          </form>
        </section>

        {/* DANGER ZONE - ACCOUNT IRREVERSIBLE DELETION */}
        <section className="glass rounded-2xl p-5 border border-red-500/20 space-y-4">
          <h2 className="text-xs font-mono text-red-400 uppercase tracking-widest border-b border-red-500/10 pb-2">Danger Zone</h2>
          
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-xs rounded-xl leading-relaxed space-y-2">
            <p className="font-bold">⚠️ Irreversible Account Deletion Warning:</p>
            <p>Deleting your Melodia account will completely purge your custom profile metadata, liked playlists, historical logs, and custom data from our production servers.</p>
          </div>

          <form onSubmit={handleDeleteAccount} className="space-y-3">
            {deleteError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-3 items-end">
              <div className="flex-1 space-y-1.5">
                <label className="block text-xs font-mono text-white/50">
                  Type <span className="font-bold text-red-400">DELETE</span> to authorize deletion:
                </label>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs text-white bg-black/20 border border-red-500/20 focus:outline-none focus:border-red-500 font-mono tracking-widest"
                  placeholder="DELETE"
                />
              </div>
              <button
                type="submit"
                disabled={isDeleting || deleteInput !== 'DELETE'}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Trash2 className="w-3.5 h-3.5" />
                Destroy Account
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Sticky Footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md border-t border-white/5 px-6 py-4 flex gap-4 items-center z-40">
        <button
          type="button"
          onClick={onBack}
          disabled={isSaving}
          className="flex-1 py-3 rounded-xl hover:bg-white/5 transition-colors text-xs font-semibold cursor-pointer disabled:opacity-50 text-white/70 hover:text-white border border-white/10"
        >
          Cancel Changes
        </button>
        <button
          onClick={handleProfileSave}
          disabled={isSaving}
          className="flex-2 py-3 rounded-xl bg-gradient-to-r from-brand-violet to-brand-magenta text-xs font-bold text-white shadow-lg shadow-brand-violet/20 hover:opacity-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving Profile Settings...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  );
}
