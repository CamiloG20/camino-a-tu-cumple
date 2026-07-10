import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useDailyNotifications } from '../hooks/useDailyNotifications';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { DISMISS_BANNER_KEY } from '../lib/dailyNotifications';

function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function formatHourLabel(hour) {
  return `${String(hour).padStart(2, '0')}:00`;
}

export default function DailyNotificationBanner({ active = true, notificationHour = 10 }) {
  const { supported, permission, prefs, enableDailyNotifications } =
    useDailyNotifications({ enabled: active, notificationHour });
  const { isStandalone } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true);
  const [busy, setBusy] = useState(false);

  const needsIosInstall = isIosDevice() && !isStandalone;
  const hourLabel = formatHourLabel(notificationHour);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
    setDismissed(localStorage.getItem(DISMISS_BANNER_KEY) === '1');
  }, []);

  if (Platform.OS !== 'web' || !active || !supported) {
    return null;
  }

  if (permission === 'denied') {
    return null;
  }

  if (prefs.enabled && permission === 'granted') {
    return null;
  }

  if (dismissed) {
    return null;
  }

  async function handleEnable() {
    setBusy(true);
    try {
      const result = await enableDailyNotifications();
      if (result === 'denied') {
        setDismissed(true);
        localStorage.setItem(DISMISS_BANNER_KEY, '1');
      }
    } finally {
      setBusy(false);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem(DISMISS_BANNER_KEY, '1');
  }

  return (
    <View style={styles.banner}>
      <MaterialIcons name="favorite" size={22} color="#fda4af" />
      <View style={styles.textWrap}>
        <Text style={styles.title}>Recordatorio diario · {hourLabel} Ecuador</Text>
        <Text style={styles.body}>
          {needsIosInstall
            ? 'En iPhone: primero “Añadir a pantalla de inicio”, luego activa el aviso diario.'
            : 'Te llegará “Día desbloqueado” y al tocarlo se abre la app con tu sorpresa.'}
        </Text>
      </View>
      <TouchableOpacity
        onPress={handleEnable}
        style={styles.actionBtn}
        disabled={busy}
        accessibilityLabel="Activar recordatorio diario"
      >
        <Text style={styles.actionText}>{busy ? '…' : 'Activar'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleDismiss} accessibilityLabel="Ocultar banner de notificaciones">
        <MaterialIcons name="close" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(106, 17, 203, 0.45)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 192, 203, 0.35)',
  },
  textWrap: { flex: 1 },
  title: { color: '#fff', fontWeight: '700', fontSize: 14 },
  body: { color: '#e2e8f0', fontSize: 12, marginTop: 2, lineHeight: 16 },
  actionBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 44,
    justifyContent: 'center',
  },
  actionText: { color: '#6a11cb', fontWeight: '700', fontSize: 13 },
});
