import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type{ Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type{ Database } from '../types/supabase';

// DBの型定義からRole型を抽出
type UserRole = Database['public']['Enums']['user_role'];

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  role: UserRole | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAdmin: false,
  role: null,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    // 1. 初期セッション取得
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          extractRole(session.user);
        }
      } catch (error) {
        console.error('Session init error:', error);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // 2. 認証状態の監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          extractRole(session.user);
        } else {
          setRole(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // app_metadata からロールを抽出 (Source of Truth)
  const extractRole = (currentUser: User) => {
    // SupabaseのJWTには app_metadata.role が含まれています
    // DBトリガーで同期されているため、これを信頼します
    const assignedRole = currentUser.app_metadata?.role as UserRole | undefined;
    setRole(assignedRole ?? 'user'); // デフォルトは 'user'
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setUser(null);
    setSession(null);
  };

  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider value={{ session, user, loading, isAdmin, role, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);