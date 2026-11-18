# Configuração do banco compartilhado do EcoFix

O arquivo `supabase/ecofix-schema.sql` prepara um estado centralizado do EcoFix.

## Regras de acesso
- Visitantes sem login: podem ler o painel.
- Usuários autenticados que não sejam administradores: continuam somente com leitura.
- Administradores cadastrados em `public.ecofix_admins`: podem inserir, atualizar e excluir o estado compartilhado.
- A autorização é aplicada no PostgreSQL por Row Level Security (RLS), não apenas escondendo botões na interface.

## Configuração necessária
1. Crie um projeto no Supabase.
2. Abra **SQL Editor**, cole e execute o conteúdo de `supabase/ecofix-schema.sql`.
3. Em **Authentication > Users**, crie o usuário administrador (ou convide o e-mail).
4. Depois que o usuário existir, execute no SQL Editor, substituindo o e-mail:
   ```sql
   insert into public.ecofix_admins (user_id)
   select id from auth.users where email = 'SEU-EMAIL-ADMIN'
   on conflict (user_id) do nothing;
   ```
5. Em **Project Settings > API**, copie a Project URL e a publishable key (ou anon key legada). A chave publishable/anon pode estar no frontend quando RLS está configurado; nunca use a secret/service_role key no navegador.

## Migração dos dados locais
A integração do navegador ainda precisa ser conectada ao projeto Supabase. Não apague o armazenamento local `ecofix_dados_v1`. A primeira sincronização deverá comparar o registro central com os dados locais e pedir confirmação antes de importar, para evitar sobrescrever dados existentes.

**Não compartilhe senhas nem chaves secret/service_role.**