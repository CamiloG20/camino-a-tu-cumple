import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { formatCalendarDate } from '../lib/calendar';
import { safeArea, THEME } from '../lib/layout';

const FLOATING = ['✨', '💜', '🎂', '⭐', '💫'];

function FloatingEmoji({ emoji, style, delay = 0 }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2200 + delay, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200 + delay, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [delay, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.Text style={[styles.floatingEmoji, style, animatedStyle]}>
      {emoji}
    </Animated.Text>
  );
}

function getCountdownCopy(daysUntilStart) {
  if (daysUntilStart === 1) {
    return {
      headline: '¡Mañana empieza todo!',
      subline: 'La primera sorpresa te espera muy pronto.',
    };
  }
  if (daysUntilStart === 2) {
    return {
      headline: 'Quedan 2 días…',
      subline: 'El camino hacia tu cumpleaños está por comenzar.',
    };
  }
  return {
    headline: `Faltan ${daysUntilStart} días`,
    subline: 'Cada día será una nueva sorpresa hasta el gran día.',
  };
}

export default function EventNotStartedScreen({ daysUntilStart, startDate }) {
  const startLabel = startDate ? formatCalendarDate(startDate) : 'pronto';
  const { headline, subline } = getCountdownCopy(daysUntilStart);
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [pulse]);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View style={styles.wrap} accessibilityRole="text">
      <View style={styles.floatingRow} pointerEvents="none">
        {FLOATING.map((emoji, index) => (
          <FloatingEmoji
            key={emoji}
            emoji={emoji}
            delay={index * 180}
            style={{ left: `${6 + index * 18}%` }}
          />
        ))}
      </View>

      <Animated.View entering={FadeInDown.duration(500).springify()} style={styles.card}>
        <Animated.View style={[styles.iconCircle, heartStyle]}>
          <MaterialIcons name="favorite" size={36} color={THEME.accent} />
        </Animated.View>

        <Text style={styles.eyebrow}>Camino a tu cumple</Text>
        <Text style={styles.title}>Algo muy bonito se acerca</Text>

        <View style={styles.countdownBox}>
          <Text style={styles.countdownNumber}>{daysUntilStart}</Text>
          <Text style={styles.countdownLabel}>
            {daysUntilStart === 1 ? 'día' : 'días'}
          </Text>
        </View>

        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.subline}>{subline}</Text>

        <View style={styles.datePill}>
          <MaterialIcons name="event" size={18} color={THEME.primary} />
          <Text style={styles.datePillText}>
            Inicio: {startLabel} · Día 31
          </Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.hint}>
          Guarda esta app en tu pantalla de inicio y vuelve ese día para abrir tu primera sorpresa.
        </Text>
      </Animated.View>

      <Animated.Text entering={FadeInUp.delay(400).duration(600)} style={styles.footer}>
        Hecho con amor, solo para ti 💝
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: safeArea.paddingTop,
    paddingBottom: safeArea.paddingBottom,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  floatingRow: {
    position: 'absolute',
    top: '12%',
    left: 0,
    right: 0,
    height: 48,
    zIndex: 0,
  },
  floatingEmoji: {
    position: 'absolute',
    fontSize: 22,
    opacity: 0.85,
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 26,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff0f3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#fecdd3',
  },
  eyebrow: {
    color: THEME.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    color: '#1e1b4b',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 30,
  },
  countdownBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  countdownNumber: {
    fontSize: 64,
    fontWeight: '900',
    color: THEME.primary,
    lineHeight: 64,
    fontVariant: ['tabular-nums'],
  },
  countdownLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 10,
  },
  headline: {
    color: '#334155',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  subline: {
    color: '#64748b',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
    paddingHorizontal: 4,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : undefined,
    fontStyle: 'italic',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  datePillText: {
    color: THEME.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    marginVertical: 18,
  },
  hint: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  footer: {
    marginTop: 24,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: '#00000044',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
