import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req) => {
  // service_role で Supabase Client を作る
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { email, password } = await req.json();

  if (!email || !password) {
    return new Response("email and password required", { status: 400 });
  }

  // 管理者ユーザー作成
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      role: "admin"
    }
  });

  if (error) {
    return new Response(JSON.stringify(error), { status: 400 });
  }

  // 👇 ここで auth.users INSERT → handle_new_user が発火
  // 👇 user_profile が自動作成される

  return new Response(
    JSON.stringify({
      message: "admin user created",
      user_id: data.user?.id
    }),
    { status: 200 }
  );
});
