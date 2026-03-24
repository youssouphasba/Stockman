import type { TFunction } from 'i18next';

export function getStringArray(t: TFunction, key: string): string[] {
  const value = t(key, { returnObjects: true });
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function getObjectArray<T extends Record<string, unknown>>(t: TFunction, key: string): T[] {
  const value = t(key, { returnObjects: true });
  return Array.isArray(value)
    ? value.filter((item): item is T => typeof item === 'object' && item !== null)
    : [];
}
