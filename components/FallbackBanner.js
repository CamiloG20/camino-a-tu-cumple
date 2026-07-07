import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function FallbackBanner() {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.text}>
        Modo demostración: no se pudieron cargar los datos reales. Revisa tu conexión o la configuración de Supabase.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(251, 191, 36, 0.95)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    width: '100%',
  },
  text: {
    color: '#78350f',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
});
