import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function OfflineScreen({ onRetry }) {
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <MaterialIcons name="wifi-off" size={56} color="#fff" />
      <Text style={styles.title}>Sin conexión</Text>
      <Text style={styles.body}>
        Necesitas internet para cargar el calendario. Si ya la abriste antes, algunas imágenes pueden seguir en caché.
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        style={styles.btn}
        accessibilityLabel="Reintentar conexión"
      >
        <Text style={styles.btnText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
  },
  body: {
    color: '#e2e8f0',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  btn: {
    backgroundColor: '#fff',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    minHeight: 48,
    justifyContent: 'center',
  },
  btnText: { color: '#0f2c2e', fontWeight: '800', fontSize: 16 },
});
