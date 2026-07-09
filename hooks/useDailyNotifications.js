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

export function useDailyNotifications({ enabled: active = true } = {}) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [prefs, setPrefs] = useState({ enabled: false, hour: DEFAULT_HOUR });
  const timerRef = useRef(null);

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

    if (!shouldNotifyNow(currentPrefs)) return;

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

    const delay = msUntilNextLocalHour(currentPrefs.hour ?? DEFAULT_HOUR);
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
  }, [active, runDailyCheck, scheduleNextCheck, prefs.enabled, permission]);

  const enableDailyNotifications = useCallback(async () => {
    const result = await requestNotificationPermission();
    refreshPermission();

    if (result !== 'granted') {
      return result;
    }

    const nextPrefs = { enabled: true, hour: DEFAULT_HOUR };
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
    const nextPrefs = { enabled: false, hour: DEFAULT_HOUR };
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
    enableDailyNotifications,
    disableDailyNotifications,
    refreshPermission,
  };
}
