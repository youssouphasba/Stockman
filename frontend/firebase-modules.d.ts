declare module '@react-native-firebase/app';

declare module '@react-native-firebase/auth' {
  namespace FirebaseAuthTypes {
    interface AuthCredential {}

    interface AuthProvider {
      credential(idToken?: string | null, accessToken?: string | null): AuthCredential;
    }

    interface User {
      getIdToken(forceRefresh?: boolean): Promise<string>;
    }

    interface UserCredential {
      user: User;
    }

    interface ConfirmationResult {
      confirm(code: string): Promise<UserCredential>;
    }
  }

  export { FirebaseAuthTypes };

  const firebaseAuth: (() => {
    signInWithPhoneNumber(phoneNumber: string): Promise<FirebaseAuthTypes.ConfirmationResult>;
    signInWithCredential(credential: FirebaseAuthTypes.AuthCredential): Promise<FirebaseAuthTypes.UserCredential>;
    signOut(): Promise<void>;
  }) & {
    GoogleAuthProvider: FirebaseAuthTypes.AuthProvider;
  };

  export default firebaseAuth;
}
