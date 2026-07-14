import React from 'react';
import { Play, Pause, Flame, Calendar, Sparkles, AudioLines, Music } from 'lucide-react';
import { Song, User } from '../types';

interface LandingHeroProps {
  user: User | null;
  trendingSongs: Song[];
  newReleases: Song[];
  onPlaySong: (song: Song, customQueue?: Song[]) => void;
  setCurrentTab: (tab: string) => void;
  currentSong?: Song | null;
  isPlaying?: boolean;
}

export default function LandingHero({
  user,
  trendingSongs,
  newReleases,
  onPlaySong,
  setCurrentTab,
  currentSong,
  isPlaying,
}: LandingHeroProps) {
  // Determine time-of-day greeting
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const features = [
    {
      icon: Sparkles,
      title: 'AI Smart Curator',
      desc: 'Melodia uses advanced cosine similarity and Gemini AI synthesis to curate bespoke audiophile playlists tailored to your exact mood.',
    },
    {
      icon: AudioLines,
      title: 'Gapless Range Streaming',
      desc: 'Optimized ranges buffer audio instantly, ensuring pristine playback, seamless seeking, and zero streaming stutter.',
    },
    {
      icon: Music,
      title: 'Studio Cloud Space',
      desc: 'Upload your own high-fidelity audio tracks and custom cover art, immediately syncing them to your global streaming account.',
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Jenkins',
      role: 'Sound Designer',
      quote: 'Melodia completely blows Spotify out of the water. The glassmorphic design and the instant AI playlist commentary make streaming feel deeply personal.'
    },
    {
      name: 'Marcus Chen',
      role: 'Music Producer',
      quote: 'Having the ability to upload my demo MP3s directly to my streaming dashboard with absolute zero lag is a dream come true.'
    }
  ];

  return (
    <div className="space-y-10 pb-32">
      {/* Hero Banner Area */}
      <div className="relative rounded-3xl overflow-hidden p-8 md:p-12 bg-gradient-to-br from-brand-violet/25 via-brand-magenta/15 to-transparent border border-white/5 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-violet/10 blur-[100px] rounded-full -z-10 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-cyan/5 blur-[120px] rounded-full -z-10" />

        <div className="max-w-2xl space-y-6">
          <span className="font-mono text-xs text-brand-magenta font-semibold tracking-widest uppercase flex items-center gap-2">
            <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
            The Future of Acoustic Streaming
          </span>

          <h2 className="font-display font-bold text-4xl md:text-5xl text-white tracking-tight leading-none text-glow">
            {getGreeting()},{' '}
            <span className="text-brand-gradient">{user ? user.username : 'Audiophile'}</span>
          </h2>

          <p className="text-sm md:text-base text-white/60 leading-relaxed max-w-xl">
            Melodia combines state-of-the-art full-stack audio streaming architectures with Gemini AI. 
            Experience zero-stutter gapless playback paired with bespoke cognitive curations.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => setCurrentTab('explore')}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-brand-violet to-brand-magenta text-white text-sm font-semibold hover:opacity-90 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-violet/30"
            >
              Start Exploring
            </button>
            <button
              onClick={() => setCurrentTab('library')}
              className="px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-semibold transition-all"
            >
              Curate with AI
            </button>
          </div>
        </div>
      </div>

      {/* Trending Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-brand-magenta" />
            Trending Right Now
          </h3>
          <button onClick={() => setCurrentTab('explore')} className="text-xs text-brand-cyan hover:underline font-medium">
            View All Charts
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {trendingSongs.slice(0, 5).map((song) => {
            const isCurrent = song.id === currentSong?.id;
            return (
              <div
                key={song.id}
                className={`glass-card p-4 rounded-2xl cursor-pointer group relative overflow-hidden ${
                  isCurrent ? 'border-brand-magenta/30 bg-white/5 shadow-lg shadow-brand-violet/10' : ''
                }`}
                onClick={() => onPlaySong(song, trendingSongs)}
              >
                <div className="relative aspect-square rounded-xl overflow-hidden mb-3.5">
                  <img
                    src={song.coverImage || song.coverUrl}
                    alt={song.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=500&h=500&fit=crop&q=80";
                    }}
                  />
                  <div className={`absolute inset-0 bg-black/45 transition-opacity duration-200 flex items-center justify-center ${
                    isCurrent ? 'opacity-100 bg-brand-violet/20' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    <div className={`w-12 h-12 rounded-full bg-brand-violet text-white flex items-center justify-center transition-transform duration-300 shadow-xl shadow-brand-violet/40 ${
                      isCurrent ? 'scale-100' : 'transform translate-y-3 group-hover:translate-y-0'
                    }`}>
                      {isCurrent && isPlaying ? (
                        <Pause className="w-6 h-6 fill-white" />
                      ) : (
                        <Play className="w-6 h-6 fill-white translate-x-0.5" />
                      )}
                    </div>
                  </div>
                </div>
                <h4 className={`text-xs font-semibold truncate mb-0.5 ${isCurrent ? 'text-brand-magenta text-glow' : 'text-white'}`}>{song.title}</h4>
                <p className={`text-[10px] truncate mb-1 ${isCurrent ? 'text-brand-magenta/70' : 'text-white/50'}`}>{song.artist}</p>
                <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full border ${
                  isCurrent 
                    ? 'bg-brand-magenta/20 text-brand-magenta border-brand-magenta/30' 
                    : 'bg-brand-violet/15 text-brand-violet border-brand-violet/10'
                }`}>
                  {song.genre}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Releases Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-brand-cyan" />
            Newly Synthesized Releases
          </h3>
          <button onClick={() => setCurrentTab('explore')} className="text-xs text-brand-cyan hover:underline font-medium">
            Browse All Releases
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {newReleases.slice(0, 5).map((song) => {
            const isCurrent = song.id === currentSong?.id;
            return (
              <div
                key={song.id}
                className={`glass-card p-4 rounded-2xl cursor-pointer group relative overflow-hidden ${
                  isCurrent ? 'border-brand-magenta/30 bg-white/5 shadow-lg shadow-brand-violet/10' : ''
                }`}
                onClick={() => onPlaySong(song, newReleases)}
              >
                <div className="relative aspect-square rounded-xl overflow-hidden mb-3.5">
                  <img
                    src={song.coverImage || song.coverUrl}
                    alt={song.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=500&h=500&fit=crop&q=80";
                    }}
                  />
                  <div className={`absolute inset-0 bg-black/45 transition-opacity duration-200 flex items-center justify-center ${
                    isCurrent ? 'opacity-100 bg-brand-violet/20' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    <div className={`w-12 h-12 rounded-full bg-brand-violet text-white flex items-center justify-center transition-transform duration-300 shadow-xl shadow-brand-violet/40 ${
                      isCurrent ? 'scale-100' : 'transform translate-y-3 group-hover:translate-y-0'
                    }`}>
                      {isCurrent && isPlaying ? (
                        <Pause className="w-6 h-6 fill-white" />
                      ) : (
                        <Play className="w-6 h-6 fill-white translate-x-0.5" />
                      )}
                    </div>
                  </div>
                </div>
                <h4 className={`text-xs font-semibold truncate mb-0.5 ${isCurrent ? 'text-brand-magenta text-glow' : 'text-white'}`}>{song.title}</h4>
                <p className={`text-[10px] truncate mb-1 ${isCurrent ? 'text-brand-magenta/70' : 'text-white/50'}`}>{song.artist}</p>
                <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full border ${
                  isCurrent 
                    ? 'bg-brand-magenta/25 text-brand-magenta border-brand-magenta/20' 
                    : 'bg-brand-magenta/15 text-brand-magenta border border-brand-magenta/10'
                }`}>
                  {song.genre}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Technology Bento Grid */}
      <div className="space-y-6 pt-6">
        <h3 className="font-display text-xl font-bold tracking-tight text-white text-center">
          Engineered for Pure Acoustics
        </h3>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} className="glass p-6 rounded-2xl space-y-4 border border-white/5 hover:border-white/10 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-brand-violet/15 border border-brand-violet/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-brand-violet animate-pulse" />
                </div>
                <h4 className="font-display font-semibold text-sm text-white">{feature.title}</h4>
                <p className="text-xs text-white/50 leading-relaxed">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Testimonials */}
      <div className="space-y-6 pt-6">
        <h3 className="font-display text-xl font-bold tracking-tight text-white text-center">
          What Our Listeners Say
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map((test, idx) => (
            <div key={idx} className="glass p-6 rounded-2xl relative border border-white/5 italic">
              <span className="absolute top-2 right-4 text-white/5 font-serif text-6xl">“</span>
              <p className="text-xs text-white/70 leading-relaxed mb-4">"{test.quote}"</p>
              <div className="flex items-center gap-3 not-italic">
                <div className="w-8 h-8 rounded-full bg-brand-cyan/20 flex items-center justify-center border border-brand-cyan/30 text-xs text-brand-cyan font-bold font-display">
                  {test.name[0]}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{test.name}</p>
                  <p className="text-[10px] text-white/40 font-mono uppercase">{test.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
