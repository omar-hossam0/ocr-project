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
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "./firebase";
import { saveUserProfile } from "./firestore";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendResetPasswordEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const syncCacheRef = React.useRef<Record<string, number>>({});

  const syncAuthenticatedUser = async (accountUser: User, force = false) => {
    const now = Date.now();
    const lastSync = syncCacheRef.current[accountUser.uid] || 0;
    if (!force && now - lastSync < 2 * 60 * 1000) {
      return;
    }

    const fallbackName = accountUser.email
      ? accountUser.email.split("@")[0]
      : "User";

    try {
      await saveUserProfile(accountUser.uid, {
        uid: accountUser.uid,
        email: accountUser.email || "",
        displayName: accountUser.displayName || fallbackName,
        photoURL: accountUser.photoURL || undefined,
        role: "Viewer",
        lastLoginAt: new Date(),
      });
      syncCacheRef.current[accountUser.uid] = now;
    } catch {
      // Keep auth flow fast even if profile sync fails temporarily.
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    const initAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch {
        // Keep default persistence if local persistence is unavailable.
      }

      if (cancelled) {
        return;
      }

      // Listen for auth changes after persistence is configured.
      unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoading(false);

        if (currentUser) {
          void syncAuthenticatedUser(currentUser);
        }
      });
    };

    void initAuth();

    return () => {
      cancelled = true;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      throw new Error("Email and password are required");
    }
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password,
      );
      setUser(credential.user);
      void syncAuthenticatedUser(credential.user, true);
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

  const signUp = async (
    email: string,
    password: string,
    displayName?: string,
  ) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = (displayName || "").trim();

    if (!normalizedEmail || !password) {
      throw new Error("Email and password are required");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error("Please enter a valid email address");
    }
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        password,
      );

      if (normalizedName) {
        await firebaseUpdateProfile(credential.user, {
          displayName: normalizedName,
        });
        await credential.user.reload();
      }

      const syncedUser = auth.currentUser || credential.user;
      setUser(syncedUser);
      void syncAuthenticatedUser(syncedUser, true);
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

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      void syncAuthenticatedUser(result.user, true);
    } catch (error: unknown) {
      const authError = error as { code?: string; message?: string };
      if (authError.code === "auth/popup-closed-by-user") {
        throw new Error("Sign-in popup was closed");
      } else if (authError.code === "auth/popup-blocked") {
        throw new Error("Sign-in popup was blocked. Please enable popups.");
      } else if (
        authError.code === "auth/operation-not-supported-in-this-environment"
      ) {
        throw new Error("Google Sign-in is not supported in this environment");
      }
      throw error;
    }
  };

  const sendResetPasswordEmail = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error("Please enter your email first");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error("Please enter a valid email address");
    }
    await sendPasswordResetEmail(auth, normalizedEmail);
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

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    sendResetPasswordEmail,
    signOut,
    updateUserProfile,
    updateUserPassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
