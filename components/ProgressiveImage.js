import React, { useState } from 'react';
import { View, Image, ActivityIndicator, StyleSheet, Text } from 'react-native';

export default function ProgressiveImage({
  source,
  style,
  imageStyle,
  resizeMode = 'cover',
  accessibilityLabel,
  fallbackLabel = 'Imagen no disponible',
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <View style={[style, styles.container]} accessibilityLabel={accessibilityLabel}>
      {!loaded && !error && (
        <View style={styles.placeholder}>
          <ActivityIndicator color="#ffffffaa" size="large" />
        </View>
      )}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{fallbackLabel}</Text>
        </View>
      ) : (
        <Image
          source={source}
          style={[StyleSheet.absoluteFill, imageStyle, !loaded && styles.hidden]}
          resizeMode={resizeMode}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setError(true);
            setLoaded(false);
          }}
          accessibilityLabel={accessibilityLabel}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hidden: {
    opacity: 0,
  },
  errorBox: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    padding: 12,
  },
  errorText: {
    color: '#e2e8f0',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
});
