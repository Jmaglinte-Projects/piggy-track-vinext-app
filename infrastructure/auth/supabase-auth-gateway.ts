import type { User } from "@supabase/supabase-js";
import type { AuthGateway, AuthUser, SignUpResult } from "@/application/ports/auth-gateway";
import { getSupabaseClient, isSupabaseConfigured } from "@/infrastructure/supabase/client";

function mapUser(user: User | null): AuthUser | null {
  return user ? { id: user.id, email: user.email ?? null } : null;
}

export class SupabaseAuthGateway implements AuthGateway {
  readonly configured = isSupabaseConfigured;

  async getCurrentUser(): Promise<AuthUser | null> {
    if (!this.configured) return null;
    const result = await getSupabaseClient().auth.getSession();
    if (result.error) throw new Error(result.error.message);
    return mapUser(result.data.session?.user ?? null);
  }

  subscribe(listener: (user: AuthUser | null) => void): () => void {
    if (!this.configured) return () => undefined;
    const result = getSupabaseClient().auth.onAuthStateChange((_event, session) => {
      listener(mapUser(session?.user ?? null));
    });
    return () => result.data.subscription.unsubscribe();
  }

  async signIn(email: string, password: string): Promise<void> {
    const result = await getSupabaseClient().auth.signInWithPassword({ email, password });
    if (result.error) throw new Error(result.error.message);
  }

  async signUp(email: string, password: string): Promise<SignUpResult> {
    const result = await getSupabaseClient().auth.signUp({ email, password });
    if (result.error) throw new Error(result.error.message);
    return { requiresEmailConfirmation: !result.data.session };
  }

  async signOut(): Promise<void> {
    if (!this.configured) return;
    const result = await getSupabaseClient().auth.signOut();
    if (result.error) throw new Error(result.error.message);
  }
}
