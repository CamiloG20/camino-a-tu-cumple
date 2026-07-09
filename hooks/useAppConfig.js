import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { DEFAULT_HOUR } from '../lib/dailyNotifications';
import { clearAppConfigCache, fetchAppConfig } from '../lib/appConfigClient';

export function useAppConfig({ enabled = true } = {}) {
  const [notificationHour, setNotificationHour] = useState(DEFAULT_HOUR);
  const [timezone, setTimezone] = useState('America/Guayaquil');
  const [globalBackgroundUrl, setGlobalBackgroundUrl] = useState(null);
  const [globalBackgroundPath, setGlobalBackgroundPath] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async ({ force = true } = {}) => {
    if (Platform.OS !== 'web') {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const config = await fetchAppConfig({ force });
      setNotificationHour(config.notificationHour ?? DEFAULT_HOUR);
      setTimezone(config.timezone || 'America/Guayaquil');
      setGlobalBackgroundUrl(config.backgroundUrl || null);
      setGlobalBackgroundPath(config.backgroundPath || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'web') {
      setLoading(false);
      return undefined;
    }

    refresh({ force: false });
  }, [enabled, refresh]);

  const invalidate = useCallback(() => {
    clearAppConfigCache();
    return refresh({ force: true });
  }, [refresh]);

  return {
    notificationHour,
    timezone,
    globalBackgroundUrl,
    globalBackgroundPath,
    loading,
    refresh,
    invalidate,
  };
}
