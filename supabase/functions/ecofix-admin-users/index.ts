// EcoFix: criação, listagem e exclusão de usuários somente pela administradora.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Método não permitido." }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return response({ error: "Faça login como administradora." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    let publishableKey = "";
    let secretKey = "";

    try {
      const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
      const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
      publishableKey = publishableKeys.default || "";
      secretKey = secretKeys.default || "";
    } catch {
      return response({ error: "Não foi possível ler as chaves padrão do Supabase." }, 500);
    }

    if (!supabaseUrl || !publishableKey || !secretKey) {
      return response({
        error: "Configuração segura incompleta. Verifique SUPABASE_URL, SUPABASE_PUBLISHABLE_KEYS e SUPABASE_SECRET_KEYS."
      }, 500);
    }

    const token = authHeader.slice(7);
    const callerClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: callerData, error: callerError } = await callerClient.auth.getUser(token);
    if (callerError || !callerData.user) {
      return response({ error: "Sessão inválida. Entre novamente." }, 401);
    }

    const { data: isAdmin, error: adminCheckError } = await callerClient.rpc("is_ecofix_admin");
    if (adminCheckError || isAdmin !== true) {
      return response({ error: "Apenas a administradora pode gerenciar usuários." }, 403);
    }

    const adminClient = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let body: { action?: string; name?: string; email?: string; password?: string; userId?: string };
    try {
      body = await req.json();
    } catch {
      return response({ error: "Solicitação inválida." }, 400);
    }

    if (body.action === "list") {
      const [{ data, error }, { data: admins, error: adminsError }] = await Promise.all([
        adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        adminClient.from("ecofix_admins").select("user_id"),
      ]);

      if (error || adminsError) {
        return response({ error: "Não foi possível consultar os usuários." }, 500);
      }

      const adminIds = new Set((admins || []).map((row: { user_id: string }) => row.user_id));
      return response({
        users: data.users.map((user) => ({
          id: user.id,
          name: String(user.user_metadata?.full_name || user.user_metadata?.name || ""),
          email: user.email || "",
          confirmed: Boolean(user.email_confirmed_at),
          isAdmin: adminIds.has(user.id),
        })),
      });
    }

    if (body.action === "create") {
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");

      if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return response({ error: "Informe um nome válido e um e-mail válido." }, 400);
      }
      if (password.length < 8 || password.length > 72) {
        return response({ error: "A senha deve ter entre 8 e 72 caracteres." }, 400);
      }

      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name, role: "ecofix_user" },
      });

      if (error) {
        const message = error.message.toLowerCase().includes("already")
          ? "Este e-mail já está cadastrado."
          : "O Supabase não conseguiu criar o usuário. Confira o e-mail e tente novamente.";
        return response({ error: message }, 400);
      }

      return response({ success: true, user: { id: data.user.id, name, email } }, 201);
    }

    if (body.action === "delete") {
      const userId = String(body.userId || "").trim();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
        return response({ error: "Identificador de usuário inválido." }, 400);
      }

      const { data: targetAdmin, error: targetAdminError } = await adminClient
        .from("ecofix_admins").select("user_id").eq("user_id", userId).maybeSingle();

      if (targetAdminError) {
        return response({ error: "Não foi possível verificar as permissões da conta." }, 500);
      }
      if (targetAdmin) {
        return response({ error: "Contas administrativas não podem ser excluídas por esta tela." }, 400);
      }

      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) {
        return response({ error: "Não foi possível excluir o usuário." }, 400);
      }

      return response({ success: true });
    }

    return response({ error: "Ação não reconhecida." }, 400);
  } catch (error) {
    console.error("Erro inesperado em ecofix-admin-users:", error);
    return response({ error: "Erro interno ao executar a função. Consulte os logs da Edge Function." }, 500);
  }
});
