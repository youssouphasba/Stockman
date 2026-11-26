// Ouverture de la fenêtre « Reprendre mes données » depuis un autre écran (fin du guide de démarrage).
// La demande reste en attente si l'écran Produits n'est pas encore affiché.
import { DeviceEventEmitter } from 'react-native';

const EVENT = 'data-migration:open';
let pending = false;

export function requestDataMigration() {
  pending = true;
  DeviceEventEmitter.emit(EVENT);
}

export function subscribeDataMigration(open: () => void) {
  if (pending) {
    pending = false;
    open();
  }
  const subscription = DeviceEventEmitter.addListener(EVENT, () => {
    pending = false;
    open();
  });
  return () => subscription.remove();
}
