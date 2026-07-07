import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Pressable,
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { DataService } from './services/dataService';
import { isSupabaseConfigured } from './lib/config';
import { GRADIENT_COLORS, getContentWidth, safeArea } from './lib/layout';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import ProgressiveImage from './components/ProgressiveImage';
import InstallPwaBanner from './components/InstallPwaBanner';
import OfflineScreen from './components/OfflineScreen';

const FALLBACK_IMAGE = require('./assets/images/fondo.png');
const VIEWED_KEY = 'viewedImages';

const BIRTHDAY_MONTH = 7;
const BIRTHDAY_DAY = 9;

function getDaysUntilBirthday(date = new Date()) {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let birthday = new Date(date.getFullYear(), BIRTHDAY_MONTH, BIRTHDAY_DAY);

  if (today > birthday) {
    birthday = new Date(date.getFullYear() + 1, BIRTHDAY_MONTH, BIRTHDAY_DAY);
  }

  return Math.round((birthday - today) / (1000 * 60 * 60 * 24));
}

function getTodayDayIndex(daysCount, daysUntilBirthday) {
  let index = (daysCount - 1) - daysUntilBirthday;
  if (index < 0) index = 0;
  if (index >= daysCount) index = daysCount - 1;
  return index;
}

export default function App() {
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = getContentWidth(windowWidth);
  const styles = useMemo(() => createStyles(screenWidth), [screenWidth]);
  const isOnline = useNetworkStatus();

  const [todayIndex, setTodayIndex] = useState(0);
  const [viewed, setViewed] = useState({});
  const [soundObj, setSoundObj] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrichingDay, setEnrichingDay] = useState(false);
  const [currentDay, setCurrentDay] = useState(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftNumber, setGiftNumber] = useState(null);
  const [diff, setDiff] = useState(0);
  const [realTodayIndex, setRealTodayIndex] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const flatListRef = useRef(null);
  const galleryRef = useRef(null);

  const cleanupAudio = async () => {
    if (soundObj) {
      try {
        await soundObj.stopAsync();
        await soundObj.unloadAsync();
        setSoundObj(null);
        setIsPlaying(false);
      } catch (error) {
        console.warn('Error al limpiar audio:', error);
      }
    }
  };

  const markDayViewed = useCallback(async (dayNumber) => {
    const key = String(dayNumber);
    setViewed((prev) => {
      if (prev[key]) return prev;
      const next = { ...prev, [key]: true };
      AsyncStorage.setItem(VIEWED_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const applyDayAtIndex = useCallback(async (daysList, index) => {
    let day = daysList[index];
    if (!day?.enriched) {
      setEnrichingDay(true);
      try {
        day = await DataService.enrichDayFull(day);
        setDays((prev) => prev.map((item, i) => (i === index ? day : item)));
      } finally {
        setEnrichingDay(false);
      }
    }
    setTodayIndex(index);
    setCurrentDay(day);
    setCurrentPhotoIndex(0);
    markDayViewed(day.dayNumber);
    return day;
  }, [markDayViewed]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {});

    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        setLoadError(false);

        if (Platform.OS === 'web' && typeof navigator !== 'undefined' && !navigator.onLine) {
          throw new Error('Sin conexión');
        }

        let daysData;

        try {
          if (!isSupabaseConfigured()) {
            throw new Error('Supabase no configurado');
          }
          daysData = await DataService.getAllDaysLight();
        } catch (dataError) {
          console.warn('⚠️ Error con Supabase, usando datos de fallback:', dataError);
          daysData = await DataService.getFallbackData();
        }

        if (cancelled) return;

        const calculatedDiff = getDaysUntilBirthday();
        const index = getTodayDayIndex(daysData.length, calculatedDiff);

        setDays(daysData);
        setDiff(calculatedDiff);
        setRealTodayIndex(index);
        setTodayIndex(index);
        setCurrentDay(daysData[index]);

        const viewedData = await AsyncStorage.getItem(VIEWED_KEY);
        if (viewedData && !cancelled) {
          setViewed(JSON.parse(viewedData));
        }

        if (!cancelled) {
          await applyDayAtIndex(daysData, index);
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
        if (!cancelled) {
          setLoadError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
      cleanupAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadToken]);

  useEffect(() => {
    if (currentDay) {
      cleanupAudio();
    }
  }, [currentDay?.dayNumber]);

  useEffect(() => {
    if (!galleryRef.current || todayIndex < 0) return;
    galleryRef.current.scrollTo({
      x: Math.max(0, todayIndex * 104 - screenWidth / 2 + 52),
      animated: true,
    });
  }, [todayIndex, screenWidth, loading]);

  const audioButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isPlaying ? withSpring(1.1) : withSpring(1) }],
    shadowOpacity: isPlaying ? 0.7 : 0.3,
    shadowRadius: isPlaying ? 10 : 5,
  }));

  const giftButtonStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.8,
    shadowRadius: 15,
    transform: [{ scale: withSpring(1) }],
  }));

  async function togglePlayback() {
    const hasValidAudio =
      currentDay?.audioUrl &&
      typeof currentDay.audioUrl === 'string' &&
      currentDay.audioUrl.startsWith('http');

    if (!hasValidAudio) {
      Alert.alert('Sin audio', 'No hay audio disponible para este día.');
      return;
    }

    try {
      await handleAudioPlayback();
    } catch (error) {
      await handleAudioError(error);
    }
  }

  async function handleAudioPlayback() {
    if (!soundObj) {
      await createAndPlayNewSound();
      return;
    }
    await handleExistingSound();
  }

  async function createAndPlayNewSound() {
    const { sound } = await Audio.Sound.createAsync(
      { uri: currentDay.audioUrl },
      { shouldPlay: false }
    );

    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) return;

      if (!status.isPlaying && status.didJustFinish) {
        setIsPlaying(false);
        setSoundObj(null);
        return;
      }

      if (status.isPlaying !== isPlaying) {
        setIsPlaying(status.isPlaying);
      }
    });

    setSoundObj(sound);
    await sound.playAsync();
    setIsPlaying(true);
  }

  async function handleExistingSound() {
    const status = await soundObj.getStatusAsync();
    if (!status.isLoaded) {
      await recreateSound();
      return;
    }
    await toggleExistingSound(status);
  }

  async function recreateSound() {
    await soundObj.unloadAsync();
    setSoundObj(null);
    setIsPlaying(false);
    setTimeout(() => togglePlayback(), 100);
  }

  async function toggleExistingSound(status) {
    if (status.isPlaying) {
      await soundObj.pauseAsync();
      setIsPlaying(false);
      return;
    }
    await soundObj.playAsync();
    setIsPlaying(true);
  }

  async function handleAudioError(error) {
    console.error('Error con el audio:', error);
    if (soundObj) {
      try {
        await soundObj.unloadAsync();
      } catch (unloadError) {
        console.warn('Error al descargar audio:', unloadError);
      }
    }
    setSoundObj(null);
    setIsPlaying(false);
    Alert.alert('Error', 'No se pudo reproducir el audio.');
  }

  function handleGiftPress() {
    if (currentDay?.giftNumber) {
      setGiftNumber(currentDay.giftNumber);
      setShowGiftModal(true);
    }
  }

  function closeGiftModal() {
    setShowGiftModal(false);
    setGiftNumber(null);
  }

  async function onPressImage(index) {
    if (index > realTodayIndex) {
      Alert.alert('Bloqueado', 'No puedes ver días futuros.');
      return;
    }
    await applyDayAtIndex(days, index);
  }

  const renderPhotoItem = ({ item }) => (
    <View style={styles.carouselItem}>
      <ProgressiveImage
        source={{ uri: item }}
        style={styles.carouselImage}
        imageStyle={styles.carouselImage}
        accessibilityLabel={`Foto del día ${currentDay?.dayNumber}`}
      />
    </View>
  );

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentPhotoIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const daysLeft = currentDay ? currentDay.dayNumber : diff;
  const isBirthdayDay = currentDay?.dayNumber === 0;

  const mainContent = (
    <>
      <InstallPwaBanner />

      <Text style={styles.daysLeftText} accessibilityRole="header">
        {isBirthdayDay ? '¡Feliz cumpleaños! 🎂❤️' : `Faltan ${daysLeft} días 🎂❤️`}
      </Text>

      {currentDay && (
        <>
          {currentDay.text ? (
            <Text style={styles.dayText}>{currentDay.text}</Text>
          ) : null}

          <Animated.View
            key={`day-${currentDay.dayNumber}`}
            entering={FadeIn.duration(280)}
            exiting={FadeOut.duration(180)}
            style={styles.imageContainer}
          >
            {enrichingDay ? (
              <View style={styles.enrichingOverlay}>
                <ActivityIndicator color="#6a11cb" size="large" />
              </View>
            ) : null}

            {currentDay.photos && currentDay.photos.length > 1 ? (
              <>
                <FlatList
                  ref={flatListRef}
                  data={currentDay.photos}
                  renderItem={renderPhotoItem}
                  keyExtractor={(item, index) => `${currentDay.dayNumber}-${index}`}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onViewableItemsChanged={onViewableItemsChanged}
                  viewabilityConfig={viewabilityConfig}
                  style={styles.carousel}
                  getItemLayout={(_, index) => ({
                    length: screenWidth * 0.88,
                    offset: screenWidth * 0.88 * index,
                    index,
                  })}
                  initialNumToRender={1}
                  maxToRenderPerBatch={2}
                  windowSize={3}
                  removeClippedSubviews
                />
                <View style={styles.paginationContainer}>
                  {currentDay.photos.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.paginationDot,
                        index === currentPhotoIndex && styles.paginationDotActive,
                      ]}
                    />
                  ))}
                </View>
              </>
            ) : (
              <ProgressiveImage
                source={currentDay?.imageUrl ? { uri: currentDay.imageUrl } : FALLBACK_IMAGE}
                style={styles.image}
                imageStyle={styles.image}
                accessibilityLabel={`Imagen del día ${currentDay.dayNumber}`}
              />
            )}
          </Animated.View>

          <Animated.View style={[styles.button, audioButtonStyle]}>
            <Pressable
              onPress={togglePlayback}
              android_ripple={{ color: '#fff' }}
              style={styles.pressable}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pausar canción' : 'Reproducir canción del día'}
            >
              <MaterialIcons
                name={isPlaying ? 'pause-circle-filled' : 'play-circle-filled'}
                size={48}
                color="#fff"
              />
            </Pressable>
          </Animated.View>
        </>
      )}

      <Text style={styles.galleryTitle}>Galería de días anteriores</Text>

      <ScrollView
        ref={galleryRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {days.map((day, i) => {
          const isActive = i === todayIndex;
          const isLocked = i > realTodayIndex;
          const isViewed = viewed[String(day.dayNumber)];

          return (
            <TouchableOpacity
              key={day.dayNumber}
              disabled={isLocked}
              onPress={() => onPressImage(i)}
              style={[
                styles.thumbnailContainer,
                isActive && styles.thumbnailActive,
                isLocked && styles.thumbnailLocked,
              ]}
              accessibilityLabel={`Día ${day.dayNumber}${isLocked ? ', bloqueado' : ''}`}
              accessibilityState={{ selected: isActive, disabled: isLocked }}
            >
              <ProgressiveImage
                source={day?.imageUrl ? { uri: day.imageUrl } : FALLBACK_IMAGE}
                style={styles.thumbnail}
                imageStyle={styles.thumbnail}
              />
              <View style={styles.dayBadge}>
                <Text style={styles.dayBadgeText}>{day.dayNumber}</Text>
              </View>
              {isViewed && !isLocked ? (
                <View style={styles.viewedBadge}>
                  <MaterialIcons name="check-circle" size={18} color="#4ade80" />
                </View>
              ) : null}
              {isLocked ? (
                <View style={styles.lockOverlay}>
                  <MaterialIcons name="lock" size={24} color="#64748b" />
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {currentDay?.hasGift ? (
        <Animated.View style={[styles.giftButtonSmall, giftButtonStyle]}>
          <Pressable
            onPress={handleGiftPress}
            android_ripple={{ color: '#fff' }}
            style={styles.giftPressable}
            accessibilityRole="button"
            accessibilityLabel="Abrir regalo del día"
          >
            <MaterialIcons name="card-giftcard" size={32} color="#fff" />
          </Pressable>
        </Animated.View>
      ) : null}

      <Modal
        visible={showGiftModal}
        transparent
        animationType="fade"
        onRequestClose={closeGiftModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeGiftModal}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎁 ¡Tienes un regalo!</Text>
              <TouchableOpacity
                onPress={closeGiftModal}
                style={styles.closeButton}
                accessibilityLabel="Cerrar modal de regalo"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <MaterialIcons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.giftNumberContainer}>
              <Text style={styles.giftNumberLabel}>Tu número es:</Text>
              <Text style={styles.giftNumber}>{giftNumber}</Text>
            </View>

            <TouchableOpacity
              onPress={closeGiftModal}
              style={styles.modalButton}
              accessibilityLabel="Cerrar"
            >
              <Text style={styles.modalButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );

  if (!isOnline && loadError && !days.length) {
    return (
      <LinearGradient colors={GRADIENT_COLORS} style={styles.container}>
        <StatusBar style="light" />
        <OfflineScreen onRetry={() => setReloadToken((n) => n + 1)} />
      </LinearGradient>
    );
  }

  if (loading) {
    return (
      <LinearGradient colors={GRADIENT_COLORS} style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Cargando calendario...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (loadError && !days.length) {
    return (
      <LinearGradient colors={GRADIENT_COLORS} style={styles.container}>
        <StatusBar style="light" />
        <OfflineScreen onRetry={() => setReloadToken((n) => n + 1)} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={GRADIENT_COLORS}
      style={[styles.container, Platform.OS === 'web' && styles.webRoot]}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollOuter}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.webInner}>{mainContent}</View>
      </ScrollView>
    </LinearGradient>
  );
}

function createStyles(screenWidth) {
  const imageSize = screenWidth * 0.88;

  return StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
    },
    scrollOuter: {
      flexGrow: 1,
      alignItems: 'center',
      paddingTop: safeArea.paddingTop,
      paddingBottom: safeArea.paddingBottom,
      paddingHorizontal: safeArea.paddingHorizontal,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: safeArea.paddingTop,
    },
    loadingText: {
      color: '#fff',
      fontSize: 18,
      marginTop: 20,
      fontWeight: '600',
    },
    dayText: {
      fontSize: 15,
      fontWeight: '300',
      color: '#fff',
      textAlign: 'center',
      marginBottom: 16,
      paddingHorizontal: 12,
      lineHeight: 26,
      textShadowColor: '#00000066',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : undefined,
      letterSpacing: 0.3,
      fontStyle: 'italic',
      maxWidth: imageSize,
    },
    daysLeftText: {
      fontSize: 26,
      fontWeight: '800',
      color: '#fff',
      marginBottom: 12,
      textShadowColor: '#00000088',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
      textAlign: 'center',
      maxWidth: imageSize,
    },
    imageContainer: {
      width: imageSize,
      height: imageSize,
      borderRadius: 22,
      overflow: 'hidden',
      backgroundColor: '#fff',
      shadowColor: '#000',
      shadowOpacity: 0.28,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 12,
      marginBottom: 14,
    },
    enrichingOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 2,
      backgroundColor: 'rgba(255,255,255,0.65)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    carousel: {
      width: '100%',
      height: '100%',
    },
    carouselItem: {
      width: imageSize,
      height: imageSize,
    },
    carouselImage: {
      width: '100%',
      height: '100%',
      borderRadius: 22,
    },
    paginationContainer: {
      position: 'absolute',
      bottom: 14,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    paginationDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      marginHorizontal: 4,
    },
    paginationDotActive: {
      backgroundColor: '#fff',
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    button: {
      backgroundColor: '#6200eecc',
      borderRadius: 44,
      marginBottom: 20,
      shadowColor: '#6200ee',
      shadowOpacity: 0.6,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 8,
      minHeight: 48,
      minWidth: 48,
    },
    giftButtonSmall: {
      backgroundColor: '#ff6b6b',
      borderRadius: 32,
      width: 64,
      height: 64,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#ff6b6b',
      shadowOpacity: 0.8,
      shadowRadius: 15,
      shadowOffset: { width: 0, height: 8 },
      elevation: 12,
      marginTop: 12,
      alignSelf: 'center',
    },
    pressable: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 20,
      minHeight: 48,
      minWidth: 48,
    },
    giftPressable: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    galleryTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: '#fff',
      marginBottom: 10,
      alignSelf: 'flex-start',
      maxWidth: imageSize,
    },
    scroll: {
      maxHeight: 120,
      width: '100%',
      maxWidth: imageSize,
    },
    scrollContent: {
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    thumbnailContainer: {
      marginHorizontal: 6,
      position: 'relative',
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    thumbnailActive: {
      borderColor: '#fff',
      transform: [{ scale: 1.05 }],
    },
    thumbnailLocked: {
      opacity: 0.35,
    },
    thumbnail: {
      width: 92,
      height: 92,
      borderRadius: 14,
    },
    dayBadge: {
      position: 'absolute',
      top: 6,
      left: 6,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 10,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    dayBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '800',
    },
    viewedBadge: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      backgroundColor: 'rgba(255,255,255,0.9)',
      borderRadius: 12,
      padding: 1,
    },
    lockOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255,255,255,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: '#fff',
      borderRadius: 22,
      padding: 28,
      width: '100%',
      maxWidth: 380,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#333',
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      padding: 8,
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    giftNumberContainer: {
      alignItems: 'center',
      marginVertical: 16,
    },
    giftNumberLabel: {
      fontSize: 18,
      color: '#666',
      marginBottom: 8,
    },
    giftNumber: {
      fontSize: 48,
      fontWeight: 'bold',
      color: '#ff6b6b',
    },
    modalButton: {
      backgroundColor: '#ff6b6b',
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 28,
      marginTop: 12,
      minHeight: 48,
      justifyContent: 'center',
    },
    modalButtonText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: 'bold',
    },
    webRoot: {
      alignItems: 'center',
    },
    webInner: {
      width: '100%',
      maxWidth: 440,
      alignItems: 'center',
    },
  });
}
