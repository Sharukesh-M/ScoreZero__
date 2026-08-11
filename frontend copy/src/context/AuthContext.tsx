import React, { createContext, useContext, useState, useEffect } from 'react';
import scoreZeroAPI, { type User } from '../api/client';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  signup: (token: string, user: User) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** 
 * Try to restore the user from Supabase session alone — no backend needed.
 * This is fast and works even when the Flask/Node backend is offline.
 */
async function getUserFromSupabaseSession(): Promise<User | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (!session) return null;
    const u = session.user;
    const name =
      u.user_metadata?.full_name ||
      u.user_metadata?.name ||
      (u.email ? u.email.split('@')[0] : 'User');
    return {
      user_id: u.id,
      email: u.email || '',
      name,
      avatar_url: u.user_metadata?.avatar_url || u.user_metadata?.picture,
      email_verified: Boolean(u.email_confirmed_at),
      created_at: u.created_at,
    };
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('scorezero_token'));
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = async () => {
    const currentToken = localStorage.getItem('scorezero_token');

    if (!currentToken) {
      // No token at all — try Supabase session as a last resort
      const supabaseUser = await getUserFromSupabaseSession();
      if (supabaseUser) {
        // get the supabase access token
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.access_token) {
            localStorage.setItem('scorezero_token', data.session.access_token);
            setToken(data.session.access_token);
          }
        } catch { /* ignore */ }
        setUser(supabaseUser);
      } else {
        setUser(null);
        setToken(null);
      }
      setIsLoading(false);
      return;
    }

    // --- Strategy: Try Supabase session first (fast, no backend needed) ---
    // Then attempt backend getMe() in background to sync server-side data.
    const supabaseUser = await getUserFromSupabaseSession();
    if (supabaseUser) {
      // Immediately show user from Supabase — no loading delay
      setUser(supabaseUser);
      setToken(currentToken);
      setIsLoading(false);

      // Background sync with backend (non-blocking)
      scoreZeroAPI.auth.getMe()
        .then((res) => { setUser(res.user); })
        .catch(() => { /* backend offline — use Supabase data */ });
      return;
    }

    // --- Fallback: try backend getMe() with a short timeout ---
    try {
      const res = await Promise.race([
        scoreZeroAPI.auth.getMe(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('auth_timeout')), 5000)
        ),
      ]);
      setUser((res as { user: User }).user);
      setToken(currentToken);
    } catch {
      // Invalid/expired token or backend unavailable — clear token
      localStorage.removeItem('scorezero_token');
      localStorage.removeItem('supabase_token');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();

    // Listen for Supabase OAuth events (e.g. Google Sign-In redirect callback)
    if (isSupabaseConfigured) {
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          const accessToken = session.access_token;
          const u = session.user;
          const name = u.user_metadata?.full_name || u.user_metadata?.name || (u.email ? u.email.split('@')[0] : 'User');
          const avatar_url = u.user_metadata?.avatar_url || u.user_metadata?.picture;
          const authenticatedUser: User = {
            user_id: u.id,
            email: u.email || '',
            name,
            avatar_url,
            email_verified: Boolean(u.email_confirmed_at),
            created_at: u.created_at,
          };
          localStorage.setItem('scorezero_token', accessToken);
          localStorage.setItem('supabase_token', accessToken);
          setToken(accessToken);
          setUser(authenticatedUser);
          setIsLoading(false);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('scorezero_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const signup = (newToken: string, newUser: User) => {
    localStorage.setItem('scorezero_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    localStorage.removeItem('scorezero_token');
    localStorage.removeItem('supabase_token');
    setToken(null);
    setUser(null);
    // Also sign out from Supabase to clear session cookies & prevent auto-login on refresh
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore sign-out errors
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        login,
        signup,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
