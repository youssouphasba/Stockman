import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Colors } from '../constants/theme';
import PinScreen from './pin';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import OfflineBanner from '../components/OfflineBanner';
import { SyncProvider, useSync } from '../contexts/SyncContext';
import { syncService } from '../services/sync';
import * as NavigationBar from 'expo-navigation-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../services/i18n';

function RootLayoutNav() {
  const { isAuthenticated, isLoading, isSupplier, isSuperAdmin, isAppLocked } = useAuth();
  const { isOnline, processQueue, prefetchData } = useSync();
  const segments = useSegments();
  const router = useRouter();

  // Immersive mode for Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('inset-swipe' as any);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isPublicPage = segments[0] === 'terms' || segments[0] === 'privacy';

    if (!isAuthenticated && !inAuthGroup && !isPublicPage) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      if (isSuperAdmin) {
        router.replace('/(admin)' as any);
      } else if (isSupplier) {
        router.replace('/(supplier-tabs)');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, isLoading, isAppLocked, segments]);

  // Auto-sync and prefetch when online and authenticated
  useEffect(() => {
    if (isOnline && isAuthenticated) {
      processQueue();
      prefetchData();
    }
  }, [isOnline, isAuthenticated]);

  const { isDark } = useTheme();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // No need to check isLoading here again as it's handled above

  if (isAuthenticated && isAppLocked) {
    return (
      <>
        <StatusBar style={isDark ? "light" : "dark"} />
        <PinScreen />
      </>
    );
  }

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
    <SafeAreaProvider>
      <SyncProvider>
        <ThemeProvider>
          <AuthProvider>
            <RootLayoutNav />
          </AuthProvider>
        </ThemeProvider>
      </SyncProvider>
    </SafeAreaProvider>
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
