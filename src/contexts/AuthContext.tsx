import { createContext, useContext, ReactNode } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";

// TEMPORARY: Demo mode with mock user for public read-only access
// To revert: restore from Lovable History to any point before this change

const DEMO_USER_ID = '34f25d5b-0fcc-4792-822b-e7b30af21dd4';

// Mock user object for demo mode
const mockUser: User = {
  id: DEMO_USER_ID,
  email: 'joe@marketools.io',
  app_metadata: {},
  user_metadata: { full_name: 'Joe Nilsen' },
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
  role: 'authenticated',
  updated_at: '2024-01-01T00:00:00.000Z',
};

// Mock session for demo mode
const mockSession: Session = {
  access_token: 'demo-token',
  refresh_token: 'demo-refresh',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: mockUser,
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // DEMO MODE: Always return mock user, no loading state
  const signUp = async () => ({ error: null });
  const signIn = async () => ({ error: null });
  const signInWithGoogle = async () => ({ error: null });
  const signOut = async () => {};

  return (
    <AuthContext.Provider 
      value={{ 
        user: mockUser, 
        session: mockSession, 
        loading: false, 
        signUp, 
        signIn, 
        signInWithGoogle, 
        signOut 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
