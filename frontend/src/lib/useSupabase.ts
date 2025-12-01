import { useState, useEffect, useCallback } from 'react';
import type { 
  TypedSupabaseClient, 
  Spot, 
  Event, 
  SpotVisit,
  UserProfile,
  SpotStatistics,
  UserEventProgress,
  SupabaseError 
} from '../types/supabase';

// ==========================================
// 基本的なデータフェッチフック
// ==========================================

interface UseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: SupabaseError | null;
  refetch: () => Promise<void>;
}

/**
 * 汎用クエリフック
 */
export function useQuery<T>(
  queryFn: () => Promise<T>,
  deps: React.DependencyList = []
): UseQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<SupabaseError | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await queryFn();
      setData(result);
    } catch (err: any) {
      setError({
        message: err.message || 'An error occurred',
        details: err.details,
        hint: err.hint,
        code: err.code,
      });
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ==========================================
// Spots関連フック
// ==========================================

/**
 * アクティブなスポット一覧取得
 */
export function useActiveSpots(client: TypedSupabaseClient) {
  return useQuery(async () => {
    const { data, error } = await client
      .from('spots')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }, [client]);
}

/**
 * 特定のスポット取得
 */
export function useSpot(client: TypedSupabaseClient, spotId: string | null) {
  return useQuery(async () => {
    if (!spotId) return null;
    
    const { data, error } = await client
      .from('spots')
      .select('*')
      .eq('id', spotId)
      .single();
    
    if (error) throw error;
    return data;
  }, [client, spotId]);
}

/**
 * スポット統計情報取得
 */
export function useSpotStatistics(client: TypedSupabaseClient, spotId?: string) {
  return useQuery<SpotStatistics[]>(async () => {
    let query = client.from('spot_statistics').select('*');
    
    if (spotId) {
      query = query.eq('spot_id', spotId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }, [client, spotId]);
}

// ==========================================
// Events関連フック
// ==========================================

/**
 * 公開イベント一覧取得
 */
export function usePublicEvents(client: TypedSupabaseClient) {
  return useQuery(async () => {
    const { data, error } = await client
      .from('events')
      .select('*')
      .eq('is_public', true)
      .eq('status', true)
      .order('start_time', { ascending: false });
    
    if (error) throw error;
    return data;
  }, [client]);
}

/**
 * イベント詳細とスポット一覧取得
 */
export function useEventWithSpots(client: TypedSupabaseClient, eventId: string | null) {
  return useQuery(async () => {
    if (!eventId) return null;
    
    const { data, error } = await client
      .from('events')
      .select(`
        *,
        event_spot (
          order_in_event,
          spot_id,
          spots (*)
        )
      `)
      .eq('id', eventId)
      .single();
    
    if (error) throw error;
    return data;
  }, [client, eventId]);
}

// ==========================================
// ユーザープロフィール関連フック
// ==========================================

/**
 * 現在のユーザープロフィール取得
 */
export function useCurrentUserProfile(client: TypedSupabaseClient) {
  return useQuery(async () => {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;
    
    const { data, error } = await client
      .from('user_profile')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error) throw error;
    return data;
  }, [client]);
}

/**
 * 管理者権限チェック
 */
export function useIsAdmin(client: TypedSupabaseClient) {
  return useQuery(async () => {
    const { data, error } = await client.rpc('is_admin');
    if (error) throw error;
    return data ?? false;
  }, [client]);
}

// ==========================================
// SpotVisit関連フック
// ==========================================

/**
 * ユーザーの訪問履歴取得
 */
export function useUserVisits(client: TypedSupabaseClient, userId?: string) {
  return useQuery(async () => {
    const { data: { user } } = await client.auth.getUser();
    const targetUserId = userId || user?.id;
    
    if (!targetUserId) return [];
    
    const { data, error } = await client
      .from('spot_visit')
      .select(`
        *,
        spots (name, category, image_url),
        events (name)
      `)
      .eq('user_id', targetUserId)
      .order('visited_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }, [client, userId]);
}

/**
 * イベント進捗状況取得
 */
export function useEventProgress(
  client: TypedSupabaseClient, 
  userId?: string, 
  eventId?: string
) {
  return useQuery<UserEventProgress[]>(async () => {
    const { data: { user } } = await client.auth.getUser();
    const targetUserId = userId || user?.id;
    
    if (!targetUserId) return [];
    
    let query = client
      .from('user_event_progress')
      .select('*')
      .eq('user_id', targetUserId);
    
    if (eventId) {
      query = query.eq('event_id', eventId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }, [client, userId, eventId]);
}

// ==========================================
// ミューテーションフック
// ==========================================

interface UseMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>;
  data: TData | null;
  loading: boolean;
  error: SupabaseError | null;
  reset: () => void;
}

/**
 * 汎用ミューテーションフック
 */
export function useMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>
): UseMutationResult<TData, TVariables> {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<SupabaseError | null>(null);

  const mutate = useCallback(async (variables: TVariables) => {
    try {
      setLoading(true);
      setError(null);
      const result = await mutationFn(variables);
      setData(result);
      return result;
    } catch (err: any) {
      const error = {
        message: err.message || 'An error occurred',
        details: err.details,
        hint: err.hint,
        code: err.code,
      };
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [mutationFn]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { mutate, data, loading, error, reset };
}

/**
 * スポット訪問記録用フック
 */
export function useRecordVisit(client: TypedSupabaseClient) {
  return useMutation(async (visit: {
    spot_id: string;
    event_id?: string;
    latitude?: number;
    longitude?: number;
  }) => {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data, error } = await client
      .from('spot_visit')
      .insert({
        user_id: user.id,
        ...visit,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  });
}

/**
 * スポット作成用フック
 */
export function useCreateSpot(client: TypedSupabaseClient) {
  return useMutation(async (spot: {
    name: string;
    description: string;
    address: string;
    latitude: number;
    longitude: number;
    category?: string;
    radius?: number;
    image_url?: string;
    ar_model_id?: string;
  }) => {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data, error } = await client
      .from('spots')
      .insert({
        ...spot,
        created_by_user: user.id,
        is_active: false, // 管理者が承認するまで非公開
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  });
}

/**
 * イベント作成用フック
 */
export function useCreateEvent(client: TypedSupabaseClient) {
  return useMutation(async (event: {
    name: string;
    description?: string;
    organizer?: string;
    image_url?: string;
    start_time?: string;
    end_time?: string;
    is_public?: boolean;
  }) => {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data, error } = await client
      .from('events')
      .insert({
        ...event,
        created_by_user: user.id,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  });
}

/**
 * 招待作成用フック
 */
export function useCreateInvitation(client: TypedSupabaseClient) {
  return useMutation(async (invitation: {
    email: string;
    role?: 'user' | 'admin';
  }) => {
    const { data, error } = await client.rpc('create_invitation', {
      p_email: invitation.email,
      p_role: invitation.role || 'admin',
    });
    
    if (error) throw error;
    return data;
  });
}

/**
 * ユーザーロール変更用フック
 */
export function useSetUserRole(client: TypedSupabaseClient) {
  return useMutation(async (params: {
    userId: string;
    role: 'user' | 'admin';
  }) => {
    const { data, error } = await client.rpc('set_user_role', {
      p_user_id: params.userId,
      p_new_role: params.role,
    });
    
    if (error) throw error;
    return data;
  });
}

// ==========================================
// リアルタイムサブスクリプションフック
// ==========================================

/**
 * テーブルの変更をリアルタイムで監視
 */
export function useRealtimeSubscription<T extends { id: string }>(
  client: TypedSupabaseClient,
  table: string,
  filter?: { column: string; value: any }
) {
  const [data, setData] = useState<T[]>([]);

  useEffect(() => {
    const channel = client
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: filter ? `${filter.column}=eq.${filter.value}` : undefined,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setData((prev) => [...prev, payload.new as T]);
          } else if (payload.eventType === 'UPDATE') {
            setData((prev) =>
              prev.map((item) =>
                item.id === (payload.new as T).id ? (payload.new as T) : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setData((prev) =>
              prev.filter((item) => item.id !== (payload.old as T).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [client, table, filter?.column, filter?.value]);

  return data;
}

// ==========================================
// 使用例
// ==========================================

/*
使用例:

import { useActiveSpots, useRecordVisit } from './useSupabase';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/supabase';

const supabaseClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function SpotsPage() {
  const { data: spots, loading, error } = useActiveSpots(supabaseClient);
  const { mutate: recordVisit, loading: recording } = useRecordVisit(supabaseClient);

  const handleVisit = async (spotId: string) => {
    try {
      await recordVisit({ spot_id: spotId });
      alert('訪問を記録しました!');
    } catch (err) {
      console.error('Failed to record visit:', err);
    }
  };

  if (loading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error.message}</div>;

  return (
    <div>
      {spots?.map(spot => (
        <div key={spot.id}>
          <h3>{spot.name}</h3>
          <button onClick={() => handleVisit(spot.id)}>訪問記録</button>
        </div>
      ))}
    </div>
  );
}
*/