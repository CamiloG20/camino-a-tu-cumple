import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { GRADIENT_COLORS } from '../../lib/layout';

export default function AdminLogin({
  password,
  setPassword,
  onLogin,
  busy,
  styles,
}) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={GRADIENT_COLORS}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
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
          onSubmitEditing={onLogin}
        />
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={onLogin}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Entrar al panel admin"
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Entrar</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            if (typeof window !== 'undefined') window.location.hash = '';
          }}
        >
          <Text style={styles.link}>← Volver a la app</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
