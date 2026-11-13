import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { onboardingGuide } from '../services/api';
import ContactSupportModal from '../components/ContactSupportModal';
import { GUIDE_STEPS, STEP_INDEX, resolveTarget, type GuideContextData, type GuideStep } from './steps';
import { GUIDE_SIGNAL_EVENT, sendGuideCommand, setGuideRunState } from './guideStore';

export type GuideRect = { x: number; y: number; width: number; height: number };

type TargetEntry = {
  measure: () => Promise<GuideRect | null>;
  getValue?: () => string;
  ensureVisible?: () => void;
};

type GuideContextValue = {
  running: boolean;
  step: GuideStep | null;
  stepIndex: number;
  data: GuideContextData;
  targetId?: string;
  registerTarget: (id: string, entry: TargetEntry) => () => void;
  registerHost: (id: string) => () => void;
  setStaticTarget: (id: string, rect: GuideRect | null) => void;
  measureTarget: (id: string) => Promise<GuideRect | null>;
  ensureTargetVisible: (id: string) => void;
  hasTarget: (id: string) => boolean;
  next: () => void;
  validateField: () => string | null;
  finish: (keepProductIds: string[], then?: 'products' | 'help') => Promise<void>;
  skip: () => void;
  finishing: boolean;
};

const GuideContext = createContext<GuideContextValue | null>(null);

export function useGuide() {
  return useContext(GuideContext);
}

const ctxStorageKey = (userId: string) => `onboarding_guide_ctx_${userId}`;

// Après le guide, les présentations d'écran qu'il remplace ne s'ouvrent plus d'elles-mêmes.
const SCREEN_GUIDES_COVERED = ['navigation', 'dashboard', 'products', 'orders', 'alerts'];
const markScreenGuidesSeen = () => AsyncStorage
  .multiSet(SCREEN_GUIDES_COVERED.map((key) => [`guide_seen_${key}`, '1'] as [string, string]))
  .catch(() => null);

type Props = {
  children: React.ReactNode;
  userId?: string;
  // Propriétaire d'un commerce (hors restaurant) : seuls ces comptes peuvent suivre le guide.
  canRun: boolean;
  currentRoute: string;
};

export default function GuideProvider({ children, userId, canRun, currentRoute }: Props) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<GuideContextData>({});
  const [mountVersion, setMountVersion] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const targetsRef = useRef(new Map<string, TargetEntry>());
  const staticTargetsRef = useRef(new Map<string, GuideRect>());
  const hostsRef = useRef(new Map<string, number>());
  const seenHostsRef = useRef(new Set<string>());
  const bumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = running ? GUIDE_STEPS[stepIndex] || null : null;
  const targetId = step ? resolveTarget(step, data) : undefined;

  const bump = useCallback(() => {
    if (bumpTimer.current) return;
    bumpTimer.current = setTimeout(() => {
      bumpTimer.current = null;
      setMountVersion((value) => value + 1);
    }, 60);
  }, []);

  // ---- Démarrage : état serveur, reprise et contexte conservé sur l'appareil ----
  useEffect(() => {
    let cancelled = false;
    if (!userId || !canRun) {
      setGuideRunState('idle');
      setRunning(false);
      return;
    }
    setGuideRunState('loading');
    (async () => {
      try {
        const state = await onboardingGuide.get();
        if (cancelled) return;
        if (!state?.eligible) {
          setGuideRunState('idle');
          return;
        }
        const started = state.status === 'pending' ? await onboardingGuide.start() : state;
        if (cancelled) return;
        const saved = await AsyncStorage.getItem(ctxStorageKey(userId)).catch(() => null);
        if (saved) {
          try { setData(JSON.parse(saved)); } catch { /* contexte illisible : on repart sans */ }
        }
        const savedStep = GUIDE_STEPS[STEP_INDEX[started?.step || 'welcome'] ?? 0];
        const resumeId = savedStep?.resumeAt || savedStep?.id || 'welcome';
        setStepIndex(STEP_INDEX[resumeId] ?? 0);
        setRunning(true);
        setGuideRunState('running');
      } catch {
        // Hors connexion ou serveur indisponible : l'application reste utilisable, le guide sera proposé plus tard.
        if (!cancelled) setGuideRunState('idle');
      }
    })();
    return () => { cancelled = true; };
  }, [userId, canRun]);

  useEffect(() => () => { setGuideRunState('idle'); }, []);

  useEffect(() => {
    if (!userId || !running) return;
    AsyncStorage.setItem(ctxStorageKey(userId), JSON.stringify(data)).catch(() => null);
  }, [data, running, userId]);

  // ---- Registres des cibles et des fenêtres ----
  const registerTarget = useCallback((id: string, entry: TargetEntry) => {
    targetsRef.current.set(id, entry);
    bump();
    return () => {
      if (targetsRef.current.get(id) === entry) targetsRef.current.delete(id);
      bump();
    };
  }, [bump]);

  const registerHost = useCallback((id: string) => {
    hostsRef.current.set(id, (hostsRef.current.get(id) || 0) + 1);
    seenHostsRef.current.add(id);
    bump();
    return () => {
      const count = (hostsRef.current.get(id) || 1) - 1;
      if (count <= 0) hostsRef.current.delete(id); else hostsRef.current.set(id, count);
      bump();
    };
  }, [bump]);

  const setStaticTarget = useCallback((id: string, rect: GuideRect | null) => {
    const previous = staticTargetsRef.current.get(id);
    if (rect) staticTargetsRef.current.set(id, rect); else staticTargetsRef.current.delete(id);
    if (!previous !== !rect) bump();
  }, [bump]);

  const hasTarget = useCallback((id: string) => targetsRef.current.has(id) || staticTargetsRef.current.has(id), []);
  const hasHost = useCallback((id: string) => hostsRef.current.has(id), []);

  const measureTarget = useCallback(async (id: string) => {
    const fixed = staticTargetsRef.current.get(id);
    if (fixed) return fixed;
    const entry = targetsRef.current.get(id);
    return entry ? entry.measure() : null;
  }, []);

  const ensureTargetVisible = useCallback((id: string) => {
    targetsRef.current.get(id)?.ensureVisible?.();
  }, []);

  // ---- Navigation entre étapes ----
  const goTo = useCallback((index: number) => {
    const bounded = Math.max(0, Math.min(GUIDE_STEPS.length - 1, index));
    setStepIndex(bounded);
    const id = GUIDE_STEPS[bounded]?.id;
    if (id) onboardingGuide.progress(id).catch(() => null);
  }, []);

  const next = useCallback(() => goTo(stepIndex + 1), [goTo, stepIndex]);

  const validateField = useCallback(() => {
    if (!step?.validate || !targetId) return null;
    const value = targetsRef.current.get(targetId)?.getValue?.() ?? '';
    return step.validate(value, data);
  }, [data, step, targetId]);

  // À l'entrée d'une étape : bon écran, défilement jusqu'à la section, fenêtres fermées avant la fin.
  useEffect(() => {
    if (!step) return;
    if (step.route && step.route !== currentRoute && step.host === 'root') {
      router.navigate(`/(tabs)/${step.route}` as any);
    }
    if (step.id === 'finish') sendGuideCommand({ name: 'close-modals' });
    if (step.scrollTo) {
      const timer = setTimeout(() => sendGuideCommand({ name: 'scroll', section: step.scrollTo! }), 350);
      return () => clearTimeout(timer);
    }
    // Les dépendances limitées à l'étape sont voulues : on ne force l'écran qu'à l'entrée.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id]);

  // Sortie de l'écran de l'étape (bouton retour du téléphone) : on y revient.
  useEffect(() => {
    if (!step || step.kind === 'card' || step.host !== 'root' || !step.route) return;
    if (currentRoute === step.route) return;
    const timer = setTimeout(() => router.navigate(`/(tabs)/${step.route}` as any), 400);
    return () => clearTimeout(timer);
  }, [currentRoute, router, step]);

  // Signaux des écrans (produit créé, vente encaissée…).
  useEffect(() => {
    if (!running) return;
    const sub = DeviceEventEmitter.addListener(GUIDE_SIGNAL_EVENT, ({ name, payload }: { name: string; payload: Record<string, any> }) => {
      if (name === 'product.created' && payload?.product_id) {
        setData((current) => (current.productId ? current : { ...current, productId: payload.product_id, productName: payload.name }));
      }
      if (name === 'customer.created' && payload?.customer_id) {
        setData((current) => ({ ...current, customerId: payload.customer_id }));
      }
      if (step?.advanceOn?.signal === name) next();
    });
    return () => sub.remove();
  }, [next, running, step]);

  // Conditions d'avancement liées à l'écran affiché, aux cibles et aux fenêtres.
  useEffect(() => {
    if (!step) return;
    const advance = step.advanceOn;
    if (!advance) return;
    if (advance.route && advance.route === currentRoute) { next(); return; }
    if (advance.targetMounted && hasTarget(advance.targetMounted)) { next(); return; }
    if (advance.hostMounted && hasHost(advance.hostMounted)) { next(); return; }
    if (advance.hostClosed && !hasHost(advance.hostClosed)) { next(); }
  }, [currentRoute, hasHost, hasTarget, mountVersion, next, step]);

  // Fenêtre ou menu refermé en cours d'étape : retour à l'étape qui l'ouvre.
  useEffect(() => {
    if (!step?.requires || !step.fallbackStep) return;
    const required = step.requires;
    const present = () => hasHost(required) || hasTarget(required);
    if (present()) return;
    const timer = setTimeout(() => {
      if (!present()) goTo(STEP_INDEX[step.fallbackStep!] ?? stepIndex);
    }, 700);
    return () => clearTimeout(timer);
  }, [goTo, hasHost, hasTarget, mountVersion, step, stepIndex]);

  // Étape facultative dont la cible n'existe pas pour ce compte : on la saute.
  useEffect(() => {
    if (!step?.optional || !targetId) return;
    if (hasTarget(targetId)) return;
    const timer = setTimeout(() => {
      if (!hasTarget(targetId)) next();
    }, 1200);
    return () => clearTimeout(timer);
  }, [hasTarget, mountVersion, next, step, targetId]);

  const finish = useCallback(async (keepProductIds: string[], then?: 'products' | 'help') => {
    setFinishing(true);
    try {
      await onboardingGuide.finish('completed', keepProductIds);
      if (userId) AsyncStorage.removeItem(ctxStorageKey(userId)).catch(() => null);
      await markScreenGuidesSeen();
      setRunning(false);
      setGuideRunState('idle');
      DeviceEventEmitter.emit('onboarding:finished');
      router.navigate('/(tabs)/products' as any);
      if (then === 'help') setTimeout(() => setHelpOpen(true), 400);
    } catch (error: any) {
      Alert.alert('Connexion impossible', error?.message || 'Vérifiez votre connexion puis réessayez.');
    } finally {
      setFinishing(false);
    }
  }, [router, userId]);

  const skip = useCallback(() => {
    Alert.alert(
      'Quitter le guide ?',
      'Les données créées pendant le guide seront supprimées. Vous pourrez retrouver l’aide dans Réglages > Assistance.',
      [
        { text: 'Continuer le guide', style: 'cancel' },
        {
          text: 'Quitter',
          style: 'destructive',
          onPress: async () => {
            try {
              await onboardingGuide.finish('skipped');
              if (userId) AsyncStorage.removeItem(ctxStorageKey(userId)).catch(() => null);
              await markScreenGuidesSeen();
              setRunning(false);
              setGuideRunState('idle');
              DeviceEventEmitter.emit('onboarding:finished');
            } catch (error: any) {
              Alert.alert('Connexion impossible', error?.message || 'Vérifiez votre connexion puis réessayez.');
            }
          },
        },
      ],
    );
  }, [userId]);

  const value = useMemo<GuideContextValue>(() => ({
    running, step, stepIndex, data, targetId,
    registerTarget, registerHost, setStaticTarget, measureTarget, ensureTargetVisible, hasTarget,
    next, validateField, finish, skip, finishing,
  }), [running, step, stepIndex, data, targetId, registerTarget, registerHost, setStaticTarget, measureTarget,
    ensureTargetVisible, hasTarget, next, validateField, finish, skip, finishing]);

  return (
    <GuideContext.Provider value={value}>
      {children}
      {helpOpen && (
        <ContactSupportModal
          visible={helpOpen}
          onClose={() => setHelpOpen(false)}
          initialSubject="Aide à la création de mes produits"
          initialMessage="Bonjour, je viens de terminer le guide de démarrage et j'aimerais de l'aide pour créer mes produits. Nombre de produits environ : … J'ai une liste ou un fichier : oui / non."
          metadata={{ type: 'Aide à la création des produits', support_surface: 'onboarding_guide' }}
        />
      )}
    </GuideContext.Provider>
  );
}
