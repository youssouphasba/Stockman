import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isGuideBlocking, subscribeGuideRunState } from '../onboarding/guideStore';

const PREFIX = 'guide_seen_';

export function useFirstVisit(screenKey: string) {
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [isReady, setIsReady] = useState(false);
  // Pendant le guide de démarrage (ou tant que son état est inconnu), aucun guide d'écran ne s'ouvre seul.
  const [guideBlocking, setGuideBlocking] = useState(isGuideBlocking());

  useEffect(() => {
    // L'état a pu changer entre le rendu et l'abonnement (le guide démarre dans un composant enfant).
    setGuideBlocking(isGuideBlocking());
    return subscribeGuideRunState(() => setGuideBlocking(isGuideBlocking()));
  }, []);

  useEffect(() => {
    let isMounted = true;

    setIsReady(false);
    setIsFirstVisit(false);
    // On relit le stockage une fois le guide terminé : il a pu marquer ces présentations comme vues.
    if (guideBlocking) return () => { isMounted = false; };

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
  }, [screenKey, guideBlocking]);

  const markSeen = useCallback(() => {
    setIsFirstVisit(false);
    setIsReady(true);
    AsyncStorage.setItem(PREFIX + screenKey, '1').catch(() => null);
  }, [screenKey]);

  return { isFirstVisit: isFirstVisit && !guideBlocking, isReady: isReady && !guideBlocking, markSeen };
}
