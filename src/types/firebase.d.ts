declare module "firebase/auth" {
  export const getAuth: (...args: any[]) => any;
  export const GoogleAuthProvider: new (...args: any[]) => any;
  export const signInWithPopup: (...args: any[]) => Promise<any>;
}

declare module "firebase/firestore" {
  export const getFirestore: (...args: any[]) => any;
}
