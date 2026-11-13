import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useGuide, type GuideRect } from './GuideProvider';
import { CHAPTERS, GUIDE_STEPS, STEP_INDEX } from './steps';

const HOLE_PADDING = 6;
const DIM = 'rgba(5, 4, 20, 0.78)';

// Couche du guide : l'une à la racine des onglets, une autre dans chaque fenêtre (modale) qui contient une étape.
export default function GuideHost({ id }: { id: string }) {
  const guide = useGuide();
  const running = Boolean(guide?.running);
  const registerHost = guide?.registerHost;

  useEffect(() => {
    if (!running || !registerHost) return;
    return registerHost(id);
  }, [id, registerHost, running]);

  if (!running || !guide?.step || guide.step.host !== id) return null;
  return <GuideOverlay />;
}

function GuideOverlay() {
  const guide = useGuide()!;
  const step = guide.step!;
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const hostRef = useRef<View>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const hostHeightRef = useRef(H);
  const [rect, setRect] = useState<GuideRect | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [bubbleHeight, setBubbleHeight] = useState(170);
  const [error, setError] = useState<string | null>(null);

  const holeX = useRef(new Animated.Value(W / 2)).current;
  const holeY = useRef(new Animated.Value(H / 2)).current;
  const holeW = useRef(new Animated.Value(0)).current;
  const holeH = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const bubbleIn = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  const hasRectRef = useRef(false);

  const isCard = step.kind === 'card';
  const targetId = guide.targetId;

  // Apparition de la couche, puis animations en boucle (anneau et indicateur de toucher).
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    const pulseLoop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const rippleLoop = Animated.loop(Animated.timing(ripple, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    pulseLoop.start();
    rippleLoop.start();
    return () => { pulseLoop.stop(); rippleLoop.stop(); };
  }, [fade, pulse, ripple]);

  // Bulle : rebond à chaque nouvelle étape.
  useEffect(() => {
    setError(null);
    bubbleIn.setValue(0);
    Animated.spring(bubbleIn, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }).start();
  }, [bubbleIn, step.id]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => setKeyboardHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Mesure régulière de la cible : elle suit le défilement, le clavier et les changements de mise en page.
  useEffect(() => {
    if (isCard || !targetId) { setRect(null); hasRectRef.current = false; return; }
    let cancelled = false;
    const visibleTimer = setTimeout(() => guide.ensureTargetVisible(targetId), 80);
    const tick = async () => {
      let measured = await guide.measureTarget(targetId);
      if (!measured && step.fallbackTarget) measured = await guide.measureTarget(step.fallbackTarget);
      if (cancelled) return;
      if (!measured) { setRect(null); return; }
      // Cible ancrée en bas (onglets) : y négatif compté depuis le bas de la couche.
      const next = measured.y < 0
        ? { x: measured.x, y: hostHeightRef.current + measured.y, width: measured.width, height: measured.height }
        : { x: measured.x - offsetRef.current.x, y: measured.y - offsetRef.current.y, width: measured.width, height: measured.height };
      setRect((current) => (current && Math.abs(current.x - next.x) < 1 && Math.abs(current.y - next.y) < 1
        && Math.abs(current.width - next.width) < 1 && Math.abs(current.height - next.height) < 1 ? current : next));
    };
    void tick();
    const interval = setInterval(tick, 250);
    return () => { cancelled = true; clearTimeout(visibleTimer); clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCard, step.id, targetId]);

  // Le trou lumineux glisse et se redimensionne jusqu'à la nouvelle cible.
  useEffect(() => {
    if (!rect) return;
    const target = {
      x: rect.x - HOLE_PADDING, y: rect.y - HOLE_PADDING,
      w: rect.width + HOLE_PADDING * 2, h: rect.height + HOLE_PADDING * 2,
    };
    if (!hasRectRef.current) {
      hasRectRef.current = true;
      holeX.setValue(target.x + target.w / 2);
      holeY.setValue(target.y + target.h / 2);
      holeW.setValue(0);
      holeH.setValue(0);
    }
    const spring = (value: Animated.Value, toValue: number) => Animated.spring(value, { toValue, friction: 9, tension: 55, useNativeDriver: false });
    Animated.parallel([spring(holeX, target.x), spring(holeY, target.y), spring(holeW, target.w), spring(holeH, target.h)]).start();
  }, [holeH, holeW, holeX, holeY, rect]);

  const shakeBubble = useCallback(() => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0.7, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -0.7, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shake]);

  const onNext = useCallback(() => {
    if (step.kind === 'field') {
      const message = guide.validateField();
      if (message) {
        setError(message);
        shakeBubble();
        return;
      }
    }
    Keyboard.dismiss();
    guide.next();
  }, [guide, shakeBubble, step.kind]);

  // Toucher hors de la zone éclairée : la bulle rappelle la consigne.
  const nudge = useCallback(() => {
    if (step.kind === 'tap' || step.kind === 'field') {
      setError(step.kind === 'tap' ? 'Touchez la zone en surbrillance.' : null);
      shakeBubble();
    }
  }, [shakeBubble, step.kind]);

  const onHostLayout = useCallback((event: any) => {
    hostHeightRef.current = event?.nativeEvent?.layout?.height || H;
    hostRef.current?.measureInWindow((x, y) => { offsetRef.current = { x, y }; });
  }, [H]);

  const blocker = { onStartShouldSetResponder: () => true, onResponderRelease: nudge };
  const holeRight = Animated.add(holeX, holeW);
  const holeBottom = Animated.add(holeY, holeH);
  const showHole = Boolean(rect) && !isCard;

  // Bulle sous la cible si la place le permet, sinon au-dessus ; jamais sous le clavier.
  const bubbleWidth = Math.min(W - 32, 380);
  const visibleBottom = H - keyboardHeight - Math.max(insets.bottom, 12);
  let bubbleTop = H / 2 - bubbleHeight / 2;
  if (rect) {
    const below = rect.y + rect.height + HOLE_PADDING + 14;
    const above = rect.y - HOLE_PADDING - 14 - bubbleHeight;
    bubbleTop = below + bubbleHeight <= visibleBottom ? below : Math.max(insets.top + 64, above);
  }
  const bubbleLeft = rect ? Math.max(16, Math.min(W - bubbleWidth - 16, rect.x + rect.width / 2 - bubbleWidth / 2)) : (W - bubbleWidth) / 2;

  const chapterIndex = CHAPTERS.findIndex((chapter) => chapter.key === step.chapter);
  const progress = useMemo(() => {
    const first = STEP_INDEX.tab_products;
    const last = STEP_INDEX.finish;
    return Math.max(0, Math.min(1, (guide.stepIndex - first) / (last - first)));
  }, [guide.stepIndex]);

  const bubbleBg = isDark ? '#1E1B4B' : '#FFFFFF';

  return (
    <Animated.View ref={hostRef as any} onLayout={onHostLayout} pointerEvents="box-none" style={[StyleSheet.absoluteFill, { opacity: fade, zIndex: 9999, elevation: 9999 }]}>
      {isCard ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: DIM }]} onStartShouldSetResponder={() => true} />
      ) : showHole ? (
        <>
          <Animated.View {...blocker} style={[styles.dim, { left: 0, right: 0, top: 0, height: holeY }]} />
          <Animated.View {...blocker} style={[styles.dim, { left: 0, right: 0, top: holeBottom, bottom: 0 }]} />
          <Animated.View {...blocker} style={[styles.dim, { left: 0, width: holeX, top: holeY, height: holeH }]} />
          <Animated.View {...blocker} style={[styles.dim, { left: holeRight, right: 0, top: holeY, height: holeH }]} />
          {step.kind === 'info' && (
            <Animated.View onStartShouldSetResponder={() => true} style={{ position: 'absolute', left: holeX, top: holeY, width: holeW, height: holeH }} />
          )}
          <Animated.View pointerEvents="none" style={{ position: 'absolute', left: holeX, top: holeY, width: holeW, height: holeH }}>
            <Animated.View
              style={[StyleSheet.absoluteFill, {
                borderRadius: 14, borderWidth: 2, borderColor: colors.primary,
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }),
                transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }],
              }]}
            />
            {step.kind === 'tap' && (
              <View style={styles.rippleCenter}>
                <Animated.View style={[styles.ripple, { borderColor: colors.primary, opacity: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }), transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.9] }) }] }]} />
                <View style={[styles.rippleDot, { backgroundColor: colors.primary }]} />
              </View>
            )}
          </Animated.View>
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: DIM }]} onStartShouldSetResponder={() => true} onResponderRelease={nudge} />
      )}

      {/* Progression : chapitres du guide et sortie de secours. */}
      {!isCard && (
        <View pointerEvents="box-none" style={[styles.topBar, { top: insets.top + 6 }]}>
          <View style={[styles.progressCard, { backgroundColor: bubbleBg, borderColor: colors.glassBorder }]}>
            <View style={styles.chapters}>
              {CHAPTERS.map((chapter, index) => (
                <View key={chapter.key} style={styles.chapterItem}>
                  <Ionicons
                    name={index < chapterIndex ? 'checkmark-circle' : index === chapterIndex ? 'ellipse' : 'ellipse-outline'}
                    size={12}
                    color={index <= chapterIndex ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.chapterLabel, { color: index === chapterIndex ? colors.text : colors.textMuted }]}>{chapter.label}</Text>
                </View>
              ))}
              <TouchableOpacity accessibilityRole="button" onPress={guide.skip} hitSlop={8}>
                <Text style={[styles.skip, { color: colors.textMuted }]}>Passer</Text>
              </TouchableOpacity>
            </View>
            <ProgressBar progress={progress} color={colors.primary} track={colors.glassBorder} />
          </View>
        </View>
      )}

      {isCard ? (
        <GuideCard />
      ) : (
        <Animated.View
          onLayout={(event) => setBubbleHeight(event.nativeEvent.layout.height)}
          style={[styles.bubble, {
            top: bubbleTop, left: bubbleLeft, width: bubbleWidth, backgroundColor: bubbleBg, borderColor: colors.primary,
            opacity: bubbleIn,
            transform: [
              { translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-10, 10] }) },
              { scale: bubbleIn.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
            ],
          }]}
        >
          <Text style={[styles.bubbleTitle, { color: colors.text }]}>{step.title}</Text>
          <Text style={[styles.bubbleBody, { color: colors.textSecondary || colors.textMuted }]}>{step.body}</Text>
          {!!step.action && (
            <View style={styles.actionRow}>
              <Ionicons name="hand-left-outline" size={16} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>{step.action}</Text>
            </View>
          )}
          {!!error && (
            <View style={styles.actionRow}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          )}
          {!rect && !!targetId && (
            <View style={styles.actionRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.bubbleBody, { color: colors.textMuted, marginTop: 0 }]}>Préparation de l’écran…</Text>
            </View>
          )}
          {(step.kind === 'field' || step.kind === 'info') && (
            <TouchableOpacity accessibilityRole="button" onPress={onNext} style={[styles.nextButton, { backgroundColor: colors.primary }]}>
              <Text style={styles.nextText}>{step.nextLabel || 'Suivant'}</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
}

function ProgressBar({ progress, color, track }: { progress: number; color: string; track: string }) {
  const value = useRef(new Animated.Value(progress)).current;
  useEffect(() => {
    Animated.timing(value, { toValue: progress, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [progress, value]);
  return (
    <View style={[styles.progressTrack, { backgroundColor: track }]}>
      <Animated.View style={[styles.progressFill, { backgroundColor: color, width: value.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

// Écrans plein format : bienvenue et fin du guide.
function GuideCard() {
  const guide = useGuide()!;
  const step = guide.step!;
  const { colors, isDark } = useTheme();
  const { width: W } = useWindowDimensions();
  const enter = useRef(new Animated.Value(0)).current;
  const icon = useRef(new Animated.Value(0)).current;
  const items = useRef(CHAPTERS.map(() => new Animated.Value(0))).current;
  const [keepProduct, setKeepProduct] = useState(false);
  const isFinish = step.id === 'finish';

  useEffect(() => {
    enter.setValue(0);
    icon.setValue(0);
    items.forEach((item) => item.setValue(0));
    Animated.sequence([
      Animated.spring(enter, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
      Animated.spring(icon, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
      Animated.stagger(110, items.map((item) => Animated.spring(item, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }))),
    ]).start();
  }, [enter, icon, items, step.id]);

  const cardBg = isDark ? '#1E1B4B' : '#FFFFFF';
  const keepIds = keepProduct && guide.data.productId ? [guide.data.productId] : [];

  return (
    <View pointerEvents="box-none" style={styles.cardWrap}>
      <Animated.View style={[styles.card, {
        width: Math.min(W - 32, 420), backgroundColor: cardBg, borderColor: colors.glassBorder,
        opacity: enter,
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
      }]}
      >
        <Animated.View style={[styles.cardIcon, { backgroundColor: colors.primary + '22', transform: [{ scale: icon }] }]}>
          <Ionicons name={isFinish ? 'trophy' : 'rocket'} size={34} color={colors.primary} />
        </Animated.View>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{step.title}</Text>
        <Text style={[styles.cardBody, { color: colors.textSecondary || colors.textMuted }]}>{step.body}</Text>

        <View style={styles.cardChips}>
          {CHAPTERS.map((chapter, index) => (
            <Animated.View
              key={chapter.key}
              style={[styles.cardChip, {
                borderColor: colors.primary + '55', backgroundColor: colors.primary + (isFinish ? '22' : '11'),
                opacity: items[index],
                transform: [{ scale: items[index].interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
              }]}
            >
              {isFinish && <Ionicons name="checkmark" size={14} color={colors.primary} />}
              <Text style={[styles.cardChipText, { color: colors.text }]}>{chapter.label}</Text>
            </Animated.View>
          ))}
        </View>

        {isFinish ? (
          <>
            {!!guide.data.productName && (
              <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: keepProduct }} onPress={() => setKeepProduct((value) => !value)} style={styles.keepRow}>
                <Ionicons name={keepProduct ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
                <Text style={[styles.keepText, { color: colors.text }]}>
                  Garder « {guide.data.productName} » : c’est un vrai produit de ma boutique.
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              accessibilityRole="button"
              disabled={guide.finishing}
              onPress={() => void guide.finish(keepIds, 'products')}
              style={[styles.cardButton, { backgroundColor: colors.primary, opacity: guide.finishing ? 0.6 : 1 }]}
            >
              {guide.finishing ? <ActivityIndicator color="#fff" /> : <Text style={styles.cardButtonText}>Ajouter mes vrais produits</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={guide.finishing}
              onPress={() => void guide.finish(keepIds, 'help')}
              style={[styles.cardSecondary, { borderColor: colors.primary }]}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
              <Text style={[styles.cardSecondaryText, { color: colors.primary }]}>Je veux de l’aide pour créer mes produits</Text>
            </TouchableOpacity>
            <Text style={[styles.cardHint, { color: colors.textMuted }]}>Notre équipe peut vous aider à tout moment depuis Réglages &gt; Assistance.</Text>
          </>
        ) : (
          <TouchableOpacity accessibilityRole="button" onPress={guide.next} style={[styles.cardButton, { backgroundColor: colors.primary }]}>
            <Text style={styles.cardButtonText}>{step.nextLabel || 'Continuer'}</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

export const GUIDE_STEP_COUNT = GUIDE_STEPS.length;

const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: DIM },
  rippleCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ripple: { position: 'absolute', width: 54, height: 54, borderRadius: 27, borderWidth: 3 },
  rippleDot: { width: 14, height: 14, borderRadius: 7, opacity: 0.9 },
  topBar: { position: 'absolute', left: 12, right: 12 },
  progressCard: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  chapters: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chapterItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chapterLabel: { fontSize: 12, fontWeight: '700' },
  skip: { fontSize: 12, fontWeight: '600', marginLeft: 'auto', textDecorationLine: 'underline' },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  bubble: {
    position: 'absolute', borderRadius: 18, borderWidth: 1.5, padding: 16, gap: 6,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  bubbleTitle: { fontSize: 17, fontWeight: '800' },
  bubbleBody: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6 },
  actionText: { flex: 1, fontSize: 14, fontWeight: '800', lineHeight: 20 },
  errorText: { flex: 1, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  nextButton: { marginTop: 10, alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 18 },
  nextText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  cardWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 24, borderWidth: 1, padding: 24, alignItems: 'center', gap: 12 },
  cardIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  cardBody: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  cardChips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginVertical: 4 },
  cardChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  cardChipText: { fontSize: 13, fontWeight: '700' },
  keepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch', paddingVertical: 6 },
  keepText: { flex: 1, fontSize: 14, lineHeight: 20 },
  cardButton: { alignSelf: 'stretch', alignItems: 'center', borderRadius: 14, paddingVertical: 14, marginTop: 4 },
  cardButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  cardSecondary: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1.5, paddingVertical: 12 },
  cardSecondaryText: { fontSize: 14, fontWeight: '800', flexShrink: 1, textAlign: 'center' },
  cardHint: { fontSize: 12, textAlign: 'center', lineHeight: 17 },
});
