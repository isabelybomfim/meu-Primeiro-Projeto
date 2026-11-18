import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// EcoFix: gerenciamento de usuários exclusivo da administradora.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return response({ error: "Método não permitido." }, 405);
  }

  try {
    // 1. Verificar autenticação
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return response(
        { error: "Faça login como administradora." },
        401
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    // 2. Obter as chaves padrão do Supabase
    const publishableKeys = JSON.parse(
      Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}"
    );

    const secretKeys = JSON.parse(
      Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"
    );

    const publishableKey = publishableKeys.default || "";
    const secretKey = secretKeys.default || "";

    if (!supabaseUrl || !publishableKey || !secretKey) {
      console.error("Configuração de chaves incompleta.");

      return response(
        { error: "Configuração segura da função incompleta." },
        500
      );
    }

    const token = authHeader.slice(7);

    // 3. Cliente da sessão do usuário
    const callerClient = createClient(
      supabaseUrl,
      publishableKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: callerData, error: callerError } =
      await callerClient.auth.getUser(token);

    if (callerError || !callerData.user) {
      return response(
        { error: "Sessão inválida. Entre novamente." },
        401
      );
    }

    // 4. Verificar permissão administrativa pela função SQL
    const { data: isAdmin, error: adminCheckError } =
      await callerClient.rpc("is_ecofix_admin");

    if (adminCheckError) {
      console.error(
        "Erro ao verificar administrador:",
        adminCheckError
      );

      return response(
        { error: "Não foi possível verificar a permissão administrativa." },
        500
      );
    }

    if (isAdmin !== true) {
      return response(
        { error: "Apenas a administradora pode gerenciar usuários." },
        403
      );
    }

    // 5. Cliente administrativo, somente no servidor
    const adminClient = createClient(
      supabaseUrl,
      secretKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // 6. Ler solicitação
    let body: {
      action?: string;
      name?: string;
      email?: string;
      password?: string;
      userId?: string;
    };

    try {
      body = await req.json();
    } catch {
      return response({ error: "Solicitação inválida." }, 400);
    }

    // ==========================================
    // LISTAR USUÁRIOS - DIAGNÓSTICO DETALHADO
    // ==========================================

    if (body.action === "list") {
      // Primeira consulta: usuários do Supabase Auth
      const { data, error } =
        await adminClient.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

      if (error) {
        console.error("ERRO AUTH LIST USERS:", error);

        return response({
          error: "Falha ao consultar o Supabase Auth.",
          etapa: "listUsers",
          detalhe: error.message,
          codigo: error.code || null,
        }, 500);
      }

      // Segunda consulta: administradores cadastrados
      const { data: admins, error: adminsError } =
        await adminClient
          .from("ecofix_admins")
          .select("user_id");

      if (adminsError) {
        console.error(
          "ERRO TABELA ECOFIX_ADMINS:",
          adminsError
        );

        return response({
          error: "Falha ao consultar a tabela de administradores.",
          etapa: "ecofix_admins",
          detalhe: adminsError.message,
          codigo: adminsError.code || null,
        }, 500);
      }

      const adminIds = new Set(
        (admins || []).map(
          (row: { user_id: string }) => row.user_id
        )
      );

      return response({
        users: data.users.map((user) => ({
          id: user.id,
          name: String(
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            ""
          ),
          email: user.email || "",
          confirmed: Boolean(user.email_confirmed_at),
          isAdmin: adminIds.has(user.id),
        })),
      });
    }

    // ==========================================
    // CRIAR USUÁRIO
    // ==========================================

    if (body.action === "create") {
      const name = String(body.name || "").trim();

      const email = String(body.email || "")
        .trim()
        .toLowerCase();

      const password = String(body.password || "");

      if (
        name.length < 2 ||
        name.length > 100 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ) {
        return response(
          {
            error: "Informe um nome válido e um e-mail válido.",
          },
          400
        );
      }

      if (password.length < 8 || password.length > 72) {
        return response(
          {
            error: "A senha deve ter entre 8 e 72 caracteres.",
          },
          400
        );
      }

      const { data, error } =
        await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: name,
            role: "ecofix_user",
          },
        });

      if (error) {
        console.error("Erro ao criar usuário:", error);

        const message = error.message
          .toLowerCase()
          .includes("already")
          ? "Este e-mail já está cadastrado."
          : "O Supabase não conseguiu criar o usuário. Confira os dados e tente novamente.";

        return response({ error: message }, 400);
      }

      return response(
        {
          success: true,
          user: {
            id: data.user.id,
            name,
            email,
          },
        },
        201
      );
    }

    // ==========================================
    // EXCLUIR USUÁRIO
    // ==========================================

    if (body.action === "delete") {
      const userId = String(body.userId || "").trim();

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(userId)) {
        return response(
          { error: "Identificador de usuário inválido." },
          400
        );
      }

      // Impedir exclusão da própria conta
      if (userId === callerData.user.id) {
        return response(
          { error: "Você não pode excluir sua própria conta." },
          400
        );
      }

      // Impedir exclusão de qualquer administrador
      const { data: targetAdmin, error: targetAdminError } =
        await adminClient
          .from("ecofix_admins")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle();

      if (targetAdminError) {
        console.error(
          "Erro ao verificar conta:",
          targetAdminError
        );

        return response(
          {
            error: "Não foi possível verificar as permissões da conta.",
          },
          500
        );
      }

      if (targetAdmin) {
        return response(
          {
            error: "Contas administrativas não podem ser excluídas por esta tela.",
          },
          400
        );
      }

      // Excluir conta do Supabase Authentication
      const { error: deleteError } =
        await adminClient.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error(
          "Erro ao excluir usuário:",
          deleteError
        );

        return response(
          { error: "Não foi possível excluir o usuário." },
          400
        );
      }

      return response({
        success: true,
        message: "Usuário excluído com sucesso.",
      });
    }

    return response(
      { error: "Ação não reconhecida." },
      400
    );

  } catch (error) {
    console.error("Erro inesperado na função:", error);

    return response(
      { error: "Ocorreu um erro interno ao processar a solicitação." },
      500
    );
  }
});
