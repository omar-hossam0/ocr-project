"use client";
import { createContext, useContext, useEffect, useState } from "react";
import React from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  updateProfile as firebaseUpdateProfile,
  updatePassword as firebaseUpdatePassword,
} from "firebase/auth";
import { auth } from "./firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set persistence
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    // Listen for auth changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: unknown) {
      const authError = error as { code?: string; message?: string };
      if (authError.code === "auth/user-not-found") {
        throw new Error("No account found with this email");
      } else if (authError.code === "auth/wrong-password") {
        throw new Error("Incorrect password");
      } else if (authError.code === "auth/invalid-email") {
        throw new Error("Invalid email address");
      } else if (authError.code === "auth/user-disabled") {
        throw new Error("This account has been disabled");
      }
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address");
    }
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: unknown) {
      const authError = error as { code?: string; message?: string };
      if (authError.code === "auth/email-already-in-use") {
        throw new Error("This email is already registered");
      } else if (authError.code === "auth/weak-password") {
        throw new Error("Password is too weak. Use at least 6 characters");
      } else if (authError.code === "auth/invalid-email") {
        throw new Error("Invalid email address");
      }
      throw error;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const updateUserProfile = async (displayName: string, photoURL?: string) => {
    if (!auth.currentUser) throw new Error("No user logged in");
    const updates: { displayName: string; photoURL?: string } = { displayName };
    if (photoURL !== undefined) updates.photoURL = photoURL;
    await firebaseUpdateProfile(auth.currentUser, updates);
    // Reload so the context gets the fresh user object
    await auth.currentUser.reload();
    setUser({ ...auth.currentUser });
  };

  const updateUserPassword = async (newPassword: string) => {
    if (!auth.currentUser) throw new Error("No user logged in");
    await firebaseUpdatePassword(auth.currentUser, newPassword);
  };

  const refreshUser = async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    setUser({ ...auth.currentUser });
  };

  // Memoize context value to prevent unnecessary re-renders
  const value = React.useMemo(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      signOut,
      updateUserProfile,
      updateUserPassword,
      refreshUser,
    }),
    [user, loading],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
