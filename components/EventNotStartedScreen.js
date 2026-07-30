import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
import { FONTS, safeArea, THEME } from '../lib/layout';

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
      <Animated.View entering={FadeInDown.duration(500).springify()} style={styles.card}>
        <Animated.View style={[styles.iconCircle, heartStyle]}>
          <MaterialIcons name="favorite" size={36} color={THEME.accent} />
        </Animated.View>

        <Text style={styles.eyebrow} accessibilityRole="header">
          Camino a tu cumple
        </Text>
        <Text style={styles.title}>Algo muy bonito se acerca</Text>

        <View style={styles.countdownBox} accessibilityLabel={`Faltan ${daysUntilStart} días`}>
          <Text style={styles.countdownNumber}>{daysUntilStart}</Text>
          <Text style={styles.countdownLabel}>
            {daysUntilStart === 1 ? 'día' : 'días'}
          </Text>
        </View>

        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.subline}>{subline}</Text>

        <View style={styles.dateRow}>
          <MaterialIcons name="event" size={18} color={THEME.primary} />
          <Text style={styles.dateText}>Inicio: {startLabel} · Día 31</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.hint}>
          Guarda esta app en tu pantalla de inicio y vuelve ese día para abrir tu primera sorpresa.
        </Text>
      </Animated.View>

      <Animated.Text entering={FadeInUp.delay(400).duration(600)} style={styles.footer}>
        Hecho con amor, solo para ti
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
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,248,246,0.97)',
    borderRadius: 4,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(196, 92, 106, 0.22)',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(196, 92, 106, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(196, 92, 106, 0.28)',
  },
  eyebrow: {
    color: THEME.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontFamily: FONTS.body,
  },
  title: {
    color: THEME.primary,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 34,
    fontFamily: FONTS.display,
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
    fontWeight: '700',
    color: THEME.secondary,
    lineHeight: 64,
    fontVariant: ['tabular-nums'],
    fontFamily: FONTS.display,
  },
  countdownLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6b5e5e',
    marginBottom: 10,
    fontFamily: FONTS.body,
  },
  headline: {
    color: '#3d3333',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    fontFamily: FONTS.body,
  },
  subline: {
    color: '#6b5e5e',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
    paddingHorizontal: 4,
    fontFamily: FONTS.display,
    fontStyle: 'italic',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  dateText: {
    color: THEME.primary,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONTS.body,
  },
  divider: {
    width: 48,
    height: 2,
    backgroundColor: 'rgba(15, 44, 46, 0.15)',
    marginVertical: 18,
  },
  hint: {
    color: '#8a7a7a',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
    fontFamily: FONTS.body,
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
    fontFamily: FONTS.body,
  },
});
