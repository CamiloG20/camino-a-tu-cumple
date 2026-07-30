import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GRADIENT_COLORS } from '../lib/layout';

export default function PreviewGate({ dayNumber, onGoAdmin }) {
  return (
    <LinearGradient colors={GRADIENT_COLORS} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Vista previa protegida</Text>
        <Text style={styles.text}>
          Para previsualizar el día {dayNumber} necesitas iniciar sesión en el panel admin.
        </Text>
        <TouchableOpacity style={styles.button} onPress={onGoAdmin} accessibilityRole="button">
          <Text style={styles.buttonText}>Ir al admin</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    padding: 24,
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  text: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 16,
    lineHeight: 24,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#0f2c2e',
    fontSize: 16,
    fontWeight: '700',
  },
});
