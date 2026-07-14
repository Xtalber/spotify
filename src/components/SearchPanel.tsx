import React, { useState, useEffect } from 'react';
import { Search, Play, Pause, Music, Sparkles, Volume2, Heart } from 'lucide-react';
import { Song, Playlist } from '../types';
import SongActionMenu from './SongActionMenu';

interface SearchPanelProps {
  songs: Song[];
  onPlaySong: (song: Song, customQueue?: Song[]) => void;
  onAddToQueue: (song: Song) => void;
  onPlayNext?: (song: Song) => void;
  playlists: Playlist[];
  authToken: string | null;
  refreshUserData: () => void;
  triggerToast: (title: string, message: string, type: 'success' | 'alert' | 'ai') => void;
  likedSongIds: string[];
  onToggleLike: (songId: string) => void;
  currentSong?: Song | null;
  isPlaying?: boolean;
}

export default function SearchPanel({
  songs,
  onPlaySong,
  onAddToQueue,
  onPlayNext,
  playlists,
  authToken,
  refreshUserData,
  triggerToast,
  likedSongIds = [],
  onToggleLike,
  currentSong,
  isPlaying,
}: SearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Filter songs based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(() => {
      const q = searchQuery.toLowerCase();
      const results = songs.filter(
        s =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.album.toLowerCase().includes(q) ||
          s.genre.toLowerCase().includes(q) ||
          s.mood.toLowerCase().includes(q)
      );
      setSearchResults(results);
      setIsSearching(false);
    }, 250); // mock slight debouncing delay for aesthetic feel

    return () => clearTimeout(timeout);
  }, [searchQuery, songs]);

  return (
    <div className="space-y-8 pb-32">
      {/* Search Bar container */}
      <div className="relative max-w-2xl mx-auto space-y-4">
        <h3 className="font-display text-2xl font-bold tracking-tight text-white text-center">
          What do you want to listen to?
        </h3>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs, artists, albums, moods, or genres..."
            className="w-full pl-12 pr-4 py-4 rounded-full glass border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20 transition-all shadow-xl"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Instant Search Results */}
      {searchQuery.trim() ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="font-mono text-xs text-white/40 uppercase tracking-widest">
              {isSearching ? 'Analyzing Grid...' : `Matches Found (${searchResults.length})`}
            </span>
            <span className="font-mono text-[10px] text-brand-violet">Real-Time Synthesis</span>
          </div>

          {isSearching ? (
            // Loading Skeletons
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass p-4 rounded-xl flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-white/5 rounded-lg" />
                    <div className="space-y-1.5 flex-1 max-w-[150px]">
                      <div className="h-3 bg-white/10 rounded w-full" />
                      <div className="h-2.5 bg-white/5 rounded w-2/3" />
                    </div>
                  </div>
                  <div className="h-3 bg-white/5 rounded w-24 hidden sm:block" />
                  <div className="w-8 h-8 bg-white/5 rounded-full" />
                </div>
              ))}
            </div>
          ) : searchResults.length === 0 ? (
            <div className="glass p-12 rounded-2xl text-center space-y-4">
              <p className="text-sm text-white/40 italic">We couldn't find matches for "{searchQuery}"</p>
              <div className="max-w-md mx-auto p-4 rounded-xl bg-brand-violet/5 border border-brand-violet/10 text-[11px] text-white/50 leading-relaxed">
                <Sparkles className="w-4 h-4 text-brand-violet inline mr-1" />
                <strong>Tip:</strong> Try searching by mood tags like <em>relaxed</em> or <em>energetic</em>, or browse general genres like <em>synthwave</em>.
              </div>
            </div>
          ) : (
            // Results List
            <div className="space-y-2">
              {searchResults.map((song, idx) => {
                return (
                  <div
                    key={song.id}
                    className={`glass p-3 rounded-xl flex items-center justify-between gap-4 border group hover:bg-white/5 transition-all ${
                      song.id === currentSong?.id ? 'border-brand-magenta/30 bg-white/5 shadow-md shadow-brand-violet/5' : 'border-white/5'
                    }`}
                  >
                    {/* Song Info Left */}
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
                          onClick={() => onPlaySong(song, searchResults)}
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

                    {/* Album center */}
                    <p className="hidden sm:block text-xs text-white/50 truncate w-1/4">{song.album}</p>

                    {/* Actions and Duration */}
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
              })}
            </div>
          )}
        </div>
      ) : (
        // Pre-search suggestion view
        <div className="space-y-6 max-w-2xl mx-auto text-center pt-8">
          <div className="flex items-center justify-center gap-2">
            <Music className="w-5 h-5 text-white/30" />
            <h4 className="font-display font-bold text-sm text-white/60">Search Suggestions</h4>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {['Sunset', 'Neon', 'Raindrops', 'Lo-Fi', 'Coffee', 'Elena', 'Grid', 'Folk'].map(term => (
              <button
                key={term}
                onClick={() => setSearchQuery(term)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white/70 hover:text-white border border-white/5 transition-all cursor-pointer"
              >
                #{term}
              </button>
            ))}
          </div>

          <div className="p-6 rounded-2xl bg-brand-violet/5 border border-brand-violet/10 space-y-2 mt-8 text-left max-w-xl mx-auto">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-violet" />
              <h5 className="font-display font-semibold text-xs text-white">Interactive Curation</h5>
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed">
              Use queries like <strong>"Synthwave"</strong> or <strong>"Relaxed"</strong>. 
              Our real-time backend updates metadata scores continuously, surfacing high-energy beats or mellow acoustic loops.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
