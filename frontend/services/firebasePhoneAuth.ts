import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

let confirmationResult: FirebaseAuthTypes.ConfirmationResult | null = null;

function normalizePhoneNumber(phone: string): string {
  const trimmed = phone.trim();
  const withPrefix = trimmed.startsWith('00') ? `+${trimmed.slice(2)}` : trimmed;
  const digits = withPrefix.replace(/[^\d]/g, '');
  if (!digits) {
    throw new Error('Numero de telephone invalide');
  }
  return `+${digits}`;
}

export async function sendPhoneVerification(phone: string) {
  const normalizedPhone = normalizePhoneNumber(phone);
  confirmationResult = await auth().signInWithPhoneNumber(normalizedPhone);
  return confirmationResult;
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
