-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.ar_model (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  model_name text NOT NULL,
  file_url text NOT NULL,
  thumbnail_url text,
  description text,
  created_by_user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT ar_model_pkey PRIMARY KEY (id)
);
CREATE TABLE public.event_spot (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  event_id bigint,
  spot_id bigint,
  order_in_event text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT event_spot_pkey PRIMARY KEY (id),
  CONSTRAINT event_spot_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT event_spot_spot_id_fkey FOREIGN KEY (spot_id) REFERENCES public.spots(id)
);
CREATE TABLE public.events (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  description text,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  organizer text,
  status boolean NOT NULL,
  is_public boolean NOT NULL,
  created_by_user uuid NOT NULL DEFAULT auth.uid(),
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL,
  CONSTRAINT events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.invitations (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  email text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text])),
  invited_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invitations_pkey PRIMARY KEY (id),
  CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id)
);
CREATE TABLE public.spot_visit (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid DEFAULT auth.uid(),
  spot_id bigint,
  event_id bigint,
  visited_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT spot_visit_pkey PRIMARY KEY (id),
  CONSTRAINT spot_visit_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT spot_visit_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT spot_visit_spot_id_fkey FOREIGN KEY (spot_id) REFERENCES public.spots(id)
);
CREATE TABLE public.spots (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  subtitle text,
  latitude numeric NOT NULL,
  pin_color text,
  radius integer,
  image_url text,
  description text NOT NULL,
  category text,
  ar_model_id bigint,
  address text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_by_user uuid NOT NULL DEFAULT auth.uid(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  longitude numeric NOT NULL,
  name text NOT NULL,
  CONSTRAINT spots_pkey PRIMARY KEY (id),
  CONSTRAINT spot_ar_model_id_fkey FOREIGN KEY (ar_model_id) REFERENCES public.ar_model(id)
);
CREATE TABLE public.user_profile (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid DEFAULT auth.uid(),
  username text,
  age integer,
  gender integer,
  address text,
  updated_at timestamp without time zone DEFAULT now(),
  is_active boolean,
  last_login_at timestamp with time zone DEFAULT now(),
  role USER-DEFINED NOT NULL DEFAULT 'user'::user_role,
  email text UNIQUE,
  CONSTRAINT user_profile_pkey PRIMARY KEY (id),
  CONSTRAINT user_profile_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);