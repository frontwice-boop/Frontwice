import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface UserContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  signIn: (language?: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, displayName: string, username: string, photoURL?: string, language?: string) => Promise<void>;
  signInWithEmail: (email: string, pass: string, language?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateLanguage: (lang: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);

  const refreshUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser({ ...auth.currentUser });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Sync profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfile(data);
          
          // If we have a pending language from login screen, sync it
          if (pendingLanguage && data.language !== pendingLanguage) {
            await setDoc(doc(db, 'users', currentUser.uid), { language: pendingLanguage }, { merge: true });
            setProfile((prev: any) => ({ ...prev, language: pendingLanguage }));
          }
        } else {
          // Create initial profile if it doesn't exist (e.g., Google login or legacy)
          const initialProfile = {
            displayName: currentUser.displayName || 'Anonymous User',
            username: (currentUser.email?.split('@')[0] || 'user').slice(0, 30),
            bio: 'Passionate about preserving legacies.',
            photoURL: currentUser.photoURL || '',
            language: pendingLanguage || 'English',
            email: currentUser.email || '',
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', currentUser.uid), initialProfile);
          setProfile(initialProfile);
        }
        setPendingLanguage(null);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pendingLanguage]);

  const signIn = async (language?: string) => {
    if (language) setPendingLanguage(language);
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signUpWithEmail = async (email: string, pass: string, displayName: string, username: string, photoURL: string = '', language: string = 'English') => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const newUser = userCredential.user;

    // Send verification email
    await sendEmailVerification(newUser);

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
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'users', newUser.uid), initialProfile);
    setProfile(initialProfile);
  };

  const signInWithEmail = async (email: string, pass: string, language?: string) => {
    if (language) setPendingLanguage(language);
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const updateLanguage = async (newLang: string) => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { language: newLang }, { merge: true });
      setProfile((prev: any) => ({ ...prev, language: newLang }));
    }
  };

  return (
    <UserContext.Provider value={{ user, profile, loading, signIn, signUpWithEmail, signInWithEmail, signOut, refreshUser, updateLanguage }}>
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
