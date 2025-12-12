--
-- PostgreSQL database dump
--

\restrict On2E8y3LB8f3EwIiEChjhV4QERVeiageZ47mWssiPUf7LN7mbXhgD9qVocfSurO

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'user',
    'admin'
);


--
-- Name: check_invitation(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_invitation(p_email text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


--
-- Name: create_invitation(text, public.user_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_invitation(p_email text, p_role public.user_role DEFAULT 'admin'::public.user_role) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


--
-- Name: custom_access_token_hook(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.custom_access_token_hook(event jsonb) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$DECLARE
  claims jsonb;
  user_role text;
BEGIN
  -- raw_app_metadataからロールを直接取得(Source of Truth)
  user_role := event->'user'->'raw_app_meta_data'->>'role';

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
END;$$;


--
-- Name: expire_old_invitations(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.expire_old_invitations() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


--
-- Name: get_invitations(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_invitations(p_status text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, email text, role public.user_role, status text, invited_by uuid, invited_by_email text, expires_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


--
-- Name: get_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT COALESCE(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'user_role',
    'user'
  );
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$DECLARE
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
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
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
END;$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT COALESCE(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'user_role',
    'user'
  ) = 'admin';
$$;


--
-- Name: protect_role_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_role_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: set_user_role(uuid, public.user_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_user_role(p_user_id uuid, p_new_role public.user_role) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$DECLARE
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
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
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
END;$$;


--
-- Name: snapshot_spot_visit_names(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.snapshot_spot_visit_names() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: update_event_spots_transaction(uuid, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_event_spots_transaction(p_event_id uuid, p_spot_ids uuid[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ar_model; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ar_model (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    model_name text NOT NULL,
    file_url text NOT NULL,
    thumbnail_url text,
    description text,
    file_size bigint,
    file_type text,
    created_by_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: event_spot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_spot (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    spot_id uuid NOT NULL,
    order_in_event integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT valid_order CHECK ((order_in_event >= 0))
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    organizer text,
    image_url text,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    status boolean DEFAULT true NOT NULL,
    is_public boolean DEFAULT true NOT NULL,
    created_by_user uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_event_period CHECK (((end_time IS NULL) OR (start_time IS NULL) OR (end_time > start_time)))
);


--
-- Name: invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    role public.user_role DEFAULT 'admin'::public.user_role NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    invited_by uuid NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text])))
);


--
-- Name: spot_visit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spot_visit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    spot_id uuid NOT NULL,
    event_id uuid,
    latitude numeric(10,7),
    longitude numeric(10,7),
    visited_at timestamp with time zone DEFAULT now() NOT NULL,
    spot_name_snapshot text,
    event_name_snapshot text
);


--
-- Name: spots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    subtitle text,
    description text NOT NULL,
    address text NOT NULL,
    latitude numeric(10,7) NOT NULL,
    longitude numeric(10,7) NOT NULL,
    radius integer DEFAULT 50,
    category text,
    pin_color text DEFAULT '#FF0000'::text,
    image_url text,
    ar_model_id uuid,
    is_active boolean DEFAULT false NOT NULL,
    created_by_user uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT valid_latitude CHECK (((latitude >= ('-90'::integer)::numeric) AND (latitude <= (90)::numeric))),
    CONSTRAINT valid_longitude CHECK (((longitude >= ('-180'::integer)::numeric) AND (longitude <= (180)::numeric))),
    CONSTRAINT valid_radius CHECK ((radius > 0))
);


--
-- Name: spot_statistics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.spot_statistics WITH (security_invoker='on') AS
 SELECT s.id AS spot_id,
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


--
-- Name: user_event_progress; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_event_progress WITH (security_invoker='on') AS
 SELECT sv.user_id,
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


--
-- Name: user_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profile (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    username text,
    role public.user_role DEFAULT 'user'::public.user_role NOT NULL,
    gender integer,
    address text,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    birth_date date
);


--
-- Name: view_user_profile_with_age; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.view_user_profile_with_age WITH (security_invoker='on') AS
 SELECT id,
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


--
-- Name: ar_model ar_model_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ar_model
    ADD CONSTRAINT ar_model_pkey PRIMARY KEY (id);


--
-- Name: event_spot event_spot_event_id_spot_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_spot
    ADD CONSTRAINT event_spot_event_id_spot_id_key UNIQUE (event_id, spot_id);


--
-- Name: event_spot event_spot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_spot
    ADD CONSTRAINT event_spot_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_email_key UNIQUE (email);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: spot_visit spot_visit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spot_visit
    ADD CONSTRAINT spot_visit_pkey PRIMARY KEY (id);


--
-- Name: spots spots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spots
    ADD CONSTRAINT spots_pkey PRIMARY KEY (id);


--
-- Name: user_profile user_profile_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profile
    ADD CONSTRAINT user_profile_email_key UNIQUE (email);


--
-- Name: user_profile user_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profile
    ADD CONSTRAINT user_profile_pkey PRIMARY KEY (id);


--
-- Name: user_profile user_profile_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profile
    ADD CONSTRAINT user_profile_user_id_key UNIQUE (user_id);


--
-- Name: idx_ar_model_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ar_model_created_by ON public.ar_model USING btree (created_by_user_id);


--
-- Name: idx_ar_model_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ar_model_type ON public.ar_model USING btree (file_type);


--
-- Name: idx_event_spot_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_spot_event ON public.event_spot USING btree (event_id, order_in_event);


--
-- Name: idx_event_spot_spot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_spot_spot ON public.event_spot USING btree (spot_id);


--
-- Name: idx_events_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_created_by ON public.events USING btree (created_by_user);


--
-- Name: idx_events_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_dates ON public.events USING btree (start_time, end_time);


--
-- Name: idx_events_image_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_image_url ON public.events USING btree (image_url) WHERE (image_url IS NOT NULL);


--
-- Name: idx_events_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_public ON public.events USING btree (is_public) WHERE (is_public = true);


--
-- Name: idx_events_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_status ON public.events USING btree (status) WHERE (status = true);


--
-- Name: idx_invitations_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_email ON public.invitations USING btree (email);


--
-- Name: idx_invitations_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_expires ON public.invitations USING btree (expires_at) WHERE (status = 'pending'::text);


--
-- Name: idx_invitations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_status ON public.invitations USING btree (status);


--
-- Name: idx_spot_visit_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spot_visit_date ON public.spot_visit USING btree (visited_at DESC);


--
-- Name: idx_spot_visit_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spot_visit_event ON public.spot_visit USING btree (event_id);


--
-- Name: idx_spot_visit_spot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spot_visit_spot ON public.spot_visit USING btree (spot_id);


--
-- Name: idx_spot_visit_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spot_visit_user ON public.spot_visit USING btree (user_id, visited_at DESC);


--
-- Name: idx_spot_visit_user_spot_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spot_visit_user_spot_event ON public.spot_visit USING btree (user_id, spot_id, event_id);


--
-- Name: idx_spots_ar_model; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spots_ar_model ON public.spots USING btree (ar_model_id);


--
-- Name: idx_spots_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spots_category ON public.spots USING btree (category);


--
-- Name: idx_spots_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spots_created_by ON public.spots USING btree (created_by_user);


--
-- Name: idx_spots_image_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spots_image_url ON public.spots USING btree (image_url) WHERE (image_url IS NOT NULL);


--
-- Name: idx_spots_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spots_is_active ON public.spots USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_spots_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spots_location ON public.spots USING gist (extensions.ll_to_earth((latitude)::double precision, (longitude)::double precision));


--
-- Name: idx_user_profile_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profile_email ON public.user_profile USING btree (email);


--
-- Name: idx_user_profile_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profile_role ON public.user_profile USING btree (role);


--
-- Name: idx_user_profile_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profile_user_id ON public.user_profile USING btree (user_id);


--
-- Name: spot_visit on_spot_visit_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_spot_visit_insert BEFORE INSERT ON public.spot_visit FOR EACH ROW EXECUTE FUNCTION public.snapshot_spot_visit_names();


--
-- Name: user_profile protect_role_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER protect_role_change BEFORE UPDATE ON public.user_profile FOR EACH ROW EXECUTE FUNCTION public.protect_role_column();


--
-- Name: ar_model update_ar_model_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ar_model_updated_at BEFORE UPDATE ON public.ar_model FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: events update_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invitations update_invitations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON public.invitations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: spots update_spots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_spots_updated_at BEFORE UPDATE ON public.spots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_profile update_user_profile_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_profile_updated_at BEFORE UPDATE ON public.user_profile FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ar_model ar_model_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ar_model
    ADD CONSTRAINT ar_model_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: event_spot event_spot_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_spot
    ADD CONSTRAINT event_spot_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_spot event_spot_spot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_spot
    ADD CONSTRAINT event_spot_spot_id_fkey FOREIGN KEY (spot_id) REFERENCES public.spots(id) ON DELETE CASCADE;


--
-- Name: events events_created_by_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_created_by_user_fkey FOREIGN KEY (created_by_user) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: invitations invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: spot_visit spot_visit_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spot_visit
    ADD CONSTRAINT spot_visit_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: spot_visit spot_visit_spot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spot_visit
    ADD CONSTRAINT spot_visit_spot_id_fkey FOREIGN KEY (spot_id) REFERENCES public.spots(id) ON DELETE SET NULL;


--
-- Name: spot_visit spot_visit_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spot_visit
    ADD CONSTRAINT spot_visit_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: spots spots_ar_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spots
    ADD CONSTRAINT spots_ar_model_id_fkey FOREIGN KEY (ar_model_id) REFERENCES public.ar_model(id) ON DELETE SET NULL;


--
-- Name: spots spots_created_by_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spots
    ADD CONSTRAINT spots_created_by_user_fkey FOREIGN KEY (created_by_user) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: user_profile user_profile_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profile
    ADD CONSTRAINT user_profile_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ar_model Admins can create AR models; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create AR models" ON public.ar_model FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: events Admins can create events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create events" ON public.events FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: invitations Admins can create invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create invitations" ON public.invitations FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: spots Admins can create spots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create spots" ON public.spots FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: ar_model Admins can delete AR models; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete AR models" ON public.ar_model FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: events Admins can delete events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete events" ON public.events FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: invitations Admins can delete invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete invitations" ON public.invitations FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: spots Admins can delete spots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete spots" ON public.spots FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: spot_visit Admins can delete visits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete visits" ON public.spot_visit FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: event_spot Admins can manage event spots (DELETE); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage event spots (DELETE)" ON public.event_spot FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: event_spot Admins can manage event spots (INSERT); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage event spots (INSERT)" ON public.event_spot FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: event_spot Admins can manage event spots (UPDATE); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage event spots (UPDATE)" ON public.event_spot FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: ar_model Admins can update AR models; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update AR models" ON public.ar_model FOR UPDATE TO authenticated USING (public.is_admin());


--
-- Name: events Admins can update events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update events" ON public.events FOR UPDATE TO authenticated USING (public.is_admin());


--
-- Name: invitations Admins can update invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update invitations" ON public.invitations FOR UPDATE TO authenticated USING (public.is_admin());


--
-- Name: spots Admins can update spots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update spots" ON public.spots FOR UPDATE TO authenticated USING (public.is_admin());


--
-- Name: invitations Admins can view invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view invitations" ON public.invitations FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: ar_model Authenticated users can view AR models; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view AR models" ON public.ar_model FOR SELECT TO authenticated USING (true);


--
-- Name: user_profile Users and Admins can update profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users and Admins can update profiles" ON public.user_profile FOR UPDATE TO authenticated USING (((( SELECT auth.uid() AS uid) = user_id) OR ( SELECT public.is_admin() AS is_admin))) WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) OR ( SELECT public.is_admin() AS is_admin)));


--
-- Name: user_profile Users and Admins can view profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users and Admins can view profiles" ON public.user_profile FOR SELECT TO authenticated USING (((( SELECT auth.uid() AS uid) = user_id) OR ( SELECT public.is_admin() AS is_admin)));


--
-- Name: spot_visit Users can create own visits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own visits" ON public.spot_visit FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: spots Users can view active spots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view active spots" ON public.spots FOR SELECT TO authenticated USING (((is_active = true) OR public.is_admin()));


--
-- Name: spot_visit Users can view own visits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own visits" ON public.spot_visit FOR SELECT TO authenticated USING (((( SELECT auth.uid() AS uid) = user_id) OR public.is_admin()));


--
-- Name: event_spot Users can view public event spots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view public event spots" ON public.event_spot FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = event_spot.event_id) AND ((events.is_public = true) OR public.is_admin())))));


--
-- Name: events Users can view public events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view public events" ON public.events FOR SELECT TO authenticated USING (((is_public = true) OR public.is_admin()));


--
-- Name: ar_model; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ar_model ENABLE ROW LEVEL SECURITY;

--
-- Name: event_spot; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_spot ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: spot_visit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.spot_visit ENABLE ROW LEVEL SECURITY;

--
-- Name: spots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profile; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict On2E8y3LB8f3EwIiEChjhV4QERVeiageZ47mWssiPUf7LN7mbXhgD9qVocfSurO

