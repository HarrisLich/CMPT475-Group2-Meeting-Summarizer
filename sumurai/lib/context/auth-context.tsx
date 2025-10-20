"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, signIn, signUp, signOut, getCurrentUser } from '../services/supabase';

// Define the context shape
type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

// Provider component that wraps your app and makes auth available
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setSession(session);
          setUser(session.user);
        }
      } catch (error) {
        console.error("Error checking auth session:", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Clean up subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const { data, error } = await signIn(email, password);
      
      if (error) throw error;
      
      // Success - session and user are automatically updated by the listener
    } catch (error: any) {
      setError(error.message || "Failed to sign in");
      throw error;
    }
  };

  // Register function
  const register = async (email: string, password: string) => {
    try {
      setError(null);
      const { data, error } = await signUp(email, password);
      
      if (error) throw error;
      
      // Check if email confirmation is required
      if (!data?.user?.id) {
        setError("Please check your email for confirmation link");
      }
    } catch (error: any) {
      setError(error.message || "Failed to sign up");
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await signOut();
      // Auth listener will update state
    } catch (error: any) {
      setError(error.message || "Failed to sign out");
      throw error;
    }
  };

  // Make the context available to all children
  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      error,
      login,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use the auth context
export function useAuth() {
  return useContext(AuthContext);
}