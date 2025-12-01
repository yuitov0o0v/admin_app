import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// ==========================================
// 型エイリアス定義
// ==========================================

// テーブル型のショートハンド
export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row'];

export type Insertable<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Insert'];

export type Updatable<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Update'];

// 個別のテーブル型
export type Spot = Tables<'spots'>;
export type Event = Tables<'events'>;
export type SpotVisit = Tables<'spot_visit'>;
export type UserProfile = Tables<'user_profile'>;
export type ArModel = Tables<'ar_model'>;
export type EventSpot = Tables<'event_spot'>;
export type Invitation = Tables<'invitations'>;

// Insert型
export type SpotInsert = Insertable<'spots'>;
export type EventInsert = Insertable<'events'>;
export type SpotVisitInsert = Insertable<'spot_visit'>;

// Update型
export type SpotUpdate = Updatable<'spots'>;
export type EventUpdate = Updatable<'events'>;
export type UserProfileUpdate = Updatable<'user_profile'>;

// View型
export type SpotStatistics = Database['public']['Views']['spot_statistics']['Row'];
export type UserEventProgress = Database['public']['Views']['user_event_progress']['Row'];

// Enum型
export type UserRole = Database['public']['Enums']['user_role'];

// Function戻り値型
export type InvitationResult = Database['public']['Functions']['create_invitation']['Returns'];
export type RoleChangeResult = Database['public']['Functions']['set_user_role']['Returns'];

// ==========================================
// 型安全なSupabaseクライアント
// ==========================================

export type TypedSupabaseClient = ReturnType<typeof createClient<Database>>;

export function createTypedSupabaseClient(
  supabaseUrl: string,
  supabaseKey: string
): TypedSupabaseClient {
  return createClient<Database>(supabaseUrl, supabaseKey);
}

// ==========================================
// クエリビルダーヘルパー
// ==========================================

/**
 * 型安全なクエリビルダー
 */
export class QueryBuilder<T extends keyof Database['public']['Tables']> {
  constructor(
    protected client: TypedSupabaseClient,
    protected tableName: T
  ) {}

  /**
   * 全件取得
   */
  async getAll() {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*');
    
    if (error) throw error;
    return data;
  }

  /**
   * ID指定で1件取得
   */
  async getById(id: string) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * 条件指定で複数件取得
   */
  async getWhere(column: string, value: any) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq(column, value);
    
    if (error) throw error;
    return data;
  }

  /**
   * 新規作成
   */
  async create(values: Insertable<T>) {
    const { data, error } = await this.client
      .from(this.tableName)
      .insert(values)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * 更新
   */
  async update(id: string, values: Updatable<T>) {
    const { data, error } = await this.client
      .from(this.tableName)
      .update(values)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * 削除
   */
  async delete(id: string) {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

// ==========================================
// 関数呼び出しヘルパー
// ==========================================

/**
 * RPCファンクション呼び出しヘルパー
 */
export class RPCHelper {
  constructor(protected client: TypedSupabaseClient) {}

  /**
   * 管理者チェック
   */
  async isAdmin(): Promise<boolean> {
    const { data, error } = await this.client.rpc('is_admin');
    if (error) throw error;
    return data ?? false;
  }

  /**
   * ユーザーロール取得
   */
  async getUserRole(): Promise<string> {
    const { data, error } = await this.client.rpc('get_user_role');
    if (error) throw error;
    return data ?? 'user';
  }

  /**
   * 招待作成
   */
  async createInvitation(email: string, role: UserRole = 'admin') {
    const { data, error } = await this.client.rpc('create_invitation', {
      p_email: email,
      p_role: role
    });
    if (error) throw error;
    return data;
  }

  /**
   * 招待確認
   */
  async checkInvitation(email: string) {
    const { data, error } = await this.client.rpc('check_invitation', {
      p_email: email
    });
    if (error) throw error;
    return data;
  }

  /**
   * ユーザーロール変更
   */
  async setUserRole(userId: string, newRole: UserRole) {
    const { data, error } = await this.client.rpc('set_user_role', {
      p_user_id: userId,
      p_new_role: newRole
    });
    if (error) throw error;
    return data;
  }

  /**
   * 招待一覧取得
   */
  async getInvitations(status?: string, limit = 50, offset = 0) {
    const { data, error } = await this.client.rpc('get_invitations', {
      p_status: status ?? null,
      p_limit: limit,
      p_offset: offset
    });
    if (error) throw error;
    return data;
  }

  /**
   * 期限切れ招待の更新
   */
  async expireOldInvitations() {
    const { data, error } = await this.client.rpc('expire_old_invitations');
    if (error) throw error;
    return data;
  }

  /**
   * イベントスポット更新（トランザクション）
   */
  async updateEventSpots(eventId: string, spotIds: string[]) {
    const { error } = await this.client.rpc('update_event_spots_transaction', {
      p_event_id: eventId,
      p_spot_ids: spotIds
    });
    if (error) throw error;
  }
}

// ==========================================
// 特定テーブル用の専用ヘルパー
// ==========================================

/**
 * Spotsテーブル専用ヘルパー
 */
export class SpotsHelper extends QueryBuilder<'spots'> {
  /**
   * アクティブなスポットのみ取得
   */
  async getActiveSpots() {
    const { data, error } = await this.client
      .from('spots')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  /**
   * 位置情報で近くのスポットを検索
   */
  async getNearbySpots(latitude: number, longitude: number, radiusKm = 5) {
    const { data, error } = await this.client
      .from('spots')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null);
    
    if (error) throw error;
    
    // 簡易的な距離計算（より正確にはPostGISを使用）
    return data?.filter(spot => {
      const distance = this.calculateDistance(
        latitude, 
        longitude, 
        Number(spot.latitude), 
        Number(spot.longitude)
      );
      return distance <= radiusKm;
    });
  }

  /**
   * カテゴリ別スポット取得
   */
  async getByCategory(category: string) {
    const { data, error } = await this.client
      .from('spots')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .is('deleted_at', null);
    
    if (error) throw error;
    return data;
  }

  /**
   * 2点間の距離を計算（km）
   */
  private calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371; // 地球の半径（km）
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
      Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

/**
 * Eventsテーブル専用ヘルパー
 */
export class EventsHelper extends QueryBuilder<'events'> {
  /**
   * 公開イベントのみ取得
   */
  async getPublicEvents() {
    const { data, error } = await this.client
      .from('events')
      .select('*')
      .eq('is_public', true)
      .eq('status', true)
      .order('start_time', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  /**
   * 進行中のイベント取得
   */
  async getOngoingEvents() {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from('events')
      .select('*')
      .eq('is_public', true)
      .eq('status', true)
      .lte('start_time', now)
      .gte('end_time', now);
    
    if (error) throw error;
    return data;
  }

  /**
   * イベントとスポットを結合して取得
   */
  async getEventWithSpots(eventId: string) {
    const { data, error } = await this.client
      .from('events')
      .select(`
        *,
        event_spot (
          order_in_event,
          spots (*)
        )
      `)
      .eq('id', eventId)
      .single();
    
    if (error) throw error;
    return data;
  }
}

/**
 * SpotVisitテーブル専用ヘルパー
 */
export class SpotVisitHelper extends QueryBuilder<'spot_visit'> {
  /**
   * ユーザーの訪問履歴取得
   */
  async getUserVisits(userId: string) {
    const { data, error } = await this.client
      .from('spot_visit')
      .select(`
        *,
        spots (name, category, image_url),
        events (name)
      `)
      .eq('user_id', userId)
      .order('visited_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  /**
   * スポットの訪問記録
   */
  async recordVisit(visit: SpotVisitInsert) {
    return this.create(visit);
  }

  /**
   * イベント内のユーザー進捗取得
   */
  async getUserEventProgress(userId: string, eventId: string) {
    const { data, error } = await this.client
      .from('user_event_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .single();
    
    if (error) throw error;
    return data;
  }
}

// ==========================================
// ファクトリー関数
// ==========================================

/**
 * 統合ヘルパーファクトリー
 */
export function createSupabaseHelpers(client: TypedSupabaseClient) {
  return {
    spots: new SpotsHelper(client, 'spots'),
    events: new EventsHelper(client, 'events'),
    spotVisits: new SpotVisitHelper(client, 'spot_visit'),
    userProfiles: new QueryBuilder(client, 'user_profile'),
    arModels: new QueryBuilder(client, 'ar_model'),
    invitations: new QueryBuilder(client, 'invitations'),
    rpc: new RPCHelper(client),
  };
}

// ==========================================
// エラーハンドリングヘルパー
// ==========================================

export interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export function handleSupabaseError(error: any): SupabaseError {
  return {
    message: error.message || 'An unknown error occurred',
    details: error.details,
    hint: error.hint,
    code: error.code,
  };
}

/**
 * エラーハンドリング付きクエリ実行
 */
export async function safeQuery<T>(
  queryFn: () => Promise<T>
): Promise<{ data: T | null; error: SupabaseError | null }> {
  try {
    const data = await queryFn();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleSupabaseError(err) };
  }
}