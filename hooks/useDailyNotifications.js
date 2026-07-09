import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { subscribeToDailyPush, unsubscribeFromDailyPush } from '../lib/webPushClient';
import {
  buildDailyNotificationPayload,
  DEFAULT_HOUR,
  isNotificationSupported,
  loadNotificationPrefs,
  msUntilNextLocalHour,
  requestNotificationPermission,
  saveNotificationPrefs,
  shouldNotifyNow,
  showDailyNotification,
} from '../lib/dailyNotifications';

export function useDailyNotifications({ enabled: active = true, notificationHour = DEFAULT_HOUR } = {}) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [prefs, setPrefs] = useState({ enabled: false });
  const timerRef = useRef(null);
  const hourRef = useRef(notificationHour);

  useEffect(() => {
    hourRef.current = notificationHour;
  }, [notificationHour]);

  const refreshPermission = useCallback(() => {
    if (!isNotificationSupported()) {
      setSupported(false);
      setPermission('unsupported');
      return;
    }
    setSupported(true);
    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    refreshPermission();
    setPrefs(loadNotificationPrefs());
  }, [refreshPermission]);

  const runDailyCheck = useCallback(async () => {
    if (!active || Platform.OS !== 'web') return;

    const currentPrefs = loadNotificationPrefs();
    setPrefs(currentPrefs);

    if (!shouldNotifyNow(currentPrefs, new Date(), hourRef.current)) return;

    const payload = buildDailyNotificationPayload();
    await showDailyNotification(payload);
  }, [active]);

  const scheduleNextCheck = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (Platform.OS !== 'web' || !active) return;

    const currentPrefs = loadNotificationPrefs();
    if (!currentPrefs.enabled || Notification.permission !== 'granted') return;

    const delay = msUntilNextLocalHour(hourRef.current);
    timerRef.current = setTimeout(async () => {
      await runDailyCheck();
      scheduleNextCheck();
    }, delay);
  }, [active, runDailyCheck]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !active) return undefined;

    runDailyCheck();
    scheduleNextCheck();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        runDailyCheck();
        scheduleNextCheck();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, runDailyCheck, scheduleNextCheck, prefs.enabled, permission, notificationHour]);

  const enableDailyNotifications = useCallback(async () => {
    const result = await requestNotificationPermission();
    refreshPermission();

    if (result !== 'granted') {
      return result;
    }

    const nextPrefs = { enabled: true };
    saveNotificationPrefs(nextPrefs);
    setPrefs(nextPrefs);

    try {
      await subscribeToDailyPush();
    } catch (error) {
      console.warn('Push diario no registrado:', error.message);
    }

    scheduleNextCheck();
    await runDailyCheck();
    return 'granted';
  }, [refreshPermission, runDailyCheck, scheduleNextCheck]);

  const disableDailyNotifications = useCallback(async () => {
    const nextPrefs = { enabled: false };
    saveNotificationPrefs(nextPrefs);
    setPrefs(nextPrefs);
    try {
      await unsubscribeFromDailyPush();
    } catch {
      // ignore
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    supported,
    permission,
    prefs,
    notificationHour,
    enableDailyNotifications,
    disableDailyNotifications,
    refreshPermission,
  };
}
