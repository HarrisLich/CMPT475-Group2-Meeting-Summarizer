"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, signIn, signUp, signOut, getCurrentUser, ProfileData, getCurrentProfile, updateProfile, uploadAvatar } from '../services/supabase';

// Update the context shape
type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: ProfileData | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: ProfileData) => Promise<void>;
  uploadUserAvatar: (file: File) => Promise<string>;
};

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateUserProfile: async () => {},
  uploadUserAvatar: async () => "",
});

// Provider component that wraps your app and makes auth available
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const lastFetchedUserIdRef = React.useRef<string | null>(null);

  // Add this function to fetch profile - memoized with useCallback
  const fetchProfile = React.useCallback(async () => {
    if (!user || !user.id) return;
    
    // Prevent fetching if already fetching or already fetched for this user
    if (isFetchingProfile || lastFetchedUserIdRef.current === user.id) {
      return;
    }
    
    setIsFetchingProfile(true);
    lastFetchedUserIdRef.current = user.id;
    
    try {
      const { data, error } = await getCurrentProfile();
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      lastFetchedUserIdRef.current = null; // Reset on error so we can retry
    } finally {
      setIsFetchingProfile(false);
    }
  }, [user, isFetchingProfile]);

  // Call fetchProfile after user is set - but only once per user
  useEffect(() => {
    if (user && user.id && lastFetchedUserIdRef.current !== user.id) {
      fetchProfile();
    } else if (!user) {
      setProfile(null);
      lastFetchedUserIdRef.current = null;
    }
  }, [user?.id]); // Only depend on user.id, not the whole user object

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

  // Add update profile function
  const updateUserProfile = async (updates: ProfileData) => {
    try {
      console.log("Auth context: Updating profile with:", updates);
      const result = await updateProfile(updates);
      console.log("Auth context: Update result:", result);
      
      if (result.error) {
        console.error("Auth context: Update error:", result.error);
        throw result.error;
      }
      
      // Update local state
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      console.log("Auth context: Local profile state updated");
      
    } catch (error: any) {
      console.error("Auth context: updateUserProfile error:", error);
      setError(error.message || "Failed to update profile");
      throw error;
    }
  };
  
  // Add avatar upload function
  const uploadUserAvatar = async (file: File) => {
    try {
      console.log("uploadUserAvatar: Starting upload for file:", file.name);
      const { data, error } = await uploadAvatar(file);
      if (error) {
        console.error("uploadUserAvatar: Upload error:", error);
        throw error;
      }
      
      console.log("uploadUserAvatar: Upload successful, URL:", data);
      
      // Force refetch profile to get updated avatar URL from database
      if (user?.id) {
        lastFetchedUserIdRef.current = null; // Reset cache to force refetch
        setIsFetchingProfile(false);
        
        const { data: profileData, error: profileError } = await getCurrentProfile();
        if (profileError) {
          console.error("uploadUserAvatar: Error refetching profile:", profileError);
          // Fallback: update local state
          setProfile(prev => {
            const updated = prev ? { ...prev, avatar_url: data } : { avatar_url: data } as ProfileData;
            console.log("uploadUserAvatar: Updated profile state (fallback):", updated);
            return updated;
          });
        } else if (profileData) {
          console.log("uploadUserAvatar: Profile refetched successfully:", profileData);
          console.log("uploadUserAvatar: New avatar_url:", profileData.avatar_url);
          setProfile(profileData);
        } else {
          // Fallback if no data returned
          setProfile(prev => prev ? { ...prev, avatar_url: data } : { avatar_url: data } as ProfileData);
        }
      }
      
      return data;
    } catch (error: any) {
      console.error("uploadUserAvatar: Exception:", error);
      setError(error.message || "Failed to upload avatar");
      throw error;
    }
  };

  // Make the context available to all children
  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      error,
      login,
      register,
      logout,
      updateUserProfile,
      uploadUserAvatar
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use the auth context
export function useAuth() {
  return useContext(AuthContext);
}