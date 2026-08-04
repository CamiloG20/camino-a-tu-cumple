import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDayWelcomePayload,
  markDayWelcomeShown,
  shouldShowDayWelcome,
} from '../lib/dailyNotifications';
import { resolveGiftMessage, getSurpriseOrdinal } from '../lib/giftSchedule';
import { getSurpriseCategoryName } from '../lib/surpriseCategories';
import {
  loadSurprisePicks,
  setSurprisePick,
  getUsedCategoryNames,
  getPendingSurpriseDayNumbers,
} from '../lib/surprisePicks';

const OPENED_GIFTS_KEY = 'openedGifts_v2';

/**
 * Flujo de sorpresas: welcome → juego de cartas → revelación del regalo.
 */
export function useSurpriseFlow({
  days,
  currentDay,
  loading,
  adminPreview,
  eventNotStarted,
  notificationHour,
}) {
  const [openedGifts, setOpenedGifts] = useState({});
  const [surprisePicks, setSurprisePicks] = useState({});
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftCategoryName, setGiftCategoryName] = useState('');
  const [giftSurpriseOrdinal, setGiftSurpriseOrdinal] = useState(null);
  const [giftMessage, setGiftMessage] = useState('');
  const [showSurpriseGame, setShowSurpriseGame] = useState(false);
  const [surpriseGameDay, setSurpriseGameDay] = useState(null);
  const [showDayWelcome, setShowDayWelcome] = useState(false);
  const [welcomePayload, setWelcomePayload] = useState(null);
  const [deferAutoSurprise, setDeferAutoSurprise] = useState(false);
  const [welcomeGiftDay, setWelcomeGiftDay] = useState(null);
  const [picksReady, setPicksReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [openedRaw, picks] = await Promise.all([
          AsyncStorage.getItem(OPENED_GIFTS_KEY),
          loadSurprisePicks(),
        ]);
        if (cancelled) return;
        if (openedRaw) {
          try {
            setOpenedGifts(JSON.parse(openedRaw) || {});
          } catch {
            setOpenedGifts({});
          }
        }
        setSurprisePicks(picks);
      } finally {
        if (!cancelled) setPicksReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    setShowSurpriseGame(false);
    setSurpriseGameDay(null);
    setDeferAutoSurprise(true);
  }, []);

  const dismissDayWelcome = useCallback(() => {
    try {
      markDayWelcomeShown(new Date());
    } catch {
      // ignore
    }
    setShowDayWelcome(false);
    setWelcomeGiftDay(null);
    setDeferAutoSurprise(true);
  }, []);

  const openDayWelcomeSurprise = useCallback(() => {
    try {
      markDayWelcomeShown(new Date());
    } catch {
      // ignore
    }
    const dayToOpen = welcomeGiftDay || currentDay;
    setShowDayWelcome(false);
    setWelcomeGiftDay(null);
    setDeferAutoSurprise(false);
    if (dayToOpen?.hasGift) {
      openGiftOrGame(dayToOpen);
    }
  }, [welcomeGiftDay, currentDay, openGiftOrGame]);

  const closeGiftModal = useCallback(() => {
    setShowGiftModal(false);
    setGiftCategoryName('');
    setGiftSurpriseOrdinal(null);
    setGiftMessage('');
  }, []);

  const handleGiftPress = useCallback(() => {
    if (currentDay?.hasGift) {
      setDeferAutoSurprise(false);
      openGiftOrGame(currentDay);
    }
  }, [currentDay, openGiftOrGame]);

  useEffect(() => {
    if (!picksReady || loading || adminPreview || eventNotStarted) return;
    if (showDayWelcome || showSurpriseGame || showGiftModal) return;
    if (deferAutoSurprise) return;

    const pending = getPendingSurpriseDayNumbers(surprisePicks, days);
    if (pending.length) {
      const day = days.find((d) => d.dayNumber === pending[0]);
      if (day?.hasGift) {
        setWelcomeGiftDay(day);
        setWelcomePayload({
          ...getDayWelcomePayload(new Date()),
          dayNumber: day.dayNumber,
          daysUntil: day.dayNumber,
        });
        setShowDayWelcome(true);
        return;
      }
    }

    if (shouldShowDayWelcome(new Date(), notificationHour)) {
      setWelcomeGiftDay(null);
      setWelcomePayload(getDayWelcomePayload(new Date()));
      setShowDayWelcome(true);
    }
  }, [
    picksReady,
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
  ]);

  return {
    openedGifts,
    setOpenedGifts,
    surprisePicks,
    setSurprisePicks,
    showGiftModal,
    giftCategoryName,
    giftSurpriseOrdinal,
    giftMessage,
    showSurpriseGame,
    surpriseGameDay,
    showDayWelcome,
    welcomePayload,
    usedCategoryNames: [...getUsedCategoryNames(surprisePicks)],
    mustPickSurprise: false,
    openGiftOrGame,
    handleSurprisePick,
    closeSurpriseGame,
    dismissDayWelcome,
    openDayWelcomeSurprise,
    closeGiftModal,
    handleGiftPress,
  };
}
