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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { AdminApi, clearStoredAdminPassword, getStoredAdminPassword } from '../services/adminApi';
import { getAdminApiUrl } from '../lib/config';

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
};

export default function AdminScreen() {
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
    if (getStoredAdminPassword()) {
      setAuthed(true);
    }
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
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} disabled={busyAction === 'login'}>
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
          <Text style={styles.subtitle}>API: {getAdminApiUrl()}</Text>
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
          <ScrollView style={styles.sidebar} contentContainerStyle={styles.sidebarContent}>
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
                <Text style={styles.pathText}>{form.image_path || 'Sin imagen'}</Text>
                <WebFileInput accept="image/*" label="Subir imagen" onSelect={(file) => handleUpload('main', file)} />

                <Text style={styles.sectionTitle}>Fotos extra (carrusel)</Text>
                {(form.photo_paths || []).map((path) => (
                  <Text key={path} style={styles.pathText}>• {path}</Text>
                ))}
                <WebFileInput accept="image/*" label="Subir foto extra" onSelect={(file) => handleUpload('extra', file)} />

                <Text style={styles.sectionTitle}>Audio / canción</Text>
                <Text style={styles.pathText}>{form.audio_path || 'Sin audio'}</Text>
                <WebFileInput accept="audio/*" label="Subir MP3" onSelect={(file) => handleUpload('audio', file)} />

                <Text style={styles.label}>Descargar con yt-dlp (YouTube, etc.)</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: '100%' },
  blocked: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  blockedText: { color: '#fff', fontSize: 16, textAlign: 'center' },
  loginCard: {
    margin: 'auto',
    width: '100%',
    maxWidth: 420,
    padding: 32,
    alignSelf: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  title: { color: '#fff', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#cbd5e1', fontSize: 13, marginTop: 4 },
  layout: { flex: 1, flexDirection: 'row', minHeight: 500 },
  sidebar: { width: 140, borderRightWidth: 1, borderRightColor: '#334155' },
  sidebarContent: { padding: 12, gap: 8 },
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
