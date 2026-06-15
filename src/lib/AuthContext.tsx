'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { User } from '@/models/User';
import { apiFetch } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** In-memory profile cache — survives SPA navigations, avoids /auth/me on every route change */
let cachedProfile: User | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<User | null>(cachedProfile);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const fetchProfile = async (force = false) => {
    // Skip if we already have a cached profile and not forced
    if (!force && cachedProfile) {
      setUser(cachedProfile);
      return;
    }
    try {
      const data = await apiFetch<User>('/auth/me');
      cachedProfile = data;
      setUser(data);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Gagal memuat profil user dari backend:', err);
      cachedProfile = null;
      setUser(null);
    }
  };

  useEffect(() => {
    // Initial fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        // Use cached profile if available (instant), otherwise fetch
        if (cachedProfile && !fetchedRef.current) {
          setUser(cachedProfile);
          setLoading(false);
          // Background revalidate (silent, no loading state)
          fetchedRef.current = true;
          fetchProfile(true);
        } else {
          fetchProfile(true).then(() => setLoading(false));
          fetchedRef.current = true;
        }
      } else {
        setLoading(false);
      }
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setSupabaseUser(newSession?.user ?? null);
      
      if (event === 'SIGNED_OUT') {
        cachedProfile = null;
        setUser(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN') {
        setLoading(true);
        await fetchProfile(true);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED') {
        // Token refreshed silently (e.g. tab refocus) — don't show loading or refetch
        setSession(newSession);
      } else if (newSession?.user && !user) {
        // Edge case: user object missing but session exists
        await fetchProfile(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    cachedProfile = null;
    setUser(null);
    setSession(null);
    setSupabaseUser(null);
    setLoading(false);
  };

  const refetchProfile = async () => {
    if (session?.user) {
      await fetchProfile(true);
    }
  };

  return (
    <AuthContext.Provider value={{ user, supabaseUser, session, loading, signOut, refetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return context;
}
