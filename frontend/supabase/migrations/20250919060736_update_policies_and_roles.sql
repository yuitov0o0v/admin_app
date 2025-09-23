create table "public"."spots" (
    "id" bigint not null,
    "title" text not null,
    "subtitle" text,
    "latitude" numeric not null,
    "logitude" numeric not null,
    "pin_color" text not null,
    "radius" integer,
    "image_url" text,
    "description" text,
    "category" integer,
    "ar_model_id" bigint,
    "address" text not null,
    "is_active" boolean not null,
    "created_by_user" uuid not null default auth.uid(),
    "updated_at" timestamp with time zone not null,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."spots" enable row level security;

alter table "public"."spots" add constraint "spot_ar_model_id_fkey" FOREIGN KEY (ar_model_id) REFERENCES ar_model(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."spots" validate constraint "spot_ar_model_id_fkey";

grant delete on table "public"."spots" to "anon";

grant insert on table "public"."spots" to "anon";

grant references on table "public"."spots" to "anon";

grant select on table "public"."spots" to "anon";

grant trigger on table "public"."spots" to "anon";

grant truncate on table "public"."spots" to "anon";

grant update on table "public"."spots" to "anon";

grant delete on table "public"."spots" to "authenticated";

grant insert on table "public"."spots" to "authenticated";

grant references on table "public"."spots" to "authenticated";

grant select on table "public"."spots" to "authenticated";

grant trigger on table "public"."spots" to "authenticated";

grant truncate on table "public"."spots" to "authenticated";

grant update on table "public"."spots" to "authenticated";

grant delete on table "public"."spots" to "service_role";

grant insert on table "public"."spots" to "service_role";

grant references on table "public"."spots" to "service_role";

grant select on table "public"."spots" to "service_role";

grant trigger on table "public"."spots" to "service_role";

grant truncate on table "public"."spots" to "service_role";

grant update on table "public"."spots" to "service_role";

create policy "spot_delate_policy"
on "public"."spots"
as permissive
for delete
to authenticated
using ((( SELECT user_profile_1.role
   FROM user_profile user_profile_1
  WHERE (user_profile_1.user_id = ( SELECT auth.uid() AS uid))) = 'admin'::user_role));


create policy "spot_insert_policy"
on "public"."spots"
as permissive
for insert
to public
with check ((( SELECT user_profile_1.role
   FROM user_profile user_profile_1
  WHERE (user_profile_1.user_id = ( SELECT auth.uid() AS uid))) = 'admin'::user_role));


create policy "spot_serect_policy"
on "public"."spots"
as permissive
for select
to authenticated
using (((is_active = true) OR (( SELECT user_profile_1.role
   FROM user_profile user_profile_1
  WHERE (user_profile_1.user_id = ( SELECT auth.uid() AS uid))) = 'admin'::user_role)));


create policy "spot_update_policy"
on "public"."spots"
as permissive
for update
to authenticated
using ((( SELECT user_profile_1.role
   FROM user_profile user_profile_1
  WHERE (user_profile_1.user_id = ( SELECT auth.uid() AS uid))) = 'admin'::user_role))
with check ((( SELECT user_profile_1.role
   FROM user_profile user_profile_1
  WHERE (user_profile_1.user_id = ( SELECT auth.uid() AS uid))) = 'admin'::user_role));



