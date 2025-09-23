drop policy "Admin can all own AR models" on "public"."ar_model";

drop policy "event_dalate_policy" on "public"."event";

drop policy "event_spot_derate_policy" on "public"."event_spot";

drop policy "spot_visit_delate_policy" on "public"."spot_visit";

drop policy "spot_delate_policy" on "public"."spots";

drop policy "spot_insert_policy" on "public"."spots";

drop policy "spot_serect_policy" on "public"."spots";

drop policy "spot_update_policy" on "public"."spots";

drop policy "create_policy" on "public"."user_profile";

drop policy "delete_policy" on "public"."user_profile";

drop policy "select_policy" on "public"."user_profile";

drop policy "update_policy" on "public"."user_profile";

drop policy "event_insert_policy" on "public"."event";

drop policy "event_select_policy" on "public"."event";

drop policy "event_update_policy" on "public"."event";

drop policy "event_spot_insert_policy" on "public"."event_spot";

drop policy "event_spot_select_policy" on "public"."event_spot";

drop policy "event_spot_update_policy" on "public"."event_spot";

drop policy "spot_visit_insert_policy" on "public"."spot_visit";

drop policy "spot_visit_select_policy" on "public"."spot_visit";

drop policy "spot_visit_update_policy" on "public"."spot_visit";

create table "public"."invitations" (
    "id" bigint generated always as identity not null,
    "email" text not null,
    "status" text not null default 'pending'::text,
    "invited_by" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."invitations" enable row level security;

CREATE UNIQUE INDEX invitations_email_key ON public.invitations USING btree (email);

CREATE UNIQUE INDEX invitations_pkey ON public.invitations USING btree (id);

alter table "public"."invitations" add constraint "invitations_pkey" PRIMARY KEY using index "invitations_pkey";

alter table "public"."invitations" add constraint "invitations_email_key" UNIQUE using index "invitations_email_key";

alter table "public"."invitations" add constraint "invitations_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) not valid;

alter table "public"."invitations" validate constraint "invitations_invited_by_fkey";

alter table "public"."invitations" add constraint "invitations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text]))) not valid;

alter table "public"."invitations" validate constraint "invitations_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_invitations()
 RETURNS TABLE(id bigint, email text, status text, invited_by_email text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- 現在のユーザーが管理者かチェック
  IF NOT (SELECT public.is_admin()) THEN
    RAISE EXCEPTION 'Only administrators can view invitations';
  END IF;

  RETURN QUERY
  SELECT 
    i.id,
    i.email,
    i.status,
    u.email as invited_by_email,
    i.created_at
  FROM public.invitations i
  LEFT JOIN auth.users u ON i.invited_by = u.id
  ORDER BY i.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  invitation_exists boolean;
BEGIN
  -- user_profileレコードを作成
  INSERT INTO public.user_profile (user_id, role)
  VALUES (NEW.id, 'user'::public.user_role);

  -- 招待されているメールアドレスかチェック
  SELECT EXISTS (
    SELECT 1 
    FROM public.invitations 
    WHERE email = NEW.email AND status = 'pending'
  ) INTO invitation_exists;

  -- 招待されている場合はadminロールに変更
  IF invitation_exists THEN
    UPDATE public.user_profile 
    SET role = 'admin'::public.user_role 
    WHERE user_id = NEW.id;
    
    -- 招待ステータスを更新
    UPDATE public.invitations 
    SET status = 'accepted', updated_at = now() 
    WHERE email = NEW.email;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


CREATE OR REPLACE FUNCTION public.invite_admin(email_to_invite text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  result json;
BEGIN
  -- 現在のユーザーが管理者かチェック
  IF NOT (SELECT public.is_admin()) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Only administrators can invite new admins'
    );
  END IF;

  -- 既に招待済みかチェック
  IF EXISTS (SELECT 1 FROM public.invitations WHERE email = email_to_invite) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Email already invited'
    );
  END IF;

  -- 招待レコードを作成
  INSERT INTO public.invitations (email, invited_by)
  VALUES (email_to_invite, (SELECT auth.uid()));

  RETURN json_build_object(
    'success', true,
    'message', 'Admin invitation sent successfully'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN COALESCE(
    (SELECT public.user_profile.role = 'admin'::public.user_role
     FROM public.user_profile
     WHERE public.user_profile.user_id = (SELECT auth.uid())),
    false
  );
END;
$function$
;

grant delete on table "public"."invitations" to "anon";

grant insert on table "public"."invitations" to "anon";

grant references on table "public"."invitations" to "anon";

grant select on table "public"."invitations" to "anon";

grant trigger on table "public"."invitations" to "anon";

grant truncate on table "public"."invitations" to "anon";

grant update on table "public"."invitations" to "anon";

grant delete on table "public"."invitations" to "authenticated";

grant insert on table "public"."invitations" to "authenticated";

grant references on table "public"."invitations" to "authenticated";

grant select on table "public"."invitations" to "authenticated";

grant trigger on table "public"."invitations" to "authenticated";

grant truncate on table "public"."invitations" to "authenticated";

grant update on table "public"."invitations" to "authenticated";

grant delete on table "public"."invitations" to "service_role";

grant insert on table "public"."invitations" to "service_role";

grant references on table "public"."invitations" to "service_role";

grant select on table "public"."invitations" to "service_role";

grant trigger on table "public"."invitations" to "service_role";

grant truncate on table "public"."invitations" to "service_role";

grant update on table "public"."invitations" to "service_role";

create policy "ar_model_delete_policy"
on "public"."ar_model"
as permissive
for delete
to authenticated
using ((( SELECT is_admin() AS is_admin) OR (created_by_user_id = ( SELECT auth.uid() AS uid))));


create policy "ar_model_insert_policy"
on "public"."ar_model"
as permissive
for insert
to authenticated
with check ((( SELECT is_admin() AS is_admin) OR (created_by_user_id = ( SELECT auth.uid() AS uid))));


create policy "ar_model_select_policy"
on "public"."ar_model"
as permissive
for select
to authenticated
using (true);


create policy "ar_model_update_policy"
on "public"."ar_model"
as permissive
for update
to authenticated
using ((( SELECT is_admin() AS is_admin) OR (created_by_user_id = ( SELECT auth.uid() AS uid))))
with check ((( SELECT is_admin() AS is_admin) OR (created_by_user_id = ( SELECT auth.uid() AS uid))));


create policy "event_delete_policy"
on "public"."event"
as permissive
for delete
to authenticated
using ((( SELECT is_admin() AS is_admin) OR (created_by_user = ( SELECT auth.uid() AS uid))));


create policy "event_spot_delete_policy"
on "public"."event_spot"
as permissive
for delete
to authenticated
using ((EXISTS ( SELECT 1
   FROM event
  WHERE ((event.id = event_spot.event_id) AND (( SELECT is_admin() AS is_admin) OR (event.created_by_user = ( SELECT auth.uid() AS uid)))))));


create policy "invitations_delete_policy"
on "public"."invitations"
as permissive
for delete
to authenticated
using (( SELECT is_admin() AS is_admin));


create policy "invitations_insert_policy"
on "public"."invitations"
as permissive
for insert
to authenticated
with check (( SELECT is_admin() AS is_admin));


create policy "invitations_select_policy"
on "public"."invitations"
as permissive
for select
to authenticated
using (( SELECT is_admin() AS is_admin));


create policy "invitations_update_policy"
on "public"."invitations"
as permissive
for update
to authenticated
using (( SELECT is_admin() AS is_admin))
with check (( SELECT is_admin() AS is_admin));


create policy "spot_visit_delete_policy"
on "public"."spot_visit"
as permissive
for delete
to authenticated
using ((( SELECT is_admin() AS is_admin) OR (user_id = ( SELECT auth.uid() AS uid))));


create policy "spots_delete_policy"
on "public"."spots"
as permissive
for delete
to authenticated
using ((( SELECT is_admin() AS is_admin) OR (created_by_user = ( SELECT auth.uid() AS uid))));


create policy "spots_insert_policy"
on "public"."spots"
as permissive
for insert
to authenticated
with check ((( SELECT is_admin() AS is_admin) OR (created_by_user = ( SELECT auth.uid() AS uid))));


create policy "spots_select_policy"
on "public"."spots"
as permissive
for select
to authenticated
using (((is_active = true) OR ( SELECT is_admin() AS is_admin) OR (created_by_user = ( SELECT auth.uid() AS uid))));


create policy "spots_update_policy"
on "public"."spots"
as permissive
for update
to authenticated
using ((( SELECT is_admin() AS is_admin) OR (created_by_user = ( SELECT auth.uid() AS uid))))
with check ((( SELECT is_admin() AS is_admin) OR (created_by_user = ( SELECT auth.uid() AS uid))));


create policy "user_profile_delete_policy"
on "public"."user_profile"
as permissive
for delete
to authenticated
using ((( SELECT is_admin() AS is_admin) OR (user_id = ( SELECT auth.uid() AS uid))));


create policy "user_profile_insert_policy"
on "public"."user_profile"
as permissive
for insert
to authenticated
with check ((( SELECT is_admin() AS is_admin) OR (user_id = ( SELECT auth.uid() AS uid))));


create policy "user_profile_select_policy"
on "public"."user_profile"
as permissive
for select
to authenticated
using ((( SELECT is_admin() AS is_admin) OR (user_id = ( SELECT auth.uid() AS uid))));


create policy "user_profile_update_policy"
on "public"."user_profile"
as permissive
for update
to authenticated
using ((( SELECT is_admin() AS is_admin) OR (user_id = ( SELECT auth.uid() AS uid))))
with check ((( SELECT is_admin() AS is_admin) OR (user_id = ( SELECT auth.uid() AS uid))));


create policy "event_insert_policy"
on "public"."event"
as permissive
for insert
to authenticated
with check ((( SELECT is_admin() AS is_admin) OR (created_by_user = ( SELECT auth.uid() AS uid))));


create policy "event_select_policy"
on "public"."event"
as permissive
for select
to authenticated
using (((is_public = true) OR ( SELECT is_admin() AS is_admin) OR (created_by_user = ( SELECT auth.uid() AS uid))));


create policy "event_update_policy"
on "public"."event"
as permissive
for update
to authenticated
using ((( SELECT is_admin() AS is_admin) OR (created_by_user = ( SELECT auth.uid() AS uid))))
with check ((( SELECT is_admin() AS is_admin) OR (created_by_user = ( SELECT auth.uid() AS uid))));


create policy "event_spot_insert_policy"
on "public"."event_spot"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM event
  WHERE ((event.id = event_spot.event_id) AND (( SELECT is_admin() AS is_admin) OR (event.created_by_user = ( SELECT auth.uid() AS uid)))))));


create policy "event_spot_select_policy"
on "public"."event_spot"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM event
  WHERE ((event.id = event_spot.event_id) AND ((event.is_public = true) OR ( SELECT is_admin() AS is_admin) OR (event.created_by_user = ( SELECT auth.uid() AS uid)))))));


create policy "event_spot_update_policy"
on "public"."event_spot"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM event
  WHERE ((event.id = event_spot.event_id) AND (( SELECT is_admin() AS is_admin) OR (event.created_by_user = ( SELECT auth.uid() AS uid)))))))
with check ((EXISTS ( SELECT 1
   FROM event
  WHERE ((event.id = event_spot.event_id) AND (( SELECT is_admin() AS is_admin) OR (event.created_by_user = ( SELECT auth.uid() AS uid)))))));


create policy "spot_visit_insert_policy"
on "public"."spot_visit"
as permissive
for insert
to authenticated
with check ((( SELECT is_admin() AS is_admin) OR (user_id = ( SELECT auth.uid() AS uid))));


create policy "spot_visit_select_policy"
on "public"."spot_visit"
as permissive
for select
to authenticated
using ((( SELECT is_admin() AS is_admin) OR (user_id = ( SELECT auth.uid() AS uid))));


create policy "spot_visit_update_policy"
on "public"."spot_visit"
as permissive
for update
to authenticated
using ((( SELECT is_admin() AS is_admin) OR (user_id = ( SELECT auth.uid() AS uid))))
with check ((( SELECT is_admin() AS is_admin) OR (user_id = ( SELECT auth.uid() AS uid))));




