# Guia de Configuração — Supabase + Deploy na Vercel (EPZM)

Siga este passo a passo para ativar o painel administrativo (`/admin/`) com banco de dados, upload de imagens e autenticação segura.

---

## 1. Criar o Projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com) e faça login (ou crie uma conta gratuita).
2. Clique em **New project**.
3. Escolha um nome (ex.: `epzm-website`), defina uma **senha forte para o banco** e selecione a região mais próxima (**South America (São Paulo)**).
4. Aguarde cerca de 1 a 2 minutos até o projeto ficar pronto.

---

## 2. Criar Tabelas, Políticas de Segurança (RLS) e Storage

1. No menu lateral do Supabase, abra **SQL Editor**.
2. Clique em **New query**.
3. Copie todo o conteúdo do arquivo [`supabase/schema.sql`](./schema.sql) deste repositório e cole no editor.
4. Clique em **Run** (ou pressione `Ctrl + Enter`).
5. Confirme a mensagem **Success**. Isso cria automaticamente:
   - Tabela `equipe_servidores` (com os 8 servidores iniciais já preenchidos);
   - Tabela `noticias_eventos`;
   - Tabela `imagens_site` (com os 3 slots principais prontos);
   - Políticas **RLS** garantindo que apenas administradores logados possam alterar dados e que visitantes só vejam itens ativos/publicados;
   - Bucket de Storage `midias-site` com limite de 5 MB e aceitação exclusiva de imagens (`webp`, `jpeg`, `png`).

---

## 3. Desativar Cadastro Público (Segurança Obrigatória)

Para garantir que **ninguém de fora** consiga criar uma conta no painel administrativo:

1. No menu lateral do Supabase, acesse **Authentication → Providers → Email**.
2. Desmarque a opção **Allow new users to sign up** (ou *Confirm email* conforme a interface atual; o essencial é desabilitar o auto-cadastro).
3. Clique em **Save**.

---

## 4. Criar o Primeiro Usuário Administrador

1. No menu lateral do Supabase, acesse **Authentication → Users**.
2. Clique em **Add user → Create new user**.
3. Informe o **e-mail** e a **senha** do administrador da escola.
4. Marque **Auto Confirm User** para liberar o acesso imediatamente.
5. Clique em **Create user**.

> Sempre que quiser conceder acesso a outro responsável da escola, basta criar um novo usuário por aqui. Para revogar o acesso, exclua ou desative o usuário nessa mesma tela.

---

## 5. Conectar o Site ao Supabase

1. No Supabase, vá em **Project Settings → API** (ou **Data API / API Keys**).
2. Copie:
   - **Project URL** (ex.: `https://abcdefghijkl.supabase.co`)
   - **anon / public key** (ou *Publishable key*) — **NUNCA** copie a chave `service_role`!
3. Abra o arquivo [`js/supabase-config.js`](../js/supabase-config.js) neste projeto e substitua os valores:

```javascript
window.EPZM_SUPABASE_CONFIG = {
  url: 'https://SEU-PROJETO.supabase.co',
  anonKey: 'SUA-CHAVE-ANON-AQUI',
  storageBucket: 'midias-site',
};
```

4. Salve e faça commit/push para o repositório no GitHub.

---

## 6. Deploy na Vercel

1. Acesse [https://vercel.com](https://vercel.com) e clique em **Add New… → Project**.
2. Importe o repositório `epzm-website` do GitHub.
3. Configurações de build (site estático puro):
   - **Framework Preset**: `Other`
   - **Build Command**: *(deixe em branco)*
   - **Output Directory**: *(deixe em branco / `.`)*
4. Clique em **Deploy**.
5. O arquivo [`vercel.json`](../vercel.json) já aplica cabeçalhos HTTP de segurança (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) automaticamente.

---

## 7. Configurar URLs de Redirecionamento no Supabase (Convites e Recuperação)

Após o deploy na Vercel (com o domínio `.vercel.app` ou seu domínio próprio):

1. No Supabase, vá em **Authentication → URL Configuration**.
2. Em **Site URL**, informe o endereço do site publicado (sem barra no final), por exemplo:
   - `https://epzm-website.vercel.app` *(ou seu domínio próprio `https://escolazenaidemagalhaes.com.br`)*
   - *(Para testar convites/redefinição localmente antes do deploy, você pode colocar temporariamente `http://localhost:8000` e depois trocar para o domínio da Vercel.)*
3. Em **Redirect URLs**, adicione:
   - `https://SEU-DOMINIO/admin/`
   - `https://SEU-DOMINIO/admin/index.html`
   - `https://SEU-DOMINIO/admin/primeiro-acesso.html`
   - `https://SEU-DOMINIO/admin/redefinir-senha.html`
   - `http://localhost:8000/admin/primeiro-acesso.html` *(para testes locais)*
   - `http://localhost:8000/admin/redefinir-senha.html` *(para testes locais)*
4. Clique em **Save**.

---

## 8. Personalizar os E-mails no Supabase (Convite e Esqueci a Senha)

No painel do Supabase, acesse **Authentication → Emails** (ou **Email Templates**) e personalize os dois templates abaixo:

### Template 1: Invite user (Convite / Primeiro Acesso)
- **Subject (Assunto)**: `Convite para o Painel Administrativo — Escola Presbiteriana Zenaide Magalhães`
- **Message Body (HTML)**: copie e cole todo o conteúdo do arquivo [`supabase/templates/convite-usuario.html`](./templates/convite-usuario.html).
- Clique em **Save**.

### Template 2: Reset password (Esqueci a Senha)
- **Subject (Assunto)**: `Redefinição de senha — Painel Administrativo EPZM`
- **Message Body (HTML)**: copie e cole todo o conteúdo do arquivo [`supabase/templates/redefinir-senha.html`](./templates/redefinir-senha.html).
- Clique em **Save**.

> **Nota sobre e-mail próprio (SMTP opcional):** O servidor de e-mail padrão do Supabase funciona imediatamente para convidar a equipe administrativa (com limite reduzido de envios por hora). Caso no futuro queira enviar e-mails saindo do domínio oficial da escola (ex.: `nao-responda@escolazenaidemagalhaes.com.br`) com maior limite, basta configurar um provedor SMTP (como **Resend** ou **Brevo**) em **Project Settings → Authentication → SMTP Settings**.

---

## 9. Como Convidar Novos Administradores

1. No Supabase, vá em **Authentication → Users**.
2. Clique em **Add user → Send invitation** (ou **Invite user**).
3. Digite o e-mail da pessoa e envie.
4. Ela receberá o e-mail personalizado da EPZM, clicará em **Ativar meu acesso**, cairá na página protegida `/admin/primeiro-acesso.html`, informará seu **Nome completo** e criará sua **senha forte**.

---

## 10. Como Acessar o Painel Administrativo

- Acesse `https://SEU-DOMINIO/admin/` (ou clique no link discreto **Área Administrativa** no rodapé da página inicial).
- Faça login com o e-mail e a senha cadastrados.
- Caso esqueça a senha, clique em **Esqueci minha senha** (`/admin/esqueci-senha.html`).
- Qualquer alteração salva em **Equipe**, **Notícias & Eventos** ou **Imagens do Site** aparece imediatamente no site público.
