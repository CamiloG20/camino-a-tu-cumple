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
  Platform,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { DataService } from './services/dataService';
import { AdminApi, isAdminAuthenticated } from './services/adminApi';
import { isSupabaseConfigured } from './lib/config';
import { getDaysUntilBirthday, getTodayDayIndex, getCalendarDateForDayNumber, formatCalendarDate, isBeforeEventStart, getDaysUntilEventStart, getEventStartDate } from './lib/calendar';
import { GRADIENT_COLORS, BIRTHDAY_GRADIENT_COLORS, getContentWidth, safeArea } from './lib/layout';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import ProgressiveImage from './components/ProgressiveImage';
import InstallPwaBanner from './components/InstallPwaBanner';
import OfflineScreen from './components/OfflineScreen';
import EventNotStartedScreen from './components/EventNotStartedScreen';
import AudioSeekBar from './components/AudioSeekBar';
import GiftModal from './components/GiftModal';
import FallbackBanner from './components/FallbackBanner';
import DayGallery from './components/DayGallery';
import { getGiftMessage, resolveGiftMessage } from './lib/giftSchedule';

const FALLBACK_IMAGE = require('./assets/images/fondo.png');
const VIEWED_KEY = 'viewedImages';
const OPENED_GIFTS_KEY = 'openedGifts';

function parseStorageJson(value, fallback = {}) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export default function App({ previewDayNumber = null, adminPreview = false }) {
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = getContentWidth(windowWidth);
  const styles = useMemo(() => createStyles(screenWidth), [screenWidth]);
  const isOnline = useNetworkStatus();

  const [todayIndex, setTodayIndex] = useState(0);
  const [viewed, setViewed] = useState({});
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrichingDay, setEnrichingDay] = useState(false);
  const [enrichError, setEnrichError] = useState('');
  const [currentDay, setCurrentDay] = useState(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftNumber, setGiftNumber] = useState(null);
  const [diff, setDiff] = useState(0);
  const [realTodayIndex, setRealTodayIndex] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [usingCache, setUsingCache] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [openedGifts, setOpenedGifts] = useState({});
  const [giftMessage, setGiftMessage] = useState('');
  const [eventNotStarted, setEventNotStarted] = useState(false);
  const [daysUntilStart, setDaysUntilStart] = useState(0);
  const flatListRef = useRef(null);
  const galleryRef = useRef(null);
  const dayNavTokenRef = useRef(0);
  const realTodayIndexRef = useRef(0);

  useEffect(() => {
    realTodayIndexRef.current = realTodayIndex;
  }, [realTodayIndex]);

  const {
    hasValidAudio,
    isPlaying,
    audioPosition,
    audioDuration,
    audioLoading,
    togglePlayback,
    handleSeekStart,
    handleSeekComplete,
    setAudioPosition,
    formatAudioTime,
  } = useAudioPlayer(currentDay?.audioUrl);

  const markGiftOpened = useCallback(async (dayNumber) => {
    const key = String(dayNumber);
    setOpenedGifts((prev) => {
      if (prev[key]) return prev;
      const next = { ...prev, [key]: true };
      AsyncStorage.setItem(OPENED_GIFTS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const openGiftModal = useCallback(
    (day) => {
      if (!day?.hasGift || day.giftNumber == null) return;
      setGiftNumber(day.giftNumber);
      setGiftMessage(resolveGiftMessage(day));
      setShowGiftModal(true);
      markGiftOpened(day.dayNumber);
    },
    [markGiftOpened]
  );

  const markDayViewed = useCallback(async (dayNumber) => {
    const key = String(dayNumber);
    setViewed((prev) => {
      if (prev[key]) return prev;
      const next = { ...prev, [key]: true };
      AsyncStorage.setItem(VIEWED_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const applyDayAtIndex = useCallback(
    async (daysList, index, isActive = () => true) => {
      if (index > realTodayIndexRef.current) {
        return null;
      }

      let day = daysList[index];
      if (!day?.enriched) {
        setEnrichingDay(true);
        setEnrichError('');
        try {
          day = await DataService.enrichDayFull(day);
          if (!isActive()) return day;
          setDays((prev) => prev.map((item, i) => (i === index ? day : item)));
        } catch (error) {
          if (!isActive()) return day;
          setEnrichError(error.message || 'No se pudo cargar el contenido del día');
          Alert.alert('Error', 'No se pudo cargar el contenido completo de este día.');
        } finally {
          if (isActive()) {
            setEnrichingDay(false);
          }
        }
      }

      if (!isActive()) return day;

      setTodayIndex(index);
      setCurrentDay(day);
      setCurrentPhotoIndex(0);
      markDayViewed(day.dayNumber);
      return day;
    },
    [markDayViewed]
  );

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        setLoadError(false);
        setUsingFallback(false);
        setUsingCache(false);

        let daysData;
        let fallback = false;
        let fromCache = false;

        try {
          if (adminPreview) {
            if (!isAdminAuthenticated()) {
              throw new Error('Preview requiere sesión admin');
            }
            const adminRows = await AdminApi.getDays();
            daysData = await DataService.getAllDaysLight({
              adminDays: DataService.mapAdminDays(adminRows),
            });
          } else if (!isSupabaseConfigured()) {
            throw new Error('Supabase no configurado');
          } else {
            const result = await DataService.loadDaysWithCache();
            daysData = result.days;
            fromCache = result.fromCache;
          }
        } catch (dataError) {
          console.warn('⚠️ Error con Supabase:', dataError);
          const cached = await DataService.getCachedDays();
          if (cached) {
            daysData = cached;
            fromCache = true;
          } else {
            daysData = await DataService.getFallbackData();
            fallback = true;
          }
        }

        if (cancelled) return;

        const calculatedDiff = getDaysUntilBirthday();
        const beforeStart = !adminPreview && isBeforeEventStart();
        let index = beforeStart ? -1 : getTodayDayIndex(daysData.length);

        if (adminPreview) {
          const previewIndex = daysData.findIndex((d) => d.dayNumber === previewDayNumber);
          if (previewIndex >= 0) {
            index = previewIndex;
          }
        }

        const viewedData = await AsyncStorage.getItem(VIEWED_KEY);
        const openedData = await AsyncStorage.getItem(OPENED_GIFTS_KEY);
        if (cancelled) return;

        setViewed(parseStorageJson(viewedData));
        setOpenedGifts(parseStorageJson(openedData));
        setDays(daysData);
        setDiff(calculatedDiff);
        setEventNotStarted(beforeStart);
        setDaysUntilStart(beforeStart ? getDaysUntilEventStart() : 0);
        setRealTodayIndex(adminPreview ? daysData.length - 1 : index);
        setTodayIndex(index);
        setCurrentDay(index >= 0 ? daysData[index] : null);
        setUsingFallback(fallback);
        setUsingCache(fromCache && !fallback);

        if (index >= 0) {
          await applyDayAtIndex(daysData, index, () => !cancelled);
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
    };
  }, [reloadToken, applyDayAtIndex, adminPreview, previewDayNumber]);

  useEffect(() => {
    if (loading || !currentDay?.hasGift || todayIndex !== realTodayIndex) return;
    if (openedGifts[String(currentDay.dayNumber)]) return;
    openGiftModal(currentDay);
  }, [loading, currentDay, todayIndex, realTodayIndex, openedGifts, openGiftModal]);

  useEffect(() => {
    if (!galleryRef.current || todayIndex < 0) return;
    galleryRef.current.scrollToIndex?.({
      index: todayIndex,
      animated: true,
      viewPosition: 0.5,
    });
  }, [todayIndex, loading]);

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

  function handleGiftPress() {
    if (currentDay?.hasGift) {
      openGiftModal(currentDay);
    }
  }

  function closeGiftModal() {
    setShowGiftModal(false);
    setGiftNumber(null);
    setGiftMessage('');
  }

  const effectiveTodayIndex = adminPreview
    ? days.length - 1
    : eventNotStarted
      ? -1
      : realTodayIndex;

  async function onPressImage(index) {
    if (index > effectiveTodayIndex) {
      Alert.alert('Bloqueado', 'No puedes ver días futuros.');
      return;
    }
    const token = ++dayNavTokenRef.current;
    const isActive = () => dayNavTokenRef.current === token;
    await applyDayAtIndex(days, index, isActive);
  }

  const previewBaseIndex = adminPreview
    ? days.findIndex((d) => d.dayNumber === previewDayNumber)
    : realTodayIndex;

  function goToToday() {
    const targetIndex = adminPreview
      ? (previewBaseIndex >= 0 ? previewBaseIndex : realTodayIndex)
      : realTodayIndex;
    if (todayIndex === targetIndex) return;
    const token = ++dayNavTokenRef.current;
    const isActive = () => dayNavTokenRef.current === token;
    applyDayAtIndex(days, targetIndex, isActive);
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

  const viewingPastDay = adminPreview
    ? previewBaseIndex >= 0 && todayIndex !== previewBaseIndex
    : todayIndex !== realTodayIndex;
  const isBirthdayDay = diff === 0 && !viewingPastDay;
  const calendarDateLabel = currentDay
    ? formatCalendarDate(getCalendarDateForDayNumber(currentDay.dayNumber))
    : '';
  const headerText = isBirthdayDay
    ? '¡Feliz cumpleaños! 🎂❤️'
    : viewingPastDay && currentDay
      ? `Viendo el día ${currentDay.dayNumber}`
      : `Faltan ${diff} días 🎂❤️`;

  const activeGradient = isBirthdayDay ? BIRTHDAY_GRADIENT_COLORS : GRADIENT_COLORS;

  const mainContent = (
    <>
      <InstallPwaBanner />
      {adminPreview ? (
        <View style={styles.previewBanner}>
          <Text style={styles.previewBannerText}>
            Vista previa admin — día {previewDayNumber} (puedes navegar todos los días)
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (typeof window !== 'undefined') window.location.hash = '#/admin';
            }}
            accessibilityRole="button"
            accessibilityLabel="Volver al panel admin"
          >
            <Text style={styles.previewBannerLink}>← Volver al admin</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {usingFallback ? <FallbackBanner /> : null}
      {usingCache ? (
        <View style={styles.cacheBanner} accessibilityRole="text">
          <Text style={styles.cacheBannerText}>Modo sin conexión: mostrando el calendario guardado.</Text>
        </View>
      ) : null}

      <Text
        style={[styles.daysLeftText, isBirthdayDay && styles.birthdayHeaderText]}
        accessibilityRole="header"
      >
        {headerText}
      </Text>

      {currentDay ? (
        <Text style={styles.calendarDateText}>
          Día {currentDay.dayNumber} · {calendarDateLabel}
        </Text>
      ) : null}

      {viewingPastDay ? (
        <TouchableOpacity
          style={styles.backToTodayBtn}
          onPress={goToToday}
          accessibilityRole="button"
          accessibilityLabel={adminPreview ? `Volver al día ${previewDayNumber}` : 'Volver al día de hoy'}
        >
          <MaterialIcons name="today" size={18} color="#fff" />
          <Text style={styles.backToTodayText}>
            {adminPreview ? `Volver al día ${previewDayNumber}` : 'Volver a hoy'}
          </Text>
        </TouchableOpacity>
      ) : null}

      {currentDay && (
        <>
          {currentDay.text ? <Text style={styles.dayText}>{currentDay.text}</Text> : null}
          {enrichError ? <Text style={styles.enrichErrorText}>{enrichError}</Text> : null}

          <Animated.View
            key={`day-${currentDay.dayNumber}`}
            entering={FadeIn.duration(280)}
            exiting={FadeOut.duration(180)}
            style={[styles.imageContainer, isBirthdayDay && styles.birthdayImageContainer]}
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
                  accessibilityLabel={`Carrusel de fotos del día ${currentDay.dayNumber}, foto ${currentPhotoIndex + 1} de ${currentDay.photos.length}`}
                  getItemLayout={(_, index) => ({
                    length: screenWidth * 0.88,
                    offset: screenWidth * 0.88 * index,
                    index,
                  })}
                  initialNumToRender={1}
                  maxToRenderPerBatch={2}
                  windowSize={3}
                  removeClippedSubviews={Platform.OS !== 'web'}
                />
                <View style={styles.paginationContainer} accessibilityElementsHidden>
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
                {currentDay.hasGift ? (
                  <View style={styles.imageGiftBadge}>
                    <MaterialIcons name="card-giftcard" size={22} color="#fff" />
                    <Text style={styles.imageGiftBadgeText}>Regalo</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.imageWrap}>
                <ProgressiveImage
                  source={currentDay?.imageUrl ? { uri: currentDay.imageUrl } : FALLBACK_IMAGE}
                  style={styles.image}
                  imageStyle={styles.image}
                  accessibilityLabel={`Imagen del día ${currentDay.dayNumber}`}
                />
                {currentDay.hasGift ? (
                  <View style={styles.imageGiftBadge}>
                    <MaterialIcons name="card-giftcard" size={22} color="#fff" />
                    <Text style={styles.imageGiftBadgeText}>Regalo</Text>
                  </View>
                ) : null}
              </View>
            )}
          </Animated.View>

          {hasValidAudio ? (
            <>
              <Animated.View style={[styles.button, audioButtonStyle]}>
                <Pressable
                  onPress={togglePlayback}
                  disabled={audioLoading}
                  android_ripple={{ color: '#fff' }}
                  style={styles.pressable}
                  accessibilityRole="button"
                  accessibilityLabel={isPlaying ? 'Pausar canción' : 'Reproducir canción del día'}
                  accessibilityState={{ disabled: audioLoading }}
                >
                  {audioLoading ? (
                    <ActivityIndicator color="#fff" size="large" />
                  ) : (
                    <MaterialIcons
                      name={isPlaying ? 'pause-circle-filled' : 'play-circle-filled'}
                      size={48}
                      color="#fff"
                    />
                  )}
                </Pressable>
              </Animated.View>

              <View style={styles.audioControls}>
                <View style={styles.audioTimeRow}>
                  <Text style={styles.audioTime}>{formatAudioTime(audioPosition)}</Text>
                  <Text style={styles.audioTime}>{formatAudioTime(audioDuration)}</Text>
                </View>
                <AudioSeekBar
                  position={audioPosition}
                  duration={audioDuration}
                  currentTimeLabel={formatAudioTime(audioPosition)}
                  durationLabel={formatAudioTime(audioDuration)}
                  onSeekStart={handleSeekStart}
                  onSeek={setAudioPosition}
                  onSeekComplete={handleSeekComplete}
                  disabled={!hasValidAudio || audioLoading}
                />
              </View>
            </>
          ) : null}
        </>
      )}

      <DayGallery
        days={days}
        todayIndex={todayIndex}
        effectiveTodayIndex={effectiveTodayIndex}
        viewed={viewed}
        openedGifts={openedGifts}
        onPressDay={onPressImage}
        fallbackImage={FALLBACK_IMAGE}
        galleryRef={galleryRef}
        screenWidth={screenWidth}
      />

      {currentDay?.hasGift ? (
        <Animated.View
          style={[
            styles.giftButtonSmall,
            giftButtonStyle,
            !openedGifts[String(currentDay.dayNumber)] && styles.giftButtonPulse,
          ]}
        >
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

      <GiftModal
        visible={showGiftModal}
        giftNumber={giftNumber}
        giftMessage={giftMessage}
        onClose={closeGiftModal}
      />
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

  if (eventNotStarted && !adminPreview) {
    return (
      <LinearGradient colors={GRADIENT_COLORS} style={styles.container}>
        <StatusBar style="light" />
        <EventNotStartedScreen
          daysUntilStart={daysUntilStart}
          startDate={getEventStartDate()}
        />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={activeGradient}
      style={[styles.container, Platform.OS === 'web' && styles.webRoot]}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollOuter}
        showsVerticalScrollIndicator={false}
        bounces={false}
        nestedScrollEnabled
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
    enrichErrorText: {
      color: '#fecaca',
      fontSize: 13,
      textAlign: 'center',
      marginBottom: 8,
      maxWidth: imageSize,
    },
    daysLeftText: {
      fontSize: 26,
      fontWeight: '800',
      color: '#fff',
      marginBottom: 6,
      textShadowColor: '#00000088',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
      textAlign: 'center',
      maxWidth: imageSize,
    },
    birthdayHeaderText: {
      fontSize: 30,
      letterSpacing: 0.5,
    },
    calendarDateText: {
      color: '#f1f5f9',
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 10,
      textAlign: 'center',
      opacity: 0.95,
    },
    backToTodayBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    backToTodayText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 14,
    },
    cacheBanner: {
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 10,
      padding: 10,
      marginBottom: 10,
      width: '100%',
      maxWidth: imageSize,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    cacheBannerText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
    previewBanner: {
      width: '100%',
      maxWidth: imageSize,
      backgroundColor: 'rgba(251, 191, 36, 0.95)',
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      gap: 6,
    },
    previewBannerText: {
      color: '#78350f',
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
    },
    previewBannerLink: {
      color: '#6a11cb',
      fontWeight: '800',
      fontSize: 13,
      textAlign: 'center',
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
    birthdayImageContainer: {
      borderWidth: 3,
      borderColor: '#fbbf24',
      shadowColor: '#ff6b6b',
      shadowOpacity: 0.5,
      shadowRadius: 20,
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
    imageWrap: {
      width: '100%',
      height: '100%',
      position: 'relative',
    },
    imageGiftBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#ff6b6bee',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
    },
    imageGiftBadgeText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 12,
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
      backgroundColor: '#6a11cbcc',
      borderRadius: 44,
      marginBottom: 20,
      shadowColor: '#6a11cb',
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
      borderWidth: 2,
      borderColor: '#fff3',
    },
    giftButtonPulse: {
      shadowOpacity: 1,
      shadowRadius: 22,
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
    audioControls: {
      width: '100%',
      maxWidth: imageSize,
      marginTop: -8,
      marginBottom: 20,
      paddingHorizontal: 4,
    },
    audioTimeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    audioTime: {
      color: '#e2e8f0',
      fontSize: 12,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
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
      paddingVertical: 8,
      paddingHorizontal: 8,
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
    thumbnailGift: {
      borderColor: '#fbbf24',
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
    giftThumbBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      backgroundColor: '#ff6b6b',
      borderRadius: 12,
      padding: 4,
      minWidth: 24,
      minHeight: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    giftThumbBadgeLocked: {
      backgroundColor: '#94a3b8',
    },
    giftOpenedBadge: {
      position: 'absolute',
      bottom: 6,
      left: 6,
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderRadius: 12,
      padding: 2,
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
