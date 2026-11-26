// Fond d'une fenêtre (Modal) qui laisse toujours son contenu au-dessus du clavier.
//
// Depuis Expo SDK 55, Android affiche l'application bord à bord : le système ne réduit plus la
// fenêtre quand le clavier s'ouvre, et KeyboardAvoidingView en mode « height » ne fait pas remonter
// une fenêtre calée en bas. Ce composant mesure la partie de la fenêtre recouverte par le clavier
// et ajoute cette marge en bas : le contenu (calé en bas ou centré) remonte d'autant.
// Si le système a déjà réduit la fenêtre, la partie recouverte vaut zéro : pas de double décalage.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardEvent, LayoutChangeEvent, Platform, View, ViewProps } from 'react-native';

type Props = ViewProps & {
  // Reçoit la hauteur recouverte par le clavier (0 quand il est fermé).
  onKeyboardOverlap?: (overlap: number) => void;
};

export function useKeyboardOverlap(onChange?: (overlap: number) => void) {
  const ref = useRef<View>(null);
  const keyboardTop = useRef<number | null>(null);
  const [overlap, setOverlap] = useState(0);

  const apply = useCallback((value: number) => {
    const next = Math.max(0, Math.round(value));
    setOverlap((current) => (current === next ? current : next));
    onChange?.(next);
  }, [onChange]);

  const measure = useCallback((fallbackHeight?: number) => {
    const top = keyboardTop.current;
    if (top === null) {
      apply(0);
      return;
    }
    const node = ref.current;
    if (!node) {
      apply(fallbackHeight || 0);
      return;
    }
    node.measureInWindow((_x, y, _width, height) => {
      if (!height && fallbackHeight) {
        apply(fallbackHeight);
        return;
      }
      apply(y + height - top);
    });
  }, [apply]);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event: KeyboardEvent) => {
      keyboardTop.current = event.endCoordinates.screenY;
      measure(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      keyboardTop.current = null;
      apply(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [apply, measure]);

  // La fenêtre peut changer de taille après l'ouverture du clavier (rotation, système qui la réduit).
  const onLayout = useCallback(() => {
    if (keyboardTop.current !== null) measure();
  }, [measure]);

  return { ref, overlap, onLayout };
}

export default function KeyboardOverlay({ style, children, onLayout, onKeyboardOverlap, ...rest }: Props) {
  const keyboard = useKeyboardOverlap(onKeyboardOverlap);
  const handleLayout = (event: LayoutChangeEvent) => {
    keyboard.onLayout();
    onLayout?.(event);
  };
  return (
    <View
      ref={keyboard.ref}
      collapsable={false}
      style={[style, keyboard.overlap > 0 && { paddingBottom: keyboard.overlap }]}
      onLayout={handleLayout}
      {...rest}
    >
      {children}
    </View>
  );
}
