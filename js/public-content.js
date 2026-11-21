/**
 * Escola Presbiteriana Zenaide Magalhães
 * Carregamento dinâmico de conteúdo público via Supabase (com fallback transparente).
 *
 * Segurança:
 * - Usa apenas consultas públicas permitidas pelas políticas RLS (registros ativos/publicados).
 * - Toda renderização utiliza DOM API segura (textContent / createElement) para prevenir XSS.
 */

(function () {
  const CATEGORIA_NOTICIA_LABEL = {
    noticia: 'Notícia',
    evento: 'Evento',
    comunicado: 'Comunicado',
  };

  let noticiasCache = [];
  let filtroNoticiaAtual = 'all';
  let buscaNoticiaAtual = '';
  let filtroEquipeAtual = 'all';

  /* -----------------------------------------------------------
     Utilitários seguros
  ----------------------------------------------------------- */
  function formatDateBR(dateStr) {
    if (!dateStr) return '';
    const parts = String(dateStr).split('T')[0].split('-');
    if (parts.length !== 3) return dateStr;
    const meses = [
      'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
      'jul', 'ago', 'set', 'out', 'nov', 'dez',
    ];
    const ano = parts[0];
    const mesIdx = parseInt(parts[1], 10) - 1;
    const dia = parts[2];
    if (mesIdx < 0 || mesIdx > 11) return dateStr;
    return `${dia} de ${meses[mesIdx]} de ${ano}`;
  }

  function isSafeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    return (
      trimmed.startsWith('https://') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('assets/') ||
      trimmed.startsWith('./assets/') ||
      trimmed.startsWith('/assets/')
    );
  }

  function clearElement(el) {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  /* -----------------------------------------------------------
     1. Imagens Principais do Site (index.html)
  ----------------------------------------------------------- */
  async function loadSiteImages() {
    const targets = document.querySelectorAll('[data-site-image]');
    if (!targets.length || !window.epzmSupabase) return;

    const { data, error } = await window.epzmSupabase
      .from('imagens_site')
      .select('chave, imagem_url, texto_alternativo');

    if (error || !Array.isArray(data)) return;

    const byKey = {};
    data.forEach((item) => {
      byKey[item.chave] = item;
    });

    targets.forEach((imgEl) => {
      const chave = imgEl.getAttribute('data-site-image');
      const record = byKey[chave];
      if (!record) return;

      if (record.imagem_url && isSafeUrl(record.imagem_url)) {
        imgEl.setAttribute('src', record.imagem_url);
      }
      if (record.texto_alternativo && record.texto_alternativo.trim()) {
        imgEl.setAttribute('alt', record.texto_alternativo.trim());
      }
    });
  }

  /* -----------------------------------------------------------
     2. Equipe / Servidores (index.html + equipe.html)
  ----------------------------------------------------------- */
  function createEquipeCard(membro, index, withAos) {
    const card = document.createElement('div');
    card.className = 'equipe-card';
    card.setAttribute('data-category', membro.categoria || 'docentes');

    if (withAos) {
      card.setAttribute('data-aos', 'fade-up');
      card.setAttribute('data-aos-delay', String(((index % 4) + 1) * 100));
    }

    const avatar = document.createElement('div');
    avatar.className = 'equipe-avatar';

    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src = isSafeUrl(membro.foto_url) ? membro.foto_url : 'assets/img/equipe-1.png';
    img.alt = membro.nome || 'Membro da equipe';
    img.onerror = function () {
      this.onerror = null;
      this.src = 'assets/img/equipe-1.png';
    };

    avatar.appendChild(img);

    const nome = document.createElement('h3');
    nome.className = 'equipe-nome';
    nome.textContent = membro.nome || '';

    const cargo = document.createElement('p');
    cargo.className = 'equipe-cargo';
    cargo.textContent = membro.cargo || '';

    card.appendChild(avatar);
    card.appendChild(nome);
    card.appendChild(cargo);

    return card;
  }

  function applyEquipeFilter() {
    const grid = document.getElementById('equipeGrid');
    if (!grid) return;

    let visibleCount = 0;
    grid.querySelectorAll('.equipe-card').forEach((card) => {
      const cat = card.getAttribute('data-category');
      const show = filtroEquipeAtual === 'all' || cat === filtroEquipeAtual;
      card.style.display = show ? 'block' : 'none';
      if (show) visibleCount++;
    });

    const emptyEl = document.getElementById('equipeEmptyState');
    if (emptyEl) {
      emptyEl.classList.toggle('d-none', visibleCount > 0);
    }
  }

  function setupEquipeFilters() {
    const filterButtons = document.querySelectorAll('.equipe-filters .filter-btn');
    if (!filterButtons.length) return;

    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        filtroEquipeAtual = btn.getAttribute('data-filter') || 'all';
        applyEquipeFilter();
      });
    });
  }

  async function loadEquipePreview() {
    const grid = document.getElementById('equipePreviewGrid');
    const emptyEl = document.getElementById('equipePreviewEmpty');
    if (!grid || !window.epzmSupabase) return;

    const { data, error } = await window.epzmSupabase
      .from('equipe_servidores')
      .select('id, nome, cargo, categoria, foto_url, ordem_exibicao')
      .eq('ativo', true)
      .eq('destaque_home', true)
      .order('ordem_exibicao', { ascending: true })
      .order('nome', { ascending: true })
      .limit(4);

    // Em caso de falha de rede/API, mantém o fallback estático
    if (error || !Array.isArray(data)) return;

    clearElement(grid);

    if (data.length === 0) {
      if (emptyEl) emptyEl.classList.remove('d-none');
      return;
    }

    if (emptyEl) emptyEl.classList.add('d-none');
    data.forEach((membro, idx) => {
      grid.appendChild(createEquipeCard(membro, idx, true));
    });

    if (window.AOS && typeof window.AOS.refresh === 'function') {
      window.AOS.refresh();
    }
  }

  async function loadEquipeCompleta() {
    const grid = document.getElementById('equipeGrid');
    if (!grid || !window.epzmSupabase) return;

    const { data, error } = await window.epzmSupabase
      .from('equipe_servidores')
      .select('id, nome, cargo, categoria, foto_url, ordem_exibicao')
      .eq('ativo', true)
      .order('ordem_exibicao', { ascending: true })
      .order('nome', { ascending: true });

    // Em caso de falha de rede/API, mantém o fallback estático
    if (error || !Array.isArray(data)) return;

    clearElement(grid);
    data.forEach((membro, idx) => {
      grid.appendChild(createEquipeCard(membro, idx, false));
    });

    applyEquipeFilter();
  }

  /* -----------------------------------------------------------
     3. Notícias e Eventos (index.html + noticias.html)
  ----------------------------------------------------------- */
  function openNoticiaModal(noticia) {
    const modalEl = document.getElementById('noticiaModal');
    if (!modalEl || !window.bootstrap) return;

    const badgeEl = modalEl.querySelector('#noticiaModalBadge');
    const dateEl = modalEl.querySelector('#noticiaModalDate');
    const titleEl = modalEl.querySelector('#noticiaModalTitle');
    const coverWrap = modalEl.querySelector('#noticiaModalCoverWrap');
    const coverEl = modalEl.querySelector('#noticiaModalCover');
    const bodyEl = modalEl.querySelector('#noticiaModalBody');
    const shareBtn = modalEl.querySelector('#noticiaModalShareBtn');

    const cat = noticia.categoria || 'noticia';
    if (badgeEl) {
      badgeEl.textContent = CATEGORIA_NOTICIA_LABEL[cat] || 'Notícia';
      badgeEl.className = 'noticia-badge noticia-badge-' + cat;
    }
    if (dateEl) {
      dateEl.textContent = formatDateBR(noticia.data_publicacao);
    }
    if (titleEl) {
      titleEl.textContent = noticia.titulo || '';
    }

    if (coverWrap && coverEl) {
      if (noticia.imagem_capa_url && isSafeUrl(noticia.imagem_capa_url)) {
        coverEl.src = noticia.imagem_capa_url;
        coverEl.alt = noticia.titulo || 'Imagem da notícia';
        coverWrap.classList.remove('d-none');
      } else {
        coverWrap.classList.add('d-none');
      }
    }

    if (bodyEl) {
      clearElement(bodyEl);
      const paragraphs = String(noticia.conteudo || noticia.resumo || '')
        .split(/\n{2,}|\r\n\r\n/)
        .map((p) => p.trim())
        .filter(Boolean);

      if (!paragraphs.length) {
        const p = document.createElement('p');
        p.textContent = noticia.resumo || '';
        bodyEl.appendChild(p);
      } else {
        paragraphs.forEach((text) => {
          const p = document.createElement('p');
          p.textContent = text;
          bodyEl.appendChild(p);
        });
      }
    }

    if (shareBtn) {
      const shareUrl = new URL('noticias.html', window.location.href);
      if (noticia.slug) {
        shareUrl.searchParams.set('noticia', noticia.slug);
      }
      shareBtn.onclick = async function () {
        try {
          await navigator.clipboard.writeText(shareUrl.toString());
          const originalHtml = shareBtn.innerHTML;
          shareBtn.textContent = 'Link copiado!';
          setTimeout(() => {
            shareBtn.innerHTML = originalHtml;
          }, 2000);
        } catch (_) {
          window.prompt('Copie o link abaixo:', shareUrl.toString());
        }
      };
    }

    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
    modalInstance.show();
  }

  function createNoticiaCard(noticia) {
    const article = document.createElement('article');
    article.className = 'noticia-card';

    const media = document.createElement('div');
    media.className = 'noticia-card-media';

    if (noticia.imagem_capa_url && isSafeUrl(noticia.imagem_capa_url)) {
      const img = document.createElement('img');
      img.src = noticia.imagem_capa_url;
      img.alt = noticia.titulo || 'Imagem da notícia';
      img.loading = 'lazy';
      media.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'noticia-card-placeholder';
      const icon = document.createElement('i');
      icon.className =
        noticia.categoria === 'evento'
          ? 'bi bi-calendar-event'
          : noticia.categoria === 'comunicado'
            ? 'bi bi-megaphone'
            : 'bi bi-newspaper';
      placeholder.appendChild(icon);
      media.appendChild(placeholder);
    }

    const cat = noticia.categoria || 'noticia';
    const badge = document.createElement('span');
    badge.className = 'noticia-badge noticia-badge-' + cat;
    badge.textContent = CATEGORIA_NOTICIA_LABEL[cat] || 'Notícia';
    media.appendChild(badge);

    const content = document.createElement('div');
    content.className = 'noticia-card-body';

    const meta = document.createElement('div');
    meta.className = 'noticia-card-meta';
    const calIcon = document.createElement('i');
    calIcon.className = 'bi bi-calendar3';
    const dateSpan = document.createElement('span');
    dateSpan.textContent = formatDateBR(noticia.data_publicacao);
    meta.appendChild(calIcon);
    meta.appendChild(dateSpan);

    const title = document.createElement('h3');
    title.className = 'noticia-card-title';
    title.textContent = noticia.titulo || '';

    const resumo = document.createElement('p');
    resumo.className = 'noticia-card-excerpt';
    resumo.textContent = noticia.resumo || '';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'noticia-card-link';
    btn.textContent = 'Ler completo ';
    const arrow = document.createElement('i');
    arrow.className = 'bi bi-arrow-right';
    btn.appendChild(arrow);
    btn.addEventListener('click', () => openNoticiaModal(noticia));

    content.appendChild(meta);
    content.appendChild(title);
    content.appendChild(resumo);
    content.appendChild(btn);

    article.appendChild(media);
    article.appendChild(content);

    return article;
  }

  function renderNoticiasPageList() {
    const grid = document.getElementById('noticiasFullGrid');
    const emptyEl = document.getElementById('noticiasEmptyState');
    if (!grid) return;

    const termo = buscaNoticiaAtual.trim().toLowerCase();
    const filtradas = noticiasCache.filter((n) => {
      const catOk = filtroNoticiaAtual === 'all' || n.categoria === filtroNoticiaAtual;
      const textoOk =
        !termo ||
        String(n.titulo || '').toLowerCase().includes(termo) ||
        String(n.resumo || '').toLowerCase().includes(termo);
      return catOk && textoOk;
    });

    clearElement(grid);

    if (!filtradas.length) {
      if (emptyEl) emptyEl.classList.remove('d-none');
      return;
    }

    if (emptyEl) emptyEl.classList.add('d-none');
    filtradas.forEach((n) => grid.appendChild(createNoticiaCard(n)));
  }

  function setupNoticiasControls() {
    const filterButtons = document.querySelectorAll('.noticias-filters .filter-btn');
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        filtroNoticiaAtual = btn.getAttribute('data-filter') || 'all';
        renderNoticiasPageList();
      });
    });

    const searchInput = document.getElementById('noticiasSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        buscaNoticiaAtual = e.target.value || '';
        renderNoticiasPageList();
      });
    }
  }

  async function loadNoticiasHome() {
    const grid = document.getElementById('noticiasHomeGrid');
    const emptyEl = document.getElementById('noticiasHomeEmpty');
    if (!grid) return;

    if (!window.epzmSupabase) {
      if (emptyEl) emptyEl.classList.remove('d-none');
      return;
    }

    const { data, error } = await window.epzmSupabase
      .from('noticias_eventos')
      .select('id, titulo, slug, resumo, conteudo, categoria, imagem_capa_url, data_publicacao, destaque_home')
      .eq('publicado', true)
      .order('destaque_home', { ascending: false })
      .order('data_publicacao', { ascending: false })
      .order('criado_em', { ascending: false })
      .limit(3);

    if (error || !Array.isArray(data) || data.length === 0) {
      if (emptyEl) emptyEl.classList.remove('d-none');
      return;
    }

    clearElement(grid);
    if (emptyEl) emptyEl.classList.add('d-none');
    data.forEach((n) => grid.appendChild(createNoticiaCard(n)));
  }

  async function loadNoticiasFullPage() {
    const grid = document.getElementById('noticiasFullGrid');
    const loadingEl = document.getElementById('noticiasLoadingState');
    const emptyEl = document.getElementById('noticiasEmptyState');
    if (!grid) return;

    if (!window.epzmSupabase) {
      if (loadingEl) loadingEl.classList.add('d-none');
      if (emptyEl) emptyEl.classList.remove('d-none');
      return;
    }

    const { data, error } = await window.epzmSupabase
      .from('noticias_eventos')
      .select('id, titulo, slug, resumo, conteudo, categoria, imagem_capa_url, data_publicacao, destaque_home')
      .eq('publicado', true)
      .order('data_publicacao', { ascending: false })
      .order('criado_em', { ascending: false });

    if (loadingEl) loadingEl.classList.add('d-none');

    if (error || !Array.isArray(data)) {
      if (emptyEl) emptyEl.classList.remove('d-none');
      return;
    }

    noticiasCache = data;
    renderNoticiasPageList();

    // Suporte a link compartilhado: noticias.html?noticia=meu-slug
    const params = new URLSearchParams(window.location.search);
    const slugParam = params.get('noticia');
    if (slugParam) {
      const found = noticiasCache.find((item) => item.slug === slugParam);
      if (found) {
        openNoticiaModal(found);
      }
    }
  }

  /* -----------------------------------------------------------
     4. Configurações do Gestor + Aviso no Topo + Acessos (LGPD)
  ----------------------------------------------------------- */
  const LEGACY_AVISO_COLORS = {
    ambar: '#D97706',
    verde: '#0F5A45',
    roxo: '#4C1D95',
  };

  function resolveAvisoHex(cor) {
    const raw = String(cor || '').trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(raw)) return raw;
    return LEGACY_AVISO_COLORS[raw] || '#D97706';
  }

  function getContrastTextColor(hex) {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 165 ? '#18221F' : '#FFFFFF';
  }

  function renderAnnouncementBar(cfg) {
    if (!cfg || !cfg.aviso_ativo || !String(cfg.aviso_texto || '').trim()) return;

    const header = document.querySelector('.site-header-sticky');
    if (!header || document.getElementById('siteAnnouncementBar')) return;

    const hex = resolveAvisoHex(cfg.aviso_cor);
    const textColor = getContrastTextColor(hex);

    const bar = document.createElement('div');
    bar.id = 'siteAnnouncementBar';
    bar.className = 'site-announcement-bar';
    bar.style.background = hex;
    bar.style.color = textColor;

    const inner = document.createElement('div');
    inner.className = 'container-custom site-announcement-inner';

    const content = document.createElement('div');
    content.className = 'site-announcement-text';

    const icon = document.createElement('i');
    icon.className = 'bi bi-megaphone-fill me-2';
    content.appendChild(icon);

    const span = document.createElement('span');
    span.textContent = cfg.aviso_texto.trim();
    content.appendChild(span);

    const normalizedLink = normalizeMenuUrl(cfg.aviso_link);
    if (normalizedLink) {
      const link = document.createElement('a');
      link.href = normalizedLink;
      link.className = 'site-announcement-cta';
      link.style.setProperty('color', textColor, 'important');
      link.textContent = 'Saiba mais →';
      if (normalizedLink.startsWith('http')) {
        link.target = '_blank';
        link.rel = 'noopener';
      }
      content.appendChild(link);
    }

    inner.appendChild(content);
    bar.appendChild(inner);
    header.insertBefore(bar, header.firstChild);
  }

  function applyVisualControls(ctrl) {
    if (!ctrl || typeof ctrl !== 'object') return;

    const toggleSelectors = [
      ['mostrar_secao_diferenciais', '[data-toggle-section="diferenciais"], [data-toggle-menu="proposta"]'],
      ['mostrar_secao_mackenzie', '[data-toggle-section="mackenzie"]'],
      ['mostrar_secao_segmentos', '[data-toggle-section="segmentos"], [data-toggle-menu="segmentos"]'],
      ['mostrar_secao_eventos', '[data-toggle-section="eventos"], [data-toggle-menu="eventos"]'],
      ['mostrar_secao_equipe', '[data-toggle-section="equipe"], [data-toggle-menu="equipe"]'],
      ['mostrar_secao_matriculas', '[data-toggle-section="matriculas"]'],
      ['mostrar_btn_matricula', '[data-toggle-item="btn-matricula"]'],
    ];

    toggleSelectors.forEach(([key, selector]) => {
      if (ctrl[key] === false) {
        document.querySelectorAll(selector).forEach((el) => {
          el.classList.add('d-none');
          el.style.setProperty('display', 'none', 'important');
        });
      }
    });

    if (ctrl.texto_btn_matricula && ctrl.texto_btn_matricula.trim()) {
      document.querySelectorAll('[data-btn-text="matricula"]').forEach((el) => {
        el.textContent = ctrl.texto_btn_matricula.trim();
      });
    }
  }

  async function loadSiteConfig() {
    if (!window.epzmSupabase) return;

    const { data, error } = await window.epzmSupabase
      .from('configuracoes_site')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) return;

    renderAnnouncementBar(data);
    applyVisualControls(data.controles_visuais);

    // WhatsApp & Telefone
    const digits = String(data.whatsapp_numero || '').replace(/\D/g, '');
    if (digits) {
      document.querySelectorAll('[data-config-whatsapp-link]').forEach((el) => {
        el.setAttribute('href', 'https://wa.me/' + digits);
      });
      document.querySelectorAll('[data-config-tel-link]').forEach((el) => {
        el.setAttribute('href', 'tel:+' + digits);
      });
    }
    if (data.whatsapp_exibicao) {
      document.querySelectorAll('[data-config-whatsapp-text]').forEach((el) => {
        el.textContent = data.whatsapp_exibicao;
      });
    }

    // E-mails
    if (data.email_contato) {
      document.querySelectorAll('[data-config-email]').forEach((el) => {
        el.textContent = data.email_contato;
        if (el.tagName === 'A') el.setAttribute('href', 'mailto:' + data.email_contato);
      });
    }
    if (data.email_dpo) {
      document.querySelectorAll('[data-config-dpo-email]').forEach((el) => {
        el.textContent = data.email_dpo;
        if (el.tagName === 'A') el.setAttribute('href', 'mailto:' + data.email_dpo);
      });
    }

    // Ano e link de Matrícula
    if (data.ano_matricula) {
      document.querySelectorAll('[data-config-ano-matricula]').forEach((el) => {
        el.textContent = 'ONLINE - ' + data.ano_matricula;
      });
    }
    if (data.link_matricula) {
      document.querySelectorAll('[data-config-matricula-link]').forEach((el) => {
        el.setAttribute('href', data.link_matricula);
        if (data.link_matricula.startsWith('http')) {
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener');
        }
      });
    }

    // Trabalhe Conosco
    if (data.link_trabalhe_conosco) {
      document.querySelectorAll('[data-config-trabalhe-conosco]').forEach((el) => {
        el.setAttribute('href', data.link_trabalhe_conosco);
        if (data.link_trabalhe_conosco.startsWith('http')) {
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener');
        }
      });
    }

    // Estatísticas
    const statsMap = {
      alunos: data.stat_alunos,
      professores: data.stat_professores,
      anos: data.stat_anos_historia,
      compromisso: data.stat_compromisso,
    };
    Object.keys(statsMap).forEach((k) => {
      if (!statsMap[k]) return;
      document.querySelectorAll(`[data-config-stat="${k}"]`).forEach((el) => {
        el.textContent = statsMap[k];
      });
    });

    // Redes Sociais (oculta automaticamente se vazio)
    const socialMap = {
      instagram: data.link_instagram,
      facebook: data.link_facebook,
      youtube: data.link_youtube,
    };
    Object.keys(socialMap).forEach((net) => {
      const url = String(socialMap[net] || '').trim();
      document.querySelectorAll(`[data-config-social="${net}"]`).forEach((el) => {
        if (!url || url === '#') {
          el.style.display = 'none';
        } else {
          el.style.display = '';
          el.setAttribute('href', url);
        }
      });
    });
  }

  function normalizeMenuUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const t = url.trim();
    if (!t || /^javascript:/i.test(t) || /^data:/i.test(t) || /^vbscript:/i.test(t)) return '';
    if (
      t.startsWith('#') ||
      t.startsWith('https://') ||
      t.startsWith('http://') ||
      t.startsWith('mailto:') ||
      t.startsWith('tel:') ||
      t.startsWith('/') ||
      /^[a-z0-9/_-]+\.html(#.*|\?.*)?$/i.test(t)
    ) {
      return t;
    }
    if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(t)) {
      return 'https://' + t;
    }
    return '';
  }

  async function trackPageVisit() {
    if (!window.epzmSupabase) return;
    const pageKey = document.body.getAttribute('data-page-key');
    if (!pageKey) return;

    const sessionKey = 'epzm_visit_' + pageKey;
    if (sessionStorage.getItem(sessionKey)) return;

    try {
      sessionStorage.setItem(sessionKey, '1');
      await window.epzmSupabase.rpc('registrar_acesso_site', { p_pagina: pageKey });
    } catch (_) {
      // Silencioso: nunca interfere na navegação
    }
  }

  /* -----------------------------------------------------------
     Inicialização
  ----------------------------------------------------------- */
  // Se um link padrão de convite ou recuperação do Supabase cair na raiz do site (Site URL),
  // redireciona automaticamente para a página dedicada do painel preservando o token.
  (function redirectSupabaseAuthLinks() {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
    const authType = searchParams.get('type') || hashParams.get('type');
    const hasToken = Boolean(searchParams.get('token_hash') || hashParams.get('access_token'));

    if (!hasToken) return;
    if (authType === 'invite') {
      window.location.replace('admin/primeiro-acesso.html' + window.location.search + window.location.hash);
    } else if (authType === 'recovery') {
      window.location.replace('admin/redefinir-senha.html' + window.location.search + window.location.hash);
    }
  })();

  document.addEventListener('DOMContentLoaded', function () {
    setupEquipeFilters();
    setupNoticiasControls();

    // Executa carregamentos em paralelo com tratamento silencioso para manter fallback local
    Promise.allSettled([
      loadSiteConfig(),
      loadSiteImages(),
      loadEquipePreview(),
      loadEquipeCompleta(),
      loadNoticiasHome(),
      loadNoticiasFullPage(),
      trackPageVisit(),
    ]);
  });
})();
