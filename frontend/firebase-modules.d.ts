declare module '@react-native-firebase/app';

declare module '@react-native-firebase/auth' {
  namespace FirebaseAuthTypes {
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

  const firebaseAuth: () => {
    signInWithPhoneNumber(phoneNumber: string): Promise<FirebaseAuthTypes.ConfirmationResult>;
    signOut(): Promise<void>;
  };

  export default firebaseAuth;
}
