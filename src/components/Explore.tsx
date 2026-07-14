import React, { useState } from 'react';
import { Compass, User, Play, Pause, Sparkles, Filter, Music, Heart } from 'lucide-react';
import { Song, Genre, Artist, Playlist } from '../types';
import SongActionMenu from './SongActionMenu';

interface ExploreProps {
  songs: Song[];
  genres: Genre[];
  artists: Artist[];
  onPlaySong: (song: Song, customQueue?: Song[]) => void;
  playlists: Playlist[];
  authToken: string | null;
  refreshUserData: () => void;
  triggerToast: (title: string, message: string, type: 'success' | 'alert' | 'ai') => void;
  onAddToQueue: (song: Song) => void;
  onPlayNext?: (song: Song) => void;
  likedSongIds: string[];
  onToggleLike: (songId: string) => void;
  currentSong?: Song | null;
  isPlaying?: boolean;
}

export default function Explore({
  songs,
  genres,
  artists,
  onPlaySong,
  playlists,
  authToken,
  refreshUserData,
  triggerToast,
  onAddToQueue,
  onPlayNext,
  likedSongIds = [],
  onToggleLike,
  currentSong,
  isPlaying,
}: ExploreProps) {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  // Filter songs based on explore filters
  const filteredSongs = songs.filter(song => {
    const genreMatch = selectedGenre ? song.genre === selectedGenre : true;
    const moodMatch = selectedMood ? song.mood.toLowerCase() === selectedMood.toLowerCase() : true;
    return genreMatch && moodMatch;
  });

  const moods = ['Energetic', 'Relaxed', 'Melancholic', 'Cozy', 'Dark Synth'];

  return (
    <div className="space-y-10 pb-32">
      {/* Genres Section */}
      <div className="space-y-4">
        <h3 className="font-display text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Compass className="w-5 h-5 text-brand-violet" />
          Vibe Genres
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {/* "All" card */}
          <div
            onClick={() => {
              setSelectedGenre(null);
              setSelectedMood(null);
            }}
            className={`cursor-pointer p-5 rounded-2xl h-24 flex items-center justify-center font-display font-bold text-sm tracking-wide text-white border transition-all ${
              !selectedGenre && !selectedMood
                ? 'bg-gradient-to-br from-brand-violet to-brand-magenta border-white/20 shadow-lg shadow-brand-violet/25'
                : 'bg-white/5 border-white/5 hover:bg-white/10'
            }`}
          >
            Clear Filters
          </div>

          {genres.map((genre) => {
            const isSelected = selectedGenre === genre.name;
            return (
              <div
                key={genre.id}
                onClick={() => {
                  setSelectedGenre(genre.name);
                  setSelectedMood(null); // Clear mood if filtering by genre
                }}
                className={`cursor-pointer p-5 rounded-2xl h-24 flex flex-col justify-between border transition-all relative overflow-hidden group ${
                  isSelected
                    ? `bg-gradient-to-br ${genre.color} border-white/20 shadow-lg shadow-white/10`
                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                }`}
              >
                {/* Background glow effects */}
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="font-display font-bold text-sm text-white relative z-10">{genre.name}</span>
                <span className="font-mono text-[9px] text-white/40 block relative z-10 uppercase tracking-widest">
                  {songs.filter(s => s.genre === genre.name).length} Tracks
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mood/Energy Quick Filters */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-brand-magenta" />
          <h3 className="font-display text-xs font-bold uppercase tracking-widest text-white/50">
            Acoustic Mood Filter
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {moods.map((mood) => {
            const isSelected = selectedMood?.toLowerCase() === mood.toLowerCase();
            return (
              <button
                key={mood}
                onClick={() => {
                  setSelectedMood(isSelected ? null : mood);
                  setSelectedGenre(null); // Clear genre if filtering by mood
                }}
                className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${
                  isSelected
                    ? 'bg-brand-magenta text-white border-brand-magenta/30 shadow-md shadow-brand-magenta/25'
                    : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/5'
                }`}
              >
                {mood}
              </button>
            );
          })}
        </div>
      </div>

      {/* Popular Artists */}
      <div className="space-y-4">
        <h3 className="font-display text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <User className="w-5 h-5 text-brand-cyan" />
          Popular Resident Artists
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {artists.map((artist) => (
            <div key={artist.id} className="glass p-5 rounded-2xl flex items-center gap-4 border border-white/5 hover:border-white/10 transition-colors">
              <img
                src={artist.avatarUrl}
                alt={artist.name}
                className="w-16 h-16 rounded-full object-cover border border-brand-cyan/20 shrink-0"
              />
              <div className="overflow-hidden space-y-1">
                <h4 className="font-display font-bold text-sm text-white truncate">{artist.name}</h4>
                <p className="text-[10px] text-brand-cyan font-mono tracking-wide">
                  {artist.monthlyListeners.toLocaleString()} Monthly Listeners
                </p>
                <p className="text-[10px] text-white/50 line-clamp-2 leading-relaxed">
                  {artist.bio}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Matching Tracks catalog */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <Music className="w-5 h-5 text-white/40" />
            Catalog Results ({filteredSongs.length})
          </h3>
          {(selectedGenre || selectedMood) && (
            <button
              onClick={() => {
                setSelectedGenre(null);
                setSelectedMood(null);
              }}
              className="text-xs text-brand-magenta hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {filteredSongs.length === 0 ? (
          <div className="glass p-12 rounded-2xl text-center space-y-2">
            <p className="text-sm text-white/40 italic">No tracks match your filtered criteria.</p>
            <p className="text-xs text-white/30">Try clearing filters or check back later!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSongs.map((song, idx) => {
              return (
                <div
                  key={song.id}
                  className={`glass-card p-3 rounded-xl flex items-center justify-between gap-4 border group hover:bg-white/5 transition-all ${
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
                        onClick={() => onPlaySong(song, filteredSongs)}
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

                  {/* Album & Genre center */}
                  <div className="hidden sm:flex items-center gap-4 w-1/3 overflow-hidden">
                    <p className="text-xs text-white/50 truncate flex-1">{song.album}</p>
                    <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 uppercase">
                      {song.genre}
                    </span>
                  </div>

                  {/* Duration and Menu right */}
                  <div className="flex items-center gap-4 shrink-0 font-mono text-xs text-white/40 select-none">
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
    </div>
  );
}
