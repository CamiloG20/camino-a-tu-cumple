import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { AdminApi, clearStoredAdminPassword, getStoredAdminPassword } from '../services/adminApi';
import { getAdminApiUrl, isLocalAdminApi, STORAGE_BUCKET } from '../lib/config';
import { getSupabase } from '../lib/supabase';
import ProgressiveImage from '../components/ProgressiveImage';

function storagePathToUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = getSupabase().storage.from(STORAGE_BUCKET).getPublicUrl(path.replace(/^\/+/, ''));
  return data.publicUrl;
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
    backgroundColor: '#6200ee',
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
  const styles = useMemo(() => createStyles(isNarrow), [isNarrow]);
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [form, setForm] = useState({
    text: '',
    has_gift: false,
    gift_number: '',
    image_path: '',
    audio_path: '',
    photo_paths: [],
  });
  const [musicUrl, setMusicUrl] = useState('');
  const [busyAction, setBusyAction] = useState('');

  const loadDays = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AdminApi.getDays();
      setDays(data);
      if (!selectedDay && data.length) {
        setSelectedDay(data[0].day_number);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
      if (error.message.includes('Contraseña')) {
        clearStoredAdminPassword();
        setAuthed(false);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedDay]);

  useEffect(() => {
    const stored = getStoredAdminPassword();
    if (!stored) return undefined;

    let cancelled = false;

    (async () => {
      try {
        await AdminApi.getDays();
        if (cancelled) return;
        setAuthed(true);
      } catch {
        if (cancelled) return;
        clearStoredAdminPassword();
        setAuthed(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authed) loadDays();
  }, [authed, loadDays]);

  useEffect(() => {
    const day = days.find((item) => item.day_number === selectedDay);
    if (!day) return;

    setForm({
      text: day.text || '',
      has_gift: Boolean(day.has_gift),
      gift_number: day.gift_number != null ? String(day.gift_number) : '',
      image_path: day.image_path || '',
      audio_path: day.audio_path || '',
      photo_paths: day.photo_paths || [],
    });
    setMusicUrl('');
  }, [selectedDay, days]);

  const currentDay = useMemo(
    () => days.find((item) => item.day_number === selectedDay),
    [days, selectedDay]
  );

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

    if (form.has_gift && form.gift_number) {
      const giftNum = Number(form.gift_number);
      if (Number.isNaN(giftNum) || giftNum < 1 || giftNum > 12) {
        Alert.alert('Error', 'El número de regalo debe estar entre 1 y 12');
        return;
      }
    }

    try {
      setBusyAction('save');
      await AdminApi.saveDay(selectedDay, {
        text: form.text,
        has_gift: form.has_gift,
        gift_number: form.gift_number ? Number(form.gift_number) : null,
        image_path: form.image_path || null,
        audio_path: form.audio_path || null,
        photo_paths: form.photo_paths,
      });
      await loadDays();
      Alert.alert('Guardado', `Día ${selectedDay} actualizado`);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setBusyAction('');
    }
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

  async function clearImage() {
    const path = form.image_path;
    if (path) await deletePathsFromStorage([path]);
    setForm((prev) => ({ ...prev, image_path: '' }));
  }

  async function clearAudio() {
    const path = form.audio_path;
    if (path) await deletePathsFromStorage([path]);
    setForm((prev) => ({ ...prev, audio_path: '' }));
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
    setForm((prev) => ({
      ...prev,
      photo_paths: (prev.photo_paths || []).filter((_, i) => i !== index),
    }));
  }

  function handleLogout() {
    clearStoredAdminPassword();
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
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
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
    <LinearGradient colors={['#1a1a2e', '#0f3460']} style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Panel Admin</Text>
          {!isNarrow && __DEV__ ? (
            <Text style={styles.subtitle}>API: {getAdminApiUrl()}</Text>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={loadDays}>
            <Text style={styles.secondaryBtnText}>Recargar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleLogout}>
            <Text style={styles.secondaryBtnText}>Salir</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { if (typeof window !== 'undefined') window.location.hash = ''; }}>
            <Text style={styles.link}>Ver app →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#fff" size="large" style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.layout}>
          <ScrollView
            horizontal={!isNarrow}
            style={styles.sidebar}
            contentContainerStyle={styles.sidebarContent}
            showsHorizontalScrollIndicator={false}
          >
            {days.map((day) => (
              <TouchableOpacity
                key={day.day_number}
                style={[styles.dayChip, selectedDay === day.day_number && styles.dayChipActive]}
                onPress={() => setSelectedDay(day.day_number)}
              >
                <Text style={styles.dayChipText}>Día {day.day_number}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
            {currentDay ? (
              <>
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
                    <Text style={styles.label}>Número de regalo</Text>
                    <TextInput
                      value={form.gift_number}
                      onChangeText={(gift_number) => setForm((prev) => ({ ...prev, gift_number }))}
                      keyboardType="number-pad"
                      style={styles.input}
                    />
                  </>
                )}

                <Text style={styles.sectionTitle}>Imagen principal</Text>
                {form.image_path ? (
                  <>
                    <ProgressiveImage
                      source={{ uri: storagePathToUrl(form.image_path) }}
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

                <Text style={styles.sectionTitle}>Fotos extra (carrusel)</Text>
                {(form.photo_paths || []).length > 0 ? (
                  <View style={styles.photoGrid}>
                    {(form.photo_paths || []).map((path, index) => (
                      <View key={`${path}-${index}`} style={styles.photoItem}>
                        <ProgressiveImage
                          source={{ uri: storagePathToUrl(path) }}
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
                      src={storagePathToUrl(form.audio_path)}
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

                <TouchableOpacity
                  style={[styles.primaryBtn, styles.saveBtn]}
                  onPress={handleSave}
                  disabled={busyAction === 'save'}
                >
                  {busyAction === 'save' ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Guardar cambios</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.subtitle}>Selecciona un día</Text>
            )}
          </ScrollView>
        </View>
      )}
    </LinearGradient>
  );
}

const createStyles = (isNarrow) =>
  StyleSheet.create({
  container: { flex: 1, minHeight: '100%' },
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
    padding: 20,
    paddingTop: 'max(48px, env(safe-area-inset-top, 0px))',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  title: { color: '#fff', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#cbd5e1', fontSize: 13, marginTop: 4 },
  layout: {
    flex: 1,
    flexDirection: isNarrow ? 'column' : 'row',
    minHeight: 500,
  },
  sidebar: {
    width: isNarrow ? '100%' : 140,
    maxHeight: isNarrow ? 120 : undefined,
    borderRightWidth: isNarrow ? 0 : 1,
    borderBottomWidth: isNarrow ? 1 : 0,
    borderRightColor: '#334155',
    borderBottomColor: '#334155',
  },
  sidebarContent: {
    padding: 12,
    gap: 8,
    flexDirection: isNarrow ? 'row' : 'column',
    flexWrap: isNarrow ? 'nowrap' : 'wrap',
  },
  dayChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  dayChipActive: { backgroundColor: '#6200ee' },
  dayChipText: { color: '#fff', fontWeight: '600' },
  panel: { flex: 1 },
  panelContent: { padding: 24, maxWidth: 720 },
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  primaryBtn: {
    backgroundColor: '#6200ee',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtn: { backgroundColor: '#ff6b6b' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  secondaryBtnText: { color: '#fff', fontSize: 13 },
  link: { color: '#93c5fd', marginTop: 16, textAlign: 'center' },
  });
