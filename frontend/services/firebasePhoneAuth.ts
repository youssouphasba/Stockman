import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

let confirmationResult: FirebaseAuthTypes.ConfirmationResult | null = null;

const PHONE_AUTH_TIMEOUT_MS = 90_000; // 90 seconds

function normalizePhoneNumber(phone: string): string {
  const trimmed = phone.trim();
  const withPrefix = trimmed.startsWith('00') ? `+${trimmed.slice(2)}` : trimmed;
  const digits = withPrefix.replace(/[^\d]/g, '');
  if (!digits) {
    throw new Error('Numero de telephone invalide');
  }
  return `+${digits}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((result) => { clearTimeout(timer); resolve(result); })
      .catch((err) => { clearTimeout(timer); reject(err); });
  });
}

let _sendInProgress = false;

export async function sendPhoneVerification(phone: string) {
  if (_sendInProgress) {
    throw new Error('Une verification est deja en cours. Veuillez patienter.');
  }
  _sendInProgress = true;
  try {
    const normalizedPhone = normalizePhoneNumber(phone);
    confirmationResult = await withTimeout(
      auth().signInWithPhoneNumber(normalizedPhone),
      PHONE_AUTH_TIMEOUT_MS,
      'La verification par telephone a expire. Verifiez votre connexion et reessayez.',
    );
    return confirmationResult;
  } finally {
    _sendInProgress = false;
  }
}

export async function resendPhoneVerification(phone: string) {
  return sendPhoneVerification(phone);
}

export async function confirmPhoneCode(code: string) {
  if (!confirmationResult) {
    throw new Error("La verification telephone n'est pas initialisee");
  }

  const credential = await confirmationResult.confirm(code);
  const idToken = await credential.user.getIdToken(true);
  await auth().signOut().catch(() => undefined);
  confirmationResult = null;
  return idToken;
}

export function clearPhoneVerificationState() {
  confirmationResult = null;
}
