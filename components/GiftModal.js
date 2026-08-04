import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { GRADIENT_COLORS, THEME } from '../lib/layout';

const CONFETTI = ['🎉', '✨', '🎊', '💖', '⭐', '🎈'];

function ConfettiPiece({ emoji, style }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 1800 + Math.random() * 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 1800 + Math.random() * 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -14],
  });

  return (
    <Animated.Text style={[styles.confetti, style, { transform: [{ translateY }] }]}>
      {emoji}
    </Animated.Text>
  );
}

export default function GiftModal({
  visible,
  categoryName,
  giftMessage,
  surpriseOrdinal,
  surpriseTotal = 4,
  onClose,
}) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return undefined;

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    return undefined;
  }, [visible, scale, opacity]);

  const ordinalLabel =
    surpriseOrdinal != null ? `Sorpresa ${surpriseOrdinal} de ${surpriseTotal}` : 'Regalo especial';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Animated.View style={[styles.modalWrap, { opacity, transform: [{ scale }] }]}>
          <Pressable onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalContent}>
              <LinearGradient
                colors={GRADIENT_COLORS}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />
              <View style={styles.confettiRow} pointerEvents="none">
                {CONFETTI.map((emoji, index) => (
                  <ConfettiPiece
                    key={emoji}
                    emoji={emoji}
                    style={{ left: `${8 + index * 14}%` }}
                  />
                ))}
              </View>

              <View style={styles.modalHeader}>
                <MaterialIcons name="card-giftcard" size={36} color="#fff" />
                <Text style={styles.modalTitle} accessibilityRole="header">
                  ¡Tienes un regalo!
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  accessibilityLabel="Cerrar modal de regalo"
                  accessibilityRole="button"
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <MaterialIcons name="close" size={26} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.giftNumberContainer}>
                <Text style={styles.giftNumberLabel}>{ordinalLabel}</Text>
                <View style={styles.giftNumberBadge}>
                  <Text style={styles.categoryName}>{categoryName || 'Sorpresa'}</Text>
                </View>
                {giftMessage ? <Text style={styles.giftMessageText}>{giftMessage}</Text> : null}
              </View>

              <TouchableOpacity
                onPress={onClose}
                style={styles.modalButton}
                accessibilityLabel="Cerrar"
                accessibilityRole="button"
              >
                <Text style={styles.modalButtonText}>¡Gracias! 💝</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalWrap: {
    width: '100%',
    maxWidth: 380,
  },
  modalContent: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  confettiRow: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    height: 40,
  },
  confetti: {
    position: 'absolute',
    fontSize: 18,
    opacity: 0.9,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
    gap: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    textShadowColor: '#00000055',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftNumberContainer: {
    alignItems: 'center',
    marginVertical: 12,
    width: '100%',
  },
  giftNumberLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
    fontWeight: '600',
  },
  giftNumberBadge: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 3,
    borderColor: THEME.accentSoft,
  },
  categoryName: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.accent,
    textAlign: 'center',
  },
  giftMessageText: {
    marginTop: 16,
    fontSize: 15,
    lineHeight: 24,
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 8,
    fontWeight: '500',
  },
  modalButton: {
    backgroundColor: THEME.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
    marginTop: 16,
    minHeight: 48,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff5',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
});
