import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { usePwaInstall } from '../hooks/usePwaInstall';

export default function InstallPwaBanner() {
  const { canShowAndroid, canShowIos, showIosHint, install, dismiss, openIosHint } = usePwaInstall();

  if (Platform.OS !== 'web' || (!canShowAndroid && !canShowIos && !showIosHint)) {
    return null;
  }

  if (showIosHint || canShowIos) {
    return (
      <View style={styles.banner}>
        <MaterialIcons name="phone-iphone" size={22} color="#fff" />
        <View style={styles.textWrap}>
          <Text style={styles.title}>Instalar en iPhone</Text>
          <Text style={styles.body}>
            Toca Compartir → “Añadir a pantalla de inicio” para abrir como app.
          </Text>
        </View>
        <TouchableOpacity
          onPress={canShowIos ? openIosHint : dismiss}
          style={styles.actionBtn}
          accessibilityLabel="Cerrar instrucciones de instalación"
        >
          <Text style={styles.actionText}>{showIosHint ? 'OK' : 'Ver'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={dismiss} accessibilityLabel="Ocultar banner">
          <MaterialIcons name="close" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.banner}>
      <MaterialIcons name="get-app" size={22} color="#fff" />
      <View style={styles.textWrap}>
        <Text style={styles.title}>Instalar app</Text>
        <Text style={styles.body}>Acceso rápido desde tu pantalla de inicio</Text>
      </View>
      <TouchableOpacity
        onPress={install}
        style={styles.actionBtn}
        accessibilityLabel="Instalar aplicación"
      >
        <Text style={styles.actionText}>Instalar</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={dismiss} accessibilityLabel="Ocultar banner">
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
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
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
