import React, { useCallback, useEffect, useRef } from 'react';
import { findNodeHandle, View, type StyleProp, type ViewStyle } from 'react-native';
import { useGuide, type GuideRect } from './GuideProvider';

type Props = {
  id: string;
  // Second identifiant pour la même cible (ex. « premier produit de la liste »).
  alias?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  // Valeur du champ, lue par le guide pour vérifier la saisie.
  value?: string;
  // Défilement qui contient la cible, pour l'amener à l'écran.
  scrollRef?: React.RefObject<any>;
};

// Repère un élément de l'écran pour le guide de démarrage. Sans guide en cours, il ne fait rien de plus qu'une View.
export default function GuideTarget({ id, alias, children, style, value, scrollRef }: Props) {
  const guide = useGuide();
  const viewRef = useRef<View>(null);
  const valueRef = useRef(value ?? '');
  valueRef.current = value ?? '';
  const running = Boolean(guide?.running);
  const registerTarget = guide?.registerTarget;

  const measure = useCallback(() => new Promise<GuideRect | null>((resolve) => {
    const node = viewRef.current;
    if (!node) { resolve(null); return; }
    node.measureInWindow((x, y, width, height) => {
      // Coordonnées de la fenêtre : la couche du guide retire sa propre position.
      resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
    });
  }), []);

  const ensureVisible = useCallback(() => {
    const scroll = scrollRef?.current;
    const node = viewRef.current;
    if (!scroll || !node) return;
    const scrollNode = findNodeHandle(scroll);
    if (!scrollNode) return;
    try {
      node.measureLayout(scrollNode as any, (_x, y) => {
        scroll.scrollTo?.({ y: Math.max(0, y - 140), animated: true });
      }, () => null);
    } catch { /* défilement indisponible : la cible reste mesurée telle quelle */ }
  }, [scrollRef]);

  useEffect(() => {
    if (!running || !registerTarget) return;
    const entry = { measure, getValue: () => valueRef.current, ensureVisible };
    const unregister = registerTarget(id, entry);
    const unregisterAlias = alias ? registerTarget(alias, entry) : null;
    return () => { unregister(); unregisterAlias?.(); };
  }, [alias, ensureVisible, id, measure, registerTarget, running]);

  return (
    <View ref={viewRef} collapsable={false} style={style}>
      {children}
    </View>
  );
}

// Variante sans élément ajouté : repère une View existante par sa référence (mise en page inchangée).
export function useGuideTargetRef(id: string, ref: React.RefObject<View | null>) {
  const guide = useGuide();
  const running = Boolean(guide?.running);
  const registerTarget = guide?.registerTarget;

  useEffect(() => {
    if (!running || !registerTarget) return;
    return registerTarget(id, {
      measure: () => new Promise<GuideRect | null>((resolve) => {
        const node = ref.current;
        if (!node) { resolve(null); return; }
        node.measureInWindow((x, y, width, height) => resolve(width > 0 && height > 0 ? { x, y, width, height } : null));
      }),
    });
  }, [id, ref, registerTarget, running]);
}
