import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { auth, db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  updateProfile,
  UserCredential
} from 'firebase/auth';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password?: string) => Promise<UserCredential>;
  signUp: (email: string, password?: string, name?: string) => Promise<UserCredential>;
  signOut: () => Promise<void>;
  loginDemo: (target: 'sridev' | 'alex') => void;
  exitDemo: () => void;
  toggleDarkMode: () => void;
  updatePreferences: (prefs: Partial<UserProfile['preferences']>) => void;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  isInitialized: boolean;
  session: {
    mode: 'firebase' | 'demo';
    demoUserId?: 'sridev' | 'alex';
    displayName?: string;
    email?: string;
  } | null;
  authSuccessToast: string | null;
  clearAuthSuccessToast: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [authSuccessToast, setAuthSuccessToast] = useState<string | null>(null);

  const clearAuthSuccessToast = () => setAuthSuccessToast(null);

  const session = user ? {
    mode: isDemoMode ? ('demo' as const) : ('firebase' as const),
    demoUserId: isDemoMode ? (user.uid === 'user_alex' ? 'alex' as const : 'sridev' as const) : undefined,
    displayName: user.displayName,
    email: user.email
  } : null;

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(err => {
      console.warn('Auth persistence warning:', err);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const demoFlag = localStorage.getItem('lifeos_demo_mode');
      if (demoFlag) {
        try {
          const parsedDemo = JSON.parse(demoFlag);
          setUser(parsedDemo);
          setIsDemoMode(true);
          setLoading(false);
          setIsInitialized(true);
          return;
        } catch {}
      }

      if (firebaseUser) {
        setIsDemoMode(false);
        localStorage.removeItem('lifeos_demo_mode');

        // Immediately set user from Firebase Auth to enter dashboard instantly without waiting for Firestore
        const initialDisplayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'LifeOS User';
        let prefs = {
          darkMode: false,
          autoMaskSensitiveData: true,
          notifyExpiringDays: 30,
          emailAlerts: true
        };
        try {
          const storedPrefs = localStorage.getItem(`lifeos_prefs_${firebaseUser.uid}`);
          if (storedPrefs) prefs = JSON.parse(storedPrefs);
        } catch {}

        const instantProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: initialDisplayName,
          createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
          preferences: prefs,
          isDemo: false
        };
        setUser(instantProfile);
        setLoading(false);
        setIsInitialized(true);

        if (instantProfile.preferences.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }

        // Background non-blocking Firestore profile synchronization
        if (db) {
          (async () => {
            try {
              const userDocRef = doc(db, 'users', firebaseUser.uid);
              const userSnap = await getDoc(userDocRef);
              if (userSnap.exists()) {
                const data = userSnap.data();
                if (data.displayName && data.displayName !== initialDisplayName) {
                  setUser(prev => prev && prev.uid === firebaseUser.uid ? { ...prev, displayName: data.displayName } : prev);
                }
              } else {
                await setDoc(userDocRef, {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  displayName: initialDisplayName,
                  createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
                  preferences: prefs
                }, { merge: true });
              }
            } catch (e) {
              console.warn('[AUTH] Background workspace sync warning (Firestore offline/slow):', e);
            }
          })();
        }

        // Sync with admin registry so admin always sees any logged in user
        fetch('/api/admin/sync-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: initialDisplayName,
            createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
            status: 'Active',
            role: 'Verified User'
          })
        }).catch(() => {});
      } else {
        setUser(null);
        setIsDemoMode(false);
        document.documentElement.classList.remove('dark');
        setLoading(false);
        setIsInitialized(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password = '') => {
    console.log('[AUTH] Sign in started for:', email);
    setLoading(true);
    try {
      localStorage.removeItem('lifeos_demo_mode');
      setIsDemoMode(false);
      setUser(null); // Clear previous user state immediately
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      console.log('[AUTH] Sign in success.');
      setLoading(false);
      return cred;
    } catch (error: any) {
      console.log('[AUTH] Sign in failed:', error.code, error.message);
      setLoading(false);
      let message = 'Incorrect email or password. Please try again.';
      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email. Please create an account first.';
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Incorrect email or password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many login attempts. Please wait and try again.';
      } else if (error.code === 'auth/network-request-failed') {
        message = 'Network error. Check your internet connection and try again.';
      } else if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/configuration-not-found') {
        message = 'Email/password authentication is not enabled in Firebase.';
      } else if (error.message && !error.message.includes('Firebase: Error')) {
        message = error.message;
      }
      throw new Error(message);
    }
  };

  const signUp = async (email: string, password = '', name = 'LifeOS User') => {
    console.log('[AUTH] Registration started for:', email);
    setLoading(true);
    try {
      localStorage.removeItem('lifeos_demo_mode');
      setIsDemoMode(false);
      setUser(null); // Clear previous user state immediately
      const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const displayName = name.trim() || email.split('@')[0];
      if (userCred.user) {
        await updateProfile(userCred.user, { displayName });
        if (db) {
          try {
            await setDoc(doc(db, 'users', userCred.user.uid), {
              uid: userCred.user.uid,
              email: userCred.user.email || email.trim(),
              displayName: displayName,
              createdAt: userCred.user.metadata.creationTime || new Date().toISOString(),
              preferences: {
                darkMode: false,
                autoMaskSensitiveData: true,
                notifyExpiringDays: 30,
                emailAlerts: true
              }
            });
          } catch (e) {
            console.warn('Failed to save user profile to Firestore during signup:', e);
          }
        }
      }
      console.log('[AUTH] Registration success. UID:', userCred.user?.uid);
      setLoading(false);
      return userCred;
    } catch (error: any) {
      console.log('[AUTH] createUserWithEmailAndPassword failed. error.code:', error.code, 'error.message:', error.message);
      setLoading(false);
      let message = 'Registration failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'An account with this email already exists. Please sign in instead.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many login attempts. Please wait and try again.';
      } else if (error.code === 'auth/weak-password' || (error.message && error.message.includes('weak'))) {
        message = 'Password must meet Firebase\'s password requirements.';
      } else if (error.code === 'auth/network-request-failed') {
        message = 'Network error. Check your internet connection and try again.';
      } else if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/configuration-not-found') {
        message = 'Email/password authentication is not enabled in Firebase.';
      } else if (error.message && !error.message.includes('Firebase: Error')) {
        message = error.message;
      }
      throw new Error(message);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('lifeos_demo_mode');
      setIsDemoMode(false);
      setUser(null);
      try {
        await fbSignOut(auth);
      } catch {}
      document.documentElement.classList.remove('dark');
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loginDemo = (target: 'sridev' | 'alex') => {
    const isAlex = target === 'alex';
    const demoUser: UserProfile = {
      uid: isAlex ? 'demo_uid_alex_rivera' : 'demo_uid_sridev_dev',
      email: isAlex ? 'alex.rivera@designops.co' : 'sridev@university.edu',
      displayName: isAlex ? 'Alex Rivera' : 'Sridev Dev',
      createdAt: '2026-01-01T00:00:00.000Z',
      preferences: {
        darkMode: false,
        autoMaskSensitiveData: true,
        notifyExpiringDays: 30,
        emailAlerts: true
      },
      isDemo: true
    };
    setUser(demoUser);
    setIsDemoMode(true);
    localStorage.setItem('lifeos_demo_mode', JSON.stringify(demoUser));
    setLoading(false);
  };

  const exitDemo = () => {
    localStorage.removeItem('lifeos_demo_mode');
    setIsDemoMode(false);
    setUser(null);
    document.documentElement.classList.remove('dark');
    setLoading(false);
  };

  const toggleDarkMode = () => {
    if (!user) return;
    const nextState = !user.preferences.darkMode;
    const updated: UserProfile = {
      ...user,
      preferences: {
        ...user.preferences,
        darkMode: nextState
      }
    };
    setUser(updated);
    if (!user.isDemo) {
      localStorage.setItem(`lifeos_prefs_${user.uid}`, JSON.stringify(updated.preferences));
    } else {
      localStorage.setItem('lifeos_demo_mode', JSON.stringify(updated));
    }

    if (nextState) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const updatePreferences = (prefs: Partial<UserProfile['preferences']>) => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      preferences: {
        ...user.preferences,
        ...prefs
      }
    };
    setUser(updated);
    if (!user.isDemo) {
      localStorage.setItem(`lifeos_prefs_${user.uid}`, JSON.stringify(updated.preferences));
    } else {
      localStorage.setItem('lifeos_demo_mode', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        loginDemo,
        exitDemo,
        toggleDarkMode,
        updatePreferences,
        isAuthenticated: Boolean(user && user.uid),
        isDemoMode,
        isInitialized,
        session,
        authSuccessToast,
        clearAuthSuccessToast
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

