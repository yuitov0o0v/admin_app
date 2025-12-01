alter table "public"."spot_visit" drop constraint "spot_visit_spot_id_fkey";

alter table "public"."spot_visit" add column "event_name_snapshot" text;

alter table "public"."spot_visit" add column "spot_name_snapshot" text;

alter table "public"."user_profile" drop column "age";

alter table "public"."user_profile" add column "birth_date" date;

alter table "public"."spot_visit" add constraint "spot_visit_spot_id_fkey" FOREIGN KEY (spot_id) REFERENCES public.spots(id) ON DELETE SET NULL not valid;

alter table "public"."spot_visit" validate constraint "spot_visit_spot_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.snapshot_spot_visit_names()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- スポット名のコピー
  IF NEW.spot_id IS NOT NULL THEN
    SELECT name INTO NEW.spot_name_snapshot FROM public.spots WHERE id = NEW.spot_id;
  END IF;
  -- イベント名のコピー
  IF NEW.event_id IS NOT NULL THEN
    SELECT name INTO NEW.event_name_snapshot FROM public.events WHERE id = NEW.event_id;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_event_spots_transaction(p_event_id uuid, p_spot_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- 1. 既存の構成を削除
  -- トランザクション内なので、この瞬間は外部からは見えません
  DELETE FROM public.event_spot
  WHERE event_id = p_event_id;

  -- 2. 配列を展開して一括高速登録（バルクインサート）
  -- ループ処理を使わず、UNNESTで一発で登録するため超高速です
  INSERT INTO public.event_spot (event_id, spot_id, order_in_event)
  SELECT 
    p_event_id, 
    u.spot_id, 
    u.ord -- 配列の順番がそのまま order_in_event (1, 2, 3...) になります
  FROM unnest(p_spot_ids) WITH ORDINALITY AS u(spot_id, ord);
END;
$function$
;

create or replace view "public"."view_user_profile_with_age" as  SELECT id,
    user_id,
    email,
    username,
    role,
    gender,
    address,
    is_active,
    last_login_at,
    created_at,
    updated_at,
    birth_date,
    (EXTRACT(year FROM age((CURRENT_DATE)::timestamp with time zone, (birth_date)::timestamp with time zone)))::integer AS current_age
   FROM public.user_profile;


CREATE TRIGGER on_spot_visit_insert BEFORE INSERT ON public.spot_visit FOR EACH ROW EXECUTE FUNCTION public.snapshot_spot_visit_names();


