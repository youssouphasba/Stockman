// Création d'un compte Denkma Pro depuis Stockman : mêmes règles que Denkma, vérifiées avant
// d'envoyer le SMS, pour que le commerçant corrige tout en une fois.

// Précision maximale acceptée par Denkma pour un point de collecte localisé par GPS.
export const MAX_PICKUP_ACCURACY_M = 60;

export type DenkmaSignupForm = {
  businessName: string;
  ownerName: string;
  phone: string;
  pin: string;
  pinConfirmation: string;
  label: string;
  city: string;
  accuracy: number | null;
  located: boolean;
  acceptedLegal: boolean;
};

// Numéro au format Denkma (Sénégal ou France), sinon null. Copie de la règle du serveur.
export function denkmaPhone(value: string | null | undefined): string | null {
  const raw = (value || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  let number = digits;
  if (raw.startsWith('+')) number = digits;
  else if (digits.startsWith('00')) number = digits.slice(2);
  else if (digits.length === 9 && '73'.includes(digits[0])) number = `221${digits}`;
  else if (digits.length === 10 && (digits.startsWith('06') || digits.startsWith('07'))) number = `33${digits.slice(1)}`;
  if ((number.length === 12 && number.startsWith('221')) || (number.length === 11 && number.startsWith('33'))) return `+${number}`;
  return null;
}

export function accuracyProblem(accuracy: number | null): string | null {
  if (accuracy == null || accuracy <= MAX_PICKUP_ACCURACY_M) return null;
  return `Position trop imprécise (± ${Math.round(accuracy)} m). Placez-vous à l'extérieur ou près d'une fenêtre, puis relocalisez-vous.`;
}

// Premier point à corriger, ou null quand le formulaire peut partir.
export function signupProblem(form: DenkmaSignupForm): string | null {
  if (form.businessName.trim().length < 2) return 'Indiquez le nom de votre commerce.';
  if (form.ownerName.trim().length < 2) return 'Indiquez le nom du responsable.';
  if (!denkmaPhone(form.phone)) return 'Denkma Pro est disponible avec un numéro du Sénégal ou de France.';
  if (!form.located) return 'Enregistrez la position de votre point de collecte.';
  const accuracy = accuracyProblem(form.accuracy);
  if (accuracy) return accuracy;
  if (form.label.trim().length < 2) return 'Décrivez le point de collecte (rue, repère) pour le livreur.';
  if (form.city.trim().length < 2) return 'Indiquez la ville du point de collecte.';
  if (!/^\d{4,12}$/.test(form.pin)) return 'Choisissez un code PIN de 4 à 12 chiffres.';
  if (form.pin !== form.pinConfirmation) return 'Les deux codes PIN ne sont pas identiques.';
  if (!form.acceptedLegal) return 'Acceptez les conditions de Denkma pour créer votre compte.';
  return null;
}
