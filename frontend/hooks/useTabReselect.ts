import { RefObject, useCallback, useEffect, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useNavigation } from 'expo-router';

type ScrollableList = {
  scrollTo?: (options: { x?: number; y?: number; animated?: boolean }) => void;
  scrollToOffset?: (options: { offset: number; animated?: boolean }) => void;
};

// Au-delà de ce décalage, l'écran est considéré comme descendu.
const TOP_TOLERANCE = 8;

/**
 * Réappui sur l'onglet déjà ouvert : remonte en haut si l'écran est descendu,
 * sinon recharge les données comme un glissement vers le bas.
 * Renvoie le gestionnaire à passer à `onScroll` de la liste principale.
 */
export function useTabReselect(scrollRef: RefObject<ScrollableList | null>, onRefresh?: () => void) {
  const navigation = useNavigation();
  const offsetRef = useRef(0);
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  useEffect(() => {
    return (navigation as any).addListener('tabPress', () => {
      if (!navigation.isFocused()) return;
      const list = scrollRef.current;
      if (offsetRef.current > TOP_TOLERANCE) {
        if (list?.scrollToOffset) list.scrollToOffset({ offset: 0, animated: true });
        else list?.scrollTo?.({ y: 0, animated: true });
        offsetRef.current = 0;
        return;
      }
      refreshRef.current?.();
    });
  }, [navigation, scrollRef]);

  return useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetRef.current = event.nativeEvent.contentOffset.y;
  }, []);
}
