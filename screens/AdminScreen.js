import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Switch,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { AdminApi, clearStoredAdminToken, getStoredAdminToken } from '../services/adminApi';
import { clearAppConfigCache } from '../lib/appConfigClient';
import { getAdminApiUrl, isLocalAdminApi } from '../lib/config';
import { useAdminSignedUrl, useAdminSignedUrls } from '../hooks/useAdminSignedUrl';
import ProgressiveImage from '../components/ProgressiveImage';
import AdminDayPreview from '../components/AdminDayPreview';
import { GRADIENT_COLORS, THEME } from '../lib/layout';
import { getGiftMessage } from '../lib/giftSchedule';
import {
  formatCalendarDate,
  getBirthdayDate,
  getEventStartDate,
  TOTAL_EVENT_DAYS,
} from '../lib/calendar';

function dayToForm(day) {
  return {
    text: day.text || '',
    has_gift: Boolean(day.has_gift),
    gift_number: day.gift_number != null ? String(day.gift_number) : '',
    gift_message: day.gift_message || '',
    image_path: day.image_path || '',
    audio_path: day.audio_path || '',
    background_path: day.background_path || '',
    photo_paths: day.photo_paths || [],
  };
}

function formToPayload(form) {
  return {
    text: form.text,
    has_gift: form.has_gift,
    gift_number: form.gift_number ? Number(form.gift_number) : null,
    gift_message: form.gift_message?.trim() || null,
    image_path: form.image_path || null,
    audio_path: form.audio_path || null,
    background_path: form.background_path || null,
    photo_paths: form.photo_paths || [],
  };
}

function formsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function getFileName(path) {
  if (!path) return '';
  return path.split('/').pop();
}

function WebAudioPlayer({ src, title }) {
  if (Platform.OS !== 'web' || !src) return null;

  return (
    <div style={webStyles.audioWrap}>
      {title ? <div style={webStyles.audioTitle}>{title}</div> : null}
      <audio controls preload="metadata" src={src} style={webStyles.audioPlayer} />
    </div>
  );
}

function WebFileInput({ accept, onSelect, label }) {
  if (Platform.OS !== 'web') return null;

  return (
    <label style={webStyles.fileLabel}>
      {label}
      <input
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onSelect(file);
          event.target.value = '';
        }}
      />
    </label>
  );
}

const webStyles = {
  fileLabel: {
    display: 'inline-block',
    backgroundColor: THEME.primary,
    color: '#fff',
    padding: '10px 16px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    marginRight: 8,
    marginBottom: 8,
  },
  audioWrap: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    maxWidth: 400,
  },
  audioTitle: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 8,
    wordBreak: 'break-word',
  },
  audioPlayer: {
    width: '100%',
  },
};

export default function AdminScreen() {
  const { width } = useWindowDimensions();
  const isNarrow = width < 768;
  const isWide = width >= 1024;
  const styles = useMemo(() => createStyles(isNarrow, isWide), [isNarrow, isWide]);
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [form, setForm] = useState({
    text: '',
    has_gift: false,
    gift_number: '',
    gift_message: '',
    image_path: '',
    audio_path: '',
    background_path: '',
    photo_paths: [],
  });
  const [musicUrl, setMusicUrl] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [notificationHourInput, setNotificationHourInput] = useState('10');
  const [savedNotificationHour, setSavedNotificationHour] = useState(10);
  const [globalBackgroundPath, setGlobalBackgroundPath] = useState('');
  const [globalBackgroundPreviewUrl, setGlobalBackgroundPreviewUrl] = useState('');
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadDays = useCallback(async (isActive = () => isMountedRef.current) => {
    setLoading(true);
    try {
      const data = await AdminApi.getDays();
      if (!isActive()) return;

      setDays(data);
      setSelectedDay((current) => {
        if (current != null) return current;
        return data.length ? data[0].day_number : null;
      });
    } catch (error) {
      if (!isActive()) return;

      Alert.alert('Error', error.message);
      if (error.message.includes('autorizado') || error.message.includes('Contraseña')) {
        clearStoredAdminToken();
        setAuthed(false);
      }
    } finally {
      if (isActive()) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const stored = getStoredAdminToken();
    if (!stored) return undefined;

    let cancelled = false;

    (async () => {
      try {
        await AdminApi.getDays();
        if (cancelled) return;
        setAuthed(true);
      } catch {
        if (cancelled) return;
        clearStoredAdminToken();
        setAuthed(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authed) return undefined;

    let cancelled = false;
    const isActive = () => !cancelled;

    loadDays(isActive);

    return () => {
      cancelled = true;
    };
  }, [authed, loadDays]);

  useEffect(() => {
    if (!authed) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const config = await AdminApi.getAppConfig();
        if (cancelled) return;
        const hour = Number(config.notificationHour) || 10;
        setNotificationHourInput(String(hour));
        setSavedNotificationHour(hour);
        setGlobalBackgroundPath(config.backgroundPath || '');
        if (config.backgroundUrl) {
          setGlobalBackgroundPreviewUrl(config.backgroundUrl);
        } else if (config.backgroundPath) {
          const signed = await AdminApi.signMediaUrl(config.backgroundPath);
          setGlobalBackgroundPreviewUrl(signed);
        } else {
          setGlobalBackgroundPreviewUrl('');
        }
      } catch (error) {
        if (!cancelled) {
          Alert.alert('Aviso', error.message || 'No se pudo cargar la hora del aviso');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authed]);

  useEffect(() => {
    const day = days.find((item) => item.day_number === selectedDay);
    if (!day) return;

    setForm({
      text: day.text || '',
      has_gift: Boolean(day.has_gift),
      gift_number: day.gift_number != null ? String(day.gift_number) : '',
      gift_message: day.gift_message || '',
      image_path: day.image_path || '',
      audio_path: day.audio_path || '',
      background_path: day.background_path || '',
      photo_paths: day.photo_paths || [],
    });
    setMusicUrl('');
  }, [selectedDay, days]);

  const currentDay = useMemo(
    () => days.find((item) => item.day_number === selectedDay),
    [days, selectedDay]
  );

  const savedForm = useMemo(
    () => (currentDay ? dayToForm(currentDay) : null),
    [currentDay]
  );

  const isDirty = useMemo(
    () => Boolean(savedForm && !formsEqual(form, savedForm)),
    [form, savedForm]
  );

  async function persistForm(nextForm, { silent = false } = {}) {
    if (!selectedDay) return;

    if (nextForm.has_gift && nextForm.gift_number) {
      const giftNum = Number(nextForm.gift_number);
      if (Number.isNaN(giftNum) || giftNum < 1 || giftNum > 12) {
        Alert.alert('Error', 'El número de regalo debe estar entre 1 y 12');
        return;
      }
    }

    try {
      setBusyAction('save');
      await AdminApi.saveDay(selectedDay, formToPayload(nextForm));
      await loadDays(() => isMountedRef.current);
      if (!silent) {
        Alert.alert('Guardado', `Día ${selectedDay} actualizado`);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
      throw error;
    } finally {
      setBusyAction('');
    }
  }

  function requestSelectDay(dayNumber) {
    if (dayNumber === selectedDay) return;

    if (!isDirty) {
      setSelectedDay(dayNumber);
      return;
    }

    Alert.alert(
      'Cambios sin guardar',
      'Tienes cambios pendientes en este día.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: () => setSelectedDay(dayNumber),
        },
        {
          text: 'Guardar',
          onPress: async () => {
            try {
              await persistForm(form);
              setSelectedDay(dayNumber);
            } catch {
              // persistForm ya mostró el error
            }
          },
        },
      ]
    );
  }

  async function handleUploadGlobalBackground(file) {
    if (!file) return;
    try {
      setBusyAction('global-background');
      const result = await AdminApi.uploadGlobalBackground(file);
      setGlobalBackgroundPath(result.backgroundPath || '');
      setGlobalBackgroundPreviewUrl(result.backgroundUrl || '');
      clearAppConfigCache();
      Alert.alert('Listo', 'Fondo general actualizado');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setBusyAction('');
    }
  }

  async function handleClearGlobalBackground() {
    try {
      setBusyAction('global-background');
      await AdminApi.deleteGlobalBackground();
      setGlobalBackgroundPath('');
      setGlobalBackgroundPreviewUrl('');
      clearAppConfigCache();
      Alert.alert('Listo', 'Fondo general eliminado. Se usará el fondo por defecto.');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setBusyAction('');
    }
  }

  async function handleSaveNotificationHour() {
    const hour = Number(notificationHourInput);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      Alert.alert('Hora inválida', 'Usa un número entre 0 y 23 (hora Ecuador / Quito).');
      return;
    }

    try {
      setBusyAction('notification-hour');
      const result = await AdminApi.saveAppConfig({ notificationHour: hour });
      const saved = Number(result.notificationHour) || hour;
      setSavedNotificationHour(saved);
      setNotificationHourInput(String(saved));
      clearAppConfigCache();
      Alert.alert('Guardado', `El aviso diario quedó a las ${String(saved).padStart(2, '0')}:00 (hora Ecuador).`);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setBusyAction('');
    }
  }

  async function handleLogin() {
    try {
      setBusyAction('login');
      await AdminApi.verify(password);
      setAuthed(true);
      setPassword('');
    } catch (error) {
      Alert.alert('Acceso denegado', error.message);
    } finally {
      setBusyAction('');
    }
  }

  async function handleSave() {
    if (!selectedDay) return;
    await persistForm(form);
  }

  async function handleUpload(type, file) {
    if (!selectedDay || !file) return;

    try {
      setBusyAction(`upload-${type}`);
      await AdminApi.uploadFile(selectedDay, file, type);
      await loadDays();
      Alert.alert('Listo', 'Archivo subido correctamente');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setBusyAction('');
    }
  }

  async function handleDownloadMusic() {
    if (!selectedDay || !musicUrl.trim()) {
      Alert.alert('URL requerida', 'Pega un enlace de YouTube o audio');
      return;
    }

    try {
      setBusyAction('ytdlp');
      await AdminApi.downloadAudio(selectedDay, musicUrl.trim());
      await loadDays();
      Alert.alert('Descargado', 'Canción guardada en Supabase');
      setMusicUrl('');
    } catch (error) {
      Alert.alert('Error yt-dlp', `${error.message}\n\n¿Tienes yt-dlp instalado? (winget install yt-dlp)`);
    } finally {
      setBusyAction('');
    }
  }

  async function deletePathsFromStorage(paths) {
    if (!selectedDay || !paths?.length) return;
    try {
      await AdminApi.deleteMedia(selectedDay, paths);
    } catch (error) {
      Alert.alert('Aviso', `No se pudo borrar del storage: ${error.message}`);
    }
  }

  async function clearDayBackground() {
    const path = form.background_path;
    if (path) await deletePathsFromStorage([path]);
    const nextForm = { ...form, background_path: '' };
    setForm(nextForm);
    try {
      await persistForm(nextForm, { silent: true });
    } catch {
      // persistForm ya mostró el error
    }
  }

  async function clearImage() {
    const path = form.image_path;
    if (path) await deletePathsFromStorage([path]);
    const nextForm = { ...form, image_path: '' };
    setForm(nextForm);
    try {
      await persistForm(nextForm, { silent: true });
    } catch {
      // persistForm ya mostró el error
    }
  }

  async function clearAudio() {
    const path = form.audio_path;
    if (path) await deletePathsFromStorage([path]);
    const nextForm = { ...form, audio_path: '' };
    setForm(nextForm);
    try {
      await persistForm(nextForm, { silent: true });
    } catch {
      // persistForm ya mostró el error
    }
  }

  function movePhoto(index, direction) {
    setForm((prev) => {
      const paths = [...(prev.photo_paths || [])];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= paths.length) return prev;
      [paths[index], paths[newIndex]] = [paths[newIndex], paths[index]];
      return { ...prev, photo_paths: paths };
    });
  }

  async function removePhoto(index) {
    const path = form.photo_paths[index];
    if (path) await deletePathsFromStorage([path]);
    const nextForm = {
      ...form,
      photo_paths: (form.photo_paths || []).filter((_, i) => i !== index),
    };
    setForm(nextForm);
    try {
      await persistForm(nextForm, { silent: true });
    } catch {
      // persistForm ya mostró el error
    }
  }

  function openPreviewInApp() {
    if (!selectedDay || typeof window === 'undefined') return;
    window.location.hash = `#/preview/${selectedDay}`;
  }

  const previewImageUrl = useAdminSignedUrl(form.image_path);
  const previewPhotoUrls = useAdminSignedUrls(form.photo_paths || []);
  const previewAudioUrl = useAdminSignedUrl(form.audio_path);
  const formImageUrl = useAdminSignedUrl(form.image_path);
  const formPhotoUrls = useAdminSignedUrls(form.photo_paths || []);
  const formAudioUrl = useAdminSignedUrl(form.audio_path);
  const formBackgroundUrl = useAdminSignedUrl(form.background_path);

  const eventStartLabel = formatCalendarDate(getEventStartDate());
  const birthdayLabel = formatCalendarDate(getBirthdayDate());

  function handleLogout() {
    clearStoredAdminToken();
    setAuthed(false);
    setDays([]);
    setSelectedDay(null);
  }

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.blocked}>
        <Text style={styles.blockedText}>El panel admin solo está disponible en la versión web.</Text>
      </View>
    );
  }

  if (!authed) {
    return (
      <LinearGradient colors={GRADIENT_COLORS} style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loginCard}>
          <Text style={styles.title}>Panel Admin</Text>
          <Text style={styles.subtitle}>Camino a tu cumple</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Contraseña admin"
            placeholderTextColor="#999"
            secureTextEntry
            style={styles.input}
            accessibilityLabel="Contraseña de administrador"
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleLogin}
            disabled={busyAction === 'login'}
            accessibilityRole="button"
            accessibilityLabel="Entrar al panel admin"
          >
            {busyAction === 'login' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Entrar</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { if (typeof window !== 'undefined') window.location.hash = ''; }}>
            <Text style={styles.link}>← Volver a la app</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={GRADIENT_COLORS} style={styles.container}>
      <StatusBar style="light" />
      {loading ? (
        <ActivityIndicator color="#fff" size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          style={styles.pageScroll}
          contentContainerStyle={styles.pageScrollContent}
          showsVerticalScrollIndicator
        >
          <View style={styles.pageInner}>
            <View style={styles.header}>
              <View style={styles.headerTitleWrap}>
                <Text style={styles.title}>Panel Admin</Text>
                {!isNarrow && __DEV__ ? (
                  <Text style={styles.subtitle}>API: {getAdminApiUrl()}</Text>
                ) : null}
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => loadDays(() => isMountedRef.current)}
                >
                  <Text style={styles.secondaryBtnText}>Recargar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handleLogout}>
                  <Text style={styles.secondaryBtnText}>Salir</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (typeof window !== 'undefined') window.location.hash = '';
                  }}
                >
                  <Text style={styles.linkInline}>Ver app →</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingsGrid}>
          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>Calendario del camino</Text>
            <Text style={styles.settingsHint}>
              Día 31 → inicio {eventStartLabel} · Día 0 → cumple {birthdayLabel} ·{' '}
              {TOTAL_EVENT_DAYS} días en total. Las fechas se fijan en el deploy (no desde aquí).
            </Text>
            <Text style={styles.settingsList}>
              Desde admin puedes editar: mensaje, imagen, fotos extra, audio, fondo (general o por
              día), regalo y hora del aviso diario. yt-dlp solo funciona en local.
            </Text>
          </View>

          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>Fondo general de la app</Text>
            <Text style={styles.settingsHint}>
              Imagen de fondo para todos los días que no tengan uno propio. Si no subes nada, se usa
              el collage por defecto del proyecto.
            </Text>
            {globalBackgroundPreviewUrl ? (
              <ProgressiveImage
                source={{ uri: globalBackgroundPreviewUrl }}
                style={styles.backgroundPreview}
                accessibilityLabel="Vista previa del fondo general"
              />
            ) : null}
            <View style={styles.actionRow}>
              <WebFileInput
                accept="image/*"
                label={busyAction === 'global-background' ? 'Subiendo…' : 'Subir fondo general'}
                onSelect={handleUploadGlobalBackground}
              />
              {globalBackgroundPath ? (
                <TouchableOpacity style={styles.dangerBtn} onPress={handleClearGlobalBackground}>
                  <Text style={styles.dangerBtnText}>Quitar fondo general</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {globalBackgroundPath ? (
              <Text style={styles.pathText}>{getFileName(globalBackgroundPath)}</Text>
            ) : null}
          </View>

          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>Recordatorio diario</Text>
            <Text style={styles.settingsHint}>
              Hora del aviso “Día desbloqueado” en Ecuador (Quito). Actual:{' '}
              {String(savedNotificationHour).padStart(2, '0')}:00. El push con la app cerrada en
              iPhone se envía cuando esta hora coincide con el cron del servidor (10:00 en plan
              gratuito de Vercel); otra hora aplica al aviso local de la PWA instalada.
            </Text>
            <View style={styles.settingsRow}>
              <TextInput
                value={notificationHourInput}
                onChangeText={setNotificationHourInput}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="10"
                placeholderTextColor="#94a3b8"
                style={styles.hourInput}
                accessibilityLabel="Hora del aviso diario en Ecuador"
              />
              <Text style={styles.hourSuffix}>:00 Ecuador</Text>
              <TouchableOpacity
                style={styles.primaryBtnSmall}
                onPress={handleSaveNotificationHour}
                disabled={busyAction === 'notification-hour'}
              >
                {busyAction === 'notification-hour' ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>Guardar hora</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
            </View>

            <View style={styles.layout}>
              <View style={styles.sidebarWrap}>
                {!isNarrow ? <Text style={styles.sidebarTitle}>Días</Text> : null}
                <ScrollView
                  horizontal={isNarrow}
                  style={styles.sidebar}
                  contentContainerStyle={styles.sidebarContent}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                >
                  {days.map((day) => (
                    <TouchableOpacity
                      key={day.day_number}
                      style={[styles.dayChip, selectedDay === day.day_number && styles.dayChipActive]}
                      onPress={() => requestSelectDay(day.day_number)}
                      accessibilityRole="button"
                      accessibilityLabel={`Editar día ${day.day_number}`}
                    >
                      <Text style={styles.dayChipText}>Día {day.day_number}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.panel}>
            {currentDay ? (
              <>
                {isDirty ? (
                  <View style={styles.unsavedBanner} accessibilityRole="alert">
                    <Text style={styles.unsavedBannerText}>Tienes cambios sin guardar</Text>
                  </View>
                ) : null}

                <Text style={styles.panelTitle}>Editar día {selectedDay}</Text>

                <Text style={styles.label}>Mensaje</Text>
                <TextInput
                  value={form.text}
                  onChangeText={(text) => setForm((prev) => ({ ...prev, text }))}
                  multiline
                  style={[styles.input, styles.textArea]}
                />

                <View style={styles.row}>
                  <Text style={styles.label}>¿Tiene regalo?</Text>
                  <Switch
                    value={form.has_gift}
                    onValueChange={(has_gift) => setForm((prev) => ({ ...prev, has_gift }))}
                  />
                </View>

                {form.has_gift && (
                  <>
                    <Text style={styles.label}>
                      Número de categoría (opcional; ella elige 1–12 en el juego)
                    </Text>
                    <TextInput
                      value={form.gift_number}
                      onChangeText={(gift_number) =>
                        setForm((prev) => {
                          const num = Number(gift_number);
                          const next = { ...prev, gift_number };
                          if (!prev.gift_message && gift_number && !Number.isNaN(num)) {
                            next.gift_message = getGiftMessage(num);
                          }
                          return next;
                        })
                      }
                      keyboardType="number-pad"
                      style={styles.input}
                    />
                    <Text style={styles.label}>Mensaje del regalo (lo que verá en el modal)</Text>
                    <TextInput
                      value={form.gift_message}
                      onChangeText={(gift_message) => setForm((prev) => ({ ...prev, gift_message }))}
                      multiline
                      placeholder="Texto personalizado para este regalo..."
                      placeholderTextColor="#999"
                      style={[styles.input, styles.giftMessageArea]}
                    />
                  </>
                )}

                <Text style={styles.sectionTitle}>Imagen principal</Text>
                {form.image_path ? (
                  <>
                    <ProgressiveImage
                      source={{ uri: formImageUrl }}
                      style={styles.imagePreview}
                      imageStyle={styles.imagePreview}
                      resizeMode="cover"
                      accessibilityLabel="Vista previa imagen principal"
                    />
                  </>
                ) : (
                  <Text style={styles.pathText}>Sin imagen</Text>
                )}
                <Text style={styles.label}>Ruta de imagen</Text>
                <TextInput
                  value={form.image_path}
                  onChangeText={(image_path) => setForm((prev) => ({ ...prev, image_path }))}
                  placeholder="images/31.jpg"
                  placeholderTextColor="#999"
                  style={styles.input}
                  autoCapitalize="none"
                />
                <View style={styles.actionRow}>
                  <WebFileInput accept="image/*" label="Subir imagen" onSelect={(file) => handleUpload('main', file)} />
                  {form.image_path ? (
                    <TouchableOpacity
                      style={styles.dangerBtn}
                      onPress={clearImage}
                    >
                      <Text style={styles.dangerBtnText}>Quitar imagen</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <Text style={styles.sectionTitle}>Fondo del día (opcional)</Text>
                <Text style={styles.pathText}>
                  Si subes un fondo aquí, reemplaza el fondo general solo en este día.
                </Text>
                {form.background_path ? (
                  <ProgressiveImage
                    source={{ uri: formBackgroundUrl }}
                    style={styles.backgroundPreview}
                    accessibilityLabel="Vista previa fondo del día"
                  />
                ) : (
                  <Text style={styles.pathText}>Usa el fondo general</Text>
                )}
                <Text style={styles.label}>Ruta de fondo</Text>
                <TextInput
                  value={form.background_path}
                  onChangeText={(background_path) => setForm((prev) => ({ ...prev, background_path }))}
                  placeholder="backgrounds/day31.jpg"
                  placeholderTextColor="#999"
                  style={styles.input}
                  autoCapitalize="none"
                />
                <View style={styles.actionRow}>
                  <WebFileInput
                    accept="image/*"
                    label="Subir fondo del día"
                    onSelect={(file) => handleUpload('background', file)}
                  />
                  {form.background_path ? (
                    <TouchableOpacity style={styles.dangerBtn} onPress={clearDayBackground}>
                      <Text style={styles.dangerBtnText}>Usar fondo general</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <Text style={styles.sectionTitle}>Fotos extra (carrusel)</Text>
                {(form.photo_paths || []).length > 0 ? (
                  <View style={styles.photoGrid}>
                    {(form.photo_paths || []).map((path, index) => (
                      <View key={`${path}-${index}`} style={styles.photoItem}>
                        <ProgressiveImage
                          source={{ uri: formPhotoUrls[index] }}
                          style={styles.photoThumb}
                          imageStyle={styles.photoThumb}
                          resizeMode="cover"
                          accessibilityLabel={`Vista previa ${path}`}
                        />
                        <Text style={styles.photoPathText} numberOfLines={2}>{getFileName(path)}</Text>
                        <View style={styles.photoActions}>
                          <TouchableOpacity
                            style={[styles.iconBtn, index === 0 && styles.iconBtnDisabled]}
                            onPress={() => movePhoto(index, -1)}
                            disabled={index === 0}
                          >
                            <Text style={styles.iconBtnText}>↑</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.iconBtn,
                              index === form.photo_paths.length - 1 && styles.iconBtnDisabled,
                            ]}
                            onPress={() => movePhoto(index, 1)}
                            disabled={index === form.photo_paths.length - 1}
                          >
                            <Text style={styles.iconBtnText}>↓</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.iconBtnDanger} onPress={() => removePhoto(index)}>
                            <Text style={styles.iconBtnText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.pathText}>Sin fotos extra</Text>
                )}
                <WebFileInput accept="image/*" label="Subir foto extra" onSelect={(file) => handleUpload('extra', file)} />

                <Text style={styles.sectionTitle}>Audio / canción</Text>
                {form.audio_path ? (
                  <>
                    <WebAudioPlayer
                      src={formAudioUrl}
                      title={getFileName(form.audio_path)}
                    />
                  </>
                ) : (
                  <Text style={styles.pathText}>Sin audio</Text>
                )}
                <Text style={styles.label}>Ruta de audio</Text>
                <TextInput
                  value={form.audio_path}
                  onChangeText={(audio_path) => setForm((prev) => ({ ...prev, audio_path }))}
                  placeholder="sounds/31.mp3"
                  placeholderTextColor="#999"
                  style={styles.input}
                  autoCapitalize="none"
                />
                <View style={styles.actionRow}>
                  <WebFileInput accept="audio/*" label="Subir MP3" onSelect={(file) => handleUpload('audio', file)} />
                  {form.audio_path ? (
                    <TouchableOpacity
                      style={styles.dangerBtn}
                      onPress={clearAudio}
                    >
                      <Text style={styles.dangerBtnText}>Quitar canción</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {isLocalAdminApi() ? (
                  <>
                    <Text style={styles.label}>Descargar con yt-dlp (solo admin local)</Text>
                    <Text style={styles.pathText}>
                      Requiere yt-dlp instalado (Windows: winget install yt-dlp · macOS: brew install yt-dlp)
                    </Text>
                    <TextInput
                      value={musicUrl}
                      onChangeText={setMusicUrl}
                      placeholder="https://www.youtube.com/watch?v=..."
                      placeholderTextColor="#999"
                      style={styles.input}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.primaryBtn}
                      onPress={handleDownloadMusic}
                      disabled={busyAction === 'ytdlp'}
                    >
                      {busyAction === 'ytdlp' ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.primaryBtnText}>Descargar y guardar canción</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : null}

                <AdminDayPreview
                  dayNumber={selectedDay}
                  form={form}
                  imageUrl={previewImageUrl}
                  photoUrls={previewPhotoUrls}
                  audioUrl={previewAudioUrl}
                  onOpenInApp={openPreviewInApp}
                />

                <TouchableOpacity
                  style={[styles.primaryBtn, styles.saveBtn, !isDirty && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={busyAction === 'save' || !isDirty}
                >
                  {busyAction === 'save' ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {isDirty ? 'Guardar cambios' : 'Sin cambios pendientes'}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.subtitle}>Selecciona un día</Text>
            )}
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const ADMIN_MAX_WIDTH = 1100;

const createStyles = (isNarrow, isWide) =>
  StyleSheet.create({
  container: {
    flex: 1,
    ...(Platform.OS === 'web' ? { minHeight: '100dvh' } : { minHeight: '100%' }),
  },
  pageScroll: { flex: 1, width: '100%' },
  pageScrollContent: { flexGrow: 1, paddingBottom: 48 },
  pageInner: {
    width: '100%',
    maxWidth: ADMIN_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: isNarrow ? 16 : 24,
  },
  blocked: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  blockedText: { color: '#fff', fontSize: 16, textAlign: 'center' },
  loginCard: {
    margin: 'auto',
    width: '100%',
    maxWidth: 420,
    padding: 32,
    alignSelf: 'center',
    paddingTop: 'max(48px, env(safe-area-inset-top, 0px))',
  },
  header: {
    paddingTop: 'max(20px, env(safe-area-inset-top, 0px))',
    paddingBottom: 16,
    flexDirection: isNarrow ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isNarrow ? 'stretch' : 'flex-start',
    gap: 12,
  },
  headerTitleWrap: { flex: isNarrow ? undefined : 1 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  settingsGrid: {
    flexDirection: isWide ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    width: '100%',
  },
  settingsCard: {
    flex: isWide ? 1 : undefined,
    minWidth: isWide ? 280 : undefined,
    width: isWide ? undefined : '100%',
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  settingsTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  settingsHint: { color: '#cbd5e1', fontSize: 13, marginBottom: 8, lineHeight: 18 },
  settingsList: { color: '#94a3b8', fontSize: 12, lineHeight: 17 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  hourInput: {
    width: 64,
    backgroundColor: '#1e293b',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: '#334155',
    textAlign: 'center',
  },
  hourSuffix: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  primaryBtnSmall: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#cbd5e1', fontSize: 13, marginTop: 4 },
  layout: {
    flexDirection: isNarrow ? 'column' : 'row',
    width: '100%',
    gap: isNarrow ? 12 : 16,
    alignItems: isNarrow ? 'stretch' : 'flex-start',
  },
  sidebarWrap: {
    width: isNarrow ? '100%' : 168,
    flexShrink: 0,
  },
  sidebarTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sidebar: {
    maxHeight: isNarrow ? 112 : undefined,
  },
  sidebarContent: {
    gap: 8,
    flexDirection: isNarrow ? 'row' : 'column',
    paddingVertical: isNarrow ? 4 : 0,
  },
  dayChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minWidth: isNarrow ? 72 : undefined,
    alignItems: 'center',
  },
  dayChipActive: { backgroundColor: THEME.primary, borderColor: 'rgba(255,255,255,0.25)' },
  dayChipText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  panel: {
    flex: 1,
    minWidth: 0,
    width: isNarrow ? '100%' : undefined,
    padding: isNarrow ? 16 : 24,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  panelTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 16 },
  sectionTitle: { color: '#e2e8f0', fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  label: { color: '#cbd5e1', fontSize: 14, marginBottom: 8, marginTop: 12 },
  pathText: { color: '#94a3b8', fontSize: 12, marginBottom: 8 },
  imagePreview: {
    width: '100%',
    maxWidth: 320,
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  backgroundPreview: {
    width: '100%',
    maxWidth: 320,
    height: 180,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  photoItem: {
    width: 120,
  },
  photoThumb: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  photoPathText: { color: '#94a3b8', fontSize: 10, marginTop: 4 },
  photoActions: { flexDirection: 'row', gap: 4, marginTop: 6 },
  iconBtn: {
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  iconBtnDisabled: { opacity: 0.35 },
  iconBtnDanger: {
    backgroundColor: '#7f1d1d',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  iconBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4 },
  dangerBtn: {
    backgroundColor: '#7f1d1d',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  dangerBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: '#1e293b',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  giftMessageArea: { minHeight: 90, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  primaryBtn: {
    backgroundColor: THEME.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtn: { backgroundColor: THEME.accent },
  saveBtnDisabled: { opacity: 0.55 },
  unsavedBanner: {
    backgroundColor: 'rgba(251, 191, 36, 0.95)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  unsavedBannerText: {
    color: '#78350f',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  secondaryBtnText: { color: '#fff', fontSize: 13 },
  link: { color: '#93c5fd', marginTop: 16, textAlign: 'center' },
  linkInline: { color: '#93c5fd', fontSize: 13, fontWeight: '600' },
  });
