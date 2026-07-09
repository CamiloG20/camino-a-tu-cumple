import React from 'react';
import { ImageBackground, StyleSheet, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const DEFAULT_BACKGROUND = require('../assets/images/fondo.png');

export default function AppBackground({ children, overlayColors, style, imageUrl = null }) {
  const source = imageUrl ? { uri: imageUrl } : DEFAULT_BACKGROUND;

  return (
    <View style={[styles.root, style]}>
      <ImageBackground
        source={source}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <LinearGradient colors={overlayColors} style={styles.overlay}>
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' ? { minHeight: '100vh' } : {}),
  },
  overlay: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
});
