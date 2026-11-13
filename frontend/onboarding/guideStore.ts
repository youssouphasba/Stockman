import { useSyncExternalStore } from 'react';
import { DeviceEventEmitter } from 'react-native';

// État global minimal du guide de démarrage, lisible hors de React
// (guides d'écran, propositions, alertes de succès) pour ne rien afficher par-dessus le guide.
// « loading » tant que l'état serveur n'est pas connu : les guides d'écran attendent.
export type GuideRunState = 'idle' | 'loading' | 'running';

let runState: GuideRunState = 'idle';
const listeners = new Set<(state: GuideRunState) => void>();

export function getGuideRunState(): GuideRunState {
  return runState;
}

export function isGuideBlocking(): boolean {
  return runState !== 'idle';
}

export function setGuideRunState(next: GuideRunState) {
  if (next === runState) return;
  runState = next;
  listeners.forEach((listener) => listener(next));
}

export function subscribeGuideRunState(listener: (state: GuideRunState) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useGuideRunState(): GuideRunState {
  return useSyncExternalStore(subscribeGuideRunState, getGuideRunState, getGuideRunState);
}

// Les écrans signalent leurs événements (produit créé, vente encaissée…) sans dépendre du guide.
export const GUIDE_SIGNAL_EVENT = 'onboarding:signal';
export const GUIDE_COMMAND_EVENT = 'onboarding:command';

export function guideSignal(name: string, payload?: Record<string, any>) {
  if (runState !== 'running') return;
  DeviceEventEmitter.emit(GUIDE_SIGNAL_EVENT, { name, payload: payload || {} });
}

// Commandes du guide vers les écrans : défiler jusqu'à une section, fermer une fenêtre.
export type GuideCommand = { name: 'scroll'; section: string } | { name: 'close-modals' };

export function sendGuideCommand(command: GuideCommand) {
  DeviceEventEmitter.emit(GUIDE_COMMAND_EVENT, command);
}
