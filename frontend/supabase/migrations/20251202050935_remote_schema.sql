drop policy "Users and Admins can update profiles" on "public"."user_profile";

drop view if exists "public"."spot_statistics";

drop view if exists "public"."user_event_progress";

alter table "public"."spots" add column "deleted_at" timestamp with time zone;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.protect_role_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- ロールが変更されようとしているかチェック
  -- (IS DISTINCT FROM は、NULLも含めて厳密に比較する便利な書き方です)
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    
    -- 変更されようとしている場合、実行者がAdminかチェック
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: You cannot change your role directly.';
    END IF;
    
  END IF;
  
  -- 問題なければ（またはロール変更以外なら）そのまま処理続行
  RETURN NEW;
END;
$function$
;

create or replace view "public"."spot_statistics" as  SELECT s.id AS spot_id,
    s.name,
    s.category,
    count(DISTINCT sv.user_id) AS unique_visitors,
    count(sv.id) AS total_visits,
    max(sv.visited_at) AS last_visited,
    s.is_active
   FROM (public.spots s
     LEFT JOIN public.spot_visit sv ON ((sv.spot_id = s.id)))
  WHERE (s.deleted_at IS NULL)
  GROUP BY s.id, s.name, s.category, s.is_active;


CREATE OR REPLACE FUNCTION public.update_event_spots_transaction(p_event_id uuid, p_spot_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- 【追加部分】ここで実行者がAdminかどうかをチェックします
  -- Adminでなければ、処理を中断してエラーを返します
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only admins can manage event spots.';
  END IF;

  -- 1. 既存の構成を削除
  -- (トランザクション内なので、この瞬間は外部からは見えません)
  DELETE FROM public.event_spot
  WHERE event_id = p_event_id;

  -- 2. 配列を展開して一括高速登録
  -- (UNNESTを使って一発で登録します)
  INSERT INTO public.event_spot (event_id, spot_id, order_in_event)
  SELECT 
    p_event_id, 
    u.spot_id, 
    u.ord
  FROM unnest(p_spot_ids) WITH ORDINALITY AS u(spot_id, ord);
END;
$function$
;

create or replace view "public"."user_event_progress" as  SELECT sv.user_id,
    sv.event_id,
    e.name AS event_name,
    count(DISTINCT sv.spot_id) AS visited_spots,
    ( SELECT count(DISTINCT es.spot_id) AS count
           FROM public.event_spot es
          WHERE (es.event_id = sv.event_id)) AS total_spots,
    round((((count(DISTINCT sv.spot_id))::numeric / (NULLIF(( SELECT count(DISTINCT es.spot_id) AS count
           FROM public.event_spot es
          WHERE (es.event_id = sv.event_id)), 0))::numeric) * (100)::numeric), 2) AS completion_percentage,
    max(sv.visited_at) AS last_visit,
    count(sv.id) AS total_visits
   FROM (public.spot_visit sv
     JOIN public.events e ON ((e.id = sv.event_id)))
  GROUP BY sv.user_id, sv.event_id, e.name;



  create policy "Users and Admins can update profiles"
  on "public"."user_profile"
  as permissive
  for update
  to authenticated
using (((( SELECT auth.uid() AS uid) = user_id) OR ( SELECT public.is_admin() AS is_admin)))
with check (((( SELECT auth.uid() AS uid) = user_id) OR ( SELECT public.is_admin() AS is_admin)));


CREATE TRIGGER protect_role_change BEFORE UPDATE ON public.user_profile FOR EACH ROW EXECUTE FUNCTION public.protect_role_column();


