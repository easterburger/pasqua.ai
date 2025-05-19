
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signup: (email: string, pass: string) => Promise<User | null>;
  login: (email: string, pass: string) => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe; // Unsubscribe on cleanup
  }, []);

  const signup = async (email: string, pass: string): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      setCurrentUser(userCredential.user);
      toast({ title: "Account Created", description: "Successfully signed up!" });
      router.push('/'); // Redirect to home after signup
      return userCredential.user;
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({ title: "Signup Failed", description: error.message || "Could not create account.", variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, pass: string): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      setCurrentUser(userCredential.user);
      toast({ title: "Login Successful", description: "Welcome back!" });
      router.push('/'); // Redirect to home after login
      return userCredential.user;
    } catch (error: any) {
      console.error("Login error:", error);
      toast({ title: "Login Failed", description: error.message || "Invalid credentials.", variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/auth/login'); // Redirect to login after logout
    } catch (error: any) {
      console.error("Logout error:", error);
      toast({ title: "Logout Failed", description: error.message || "Could not log out.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    loading,
    signup,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
