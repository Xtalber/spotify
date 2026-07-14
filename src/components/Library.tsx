import React, { useState } from 'react';
import {
  Sparkles, Play, Pause, Trash2, Edit2, Plus, Calendar,
  Globe, Lock, Loader2, Music, Check, ArrowRight, Upload, Heart
} from 'lucide-react';
import { Song, Playlist, PlayHistory, User } from '../types';
import SongActionMenu from './SongActionMenu';

interface LibraryProps {
  user: User | null;
  likedSongs: Song[];
  history: Song[];
  playlists: Playlist[];
  onPlaySong: (song: Song, customQueue?: Song[]) => void;
  authToken: string | null;
  refreshUserData: () => void;
  triggerToast: (title: string, message: string, type: 'success' | 'alert' | 'ai') => void;
  onAddToQueue: (song: Song) => void;
  onPlayNext?: (song: Song) => void;
  likedSongIds: string[];
  onToggleLike: (songId: string) => void;
  songs: Song[];
  currentSong?: Song | null;
  isPlaying?: boolean;
}

export default function Library({
  user,
  likedSongs,
  history,
  playlists,
  onPlaySong,
  authToken,
  refreshUserData,
  triggerToast,
  onAddToQueue,
  onPlayNext,
  likedSongIds = [],
  onToggleLike,
  songs,
  currentSong,
  isPlaying,
}: LibraryProps) {
  const [activeTab, setActiveTab] = useState<'liked' | 'history' | 'playlists'>('liked');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // AI Curating States
  const [isCurating, setIsCurating] = useState(false);
  const [curatorCommentary, setCuratorCommentary] = useState<string | null>(null);

  // Custom Playlist Editor States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Playlist | null>(null);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDesc, setPlaylistDesc] = useState('');
  const [playlistCover, setPlaylistCover] = useState('');
  const [playlistIsPublic, setPlaylistIsPublic] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Trigger AI Smart Curation
  const handleAICuration = async () => {
    if (!authToken) return;
    setIsCurating(true);
    setCuratorCommentary(null);

    try {
      const response = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('AI Curator is busy. Please try again.');
      }

      const data = await response.json();
      setCuratorCommentary(data.commentary);
      refreshUserData();
      triggerToast('AI Curation Synthesized!', 'Your custom smart playlist is saved inside your library.', 'ai');
    } catch (err: any) {
      triggerToast('Curation Failed', err.message || 'Failed to synthesize playlist.', 'alert');
    } finally {
      setIsCurating(false);
    }
  };

  // Convert image to base64 and upload to server static storage
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authToken) return;

    setIsUploading(true);
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
          setPlaylistCover(uploadRes.url);
          triggerToast('Cover Uploaded', 'Artwork saved to cloud assets.', 'success');
        } else {
          throw new Error('Failed to save cover.');
        }
      } catch (err) {
        triggerToast('Upload Failed', 'Failed to write artwork to file.', 'alert');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Create Playlist Submit
  const handleCreatePlaylistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistName.trim() || !authToken) return;

    try {
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: playlistName,
          description: playlistDesc,
          coverUrl: playlistCover || undefined,
          isPublic: playlistIsPublic,
        })
      });

      if (response.ok) {
        setShowCreateModal(false);
        setPlaylistName('');
        setPlaylistDesc('');
        setPlaylistCover('');
        refreshUserData();
        triggerToast('Playlist Created', 'Custom playlist has been created.', 'success');
      }
    } catch (err) {
      triggerToast('Error', 'Failed to create playlist.', 'alert');
    }
  };

  // Edit Playlist Submit
  const handleEditPlaylistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal || !playlistName.trim() || !authToken) return;

    try {
      const response = await fetch(`/api/playlists/${showEditModal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: playlistName,
          description: playlistDesc,
          coverUrl: playlistCover || undefined,
          isPublic: playlistIsPublic,
        })
      });

      if (response.ok) {
        setShowEditModal(null);
        setPlaylistName('');
        setPlaylistDesc('');
        setPlaylistCover('');
        refreshUserData();
        triggerToast('Playlist Updated', 'Changes saved successfully.', 'success');
      }
    } catch (err) {
      triggerToast('Error', 'Failed to update playlist.', 'alert');
    }
  };

  // Delete Playlist
  const handleDeletePlaylist = async (id: string) => {
    if (!authToken) return;

    try {
      const response = await fetch(`/api/playlists/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        if (selectedPlaylistId === id) {
          setSelectedPlaylistId(null);
        }
        refreshUserData();
        triggerToast('Playlist Deleted', 'Playlist has been removed from library.', 'success');
      } else {
        const data = await response.json().catch(() => ({}));
        triggerToast('Error', data.message || 'Failed to delete playlist.', 'alert');
      }
    } catch (err) {
      triggerToast('Error', 'Failed to delete playlist.', 'alert');
    }
  };

  // Open Edit Modal
  const openEditModal = (playlist: Playlist) => {
    setShowEditModal(playlist);
    setPlaylistName(playlist.name);
    setPlaylistDesc(playlist.description);
    setPlaylistCover(playlist.coverUrl);
    setPlaylistIsPublic(playlist.isPublic);
  };

  return (
    <div className="space-y-8 pb-32">
      {/* Tab Selectors & Create Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4 select-none">
        <div className="flex items-center gap-2">
          {['liked', 'playlists', 'history'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab as any);
                setSelectedPlaylistId(null);
              }}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold capitalize border transition-all ${
                activeTab === tab
                  ? 'bg-white/10 text-white border-white/15'
                  : 'bg-transparent text-white/50 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              {tab === 'liked' ? 'Liked Tracks' : tab}
            </button>
          ))}
        </div>

        {activeTab === 'playlists' && (
          <button
            onClick={() => {
              setPlaylistName('');
              setPlaylistDesc('');
              setPlaylistCover('');
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-violet text-white text-xs font-semibold hover:opacity-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Playlist
          </button>
        )}
      </div>

      {/* AI Smart Curation Module */}
      <div className="glass p-6 rounded-2xl relative overflow-hidden border border-brand-violet/20 shadow-xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-violet/10 blur-3xl rounded-full -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="font-mono text-[10px] tracking-widest text-brand-magenta font-semibold uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
              Melodia Cognitive Resident
            </span>
            <h4 className="font-display font-bold text-lg text-white">Synthesize Bespoke Smart Playlists</h4>
            <p className="text-xs text-white/50 leading-relaxed">
              Leverage content-based cosine similarity combined with <strong>Gemini 3.5 Flash</strong> to scan your listening history, genres, and custom metrics, formulating custom audiophile curations.
            </p>
          </div>

          <button
            onClick={handleAICuration}
            disabled={isCurating}
            className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-violet via-brand-magenta to-brand-cyan text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 active:scale-95 transition-all shrink-0 shadow-lg shadow-brand-violet/20"
          >
            {isCurating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing Affinity...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Curate with AI
              </>
            )}
          </button>
        </div>

        {/* AI Commentary Panel */}
        {curatorCommentary && (
          <div className="mt-6 p-4 rounded-xl bg-brand-violet/10 border border-brand-violet/20 space-y-2">
            <p className="font-display font-semibold text-xs text-brand-cyan uppercase tracking-wider">AI Curator Insights</p>
            <p className="text-xs text-white/70 italic leading-relaxed">"{curatorCommentary}"</p>
          </div>
        )}
      </div>

      {/* Active Tab Area */}
      {activeTab === 'liked' && (
        <div className="space-y-4">
          <h3 className="font-display font-bold text-sm text-white/60 uppercase tracking-widest flex items-center gap-2">
            <Heart className="w-4.5 h-4.5 fill-brand-magenta text-brand-magenta" />
            Liked Tracks ({likedSongs.length})
          </h3>

          {likedSongs.length === 0 ? (
            <div className="glass p-12 rounded-2xl text-center space-y-3">
              <p className="text-xs text-white/30 italic">No liked tracks inside library yet.</p>
              <p className="text-[10px] text-white/20">Click the heart symbol on songs across search and explore to populate!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {likedSongs.map((song, idx) => (
                <div
                  key={song.id}
                  className={`glass-card p-3 rounded-xl flex items-center justify-between gap-4 border group hover:bg-white/5 transition-all ${
                    song.id === currentSong?.id ? 'border-brand-magenta/30 bg-white/5 shadow-md shadow-brand-violet/5' : 'border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <span className="font-mono text-xs text-white/30 w-5 text-center">{idx + 1}</span>
                    <div className="relative shrink-0">
                      <img
                        src={song.coverImage || song.coverUrl}
                        alt={song.title}
                        className="w-10 h-10 rounded object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=500&h=500&fit=crop&q=80";
                        }}
                      />
                      <button
                        onClick={() => onPlaySong(song, likedSongs)}
                        className={`absolute inset-0 bg-black/60 transition-opacity rounded flex items-center justify-center text-white ${
                          song.id === currentSong?.id ? 'opacity-100 bg-brand-violet/40' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {song.id === currentSong?.id && isPlaying ? (
                          <Pause className="w-4 h-4 fill-white" />
                        ) : (
                          <Play className="w-4 h-4 fill-white translate-x-0.5" />
                        )}
                      </button>
                    </div>
                    <div className="overflow-hidden">
                      <p className={`text-xs font-semibold truncate hover:underline cursor-pointer ${
                        song.id === currentSong?.id ? 'text-brand-magenta text-glow animate-pulse' : 'text-white'
                      }`} onClick={() => onPlaySong(song, likedSongs)}>{song.title}</p>
                      <p className={`text-[10px] truncate ${song.id === currentSong?.id ? 'text-brand-magenta/80' : 'text-white/50'}`}>{song.artist}</p>
                    </div>
                  </div>

                  <p className="hidden sm:block text-xs text-white/50 truncate w-1/4">{song.album}</p>

                  <div className="flex items-center gap-4 font-mono text-xs text-white/40 select-none">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLike(song.id);
                      }}
                      className="p-1 hover:bg-white/5 rounded transition-colors text-brand-magenta hover:opacity-80"
                      title="Unlike"
                    >
                      <Heart className="w-4 h-4 fill-brand-magenta text-brand-magenta" />
                    </button>
                    <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 uppercase hidden md:inline-block">
                      {song.genre}
                    </span>
                    <span>{Math.floor(song.duration / 60)}:{(song.duration % 60) < 10 ? '0' : ''}{song.duration % 60}</span>
                    
                    <SongActionMenu
                      song={song}
                      playlists={playlists}
                      authToken={authToken}
                      onAddToQueue={onAddToQueue}
                      onPlayNext={onPlayNext}
                      triggerToast={triggerToast}
                      refreshUserData={refreshUserData}
                      likedSongIds={likedSongIds}
                      onToggleLike={onToggleLike}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <h3 className="font-display font-bold text-sm text-white/60 uppercase tracking-widest">
            Recent Playback Logs ({history.length})
          </h3>

          {history.length === 0 ? (
            <div className="glass p-12 rounded-2xl text-center">
              <p className="text-xs text-white/30 italic">Playback history is empty.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((song, idx) => (
                <div
                  key={song.id + '-' + idx}
                  className={`glass-card p-3 rounded-xl flex items-center justify-between gap-4 border group hover:bg-white/5 transition-all ${
                    song.id === currentSong?.id ? 'border-brand-magenta/30 bg-white/5 shadow-md shadow-brand-violet/5' : 'border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <div className="relative shrink-0">
                      <img
                        src={song.coverImage || song.coverUrl}
                        alt={song.title}
                        className="w-10 h-10 rounded object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=500&h=500&fit=crop&q=80";
                        }}
                      />
                      <button
                        onClick={() => onPlaySong(song, history)}
                        className={`absolute inset-0 bg-black/60 transition-opacity rounded flex items-center justify-center text-white ${
                          song.id === currentSong?.id ? 'opacity-100 bg-brand-violet/40' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {song.id === currentSong?.id && isPlaying ? (
                          <Pause className="w-4 h-4 fill-white" />
                        ) : (
                          <Play className="w-4 h-4 fill-white translate-x-0.5" />
                        )}
                      </button>
                    </div>
                    <div className="overflow-hidden">
                      <p className={`text-xs font-semibold truncate ${song.id === currentSong?.id ? 'text-brand-magenta text-glow animate-pulse' : 'text-white'}`}>{song.title}</p>
                      <p className={`text-[10px] truncate ${song.id === currentSong?.id ? 'text-brand-magenta/80' : 'text-white/50'}`}>{song.artist}</p>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 text-[10px] text-white/40 font-mono w-1/4">
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {new Date((song as any).playedAt || '').toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 font-mono text-xs text-white/40 select-none">
                    <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 uppercase hidden md:inline-block">
                      {song.genre}
                    </span>
                    <span>{Math.floor(song.duration / 60)}:{(song.duration % 60) < 10 ? '0' : ''}{song.duration % 60}</span>
                    
                    <SongActionMenu
                      song={song}
                      playlists={playlists}
                      authToken={authToken}
                      onAddToQueue={onAddToQueue}
                      onPlayNext={onPlayNext}
                      triggerToast={triggerToast}
                      refreshUserData={refreshUserData}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'playlists' && (
        <div className="space-y-4">
          {selectedPlaylistId ? (
            <div className="space-y-6">
              <button
                onClick={() => setSelectedPlaylistId(null)}
                className="flex items-center gap-2 text-xs text-white/60 hover:text-white font-semibold cursor-pointer py-1.5 px-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all w-fit"
              >
                ← Back to Playlists
              </button>

              {(() => {
                const playlist = playlists.find(p => p.id === selectedPlaylistId);
                if (!playlist) return null;
                const playlistSongs = songs.filter(s => playlist.songIds.includes(s.id));

                return (
                  <div className="space-y-6">
                    {/* Playlist Detail Header */}
                    <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-end p-6 glass rounded-2xl border border-white/10 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/10 blur-3xl rounded-full -z-10 animate-pulse" style={{ animationDuration: '4s' }} />
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-violet/10 blur-3xl rounded-full -z-10 animate-pulse" style={{ animationDuration: '6s' }} />
                      
                      <img src={playlist.coverUrl} alt={playlist.name} className="w-32 h-32 rounded-xl object-cover border border-white/10 shadow-2xl shrink-0" />
                      <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-brand-violet bg-brand-violet/10 px-2.5 py-1 rounded-full border border-brand-violet/20 font-semibold inline-block">
                          Custom Playlist
                        </span>
                        <h2 className="font-display font-bold text-2xl text-white truncate leading-tight">{playlist.name}</h2>
                        <p className="text-xs text-white/60 leading-relaxed max-w-xl">{playlist.description}</p>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-[10px] text-white/40 font-mono pt-1">
                          <span className="flex items-center gap-1">
                            {playlist.isPublic ? <Globe className="w-3.5 h-3.5 text-brand-cyan" /> : <Lock className="w-3.5 h-3.5 text-brand-magenta" />}
                            {playlist.isPublic ? 'Public' : 'Private'}
                          </span>
                          <span>•</span>
                          <span>{playlistSongs.length} Tracks</span>
                          <span>•</span>
                          <span>Created by You</span>
                        </div>
                      </div>
                    </div>

                    {/* Playlist Songs Rows */}
                    <div className="space-y-2">
                      {playlistSongs.length === 0 ? (
                        <div className="glass p-12 rounded-2xl text-center space-y-3">
                          <p className="text-xs text-white/30 italic">This playlist has no tracks yet.</p>
                          <p className="text-[10px] text-white/20 leading-relaxed">
                            Go to <strong>Explore</strong> or <strong>Search</strong> and use the three-dot menu on any song to add tracks here!
                          </p>
                        </div>
                      ) : (
                        playlistSongs.map((song, idx) => {
                          const isCurrent = song.id === currentSong?.id;
                          return (
                            <div
                              key={song.id}
                              className={`glass-card p-3 rounded-xl flex items-center justify-between gap-4 border group hover:bg-white/5 transition-all animate-fade-in ${
                                isCurrent ? 'border-brand-magenta/30 bg-white/5 shadow-md shadow-brand-violet/5' : 'border-white/5'
                              }`}
                            >
                              <div className="flex items-center gap-3 overflow-hidden flex-1">
                                <span className="font-mono text-xs text-white/30 w-5 text-center">{idx + 1}</span>
                                <div className="relative shrink-0">
                                  <img
                                    src={song.coverImage || song.coverUrl}
                                    alt={song.title}
                                    className="w-10 h-10 rounded object-cover"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      e.currentTarget.src = "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=500&h=500&fit=crop&q=80";
                                    }}
                                  />
                                  <button
                                    onClick={() => onPlaySong(song, playlistSongs)}
                                    className={`absolute inset-0 bg-black/60 transition-opacity rounded flex items-center justify-center text-white ${
                                      isCurrent ? 'opacity-100 bg-brand-violet/40' : 'opacity-0 group-hover:opacity-100'
                                    }`}
                                  >
                                    {isCurrent && isPlaying ? (
                                      <Pause className="w-4 h-4 fill-white" />
                                    ) : (
                                      <Play className="w-4 h-4 fill-white translate-x-0.5" />
                                    )}
                                  </button>
                                </div>
                                <div className="overflow-hidden">
                                  <p className={`text-xs font-semibold truncate ${isCurrent ? 'text-brand-magenta text-glow animate-pulse' : 'text-white'}`}>{song.title}</p>
                                  <p className={`text-[10px] truncate ${isCurrent ? 'text-brand-magenta/80' : 'text-white/50'}`}>{song.artist}</p>
                                </div>
                              </div>

                              <p className="hidden sm:block text-xs text-white/50 truncate w-1/4">{song.album}</p>

                              <div className="flex items-center gap-4 font-mono text-xs text-white/40 select-none">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleLike(song.id);
                                  }}
                                  className="p-1 hover:bg-white/5 rounded transition-colors text-white/30 hover:text-white"
                                  title={likedSongIds.includes(song.id) ? "Unlike" : "Like"}
                                >
                                  <Heart className={`w-4 h-4 ${likedSongIds.includes(song.id) ? 'fill-brand-magenta text-brand-magenta' : 'text-white/40'}`} />
                                </button>
                                <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 uppercase hidden md:inline-block">
                                  {song.genre}
                                </span>
                                <span>{Math.floor(song.duration / 60)}:{(song.duration % 60) < 10 ? '0' : ''}{song.duration % 60}</span>
                                
                                <SongActionMenu
                                  song={song}
                                  playlists={playlists}
                                  authToken={authToken}
                                  onAddToQueue={onAddToQueue}
                                  onPlayNext={onPlayNext}
                                  triggerToast={triggerToast}
                                  refreshUserData={refreshUserData}
                                  likedSongIds={likedSongIds}
                                  onToggleLike={onToggleLike}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <>
              <h3 className="font-display font-bold text-sm text-white/60 uppercase tracking-widest">
                Custom Playlists ({playlists.length})
              </h3>

              {playlists.length === 0 ? (
                <div className="glass p-12 rounded-2xl text-center space-y-3">
                  <p className="text-xs text-white/30 italic">No custom playlists created yet.</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="text-xs text-brand-violet hover:underline font-semibold"
                  >
                    Assemble one now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {playlists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className="glass-card p-4 rounded-2xl flex flex-col justify-between border border-white/5 group relative"
                    >
                      <div
                        className="space-y-3 cursor-pointer group/card"
                        onClick={() => setSelectedPlaylistId(playlist.id)}
                      >
                        <div className="relative aspect-video rounded-xl overflow-hidden">
                          <img src={playlist.coverUrl} alt={playlist.name} className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105" />
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-[9px] font-mono text-white/70 flex items-center gap-1 z-10">
                            {playlist.isPublic ? <Globe className="w-2.5 h-2.5 text-brand-cyan" /> : <Lock className="w-2.5 h-2.5 text-brand-magenta" />}
                            {playlist.isPublic ? 'Public' : 'Private'}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h4 className="font-display font-bold text-sm text-white group-hover/card:text-brand-violet transition-colors truncate">{playlist.name}</h4>
                          <p className="text-xs text-white/50 line-clamp-2 min-h-[32px]">{playlist.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-4">
                        <span className="font-mono text-[9px] text-white/40 uppercase">
                          {playlist.songIds.length} Songs
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(playlist)}
                            className="p-1.5 rounded hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                            title="Edit Playlist Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(playlist.id)}
                            className="p-1.5 rounded hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                            title="Delete Playlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* CREATE PLAYLIST MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-fadeIn">
          <div className="glass max-w-md w-full rounded-2xl border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">New Custom Playlist</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-xs text-white/40 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreatePlaylistSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-white/45 uppercase font-mono">Playlist Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dreamy Acoustics"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass border border-white/5 text-xs text-white focus:outline-none focus:border-brand-violet"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-white/45 uppercase font-mono">Description</label>
                <textarea
                  rows={2}
                  placeholder="A curated acoustic loop collection..."
                  value={playlistDesc}
                  onChange={(e) => setPlaylistDesc(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass border border-white/5 text-xs text-white focus:outline-none focus:border-brand-violet"
                />
              </div>

              {/* Cover Upload */}
              <div className="space-y-2">
                <label className="text-[10px] text-white/45 uppercase font-mono block">Playlist Cover Artwork</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl border border-white/5 overflow-hidden bg-black/45 flex items-center justify-center shrink-0">
                    {playlistCover ? (
                      <img src={playlistCover} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <Music className="w-6 h-6 text-white/20" />
                    )}
                  </div>
                  <label className="flex-1 flex flex-col items-center justify-center px-4 py-3 rounded-xl border border-white/10 border-dashed hover:bg-white/5 cursor-pointer transition-colors text-center">
                    <Upload className="w-4 h-4 text-white/40 mb-1" />
                    <span className="text-[10px] text-white/50">{isUploading ? 'Uploading...' : 'Choose image file'}</span>
                    <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Visibility Toggle */}
              <div className="flex items-center justify-between py-2 border-y border-white/5">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-white">Make Playlist Public</p>
                  <p className="text-[10px] text-white/40">Visible to other listeners in community</p>
                </div>
                <input
                  type="checkbox"
                  checked={playlistIsPublic}
                  onChange={(e) => setPlaylistIsPublic(e.target.checked)}
                  className="w-4 h-4 accent-brand-violet cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/5 hover:bg-white/5 text-xs text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-violet text-white text-xs font-semibold"
                >
                  Save Playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PLAYLIST DETAILS MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="glass max-w-md w-full rounded-2xl border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">Edit Playlist Details</h3>
              <button onClick={() => setShowEditModal(null)} className="text-xs text-white/40 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleEditPlaylistSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-white/45 uppercase font-mono">Playlist Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dreamy Acoustics"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass border border-white/5 text-xs text-white focus:outline-none focus:border-brand-violet"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-white/45 uppercase font-mono">Description</label>
                <textarea
                  rows={2}
                  placeholder="A curated acoustic loop collection..."
                  value={playlistDesc}
                  onChange={(e) => setPlaylistDesc(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass border border-white/5 text-xs text-white focus:outline-none focus:border-brand-violet"
                />
              </div>

              {/* Cover Upload */}
              <div className="space-y-2">
                <label className="text-[10px] text-white/45 uppercase font-mono block">Playlist Cover Artwork</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl border border-white/5 overflow-hidden bg-black/45 flex items-center justify-center shrink-0">
                    {playlistCover ? (
                      <img src={playlistCover} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <Music className="w-6 h-6 text-white/20" />
                    )}
                  </div>
                  <label className="flex-1 flex flex-col items-center justify-center px-4 py-3 rounded-xl border border-white/10 border-dashed hover:bg-white/5 cursor-pointer transition-colors text-center">
                    <Upload className="w-4 h-4 text-white/40 mb-1" />
                    <span className="text-[10px] text-white/50">{isUploading ? 'Uploading...' : 'Choose image file'}</span>
                    <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Visibility Toggle */}
              <div className="flex items-center justify-between py-2 border-y border-white/5">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-white">Make Playlist Public</p>
                  <p className="text-[10px] text-white/40">Visible to other listeners in community</p>
                </div>
                <input
                  type="checkbox"
                  checked={playlistIsPublic}
                  onChange={(e) => setPlaylistIsPublic(e.target.checked)}
                  className="w-4 h-4 accent-brand-violet cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-white/5 hover:bg-white/5 text-xs text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-violet text-white text-xs font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="glass max-w-sm w-full rounded-2xl border border-white/10 p-6 space-y-4">
            <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">Delete Playlist</h3>
            <p className="text-xs text-white/70">Are you sure you want to delete this playlist?</p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-white/5 hover:bg-white/5 text-xs text-white/60 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const id = deleteConfirmId;
                  setDeleteConfirmId(null);
                  handleDeletePlaylist(id);
                }}
                className="px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
