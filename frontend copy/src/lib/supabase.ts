import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  !import.meta.env.VITE_SUPABASE_URL.includes('your-supabase-project-id') &&
  !import.meta.env.VITE_SUPABASE_ANON_KEY.includes('your-supabase-anon-key')
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  institutionName?: string;
  avatarUrl?: string;
}

export const signInWithGoogle = async () => {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase URL/Anon Key not configured in environment.') };
  }
  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
};

export const signUpWithSupabase = async (email: string, password: string, name?: string) => {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase is not configured.') };
  }
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        name: name,
      },
    },
  });
};

export const signInWithSupabase = async (email: string, password: string) => {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase is not configured.') };
  }
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
};

export const getSupabaseToken = async (): Promise<string | null> => {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
};

