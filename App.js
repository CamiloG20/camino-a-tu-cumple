import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
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
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { DataService } from './services/dataService';
import { AdminApi, isAdminAuthenticated } from './services/adminApi';
import { isSupabaseConfigured } from './lib/config';
import { getDaysUntilBirthday, getTodayDayIndexFromDays, getCalendarDateForDayNumber, formatCalendarDate, isBeforeEventStart, getDaysUntilEventStart, getEventStartDate } from './lib/calendar';
import { BACKGROUND_OVERLAY_COLORS, BIRTHDAY_BACKGROUND_OVERLAY_COLORS, getContentWidth } from './lib/layout';
import AppBackground from './components/AppBackground';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useAppConfig } from './hooks/useAppConfig';
import ProgressiveImage from './components/ProgressiveImage';
import InstallPwaBanner from './components/InstallPwaBanner';
import DailyNotificationBanner from './components/DailyNotificationBanner';
import OfflineScreen from './components/OfflineScreen';
import EventNotStartedScreen from './components/EventNotStartedScreen';
import AudioSeekBar from './components/AudioSeekBar';
import GiftModal from './components/GiftModal';
import SurprisePickGame from './components/SurprisePickGame';
import FallbackBanner from './components/FallbackBanner';
import DayGallery from './components/DayGallery';
import DayUnlockedModal from './components/DayUnlockedModal';
import {
  getDayWelcomePayload,
  markDayWelcomeShown,
  shouldShowDayWelcome,
} from './lib/dailyNotifications';
import { resolveGiftMessage, getSurpriseOrdinal, GIFT_DAY_COUNT } from './lib/giftSchedule';
import { createStyles } from './App.styles';
import { getSurpriseCategoryName } from './lib/surpriseCategories';
import {
  loadSurprisePicks,
  setSurprisePick,
  getUsedCategoryNames,
  getPendingSurpriseDayNumbers,
} from './lib/surprisePicks';

const FALLBACK_IMAGE = require('./assets/images/fondo.png');
const VIEWED_KEY = 'viewedImages';
/** v2: limpia aperturas de prueba del juego de sorpresas */
const OPENED_GIFTS_KEY = 'openedGifts_v2';

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
  const { notificationHour, globalBackgroundUrl } = useAppConfig();

  const [todayIndex, setTodayIndex] = useState(0);
  const [viewed, setViewed] = useState({});
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrichingDay, setEnrichingDay] = useState(false);
  const [enrichError, setEnrichError] = useState('');
  const [currentDay, setCurrentDay] = useState(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftCategoryName, setGiftCategoryName] = useState('');
  const [giftSurpriseOrdinal, setGiftSurpriseOrdinal] = useState(null);
  const [diff, setDiff] = useState(0);
  const [realTodayIndex, setRealTodayIndex] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [usingCache, setUsingCache] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [openedGifts, setOpenedGifts] = useState({});
  const [giftMessage, setGiftMessage] = useState('');
  const [surprisePicks, setSurprisePicks] = useState({});
  const [showSurpriseGame, setShowSurpriseGame] = useState(false);
  const [surpriseGameDay, setSurpriseGameDay] = useState(null);
  const [eventNotStarted, setEventNotStarted] = useState(false);
  const [daysUntilStart, setDaysUntilStart] = useState(0);
  const [showDayWelcome, setShowDayWelcome] = useState(false);
  const [welcomePayload, setWelcomePayload] = useState(null);
  /** Tras “Ver después”, no abrir sorpresa/regalo automáticamente. */
  const [deferAutoSurprise, setDeferAutoSurprise] = useState(false);
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

  const openGiftReveal = useCallback(
    (day, categoryName) => {
      if (!day?.hasGift || !categoryName) return;
      const ordinal = getSurpriseOrdinal(day.dayNumber);
      setGiftCategoryName(getSurpriseCategoryName(categoryName) || categoryName);
      setGiftSurpriseOrdinal(ordinal);
      setGiftMessage(resolveGiftMessage(day));
      setShowGiftModal(true);
      markGiftOpened(day.dayNumber);
    },
    [markGiftOpened]
  );

  const startSurpriseGame = useCallback((day) => {
    if (!day?.hasGift) return;
    setSurpriseGameDay(day);
    setShowSurpriseGame(true);
  }, []);

  const openGiftOrGame = useCallback(
    (day, picks = surprisePicks) => {
      if (!day?.hasGift) return;
      const categoryName = picks[String(day.dayNumber)];
      if (categoryName) {
        openGiftReveal(day, categoryName);
        return;
      }
      startSurpriseGame(day);
    },
    [surprisePicks, openGiftReveal, startSurpriseGame]
  );

  const handleSurprisePick = useCallback(
    async (categoryName) => {
      if (!surpriseGameDay) return;
      try {
        const next = await setSurprisePick(surpriseGameDay.dayNumber, categoryName);
        setSurprisePicks(next);
        setShowSurpriseGame(false);
        const day = surpriseGameDay;
        setSurpriseGameDay(null);
        openGiftReveal(day, categoryName);
      } catch (error) {
        Alert.alert('Ups', error.message || 'No se pudo guardar tu elección');
        throw error;
      }
    },
    [surpriseGameDay, openGiftReveal]
  );

  const closeSurpriseGame = useCallback(() => {
    const pending = getPendingSurpriseDayNumbers(surprisePicks, days);
    // No dejar cerrar si hay sorpresa pendiente por elegir
    if (pending.length && surpriseGameDay && pending.includes(surpriseGameDay.dayNumber)) {
      return;
    }
    setShowSurpriseGame(false);
    setSurpriseGameDay(null);
  }, [surprisePicks, surpriseGameDay, days]);

  const dismissDayWelcome = useCallback(() => {
    try {
      markDayWelcomeShown(new Date());
    } catch {
      // localStorage puede fallar en modo privado
    }
    setShowDayWelcome(false);
    setDeferAutoSurprise(true);
  }, []);

  const openDayWelcomeSurprise = useCallback(() => {
    try {
      markDayWelcomeShown(new Date());
    } catch {
      // ignore
    }
    setShowDayWelcome(false);
    setDeferAutoSurprise(false);
    if (currentDay?.hasGift && todayIndex === realTodayIndex) {
      openGiftOrGame(currentDay);
    }
  }, [currentDay, todayIndex, realTodayIndex, openGiftOrGame]);

  const mustPickSurprise = useMemo(() => {
    if (!surpriseGameDay) return false;
    const pending = getPendingSurpriseDayNumbers(surprisePicks, days);
    return pending.includes(surpriseGameDay.dayNumber);
  }, [surpriseGameDay, surprisePicks, days]);

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

        // hasGift viene de Supabase (no recalcular en cliente: evita spoilers / desync)
        const calculatedDiff = getDaysUntilBirthday();
        const beforeStart = !adminPreview && isBeforeEventStart();
        let index = beforeStart ? -1 : getTodayDayIndexFromDays(daysData);

        if (adminPreview) {
          const previewIndex = daysData.findIndex((d) => d.dayNumber === previewDayNumber);
          if (previewIndex >= 0) {
            index = previewIndex;
          }
        }

        const viewedData = await AsyncStorage.getItem(VIEWED_KEY);
        const openedData = await AsyncStorage.getItem(OPENED_GIFTS_KEY);
        const picks = await loadSurprisePicks();
        if (cancelled) return;

        setViewed(parseStorageJson(viewedData));
        setOpenedGifts(parseStorageJson(openedData));
        setSurprisePicks(picks);
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
    if (loading || adminPreview || eventNotStarted) return;
    // Una sola cola: bienvenida → sorpresa pendiente → regalo de hoy
    if (showDayWelcome || showSurpriseGame || showGiftModal) return;

    if (shouldShowDayWelcome(new Date(), notificationHour)) {
      setWelcomePayload(getDayWelcomePayload());
      setShowDayWelcome(true);
      setDeferAutoSurprise(false);
      return;
    }

    // “Ver después”: deja ver el calendario; el regalo se abre al tocar el icono
    if (deferAutoSurprise) return;

    const pending = getPendingSurpriseDayNumbers(surprisePicks, days);
    if (pending.length) {
      const day = days.find((d) => d.dayNumber === pending[0]);
      if (day?.hasGift) {
        startSurpriseGame(day);
        return;
      }
    }

    if (!currentDay?.hasGift || todayIndex !== realTodayIndex) return;
    if (openedGifts[String(currentDay.dayNumber)] && surprisePicks[String(currentDay.dayNumber)]) {
      return;
    }
    openGiftOrGame(currentDay);
  }, [
    loading,
    adminPreview,
    eventNotStarted,
    showDayWelcome,
    showSurpriseGame,
    showGiftModal,
    deferAutoSurprise,
    notificationHour,
    surprisePicks,
    days,
    currentDay,
    todayIndex,
    realTodayIndex,
    openedGifts,
    startSurpriseGame,
    openGiftOrGame,
  ]);

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
      setDeferAutoSurprise(false);
      openGiftOrGame(currentDay);
    }
  }

  function closeGiftModal() {
    setShowGiftModal(false);
    setGiftCategoryName('');
    setGiftSurpriseOrdinal(null);
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

  const activeBackgroundOverlay = isBirthdayDay
    ? BIRTHDAY_BACKGROUND_OVERLAY_COLORS
    : BACKGROUND_OVERLAY_COLORS;
  const activeBackgroundUrl = currentDay?.backgroundUrl || globalBackgroundUrl || null;

  const mainContent = (
    <>
      <InstallPwaBanner />
      <DailyNotificationBanner active={!adminPreview} notificationHour={notificationHour} />
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
                <ActivityIndicator color="#0f2c2e" size="large" />
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
            !openedGifts[String(currentDay.dayNumber)] &&
              surprisePicks[String(currentDay.dayNumber)] == null &&
              styles.giftButtonPulse,
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
    </>
  );

  const modals = (
    <>
      <GiftModal
        visible={showGiftModal}
        categoryName={giftCategoryName}
        giftMessage={giftMessage}
        surpriseOrdinal={giftSurpriseOrdinal}
        surpriseTotal={GIFT_DAY_COUNT}
        onClose={closeGiftModal}
      />

      <SurprisePickGame
        visible={showSurpriseGame}
        dayNumber={surpriseGameDay?.dayNumber}
        surpriseOrdinal={
          surpriseGameDay ? getSurpriseOrdinal(surpriseGameDay.dayNumber) : null
        }
        usedCategoryNames={[...getUsedCategoryNames(surprisePicks)]}
        mustPick={mustPickSurprise}
        onPick={handleSurprisePick}
        onClose={closeSurpriseGame}
      />

      <DayUnlockedModal
        visible={showDayWelcome}
        dayNumber={welcomePayload?.dayNumber}
        daysUntil={welcomePayload?.daysUntil ?? diff}
        isBirthday={Boolean(welcomePayload?.isBirthday)}
        onOpen={openDayWelcomeSurprise}
        onClose={dismissDayWelcome}
      />
    </>
  );

  if (!isOnline && loadError && !days.length) {
    return (
      <AppBackground overlayColors={BACKGROUND_OVERLAY_COLORS} style={styles.container} imageUrl={globalBackgroundUrl}>
        <StatusBar style="light" />
        <OfflineScreen onRetry={() => setReloadToken((n) => n + 1)} />
      </AppBackground>
    );
  }

  if (loading) {
    return (
      <AppBackground overlayColors={BACKGROUND_OVERLAY_COLORS} style={styles.container} imageUrl={globalBackgroundUrl}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Cargando calendario...</Text>
        </View>
      </AppBackground>
    );
  }

  if (loadError && !days.length) {
    return (
      <AppBackground overlayColors={BACKGROUND_OVERLAY_COLORS} style={styles.container} imageUrl={globalBackgroundUrl}>
        <StatusBar style="light" />
        <OfflineScreen onRetry={() => setReloadToken((n) => n + 1)} />
      </AppBackground>
    );
  }

  if (eventNotStarted && !adminPreview) {
    return (
      <AppBackground overlayColors={BACKGROUND_OVERLAY_COLORS} style={styles.container} imageUrl={globalBackgroundUrl}>
        <StatusBar style="light" />
        <View style={styles.preStartWrap}>
          <DailyNotificationBanner active notificationHour={notificationHour} />
          <EventNotStartedScreen
            daysUntilStart={daysUntilStart}
            startDate={getEventStartDate()}
          />
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground
      overlayColors={activeBackgroundOverlay}
      style={styles.container}
      imageUrl={activeBackgroundUrl}
    >
      <StatusBar style="light" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollOuter}
        showsVerticalScrollIndicator={false}
        bounces={false}
        nestedScrollEnabled
      >
        <View style={styles.webInner}>{mainContent}</View>
      </ScrollView>
      {modals}
    </AppBackground>
  );
}

