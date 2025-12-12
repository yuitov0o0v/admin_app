import { supabase } from '../supabaseClient';
import type{ Database } from '../../types/supabase'; // 型定義のパスに合わせてください
import type{ TablesInsert, TablesUpdate } from '../../types/supabase';

type SpotInsert = TablesInsert<'spots'>;
type SpotUpdate = TablesUpdate<'spots'>;

export const spotsApi = {
  /**
   * スポット一覧を取得（統計情報付きViewを利用）
   * Admin以外は active なものだけ取得するなどのフィルタが必要ならここで分岐
   */
  getAllWithStats: async () => {
    return await supabase
      .from('spot_statistics')
      .select('*')
      .order('name');
  },

  /**
   * 単一スポットの詳細を取得（ARモデル情報も結合）
   */
  getById: async (id: string) => {
    return await supabase
      .from('spots')
      .select(`
        *,
        ar_model:ar_model_id (*)
      `)
      .eq('id', id)
      .single();
  },

  /**
   * [Admin] スポット作成
   */
  create: async (spot: SpotInsert) => {
    return await supabase.from('spots').insert(spot).select().single();
  },

  /**
   * [Admin] スポット更新
   */
  update: async (id: string, updates: SpotUpdate) => {
    return await supabase
      .from('spots')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
  },

  /**
   * [Admin] スポット削除（論理削除）
   * deleted_at を入れる設計のようなので update を使用
   */
  softDelete: async (id: string) => {
    return await supabase
      .from('spots')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id);
  },
  
  /**
   * カテゴリ一覧を取得（検索フィルター用）
   */
  getCategories: async () => {
    return await supabase
      .from('spots')
      .select('category')
      .not('category', 'is', null);
      // フロント側で重複排除が必要、または .rpc で distinct 取得する関数を作る
  },

  /**
   * [Map用] アクティブなスポットの全データを取得（座標含む）
   */
  getAllActive: async () => {
    return await supabase
      .from('spots')
      .select('*')
      .eq('is_active', true); 
      // Adminの場合は .eq('is_active', true) を外すロジックを入れても良い
  },

};