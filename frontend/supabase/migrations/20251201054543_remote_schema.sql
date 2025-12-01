


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "cube" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "earthdistance" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."user_role" AS ENUM (
    'user',
    'admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_invitation"("p_email" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_result json;
  v_invitation record;
BEGIN
  -- 有効な招待を検索
  SELECT 
    id,
    email,
    role,
    status,
    expires_at,
    created_at
  INTO v_invitation
  FROM public.invitations
  WHERE email = p_email
  AND status = 'pending'
  AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_invitation.id IS NULL THEN
    SELECT json_build_object(
      'valid', false,
      'message', 'No valid invitation found'
    ) INTO v_result;
  ELSE
    SELECT json_build_object(
      'valid', true,
      'email', v_invitation.email,
      'role', v_invitation.role::text,
      'expires_at', v_invitation.expires_at::text,
      'message', 'Valid invitation found'
    ) INTO v_result;
  END IF;
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."check_invitation"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_invitation"("p_email" "text", "p_role" "public"."user_role" DEFAULT 'admin'::"public"."user_role") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
DECLARE
  v_invitation_id uuid;
  v_result json;
BEGIN
  -- Adminチェック
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can create invitations';
  END IF;
  
  -- メール形式チェック
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- 既存の有効な招待をチェック
  IF EXISTS (
    SELECT 1 FROM public.invitations
    WHERE email = p_email
    AND status = 'pending'
    AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'An active invitation already exists for this email';
  END IF;
  
  -- 招待レコードを作成
  INSERT INTO public.invitations (
    email,
    role,
    invited_by,
    status,
    expires_at
  ) VALUES (
    p_email,
    p_role,
    auth.uid(),
    'pending',
    now() + interval '7 days'
  )
  RETURNING id INTO v_invitation_id;
  
  -- 結果を返す
  SELECT json_build_object(
    'id', v_invitation_id,
    'email', p_email,
    'role', p_role::text,
    'status', 'pending',
    'expires_at', (now() + interval '7 days')::text,
    'message', 'Invitation created successfully'
  ) INTO v_result;
  
  RETURN v_result;
END;
$_$;


ALTER FUNCTION "public"."create_invitation"("p_email" "text", "p_role" "public"."user_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  claims jsonb;
  user_role text;
BEGIN
  -- raw_app_metadataからロールを直接取得(Source of Truth)
  user_role := event->'user'->'raw_app_metadata'->>'role';

  -- クレームを構築
  claims := event->'claims';
  
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  ELSE
    claims := jsonb_set(claims, '{user_role}', '"user"');
  END IF;

  -- クレームを更新したイベントを返す
  event := jsonb_set(event, '{claims}', claims);
  
  RETURN event;
END;
$$;


ALTER FUNCTION "public"."custom_access_token_hook"("event" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_old_invitations"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE public.invitations
  SET 
    status = 'expired',
    updated_at = now()
  WHERE status = 'pending'
  AND expires_at < now();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$;


ALTER FUNCTION "public"."expire_old_invitations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_invitations"("p_status" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "email" "text", "role" "public"."user_role", "status" "text", "invited_by" "uuid", "invited_by_email" "text", "expires_at" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Adminチェック
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can view invitations';
  END IF;
  
  RETURN QUERY
  SELECT 
    i.id,
    i.email,
    i.role,
    i.status,
    i.invited_by,
    u.email as invited_by_email,
    i.expires_at,
    i.created_at,
    i.updated_at
  FROM public.invitations i
  LEFT JOIN auth.users u ON u.id = i.invited_by
  WHERE (p_status IS NULL OR i.status = p_status)
  ORDER BY i.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_invitations"("p_status" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT COALESCE(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'user_role',
    'user'
  );
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  user_email text;
  invitation_record record;
  assigned_role public.user_role;
BEGIN
  -- ユーザーのメールアドレスを取得
  user_email := NEW.email;
  
  -- 招待が存在するかチェックし、ロールを取得
  SELECT id, role INTO invitation_record
  FROM public.invitations
  WHERE email = user_email
  AND status = 'pending'
  AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- ロールを決定(招待があればそのロール、なければuser)
  IF invitation_record.id IS NOT NULL THEN
    assigned_role := invitation_record.role;
  ELSE
    assigned_role := 'user'::public.user_role;
  END IF;
  
  -- 1. auth.users.raw_app_metadataにロールを書き込む (Source of Truth)
  UPDATE auth.users
  SET raw_app_metadata = 
    COALESCE(raw_app_metadata, '{}'::jsonb) || 
    jsonb_build_object('role', assigned_role::text)
  WHERE id = NEW.id;
  
  -- 2. user_profileを作成 (ミラー/検索用)
  INSERT INTO public.user_profile (
    user_id,
    email,
    role,
    is_active,
    last_login_at
  ) VALUES (
    NEW.id,
    user_email,
    assigned_role,
    true,
    now()
  );
  
  -- 招待が存在する場合、ステータスを更新
  IF invitation_record.id IS NOT NULL THEN
    UPDATE public.invitations
    SET 
      status = 'accepted',
      updated_at = now()
    WHERE id = invitation_record.id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT COALESCE(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'user_role',
    'user'
  ) = 'admin';
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_user_role"("p_user_id" "uuid", "p_new_role" "public"."user_role") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_current_role public.user_role;
  v_result json;
BEGIN
  -- Adminチェック
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;
  
  -- ユーザーが存在するかチェック
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- 現在のロールを取得
  SELECT role INTO v_current_role
  FROM public.user_profile
  WHERE user_id = p_user_id;
  
  IF v_current_role = p_new_role THEN
    RAISE EXCEPTION 'User already has role %', p_new_role;
  END IF;
  
  -- トランザクション内で両方を更新
  BEGIN
    -- 1. auth.users.raw_app_metadataを更新 (Source of Truth)
    UPDATE auth.users
    SET raw_app_metadata = 
      COALESCE(raw_app_metadata, '{}'::jsonb) || 
      jsonb_build_object('role', p_new_role::text),
      updated_at = now()
    WHERE id = p_user_id;
    
    -- 2. user_profile.roleを更新 (ミラー)
    UPDATE public.user_profile
    SET role = p_new_role,
        updated_at = now()
    WHERE user_id = p_user_id;
    
    -- 成功メッセージ
    SELECT json_build_object(
      'success', true,
      'user_id', p_user_id,
      'old_role', v_current_role::text,
      'new_role', p_new_role::text,
      'message', format('User role changed from %s to %s. User must re-login to apply changes.', v_current_role, p_new_role)
    ) INTO v_result;
    
    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      -- ロールバック
      RAISE EXCEPTION 'Failed to update role: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION "public"."set_user_role"("p_user_id" "uuid", "p_new_role" "public"."user_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ar_model" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "model_name" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "thumbnail_url" "text",
    "description" "text",
    "file_size" bigint,
    "file_type" "text",
    "created_by_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ar_model" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_spot" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "spot_id" "uuid" NOT NULL,
    "order_in_event" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_order" CHECK (("order_in_event" >= 0))
);


ALTER TABLE "public"."event_spot" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "organizer" "text",
    "image_url" "text",
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "status" boolean DEFAULT true NOT NULL,
    "is_public" boolean DEFAULT true NOT NULL,
    "created_by_user" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_event_period" CHECK ((("end_time" IS NULL) OR ("start_time" IS NULL) OR ("end_time" > "start_time")))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'admin'::"public"."user_role" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."spot_visit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "spot_id" "uuid" NOT NULL,
    "event_id" "uuid",
    "latitude" numeric(10,7),
    "longitude" numeric(10,7),
    "visited_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."spot_visit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."spots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "subtitle" "text",
    "description" "text" NOT NULL,
    "address" "text" NOT NULL,
    "latitude" numeric(10,7) NOT NULL,
    "longitude" numeric(10,7) NOT NULL,
    "radius" integer DEFAULT 50,
    "category" "text",
    "pin_color" "text" DEFAULT '#FF0000'::"text",
    "image_url" "text",
    "ar_model_id" "uuid",
    "is_active" boolean DEFAULT false NOT NULL,
    "created_by_user" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_latitude" CHECK ((("latitude" >= ('-90'::integer)::numeric) AND ("latitude" <= (90)::numeric))),
    CONSTRAINT "valid_longitude" CHECK ((("longitude" >= ('-180'::integer)::numeric) AND ("longitude" <= (180)::numeric))),
    CONSTRAINT "valid_radius" CHECK (("radius" > 0))
);


ALTER TABLE "public"."spots" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."spot_statistics" WITH ("security_invoker"='on') AS
 SELECT "s"."id" AS "spot_id",
    "s"."name",
    "s"."category",
    "count"(DISTINCT "sv"."user_id") AS "unique_visitors",
    "count"("sv"."id") AS "total_visits",
    "max"("sv"."visited_at") AS "last_visited",
    "s"."is_active"
   FROM ("public"."spots" "s"
     LEFT JOIN "public"."spot_visit" "sv" ON (("sv"."spot_id" = "s"."id")))
  GROUP BY "s"."id", "s"."name", "s"."category", "s"."is_active";


ALTER VIEW "public"."spot_statistics" OWNER TO "postgres";


COMMENT ON VIEW "public"."spot_statistics" IS 'Spot statistics with security_invoker - access is controlled by RLS policies on the spots table (users see only active spots, admins see all)';



CREATE OR REPLACE VIEW "public"."user_event_progress" WITH ("security_invoker"='on') AS
 SELECT "sv"."user_id",
    "sv"."event_id",
    "e"."name" AS "event_name",
    "count"(DISTINCT "sv"."spot_id") AS "visited_spots",
    ( SELECT "count"(DISTINCT "es"."spot_id") AS "count"
           FROM "public"."event_spot" "es"
          WHERE ("es"."event_id" = "sv"."event_id")) AS "total_spots",
    "round"(((("count"(DISTINCT "sv"."spot_id"))::numeric / (NULLIF(( SELECT "count"(DISTINCT "es"."spot_id") AS "count"
           FROM "public"."event_spot" "es"
          WHERE ("es"."event_id" = "sv"."event_id")), 0))::numeric) * (100)::numeric), 2) AS "completion_percentage",
    "max"("sv"."visited_at") AS "last_visit",
    "count"("sv"."id") AS "total_visits"
   FROM ("public"."spot_visit" "sv"
     JOIN "public"."events" "e" ON (("e"."id" = "sv"."event_id")))
  GROUP BY "sv"."user_id", "sv"."event_id", "e"."name";


ALTER VIEW "public"."user_event_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profile" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "username" "text",
    "role" "public"."user_role" DEFAULT 'user'::"public"."user_role" NOT NULL,
    "age" integer,
    "gender" integer,
    "address" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "last_login_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_profile" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ar_model"
    ADD CONSTRAINT "ar_model_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_spot"
    ADD CONSTRAINT "event_spot_event_id_spot_id_key" UNIQUE ("event_id", "spot_id");



ALTER TABLE ONLY "public"."event_spot"
    ADD CONSTRAINT "event_spot_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."spot_visit"
    ADD CONSTRAINT "spot_visit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."spots"
    ADD CONSTRAINT "spots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "user_profile_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "user_profile_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_ar_model_created_by" ON "public"."ar_model" USING "btree" ("created_by_user_id");



CREATE INDEX "idx_ar_model_type" ON "public"."ar_model" USING "btree" ("file_type");



CREATE INDEX "idx_event_spot_event" ON "public"."event_spot" USING "btree" ("event_id", "order_in_event");



CREATE INDEX "idx_event_spot_spot" ON "public"."event_spot" USING "btree" ("spot_id");



CREATE INDEX "idx_events_created_by" ON "public"."events" USING "btree" ("created_by_user");



CREATE INDEX "idx_events_dates" ON "public"."events" USING "btree" ("start_time", "end_time");



CREATE INDEX "idx_events_image_url" ON "public"."events" USING "btree" ("image_url") WHERE ("image_url" IS NOT NULL);



CREATE INDEX "idx_events_public" ON "public"."events" USING "btree" ("is_public") WHERE ("is_public" = true);



CREATE INDEX "idx_events_status" ON "public"."events" USING "btree" ("status") WHERE ("status" = true);



CREATE INDEX "idx_invitations_email" ON "public"."invitations" USING "btree" ("email");



CREATE INDEX "idx_invitations_expires" ON "public"."invitations" USING "btree" ("expires_at") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_invitations_status" ON "public"."invitations" USING "btree" ("status");



CREATE INDEX "idx_spot_visit_date" ON "public"."spot_visit" USING "btree" ("visited_at" DESC);



CREATE INDEX "idx_spot_visit_event" ON "public"."spot_visit" USING "btree" ("event_id");



CREATE INDEX "idx_spot_visit_spot" ON "public"."spot_visit" USING "btree" ("spot_id");



CREATE INDEX "idx_spot_visit_user" ON "public"."spot_visit" USING "btree" ("user_id", "visited_at" DESC);



CREATE INDEX "idx_spot_visit_user_spot_event" ON "public"."spot_visit" USING "btree" ("user_id", "spot_id", "event_id");



CREATE INDEX "idx_spots_ar_model" ON "public"."spots" USING "btree" ("ar_model_id");



CREATE INDEX "idx_spots_category" ON "public"."spots" USING "btree" ("category");



CREATE INDEX "idx_spots_created_by" ON "public"."spots" USING "btree" ("created_by_user");



CREATE INDEX "idx_spots_image_url" ON "public"."spots" USING "btree" ("image_url") WHERE ("image_url" IS NOT NULL);



CREATE INDEX "idx_spots_is_active" ON "public"."spots" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_spots_location" ON "public"."spots" USING "gist" ("extensions"."ll_to_earth"(("latitude")::double precision, ("longitude")::double precision));



CREATE INDEX "idx_user_profile_email" ON "public"."user_profile" USING "btree" ("email");



CREATE INDEX "idx_user_profile_role" ON "public"."user_profile" USING "btree" ("role");



CREATE INDEX "idx_user_profile_user_id" ON "public"."user_profile" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "update_ar_model_updated_at" BEFORE UPDATE ON "public"."ar_model" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_events_updated_at" BEFORE UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_invitations_updated_at" BEFORE UPDATE ON "public"."invitations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_spots_updated_at" BEFORE UPDATE ON "public"."spots" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_profile_updated_at" BEFORE UPDATE ON "public"."user_profile" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."ar_model"
    ADD CONSTRAINT "ar_model_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_spot"
    ADD CONSTRAINT "event_spot_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_spot"
    ADD CONSTRAINT "event_spot_spot_id_fkey" FOREIGN KEY ("spot_id") REFERENCES "public"."spots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_created_by_user_fkey" FOREIGN KEY ("created_by_user") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."spot_visit"
    ADD CONSTRAINT "spot_visit_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."spot_visit"
    ADD CONSTRAINT "spot_visit_spot_id_fkey" FOREIGN KEY ("spot_id") REFERENCES "public"."spots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."spot_visit"
    ADD CONSTRAINT "spot_visit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."spots"
    ADD CONSTRAINT "spots_ar_model_id_fkey" FOREIGN KEY ("ar_model_id") REFERENCES "public"."ar_model"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."spots"
    ADD CONSTRAINT "spots_created_by_user_fkey" FOREIGN KEY ("created_by_user") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "user_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can create AR models" ON "public"."ar_model" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can create events" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can create invitations" ON "public"."invitations" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can create spots" ON "public"."spots" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can delete AR models" ON "public"."ar_model" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete events" ON "public"."events" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete invitations" ON "public"."invitations" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete spots" ON "public"."spots" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete visits" ON "public"."spot_visit" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage event spots (DELETE)" ON "public"."event_spot" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can manage event spots (INSERT)" ON "public"."event_spot" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage event spots (UPDATE)" ON "public"."event_spot" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update AR models" ON "public"."ar_model" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can update events" ON "public"."events" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can update invitations" ON "public"."invitations" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can update spots" ON "public"."spots" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can view invitations" ON "public"."invitations" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Authenticated users can view AR models" ON "public"."ar_model" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users and Admins can update profiles" ON "public"."user_profile" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR ( SELECT "public"."is_admin"() AS "is_admin"))) WITH CHECK ((((( SELECT "auth"."uid"() AS "uid") = "user_id") AND ("role" = ( SELECT "user_profile_1"."role"
   FROM "public"."user_profile" "user_profile_1"
  WHERE ("user_profile_1"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (( SELECT "public"."is_admin"() AS "is_admin") AND ("role" = ( SELECT "user_profile_1"."role"
   FROM "public"."user_profile" "user_profile_1"
  WHERE ("user_profile_1"."user_id" = "user_profile_1"."user_id"))))));



CREATE POLICY "Users and Admins can view profiles" ON "public"."user_profile" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR ( SELECT "public"."is_admin"() AS "is_admin")));



CREATE POLICY "Users can create own visits" ON "public"."spot_visit" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view active spots" ON "public"."spots" FOR SELECT TO "authenticated" USING ((("is_active" = true) OR "public"."is_admin"()));



CREATE POLICY "Users can view own visits" ON "public"."spot_visit" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "public"."is_admin"()));



CREATE POLICY "Users can view public event spots" ON "public"."event_spot" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "event_spot"."event_id") AND (("events"."is_public" = true) OR "public"."is_admin"())))));



CREATE POLICY "Users can view public events" ON "public"."events" FOR SELECT TO "authenticated" USING ((("is_public" = true) OR "public"."is_admin"()));



ALTER TABLE "public"."ar_model" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_spot" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."spot_visit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."spots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profile" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";

































































































































































































































































































































GRANT ALL ON FUNCTION "public"."check_invitation"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_invitation"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_invitation"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_invitation"("p_email" "text", "p_role" "public"."user_role") TO "anon";
GRANT ALL ON FUNCTION "public"."create_invitation"("p_email" "text", "p_role" "public"."user_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_invitation"("p_email" "text", "p_role" "public"."user_role") TO "service_role";



REVOKE ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_invitations"("p_status" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_invitations"("p_status" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_invitations"("p_status" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_user_role"("p_user_id" "uuid", "p_new_role" "public"."user_role") TO "anon";
GRANT ALL ON FUNCTION "public"."set_user_role"("p_user_id" "uuid", "p_new_role" "public"."user_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_user_role"("p_user_id" "uuid", "p_new_role" "public"."user_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
























GRANT ALL ON TABLE "public"."ar_model" TO "anon";
GRANT ALL ON TABLE "public"."ar_model" TO "authenticated";
GRANT ALL ON TABLE "public"."ar_model" TO "service_role";



GRANT ALL ON TABLE "public"."event_spot" TO "anon";
GRANT ALL ON TABLE "public"."event_spot" TO "authenticated";
GRANT ALL ON TABLE "public"."event_spot" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."invitations" TO "anon";
GRANT ALL ON TABLE "public"."invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."invitations" TO "service_role";



GRANT ALL ON TABLE "public"."spot_visit" TO "anon";
GRANT ALL ON TABLE "public"."spot_visit" TO "authenticated";
GRANT ALL ON TABLE "public"."spot_visit" TO "service_role";



GRANT ALL ON TABLE "public"."spots" TO "anon";
GRANT ALL ON TABLE "public"."spots" TO "authenticated";
GRANT ALL ON TABLE "public"."spots" TO "service_role";



GRANT ALL ON TABLE "public"."spot_statistics" TO "anon";
GRANT ALL ON TABLE "public"."spot_statistics" TO "authenticated";
GRANT ALL ON TABLE "public"."spot_statistics" TO "service_role";



GRANT ALL ON TABLE "public"."user_event_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_event_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_event_progress" TO "service_role";



GRANT ALL ON TABLE "public"."user_profile" TO "anon";
GRANT ALL ON TABLE "public"."user_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profile" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Admins can delete AR models"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'ar-models'::text) AND public.is_admin()));



  create policy "Admins can delete event images"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'event-images'::text) AND public.is_admin()));



  create policy "Admins can delete spot images"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'spot-images'::text) AND public.is_admin()));



  create policy "Admins can update AR models"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'ar-models'::text) AND public.is_admin()));



  create policy "Admins can update event images"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'event-images'::text) AND public.is_admin()));



  create policy "Admins can update spot images"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'spot-images'::text) AND public.is_admin()));



  create policy "Admins can upload AR models"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'ar-models'::text) AND public.is_admin()));



  create policy "Admins can upload event images"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'event-images'::text) AND public.is_admin()));



  create policy "Admins can upload spot images"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'spot-images'::text) AND public.is_admin()));



  create policy "Users can view AR models in use"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'ar-models'::text) AND (public.is_admin() OR (EXISTS ( SELECT 1
   FROM (public.ar_model am
     JOIN public.spots s ON ((s.ar_model_id = am.id)))
  WHERE ((s.is_active = true) AND (am.file_url = objects.name)))) OR (EXISTS ( SELECT 1
   FROM (((public.ar_model am
     JOIN public.spots s ON ((s.ar_model_id = am.id)))
     JOIN public.event_spot es ON ((es.spot_id = s.id)))
     JOIN public.events e ON ((e.id = es.event_id)))
  WHERE ((e.is_public = true) AND (am.file_url = objects.name)))))));



  create policy "Users can view active spot images"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'spot-images'::text) AND (public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.spots
  WHERE ((spots.image_url = objects.name) AND (spots.is_active = true)))))));



  create policy "Users can view public event images"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'event-images'::text) AND (public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.image_url = objects.name) AND (events.is_public = true)))))));



