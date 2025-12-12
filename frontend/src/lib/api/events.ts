import { supabase } from '../supabaseClient';
import type { TablesInsert, TablesUpdate, Database } from '../../types/supabase';

//
// ---- Types ----
//
export type EventInsert = TablesInsert<'events'>;
export type EventUpdate = TablesUpdate<'events'>;
export type UserProgress = Database['public']['Views']['user_event_progress']['Row'];

//
// ---- API ----
//
export const eventsApi = {
  // =====================================================================
  // Public (一般ユーザー向け)
  // =====================================================================

  /**
   * 公開中かつ開催中のイベント一覧を取得（ユーザー向け）
   */
  getPublicEvents: async () => {
    return await supabase
      .from('events')
      .select('*')
      .eq('is_public', true)
      .eq('status', true)
      .order('start_time', { ascending: true });
  },

  /**
   * イベント詳細と、関連するスポット一覧を順序通りに取得
   */
  getEventWithSpots: async (eventId: string) => {
    return await supabase
      .from('events')
      .select(`
        *,
        event_spot!inner (
          order_in_event,
          spots (*)
        )
      `)
      .eq('id', eventId)
      .order('order_in_event', { foreignTable: 'event_spot', ascending: true })
      .single();
  },

  /**
   * ユーザーのイベント進捗状況を取得（View利用）
   */
  getUserProgress: async (userId: string) => {
    return await supabase
      .from('user_event_progress')
      .select('*')
      .eq('user_id', userId);
  },

  // =====================================================================
  // Admin（管理者向け）
  // =====================================================================

  /**
   * 全イベント一覧を取得（管理画面用）
   * ※ 公開・非公開・終了済み問わず取得
   */
  getAll: async () => {
    return await supabase
      .from('events')
      .select('*')
      .order('start_time', { ascending: true });
  },

  /**
   * イベント作成（管理者）
   */
  create: async (event: EventInsert) => {
    return await supabase.from('events').insert(event).select().single();
  },

  /**
   * イベント更新（管理者）
   */
  update: async (id: string, updates: EventUpdate) => {
    return await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
  },

  /**
   * イベント削除（管理者）
   */
  delete: async (id: string) => {
    return await supabase.from('events').delete().eq('id', id);
  },

  /**
   * イベントのスポット構成を一括更新（トランザクション RPC）
   * @example spotIds = ["1", "2", "3"] → 順に order_in_event = 1,2,3 を付与
   */
  updateEventSpots: async (eventId: string, spotIds: string[]) => {
    return await supabase.rpc('update_event_spots_transaction', {
      p_event_id: eventId,
      p_spot_ids: spotIds
    });
  }
};
