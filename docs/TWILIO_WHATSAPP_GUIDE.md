# 📲 Guide de Configuration WhatsApp Twilio — Stockman

Ce guide explique comment configurer votre compte Twilio pour envoyer des OTP par WhatsApp en mode production (hors bac à sable).

---

## 1. Création du Template (Modèle)
WhatsApp impose des templates pour les messages initiés par l'entreprise (OTPs).

1. Connectez-vous à la [Console Twilio](https://console.twilio.com).
2. Allez dans **Messaging** > **Content Editor** > **Create New Content**.
3. Choisissez le type **Authentication** (ou Marketing/Utility si Authentication n'est pas disponible, mais Authentication est optimisé pour les codes).
4. **Nom du template** : `stockman_otp`
5. **Langue** : Français (fr)
6. **Corps du message** : 
   `Votre code de vérification Stockman est : {{1}}`
7. **Bouton (Optionnel)** : Vous pouvez ajouter un bouton "Copy Code" (bouton de type `OTP`).

---

## 2. Soumission pour Validation
1. Une fois créé, cliquez sur **Submit for Approval**.
2. Twilio va envoyer ce template à Meta (WhatsApp).
3. **Délai** : Généralement entre 1 et 24 heures. Le statut passera de `Pending` à `Approved`.

---

## 3. Liaison avec votre Numéro
1. Allez dans **Messaging** > **Senders** > **WhatsApp Senders**.
2. Assurez-vous que votre numéro de téléphone (ou le numéro Sandbox pour les tests) est bien configuré.
3. Pour la production, vous devez avoir un compte WhatsApp Business (WABA) validé.

---

## 4. Mise à jour du Code (Backend)
Une fois le template approuvé, vous devrez mettre à jour la variable `message_body` dans `backend/services/twilio_service.py` pour qu'elle corresponde **EXACTEMENT** au texte du template validé.

> [!IMPORTANT]
> Si le texte dans le code et le texte du template diffèrent même d'une espace, WhatsApp bloque l'envoi.

```python
# Exemple dans twilio_service.py (après approbation)
message_body = f"Votre code de vérification Stockman est : {otp}"
```

---

## 5. Mode Sandbox (Pour tester SANS template approuvé)
Si vous n'avez pas encore de template approuvé, vous pouvez utiliser le **Twilio Sandbox** :
1. Allez dans **Messaging** > **Try it Out** > **Send a WhatsApp Message**.
2. Envoyez le message `join <your-keyword>` (affiché sur la page) au numéro Twilio spécifié depuis votre propre WhatsApp.
3. Une fois relié, vous recevrez n'importe quel message (même sans template) pendant 24 heures.
