import React, { useState } from 'react';
import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';

export default function ProgressiveImage({
  source,
  style,
  imageStyle,
  resizeMode = 'cover',
  accessibilityLabel,
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <View style={[style, styles.container]} accessibilityLabel={accessibilityLabel}>
      {!loaded && (
        <View style={styles.placeholder}>
          <ActivityIndicator color="#ffffffaa" size="large" />
        </View>
      )}
      <Image
        source={source}
        style={[StyleSheet.absoluteFill, imageStyle, !loaded && styles.hidden]}
        resizeMode={resizeMode}
        onLoad={() => setLoaded(true)}
        accessibilityLabel={accessibilityLabel}
      />
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
});
