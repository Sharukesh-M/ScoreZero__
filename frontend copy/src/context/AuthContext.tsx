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
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('scorezero_token'));
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = async () => {
    const currentToken = localStorage.getItem('scorezero_token');
    if (!currentToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await scoreZeroAPI.auth.getMe();
      setUser(res.user);
      setToken(currentToken);
    } catch {
      // Invalid/expired token
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

  const logout = () => {
    localStorage.removeItem('scorezero_token');
    setToken(null);
    setUser(null);
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
