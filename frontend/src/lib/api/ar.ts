import { supabase } from '../supabaseClient';
import type{ TablesInsert, TablesUpdate } from '../../types/supabase';

// 型定義のショートカット
type ArModelInsert = TablesInsert<'ar_model'>;
type ArModelUpdate = TablesUpdate<'ar_model'>;

export const arApi = {
  /**
   * 全てのARモデルを取得
   * (サムネイルURLやファイルサイズなども含む全カラムを取得)
   */
  getAll: async () => {
    return await supabase
      .from('ar_model')
      .select('*')
      .order('created_at', { ascending: false });
  },

  /**
   * ARモデル登録
   */
  create: async (model: ArModelInsert) => {
    return await supabase
      .from('ar_model')
      .insert(model)
      .select()
      .single();
  },

  /**
   * ARモデル更新
   */
  update: async (id: string, updates: ArModelUpdate) => {
    return await supabase
      .from('ar_model')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
  },

  /**
   * ARモデル削除
   */
  delete: async (id: string) => {
    return await supabase
      .from('ar_model')
      .delete()
      .eq('id', id);
  }
};