import { supabase } from '../supabaseClient';
import type{ TablesInsert } from '../../types/supabase';

type VisitInsert = TablesInsert<'spot_visit'>;

export const visitsApi = {
  /**
   * スポットへのチェックイン（訪問記録作成）
   */
  checkIn: async (data: VisitInsert) => {
    return await supabase
      .from('spot_visit')
      .insert(data)
      .select()
      .single();
  },

  /**
   * ユーザーの全訪問履歴を取得
   */
  getMyVisits: async (userId: string) => {
    return await supabase
      .from('spot_visit')
      .select(`
        *,
        spots (
          name,
          image_url
        )
      `)
      .eq('user_id', userId)
      .order('visited_at', { ascending: false });
  },
  
  /**
   * 特定のスポット・イベントに対する訪問済みチェック
   * マップ上で「訪問済み」ピンを表示する際などに使用
   */
  getVisitedSpotIds: async (userId: string, eventId?: string) => {
    let query = supabase
      .from('spot_visit')
      .select('spot_id')
      .eq('user_id', userId);

    if (eventId) {
      query = query.eq('event_id', eventId);
    }
    
    return await query;
  }
};