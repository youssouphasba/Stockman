import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth as authApi, stores as storesApi, getToken, setToken, removeToken, User } from '../services/api';

type AuthState = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isShopkeeper: boolean;
  isSupplier: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchStore: (storeId: string) => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await getToken();
      if (token) {
        const userData = await authApi.me();
        setUser(userData);
      }
    } catch {
      await removeToken();
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const response = await authApi.login(email, password);
    await setToken(response.access_token);
    setUser(response.user);
  }

  async function register(email: string, password: string, name: string, role: string = 'shopkeeper') {
    const response = await authApi.register(email, password, name, role);
    await setToken(response.access_token);
    setUser(response.user);
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    await removeToken();
    setUser(null);
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

  const role = user?.role || 'shopkeeper';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isShopkeeper: role === 'shopkeeper',
        isSupplier: role === 'supplier',
        login,
        register,
        logout,
        switchStore,
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
