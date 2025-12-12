import { supabase } from '../supabaseClient';
import type{ TablesUpdate } from '../../types/supabase';

type ProfileUpdate = TablesUpdate<'user_profile'>;

export const profileApi = {
  /**
   * 自分のプロフィールを取得
   */
  getMyProfile: async (userId: string) => {
    return await supabase
      .from('user_profile')
      .select('*')
      .eq('user_id', userId)
      .single();
  },

  /**
   * プロフィール更新
   */
  updateProfile: async (userId: string, updates: ProfileUpdate) => {
    return await supabase
      .from('user_profile')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
  }
};