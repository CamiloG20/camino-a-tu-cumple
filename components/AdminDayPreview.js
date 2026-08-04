import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { getCalendarDateForDayNumber, getDaysUntilBirthday, formatCalendarDate } from '../lib/calendar';
import { GRADIENT_COLORS, THEME } from '../lib/layout';
import ProgressiveImage from './ProgressiveImage';
import { getGiftMessage } from '../lib/giftSchedule';

function WebAudioPlayer({ src, title }) {
  if (typeof window === 'undefined' || !src) return null;

  return (
    <div style={webStyles.audioWrap}>
      {title ? <div style={webStyles.audioTitle}>{title}</div> : null}
      <audio controls preload="metadata" src={src} style={webStyles.audioPlayer} />
    </div>
  );
}

const webStyles = {
  audioWrap: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  audioTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 6,
    wordBreak: 'break-word',
  },
  audioPlayer: { width: '100%' },
};

export default function AdminDayPreview({ dayNumber, form, imageUrl, photoUrls, audioUrl, onOpenInApp }) {
  if (dayNumber == null) return null;

  const previewDate = getCalendarDateForDayNumber(dayNumber);
  const diff = getDaysUntilBirthday(previewDate);
  const isBirthdayDay = diff === 0;
  const headerText = isBirthdayDay
    ? '¡Feliz cumpleaños! 🎂❤️'
    : `Faltan ${diff} días 🎂❤️`;
  const giftMessage =
    (form.gift_message && form.gift_message.trim()) ||
    (form.gift_number ? getGiftMessage(Number(form.gift_number)) : '');

  const photos = photoUrls?.length ? photoUrls : imageUrl ? [imageUrl] : [];

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Vista previa — así lo verá él</Text>
        {onOpenInApp ? (
          <Text style={styles.openLink} onPress={onOpenInApp}>
            Abrir en la app →
          </Text>
        ) : null}
      </View>

      <View style={styles.phone}>
        <LinearGradient
          colors={GRADIENT_COLORS}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <Text style={styles.previewHeader}>{headerText}</Text>
        <Text style={styles.previewDate}>
          Día {dayNumber} · {formatCalendarDate(previewDate)}
        </Text>

        {form.text ? <Text style={styles.previewText}>{form.text}</Text> : null}

        {photos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
            {photos.map((uri, index) => (
              <ProgressiveImage
                key={`${uri}-${index}`}
                source={{ uri }}
                style={styles.previewImage}
                imageStyle={styles.previewImage}
                resizeMode="cover"
                accessibilityLabel={`Vista previa foto ${index + 1}`}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.placeholderImage}>
            <MaterialIcons name="image" size={40} color="#ffffff88" />
            <Text style={styles.placeholderText}>Sin imagen</Text>
          </View>
        )}

        {form.has_gift ? (
          <View style={styles.giftRow}>
            <MaterialIcons name="card-giftcard" size={22} color="#fff" />
            <Text style={styles.giftRowText}>
              Día de sorpresa (ella elige la categoría en el juego)
            </Text>
          </View>
        ) : null}

        {form.has_gift && giftMessage ? (
          <View style={styles.giftMessageBox}>
            <Text style={styles.giftMessageLabel}>Mensaje del regalo</Text>
            <Text style={styles.giftMessageText}>{giftMessage}</Text>
          </View>
        ) : null}

        {audioUrl ? (
          <WebAudioPlayer src={audioUrl} title="Canción del día" />
        ) : (
          <Text style={styles.noAudio}>Sin canción para este día</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 24,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
  },
  openLink: {
    color: '#93c5fd',
    fontWeight: '700',
    fontSize: 13,
  },
  phone: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    position: 'relative',
  },
  previewHeader: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  previewDate: {
    color: '#f1f5f9',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  previewText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  photoRow: {
    marginBottom: 12,
  },
  previewImage: {
    width: 180,
    height: 180,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: '#fff2',
  },
  placeholderImage: {
    width: 180,
    height: 180,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  placeholderText: {
    color: '#ffffff99',
    marginTop: 6,
    fontSize: 12,
  },
  giftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    backgroundColor: THEME.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 10,
  },
  giftRowText: {
    color: '#fff',
    fontWeight: '800',
  },
  giftMessageBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  giftMessageLabel: {
    color: '#fde68a',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  giftMessageText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  noAudio: {
    color: '#ffffff99',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
