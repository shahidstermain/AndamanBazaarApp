import { initializeApp } from 'firebase/app';
import { getAuth, Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, Firestore, doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { logger } from './logger';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// Google Auth provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Auth configuration
if (import.meta.env.VITE_ENV === 'development') {
  // Development settings can be configured here if needed
}

// Helper functions
export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey && 
         firebaseConfig.projectId && 
         firebaseConfig.authDomain &&
         firebaseConfig.apiKey.startsWith('AIza') &&
         firebaseConfig.projectId.length > 0;
};

// User profile creation in Firestore
export const createFirestoreUser = async (user: User, additionalData?: any) => {
  if (!user) throw new Error('No user provided');
  
  const userRef = doc(db, 'users', user.uid);
  const userSnapshot = await getDoc(userRef);
  
  if (!userSnapshot.exists()) {
    const { email, phoneNumber, photoURL } = user;
    const createdAt = serverTimestamp();
    
    try {
      await setDoc(userRef, {
        id: user.uid,
        email,
        phone: phoneNumber,
        name: additionalData?.name || email?.split('@')[0] || 'Island User',
        avatar: photoURL,
        locationVerified: false,
        contactPreferences: {
          whatsapp: true,
          phone: true,
          chat: true
        },
        role: 'user',
        isActive: true,
        isBanned: false,
        stats: {
          listingCount: 0,
          soldCount: 0,
          favoriteCount: 0,
          chatCount: 0,
          rating: 0,
          reviewCount: 0
        },
        createdAt,
        updatedAt: createdAt,
        lastActiveAt: createdAt
      });
    } catch (error) {
      logger.error('Error creating user profile', error);
      throw error;
    }
  }
  
  return userSnapshot;
};

// Update user last active
export const updateUserLastActive = async (userId: string) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    lastActiveAt: serverTimestamp()
  });
};

// Get user profile
export const getUserProfile = async (userId: string) => {
  const userRef = doc(db, 'users', userId);
  const userSnapshot = await getDoc(userRef);
  
  if (userSnapshot.exists()) {
    return userSnapshot.data();
  }
  
  return null;
};

// Check if user has specific role
export const hasRole = async (userId: string, role: string): Promise<boolean> => {
  const userProfile = await getUserProfile(userId);
  return userProfile?.role === role || userProfile?.role === 'admin';
};

// Authentication wrapper with error handling
export const signIn = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await createFirestoreUser(result.user);
    await updateUserLastActive(result.user.uid);
    return result;
  } catch (error) {
    logger.error('Sign in error', error);
    throw error;
  }
};

export const signUp = async (email: string, password: string, name?: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await createFirestoreUser(result.user, { name });
    await updateUserLastActive(result.user.uid);
    return result;
  } catch (error) {
    logger.error('Sign up error', error);
    throw error;
  }
};

export const signInWithGoogle = async () => {
  try {
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }
    logger.debug('Starting Google sign-in popup');
    const result = await signInWithPopup(auth, googleProvider);
    logger.info('Google sign-in successful', { userId: result.user.uid });
    await createFirestoreUser(result.user, {
      name: result.user.displayName || result.user.email?.split('@')[0] || 'Island User',
    });
    await updateUserLastActive(result.user.uid);
    return result;
  } catch (error: any) {
    logger.error('Google sign-in error', error, { code: error?.code, message: error?.message });
    throw error;
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    logger.error('Sign out error', error);
    throw error;
  }
};

// Auth state observer
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      await updateUserLastActive(user.uid);
    }
    callback(user);
  });
};

export default app;
