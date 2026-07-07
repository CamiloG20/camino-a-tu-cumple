import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

export default function PwaUpdateBanner({ visible, onReload }) {
  if (Platform.OS !== 'web' || !visible) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>Hay una nueva versión disponible</Text>
      <TouchableOpacity
        onPress={onReload}
        style={styles.btn}
        accessibilityLabel="Actualizar aplicación"
      >
        <Text style={styles.btnText}>Actualizar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 'max(8px, env(safe-area-inset-top, 0px))',
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
  },
  text: { color: '#fff', fontSize: 14, fontWeight: '600' },
  btn: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
});
