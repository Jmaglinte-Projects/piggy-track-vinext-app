export interface AuthUser {
  id: string;
  email: string | null;
}

export interface SignUpResult {
  requiresEmailConfirmation: boolean;
}

export interface AuthGateway {
  readonly configured: boolean;
  getCurrentUser(): Promise<AuthUser | null>;
  subscribe(listener: (user: AuthUser | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<SignUpResult>;
  signOut(): Promise<void>;
}
