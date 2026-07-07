import React, { useRef } from 'react';
import { View, Pressable, Platform, StyleSheet } from 'react-native';

export default function AudioSeekBar({
  position = 0,
  duration = 0,
  onSeekStart,
  onSeek,
  onSeekComplete,
  disabled = false,
  currentTimeLabel = '0:00',
  durationLabel = '0:00',
}) {
  const trackWidth = useRef(0);
  const lastValueRef = useRef(0);
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  if (Platform.OS === 'web') {
    return (
      <input
        type="range"
        min={0}
        max={duration || 1}
        step={500}
        value={Math.min(position, duration || 0)}
        disabled={disabled || duration <= 0}
        onMouseDown={() => onSeekStart?.()}
        onTouchStart={() => onSeekStart?.()}
        onChange={(event) => {
          const next = Number(event.target.value);
          lastValueRef.current = next;
          onSeek?.(next);
        }}
        onMouseUp={() => onSeekComplete?.(lastValueRef.current)}
        onTouchEnd={() => onSeekComplete?.(lastValueRef.current)}
        aria-label="Posición de la canción"
        aria-valuemin={0}
        aria-valuemax={duration || 1}
        aria-valuenow={Math.min(position, duration || 0)}
        aria-valuetext={`${currentTimeLabel} de ${durationLabel}`}
        style={{
          width: '100%',
          height: 28,
          accentColor: '#c4b5fd',
          cursor: disabled || duration <= 0 ? 'default' : 'pointer',
        }}
      />
    );
  }

  function seekFromX(x) {
    if (disabled || duration <= 0 || trackWidth.current <= 0) return null;
    const ratio = Math.max(0, Math.min(1, x / trackWidth.current));
    return ratio * duration;
  }

  return (
    <Pressable
      onLayout={(event) => {
        trackWidth.current = event.nativeEvent.layout.width;
      }}
      onPressIn={() => onSeekStart?.()}
      onPress={(event) => {
        const ms = seekFromX(event.nativeEvent.locationX);
        if (ms == null) return;
        onSeek?.(ms);
        onSeekComplete?.(ms);
      }}
      disabled={disabled || duration <= 0}
      style={styles.trackHit}
      accessibilityRole="adjustable"
      accessibilityLabel="Posición de la canción"
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        <View style={[styles.thumb, { left: `${progress * 100}%` }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trackHit: {
    width: '100%',
    paddingVertical: 10,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
    backgroundColor: '#c4b5fd',
  },
  thumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#6200ee',
  },
});
