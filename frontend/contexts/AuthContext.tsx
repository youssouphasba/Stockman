import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Linking from 'expo-linking';
import { auth as authApi, stores as storesApi, userFeatures, getToken, setToken, removeToken, setRefreshToken, User } from '../services/api';
import { initPurchases } from '../services/purchases';
import { cache } from '../services/cache';
import { isRestaurantBusiness } from '../utils/business';
import { getAccessContext, hasModulePermission } from '../utils/access';
import { useTranslation } from 'react-i18next';

type AuthState = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isShopkeeper: boolean;
  isOrgAdmin: boolean;
  isBillingAdmin: boolean;
  isSupplier: boolean;
  isStaff: boolean;
  isSuperAdmin: boolean;
  isAppLocked: boolean;
  isPinSet: boolean;
  isBiometricsEnabled: boolean;
  hasAccountRole: (role: 'billing_admin' | 'org_admin') => boolean;
  hasPermission: (module: string, level?: 'read' | 'write') => boolean;
  hasOperationalAccess: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithSocial: (firebaseIdToken: string, signupSurface?: 'mobile' | 'web') => Promise<User>;
  register: (email: string, password: string, name: string, role?: string, phone?: string, currency?: string, businessType?: string, referralSource?: string, countryCode?: string, plan?: string, signupSurface?: 'mobile' | 'web') => Promise<User>;
  verifyPhone: (firebaseIdToken: string) => Promise<User>;
  verifyEmail: (otp: string) => Promise<User>;
  restoreSession: () => Promise<User | null>;
  logout: () => Promise<void>;
  switchStore: (storeId: string) => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithBiometrics: () => Promise<boolean>;
  toggleBiometrics: (enabled: boolean) => Promise<void>;
  togglePin: (enabled: boolean) => Promise<void>;
  hasProduction: boolean;
  isRestaurant: boolean;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [isPinSet, setIsPinSet] = useState(false);
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false);
  const [hasProduction, setHasProduction] = useState(false);
  const [isRestaurant, setIsRestaurant] = useState(false);

  const hydrateAuthenticatedUser = useCallback(async (userData: User) => {
    setUser(userData);
    try {
      const f = await userFeatures.get();
      setHasProduction(f.has_production);
      setIsRestaurant(isRestaurantBusiness(f));
    } catch (e) {
      console.warn('Failed to load user features:', e);
    }
    if (Platform.OS !== 'web') {
      initPurchases(userData.user_id).catch(console.warn);
    }
  }, []);

  const restoreSession = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      setHasProduction(false);
      setIsRestaurant(false);
      return null;
    }

    const userData = await authApi.me();
    await hydrateAuthenticatedUser(userData);
    return userData;
  }, [hydrateAuthenticatedUser]);

  const consumeDemoLink = useCallback(async (url?: string | null) => {
    if (!url) return false;
    const parsed = Linking.parse(url);
    const accessToken = typeof parsed.queryParams?.demo_access_token === 'string'
      ? parsed.queryParams.demo_access_token
      : null;
    if (!accessToken) return false;

    const refreshToken = typeof parsed.queryParams?.demo_refresh_token === 'string'
      ? parsed.queryParams.demo_refresh_token
      : null;

    await setToken(accessToken);
    if (refreshToken) {
      await setRefreshToken(refreshToken);
    }
    await restoreSession();
    return true;
  }, [restoreSession]);

  const checkAuth = useCallback(async () => {
    try {
      const initialUrl = await Linking.getInitialURL();
      const hasConsumedDemoLink = await consumeDemoLink(initialUrl);
      if (hasConsumedDemoLink) {
        return;
      }

      await restoreSession();
    } catch {
      await removeToken();
      setUser(null);
      setHasProduction(false);
      setIsRestaurant(false);
    } finally {
      setIsLoading(false);
    }
  }, [consumeDemoLink, restoreSession]);

  useEffect(() => {
    void checkAuth();
    void loadSecuritySettings();
    const subscription = Linking.addEventListener('url', ({ url }) => {
      void consumeDemoLink(url);
    });

    const timer = setTimeout(() => {
      setIsLoading((loading) => {
        if (loading) {
          console.warn('Auth check timed out, forcing loading to false');
          return false;
        }
        return loading;
      });
    }, 15000);

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [checkAuth, consumeDemoLink]);

  async function loadSecuritySettings() {
    try {
      const pin = await SecureStore.getItemAsync('user_pin');
      setIsPinSet(!!pin);
      const biom = await SecureStore.getItemAsync('biometrics_enabled');
      setIsBiometricsEnabled(biom === 'true');

      if (pin) {
        setIsAppLocked(true);
      }
    } catch (e) {
      console.error('Failed to load security settings', e);
    }
  }

  async function login(email: string, password: string) {
    const response = await authApi.login(email, password);
    await setToken(response.access_token);
    if (response.refresh_token) await setRefreshToken(response.refresh_token);
    await hydrateAuthenticatedUser(response.user);
    return response.user;
  }

  async function loginWithSocial(firebaseIdToken: string, signupSurface: 'mobile' | 'web' = 'mobile') {
    const response = await authApi.socialLogin(firebaseIdToken, signupSurface);
    await setToken(response.access_token);
    if (response.refresh_token) await setRefreshToken(response.refresh_token);
    await hydrateAuthenticatedUser(response.user);
    return response.user;
  }

  async function register(
    email: string,
    password: string,
    name: string,
    role: string = 'shopkeeper',
    phone: string = '',
    currency?: string,
    businessType?: string,
    referralSource?: string,
    countryCode?: string,
    plan?: string,
    signupSurface: 'mobile' | 'web' = 'mobile'
  ) {
    const response = await authApi.register(email, password, name, role, phone, currency, businessType, referralSource, countryCode, plan, signupSurface);
    await setToken(response.access_token);
    if (response.refresh_token) await setRefreshToken(response.refresh_token);
    await hydrateAuthenticatedUser(response.user);
    return response.user;
  }

  async function verifyPhone(firebaseIdToken: string) {
    const response = await authApi.verifyPhone(firebaseIdToken);
    setUser(response.user);
    return response.user;
  }

  async function verifyEmail(otp: string) {
    const response = await authApi.verifyEmail(otp);
    setUser(response.user);
    return response.user;
  }

  async function logout() {
    setUser(null);
    setHasProduction(false);
    setIsRestaurant(false);
    setIsAppLocked(false);
    await removeToken();

    try {
      await authApi.logout();
    } catch {
      // ignore server-side failure
    }
  }

  async function switchStore(storeId: string) {
    if (!user) return;
    try {
      const updatedUser = await storesApi.setActive(storeId);
      await cache.clear();
      setUser(updatedUser);
    } catch (e) {
      console.error('Failed to switch store', e);
    }
  }

  async function setPin(pin: string) {
    await SecureStore.setItemAsync('user_pin', pin);
    setIsPinSet(true);
    setIsAppLocked(false);
  }

  async function togglePin(enabled: boolean) {
    if (!enabled) {
      await SecureStore.deleteItemAsync('user_pin');
      setIsPinSet(false);
      setIsAppLocked(false);
    }
  }

  async function unlockWithPin(pin: string) {
    const savedPin = await SecureStore.getItemAsync('user_pin');
    if (savedPin === pin) {
      setIsAppLocked(false);
      return true;
    }
    return false;
  }

  async function unlockWithBiometrics() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: t('auth.login.biometricPrompt'),
      fallbackLabel: t('auth.login.biometricFallback'),
    });

    if (result.success) {
      setIsAppLocked(false);
      return true;
    }
    return false;
  }

  async function toggleBiometrics(enabled: boolean) {
    await SecureStore.setItemAsync('biometrics_enabled', enabled ? 'true' : 'false');
    setIsBiometricsEnabled(enabled);
  }

  const role = user?.role || 'shopkeeper';
  const access = getAccessContext(user);
  const accountRoles = access.accountRoles;
  const isSuperAdmin = access.isSuperAdmin;
  const isOrgAdmin = access.isOrgAdmin;
  const isBillingAdmin = access.isBillingAdmin;
  const hasOperationalAccess = access.hasOperationalAccess;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isShopkeeper: role === 'shopkeeper',
        isOrgAdmin,
        isBillingAdmin,
        isSupplier: role === 'supplier',
        isStaff: role === 'staff',
        isSuperAdmin,
        hasAccountRole: (requiredRole: 'billing_admin' | 'org_admin') => isSuperAdmin || accountRoles.includes(requiredRole) || role === 'shopkeeper',
        hasPermission: (module: string, level: 'read' | 'write' = 'read') => {
          return hasModulePermission(user, module as any, level);
        },
        hasOperationalAccess,
        login,
        loginWithSocial,
        register,
        verifyPhone,
        verifyEmail,
        restoreSession,
        logout,
        switchStore,
        isAppLocked,
        isPinSet,
        isBiometricsEnabled,
        setPin,
        unlockWithPin,
        unlockWithBiometrics,
        toggleBiometrics,
        togglePin,
        hasProduction,
        isRestaurant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
