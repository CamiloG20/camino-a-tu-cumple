import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function GiftModal({
  visible,
  giftNumber,
  giftMessage,
  onClose,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={styles.modalContent}
          onPress={(event) => event.stopPropagation()}
          accessibilityRole="none"
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} accessibilityRole="header">
              🎁 ¡Tienes un regalo!
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Cerrar modal de regalo"
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialIcons name="close" size={28} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.giftNumberContainer}>
            <Text style={styles.giftNumberLabel}>Regalo especial #{giftNumber}</Text>
            <Text style={styles.giftNumber}>{giftNumber}</Text>
            {giftMessage ? <Text style={styles.giftMessageText}>{giftMessage}</Text> : null}
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={styles.modalButton}
            accessibilityLabel="Cerrar"
            accessibilityRole="button"
          >
            <Text style={styles.modalButtonText}>Cerrar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 28,
    width: '100%',
    maxWidth: 380,
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftNumberContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  giftNumberLabel: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  giftNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ff6b6b',
  },
  giftMessageText: {
    marginTop: 16,
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  modalButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
    marginTop: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
});
