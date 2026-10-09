"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export interface AuthState {
  user: User | null;
  loading: boolean;
  configured: boolean;
  message: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const client = getSupabaseClient();
    void client.auth.getUser().then(({ data }) => { setUser(data.user); setLoading(false); });
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setMessage(null);
    const result = await getSupabaseClient().auth.signInWithPassword({ email, password });
    if (result.error) throw new Error(result.error.message);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setMessage(null);
    const result = await getSupabaseClient().auth.signUp({ email, password });
    if (result.error) throw new Error(result.error.message);
    if (!result.data.session) setMessage("Check your email to confirm your PiggyTrack account, then sign in.");
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const result = await getSupabaseClient().auth.signOut();
    if (result.error) throw new Error(result.error.message);
  }, []);

  return { user, loading, configured: isSupabaseConfigured, message, signIn, signUp, signOut };
}
