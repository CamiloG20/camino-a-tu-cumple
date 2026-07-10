import React from 'react';
import { ImageBackground, StyleSheet, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const DEFAULT_BACKGROUND = require('../assets/images/fondo.png');

export default function AppBackground({ children, overlayColors, style, imageUrl = null }) {
  const source = imageUrl ? { uri: imageUrl } : DEFAULT_BACKGROUND;

  return (
    <View style={[styles.root, style]}>
      <View style={styles.backdrop} pointerEvents="none">
        <ImageBackground
          source={source}
          style={styles.backdropImage}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
        <LinearGradient colors={overlayColors} style={StyleSheet.absoluteFill} />
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' ? { minHeight: '100dvh' } : {}),
  },
  backdrop: Platform.select({
    web: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      zIndex: 0,
    },
    default: {
      ...StyleSheet.absoluteFillObject,
    },
  }),
  backdropImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    width: '100%',
    zIndex: 1,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { minHeight: '100dvh', position: 'relative' } : {}),
  },
});
