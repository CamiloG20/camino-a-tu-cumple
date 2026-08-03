import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  useAudioPlayer as useExpoAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from 'expo-audio';

function formatAudioTime(ms) {
  if (!ms || ms < 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

/**
 * Reproductor compatible con App.js / AudioSeekBar (posición y duración en ms).
 * Internamente usa expo-audio (segundos).
 */
export function useAudioPlayer(audioUrl) {
  const isSeekingRef = useRef(false);
  const [seekPreviewMs, setSeekPreviewMs] = useState(null);

  const hasValidAudio =
    audioUrl && typeof audioUrl === 'string' && audioUrl.startsWith('http');

  const player = useExpoAudioPlayer(hasValidAudio ? audioUrl : null, {
    updateInterval: 500,
  });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.__PWA_AUDIO_PLAYING__ = Boolean(status?.playing);
  }, [status?.playing]);

  // Al terminar, volver al inicio (expo-audio no resetea solo)
  useEffect(() => {
    if (!status?.didJustFinish) return;
    player.seekTo(0).catch(() => {});
    if (typeof window !== 'undefined') window.__PWA_AUDIO_PLAYING__ = false;
  }, [status?.didJustFinish, player]);

  const livePositionMs = Math.round((status?.currentTime || 0) * 1000);
  const audioPosition =
    isSeekingRef.current && seekPreviewMs != null ? seekPreviewMs : livePositionMs;
  const audioDuration = Math.round((status?.duration || 0) * 1000);
  const isPlaying = Boolean(status?.playing);
  const audioLoading = Boolean(hasValidAudio && status && !status.isLoaded);

  const togglePlayback = useCallback(async () => {
    if (!hasValidAudio) {
      Alert.alert('Sin audio', 'No hay audio disponible para este día.');
      return;
    }

    try {
      if (status?.playing) {
        player.pause();
        return;
      }

      if (status?.duration > 0 && status.currentTime >= status.duration - 0.25) {
        await player.seekTo(0);
      }

      player.play();
    } catch (error) {
      console.error('Error con el audio:', error);
      Alert.alert('Error', 'No se pudo reproducir el audio.');
    }
  }, [hasValidAudio, player, status?.playing, status?.duration, status?.currentTime]);

  const handleSeekStart = useCallback(() => {
    isSeekingRef.current = true;
  }, []);

  const setAudioPosition = useCallback((ms) => {
    setSeekPreviewMs(ms);
  }, []);

  const handleSeekComplete = useCallback(
    async (positionMs) => {
      isSeekingRef.current = false;
      setSeekPreviewMs(null);
      try {
        const durationSec = status?.duration || 0;
        const clampedSec = Math.max(0, Math.min((positionMs || 0) / 1000, durationSec || 0));
        await player.seekTo(clampedSec);
      } catch (error) {
        console.warn('Error al buscar posición:', error);
      }
    },
    [player, status?.duration]
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
