"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "@/application/ports/auth-gateway";
import { createAuthGateway } from "@/infrastructure/composition-root";

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  configured: boolean;
  message: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const gateway = useMemo(() => createAuthGateway(), []);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(gateway.configured);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!gateway.configured) return;
    void gateway
      .getCurrentUser()
      .then(setUser)
      .catch((cause: unknown) =>
        setMessage(cause instanceof Error ? cause.message : "Unable to check your session."),
      )
      .finally(() => setLoading(false));
    return gateway.subscribe((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, [gateway]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setMessage(null);
      await gateway.signIn(email, password);
    },
    [gateway],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      setMessage(null);
      const result = await gateway.signUp(email, password);
      if (result.requiresEmailConfirmation)
        setMessage("Check your email to confirm your PiggyTrack account, then sign in.");
    },
    [gateway],
  );

  const signOut = useCallback(async () => {
    await gateway.signOut();
  }, [gateway]);

  return { user, loading, configured: gateway.configured, message, signIn, signUp, signOut };
}
