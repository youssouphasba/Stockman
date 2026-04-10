import '../utils/trusted-types';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import PinScreen from './pin';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import OfflineBanner from '../components/OfflineBanner';
import { SyncProvider, useSync } from '../contexts/SyncContext';
import { syncService } from '../services/sync';
import * as NavigationBar from 'expo-navigation-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../services/i18n';

function RootLayoutNav() {
  const { isAuthenticated, isLoading, isSupplier, isSuperAdmin, isAppLocked, user } = useAuth();
  const { isOnline, processQueue, prefetchData } = useSync();
  const { isDark, colors } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  // Immersive mode for Android + unlock rotation
  useEffect(() => {
    ScreenOrientation.unlockAsync();
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('inset-swipe' as any);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inSupplierTabs = segments[0] === '(supplier-tabs)';
    const inShopkeeperTabs = segments[0] === '(tabs)';
    const inAdminGroup = segments[0] === '(admin)';
    const isPublicPage = segments[0] === 'terms' || segments[0] === 'privacy';

    // User is authenticated but still needs verification — stay in auth group
    const needsVerification = isAuthenticated && user && !user.can_access_app && !!user.required_verification;
    const onVerificationScreen = inAuthGroup && (segments[1] === 'verify-phone' || segments[1] === 'verify-email');
    const needsProfileCompletion = isAuthenticated && !!user?.needs_profile_completion;
    const currentAuthScreen = String(segments[1] || '');
    const onProfileCompletionScreen = inAuthGroup && currentAuthScreen === 'complete-social-profile';

    if (!isAuthenticated && !inAuthGroup && !isPublicPage) {
      router.replace('/(auth)' as any);
    } else if (isAuthenticated && isSuperAdmin && !inAdminGroup && !needsVerification && !needsProfileCompletion) {
      router.replace('/(admin)' as any);
    } else if (isAuthenticated && isSupplier && inShopkeeperTabs && !needsVerification && !needsProfileCompletion) {
      router.replace('/(supplier-tabs)' as any);
    } else if (isAuthenticated && !isSupplier && inSupplierTabs && !isSuperAdmin && !needsVerification && !needsProfileCompletion) {
      router.replace('/(tabs)' as any);
    } else if (needsVerification && !onVerificationScreen) {
      // User needs verification but isn't on the verification screen — redirect there
      if (user.required_verification === 'phone') {
        router.replace('/(auth)/verify-phone');
      } else if (user.required_verification === 'email') {
        router.replace('/(auth)/verify-email');
      }
    } else if (needsProfileCompletion && !onProfileCompletionScreen) {
      router.replace('/(auth)/complete-social-profile' as any);
    } else if (isAuthenticated && inAuthGroup && !needsVerification && !needsProfileCompletion) {
      // Verified user still on auth screens — redirect to main app
      if (isSuperAdmin) {
        router.replace('/(admin)' as any);
      } else if (isSupplier) {
        router.replace('/(supplier-tabs)');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, isLoading, isSupplier, isSuperAdmin, router, segments, user]);

  // Auto-sync and prefetch when online and authenticated
  useEffect(() => {
    if (isOnline && isAuthenticated) {
      processQueue();
      prefetchData();
    }
  }, [isOnline, isAuthenticated]);

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bgDark }]}>
        <ActivityIndicator size="large" color={colors.primary} />
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
  },
});
