
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

// Define the shape of a user in our simulated system
interface SimulatedUser {
  username: string;
}

interface AuthContextType {
  currentUser: SimulatedUser | null;
  loading: boolean;
  signup: (username: string, pass: string) => Promise<boolean>;
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

const USERS_STORAGE_KEY = 'pasqua-simulated-users';
const CURRENT_USER_SESSION_KEY = 'pasqua-current-simulated-user';

interface StoredUsers {
  [username: string]: string; // username: password_plaintext
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SimulatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Check for an active session on initial load
    try {
      const storedUserSession = localStorage.getItem(CURRENT_USER_SESSION_KEY);
      if (storedUserSession) {
        const user: SimulatedUser = JSON.parse(storedUserSession);
        // Basic validation: check if this user still "exists" in our users list
        const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '{}') as StoredUsers;
        if (users[user.username]) {
          setCurrentUser(user);
        } else {
          // User from session doesn't exist anymore, clear session
          localStorage.removeItem(CURRENT_USER_SESSION_KEY);
        }
      }
    } catch (error) {
      console.error("Error loading user session from localStorage:", error);
      localStorage.removeItem(CURRENT_USER_SESSION_KEY);
    }
    setLoading(false);
  }, []);

  const getUsersFromStorage = (): StoredUsers => {
    try {
      return JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '{}') as StoredUsers;
    } catch (e) {
      console.error("Error parsing users from localStorage:", e);
      return {};
    }
  };

  const saveUsersToStorage = (users: StoredUsers) => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error("Error saving users to localStorage:", e);
    }
  };

  const signup = async (username: string, pass: string): Promise<boolean> => {
    setLoading(true);
    if (!username.trim() || !pass) {
        toast({ title: "Signup Failed", description: "Username and password cannot be empty.", variant: "destructive" });
        setLoading(false);
        return false;
    }
    const users = getUsersFromStorage();
    if (users[username]) {
      toast({ title: "Signup Failed", description: "Username already exists.", variant: "destructive" });
      setLoading(false);
      return false;
    }

    // INSECURE: Storing password in plaintext (or any client-side form) is not safe for real apps.
    users[username] = pass; 
    saveUsersToStorage(users);

    const newUser: SimulatedUser = { username };
    setCurrentUser(newUser);
    localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(newUser));
    toast({ title: "Account Created", description: "Successfully signed up!" });
    router.push('/');
    setLoading(false);
    return true;
  };

  const login = async (username: string, pass: string): Promise<boolean> => {
    setLoading(true);
    const users = getUsersFromStorage();
    if (users[username] && users[username] === pass) {
      const userToLogin: SimulatedUser = { username };
      setCurrentUser(userToLogin);
      localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(userToLogin));
      toast({ title: "Login Successful", description: "Welcome back!" });
      router.push('/');
      setLoading(false);
      return true;
    } else {
      toast({ title: "Login Failed", description: "Invalid username or password.", variant: "destructive" });
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(CURRENT_USER_SESSION_KEY);
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    router.push('/auth/login');
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
