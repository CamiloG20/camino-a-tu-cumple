import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { GRADIENT_COLORS, THEME } from '../lib/layout';
import { SURPRISE_CATEGORIES } from '../lib/surpriseCategories';
import { GIFT_DAY_COUNT } from '../lib/giftSchedule';

function shuffle(list, seed = Date.now()) {
  const arr = [...list];
  let s = seed >>> 0;
  for (let i = arr.length - 1; i > 0; i -= 1) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function CardFace({ category, revealed, taken, selected, onPress, disabled, width }) {
  const flip = useRef(new Animated.Value(revealed || taken ? 1 : 0)).current;

  useEffect(() => {
    if (revealed || taken) {
      Animated.timing(flip, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [revealed, taken, flip]);

  const frontRotate = flip.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backRotate = flip.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || taken || revealed}
      activeOpacity={0.85}
      style={[styles.cardSlot, { width }, taken && styles.cardTaken]}
      accessibilityLabel={
        taken
          ? `${category.name}, ya elegida`
          : revealed
            ? `Elegiste ${category.name}`
            : 'Carta misteriosa'
      }
      accessibilityRole="button"
    >
      <View style={styles.cardInner}>
        <Animated.View
          style={[
            styles.cardFace,
            styles.cardBack,
            { transform: [{ perspective: 800 }, { rotateY: frontRotate }] },
          ]}
        >
          <Text style={styles.cardBackMark}>?</Text>
          <Text style={styles.cardBackHint}>Toca</Text>
        </Animated.View>
        <Animated.View
          style={[
            styles.cardFace,
            styles.cardFront,
            selected && styles.cardSelected,
            { transform: [{ perspective: 800 }, { rotateY: backRotate }] },
          ]}
        >
          <Text style={styles.cardEmoji}>{category.emoji || '🎁'}</Text>
          <Text style={styles.cardName} numberOfLines={2}>
            {category.name}
          </Text>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

export default function SurprisePickGame({
  visible,
  dayNumber,
  surpriseOrdinal,
  usedCategoryNames = [],
  mustPick = false,
  onPick,
  onClose,
}) {
  const { width: windowWidth } = useWindowDimensions();
  const [pickedName, setPickedName] = useState(null);
  const [busy, setBusy] = useState(false);
  const celebrate = useRef(new Animated.Value(0)).current;

  const usedSet = useMemo(() => {
    const set = new Set();
    for (const name of usedCategoryNames || []) {
      if (name) set.add(String(name).toLowerCase());
    }
    return set;
  }, [usedCategoryNames]);

  const deck = useMemo(() => {
    if (!visible) return SURPRISE_CATEGORIES;
    return shuffle(SURPRISE_CATEGORIES, dayNumber * 97 + Date.now());
  }, [visible, dayNumber]);

  const cardWidth = Math.min(96, Math.floor((Math.min(windowWidth, 420) - 56) / 3) - 8);

  useEffect(() => {
    if (!visible) {
      setPickedName(null);
      setBusy(false);
      celebrate.setValue(0);
    }
  }, [visible, celebrate]);

  async function handlePick(category) {
    if (busy || pickedName != null || usedSet.has(category.name.toLowerCase())) return;
    setBusy(true);
    setPickedName(category.name);

    Animated.sequence([
      Animated.timing(celebrate, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.delay(900),
    ]).start(async () => {
      try {
        await onPick?.(category.name);
      } catch {
        setPickedName(null);
        celebrate.setValue(0);
      } finally {
        setBusy(false);
      }
    });
  }

  const ordinalLabel = surpriseOrdinal || '?';
  const pickedCategory = SURPRISE_CATEGORIES.find((c) => c.name === pickedName);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={mustPick || pickedName ? undefined : onClose}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <LinearGradient colors={GRADIENT_COLORS} style={styles.sheet}>
          <View style={styles.header}>
            <MaterialIcons name="favorite" size={28} color="#fda4af" />
            <Text style={styles.title}>Tu sorpresa te espera</Text>
            {!pickedName && !mustPick ? (
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Cerrar">
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            ) : (
              <View style={styles.closeBtn} />
            )}
          </View>

          <Text style={styles.subtitle}>
            Momento {ordinalLabel} de {GIFT_DAY_COUNT} · con todo mi cariño
          </Text>
          <Text style={styles.hint}>
            Doce cartitas escondidas… toca la que más te late. Cada una guarda algo pensado para ti.
          </Text>

          <View style={styles.grid}>
            {deck.map((category) => {
              const taken = usedSet.has(category.name.toLowerCase()) && pickedName !== category.name;
              const revealed = pickedName === category.name || taken;
              return (
                <CardFace
                  key={category.key}
                  category={category}
                  width={cardWidth}
                  taken={taken}
                  revealed={revealed}
                  selected={pickedName === category.name}
                  disabled={busy || pickedName != null}
                  onPress={() => handlePick(category)}
                />
              );
            })}
          </View>

          {pickedCategory ? (
            <Animated.View
              style={[
                styles.revealBanner,
                {
                  opacity: celebrate,
                  transform: [
                    {
                      scale: celebrate.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.revealEmoji}>{pickedCategory.emoji}</Text>
              <Text style={styles.revealText}>
                ¡{pickedCategory.emoji} {pickedCategory.name}! Hecho con amor para ti.
              </Text>
            </Animated.View>
          ) : null}
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  sheet: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '94%',
    borderRadius: 22,
    padding: 16,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    color: '#fde68a',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  hint: {
    color: '#e2e8f0',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  cardSlot: {
    height: 108,
    marginBottom: 2,
  },
  cardTaken: {
    opacity: 0.38,
  },
  cardInner: {
    flex: 1,
    position: 'relative',
  },
  cardFace: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    padding: 6,
  },
  cardBack: {
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: 'rgba(253, 224, 71, 0.45)',
  },
  cardFront: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  cardSelected: {
    borderWidth: 3,
    borderColor: THEME.accentSoft,
  },
  cardBackMark: {
    color: '#fde68a',
    fontSize: 32,
    fontWeight: '900',
  },
  cardBackHint: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  cardEmoji: {
    fontSize: 26,
    marginBottom: 4,
  },
  cardName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 13,
  },
  revealBanner: {
    marginTop: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(253, 224, 71, 0.4)',
  },
  revealEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  revealText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    textAlign: 'center',
  },
});
