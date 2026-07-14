import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, Sparkles, Upload, Loader2, Music, Trash2, Edit2,
  Users, Play, Landmark, Activity, BarChart2, Plus
} from 'lucide-react';
import { Song, AdminAnalytics, Genre } from '../types';

interface AdminPanelProps {
  songs: Song[];
  genres: Genre[];
  authToken: string | null;
  refreshUserData: () => void;
  triggerToast: (title: string, message: string, type: 'success' | 'alert' | 'ai') => void;
}

export default function AdminPanel({
  songs,
  genres,
  authToken,
  refreshUserData,
  triggerToast,
}: AdminPanelProps) {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Form States for Uploading/Editing Songs
  const [isEditingSong, setIsEditingSong] = useState<Song | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [mood, setMood] = useState('Energetic');
  const [duration, setDuration] = useState(240); // 4 minutes defaults
  const [energy, setEnergy] = useState(5);
  const [tempo, setTempo] = useState(5);
  const [acousticness, setAcousticness] = useState(5);

  const [audioFileUrl, setAudioFileUrl] = useState('');
  const [coverFileUrl, setCoverFileUrl] = useState('');

  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch admin analytics
  const fetchAnalytics = async () => {
    if (!authToken) return;
    setIsLoadingAnalytics(true);
    try {
      const res = await fetch('/api/admin/analytics', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to load admin analytics:', err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    if (genres.length > 0) {
      setSelectedGenre(genres[0].name);
    }
  }, [genres]);

  // Handle generic Base64 uploads to server static dir
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'audio' | 'cover'
  ) => {
    const file = e.target.files?.[0];
    if (!file || !authToken) return;

    if (type === 'audio') setIsUploadingAudio(true);
    else setIsUploadingCover(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result as string;
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileData: base64Data
          })
        });

        const uploadRes = await response.json();
        if (uploadRes.success) {
          if (type === 'audio') {
            setAudioFileUrl(uploadRes.url);
            // Auto detect duration if possible
            setDuration(300); // 5 min default or auto-seeded duration
            triggerToast('Audio Synced', 'MP3 source code successfully written to cloud.', 'success');
          } else {
            setCoverFileUrl(uploadRes.url);
            triggerToast('Cover Art Synced', 'Image artwork written to cloud.', 'success');
          }
        } else {
          throw new Error('Upload server failed to write.');
        }
      } catch (err) {
        triggerToast('Upload Failed', 'Failed to save base64 payload to disk.', 'alert');
      } finally {
        if (type === 'audio') setIsUploadingAudio(false);
        else setIsUploadingCover(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Song creation or updates
  const handleSongSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !artist || !selectedGenre || !audioFileUrl || !authToken) {
      triggerToast('Required Fields Missing', 'Please fill in title, artist, genre, and upload an audio file.', 'alert');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditingSong ? `/api/songs/${isEditingSong.id}` : '/api/songs';
      const method = isEditingSong ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title,
          artist,
          album: album || 'Single',
          genre: selectedGenre,
          mood,
          duration: parseInt(duration as any) || 240,
          audioUrl: audioFileUrl,
          coverUrl: coverFileUrl || undefined,
          energy,
          tempo,
          acousticness,
        })
      });

      if (response.ok) {
        triggerToast(
          isEditingSong ? 'Song Updated' : 'Song Uploaded',
          `Successfully saved "${title}" into the persistent cloud catalog.`,
          'success'
        );
        resetForm();
        refreshUserData();
        fetchAnalytics();
      } else {
        const errData = await response.json();
        throw new Error(errData.message || 'Server rejected creation request.');
      }
    } catch (err: any) {
      triggerToast('Submission Failed', err.message || 'Failed to save track.', 'alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit song helper
  const handleEditClick = (song: Song) => {
    setIsEditingSong(song);
    setTitle(song.title);
    setArtist(song.artist);
    setAlbum(song.album);
    setSelectedGenre(song.genre);
    setMood(song.mood);
    setDuration(song.duration);
    setAudioFileUrl(song.audioUrl);
    setCoverFileUrl(song.coverUrl);
    setEnergy(song.energy);
    setTempo(song.tempo);
    setAcousticness(song.acousticness);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete song helper
  const handleDeleteClick = async (id: string) => {
    if (!authToken || !window.confirm('Delete this track permanently from Melodia cloud? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/songs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        triggerToast('Track Deleted', 'Song has been removed from persistent cloud systems.', 'success');
        refreshUserData();
        fetchAnalytics();
      }
    } catch (err) {
      triggerToast('Error', 'Failed to delete track.', 'alert');
    }
  };

  const resetForm = () => {
    setIsEditingSong(null);
    setTitle('');
    setArtist('');
    setAlbum('');
    if (genres.length > 0) setSelectedGenre(genres[0].name);
    setMood('Energetic');
    setDuration(240);
    setEnergy(5);
    setTempo(5);
    setAcousticness(5);
    setAudioFileUrl('');
    setCoverFileUrl('');
  };

  return (
    <div className="space-y-10 pb-32">
      {/* Header */}
      <div className="border-b border-white/5 pb-4 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-red-500 animate-pulse" />
          <div>
            <h2 className="font-display font-bold text-2xl tracking-tight text-white">System Admin Workspace</h2>
            <p className="text-xs text-white/50">Manage audio clouds, track libraries, and server logs.</p>
          </div>
        </div>
        <span className="font-mono text-[9px] px-3 py-1 rounded-full border border-red-500/20 bg-red-500/10 text-red-300 font-semibold uppercase tracking-wider">
          Security Clearance Level 1
        </span>
      </div>

      {/* Analytics Bento Grid */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 select-none">
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono text-white/40">Total Active Users</span>
              <Users className="w-4 h-4 text-brand-cyan" />
            </div>
            <p className="font-display text-2xl font-bold text-white text-glow">{analytics.totalUsers}</p>
          </div>

          <div className="glass p-5 rounded-2xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono text-white/40">Master Audio Tracks</span>
              <Music className="w-4 h-4 text-brand-violet" />
            </div>
            <p className="font-display text-2xl font-bold text-white text-glow">{analytics.totalSongs}</p>
          </div>

          <div className="glass p-5 rounded-2xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono text-white/40">Global Playlists</span>
              <Landmark className="w-4 h-4 text-brand-magenta" />
            </div>
            <p className="font-display text-2xl font-bold text-white text-glow">{analytics.totalPlaylists}</p>
          </div>

          <div className="glass p-5 rounded-2xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono text-white/40">Aggregated Plays</span>
              <Activity className="w-4 h-4 text-green-400 animate-pulse" />
            </div>
            <p className="font-display text-2xl font-bold text-white text-glow">{analytics.totalPlays.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Upload/Edit Workspace Form */}
      <div className="glass p-6 md:p-8 rounded-3xl border border-white/5 space-y-6">
        <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
          {isEditingSong ? <Edit2 className="w-5 h-5 text-brand-violet" /> : <Plus className="w-5 h-5 text-brand-magenta" />}
          {isEditingSong ? `Modify Song Metadata: "${isEditingSong.title}"` : 'Upload Custom High-Fidelity Track'}
        </h3>

        <form onSubmit={handleSongSubmit} className="space-y-6">
          <div className="grid md:grid-cols-3 gap-5">
            {/* Title */}
            <div className="space-y-1">
              <label className="text-[10px] text-white/40 uppercase font-mono font-semibold">Track Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sunset Drive"
                className="w-full px-3 py-2.5 rounded-xl glass border border-white/5 text-xs text-white focus:outline-none focus:border-brand-violet"
              />
            </div>

            {/* Artist */}
            <div className="space-y-1">
              <label className="text-[10px] text-white/40 uppercase font-mono font-semibold">Artist Name *</label>
              <input
                type="text"
                required
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Neon Wanderer"
                className="w-full px-3 py-2.5 rounded-xl glass border border-white/5 text-xs text-white focus:outline-none focus:border-brand-violet"
              />
            </div>

            {/* Album */}
            <div className="space-y-1">
              <label className="text-[10px] text-white/40 uppercase font-mono font-semibold">Album Name</label>
              <input
                type="text"
                value={album}
                onChange={(e) => setAlbum(e.target.value)}
                placeholder="Retro Drive (Single)"
                className="w-full px-3 py-2.5 rounded-xl glass border border-white/5 text-xs text-white focus:outline-none focus:border-brand-violet"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {/* Genre Selection */}
            <div className="space-y-1">
              <label className="text-[10px] text-white/40 uppercase font-mono font-semibold">Genre Selection *</label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl glass border border-white/5 text-xs text-white focus:outline-none focus:border-brand-violet accent-black"
              >
                {genres.map(g => (
                  <option key={g.id} value={g.name} className="bg-[#0c0c12]">
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Mood tag */}
            <div className="space-y-1">
              <label className="text-[10px] text-white/40 uppercase font-mono font-semibold">Mood Signature</label>
              <input
                type="text"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="Relaxed, Melancholic, Energetic"
                className="w-full px-3 py-2.5 rounded-xl glass border border-white/5 text-xs text-white focus:outline-none focus:border-brand-violet"
              />
            </div>

            {/* Duration */}
            <div className="space-y-1">
              <label className="text-[10px] text-white/40 uppercase font-mono font-semibold">Duration (Seconds) *</label>
              <input
                type="number"
                required
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 240)}
                placeholder="240"
                className="w-full px-3 py-2.5 rounded-xl glass border border-white/5 text-xs text-white focus:outline-none focus:border-brand-violet"
              />
            </div>
          </div>

          {/* Cognitive Similarity Feature Weights sliders (energy, tempo, acousticness) */}
          <div className="bg-[#0f0f18]/45 p-5 rounded-2xl border border-white/5 space-y-4">
            <span className="font-mono text-[10px] text-brand-cyan uppercase font-semibold flex items-center gap-1.5 select-none">
              <BarChart2 className="w-3.5 h-3.5" />
              Cognitive Trait Weights (for Cosine Similarity)
            </span>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Energy Weight */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-mono text-white/50">
                  <span>Energy Signature</span>
                  <span className="text-brand-cyan">{energy}/10</span>
                </div>
                <input
                  type="range" min="1" max="10" value={energy}
                  onChange={(e) => setEnergy(parseInt(e.target.value))}
                  className="w-full accent-brand-cyan cursor-pointer"
                />
              </div>

              {/* Tempo Weight */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-mono text-white/50">
                  <span>Tempo Dynamics</span>
                  <span className="text-brand-violet">{tempo}/10</span>
                </div>
                <input
                  type="range" min="1" max="10" value={tempo}
                  onChange={(e) => setTempo(parseInt(e.target.value))}
                  className="w-full accent-brand-violet cursor-pointer"
                />
              </div>

              {/* Acousticness Weight */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-mono text-white/50">
                  <span>Acoustic Warmth</span>
                  <span className="text-brand-magenta">{acousticness}/10</span>
                </div>
                <input
                  type="range" min="1" max="10" value={acousticness}
                  onChange={(e) => setAcousticness(parseInt(e.target.value))}
                  className="w-full accent-brand-magenta cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Cloud Storage upload slots (Audio MP3 and Artwork Cover) */}
          <div className="grid md:grid-cols-2 gap-5">
            {/* Audio MP3 */}
            <div className="space-y-3">
              <label className="text-[10px] text-white/40 uppercase font-mono font-semibold block">Track Audio File (MP3) *</label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-black/45 border border-white/5 flex items-center justify-center shrink-0">
                  <Music className={`w-5 h-5 ${audioFileUrl ? 'text-brand-cyan animate-bounce' : 'text-white/20'}`} />
                </div>
                <label className="flex-1 flex flex-col items-center justify-center py-4 rounded-xl border border-white/10 border-dashed hover:bg-white/5 cursor-pointer transition-colors text-center">
                  <Upload className="w-4 h-4 text-white/40 mb-1" />
                  <span className="text-[10px] text-white/50">{isUploadingAudio ? 'Writing base64...' : 'Upload MP3 audio file'}</span>
                  <input type="file" accept="audio/mp3,audio/mpeg" onChange={(e) => handleFileUpload(e, 'audio')} className="hidden" />
                </label>
              </div>
              {audioFileUrl && (
                <p className="text-[10px] text-brand-cyan font-mono truncate">File saved to: {audioFileUrl}</p>
              )}
            </div>

            {/* Artwork Cover */}
            <div className="space-y-3">
              <label className="text-[10px] text-white/40 uppercase font-mono font-semibold block">Track Cover Artwork Image</label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-black/45 border border-white/5 overflow-hidden flex items-center justify-center shrink-0">
                  {coverFileUrl ? (
                    <img src={coverFileUrl} alt="Cover preview" className="w-full h-full object-cover" />
                  ) : (
                    <Music className="w-5 h-5 text-white/20" />
                  )}
                </div>
                <label className="flex-1 flex flex-col items-center justify-center py-4 rounded-xl border border-white/10 border-dashed hover:bg-white/5 cursor-pointer transition-colors text-center">
                  <Upload className="w-4 h-4 text-white/40 mb-1" />
                  <span className="text-[10px] text-white/50">{isUploadingCover ? 'Writing base64...' : 'Upload cover image'}</span>
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'cover')} className="hidden" />
                </label>
              </div>
              {coverFileUrl && (
                <p className="text-[10px] text-brand-magenta font-mono truncate">File saved to: {coverFileUrl}</p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            {isEditingSong && (
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 rounded-xl border border-white/5 hover:bg-white/5 text-xs text-white/60 hover:text-white"
              >
                Cancel Edit
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || isUploadingAudio || isUploadingCover}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-violet to-brand-magenta text-white text-xs font-bold hover:opacity-95 disabled:opacity-40 transition-all shadow-md shadow-brand-violet/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Track...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {isEditingSong ? 'Save Track Changes' : 'Publish Bespoke Track'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Track Master Manager Table */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-lg text-white">Audio Catalog Manager ({songs.length} tracks)</h3>

        <div className="glass rounded-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-[#0f0f18]/30 text-[10px] uppercase font-mono tracking-widest text-white/40">
                  <th className="p-4">Track Detail</th>
                  <th className="p-4">Album</th>
                  <th className="p-4">Genre</th>
                  <th className="p-4">Stats</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-white/80">
                {songs.map((song) => (
                  <tr key={song.id} className="hover:bg-white/5 transition-colors">
                    {/* Detail */}
                    <td className="p-4 flex items-center gap-3">
                      <img
                        src={song.coverImage || song.coverUrl}
                        alt={song.title}
                        className="w-10 h-10 rounded object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=500&h=500&fit=crop&q=80";
                        }}
                      />
                      <div>
                        <p className="font-semibold text-white">{song.title}</p>
                        <p className="text-[10px] text-white/50">{song.artist}</p>
                      </div>
                    </td>

                    {/* Album */}
                    <td className="p-4 font-mono text-white/60">{song.album}</td>

                    {/* Genre */}
                    <td className="p-4">
                      <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 uppercase">
                        {song.genre}
                      </span>
                    </td>

                    {/* Stats */}
                    <td className="p-4 font-mono text-[10px] text-white/40 space-y-0.5">
                      <p>Plays: {song.plays || 0}</p>
                      <p>Likes: {song.likes || 0}</p>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEditClick(song)}
                          className="p-2 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                          title="Edit metadata"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(song.id)}
                          className="p-2 rounded hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors"
                          title="Delete track"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
