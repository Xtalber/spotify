import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Song } from '../types';

interface AudioPlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number;
  duration: number;
  volume: number;
  queue: Song[];
  queueIndex: number;
  repeat: boolean;
  shuffle: boolean;
  playbackSpeed: number;
  bufferProgress: number;
  playSong: (song: Song, customQueue?: Song[]) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setVolumeValue: (volume: number) => void;
  setPlaybackSpeedValue: (speed: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setQueueIndexValue: (index: number) => void;
  addToQueue: (song: Song) => void;
  playNext: (song: Song) => void;
  setAuthToken: (token: string | null) => void;
  setRefreshUserData: (fn: (() => void) | null) => void;
  resetPlayer: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(0);
  const [repeat, setRepeat] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [bufferProgress, setBufferProgress] = useState(0);

  // Authentication configuration for logging play history
  const [authToken, setAuthTokenState] = useState<string | null>(null);
  const [refreshUserData, setRefreshUserDataState] = useState<(() => void) | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // State ref to avoid closure issues in event listeners
  const stateRef = useRef({ queue, queueIndex, repeat, shuffle, currentSong, playbackSpeed, authToken });

  useEffect(() => {
    stateRef.current = { queue, queueIndex, repeat, shuffle, currentSong, playbackSpeed, authToken };
  }, [queue, queueIndex, repeat, shuffle, currentSong, playbackSpeed, authToken]);

  // Lazy initialize Audio element
  useEffect(() => {
    const audioEl = new Audio();
    audioRef.current = audioEl;
    audioEl.volume = volume;

    const handleTimeUpdate = () => {
      setCurrentTime(audioEl.currentTime);
      if (audioEl.buffered.length > 0) {
        const bufferedEnd = audioEl.buffered.end(audioEl.buffered.length - 1);
        const durationVal = audioEl.duration || 1;
        setBufferProgress((bufferedEnd / durationVal) * 100);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audioEl.duration || 0);
    };

    const handleEnded = () => {
      const { repeat: rep, queue: q, queueIndex: qIdx, shuffle: shuf } = stateRef.current;
      if (rep) {
        audioEl.currentTime = 0;
        audioEl.play().catch(e => console.log('Repeat audio playback failed:', e));
      } else if (q.length > 0) {
        let nextIdx = qIdx;
        if (shuf) {
          nextIdx = Math.floor(Math.random() * q.length);
        } else {
          nextIdx = (qIdx + 1) % q.length;
        }
        
        // Use state updater to trigger re-renders
        setQueueIndex(nextIdx);
        const nextSong = q[nextIdx];
        setCurrentSong(nextSong);
        
        // Track analytics & play next song
        trackPlayback(nextSong);
        
        const finalUrl = nextSong.audioUrl.startsWith('http')
          ? nextSong.audioUrl
          : `/api/stream/${nextSong.id}`;

        audioEl.src = finalUrl;
        audioEl.load();
        audioEl.playbackRate = stateRef.current.playbackSpeed;
        setIsPlaying(true);
        audioEl.play().catch(e => console.log('Audio playback interaction error on ended:', e));
      } else {
        setIsPlaying(false);
      }
    };

    audioEl.addEventListener('timeupdate', handleTimeUpdate);
    audioEl.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioEl.addEventListener('ended', handleEnded);

    return () => {
      audioEl.pause();
      audioEl.removeEventListener('timeupdate', handleTimeUpdate);
      audioEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioEl.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Sync state token / ref callbacks
  const setAuthToken = (token: string | null) => {
    setAuthTokenState(token);
  };

  const setRefreshUserData = (fn: (() => void) | null) => {
    setRefreshUserDataState(() => fn);
  };

  // Helper to record history and stats
  const trackPlayback = (song: Song) => {
    const token = stateRef.current.authToken;
    if (token) {
      // Plays count Increment
      fetch(`/api/songs/${song.id}/play`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(err => console.error('Failed to track plays count:', err));

      // Play history logs
      fetch('/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ songId: song.id })
      }).then(() => {
        if (refreshUserData) refreshUserData();
      }).catch(err => console.log('History track failure:', err));
    }
  };

  const playSong = (song: Song, customQueue: Song[] = []) => {
    const activeSong = currentSong;
    
    if (activeSong && activeSong.id === song.id) {
      // Toggle play/pause for the exact same song
      togglePlay();
    } else {
      // Stop previous is automatic on changing src of the same HTML5 Audio element
      setCurrentSong(song);
      
      if (customQueue.length > 0) {
        setQueue(customQueue);
        const idx = customQueue.findIndex(s => s.id === song.id);
        setQueueIndex(idx !== -1 ? idx : 0);
      } else {
        setQueue([song]);
        setQueueIndex(0);
      }

      trackPlayback(song);

      const finalUrl = song.audioUrl.startsWith('http')
        ? song.audioUrl
        : `/api/stream/${song.id}`;

      if (audioRef.current) {
        audioRef.current.src = finalUrl;
        audioRef.current.load();
        audioRef.current.playbackRate = playbackSpeed;
        setIsPlaying(true);
        audioRef.current.play().catch(e => {
          console.log('Audio playback waiting for user interaction:', e);
        });
      }
    }
  };

  const togglePlay = () => {
    if (!currentSong) return;
    setIsPlaying(prev => {
      const nextVal = !prev;
      if (audioRef.current) {
        if (nextVal) {
          audioRef.current.play().catch(() => {
            setIsPlaying(false);
          });
        } else {
          audioRef.current.pause();
        }
      }
      return nextVal;
    });
  };

  const next = () => {
    const { queue: q, queueIndex: qIdx, shuffle: shuf, playbackSpeed: speed } = stateRef.current;
    if (q.length === 0) return;
    
    let nextIdx = qIdx;
    if (shuf) {
      nextIdx = Math.floor(Math.random() * q.length);
    } else {
      nextIdx = (qIdx + 1) % q.length;
    }
    
    setQueueIndex(nextIdx);
    const song = q[nextIdx];
    setCurrentSong(song);
    trackPlayback(song);
    
    const finalUrl = song.audioUrl.startsWith('http')
      ? song.audioUrl
      : `/api/stream/${song.id}`;

    if (audioRef.current) {
      audioRef.current.src = finalUrl;
      audioRef.current.load();
      audioRef.current.playbackRate = speed;
      setIsPlaying(true);
      audioRef.current.play().catch(e => console.log(e));
    }
  };

  const prev = () => {
    const { queue: q, queueIndex: qIdx, playbackSpeed: speed } = stateRef.current;
    if (q.length === 0) return;
    
    const prevIdx = qIdx === 0 ? q.length - 1 : qIdx - 1;
    setQueueIndex(prevIdx);
    const song = q[prevIdx];
    setCurrentSong(song);
    trackPlayback(song);
    
    const finalUrl = song.audioUrl.startsWith('http')
      ? song.audioUrl
      : `/api/stream/${song.id}`;

    if (audioRef.current) {
      audioRef.current.src = finalUrl;
      audioRef.current.load();
      audioRef.current.playbackRate = speed;
      setIsPlaying(true);
      audioRef.current.play().catch(e => console.log(e));
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const setVolumeValue = (vol: number) => {
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const setPlaybackSpeedValue = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const toggleShuffle = () => {
    setShuffle(prev => !prev);
  };

  const toggleRepeat = () => {
    setRepeat(prev => !prev);
  };

  const setQueueIndexValue = (index: number) => {
    const { queue: q, playbackSpeed: speed } = stateRef.current;
    if (index >= 0 && index < q.length) {
      setQueueIndex(index);
      const song = q[index];
      setCurrentSong(song);
      trackPlayback(song);

      const finalUrl = song.audioUrl.startsWith('http')
        ? song.audioUrl
        : `/api/stream/${song.id}`;

      if (audioRef.current) {
        audioRef.current.src = finalUrl;
        audioRef.current.load();
        audioRef.current.playbackRate = speed;
        setIsPlaying(true);
        audioRef.current.play().catch(e => console.log(e));
      }
    }
  };

  const addToQueue = (song: Song) => {
    setQueue(prev => [...prev, song]);
  };

  const playNext = (song: Song) => {
    const { queueIndex: qIdx } = stateRef.current;
    setQueue(prev => {
      if (prev.length === 0) {
        return [song];
      }
      const newQueue = [...prev];
      newQueue.splice(qIdx + 1, 0, song);
      return newQueue;
    });
  };

  // Configure Media Session API for OS integration
  useEffect(() => {
    if (!currentSong) return;
    
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album,
        artwork: [
          { src: currentSong.coverImage || currentSong.coverUrl, sizes: '300x300', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
      navigator.mediaSession.setActionHandler('nexttrack', () => next());
      navigator.mediaSession.setActionHandler('previoustrack', () => prev());
    }
  }, [currentSong]);

  const handleSetIsPlaying = (playing: boolean) => {
    setIsPlaying(playing);
    if (audioRef.current) {
      if (playing) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      } else {
        audioRef.current.pause();
      }
    }
  };

  const resetPlayer = () => {
    setCurrentSong(null);
    setIsPlaying(false);
    setQueue([]);
    setQueueIndex(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  };

  return (
    <AudioPlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        setIsPlaying: handleSetIsPlaying,
        currentTime,
        duration,
        volume,
        queue,
        queueIndex,
        repeat,
        shuffle,
        playbackSpeed,
        bufferProgress,
        playSong,
        togglePlay,
        next,
        prev,
        seek,
        setVolumeValue,
        setPlaybackSpeedValue,
        toggleShuffle,
        toggleRepeat,
        setQueueIndexValue,
        addToQueue,
        playNext,
        setAuthToken,
        setRefreshUserData,
        resetPlayer,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
}
