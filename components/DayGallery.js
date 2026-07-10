import React, { useRef } from 'react';
import { FlatList, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ProgressiveImage from './ProgressiveImage';

export default function DayGallery({
  days,
  todayIndex,
  effectiveTodayIndex,
  viewed,
  openedGifts,
  onPressDay,
  fallbackImage,
  galleryRef,
  screenWidth,
}) {
  const listRef = useRef(null);

  const setRef = (node) => {
    listRef.current = node;
    if (typeof galleryRef === 'function') {
      galleryRef(node);
    } else if (galleryRef) {
      galleryRef.current = node;
    }
  };

  const renderItem = ({ item: day, index: i }) => {
    const isActive = i === todayIndex;
    const isLocked = i > effectiveTodayIndex;
    const isViewed = viewed[String(day.dayNumber)];
    const hasGift = day.hasGift;
    const giftOpened = openedGifts[String(day.dayNumber)];

    return (
      <TouchableOpacity
        disabled={isLocked}
        onPress={() => onPressDay(i)}
        style={[
          styles.thumbnailContainer,
          isActive && styles.thumbnailActive,
          isLocked && styles.thumbnailLocked,
          hasGift && styles.thumbnailGift,
        ]}
        accessibilityLabel={`Día ${day.dayNumber}${hasGift ? ', día de regalo' : ''}${isLocked ? ', bloqueado' : ''}`}
        accessibilityState={{ selected: isActive, disabled: isLocked }}
      >
        <ProgressiveImage
          source={day?.imageUrl ? { uri: day.imageUrl } : fallbackImage}
          style={styles.thumbnail}
          imageStyle={styles.thumbnail}
        />
        <View style={styles.dayBadge}>
          <Text style={styles.dayBadgeText}>{day.dayNumber}</Text>
        </View>
        {hasGift ? (
          <View style={[styles.giftThumbBadge, isLocked && styles.giftThumbBadgeLocked]}>
            <MaterialIcons name="card-giftcard" size={14} color="#fff" />
          </View>
        ) : null}
        {isViewed && !isLocked ? (
          <View style={styles.viewedBadge}>
            <MaterialIcons name="check-circle" size={18} color="#4ade80" />
          </View>
        ) : null}
        {hasGift && giftOpened && !isLocked ? (
          <View style={styles.giftOpenedBadge}>
            <MaterialIcons name="redeem" size={16} color="#fbbf24" />
          </View>
        ) : null}
        {isLocked ? (
          <View style={styles.lockOverlay}>
            <MaterialIcons name="lock" size={24} color="#64748b" />
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Text style={styles.galleryTitle}>Galería de días</Text>
      <FlatList
        ref={setRef}
        data={days}
        horizontal
        keyExtractor={(day) => String(day.dayNumber)}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={5}
        getItemLayout={(_data, index) => ({
          length: 104,
          offset: 104 * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({
            offset: Math.max(0, info.index * 104 - screenWidth / 2 + 52),
            animated: true,
          });
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  galleryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 24,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  scroll: {
    maxHeight: 120,
    flexGrow: 0,
    width: '100%',
  },
  scrollContent: {
    paddingRight: 16,
    paddingBottom: 4,
    gap: 12,
  },
  thumbnailContainer: {
    width: 92,
    height: 92,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    marginRight: 12,
  },
  thumbnailActive: {
    borderColor: '#fff',
    borderWidth: 3,
  },
  thumbnailLocked: {
    opacity: 0.55,
  },
  thumbnailGift: {
    borderColor: '#fbbf24',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  dayBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dayBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  giftThumbBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    padding: 3,
  },
  giftThumbBadgeLocked: {
    backgroundColor: '#64748b',
  },
  viewedBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
  },
  giftOpenedBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10,
    padding: 2,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
