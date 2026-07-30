import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';

function formatAudioTime(ms) {
  if (!ms || ms < 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export function useAudioPlayer(audioUrl) {
  const soundRef = useRef(null);
  const isSeekingRef = useRef(false);
  const loadingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioPosition, setAudioPosition] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);

  const hasValidAudio =
    audioUrl && typeof audioUrl === 'string' && audioUrl.startsWith('http');

  const unloadSound = useCallback(async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    if (!sound) return;
    try {
      await sound.stopAsync();
      await sound.unloadAsync();
    } catch (error) {
      console.warn('Error al limpiar audio:', error);
    }
    setIsPlaying(false);
    setAudioPosition(0);
    setAudioDuration(0);
    if (typeof window !== 'undefined') window.__PWA_AUDIO_PLAYING__ = false;
  }, []);

  const attachPlaybackListener = useCallback((sound) => {
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) return;

      if (status.durationMillis) {
        setAudioDuration(status.durationMillis);
      }

      if (!isSeekingRef.current && status.positionMillis != null) {
        setAudioPosition(status.positionMillis);
      }

      if (!status.isPlaying && status.didJustFinish) {
        setIsPlaying(false);
        setAudioPosition(0);
        if (typeof window !== 'undefined') window.__PWA_AUDIO_PLAYING__ = false;
        return;
      }

      setIsPlaying(status.isPlaying);
      if (typeof window !== 'undefined') {
        window.__PWA_AUDIO_PLAYING__ = Boolean(status.isPlaying);
      }
    });
  }, []);

  const loadSound = useCallback(async () => {
    if (!hasValidAudio || soundRef.current || loadingRef.current) {
      return soundRef.current;
    }

    loadingRef.current = true;
    setAudioLoading(true);
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false, progressUpdateIntervalMillis: 500 }
      );
      attachPlaybackListener(sound);
      soundRef.current = sound;
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        setAudioDuration(status.durationMillis || 0);
        setAudioPosition(status.positionMillis || 0);
      }
      return sound;
    } finally {
      loadingRef.current = false;
      setAudioLoading(false);
    }
  }, [attachPlaybackListener, audioUrl, hasValidAudio]);

  useEffect(() => {
    unloadSound();
  }, [audioUrl, unloadSound]);

  const togglePlayback = useCallback(async () => {
    if (!hasValidAudio) {
      Alert.alert('Sin audio', 'No hay audio disponible para este día.');
      return;
    }

    try {
      const sound = await loadSound();
      if (!sound) return;

      const status = await sound.getStatusAsync();
      if (!status.isLoaded) {
        await unloadSound();
        await loadSound();
        return;
      }

      if (status.isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
        return;
      }

      await sound.playAsync();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error con el audio:', error);
      await unloadSound();
      Alert.alert('Error', 'No se pudo reproducir el audio.');
    }
  }, [hasValidAudio, loadSound, unloadSound]);

  const handleSeekStart = useCallback(() => {
    isSeekingRef.current = true;
  }, []);

  const handleSeekComplete = useCallback(
    async (positionMs) => {
      isSeekingRef.current = false;
      try {
        const sound = await loadSound();
        if (!sound) return;
        const status = await sound.getStatusAsync();
        if (!status.isLoaded) return;
        const max = status.durationMillis || positionMs;
        const clamped = Math.max(0, Math.min(positionMs, max));
        await sound.setPositionAsync(clamped);
        setAudioPosition(clamped);
      } catch (error) {
        console.warn('Error al buscar posición:', error);
      }
    },
    [loadSound]
  );

  return {
    hasValidAudio,
    isPlaying,
    audioPosition,
    audioDuration,
    audioLoading,
    togglePlayback,
    handleSeekStart,
    handleSeekComplete,
    setAudioPosition,
    formatAudioTime,
  };
}

export { formatAudioTime };
