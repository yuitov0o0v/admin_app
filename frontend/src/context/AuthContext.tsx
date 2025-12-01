// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type{ Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean; // これで画面の出し分けをします
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAdmin: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // 1. 初期ロード時のセッション取得
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      checkRole(session?.user);
      setLoading(false);
    };

    initSession();

    // 2. ログイン/ログアウトの監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      checkRole(session?.user);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ロールの判定ロジック
  const checkRole = (currentUser: User | undefined | null) => {
    if (!currentUser) {
      setIsAdmin(false);
      return;
    }
    // DBの handle_new_user 関数が user_metadata に role を書き込んでくれています
    // これを参照するのが一番速いです
    const role = currentUser.app_metadata?.role;
    console.log('Current Role:', role); // デバッグ用ログ
    setIsAdmin(role === 'admin');
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, isAdmin }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// ほかのコンポーネントから簡単に呼び出せるようにするフック
export const useAuth = () => useContext(AuthContext);