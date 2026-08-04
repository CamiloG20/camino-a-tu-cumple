import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { GRADIENT_COLORS } from '../lib/layout';

export default function DayUnlockedModal({
  visible,
  dayNumber,
  daysUntil,
  isBirthday,
  onOpen,
  onClose,
}) {
  const title = isBirthday
    ? '¡Feliz cumpleaños! 🎂'
    : `Día ${dayNumber} desbloqueado`;

  const subtitle = isBirthday
    ? 'Hoy es tu día 0. Tu sorpresa final te está esperando.'
    : `Tu sorpresa de hoy ya está lista. Faltan ${daysUntil} días para tu cumple.`;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={Boolean(visible)}
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Gradiente decorativo: pointerEvents none para no bloquear clics en web */}
          <LinearGradient
            colors={GRADIENT_COLORS}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <View style={styles.content}>
            <View style={styles.iconRing} pointerEvents="none">
              <MaterialIcons name="favorite" size={42} color="#fff" />
            </View>
            <Text style={styles.eyebrow}>Nueva sorpresa</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              onPress={onOpen}
              accessibilityRole="button"
              accessibilityLabel="Abrir mi sorpresa"
            >
              <MaterialIcons name="card-giftcard" size={20} color="#0f2c2e" />
              <Text style={styles.primaryText}>Abrir mi sorpresa</Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Ver después"
            >
              <Text style={styles.secondaryText}>Ver después</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }
      : {
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 24,
          elevation: 12,
        }),
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
  },
  iconRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  eyebrow: {
    color: '#fde68a',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 22,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 14,
    minHeight: 48,
    width: '100%',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  primaryText: {
    color: '#0f2c2e',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryBtn: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'center',
    cursor: 'pointer',
  },
  secondaryText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
