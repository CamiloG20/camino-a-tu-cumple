import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Pressable,
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { DataService } from './services/dataService';
import { isSupabaseConfigured } from './lib/config';

const FALLBACK_IMAGE = require('./assets/images/fondo.png');

// Cumpleaños oficial: 9 de agosto (mes 7 en JavaScript, 0 = enero)
const BIRTHDAY_MONTH = 7;
const BIRTHDAY_DAY = 9;

function getDaysUntilBirthday(date = new Date()) {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let birthday = new Date(date.getFullYear(), BIRTHDAY_MONTH, BIRTHDAY_DAY);

  if (today > birthday) {
    birthday = new Date(date.getFullYear() + 1, BIRTHDAY_MONTH, BIRTHDAY_DAY);
  }

  return Math.round((birthday - today) / (1000 * 60 * 60 * 24));
}

function getTodayDayIndex(daysCount, daysUntilBirthday) {
  // Días ordenados del 31 al 1: si faltan 31 días → índice 0 (día 31)
  let index = daysCount - daysUntilBirthday;
  if (index < 0) index = 0;
  if (index >= daysCount) index = daysCount - 1;
  return index;
}

export default function App() {
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = Math.min(
    windowWidth,
    Platform.OS === 'web' ? 520 : windowWidth
  );
  const styles = useMemo(() => createStyles(screenWidth), [screenWidth]);

  const [todayIndex, setTodayIndex] = useState(0);
  const [viewed, setViewed] = useState({});
  const [soundObj, setSoundObj] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDay, setCurrentDay] = useState(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftNumber, setGiftNumber] = useState(null);
  const [diff, setDiff] = useState(0);
  const [realTodayIndex, setRealTodayIndex] = useState(0);
  const flatListRef = useRef(null);

  // Función para limpiar el audio
  const cleanupAudio = async () => {
    if (soundObj) {
      try {
        await soundObj.stopAsync();
        await soundObj.unloadAsync();
        setSoundObj(null);
        setIsPlaying(false);
      } catch (error) {
        console.warn('Error al limpiar audio:', error);
      }
    }
  };

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {});

    const loadData = async () => {
      try {
        setLoading(true);

        let daysData;

        try {
          if (!isSupabaseConfigured()) {
            throw new Error('Supabase no configurado');
          }
          daysData = await DataService.getAllDaysWithUrls();
        } catch (dataError) {
          console.warn('⚠️ Error con Supabase, usando datos de fallback:', dataError);
          daysData = await DataService.getFallbackData();
        }

        setDays(daysData);

        // Calcular el día actual según días restantes hasta el 9 de agosto
        const calculatedDiff = getDaysUntilBirthday();
        setDiff(calculatedDiff);
        const index = getTodayDayIndex(daysData.length, calculatedDiff);

        setTodayIndex(index);
        setRealTodayIndex(index);
        setCurrentDay(daysData[index]);
        setCurrentPhotoIndex(0); // Resetear índice de foto al cambiar de día

        // Cargar datos de visualización guardados
        const viewedData = await AsyncStorage.getItem('viewedImages');
        if (viewedData) setViewed(JSON.parse(viewedData));

      } catch (error) {
        console.error('Error cargando datos:', error);
        Alert.alert('Error', 'No se pudieron cargar los datos del calendario.');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      cleanupAudio();
    };
  }, []);

  // Efecto para limpiar audio cuando cambie el día
  useEffect(() => {
    if (currentDay) {
      cleanupAudio();
    }
  }, [currentDay?.dayNumber]);

  // Animación del botón de audio con reanimated (scale)
  const audioButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: isPlaying ? withSpring(1.1) : withSpring(1) }],
      shadowOpacity: isPlaying ? 0.7 : 0.3,
      shadowRadius: isPlaying ? 10 : 5,
    };
  });

  // Animación del botón de regalo (suave)
  const giftButtonStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: 0.8,
      shadowRadius: 15,
      transform: [{ scale: withSpring(1) }],
    };
  });

  async function togglePlayback() {
    const hasValidAudio = currentDay?.audioUrl &&
      typeof currentDay.audioUrl === 'string' &&
      currentDay.audioUrl.startsWith('http');

    if (!hasValidAudio) {
      Alert.alert('Sin audio', 'No hay audio disponible para este día.');
      return;
    }

    try {
      await handleAudioPlayback();
    } catch (error) {
      await handleAudioError(error);
    }
  }

  async function handleAudioPlayback() {
    const noExistingSound = !soundObj;

    if (noExistingSound) {
      await createAndPlayNewSound();
      return;
    }

    await handleExistingSound();
  }

  async function createAndPlayNewSound() {
    const { sound } = await Audio.Sound.createAsync(
      { uri: currentDay.audioUrl },
      { shouldPlay: false }
    );

    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) return;

      const audioFinished = !status.isPlaying && status.didJustFinish;
      if (audioFinished) {
        setIsPlaying(false);
        setSoundObj(null);
        return;
      }

      const stateChanged = status.isPlaying !== isPlaying;
      if (stateChanged) {
        setIsPlaying(status.isPlaying);
      }
    });

    setSoundObj(sound);
    await sound.playAsync();
    setIsPlaying(true);
  }

  async function handleExistingSound() {
    const status = await soundObj.getStatusAsync();
    const soundNotLoaded = !status.isLoaded;

    if (soundNotLoaded) {
      await recreateSound();
      return;
    }

    await toggleExistingSound(status);
  }

  async function recreateSound() {
    await soundObj.unloadAsync();
    setSoundObj(null);
    setIsPlaying(false);
    setTimeout(() => togglePlayback(), 100);
  }

  async function toggleExistingSound(status) {
    const isCurrentlyPlaying = status.isPlaying;

    if (isCurrentlyPlaying) {
      await soundObj.pauseAsync();
      setIsPlaying(false);
      return;
    }

    await soundObj.playAsync();
    setIsPlaying(true);
  }

  async function handleAudioError(error) {
    console.error('Error con el audio:', error);

    const hasSoundObject = soundObj;
    if (hasSoundObject) {
      try {
        await soundObj.unloadAsync();
      } catch (unloadError) {
        console.warn('Error al descargar audio:', unloadError);
      }
    }

    setSoundObj(null);
    setIsPlaying(false);
    Alert.alert('Error', 'No se pudo reproducir el audio.');
  }

  function handleGiftPress() {
    const hasGiftNumber = currentDay?.giftNumber;
    if (hasGiftNumber) {
      setGiftNumber(currentDay.giftNumber);
      setShowGiftModal(true);
    }
  }

  function closeGiftModal() {
    setShowGiftModal(false);
    setGiftNumber(null);
  }

  function onPressImage(index) {
    if (index > realTodayIndex) {
      Alert.alert('Bloqueado', 'No puedes ver días futuros.');
      return;
    }
    
    // Cambiar al día seleccionado
    setTodayIndex(index);
    setCurrentDay(days[index]);
    setCurrentPhotoIndex(0); // Resetear índice de foto al cambiar de día
  }

  const renderPhotoItem = ({ item, index }) => {
    return (
      <TouchableOpacity onPress={() => onPressImage(todayIndex)} activeOpacity={0.9} style={styles.carouselItem}>
        <Image
          source={{ uri: item }}
          style={styles.carouselImage}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentPhotoIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  const daysLeft = currentDay ? currentDay.dayNumber : diff;

  const mainContent = (
    <>
      <Text style={styles.daysLeftText}>Faltan {daysLeft} días 🎂❤️</Text>

      {currentDay && (
        <>
          {currentDay.text && (
            <Text style={styles.dayText}>{currentDay.text}</Text>
          )}

          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.imageContainer}>
            {currentDay?.photos && currentDay.photos.length > 0 ? (
              <>
                <FlatList
                  ref={flatListRef}
                  data={currentDay.photos}
                  renderItem={renderPhotoItem}
                  keyExtractor={(item, index) => index.toString()}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onViewableItemsChanged={onViewableItemsChanged}
                  viewabilityConfig={viewabilityConfig}
                  style={styles.carousel}
                  getItemLayout={(data, index) => ({
                    length: screenWidth * 0.8,
                    offset: screenWidth * 0.8 * index,
                    index,
                  })}
                  initialNumToRender={1}
                  maxToRenderPerBatch={3}
                  windowSize={3}
                />
                {currentDay.photos.length > 1 && (
                  <View style={styles.paginationContainer}>
                    {currentDay.photos.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.paginationDot,
                          index === currentPhotoIndex && styles.paginationDotActive
                        ]}
                      />
                    ))}
                  </View>
                )}
              </>
            ) : (
              <TouchableOpacity onPress={() => onPressImage(todayIndex)} activeOpacity={0.9}>
                <Image
                  source={currentDay?.imageUrl ? { uri: currentDay.imageUrl } : FALLBACK_IMAGE}
                  style={styles.image}
                />
              </TouchableOpacity>
            )}
          </Animated.View>

          <Animated.View style={[styles.button, audioButtonStyle]}>
            <Pressable onPress={togglePlayback} android_ripple={{ color: '#fff' }} style={styles.pressable}>
              <MaterialIcons
                name={isPlaying ? 'pause-circle-filled' : 'play-circle-filled'}
                size={48}
                color="#fff"
              />
            </Pressable>
          </Animated.View>
        </>
      )}

      <Text style={styles.galleryTitle}>Galería de días anteriores</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {days.map((day, i) => (
          <TouchableOpacity
            key={i}
            disabled={i > realTodayIndex}
            onPress={() => onPressImage(i)}
            style={[
              styles.thumbnailContainer,
              i > realTodayIndex && { opacity: 0.3 },
            ]}
          >
            <Image
              source={day?.imageUrl ? { uri: day.imageUrl } : FALLBACK_IMAGE}
              style={styles.thumbnail}
            />
            {i > realTodayIndex && (
              <View style={styles.lockOverlay}>
                <MaterialIcons name="lock" size={24} color="#999" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Botón de regalo debajo de la galería */}
      {currentDay?.hasGift && (
        <Animated.View style={[styles.giftButtonSmall, giftButtonStyle]}>
          <Pressable onPress={handleGiftPress} android_ripple={{ color: '#fff' }} style={styles.giftPressable}>
            <MaterialIcons
              name="card-giftcard"
              size={32}
              color="#fff"
            />
          </Pressable>
        </Animated.View>
      )}

      {/* Modal del Regalo */}
      <Modal
        visible={showGiftModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeGiftModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎁 ¡Tienes un regalo!</Text>
              <TouchableOpacity onPress={closeGiftModal} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.giftNumberContainer}>
              <Text style={styles.giftNumberLabel}>Tu número es:</Text>
              <Text style={styles.giftNumber}>{giftNumber}</Text>
            </View>

            <TouchableOpacity onPress={closeGiftModal} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );

  if (loading) {
    return (
      <LinearGradient
        colors={['#5c1b6c', '#7270d0']}
        style={styles.container}
      >
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Cargando calendario...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#6a11cb', '#2575fc']}
      style={[styles.container, Platform.OS === 'web' && styles.webRoot]}
    >
      <StatusBar style="light" />
      {Platform.OS === 'web' ? (
        <ScrollView
          contentContainerStyle={styles.webScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.webInner}>{mainContent}</View>
        </ScrollView>
      ) : (
        mainContent
      )}
    </LinearGradient>
  );
}

function createStyles(screenWidth) {
  return StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    paddingTop: Platform.OS === 'web' ? 40 : 60,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 20,
    fontWeight: '600',
  },
  dayText: {
    fontSize: 15,
    fontWeight: '300',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 15,
    lineHeight: 28,
    textShadowColor: '#00000066',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: 'Georgia',
    letterSpacing: 0.5,
    fontStyle: 'italic',
  },
  daysLeftText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 15,
    textShadowColor: '#00000088',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    textAlign: 'center',
  },
  imageContainer: {
    width: screenWidth * 0.8,
    height: screenWidth * 0.8,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
    marginBottom: 15,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  carousel: {
    width: '100%',
    height: '100%',
  },
  carouselItem: {
    width: screenWidth * 0.8,
    height: screenWidth * 0.8,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#fff',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  checkmarkContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#e0f2f1cc',
    borderRadius: 20,
    padding: 2,
  },
  button: {
    backgroundColor: '#6200eecc',
    borderRadius: 40,
    marginBottom: 25,
    shadowColor: '#6200ee',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  giftButtonSmall: {
    backgroundColor: '#ff6b6b',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff6b6b',
    shadowOpacity: 0.8,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    marginTop: 15,
    alignSelf: 'center',
  },
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 25,
  },
  giftPressable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
    textShadowColor: '#00000066',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  galleryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  scroll: {
    maxHeight: 110,
  },
  thumbnailContainer: {
    marginHorizontal: 8,
    position: 'relative',
    borderRadius: 15,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 90,
    height: 90,
    borderRadius: 15,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallCheckmark: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#e0f2f1cc',
    borderRadius: 10,
    padding: 1,
  },
  // Estilos del Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 5,
  },
  giftNumberContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  giftNumberLabel: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  giftNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ff6b6b',
    textShadowColor: '#ff6b6b33',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  modalButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  webRoot: {
    alignItems: 'center',
  },
  webScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 32,
  },
  webInner: {
    width: '100%',
    maxWidth: 520,
    alignItems: 'center',
  },
  });
}
