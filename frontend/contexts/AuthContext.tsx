import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { auth as authApi, stores as storesApi, getToken, setToken, removeToken, User } from '../services/api';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { initPurchases } from '../services/purchases';

type AuthState = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isShopkeeper: boolean;
  isSupplier: boolean;
  isStaff: boolean;
  isSuperAdmin: boolean;
  isAppLocked: boolean;
  isPinSet: boolean;
  isBiometricsEnabled: boolean;
  hasPermission: (module: string, level?: 'read' | 'write') => boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: string, phone?: string, currency?: string, businessType?: string, referralSource?: string, countryCode?: string) => Promise<void>;
  verifyPhone: (otp: string) => Promise<void>;
  logout: () => Promise<void>;
  switchStore: (storeId: string) => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithBiometrics: () => Promise<boolean>;
  toggleBiometrics: (enabled: boolean) => Promise<void>;
  togglePin: (enabled: boolean) => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [isPinSet, setIsPinSet] = useState(false);
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false);

  useEffect(() => {
    checkAuth();
    loadSecuritySettings();
    // Safety timeout: if checking auth takes too long (e.g. SecureStore hangs), stop loading
    const timer = setTimeout(() => {
      setIsLoading((loading) => {
        if (loading) {
          console.warn('Auth check timed out, forcing loading to false');
          return false;
        }
        return loading;
      });
    }, 15000); // 15 seconds timeout

    return () => clearTimeout(timer);
  }, []);

  async function loadSecuritySettings() {
    try {
      const pin = await SecureStore.getItemAsync('user_pin');
      setIsPinSet(!!pin);
      const biom = await SecureStore.getItemAsync('biometrics_enabled');
      setIsBiometricsEnabled(biom === 'true');

      // If PIN is set, lock the app initially
      if (pin) {
        setIsAppLocked(true);
      }
    } catch (e) {
      console.error("Failed to load security settings", e);
    }
  }

  async function checkAuth() {
    try {
      const token = await getToken();
      if (token) {
        const userData = await authApi.me();
        setUser(userData);
        if (Platform.OS !== 'web') {
          initPurchases(userData.user_id).catch(console.warn);
        }
      }
    } catch {
      await removeToken();
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const response = await authApi.login(email, password);
    console.log('[DEBUG] Login successful, user data:', JSON.stringify(response.user, null, 2));
    await setToken(response.access_token);
    setUser(response.user);
    if (Platform.OS !== 'web') {
      initPurchases(response.user.user_id).catch(console.warn);
    }
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
    countryCode?: string
  ) {
    const response = await authApi.register(email, password, name, role, phone, currency, businessType, referralSource, countryCode);
    await setToken(response.access_token);
    setUser(response.user);
  }

  async function verifyPhone(otp: string) {
    const response = await authApi.verifyPhone(otp);
    setUser(response.user);
  }

  async function logout() {
    // Update UI immediately
    setUser(null);
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
      setUser(updatedUser);
    } catch (e) {
      console.error("Failed to switch store", e);
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
      promptMessage: 'Authentification requise',
      fallbackLabel: 'Utiliser le code PIN',
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isShopkeeper: role === 'shopkeeper',
        isSupplier: role === 'supplier',
        isStaff: role === 'staff',
        isSuperAdmin: role === 'superadmin',
        hasPermission: (module: string, level: 'read' | 'write' = 'read') => {
          if (role === 'shopkeeper' || role === 'superadmin') return true;
          const userPerm = user?.permissions?.[module] || 'none';
          if (level === 'write') return userPerm === 'write';
          return userPerm === 'read' || userPerm === 'write';
        },
        login,
        register,
        verifyPhone,
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
