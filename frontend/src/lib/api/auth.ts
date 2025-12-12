// src/lib/api/auth.ts
import { supabase } from '../supabaseClient';
// import { adminApi } from './admin';

export const authApi = {
  /**
   * ログイン処理
   */
  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  },

  /**
   * 新規登録処理
   * 登録前に招待の有効性をチェックするロジックを挟むことも可能
   */
  signUp: async (email: string, password: string, username?: string) => {
    // 1. (オプション) 招待制の場合、ここで adminApi.checkInvitation(email) を呼ぶ
    // const check = await adminApi.checkInvitation(email);
    // if (!check.data.valid) throw new Error(check.data.message);

    // 2. Supabase Authでユーザー作成
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // メタデータとしてusernameを渡しておくと、トリガー等で使いやすい
        data: { username }, 
      },
    });
    
    return { data, error };
  },

  /**
   * ログアウト
   */
  signOut: async () => {
    return await supabase.auth.signOut();
  },

  /**
   * パスワードリセットメール送信
   */
  resetPasswordForEmail: async (email: string) => {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  }
};