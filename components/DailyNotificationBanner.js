import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useDailyNotifications } from '../hooks/useDailyNotifications';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { DEFAULT_HOUR, DISMISS_BANNER_KEY } from '../lib/dailyNotifications';
import { isPushSupported } from '../lib/webPushClient';

function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export default function DailyNotificationBanner({ active = true }) {
  const { supported, permission, prefs, enableDailyNotifications, disableDailyNotifications } =
    useDailyNotifications({ enabled: active });
  const { isStandalone } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true);
  const [busy, setBusy] = useState(false);

  const needsIosInstall = isIosDevice() && !isStandalone;
  const pushReady = isPushSupported();

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

  if (prefs.enabled) {
    return (
      <View style={styles.bannerActive}>
        <MaterialIcons name="notifications-active" size={22} color="#fde68a" />
        <View style={styles.textWrap}>
          <Text style={styles.title}>Recordatorio diario activo</Text>
          <Text style={styles.body}>
            Cada mañana a las {DEFAULT_HOUR}:00 (hora Ecuador) te avisamos con “Día desbloqueado”.
            {pushReady ? ' Push activo para iPhone/Android.' : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={disableDailyNotifications}
          style={styles.secondaryBtn}
          accessibilityLabel="Desactivar recordatorio diario"
        >
          <Text style={styles.secondaryText}>Off</Text>
        </TouchableOpacity>
      </View>
    );
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
        <Text style={styles.title}>Recordatorio diario · {DEFAULT_HOUR}:00 Ecuador</Text>
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
  bannerActive: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(253, 224, 71, 0.35)',
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
  secondaryBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryText: { color: '#fff', fontWeight: '600', fontSize: 12 },
});
