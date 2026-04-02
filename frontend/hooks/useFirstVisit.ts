import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'guide_seen_';

export function useFirstVisit(screenKey: string) {
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    setIsReady(false);
    setIsFirstVisit(false);

    AsyncStorage.getItem(PREFIX + screenKey)
      .then((val) => {
        if (!isMounted) return;
        setIsFirstVisit(!val);
      })
      .finally(() => {
        if (isMounted) setIsReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, [screenKey]);

  const markSeen = useCallback(() => {
    setIsFirstVisit(false);
    setIsReady(true);
    AsyncStorage.setItem(PREFIX + screenKey, '1').catch(() => null);
  }, [screenKey]);

  return { isFirstVisit, isReady, markSeen };
}
