import auth, { type FirebaseAuthTypes } from '@react-native-firebase/auth';
import i18n from './i18n';

const PHONE_AUTH_TIMEOUT_MS = 90_000;
export const PHONE_RESEND_COOLDOWN_MS = 60_000;

type Challenge = { confirmation: FirebaseAuthTypes.ConfirmationResult; sentAt: number };
type Attempt = { scope: string; phone: string; challenge?: Challenge; request?: Promise<Challenge> };
let activeAttempt: Attempt | undefined;
let firebaseOperation: Promise<void> = Promise.resolve();

function runFirebaseOperation<T>(callback: () => Promise<T>): Promise<T> {
  const operation = firebaseOperation.then(callback);
  firebaseOperation = operation.then(() => undefined, () => undefined);
  return operation;
}

function normalizePhoneNumber(phone: string): string {
  const trimmed = phone.trim();
  const withPrefix = trimmed.startsWith('00') ? `+${trimmed.slice(2)}` : trimmed;
  const digits = withPrefix.replace(/[^\d]/g, '');
  if (!digits) {
    throw new Error(i18n.t('auth.verifyPhone.invalidPhone'));
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

export async function sendPhoneVerification(phone: string, scope: string, resend = false): Promise<number> {
  const normalizedPhone = normalizePhoneNumber(phone);
  const current = activeAttempt;
  if (current?.scope === scope && current.phone === normalizedPhone) {
    if (current.request) return (await current.request).sentAt;
    if (current.challenge && (!resend || Date.now() - current.challenge.sentAt < PHONE_RESEND_COOLDOWN_MS)) {
      return current.challenge.sentAt;
    }
  }

  const attempt: Attempt = { scope, phone: normalizedPhone };
  activeAttempt = attempt;
  const request = runFirebaseOperation(async () => {
    if (activeAttempt !== attempt) throw new Error(i18n.t('auth.verifyPhone.sendError'));
    const confirmation = await withTimeout(
      auth().signInWithPhoneNumber(normalizedPhone, resend),
      PHONE_AUTH_TIMEOUT_MS,
      i18n.t('auth.verifyPhone.sendError'),
    );
    if (activeAttempt !== attempt) throw new Error(i18n.t('auth.verifyPhone.sendError'));
    return { confirmation, sentAt: Date.now() };
  });
  attempt.request = request;

  try {
    attempt.challenge = await request;
    return attempt.challenge.sentAt;
  } catch (error) {
    if (activeAttempt === attempt) activeAttempt = undefined;
    throw error;
  } finally {
    attempt.request = undefined;
  }
}

export function confirmPhoneCode(code: string, phone: string, scope: string) {
  const request = activeAttempt;
  return runFirebaseOperation(async () => {
    if (!request?.challenge || activeAttempt !== request || request.scope !== scope || request.phone !== normalizePhoneNumber(phone)) {
      throw new Error(i18n.t('auth.verifyPhone.errorIncorrect'));
    }
    const credential = await request.challenge.confirmation.confirm(code);
    try {
      if (activeAttempt !== request) throw new Error(i18n.t('auth.verifyPhone.errorIncorrect'));
      return await credential.user.getIdToken(true);
    } finally {
      await auth().signOut().catch(() => undefined);
      if (activeAttempt === request) activeAttempt = undefined;
    }
  });
}

export function clearPhoneVerificationState(scope: string) {
  if (activeAttempt?.scope === scope) activeAttempt = undefined;
}
