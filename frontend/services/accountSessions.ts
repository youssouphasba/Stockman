import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { User } from './api';

const STORED_ACCOUNTS_KEY = 'stockman_saved_accounts_v1';
const ACTIVE_ACCOUNT_ID_KEY = 'stockman_active_account_id_v1';

export type StoredAccountSession = {
  user: User;
  access_token: string;
  refresh_token?: string | null;
  added_at: string;
  last_used_at: string;
};

async function getStoredValue(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setStoredValue(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeStoredValue(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

function sanitizeStoredAccounts(value: unknown): StoredAccountSession[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is StoredAccountSession => {
    return !!entry
      && typeof entry === 'object'
      && !!(entry as StoredAccountSession).user?.user_id
      && typeof (entry as StoredAccountSession).access_token === 'string';
  });
}

export async function listStoredAccountSessions(): Promise<StoredAccountSession[]> {
  const rawValue = await getStoredValue(STORED_ACCOUNTS_KEY);
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(rawValue);
    return sanitizeStoredAccounts(parsed).sort((a, b) => {
      return new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime();
    });
  } catch {
    return [];
  }
}

export async function writeStoredAccountSessions(accounts: StoredAccountSession[]): Promise<void> {
  await setStoredValue(STORED_ACCOUNTS_KEY, JSON.stringify(accounts));
}

export async function saveStoredAccountSession(
  user: User,
  accessToken: string,
  refreshToken?: string | null,
): Promise<StoredAccountSession[]> {
  const existing = await listStoredAccountSessions();
  const now = new Date().toISOString();
  const nextSession: StoredAccountSession = {
    user,
    access_token: accessToken,
    refresh_token: refreshToken ?? null,
    added_at: existing.find((entry) => entry.user.user_id === user.user_id)?.added_at || now,
    last_used_at: now,
  };
  const filtered = existing.filter((entry) => entry.user.user_id !== user.user_id);
  const nextAccounts = [nextSession, ...filtered];
  await writeStoredAccountSessions(nextAccounts);
  await setActiveStoredAccountId(user.user_id);
  return nextAccounts;
}

export async function removeStoredAccountSession(userId: string): Promise<StoredAccountSession[]> {
  const existing = await listStoredAccountSessions();
  const nextAccounts = existing.filter((entry) => entry.user.user_id !== userId);
  await writeStoredAccountSessions(nextAccounts);
  const activeAccountId = await getActiveStoredAccountId();
  if (activeAccountId === userId) {
    if (nextAccounts[0]?.user?.user_id) {
      await setActiveStoredAccountId(nextAccounts[0].user.user_id);
    } else {
      await clearActiveStoredAccountId();
    }
  }
  return nextAccounts;
}

export async function getStoredAccountSession(userId: string): Promise<StoredAccountSession | null> {
  const existing = await listStoredAccountSessions();
  return existing.find((entry) => entry.user.user_id === userId) || null;
}

export async function getActiveStoredAccountId(): Promise<string | null> {
  return getStoredValue(ACTIVE_ACCOUNT_ID_KEY);
}

export async function setActiveStoredAccountId(userId: string): Promise<void> {
  await setStoredValue(ACTIVE_ACCOUNT_ID_KEY, userId);
}

export async function clearActiveStoredAccountId(): Promise<void> {
  await removeStoredValue(ACTIVE_ACCOUNT_ID_KEY);
}
