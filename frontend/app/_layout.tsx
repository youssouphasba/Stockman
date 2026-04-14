import '../utils/trusted-types';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import PinScreen from './pin';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import OfflineBanner from '../components/OfflineBanner';
import { SyncProvider } from '../contexts/SyncContext';
import * as NavigationBar from 'expo-navigation-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../services/i18n';
import { getFirstAuthorizedShopkeeperRoute } from '../utils/accountRouting';

function RootLayoutNav() {
  const { isAuthenticated, isLoading, isSupplier, isSuperAdmin, isAppLocked, user } = useAuth();
  const { isDark, colors } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const lastRedirectRef = useRef<string | null>(null);

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
    const currentChildSegment = segments.slice(1)[0];

    // User is authenticated but still needs verification — stay in auth group
    const needsVerification = isAuthenticated && user && !user.can_access_app && !!user.required_verification;
    const onVerificationScreen = inAuthGroup && (currentChildSegment === 'verify-phone' || currentChildSegment === 'verify-email');
    const needsProfileCompletion = isAuthenticated && !!user?.needs_profile_completion;
    const currentAuthScreen = String(currentChildSegment || '');
    const onProfileCompletionScreen = inAuthGroup && currentAuthScreen === 'complete-social-profile';

    let target: string | null = null;

    if (!isAuthenticated && !inAuthGroup && !isPublicPage) {
      target = '/(auth)';
    } else if (isAuthenticated && isSuperAdmin && !inAdminGroup && !needsVerification && !needsProfileCompletion) {
      target = '/(admin)';
    } else if (isAuthenticated && isSupplier && inShopkeeperTabs && !needsVerification && !needsProfileCompletion) {
      target = '/(supplier-tabs)';
    } else if (isAuthenticated && !isSupplier && inSupplierTabs && !isSuperAdmin && !needsVerification && !needsProfileCompletion) {
      target = '/(tabs)';
    } else if (needsVerification && !onVerificationScreen) {
      if (user.required_verification === 'phone') {
        target = '/(auth)/verify-phone';
      } else if (user.required_verification === 'email') {
        target = '/(auth)/verify-email';
      }
    } else if (needsProfileCompletion && !onProfileCompletionScreen) {
      target = '/(auth)/complete-social-profile';
    } else if (isAuthenticated && inAuthGroup && !needsVerification && !needsProfileCompletion) {
      if (isSuperAdmin) {
        target = '/(admin)';
      } else if (isSupplier) {
        target = '/(supplier-tabs)';
      } else {
        target = getFirstAuthorizedShopkeeperRoute(user) as string;
      }
    }

    // Guard: skip if we already redirected to this target (prevents redirect loops)
    if (target && target !== lastRedirectRef.current) {
      lastRedirectRef.current = target;
      router.replace(target as any);
    } else if (!target) {
      lastRedirectRef.current = null;
    }
  }, [isAuthenticated, isLoading, isSupplier, isSuperAdmin, router, segments, user]);

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
