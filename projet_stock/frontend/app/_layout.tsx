import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import OfflineBanner from '../components/OfflineBanner';
import { useNetwork } from '../hooks/useNetwork';
import { syncService } from '../services/sync';

function RootLayoutNav() {
  const { isAuthenticated, isLoading, isSupplier } = useAuth();
  const { isConnected } = useNetwork();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace(isSupplier ? '/(supplier-tabs)' : '/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  // Auto-sync when online and authenticated
  useEffect(() => {
    if (isConnected && isAuthenticated) {
      syncService.processQueue();
    }
  }, [isConnected, isAuthenticated]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const { isDark } = useTheme();

  if (isLoading) return null; // RootLayout already handles loading

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <OfflineBanner />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bgDark,
  },
});
