import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'guide_seen_';

export function useFirstVisit(screenKey: string) {
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PREFIX + screenKey).then((val) => {
      if (!val) setIsFirstVisit(true);
    });
  }, [screenKey]);

  function markSeen() {
    setIsFirstVisit(false);
    AsyncStorage.setItem(PREFIX + screenKey, '1');
  }

  return { isFirstVisit, markSeen };
}
