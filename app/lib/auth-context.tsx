"use client";
import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import React from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  photoURL?: string;
}

interface AuthContextType {
  user: AuthUser | null;
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

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
}

function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem("token", token);
  } else {
    window.localStorage.removeItem("token");
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user on mount if token exists
  useEffect(() => {
    const init = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${BACKEND}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setUser(json.user);
        } else {
          // Invalid token, clear it
          setToken(null);
        }
      } catch {
        // Network error, keep token for retry later
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      throw new Error("Email and password are required");
    }
    const res = await fetch(`${BACKEND}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail, password }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      const msg = json?.error || "Login failed";
      if (msg.toLowerCase().includes("invalid")) {
        throw new Error("Invalid email or password");
      }
      throw new Error(msg);
    }
    setToken(json.token);
    setUser(json.user);
  }, []);

  const signUp = useCallback(async (
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

    // Note: Backend sign-up endpoint needs to be implemented
    const res = await fetch(`${BACKEND}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: normalizedEmail,
        password,
        name: normalizedName || normalizedEmail.split("@")[0],
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      const msg = json?.error || "Registration failed";
      if (msg.toLowerCase().includes("already")) {
        throw new Error("This email is already registered");
      }
      throw new Error(msg);
    }
    setToken(json.token);
    setUser(json.user);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    // Google OAuth requires additional backend setup
    // For now, show a message that it's not supported
    throw new Error("Google Sign-in is not supported in this environment. Please use email/password.");
  }, []);

  const sendResetPasswordEmail = useCallback(async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error("Please enter your email first");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error("Please enter a valid email address");
    }
    // Backend password reset endpoint needs to be implemented
    throw new Error("Password reset is not yet implemented. Please contact an admin.");
  }, []);

  const signOut = useCallback(async () => {
    setToken(null);
    setUser(null);
  }, []);

  const updateUserProfile = useCallback(async (displayName: string, photoURL?: string) => {
    const token = getToken();
    if (!token) throw new Error("No user logged in");

    const res = await fetch(`${BACKEND}/api/settings/users/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: displayName, photoURL }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json?.error || "Failed to update profile");
    }
    setUser((prev) => (prev ? { ...prev, name: displayName, photoURL } : null));
  }, []);

  const updateUserPassword = useCallback(async (newPassword: string) => {
    const token = getToken();
    if (!token) throw new Error("No user logged in");
    if (!newPassword || newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }
    // Backend password change endpoint needs to be implemented
    throw new Error("Password change is not yet implemented. Please contact an admin.");
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setUser(json.user);
      }
    } catch {
      // Ignore network errors
    }
  }, []);

  const value = useMemo(() => ({
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
  }), [user, loading, signIn, signUp, signInWithGoogle, sendResetPasswordEmail, signOut, updateUserProfile, updateUserPassword, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
