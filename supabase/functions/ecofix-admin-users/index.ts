// EcoFix: criação e listagem de usuários somente por administradores.
// Usa as chaves atuais disponibilizadas automaticamente pelo Supabase nas Edge Functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status,headers:{...corsHeaders,"Content-Type":"application/json"}});
Deno.serve(async (req) => {
  if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST") return response({error:"Método não permitido."},405);
  const authHeader=req.headers.get("Authorization");
  if(!authHeader?.startsWith("Bearer ")) return response({error:"Faça login como administradora."},401);
  const supabaseUrl=Deno.env.get("SUPABASE_URL");
  let publishableKey:string, secretKey:string;
  try {
    const publishableKeys=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}");
    const secretKeys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
    publishableKey=publishableKeys.default;
    secretKey=secretKeys.default;
  } catch {
    return response({error:"Não foi possível ler as chaves padrão do Supabase."},500);
  }
  if(!supabaseUrl||!publishableKey||!secretKey) return response({error:"Configuração segura da função incompleta."},500);
  const token=authHeader.slice(7);
  const callerClient=createClient(supabaseUrl,publishableKey,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:callerData,error:callerError}=await callerClient.auth.getUser(token);
  if(callerError||!callerData.user) return response({error:"Sessão inválida. Entre novamente."},401);
  const adminClient=createClient(supabaseUrl,secretKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:adminRow,error:adminError}=await adminClient.from("ecofix_admins").select("user_id").eq("user_id",callerData.user.id).maybeSingle();
  if(adminError||!adminRow) return response({error:"Apenas a administradora pode gerenciar usuários."},403);
  let body:{action?:string;name?:string;email?:string;password?:string};
  try{body=await req.json();}catch{return response({error:"Solicitação inválida."},400);}
  if(body.action==="list"){
    const {data,error}=await adminClient.auth.admin.listUsers({page:1,perPage:1000});
    if(error) return response({error:"Não foi possível consultar os usuários."},500);
    return response({users:data.users.map(user=>({id:user.id,name:String(user.user_metadata?.full_name||user.user_metadata?.name||""),email:user.email||"",confirmed:Boolean(user.email_confirmed_at)}))});
  }
  if(body.action==="create"){
    const name=String(body.name||"").trim(),email=String(body.email||"").trim().toLowerCase(),password=String(body.password||"");
    if(name.length<2||name.length>100||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response({error:"Informe um nome válido e um e-mail válido."},400);
    if(password.length<8||password.length>72) return response({error:"A senha deve ter entre 8 e 72 caracteres."},400);
    const {data,error}=await adminClient.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:name,role:"ecofix_user"}});
    if(error){const message=error.message.toLowerCase().includes("already")?"Este e-mail já está cadastrado.":"O Supabase não conseguiu criar o usuário. Confira o e-mail e tente novamente.";return response({error:message},400);}
    return response({success:true,user:{id:data.user.id,name,email}},201);
  }
  return response({error:"Ação não reconhecida."},400);
});