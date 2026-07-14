import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  MoreHorizontal, Plus, ListMusic, Share2, Heart, Check, Loader2, Info, SkipForward, BarChart2, Zap, Radio
} from 'lucide-react';
import { Song, Playlist } from '../types';

interface SongActionMenuProps {
  song: Song;
  playlists: Playlist[];
  authToken: string | null;
  onAddToQueue?: (song: Song) => void;
  onPlayNext?: (song: Song) => void;
  triggerToast: (title: string, message: string, type: 'success' | 'alert' | 'ai') => void;
  refreshUserData?: () => void;
  likedSongIds?: string[];
  onToggleLike?: (songId: string) => void;
}

export default function SongActionMenu({
  song,
  playlists,
  authToken,
  onAddToQueue,
  onPlayNext,
  triggerToast,
  refreshUserData,
  likedSongIds = [],
  onToggleLike,
}: SongActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingOnFly, setIsCreatingOnFly] = useState(false);
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, openUpward: false });

  // Handle single active menu across all instances
  useEffect(() => {
    function handleCloseAll(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.songId !== song.id) {
        setIsOpen(false);
      }
    }
    window.addEventListener('melodia-close-all-menus', handleCloseAll);
    return () => window.removeEventListener('melodia-close-all-menus', handleCloseAll);
  }, [song.id]);

  // Sync opening position and dispatch close-all
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('melodia-close-all-menus', { detail: { songId: song.id } }));
      updatePosition();
    }
  }, [isOpen]);

  // Position calculation
  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      
      const menuHeight = 240; // Approx max height of the dropdown
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < menuHeight && rect.top > menuHeight;
      
      let top = 0;
      if (openUpward) {
        top = rect.top + scrollY - menuHeight;
      } else {
        top = rect.bottom + scrollY;
      }

      const menuWidth = 208; // Width matching w-52
      let left = rect.right + scrollX - menuWidth;
      
      // Horizontal viewport bounds protection
      if (left < 16) {
        left = 16;
      } else if (left + menuWidth > window.innerWidth - 16) {
        left = window.innerWidth - 16 - menuWidth;
      }

      setCoords({ top, left, openUpward });
    }
  };

  // Scroll and Resize handlers, Escape handler, Click-outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (
        buttonRef.current && 
        !buttonRef.current.contains(target) && 
        !target.closest('.song-menu-portal')
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true); // capture scroll inside containers
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    
    const publicUrl = `${window.location.origin}/share/song/${song.id}`;
    navigator.clipboard.writeText(publicUrl);
    triggerToast(
      'Copied Share Link',
      `Public audiophile link for "${song.title}" copied to clipboard!`,
      'success'
    );
  };

  const handleAddToPlaylist = async (e: React.MouseEvent, playlistId: string, playlistName: string) => {
    e.stopPropagation();
    setIsOpen(false);
    setShowAddModal(false);

    if (!authToken) {
      triggerToast('Authentication Required', 'Please log in to add songs to playlists.', 'alert');
      return;
    }

    try {
      const response = await fetch(`/api/playlists/${playlistId}/add-song`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ songId: song.id }),
      });

      if (response.ok) {
        triggerToast(
          'Added to Playlist',
          `"${song.title}" is now part of "${playlistName}".`,
          'success'
        );
        if (refreshUserData) {
          refreshUserData();
        }
      } else {
        const data = await response.json();
        triggerToast('Playlist Error', data.message || 'Failed to add song.', 'alert');
      }
    } catch (err) {
      triggerToast('Network Error', 'Could not reach server.', 'alert');
    }
  };



  const handleToggleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleLike) {
      onToggleLike(song.id);
    }
    setIsOpen(false);
  };

  const handleAddToQueueClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToQueue) {
      onAddToQueue(song);
    }
    setIsOpen(false);
  };

  const handlePlayNextClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    if (onPlayNext) {
      onPlayNext(song);
    } else {
      // Fallback via global event dispatch if props are missing in some legacy wrappers
      window.dispatchEvent(new CustomEvent('melodia-play-next', { detail: song }));
    }
  };

  return (
    <div className="relative shrink-0 flex items-center">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all cursor-pointer"
        title="More Actions"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {/* PORTALED OPTIONS DROPDOWN */}
      {isOpen && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: coords.openUpward ? 8 : -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: coords.openUpward ? 8 : -8 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="song-menu-portal absolute w-52 glass rounded-xl border border-white/10 shadow-2xl z-[9999] overflow-visible py-1.5 text-white text-xs select-none"
            style={{ 
              top: coords.top, 
              left: coords.left,
              pointerEvents: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Play Next */}
            <button
              onClick={handlePlayNextClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-white/10 transition-colors"
            >
              <SkipForward className="w-4 h-4 text-brand-cyan/80" />
              <span>Play Next</span>
            </button>

            {/* Add to Queue */}
            {onAddToQueue && (
              <button
                onClick={handleAddToQueueClick}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-white/10 transition-colors"
              >
                <ListMusic className="w-4 h-4 text-white/50" />
                <span>Add to Queue</span>
              </button>
            )}

            {/* Add to Playlist */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                setShowAddModal(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-white/10 transition-colors"
            >
              <Plus className="w-4 h-4 text-white/50" />
              <span>Add to Playlist</span>
            </button>

            {/* Toggle Like */}
            {onToggleLike && (
              <button
                onClick={handleToggleLikeClick}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-white/10 transition-colors"
              >
                <Heart className={`w-4 h-4 ${likedSongIds.includes(song.id) ? 'fill-brand-magenta text-brand-magenta' : 'text-white/50'}`} />
                <span>{likedSongIds.includes(song.id) ? 'Remove Like' : 'Like Song'}</span>
              </button>
            )}



            {/* Share */}
            <button
              onClick={handleShare}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-white/10 transition-colors border-t border-white/5"
            >
              <Share2 className="w-4 h-4 text-white/50" />
              <span>Share</span>
            </button>

            {/* Song Details */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                setShowDetailsModal(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-white/10 transition-colors border-t border-white/5"
            >
              <Info className="w-4 h-4 text-brand-violet" />
              <span>Song Details</span>
            </button>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* ADD TO PLAYLIST MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[99999] backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
          <div className="glass max-w-sm w-full rounded-2xl border border-white/10 p-5 space-y-4 text-white animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h4 className="font-display font-bold text-sm uppercase tracking-wider">Add to Playlist</h4>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddModal(false);
                }}
                className="text-xs text-white/40 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs text-white/50">
              Select a playlist to add <strong className="text-white">"{song.title}"</strong>:
            </p>

            {/* List existing playlists */}
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              {playlists.length === 0 ? (
                <p className="text-[11px] text-white/30 italic text-center py-2">No playlists created yet.</p>
              ) : (
                playlists.map((playlist) => {
                  const alreadyHasSong = playlist.songIds.includes(song.id);
                  return (
                    <button
                      key={playlist.id}
                      onClick={(e) => handleAddToPlaylist(e, playlist.id, playlist.name)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-colors text-xs text-left cursor-pointer"
                    >
                      <span className="truncate pr-2 font-medium">{playlist.name}</span>
                      {alreadyHasSong ? (
                        <span className="text-[10px] text-brand-cyan font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Added
                        </span>
                      ) : (
                        <span className="text-[10px] text-white/40 hover:text-white">Add</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Create new playlist on the fly form */}
            <div className="border-t border-white/5 pt-3 space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-wider text-white/45">Or create new on the fly:</p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newPlaylistName.trim() || !authToken) return;
                  setIsCreatingOnFly(true);
                  try {
                    const createRes = await fetch('/api/playlists', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                      },
                      body: JSON.stringify({
                        name: newPlaylistName.trim(),
                        description: 'Created on the fly.',
                        isPublic: true
                      })
                    });
                    if (createRes.ok) {
                      const newPlaylist = await createRes.json();
                      setNewPlaylistName('');
                      // Add song to this newly created playlist
                      const addRes = await fetch(`/api/playlists/${newPlaylist.id}/add-song`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${authToken}`
                        },
                        body: JSON.stringify({ songId: song.id })
                      });
                      if (addRes.ok) {
                        triggerToast('Success', `Playlist created and "${song.title}" added successfully!`, 'success');
                        if (refreshUserData) refreshUserData();
                        setShowAddModal(false);
                      } else {
                        triggerToast('Error', 'Failed to add song to new playlist.', 'alert');
                      }
                    } else {
                      triggerToast('Error', 'Failed to create playlist.', 'alert');
                    }
                  } catch (err) {
                    triggerToast('Error', 'Network error.', 'alert');
                  } finally {
                    setIsCreatingOnFly(false);
                  }
                }}
                className="flex gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  required
                  placeholder="New Playlist Name"
                  value={newPlaylistName}
                  disabled={isCreatingOnFly}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-brand-violet disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isCreatingOnFly || !newPlaylistName.trim()}
                  className="px-3.5 py-2 rounded-xl bg-brand-violet hover:bg-brand-violet/90 disabled:opacity-50 text-xs font-semibold shrink-0 cursor-pointer text-white flex items-center justify-center"
                >
                  {isCreatingOnFly ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* SONG DETAILS DIALOG */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[99999] backdrop-blur-lg" onClick={(e) => e.stopPropagation()}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass max-w-md w-full rounded-2xl border border-white/10 overflow-hidden text-white"
          >
            {/* Cover art header */}
            <div className="relative h-48 bg-gradient-to-b from-brand-violet/20 to-black/80 flex items-end p-5">
              <img 
                src={song.coverImage || song.coverUrl} 
                alt={song.title} 
                className="absolute inset-0 w-full h-full object-cover opacity-25 blur-sm"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=500&h=500&fit=crop&q=80";
                }}
              />
              <div className="relative z-10 flex gap-4 items-center">
                <img 
                  src={song.coverImage || song.coverUrl} 
                  alt={song.title} 
                  className="w-20 h-20 rounded-xl object-cover shadow-2xl border border-white/10 shrink-0"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=500&h=500&fit=crop&q=80";
                  }}
                />
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-brand-violet/30 border border-brand-violet/40 text-brand-cyan">
                    {song.genre}
                  </span>
                  <h3 className="text-base font-display font-bold leading-tight mt-1.5 truncate max-w-[240px]">{song.title}</h3>
                  <p className="text-xs text-white/60 truncate max-w-[240px]">{song.artist}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-black/40 text-white/50 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Grid properties */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-white/40 block">Album</span>
                  <span className="font-semibold truncate block mt-0.5">{song.album || 'N/A'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-white/40 block">Mood Vibe</span>
                  <span className="font-semibold truncate block mt-0.5">{song.mood || 'N/A'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-white/40 block">Plays</span>
                  <span className="font-semibold block mt-0.5">{(song.plays || 0).toLocaleString()}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-white/40 block">Likes</span>
                  <span className="font-semibold block mt-0.5">{(song.likes || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Audio DNA attributes */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <h4 className="text-[10px] font-mono text-white/40 uppercase tracking-wider flex items-center gap-1">
                  <BarChart2 className="w-3.5 h-3.5 text-brand-cyan" />
                  Acoustic DNA Metrics
                </h4>

                <div className="space-y-2.5 text-xs">
                  {/* Tempo */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-white/60">
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-brand-magenta" /> Tempo (BPM)</span>
                      <span>{song.tempo ? Math.round(song.tempo) : 120} BPM</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-brand-magenta h-full rounded-full" 
                        style={{ width: `${Math.min(100, Math.max(30, ((song.tempo || 120) / 200) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* Energy */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-white/60">
                      <span className="flex items-center gap-1"><Radio className="w-3 h-3 text-brand-cyan" /> Energy Vibe</span>
                      <span>{song.energy ? Math.round(song.energy * 100) : 75}%</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-brand-cyan h-full rounded-full" 
                        style={{ width: `${(song.energy || 0.75) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Acousticness */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-white/60">
                      <span className="flex items-center gap-1"><Info className="w-3 h-3 text-brand-violet" /> Acousticness</span>
                      <span>{song.acousticness ? Math.round(song.acousticness * 100) : 25}%</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-brand-violet h-full rounded-full" 
                        style={{ width: `${(song.acousticness || 0.25) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-black/20 border-t border-white/5 flex justify-end">
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-brand-violet/20 hover:bg-brand-violet/30 border border-brand-violet/35 text-xs font-semibold rounded-xl text-white transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
