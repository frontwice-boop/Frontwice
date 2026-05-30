import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendEmailVerification, signInWithPhoneNumber, ConfirmationResult, browserPopupRedirectResolver } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

interface UserContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  signIn: (language?: string, provider?: any) => Promise<User>;
  signUpWithEmail: (email: string, pass: string, displayName: string, username: string, photoURL?: string, language?: string) => Promise<User>;
  signInWithEmail: (email: string, pass: string, language?: string) => Promise<User>;
  signInWithPhone: (phoneNumber: string, recaptchaVerifier: any) => Promise<any>;
  verifyOtp: (confirmationResult: any, otp: string) => Promise<User>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateLanguage: (lang: string) => Promise<void>;
  resendVerification: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);

  const refreshUser = React.useCallback(async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser({ ...auth.currentUser });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('onAuthStateChanged triggered, currentUser:', currentUser?.uid);
      setUser(currentUser);
      
      if (currentUser) {
        console.log('CurrentUser exist, fetching profile for:', currentUser.uid);
        // For Google Auth, we can assume email is verified if it's new
        // or just let the app handle it. 
        
        // Sync profile from Firestore in real-time
        const userRef = doc(db, 'users', currentUser.uid);
        const unsubscribeProfile = onSnapshot(userRef, (userDoc) => {
          console.log('Profile doc snapshot received, exists:', userDoc.exists());
          if (userDoc.exists()) {
            const data = userDoc.data();
            setProfile(data);
            
            // If we have a pending language from login screen, sync it
            if (pendingLanguage && data.language !== pendingLanguage) {
              setDoc(doc(db, 'users', currentUser.uid), { language: pendingLanguage }, { merge: true });
              setProfile((prev: any) => ({ ...prev, language: pendingLanguage }));
            }
          } else {
            // Create initial profile if it doesn't exist
            const initialProfile = {
              displayName: currentUser.displayName || 'Anonymous User',
              username: (currentUser.email?.split('@')[0] || 'user').slice(0, 30),
              bio: 'Passionate about preserving legacies.',
              photoURL: currentUser.photoURL || '',
              language: pendingLanguage || 'English',
              email: currentUser.email || '',
              followersCount: 0,
              followingCount: 0,
              worksCount: 0,
              createdAt: new Date().toISOString()
            };
            setDoc(doc(db, 'users', currentUser.uid), initialProfile);
            setProfile(initialProfile);
          }
          setLoading(false);
        }, (error) => {
          console.error('Firestore Error in UserContext onSnapshot:', error);
          setProfile(null);
          setLoading(false);
        });

        return () => {
          unsubscribeProfile();
        };
      } else {
        console.log('No user logged in');
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [pendingLanguage]);

  const signIn = async (language?: string, customProvider?: any) => {
    console.log('signIn triggered');
    if (language) setPendingLanguage(language);
    const provider = customProvider || new GoogleAuthProvider();
    
    // Force account selection so user can choose which account to use
    if (provider instanceof GoogleAuthProvider) {
      provider.setCustomParameters({ prompt: 'select_account' });
    }
    
    try {
      // Use browserPopupRedirectResolver for cross-origin iframe stability
      const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      console.log('signInWithPopup successful');
      return result.user;
    } catch (error) {
      console.error('signInWithPopup error:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, displayName: string, username: string, photoURL: string = '', language: string = 'English') => {
    console.log('signUpWithEmail triggered');
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const newUser = userCredential.user;

    // Update Firebase Auth profile
    await updateProfile(newUser, { displayName, photoURL });

    // Create Firestore profile immediately
    const initialProfile = {
      displayName,
      username: username.slice(0, 30),
      bio: 'Passionate about preserving legacies.',
      photoURL: photoURL,
      language: language,
      email: email,
      followersCount: 0,
      followingCount: 0,
      worksCount: 0,
      createdAt: new Date().toISOString()
    };
    const path = `users/${newUser.uid}`;
    try {
      await setDoc(doc(db, 'users', newUser.uid), initialProfile);
      // Auto-send verification email for new email accounts
      await sendEmailVerification(newUser);
    } catch (error) {
      console.error('Firestore Error in signUpWithEmail:', error);
      handleFirestoreError(error, OperationType.CREATE, path);
    }
    setProfile(initialProfile);
    return newUser;
  };

  const signInWithEmail = async (email: string, pass: string, language?: string) => {
    console.log('signInWithEmail triggered');
    if (language) setPendingLanguage(language);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        console.log('signInWithEmail successful');
        return userCredential.user;
    } catch (error) {
        console.error('signInWithEmail error:', error);
        throw error;
    }
  };

  const signInWithPhone = async (phoneNumber: string, recaptchaVerifier: any) => {
    console.log('signInWithPhone triggered');
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      console.log('signInWithPhone successful');
      return confirmationResult;
    } catch (error) {
      console.error("Phone sign-in error:", error);
      throw error;
    }
  };

  const verifyOtp = async (confirmationResult: ConfirmationResult, otp: string) => {
    try {
      const userCredential = await confirmationResult.confirm(otp);
      await refreshUser();
      return userCredential.user;
    } catch (error) {
      console.error("OTP verification error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const updateLanguage = async (newLang: string) => {
    if (user) {
      const path = `users/${user.uid}`;
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { language: newLang }, { merge: true });
        setProfile((prev: any) => ({ ...prev, language: newLang }));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }
  };

  const resendVerification = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  return (
    <UserContext.Provider value={{ user, profile, loading, signIn, signUpWithEmail, signInWithEmail, signInWithPhone, verifyOtp, signOut, refreshUser, updateLanguage, resendVerification }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
