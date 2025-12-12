import { supabase } from '../supabaseClient';
import type{ Database } from '../../types/supabase';

type UserRole = Database['public']['Enums']['user_role'];

export const adminApi = {
  /**
   * [Admin] 招待メールの作成 (RPC)
   */
  createInvitation: async (email: string, role: UserRole = 'admin') => {
    return await supabase.rpc('create_invitation', {
      p_email: email,
      p_role: role
    });
  },

  /**
   * 招待コード（メール）の有効性チェック (RPC)
   * ユーザー登録フローで使用
   */
  checkInvitation: async (email: string) => {
    return await supabase.rpc('check_invitation', {
      p_email: email
    });
  },

  /**
   * [Admin] 招待リストの取得 (RPC)
   */
  getInvitations: async (status?: string) => {
    return await supabase.rpc('get_invitations', {
      p_status: status ?? undefined,  // 👈 一番正しい
      p_limit: 100,
      p_offset: 0
    });
  },

  /**
   * [Admin] 招待のキャンセル（削除）
   * RLSポリシーにより管理者のみ実行可能
   */
  deleteInvitation: async (id: string) => {
    return await supabase
      .from('invitations')
      .delete()
      .eq('id', id);
  },

  /**
   * [Admin] ユーザーロールの変更 (RPC)
   */
  updateUserRole: async (userId: string, newRole: UserRole) => {
    return await supabase.rpc('set_user_role', {
      p_user_id: userId,
      p_new_role: newRole
    });
  },

  /**
   * [Admin] ユーザー一覧取得
   * 注: auth.users は直接クライアントからselectできないため、
   * user_profile テーブルまたは view_user_profile_with_age を参照します
   */
  getAllProfiles: async () => {
    return await supabase
      .from('view_user_profile_with_age')
      .select('*')
      .order('created_at', { ascending: false });
  },

  expireOldInvitations: async () => {
    return await supabase.rpc('expire_old_invitations');
  }
};