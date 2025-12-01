set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$DECLARE
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
END;$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$DECLARE
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
END;$function$
;

CREATE OR REPLACE FUNCTION public.set_user_role(p_user_id uuid, p_new_role public.user_role)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$DECLARE
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
END;$function$
;


