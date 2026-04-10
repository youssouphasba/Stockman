import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Linking from 'expo-linking';
import { auth as authApi, stores as storesApi, userFeatures, notifications as notificationsApi, getToken, setToken, removeToken, setRefreshToken, getRefreshToken, removeRefreshToken, User } from '../services/api';
import { initPurchases } from '../services/purchases';
import { cache } from '../services/cache';
import { isRestaurantBusiness } from '../utils/business';
import { getAccessContext, hasModulePermission } from '../utils/access';
import { useTranslation } from 'react-i18next';
import {
  clearActiveStoredAccountId,
  getActiveStoredAccountId,
  getStoredAccountSession,
  listStoredAccountSessions,
  removeStoredAccountSession,
  saveStoredAccountSession,
  setActiveStoredAccountId,
  StoredAccountSession,
} from '../services/accountSessions';
type AuthState = {
  user: User | null;
  storedAccounts: StoredAccountSession[];
  activeAccountId: string | null;
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
  completeSocialProfile: (data: { name?: string; countryCode: string; phone: string; businessType: string; referralSource?: string }) => Promise<User>;
  register: (email: string, password: string, name: string, role?: string, phone?: string, currency?: string, businessType?: string, referralSource?: string, countryCode?: string, plan?: string, signupSurface?: 'mobile' | 'web') => Promise<User>;
  verifyPhone: (firebaseIdToken: string) => Promise<User>;
  verifyEmail: (otp: string) => Promise<User>;
  restoreSession: (allowRefreshFallback?: boolean) => Promise<User | null>;
  addAccount: (email: string, password: string) => Promise<User>;
  switchAccount: (userId: string) => Promise<User | null>;
  removeStoredAccount: (userId: string) => Promise<void>;
  registerPushTokenForStoredAccounts: (pushToken: string) => Promise<void>;
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
  const [storedAccounts, setStoredAccounts] = useState<StoredAccountSession[]>([]);
  const [activeAccountId, setActiveAccountIdState] = useState<string | null>(null);
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

  const persistCurrentSession = useCallback(async (userData: User) => {
    const currentAccessToken = await getToken();
    if (!currentAccessToken) return;
    const currentRefreshToken = await getRefreshToken();
    const updatedAccounts = await saveStoredAccountSession(userData, currentAccessToken, currentRefreshToken);
    setStoredAccounts(updatedAccounts);
    setActiveAccountIdState(userData.user_id);
  }, []);

  const hydrateAndPersistUser = useCallback(async (userData: User) => {
    await hydrateAuthenticatedUser(userData);
    await persistCurrentSession(userData);
  }, [hydrateAuthenticatedUser, persistCurrentSession]);

  const restoreSession = useCallback(async (allowRefreshFallback: boolean = false) => {
    const token = await getToken();
    const refreshToken = !token ? await getRefreshToken() : null;
    const hydrateFromActiveToken = async () => {
      if (!token && (!allowRefreshFallback || !refreshToken)) {
        return null;
      }
      const userData = await authApi.me();
      await hydrateAndPersistUser(userData);
      return userData;
    };

    try {
      const restoredFromActive = await hydrateFromActiveToken();
      if (restoredFromActive) return restoredFromActive;
    } catch {
      // Ignore and fall back to remembered accounts.
    }

    const rememberedAccounts = await listStoredAccountSessions();
    setStoredAccounts(rememberedAccounts);

    const preferredAccountId = await getActiveStoredAccountId();
    const orderedAccounts = [
      ...rememberedAccounts.filter((entry) => entry.user.user_id === preferredAccountId),
      ...rememberedAccounts.filter((entry) => entry.user.user_id !== preferredAccountId),
    ];

    for (const session of orderedAccounts) {
      try {
        await setToken(session.access_token);
        if (session.refresh_token) {
          await setRefreshToken(session.refresh_token);
        } else {
          await removeRefreshToken();
        }
        const userData = await authApi.me();
        await hydrateAndPersistUser(userData);
        return userData;
      } catch {
        // Try the next remembered account.
      }
    }

    setUser(null);
    setHasProduction(false);
    setIsRestaurant(false);
    setActiveAccountIdState(null);
    await removeToken();
    return null;
  }, [hydrateAndPersistUser]);

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
      setStoredAccounts([]);
      setActiveAccountIdState(null);
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
    await cache.clear();
    await hydrateAndPersistUser(response.user);
    return response.user;
  }

  async function addAccount(email: string, password: string) {
    const previousAccessToken = await getToken();
    const previousRefreshToken = await getRefreshToken();
    const previousUser = user;
    const previousActiveAccountId = activeAccountId;
    try {
      const response = await authApi.login(email, password);
      const updatedAccounts = await saveStoredAccountSession(response.user, response.access_token, response.refresh_token);
      setStoredAccounts(updatedAccounts);
      if (previousActiveAccountId) {
        await setActiveStoredAccountId(previousActiveAccountId);
        setActiveAccountIdState(previousActiveAccountId);
      }
      return response.user;
    } finally {
      if (previousAccessToken) {
        await setToken(previousAccessToken);
      } else {
        await removeToken();
      }
      if (previousRefreshToken) {
        await setRefreshToken(previousRefreshToken);
      } else {
        await removeRefreshToken();
      }
      if (previousUser) {
        await hydrateAuthenticatedUser(previousUser);
      }
    }
  }

  async function loginWithSocial(firebaseIdToken: string, signupSurface: 'mobile' | 'web' = 'mobile') {
    const response = await authApi.socialLogin(firebaseIdToken, signupSurface);
    await setToken(response.access_token);
    if (response.refresh_token) await setRefreshToken(response.refresh_token);
    await cache.clear();
    await hydrateAndPersistUser(response.user);
    return response.user;
  }

  async function completeSocialProfile(data: { name?: string; countryCode: string; phone: string; businessType: string; referralSource?: string }) {
    const response = await authApi.completeSocialProfile({
      name: data.name?.trim() || undefined,
      country_code: data.countryCode,
      phone: data.phone.trim(),
      business_type: data.businessType,
      how_did_you_hear: data.referralSource?.trim() || undefined,
    });
    await cache.clear({ preserveSyncQueue: true, preserveLastSync: true });
    await hydrateAndPersistUser(response.user);
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
    await cache.clear();
    await hydrateAndPersistUser(response.user);
    return response.user;
  }

  async function verifyPhone(firebaseIdToken: string) {
    const response = await authApi.verifyPhone(firebaseIdToken);
    await hydrateAndPersistUser(response.user);
    return response.user;
  }

  async function verifyEmail(otp: string) {
    const response = await authApi.verifyEmail(otp);
    await hydrateAndPersistUser(response.user);
    return response.user;
  }

  async function logout() {
    const rememberedAccounts = await listStoredAccountSessions();
    try {
      await authApi.logout();
    } catch {
      // ignore server-side failure
    }

    setIsAppLocked(false);
    await cache.clear();
    setUser(null);
    setHasProduction(false);
    setIsRestaurant(false);
    setActiveAccountIdState(null);
    setStoredAccounts(rememberedAccounts);
    await clearActiveStoredAccountId();
    await removeToken();
  }

  async function switchAccount(userId: string) {
    const targetSession = await getStoredAccountSession(userId);
    if (!targetSession) return null;

    await setToken(targetSession.access_token);
    if (targetSession.refresh_token) {
      await setRefreshToken(targetSession.refresh_token);
    } else {
      await removeRefreshToken();
    }
    await setActiveStoredAccountId(userId);
    setActiveAccountIdState(userId);
    await cache.clear({ preserveSyncQueue: true, preserveLastSync: true });
    setUser(targetSession.user);
    setHasProduction(false);
    setIsRestaurant(false);
    if (Platform.OS !== 'web') {
      initPurchases(targetSession.user.user_id).catch(console.warn);
    }
    const updatedAccounts = await saveStoredAccountSession(
      targetSession.user,
      targetSession.access_token,
      targetSession.refresh_token,
    );
    setStoredAccounts(updatedAccounts);

    void (async () => {
      try {
        const features = await userFeatures.get();
        setHasProduction(features.has_production);
        setIsRestaurant(isRestaurantBusiness(features));
      } catch (error) {
        console.warn('Failed to refresh switched account features:', error);
      }
    })();

    return targetSession.user;
  }

  async function removeStoredAccount(userId: string) {
    const isCurrentAccount = user?.user_id === userId;
    const updatedAccounts = await removeStoredAccountSession(userId);
    setStoredAccounts(updatedAccounts);

    if (!isCurrentAccount) {
      return;
    }

    const nextAccount = updatedAccounts[0] || null;
    if (nextAccount) {
      await setToken(nextAccount.access_token);
      if (nextAccount.refresh_token) {
        await setRefreshToken(nextAccount.refresh_token);
      } else {
        await removeRefreshToken();
      }
      await setActiveStoredAccountId(nextAccount.user.user_id);
      setActiveAccountIdState(nextAccount.user.user_id);
      await restoreSession(true);
      return;
    }

    await clearActiveStoredAccountId();
    await removeToken();
    setUser(null);
    setHasProduction(false);
    setIsRestaurant(false);
    setActiveAccountIdState(null);
  }

  async function switchStore(storeId: string) {
    if (!user) return;
    try {
      const updatedUser = await storesApi.setActive(storeId);
      await cache.clear({ preserveSyncQueue: true, preserveLastSync: true });
      await hydrateAndPersistUser(updatedUser);
    } catch (e) {
      console.error('Failed to switch store', e);
    }
  }

  const registerPushTokenForStoredAccounts = useCallback(async (pushToken: string) => {
    const accounts = await listStoredAccountSessions();
    setStoredAccounts(accounts);
    await Promise.all(
      accounts.map(async (account) => {
        try {
          await notificationsApi.registerTokenWithAccessToken(pushToken, account.access_token);
        } catch (error) {
          console.warn(`Push token registration failed for account ${account.user.user_id}`, error);
        }
      }),
    );
  }, []);

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
        storedAccounts,
        activeAccountId,
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
        completeSocialProfile,
        register,
        verifyPhone,
        verifyEmail,
        restoreSession,
        addAccount,
        switchAccount,
        removeStoredAccount,
        registerPushTokenForStoredAccounts,
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
