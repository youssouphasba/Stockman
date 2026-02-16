import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tip, getTipsForRole } from '../constants/tips';

const SEEN_KEY = 'tips_seen_ids';
const CURRENT_KEY = 'tip_current';

type StoredTip = { tipId: string; date: string; dismissed: boolean };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function useDailyTip(role: 'shopkeeper' | 'supplier' | 'staff') {
  const [tip, setTip] = useState<Tip | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTip();
  }, [role]);

  async function loadTip() {
    try {
      const currentRaw = await AsyncStorage.getItem(CURRENT_KEY);
      const current: StoredTip | null = currentRaw ? JSON.parse(currentRaw) : null;
      const roleTips = getTipsForRole(role);

      if (roleTips.length === 0) {
        setLoading(false);
        return;
      }

      // Same day: reuse stored tip
      if (current && current.date === today()) {
        const found = roleTips.find((t) => t.id === current.tipId);
        if (found) {
          setTip(found);
          setIsDismissed(current.dismissed);
          setLoading(false);
          return;
        }
      }

      // New day: pick a new tip
      const seenRaw = await AsyncStorage.getItem(SEEN_KEY);
      let seenIds: string[] = seenRaw ? JSON.parse(seenRaw) : [];

      let unseen = roleTips.filter((t) => !seenIds.includes(t.id));
      if (unseen.length === 0) {
        seenIds = [];
        await AsyncStorage.setItem(SEEN_KEY, '[]');
        unseen = roleTips;
      }

      const picked = unseen[Math.floor(Math.random() * unseen.length)];
      setTip(picked);
      setIsDismissed(false);

      seenIds.push(picked.id);
      await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(seenIds));
      await AsyncStorage.setItem(
        CURRENT_KEY,
        JSON.stringify({ tipId: picked.id, date: today(), dismissed: false })
      );
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function dismissTip() {
    setIsDismissed(true);
    try {
      const currentRaw = await AsyncStorage.getItem(CURRENT_KEY);
      if (currentRaw) {
        const current: StoredTip = JSON.parse(currentRaw);
        current.dismissed = true;
        await AsyncStorage.setItem(CURRENT_KEY, JSON.stringify(current));
      }
    } catch {
      // silently fail
    }
  }

  return { tip, dismissTip, isDismissed, loading };
}
