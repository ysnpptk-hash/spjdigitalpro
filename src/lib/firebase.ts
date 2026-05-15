import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signOut, 
  sendPasswordResetEmail, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { getFirestore, doc, getDoc, getDocFromServer, collection, query, where, getDocs } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Test connection
const testConnection = async () => {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error.message?.includes('offline')) {
      console.error("Firebase is offline or configuration is invalid.");
    }
  }
};
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const isUserAuthorized = async (identifier: string) => {
  if (!identifier) return null;
  const cleanId = identifier.trim().toLowerCase();
  
  // Try email first (direct lookup)
  if (identifier.includes('@')) {
    try {
      const userDoc = await getDoc(doc(db, 'authorized_users', cleanId));
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() };
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `authorized_users/${cleanId}`);
    }
  }

  // Use username mapping for resolution
  try {
    const mappingDoc = await getDoc(doc(db, 'usernames', cleanId));
    if (mappingDoc.exists()) {
      const { email } = mappingDoc.data();
      const userDoc = await getDoc(doc(db, 'authorized_users', email.toLowerCase()));
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() };
      }
    }
    
    // Fallback if mapping missing (only for logged in users or superadmin bootstrap)
    const q = query(collection(db, 'authorized_users'), where('username', '==', identifier.trim()));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    // If it's a permission error during unauthenticated lookup, we know we can't use the fallback query
    return null;
  }
};

export const loginWithEmailPassword = async (identifier: string, pass: string) => {
  const input = identifier.trim();
  let email = input.toLowerCase();
  let dbUser: any = null;

  // 1. Resolve identifier to email if it's a username
  if (!input.includes('@')) {
    dbUser = await isUserAuthorized(input);
    if (dbUser && dbUser.email) {
      email = dbUser.email.toLowerCase();
    } else if (input === 'superadmin') {
      email = "ysn.pptk@gmail.com";
    } else {
      throw new Error("Username tidak ditemukan.");
    }
  } else {
    email = input.toLowerCase();
  }
  
  try {
    // 2. Try real Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    if (!dbUser) {
      dbUser = await isUserAuthorized(email);
    }
    
    if (!dbUser && email !== "ysn.pptk@gmail.com") {
      await logout();
      throw new Error("Akun terdaftar di Auth tapi tidak diizinkan di sistem ini.");
    }
    
    return dbUser || { email: email, role: 'Super Admin', nama: 'Super Admin' };
  } catch (error: any) {
    if (error.code === 'auth/operation-not-allowed') {
      const projectId = firebaseConfig.projectId;
      throw new Error(`PENTING: Metode login Email/Password belum diaktifkan di Firebase Console. 

Langkah Aktivasi:
1. Klik link ini: https://console.firebase.google.com/project/${projectId}/authentication/providers
2. Klik "Add new provider"
3. Pilih "Email/Password"
4. Aktifkan (Toggle Enable) dan simpan.

Setelah itu, Anda bisa login dengan ysn.pptk@gmail.com / 123.`);
    }

    // 3. Fallback: Check if user exists in our DB but not in Auth yet
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
      if (!dbUser) {
        dbUser = await isUserAuthorized(email);
      }
      
      if (dbUser && (dbUser as any).password === pass) {
        // Auto-register in Firebase Auth using the DB password
        try {
          await createUserWithEmailAndPassword(auth, email, pass);
          return dbUser;
        } catch (regError: any) {
          console.error("Auto-registration failed", regError);
          if (regError.code === 'auth/email-already-in-use') {
             throw new Error("Email atau password salah.");
          }
          throw regError;
        }
      }
      
      // Bootstrap Admin special case
      if (email === "ysn.pptk@gmail.com" && pass === "123") {
        try {
          await createUserWithEmailAndPassword(auth, email, pass);
          return { email: email, role: 'Super Admin', nama: 'Super Admin' };
        } catch (e: any) {
          if (e.code === 'auth/email-already-in-use') {
             throw new Error("Password Super Admin salah.");
          }
          throw e;
        }
      }
    }
    
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error("Username/Email atau password salah.");
    }
    throw error;
  }
};

export const logout = () => signOut(auth);

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error: any) {
    console.error("Error sending reset email", error);
    if (error.code === 'auth/operation-not-allowed') {
      const projectId = firebaseConfig.projectId;
      throw new Error(`Fitur Reset Password belum diaktifkan. Silakan aktifkan metode 'Email/Password' di Firebase Console:
https://console.firebase.google.com/project/${projectId}/authentication/providers`);
    }
    if (error.code === 'auth/user-not-found') {
      const dbUser = await isUserAuthorized(email);
      if (dbUser) {
        throw new Error("Pengguna terdaftar di database tetapi belum pernah login. Silakan login terlebih dahulu dengan password awal Anda sebelum dapat menggunakan fitur Reset Password.");
      }
      throw new Error("Email tidak terdaftar.");
    }
    throw new Error("Gagal mengirim email reset password. Periksa kembali email Anda.");
  }
};
