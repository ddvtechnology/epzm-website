-- ============================================================================
-- Escola Presbiteriana Zenaide Magalhães (EPZM)
-- Schema Consolidado de Produção — Supabase (PostgreSQL + RLS + Storage)
--
-- Tabelas ativas do projeto (5):
--   1. public.equipe_servidores  -> Equipe & Servidores (CRUD + até 4 destaques na Home)
--   2. public.noticias_eventos   -> Notícias, Eventos e Comunicados (CRUD + rascunho/publicado)
--   3. public.imagens_site       -> Imagens principais da Home (Hero, Fachada e Matrículas)
--   4. public.configuracoes_site -> Aviso Fixo no Topo, Seções/Matrícula e Dados da Escola
--   5. public.acessos_site       -> Contagem diária anônima (LGPD) com retenção de 30 dias
--
-- Boas práticas:
-- - Nomes em português (snake_case), UUIDs, auditoria (criado_em/atualizado_em)
-- - Restrições CHECK e índices voltados às consultas públicas
-- - Row Level Security (RLS) obrigatório em todas as tabelas e no Storage
-- - Script 100% idempotente (pode ser reexecutado com segurança)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. FUNÇÃO DE AUDITORIA (atualizado_em)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.atualizar_coluna_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. TABELA: equipe_servidores
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.equipe_servidores (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT        NOT NULL CHECK (char_length(trim(nome)) >= 2 AND char_length(nome) <= 120),
  cargo           TEXT        NOT NULL CHECK (char_length(trim(cargo)) >= 2 AND char_length(cargo) <= 120),
  categoria       TEXT        NOT NULL CHECK (categoria IN ('direcao', 'coordenacao', 'docentes')),
  foto_url        TEXT,
  foto_caminho    TEXT,
  destaque_home   BOOLEAN     NOT NULL DEFAULT false,
  ordem_exibicao  INTEGER     NOT NULL DEFAULT 0 CHECK (ordem_exibicao >= 0),
  ativo           BOOLEAN     NOT NULL DEFAULT true,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_equipe_servidores_ativos_ordem
  ON public.equipe_servidores (ordem_exibicao ASC, nome ASC)
  WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_equipe_servidores_destaque_home
  ON public.equipe_servidores (ordem_exibicao ASC, nome ASC)
  WHERE ativo = true AND destaque_home = true;

DROP TRIGGER IF EXISTS trg_equipe_servidores_atualizado_em ON public.equipe_servidores;
CREATE TRIGGER trg_equipe_servidores_atualizado_em
  BEFORE UPDATE ON public.equipe_servidores
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_coluna_atualizado_em();

ALTER TABLE public.equipe_servidores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura publica de servidores ativos" ON public.equipe_servidores;
CREATE POLICY "Leitura publica de servidores ativos"
  ON public.equipe_servidores FOR SELECT TO anon USING (ativo = true);

DROP POLICY IF EXISTS "Gestao completa de servidores para autenticados" ON public.equipe_servidores;
CREATE POLICY "Gestao completa de servidores para autenticados"
  ON public.equipe_servidores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- 3. TABELA: noticias_eventos
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.noticias_eventos (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo               TEXT        NOT NULL CHECK (char_length(trim(titulo)) >= 3 AND char_length(titulo) <= 180),
  slug                 TEXT        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  resumo               TEXT        NOT NULL CHECK (char_length(trim(resumo)) >= 5 AND char_length(resumo) <= 400),
  conteudo             TEXT        NOT NULL CHECK (char_length(trim(conteudo)) >= 10),
  categoria            TEXT        NOT NULL DEFAULT 'noticia' CHECK (categoria IN ('noticia', 'evento', 'comunicado')),
  imagem_capa_url      TEXT,
  imagem_capa_caminho  TEXT,
  data_publicacao      DATE        NOT NULL DEFAULT CURRENT_DATE,
  destaque_home        BOOLEAN     NOT NULL DEFAULT true,
  publicado            BOOLEAN     NOT NULL DEFAULT false,
  criado_em            TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  atualizado_em        TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_noticias_eventos_publicadas
  ON public.noticias_eventos (data_publicacao DESC, criado_em DESC)
  WHERE publicado = true;

CREATE INDEX IF NOT EXISTS idx_noticias_eventos_home
  ON public.noticias_eventos (destaque_home DESC, data_publicacao DESC, criado_em DESC)
  WHERE publicado = true;

DROP TRIGGER IF EXISTS trg_noticias_eventos_atualizado_em ON public.noticias_eventos;
CREATE TRIGGER trg_noticias_eventos_atualizado_em
  BEFORE UPDATE ON public.noticias_eventos
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_coluna_atualizado_em();

ALTER TABLE public.noticias_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura publica de noticias publicadas" ON public.noticias_eventos;
CREATE POLICY "Leitura publica de noticias publicadas"
  ON public.noticias_eventos FOR SELECT TO anon USING (publicado = true);

DROP POLICY IF EXISTS "Gestao completa de noticias para autenticados" ON public.noticias_eventos;
CREATE POLICY "Gestao completa de noticias para autenticados"
  ON public.noticias_eventos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- 4. TABELA: imagens_site
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.imagens_site (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chave              TEXT        NOT NULL UNIQUE CHECK (chave IN ('hero_principal', 'sobre_fachada', 'cta_matriculas')),
  titulo             TEXT        NOT NULL,
  descricao          TEXT,
  imagem_url         TEXT,
  imagem_caminho     TEXT,
  texto_alternativo  TEXT        NOT NULL DEFAULT '',
  atualizado_em      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS trg_imagens_site_atualizado_em ON public.imagens_site;
CREATE TRIGGER trg_imagens_site_atualizado_em
  BEFORE UPDATE ON public.imagens_site
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_coluna_atualizado_em();

ALTER TABLE public.imagens_site ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura publica de imagens do site" ON public.imagens_site;
CREATE POLICY "Leitura publica de imagens do site"
  ON public.imagens_site FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Atualizacao de imagens do site para autenticados" ON public.imagens_site;
CREATE POLICY "Atualizacao de imagens do site para autenticados"
  ON public.imagens_site FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- 5. TABELA: configuracoes_site (registro único id = 1)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.configuracoes_site (
  id                     INTEGER     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  whatsapp_numero        TEXT        NOT NULL DEFAULT '558196772053',
  whatsapp_exibicao      TEXT        NOT NULL DEFAULT '(81) 9677-2053',
  email_contato          TEXT        NOT NULL DEFAULT 'contato@epzm.com.br',
  ano_matricula          TEXT        NOT NULL DEFAULT '2027',
  link_matricula         TEXT        NOT NULL DEFAULT '#contato',
  link_trabalhe_conosco  TEXT        NOT NULL DEFAULT 'mailto:contato@epzm.com.br?subject=Trabalhe%20Conosco',
  stat_alunos            TEXT        NOT NULL DEFAULT '+650',
  stat_professores       TEXT        NOT NULL DEFAULT '+45',
  stat_anos_historia     TEXT        NOT NULL DEFAULT '+20',
  stat_compromisso       TEXT        NOT NULL DEFAULT '100%',
  link_instagram         TEXT        NOT NULL DEFAULT 'https://www.instagram.com/escolazenaidemagalhaes?igsh=MXUzbzU1NHZmdHBydw==',
  link_facebook          TEXT        NOT NULL DEFAULT 'https://www.facebook.com/escolazenaidemagalhaes.sbu/',
  link_youtube           TEXT        NOT NULL DEFAULT '',
  aviso_ativo            BOOLEAN     NOT NULL DEFAULT false,
  aviso_texto            TEXT        NOT NULL DEFAULT '',
  aviso_link             TEXT        NOT NULL DEFAULT '',
  aviso_cor              TEXT        NOT NULL DEFAULT '#D97706'
                         CHECK (aviso_cor IN ('verde', 'ambar', 'roxo') OR aviso_cor ~ '^#[0-9A-Fa-f]{6}$'),
  email_dpo              TEXT        NOT NULL DEFAULT 'contato@epzm.com.br',
  controles_visuais      JSONB       NOT NULL DEFAULT '{
    "mostrar_secao_diferenciais": true,
    "mostrar_secao_mackenzie": true,
    "mostrar_secao_segmentos": true,
    "mostrar_secao_eventos": true,
    "mostrar_secao_equipe": true,
    "mostrar_secao_matriculas": true,
    "mostrar_btn_matricula": true,
    "texto_btn_matricula": "MATRÍCULA E REMATRÍCULA"
  }'::jsonb,
  atualizado_em          TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS trg_configuracoes_site_atualizado_em ON public.configuracoes_site;
CREATE TRIGGER trg_configuracoes_site_atualizado_em
  BEFORE UPDATE ON public.configuracoes_site
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_coluna_atualizado_em();

ALTER TABLE public.configuracoes_site ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura publica de configuracoes do site" ON public.configuracoes_site;
CREATE POLICY "Leitura publica de configuracoes do site"
  ON public.configuracoes_site FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Atualizacao de configuracoes para autenticados" ON public.configuracoes_site;
CREATE POLICY "Atualizacao de configuracoes para autenticados"
  ON public.configuracoes_site FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- 6. TABELA: acessos_site (Agregado diário 100% anônimo LGPD — retenção 30 dias)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.acessos_site (
  data_acesso    DATE    NOT NULL DEFAULT CURRENT_DATE,
  pagina         TEXT    NOT NULL CHECK (pagina IN ('inicio', 'equipe', 'noticias', 'privacidade', 'lgpd')),
  total_acessos  INTEGER NOT NULL DEFAULT 0 CHECK (total_acessos >= 0),
  PRIMARY KEY (data_acesso, pagina)
);

CREATE INDEX IF NOT EXISTS idx_acessos_site_data_desc
  ON public.acessos_site (data_acesso DESC);

ALTER TABLE public.acessos_site ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de acessos apenas para autenticados" ON public.acessos_site;
CREATE POLICY "Leitura de acessos apenas para autenticados"
  ON public.acessos_site FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.registrar_acesso_site(p_pagina TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_pagina NOT IN ('inicio', 'equipe', 'noticias', 'privacidade', 'lgpd') THEN
    RETURN;
  END IF;

  DELETE FROM public.acessos_site
  WHERE data_acesso < (CURRENT_DATE - INTERVAL '30 days')::DATE;

  INSERT INTO public.acessos_site (data_acesso, pagina, total_acessos)
  VALUES (CURRENT_DATE, p_pagina, 1)
  ON CONFLICT (data_acesso, pagina)
  DO UPDATE SET total_acessos = public.acessos_site.total_acessos + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_acesso_site(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_acesso_site(TEXT) TO anon, authenticated;

-- ============================================================================
-- 7. SUPABASE STORAGE — BUCKET midias-site (limite 5 MB, somente imagens)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'midias-site',
  'midias-site',
  true,
  5242880,
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Leitura publica do bucket midias-site" ON storage.objects;
CREATE POLICY "Leitura publica do bucket midias-site"
  ON storage.objects FOR SELECT TO public USING (bucket_id = 'midias-site');

DROP POLICY IF EXISTS "Upload autenticado no bucket midias-site" ON storage.objects;
CREATE POLICY "Upload autenticado no bucket midias-site"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'midias-site');

DROP POLICY IF EXISTS "Atualizacao autenticada no bucket midias-site" ON storage.objects;
CREATE POLICY "Atualizacao autenticada no bucket midias-site"
  ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'midias-site') WITH CHECK (bucket_id = 'midias-site');

DROP POLICY IF EXISTS "Exclusao autenticada no bucket midias-site" ON storage.objects;
CREATE POLICY "Exclusao autenticada no bucket midias-site"
  ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'midias-site');

-- ============================================================================
-- 8. CARGA INICIAL (SEED) — DADOS PADRÃO
-- ============================================================================

INSERT INTO public.configuracoes_site (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.imagens_site (chave, titulo, descricao, imagem_url, texto_alternativo)
VALUES
  ('hero_principal', 'Banner Principal (Hero)', 'Foto em destaque no topo da página inicial ao lado do versículo bíblico.', NULL, 'Alunos sorrindo em sala de aula'),
  ('sobre_fachada',  'Fachada da Escola',       'Imagem exibida na seção Sobre Nós ao lado dos números da escola.',          NULL, 'Fachada da Escola Presbiteriana Zenaide Magalhães'),
  ('cta_matriculas', 'Banner de Matrículas',    'Imagem exibida no card verde de Matrículas Abertas no final da Home.',      NULL, 'Estudante da escola')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO public.equipe_servidores (nome, cargo, categoria, foto_url, destaque_home, ordem_exibicao, ativo)
SELECT v.nome, v.cargo, v.categoria, v.foto_url, v.destaque_home, v.ordem_exibicao, true
FROM (
  VALUES
    ('Maria Eduarda Santos',   'Diretora Geral',                    'direcao',     'assets/img/equipe-1.png', true,  1),
    ('José Carlos Lima',       'Diretor Pedagógico',                'direcao',     'assets/img/equipe-2.png', true,  2),
    ('Ana Beatriz Costa',      'Coordenadora da Educação Infantil', 'coordenacao', 'assets/img/equipe-3.png', true,  3),
    ('Fernanda Oliveira Melo', 'Coordenadora do Fundamental II',    'coordenacao', 'assets/img/equipe-4.png', true,  4),
    ('Prof. Lucas Almeida',    'Matemática & Raciocínio Lógico',    'docentes',    'assets/img/equipe-5.png', false, 5),
    ('Profa. Camila Rocha',    'Língua Portuguesa & Literatura',    'docentes',    'assets/img/equipe-6.png', false, 6),
    ('Cláudia Rodrigues',      'Coordenadora do Fundamental I',     'coordenacao', 'assets/img/equipe-3.png', false, 7),
    ('Prof. Rafael Torres',    'História & Ensino Religioso',       'docentes',    'assets/img/equipe-5.png', false, 8)
) AS v(nome, cargo, categoria, foto_url, destaque_home, ordem_exibicao)
WHERE NOT EXISTS (SELECT 1 FROM public.equipe_servidores LIMIT 1);
