import React, { useState, useEffect } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat,
  Volume2, VolumeX, ListMusic, Gauge, ChevronUp, ChevronDown, Check, Heart, MoreHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Song } from '../types';
import { useAudioPlayer } from '../context/AudioPlayerContext';

interface BottomPlayerProps {
  likedSongIds: string[];
  onToggleLike: (songId: string) => void;
}

export default function BottomPlayer({
  likedSongIds = [],
  onToggleLike,
}: BottomPlayerProps) {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    queue,
    queueIndex,
    repeat,
    shuffle,
    playbackSpeed,
    bufferProgress,
    togglePlay,
    next: onNext,
    prev: onPrev,
    seek,
    setVolumeValue,
    setPlaybackSpeedValue,
    toggleShuffle,
    toggleRepeat,
    setQueueIndexValue,
  } = useAudioPlayer();

  const [isMuted, setIsMuted] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const seekRelative = (seconds: number) => {
    const newTime = Math.min(Math.max(0, currentTime + seconds), duration);
    seek(newTime);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if the user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekRelative(10); // Seek 10s forward
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekRelative(-10); // Seek 10s backward
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsMuted(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, currentTime, duration]);

  // Handle Mute toggle
  useEffect(() => {
    if (isMuted) {
      setVolumeValue(0);
    } else {
      setVolumeValue(volume || 0.8);
    }
  }, [isMuted]);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekValue = parseFloat(e.target.value);
    seek(seekValue);
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeedValue(speed);
    setShowSpeedMenu(false);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isPlayerVisible = !!currentSong;

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 h-[calc(76px+env(safe-area-inset-bottom))] md:h-24 glass border-t border-white/5 flex flex-col justify-between px-3 md:px-6 py-1.5 md:py-2 z-50 transition-all duration-500 ease-in-out ${
        isPlayerVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* -------------------- DESKTOP PLAYER ROW (>= 768px) -------------------- */}
      <div className="hidden md:flex items-center justify-between h-full gap-4">
        {/* Track info Left */}
        <div className="flex items-center gap-3 w-1/4 min-w-[180px]">
          {currentSong ? (
            <>
              <div className="relative group shrink-0">
                <img
                  src={currentSong.coverImage || currentSong.coverUrl}
                  alt={currentSong.title}
                  className="w-12 h-12 rounded-lg object-cover border border-white/10"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=500&h=500&fit=crop&q=80";
                  }}
                />
                <div className="absolute inset-0 bg-brand-violet/20 blur-md rounded-lg -z-10 animate-pulse" />
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-semibold text-white truncate hover:underline cursor-pointer">{currentSong.title}</p>
                <p className="text-xs text-white/50 truncate">{currentSong.artist}</p>
              </div>
              <button
                onClick={() => onToggleLike(currentSong.id)}
                className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white shrink-0"
                title={likedSongIds.includes(currentSong.id) ? "Unlike" : "Like"}
              >
                <Heart className={`w-4 h-4 ${likedSongIds.includes(currentSong.id) ? 'fill-brand-magenta text-brand-magenta border-transparent' : ''}`} />
              </button>
            </>
          ) : (
            <p className="text-xs text-white/30 italic">No track selected</p>
          )}
        </div>

        {/* Controls Center */}
        <div className="flex flex-col items-center gap-2 max-w-xl w-2/4">
          {/* Top buttons */}
          <div className="flex items-center gap-6">
            <button
              onClick={toggleShuffle}
              className={`p-1.5 rounded-lg transition-colors ${shuffle ? 'text-brand-magenta' : 'text-white/40 hover:text-white'}`}
              title="Shuffle queue"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={onPrev}
              disabled={!currentSong}
              className="p-1.5 rounded-lg text-white/60 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={togglePlay}
              disabled={!currentSong}
              className="w-10 h-10 rounded-full bg-brand-violet text-white flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-md shadow-brand-violet/20"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white translate-x-0.5" />}
            </button>

            <button
              onClick={onNext}
              disabled={!currentSong}
              className="p-1.5 rounded-lg text-white/60 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <button
              onClick={toggleRepeat}
              className={`p-1.5 rounded-lg transition-colors ${repeat ? 'text-brand-magenta' : 'text-white/40 hover:text-white'}`}
              title="Repeat track"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3 w-full text-[10px] font-mono text-white/40 select-none">
            <span>{formatTime(currentTime)}</span>
            <div className="relative flex-1 group py-2">
              {/* Buffering Indicator */}
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-white/10 rounded-full pointer-events-none transition-all"
                style={{ width: `${bufferProgress}%` }}
              />
              <input
                type="range"
                min="0"
                max={duration || 1}
                value={currentTime}
                onChange={handleSeekChange}
                disabled={!currentSong}
                className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-brand-violet outline-none hover:accent-brand-magenta transition-all"
                style={{
                  background: `linear-gradient(to right, #8b5cf6 0%, #ff007f ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.05) ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.05) 100%)`
                }}
              />
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Utilities Right */}
        <div className="flex items-center justify-end gap-4 w-1/4 min-w-[200px] select-none">
          {/* Playback speed selector */}
          <div className="relative">
            <button
              onClick={() => {
                setShowSpeedMenu(!showSpeedMenu);
                setShowQueue(false);
              }}
              disabled={!currentSong}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5 text-xs font-mono disabled:opacity-30 disabled:pointer-events-none"
              title="Playback speed"
            >
              <Gauge className="w-4 h-4" />
              <span>{playbackSpeed}x</span>
            </button>

            {showSpeedMenu && (
              <div className="absolute bottom-12 right-0 glass border border-white/10 rounded-xl p-1 w-24 shadow-xl z-50">
                {speedOptions.map(option => (
                  <button
                    key={option}
                    onClick={() => changeSpeed(option)}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-mono text-white/80 hover:bg-white/10 transition-colors"
                  >
                    <span>{option}x</span>
                    {playbackSpeed === option && <Check className="w-3 h-3 text-brand-magenta" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-brand-magenta" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolumeValue(parseFloat(e.target.value));
                setIsMuted(false);
              }}
              className="w-16 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-brand-violet outline-none"
            />
          </div>

          {/* Queue Button */}
          <button
            onClick={() => {
              setShowQueue(!showQueue);
              setShowSpeedMenu(false);
            }}
            className={`p-2 rounded-lg hover:bg-white/5 transition-all flex items-center justify-center ${showQueue ? 'text-brand-magenta bg-white/5' : 'text-white/60 hover:text-white'}`}
            title="Queue"
          >
            <ListMusic className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* -------------------- MOBILE PLAYER ROW (< 768px) -------------------- */}
      <div className="flex md:hidden flex-col justify-between h-full w-full">
        {/* Top half: Artwork, Info, Playback Controls, Like, Queue & More */}
        <div className="flex items-center justify-between gap-2.5 min-w-0">
          
          {/* Song Info (with 48px artwork) */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {currentSong ? (
              <>
                <img
                  src={currentSong.coverImage || currentSong.coverUrl}
                  alt={currentSong.title}
                  className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0 shadow-lg shadow-black/40"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=500&h=500&fit=crop&q=80";
                  }}
                />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-[13px] font-semibold text-white truncate leading-tight">{currentSong.title}</p>
                  <p className="text-[11px] text-white/50 truncate leading-none mt-1">{currentSong.artist}</p>
                </div>
                {/* Like Button */}
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => onToggleLike(currentSong.id)}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-white/40 hover:text-white shrink-0 transition-colors"
                  title={likedSongIds.includes(currentSong.id) ? "Unlike" : "Like"}
                >
                  <Heart className={`w-4 h-4 ${likedSongIds.includes(currentSong.id) ? 'fill-brand-magenta text-brand-magenta border-transparent' : 'text-white/40'}`} />
                </motion.button>
              </>
            ) : (
              <p className="text-xs text-white/30 italic truncate">No track selected</p>
            )}
          </div>

          {/* Controls Right */}
          <div className="flex items-center gap-1 shrink-0 select-none">
            {/* Prev */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onPrev}
              disabled={!currentSong}
              className="p-1.5 rounded-lg text-white/60 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <SkipBack className="w-4.5 h-4.5" />
            </motion.button>

            {/* Play/Pause (Larger center button) */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={togglePlay}
              disabled={!currentSong}
              className="w-9 h-9 rounded-full bg-brand-violet text-white flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-md shadow-brand-violet/25"
            >
              {isPlaying ? <Pause className="w-4.5 h-4.5 fill-white" /> : <Play className="w-4.5 h-4.5 fill-white translate-x-0.5" />}
            </motion.button>

            {/* Next */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onNext}
              disabled={!currentSong}
              className="p-1.5 rounded-lg text-white/60 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <SkipForward className="w-4.5 h-4.5" />
            </motion.button>

            {/* Queue Button */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => {
                setShowQueue(!showQueue);
                setShowMoreMenu(false);
              }}
              className={`p-1.5 rounded-lg transition-all ${showQueue ? 'text-brand-magenta bg-white/5' : 'text-white/60 hover:text-white'}`}
              title="Queue"
            >
              <ListMusic className="w-4.5 h-4.5" />
            </motion.button>

            {/* More Menu Trigger */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => {
                setShowMoreMenu(!showMoreMenu);
                setShowQueue(false);
              }}
              className={`p-1.5 rounded-lg transition-all ${showMoreMenu ? 'text-brand-magenta bg-white/5' : 'text-white/60 hover:text-white'}`}
              title="More Options"
            >
              <MoreHorizontal className="w-4.5 h-4.5" />
            </motion.button>
          </div>
        </div>

        {/* Bottom half: Progress bar (Current Time -------- Slider -------- Duration) */}
        <div className="flex items-center gap-2 w-full text-[9px] font-mono text-white/40 select-none px-0.5 pb-0.5">
          <span className="shrink-0 w-8 text-left">{formatTime(currentTime)}</span>
          <div className="relative flex-1 py-1 group">
            {/* Buffering Indicator */}
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-white/10 rounded-full pointer-events-none transition-all"
              style={{ width: `${bufferProgress}%` }}
            />
            <input
              type="range"
              min="0"
              max={duration || 1}
              value={currentTime}
              onChange={handleSeekChange}
              disabled={!currentSong}
              className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-brand-violet outline-none hover:accent-brand-magenta transition-all"
              style={{
                background: `linear-gradient(to right, #8b5cf6 0%, #ff007f ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.05) ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.05) 100%)`
              }}
            />
          </div>
          <span className="shrink-0 w-8 text-right">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Speed Selector Menu - Mobile Popover */}
      {showMoreMenu && (
        <div className="absolute bottom-[80px] right-3 glass border border-white/10 rounded-2xl p-1.5 w-40 shadow-2xl z-50 flex flex-col gap-0.5 animate-slideUp">
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider font-semibold text-white/30 font-display">Speed Controls</div>
          {speedOptions.map(option => (
            <button
              key={option}
              onClick={() => changeSpeed(option)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-mono text-white/80 hover:bg-white/10 transition-colors"
            >
              <span>{option}x</span>
              {playbackSpeed === option && <Check className="w-3.5 h-3.5 text-brand-magenta" />}
            </button>
          ))}
        </div>
      )}

      {/* Drawer Overlay for Queue (persisted in slide panel) */}
      {showQueue && (
        <div className="absolute bottom-[80px] md:bottom-28 right-3 w-80 md:w-96 max-h-[300px] md:max-h-[400px] overflow-y-auto glass border border-white/10 rounded-2xl p-4 shadow-2xl z-50 scrollbar-thin">
          <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
            <h4 className="font-display font-bold text-xs text-white uppercase tracking-wider">Play Sequence Queue</h4>
            <span className="text-[10px] font-mono text-white/40">{queue.length} Tracks</span>
          </div>

          {queue.length === 0 ? (
            <p className="text-xs text-white/30 italic text-center py-4">Queue is empty</p>
          ) : (
            <div className="space-y-1.5">
              {queue.map((song, idx) => {
                const isCurrent = idx === queueIndex;
                return (
                  <div
                    key={song.id + '-' + idx}
                    onClick={() => setQueueIndexValue(idx)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all ${
                      isCurrent
                        ? 'bg-gradient-to-r from-brand-violet/20 to-brand-magenta/10 border border-brand-violet/20'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <img
                      src={song.coverImage || song.coverUrl}
                      alt={song.title}
                      className="w-8 h-8 rounded object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?w=500&h=500&fit=crop&q=80";
                      }}
                    />
                    <div className="overflow-hidden flex-1">
                      <p className={`text-xs font-medium truncate ${isCurrent ? 'text-brand-magenta' : 'text-white'}`}>
                        {song.title}
                      </p>
                      <p className="text-[10px] text-white/50 truncate">{song.artist}</p>
                    </div>
                    {isCurrent && (
                      <span className="font-mono text-[9px] text-brand-violet uppercase font-semibold">Playing</span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLike(song.id);
                      }}
                      className="p-1 hover:bg-white/5 rounded-lg transition-colors text-white/30 hover:text-white shrink-0"
                      title={likedSongIds.includes(song.id) ? "Unlike" : "Like"}
                    >
                      <Heart className={`w-3.5 h-3.5 ${likedSongIds.includes(song.id) ? 'fill-brand-magenta text-brand-magenta border-transparent' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
