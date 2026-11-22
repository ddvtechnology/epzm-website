/**
 * Escola Presbiteriana Zenaide Magalhães
 * Painel Administrativo v2 — Arquitetura unificada e UX profissional
 */

(function () {
  const MAX_HOME_DESTAQUES = 4;

  const DEFAULT_SITE_IMAGES = {
    hero_principal: {
      titulo: 'Banner Principal (Hero)',
      descricao: 'Foto em destaque no topo da página inicial ao lado do versículo bíblico.',
      fallback: '../assets/img/hero-alunos.jpeg',
      defaultAlt: 'Alunos sorrindo em sala de aula',
    },
    sobre_fachada: {
      titulo: 'Fachada da Escola',
      descricao: 'Imagem exibida na seção Sobre Nós ao lado dos números da escola.',
      fallback: '../assets/img/fachada-escola.jpeg',
      defaultAlt: 'Fachada da Escola Presbiteriana Zenaide Magalhães',
    },
    cta_matriculas: {
      titulo: 'Banner de Matrículas',
      descricao: 'Imagem exibida no card verde de Matrículas Abertas no final da Home.',
      fallback: '../assets/img/estudante-cta.png',
      defaultAlt: 'Estudante da escola',
    },
  };

  const CATEGORIA_EQUIPE_LABEL = {
    direcao: 'Direção & Gestão',
    coordenacao: 'Coordenação',
    docentes: 'Corpo Docente',
  };

  const CATEGORIA_NOTICIA_LABEL = {
    noticia: 'Notícia',
    evento: 'Evento',
    comunicado: 'Comunicado',
  };

  const PAGINA_ACESSO_LABEL = {
    inicio: 'Página Inicial',
    equipe: 'Nossa Equipe',
    noticias: 'Notícias & Eventos',
    privacidade: 'Política de Privacidade',
    lgpd: 'LGPD',
  };

  const TAB_TITLES = {
    'visao-geral': 'Visão Geral',
    equipe: 'Equipe & Servidores',
    noticias: 'Notícias & Eventos',
    aparencia: 'Aparência do Site',
    escola: 'Dados da Escola',
  };

  const state = {
    session: null,
    equipe: [],
    noticias: [],
    imagens: [],
    configuracoes: null,
    acessos: [],
    equipeFilterCat: 'all',
    noticiasFilterCat: 'all',
    pendingDelete: null,
    equipeSelectedFile: null,
    noticiaSelectedFile: null,
    noticiaRemoveCover: false,
    siteImagePendingFiles: {},
    configDirty: false,
  };

  const $ = (id) => document.getElementById(id);

  /* -----------------------------------------------------------
     Utilitários
  ----------------------------------------------------------- */
  function showToast(message, type = 'success') {
    const container = $('adminToastContainer');
    if (!container || !window.bootstrap) return;

    const toastEl = document.createElement('div');
    const bgClass =
      type === 'danger' ? 'text-bg-danger' : type === 'warning' ? 'text-bg-warning' : 'text-bg-dark';
    toastEl.className = `toast align-items-center ${bgClass} border-0`;
    toastEl.setAttribute('role', 'alert');

    const wrap = document.createElement('div');
    wrap.className = 'd-flex';

    const body = document.createElement('div');
    body.className = 'toast-body small';
    body.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn-close btn-close-white me-2 m-auto';
    closeBtn.setAttribute('data-bs-dismiss', 'toast');
    closeBtn.setAttribute('aria-label', 'Fechar');

    wrap.append(body, closeBtn);
    toastEl.appendChild(wrap);
    container.appendChild(toastEl);

    const toast = new bootstrap.Toast(toastEl, { delay: 3400 });
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    toast.show();
  }

  function clearEl(el) {
    while (el && el.firstChild) el.removeChild(el.firstChild);
  }

  function slugify(text) {
    return String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90);
  }

  function resolveAdminImageUrl(url, fallback) {
    if (!url) return fallback;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('assets/')) return '../' + url;
    return url;
  }

  function formatDateBR(dateStr) {
    if (!dateStr) return '-';
    const parts = String(dateStr).split('T')[0].split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function getInitials(name) {
    const parts = String(name || 'AD').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function setButtonLoading(btn, loading, defaultText) {
    if (!btn) return;
    if (loading) {
      btn.dataset.originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Salvando...';
    } else {
      btn.disabled = false;
      btn.textContent = defaultText || btn.dataset.originalText || 'Salvar';
    }
  }

  function markConfigDirty(isDirty) {
    state.configDirty = Boolean(isDirty);
    $('unsavedSaveBar')?.classList.toggle('d-none', !state.configDirty);
  }

  /* -----------------------------------------------------------
     Navegação
  ----------------------------------------------------------- */
  function switchTab(tabName) {
    document.querySelectorAll('.admin-nav-item').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });
    document.querySelectorAll('.admin-tab-panel').forEach((panel) => {
      panel.classList.toggle('d-none', panel.id !== 'tab-' + tabName);
    });
    if ($('currentTabTitle')) {
      $('currentTabTitle').textContent = TAB_TITLES[tabName] || 'Painel';
    }
    closeMobileSidebar();
  }

  function switchAparenciaPane(paneId) {
    document.querySelectorAll('#aparenciaSubnav .settings-subnav-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-pane') === paneId);
    });
    document.querySelectorAll('.aparencia-pane').forEach((pane) => {
      pane.classList.toggle('d-none', pane.id !== paneId);
    });
  }

  function openMobileSidebar() {
    $('adminSidebar')?.classList.add('open');
    $('sidebarBackdrop')?.classList.add('show');
  }

  function closeMobileSidebar() {
    $('adminSidebar')?.classList.remove('open');
    $('sidebarBackdrop')?.classList.remove('show');
  }

  /* -----------------------------------------------------------
     Autenticação
  ----------------------------------------------------------- */
  function showLoginView() {
    $('loginView').classList.remove('d-none');
    $('dashboardView').classList.add('d-none');
  }

  function showDashboardView(session) {
    state.session = session;
    $('loginView').classList.add('d-none');
    $('dashboardView').classList.remove('d-none');

    const user = session && session.user;
    const nome = (user && user.user_metadata && user.user_metadata.nome_completo) || 'Administrador';
    const email = (user && user.email) || 'Sessão ativa';
    const primeiroNome = nome.split(/\s+/)[0];

    if ($('loggedUserName')) $('loggedUserName').textContent = nome;
    if ($('loggedUserEmail')) $('loggedUserEmail').textContent = email;
    if ($('loggedUserInitials')) $('loggedUserInitials').textContent = getInitials(nome);
    if ($('welcomeGreeting')) $('welcomeGreeting').textContent = `Olá, ${primeiroNome}`;
    if ($('welcomeDate')) {
      const formatted = new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date());
      $('welcomeDate').textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1) + ' · Painel institucional da EPZM';
    }

    loadAllData().then(() => {
      if (window.epzmAdminTour && user && user.id) {
        window.epzmAdminTour.maybeStartFirstAccessTour(user.id);
      }
    });
  }

  function showLoginError(msg) {
    const el = $('loginAlert');
    $('loginSuccessAlert').classList.add('d-none');
    el.textContent = msg;
    el.classList.remove('d-none');
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    $('loginAlert').classList.add('d-none');

    if (!window.epzmSupabase) {
      showLoginError('Supabase não configurado em js/supabase-config.js.');
      return;
    }

    const email = $('loginEmail').value.trim();
    const password = $('loginPassword').value;
    if (!email || !password) {
      showLoginError('Informe seu e-mail e sua senha.');
      return;
    }

    const btn = $('loginSubmitBtn');
    setButtonLoading(btn, true);
    try {
      const { data, error } = await window.epzmSupabase.auth.signInWithPassword({ email, password });
      if (error) {
        showLoginError('E-mail ou senha inválidos. Verifique suas credenciais.');
        return;
      }
      if (data && data.session) {
        showDashboardView(data.session);
      }
    } catch (_) {
      showLoginError('Erro de conexão ao tentar entrar.');
    } finally {
      setButtonLoading(btn, false, 'Entrar no Painel');
    }
  }

  async function handleLogout() {
    if (window.epzmSupabase) {
      await window.epzmSupabase.auth.signOut();
    }
    state.session = null;
    markConfigDirty(false);
    $('loginPassword').value = '';
    showLoginView();
  }

  /* -----------------------------------------------------------
     Carregamento Central de Dados
  ----------------------------------------------------------- */
  async function loadAllData() {
    if (!window.epzmSupabase) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    const sinceDate = thirtyDaysAgo.toISOString().split('T')[0];

    const [equipeRes, noticiasRes, imagensRes, configRes, acessosRes] = await Promise.all([
      window.epzmSupabase
        .from('equipe_servidores')
        .select('*')
        .order('ordem_exibicao', { ascending: true })
        .order('nome', { ascending: true }),
      window.epzmSupabase
        .from('noticias_eventos')
        .select('*')
        .order('data_publicacao', { ascending: false })
        .order('criado_em', { ascending: false }),
      window.epzmSupabase.from('imagens_site').select('*').order('chave', { ascending: true }),
      window.epzmSupabase.from('configuracoes_site').select('*').eq('id', 1).maybeSingle(),
      window.epzmSupabase
        .from('acessos_site')
        .select('data_acesso, pagina, total_acessos')
        .gte('data_acesso', sinceDate)
        .order('data_acesso', { ascending: true }),
    ]);

    if (equipeRes.error) showToast('Erro ao carregar equipe: ' + equipeRes.error.message, 'danger');
    if (noticiasRes.error) showToast('Erro ao carregar notícias: ' + noticiasRes.error.message, 'danger');
    if (imagensRes.error) showToast('Erro ao carregar imagens: ' + imagensRes.error.message, 'danger');
    if (configRes.error) showToast('Erro ao carregar configurações: ' + configRes.error.message, 'danger');

    state.equipe = equipeRes.data || [];
    state.noticias = noticiasRes.data || [];
    state.imagens = imagensRes.data || [];
    state.configuracoes = !configRes.error && configRes.data ? configRes.data : null;
    state.acessos = !acessosRes.error && Array.isArray(acessosRes.data) ? acessosRes.data : [];

    renderOverview();
    renderEquipeTable();
    renderNoticiasTable();
    renderSiteImagesCards();
    populateConfigForm();
    markConfigDirty(false);
  }

  /* -----------------------------------------------------------
     1. VISÃO GERAL (KPIs + Gráfico + Status Rápido)
  ----------------------------------------------------------- */
  function renderOverview() {
    const ativos = state.equipe.filter((m) => m.ativo).length;
    const destaquesHome = state.equipe.filter((m) => m.ativo && m.destaque_home).length;
    const publicadas = state.noticias.filter((n) => n.publicado).length;
    const rascunhos = state.noticias.filter((n) => !n.publicado).length;

    $('navCountEquipe').textContent = String(ativos);
    $('navCountNoticias').textContent = String(publicadas);
    $('metricEquipeAtivos').textContent = String(ativos);
    $('metricEquipeHome').textContent = String(destaquesHome);
    $('metricNoticiasPublicadas').textContent = String(publicadas);
    $('metricNoticiasRascunhos').textContent = String(rascunhos);

    // Acessos
    const todayStr = new Date().toISOString().split('T')[0];
    const last7Keys = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Keys.push(d.toISOString().split('T')[0]);
    }

    const byDate = {};
    const byPage = {};
    let totalToday = 0;
    let total7d = 0;
    let total30d = 0;

    state.acessos.forEach((row) => {
      const count = Number(row.total_acessos) || 0;
      const dt = String(row.data_acesso || '').split('T')[0];
      total30d += count;
      if (dt === todayStr) totalToday += count;
      if (last7Keys.includes(dt)) total7d += count;
      byDate[dt] = (byDate[dt] || 0) + count;
      byPage[row.pagina] = (byPage[row.pagina] || 0) + count;
    });

    $('metricAcessos30d').textContent = String(total30d);
    $('metricAcessosHoje').textContent = String(totalToday);
    $('metricAcessos7d').textContent = String(total7d);

    // Gráfico 7 dias
    const chartEl = $('accessChartBars');
    clearEl(chartEl);
    const maxVal = Math.max(1, ...last7Keys.map((k) => byDate[k] || 0));
    last7Keys.forEach((dateKey) => {
      const val = byDate[dateKey] || 0;
      const pct = Math.round((val / maxVal) * 100);
      const parts = dateKey.split('-');
      const label = `${parts[2]}/${parts[1]}`;

      const col = document.createElement('div');
      col.className = 'access-bar-col';

      const valEl = document.createElement('div');
      valEl.className = 'access-bar-value';
      valEl.textContent = String(val);

      const track = document.createElement('div');
      track.className = 'access-bar-track';

      const fill = document.createElement('div');
      fill.className = 'access-bar-fill';
      fill.style.height = (val > 0 ? Math.max(8, pct) : 4) + '%';
      track.appendChild(fill);

      const lbl = document.createElement('div');
      lbl.className = 'access-bar-label';
      lbl.textContent = label;

      col.append(valEl, track, lbl);
      chartEl.appendChild(col);
    });

    // Top páginas com barra proporcional
    const pagesEl = $('accessTopPages');
    clearEl(pagesEl);
    const entries = Object.entries(byPage).sort((a, b) => b[1] - a[1]);
    if (!entries.length) {
      const p = document.createElement('p');
      p.className = 'text-muted small mb-0';
      p.textContent = 'As visitas aparecerão aqui conforme o site for acessado.';
      pagesEl.appendChild(p);
    } else {
      const maxPage = Math.max(1, entries[0][1]);
      entries.slice(0, 4).forEach(([pageKey, count]) => {
        const item = document.createElement('div');
        item.className = 'page-bar-item';

        const head = document.createElement('div');
        head.className = 'page-bar-head';
        const nm = document.createElement('span');
        nm.textContent = PAGINA_ACESSO_LABEL[pageKey] || pageKey;
        const cnt = document.createElement('strong');
        cnt.textContent = String(count);
        head.append(nm, cnt);

        const track = document.createElement('div');
        track.className = 'page-bar-track';
        const fill = document.createElement('div');
        fill.className = 'page-bar-fill';
        fill.style.width = Math.max(6, Math.round((count / maxPage) * 100)) + '%';
        track.appendChild(fill);

        item.append(head, track);
        pagesEl.appendChild(item);
      });
    }
  }

  /* -----------------------------------------------------------
     2. EQUIPE & SERVIDORES (COM INLINE TOGGLES E TRAVA 4/4)
  ----------------------------------------------------------- */
  function countOtherHomeDestaques(excludeId) {
    return state.equipe.filter((m) => m.ativo && m.destaque_home && m.id !== excludeId).length;
  }

  function updateDestaqueHomeControls() {
    const id = $('equipeId')?.value || null;
    const ativoCheckbox = $('equipeAtivo');
    const destaqueCheckbox = $('equipeDestaqueHome');
    const helpEl = $('equipeDestaqueHelp');
    if (!ativoCheckbox || !destaqueCheckbox || !helpEl) return;

    const othersCount = countOtherHomeDestaques(id);
    if (!ativoCheckbox.checked) {
      destaqueCheckbox.checked = false;
      destaqueCheckbox.disabled = true;
      helpEl.textContent = 'Servidores inativos não podem ser destacados na página inicial.';
      helpEl.classList.remove('d-none');
      return;
    }

    if (othersCount >= MAX_HOME_DESTAQUES && !destaqueCheckbox.checked) {
      destaqueCheckbox.disabled = true;
      helpEl.textContent = `Limite de ${MAX_HOME_DESTAQUES} destaques atingido. Desmarque outro servidor primeiro.`;
      helpEl.classList.remove('d-none');
    } else {
      destaqueCheckbox.disabled = false;
      helpEl.classList.add('d-none');
    }
  }

  function renderEquipeTable() {
    const tbody = $('equipeTableBody');
    const emptyEl = $('equipeTableEmpty');
    const counterEl = $('equipeDestaqueCounter');
    const termo = ($('equipeSearchInput')?.value || '').trim().toLowerCase();

    const destaquesAtivos = state.equipe.filter((m) => m.ativo && m.destaque_home).length;
    if (counterEl) {
      counterEl.innerHTML = `<i class="bi bi-star-fill me-1"></i>Home: ${destaquesAtivos} / ${MAX_HOME_DESTAQUES}`;
      counterEl.className =
        destaquesAtivos >= MAX_HOME_DESTAQUES ? 'pill-tag pill-warning' : 'pill-tag pill-primary';
    }

    const filtrados = state.equipe.filter((m) => {
      const catOk = state.equipeFilterCat === 'all' || m.categoria === state.equipeFilterCat;
      const textOk =
        !termo ||
        String(m.nome || '').toLowerCase().includes(termo) ||
        String(m.cargo || '').toLowerCase().includes(termo);
      return catOk && textOk;
    });

    clearEl(tbody);
    emptyEl.classList.toggle('d-none', filtrados.length > 0);

    filtrados.forEach((membro) => {
      const tr = document.createElement('tr');

      // Profissional
      const tdNome = document.createElement('td');
      const flex = document.createElement('div');
      flex.className = 'd-flex align-items-center gap-3';

      const img = document.createElement('img');
      img.className = 'admin-thumb-avatar';
      img.src = resolveAdminImageUrl(membro.foto_url, '../assets/img/equipe-1.png');
      img.alt = membro.nome;

      const info = document.createElement('div');
      const strong = document.createElement('div');
      strong.className = 'fw-semibold';
      strong.textContent = membro.nome;
      const cargo = document.createElement('div');
      cargo.className = 'text-muted';
      cargo.style.fontSize = '12px';
      cargo.textContent = membro.cargo;
      info.append(strong, cargo);
      flex.append(img, info);
      tdNome.appendChild(flex);

      // Categoria
      const tdCat = document.createElement('td');
      const catPill = document.createElement('span');
      catPill.className = 'pill-tag pill-neutral';
      catPill.textContent = CATEGORIA_EQUIPE_LABEL[membro.categoria] || membro.categoria;
      tdCat.appendChild(catPill);

      // Ordem ↑ ↓
      const tdOrdem = document.createElement('td');
      tdOrdem.className = 'text-nowrap';
      const orderWrap = document.createElement('div');
      orderWrap.className = 'd-inline-flex align-items-center gap-1';
      const fullIdx = state.equipe.findIndex((x) => x.id === membro.id);

      const upBtn = document.createElement('button');
      upBtn.type = 'button';
      upBtn.className = 'btn-order-arrow';
      upBtn.title = 'Subir';
      upBtn.disabled = fullIdx <= 0;
      upBtn.innerHTML = '<i class="bi bi-arrow-up"></i>';
      upBtn.addEventListener('click', () => moveEquipeOrder(fullIdx, -1));

      const downBtn = document.createElement('button');
      downBtn.type = 'button';
      downBtn.className = 'btn-order-arrow';
      downBtn.title = 'Descer';
      downBtn.disabled = fullIdx < 0 || fullIdx >= state.equipe.length - 1;
      downBtn.innerHTML = '<i class="bi bi-arrow-down"></i>';
      downBtn.addEventListener('click', () => moveEquipeOrder(fullIdx, 1));

      orderWrap.append(upBtn, downBtn);
      tdOrdem.appendChild(orderWrap);

      // Inline Star Toggle (Destaque Home)
      const tdHome = document.createElement('td');
      tdHome.className = 'text-center';
      const isDestaque = Boolean(membro.ativo && membro.destaque_home);
      const starBtn = document.createElement('button');
      starBtn.type = 'button';
      starBtn.className = `star-toggle-btn ${isDestaque ? 'is-featured' : ''}`;
      starBtn.title = isDestaque ? 'Remover destaque da Home' : 'Destacar na Home';
      starBtn.innerHTML = isDestaque ? '<i class="bi bi-star-fill"></i>' : '<i class="bi bi-star"></i>';
      starBtn.addEventListener('click', () => quickToggleEquipeDestaque(membro));
      tdHome.appendChild(starBtn);

      // Inline Switch (Ativo)
      const tdAtivo = document.createElement('td');
      tdAtivo.className = 'text-center';
      const swWrap = document.createElement('div');
      swWrap.className = 'form-check form-switch d-inline-block m-0';
      const sw = document.createElement('input');
      sw.type = 'checkbox';
      sw.className = 'form-check-input';
      sw.checked = Boolean(membro.ativo);
      sw.title = membro.ativo ? 'Ocultar do site' : 'Exibir no site';
      sw.addEventListener('change', () => quickToggleEquipeAtivo(membro, sw.checked));
      swWrap.appendChild(sw);
      tdAtivo.appendChild(swWrap);

      // Ações
      const tdAcoes = document.createElement('td');
      tdAcoes.className = 'text-end text-nowrap';
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn-icon-ghost me-1';
      editBtn.title = 'Editar';
      editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
      editBtn.addEventListener('click', () => openEquipeModal(membro));

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-icon-ghost danger';
      delBtn.title = 'Excluir';
      delBtn.innerHTML = '<i class="bi bi-trash"></i>';
      delBtn.addEventListener('click', () => askDelete('equipe', membro));

      tdAcoes.append(editBtn, delBtn);
      tr.append(tdNome, tdCat, tdOrdem, tdHome, tdAtivo, tdAcoes);
      tbody.appendChild(tr);
    });
  }

  async function quickToggleEquipeDestaque(membro) {
    if (!membro.ativo) {
      showToast('Ative o servidor antes de destacá-lo na página inicial.', 'warning');
      return;
    }
    const nextVal = !membro.destaque_home;
    if (nextVal && countOtherHomeDestaques(membro.id) >= MAX_HOME_DESTAQUES) {
      showToast(`Limite de ${MAX_HOME_DESTAQUES} destaques na Home atingido. Desmarque outro primeiro.`, 'warning');
      return;
    }
    const { error } = await window.epzmSupabase
      .from('equipe_servidores')
      .update({ destaque_home: nextVal })
      .eq('id', membro.id);
    if (error) {
      showToast('Erro ao atualizar destaque: ' + error.message, 'danger');
    } else {
      showToast(nextVal ? `${membro.nome} destacado na Home.` : `${membro.nome} removido dos destaques.`);
      await loadAllData();
    }
  }

  async function quickToggleEquipeAtivo(membro, isAtivo) {
    const payload = { ativo: isAtivo };
    if (!isAtivo) payload.destaque_home = false;
    const { error } = await window.epzmSupabase.from('equipe_servidores').update(payload).eq('id', membro.id);
    if (error) {
      showToast('Erro ao alterar status: ' + error.message, 'danger');
    } else {
      showToast(isAtivo ? `${membro.nome} visível no site.` : `${membro.nome} ocultado do site.`);
      await loadAllData();
    }
  }

  async function moveEquipeOrder(index, direction) {
    const targetIdx = index + direction;
    if (index < 0 || targetIdx < 0 || targetIdx >= state.equipe.length) return;
    const reordered = [...state.equipe];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);

    const results = await Promise.all(
      reordered.map((item, idx) =>
        window.epzmSupabase.from('equipe_servidores').update({ ordem_exibicao: idx + 1 }).eq('id', item.id)
      )
    );
    if (results.some((r) => r.error)) {
      showToast('Erro ao reordenar servidor.', 'danger');
    } else {
      await loadAllData();
    }
  }

  function openEquipeModal(membro = null) {
    state.equipeSelectedFile = null;
    $('equipeForm').reset();
    $('equipeFotoInput').value = '';
    $('equipeFotoInfo').textContent = 'Selecione uma foto nítida do profissional.';

    if (membro) {
      $('equipeModalTitle').textContent = 'Editar Servidor';
      $('equipeId').value = membro.id;
      $('equipeNome').value = membro.nome || '';
      $('equipeCargo').value = membro.cargo || '';
      $('equipeCategoria').value = membro.categoria || 'docentes';
      $('equipeOrdem').value = membro.ordem_exibicao ?? 1;
      $('equipeDestaqueHome').checked = Boolean(membro.ativo && membro.destaque_home);
      $('equipeAtivo').checked = Boolean(membro.ativo);
      $('equipeFotoUrlAtual').value = membro.foto_url || '';
      $('equipeFotoCaminhoAtual').value = membro.foto_caminho || '';
      $('equipeFotoPreview').src = resolveAdminImageUrl(membro.foto_url, '../assets/img/equipe-1.png');
    } else {
      $('equipeModalTitle').textContent = 'Novo Servidor';
      $('equipeId').value = '';
      $('equipeOrdem').value = state.equipe.length + 1;
      $('equipeAtivo').checked = true;
      $('equipeDestaqueHome').checked = false;
      $('equipeFotoUrlAtual').value = '';
      $('equipeFotoCaminhoAtual').value = '';
      $('equipeFotoPreview').src = '../assets/img/equipe-1.png';
    }

    updateDestaqueHomeControls();
    bootstrap.Modal.getOrCreateInstance($('equipeModal')).show();
  }

  async function handleEquipeSubmit(e) {
    e.preventDefault();
    const id = $('equipeId').value || null;
    const isAtivo = $('equipeAtivo').checked;
    const wantsDestaque = isAtivo && $('equipeDestaqueHome').checked;

    if (wantsDestaque && countOtherHomeDestaques(id) >= MAX_HOME_DESTAQUES) {
      showToast(`Limite de ${MAX_HOME_DESTAQUES} destaques na Home atingido.`, 'warning');
      updateDestaqueHomeControls();
      return;
    }

    const btn = $('equipeSaveBtn');
    setButtonLoading(btn, true);

    try {
      let fotoUrl = $('equipeFotoUrlAtual').value || null;
      let fotoCaminho = $('equipeFotoCaminhoAtual').value || null;
      const oldPath = fotoCaminho;

      if (state.equipeSelectedFile) {
        const uploaded = await window.epzmImageTools.uploadCompressedImage(state.equipeSelectedFile, {
          folder: 'equipe',
          maxWidth: 600,
          maxHeight: 600,
          quality: 0.82,
        });
        fotoUrl = uploaded.publicUrl;
        fotoCaminho = uploaded.path;
      }

      const payload = {
        nome: $('equipeNome').value.trim(),
        cargo: $('equipeCargo').value.trim(),
        categoria: $('equipeCategoria').value,
        ordem_exibicao: Math.max(0, parseInt($('equipeOrdem').value || '0', 10) || 0),
        destaque_home: wantsDestaque,
        ativo: isAtivo,
        foto_url: fotoUrl,
        foto_caminho: fotoCaminho,
      };

      const res = id
        ? await window.epzmSupabase.from('equipe_servidores').update(payload).eq('id', id)
        : await window.epzmSupabase.from('equipe_servidores').insert(payload);

      if (res.error) throw new Error(res.error.message);

      if (state.equipeSelectedFile && oldPath && oldPath !== fotoCaminho) {
        await window.epzmImageTools.deleteStorageImage(oldPath);
      }

      bootstrap.Modal.getInstance($('equipeModal'))?.hide();
      showToast(id ? 'Servidor atualizado!' : 'Servidor adicionado!');
      await loadAllData();
    } catch (err) {
      showToast('Erro ao salvar servidor: ' + err.message, 'danger');
    } finally {
      setButtonLoading(btn, false, 'Salvar Servidor');
    }
  }

  /* -----------------------------------------------------------
     3. NOTÍCIAS & EVENTOS (COM INLINE PUBLISH TOGGLE)
  ----------------------------------------------------------- */
  function renderNoticiasTable() {
    const tbody = $('noticiasTableBody');
    const emptyEl = $('noticiasTableEmpty');
    const termo = ($('noticiasAdminSearch')?.value || '').trim().toLowerCase();

    const filtradas = state.noticias.filter((n) => {
      const catOk =
        state.noticiasFilterCat === 'all'
          ? true
          : state.noticiasFilterCat === 'rascunho'
            ? !n.publicado
            : n.categoria === state.noticiasFilterCat;
      const textOk = !termo || String(n.titulo || '').toLowerCase().includes(termo);
      return catOk && textOk;
    });

    clearEl(tbody);
    emptyEl.classList.toggle('d-none', filtradas.length > 0);

    filtradas.forEach((item) => {
      const tr = document.createElement('tr');

      const tdPub = document.createElement('td');
      const flex = document.createElement('div');
      flex.className = 'd-flex align-items-center gap-3';
      if (item.imagem_capa_url) {
        const img = document.createElement('img');
        img.className = 'admin-thumb-cover';
        img.src = item.imagem_capa_url;
        img.alt = item.titulo;
        flex.appendChild(img);
      }
      const info = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'fw-semibold';
      title.textContent = item.titulo;
      const slug = document.createElement('div');
      slug.className = 'text-muted';
      slug.style.fontSize = '12px';
      slug.textContent = '/' + item.slug;
      info.append(title, slug);
      flex.appendChild(info);
      tdPub.appendChild(flex);

      const tdCat = document.createElement('td');
      const catPill = document.createElement('span');
      catPill.className =
        item.categoria === 'evento'
          ? 'pill-tag pill-warning'
          : item.categoria === 'comunicado'
            ? 'pill-tag pill-purple'
            : 'pill-tag pill-primary';
      catPill.textContent = CATEGORIA_NOTICIA_LABEL[item.categoria] || item.categoria;
      tdCat.appendChild(catPill);

      const tdData = document.createElement('td');
      tdData.className = 'text-nowrap text-muted';
      tdData.textContent = formatDateBR(item.data_publicacao);

      const tdStatus = document.createElement('td');
      tdStatus.className = 'text-center';
      const swWrap = document.createElement('div');
      swWrap.className = 'form-check form-switch d-inline-block m-0';
      const sw = document.createElement('input');
      sw.type = 'checkbox';
      sw.className = 'form-check-input';
      sw.checked = Boolean(item.publicado);
      sw.title = item.publicado ? 'Mudar para rascunho' : 'Publicar agora';
      sw.addEventListener('change', () => quickToggleNoticiaPublicado(item, sw.checked));
      swWrap.appendChild(sw);
      tdStatus.appendChild(swWrap);

      const tdAcoes = document.createElement('td');
      tdAcoes.className = 'text-end text-nowrap';
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn-icon-ghost me-1';
      editBtn.title = 'Editar';
      editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
      editBtn.addEventListener('click', () => openNoticiaModal(item));

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-icon-ghost danger';
      delBtn.title = 'Excluir';
      delBtn.innerHTML = '<i class="bi bi-trash"></i>';
      delBtn.addEventListener('click', () => askDelete('noticia', item));

      tdAcoes.append(editBtn, delBtn);
      tr.append(tdPub, tdCat, tdData, tdStatus, tdAcoes);
      tbody.appendChild(tr);
    });
  }

  async function quickToggleNoticiaPublicado(item, publicado) {
    const { error } = await window.epzmSupabase
      .from('noticias_eventos')
      .update({ publicado })
      .eq('id', item.id);
    if (error) {
      showToast('Erro ao atualizar publicação: ' + error.message, 'danger');
    } else {
      showToast(publicado ? 'Publicação no ar!' : 'Movida para rascunhos.');
      await loadAllData();
    }
  }

  function openNoticiaModal(item = null) {
    state.noticiaSelectedFile = null;
    state.noticiaRemoveCover = false;
    $('noticiaForm').reset();
    $('noticiaCapaInput').value = '';
    $('noticiaCapaInfo').textContent = 'Recomendado imagem na horizontal.';

    if (item) {
      $('noticiaAdminModalTitle').textContent = 'Editar Publicação';
      $('noticiaId').value = item.id;
      $('noticiaTitulo').value = item.titulo || '';
      $('noticiaSlug').value = item.slug || '';
      $('noticiaSlug').dataset.manual = 'true';
      $('noticiaCategoria').value = item.categoria || 'noticia';
      $('noticiaData').value = (item.data_publicacao || '').split('T')[0];
      $('noticiaResumo').value = item.resumo || '';
      $('noticiaConteudo').value = item.conteudo || '';
      $('noticiaDestaqueHome').checked = Boolean(item.destaque_home);
      $('noticiaPublicado').checked = Boolean(item.publicado);
      $('noticiaCapaUrlAtual').value = item.imagem_capa_url || '';
      $('noticiaCapaCaminhoAtual').value = item.imagem_capa_caminho || '';

      if (item.imagem_capa_url) {
        $('noticiaCapaPreview').src = item.imagem_capa_url;
        $('noticiaCapaPreviewWrap').classList.remove('d-none');
      } else {
        $('noticiaCapaPreviewWrap').classList.add('d-none');
      }
    } else {
      $('noticiaAdminModalTitle').textContent = 'Nova Publicação';
      $('noticiaId').value = '';
      $('noticiaSlug').dataset.manual = 'false';
      $('noticiaData').value = new Date().toISOString().split('T')[0];
      $('noticiaDestaqueHome').checked = true;
      $('noticiaPublicado').checked = true;
      $('noticiaCapaUrlAtual').value = '';
      $('noticiaCapaCaminhoAtual').value = '';
      $('noticiaCapaPreviewWrap').classList.add('d-none');
    }

    bootstrap.Modal.getOrCreateInstance($('noticiaAdminModal')).show();
  }

  async function handleNoticiaSubmit(e) {
    e.preventDefault();
    const btn = $('noticiaSaveBtn');
    setButtonLoading(btn, true);

    try {
      const id = $('noticiaId').value || null;
      let capaUrl = $('noticiaCapaUrlAtual').value || null;
      let capaCaminho = $('noticiaCapaCaminhoAtual').value || null;
      const oldPath = capaCaminho;

      if (state.noticiaRemoveCover) {
        capaUrl = null;
        capaCaminho = null;
      }

      if (state.noticiaSelectedFile) {
        const uploaded = await window.epzmImageTools.uploadCompressedImage(state.noticiaSelectedFile, {
          folder: 'noticias',
          maxWidth: 1600,
          maxHeight: 1200,
          quality: 0.82,
        });
        capaUrl = uploaded.publicUrl;
        capaCaminho = uploaded.path;
      }

      const titulo = $('noticiaTitulo').value.trim();
      const slug = slugify($('noticiaSlug').value.trim() || titulo);
      if (!slug) throw new Error('Informe um link amigável válido.');

      const payload = {
        titulo,
        slug,
        categoria: $('noticiaCategoria').value,
        data_publicacao: $('noticiaData').value,
        resumo: $('noticiaResumo').value.trim(),
        conteudo: $('noticiaConteudo').value.trim(),
        destaque_home: $('noticiaDestaqueHome').checked,
        publicado: $('noticiaPublicado').checked,
        imagem_capa_url: capaUrl,
        imagem_capa_caminho: capaCaminho,
      };

      const res = id
        ? await window.epzmSupabase.from('noticias_eventos').update(payload).eq('id', id)
        : await window.epzmSupabase.from('noticias_eventos').insert(payload);

      if (res.error) {
        if (res.error.code === '23505') throw new Error('Já existe uma publicação com este slug.');
        throw new Error(res.error.message);
      }

      if (oldPath && oldPath !== capaCaminho) {
        await window.epzmImageTools.deleteStorageImage(oldPath);
      }

      bootstrap.Modal.getInstance($('noticiaAdminModal'))?.hide();
      showToast(id ? 'Publicação atualizada!' : 'Publicação criada!');
      await loadAllData();
    } catch (err) {
      showToast('Erro ao salvar publicação: ' + err.message, 'danger');
    } finally {
      setButtonLoading(btn, false, 'Salvar Publicação');
    }
  }

  function openNoticiaPreview() {
    const titulo = $('noticiaTitulo').value.trim() || 'Sem título';
    const cat = $('noticiaCategoria').value || 'noticia';
    const data = $('noticiaData').value || '';
    const conteudo = $('noticiaConteudo').value.trim() || $('noticiaResumo').value.trim();

    $('previewNoticiaBadge').textContent = CATEGORIA_NOTICIA_LABEL[cat] || 'Notícia';
    $('previewNoticiaDate').textContent = formatDateBR(data);
    $('previewNoticiaTitle').textContent = titulo;

    const coverWrap = $('previewNoticiaCoverWrap');
    const coverImg = $('previewNoticiaCover');
    const hasCover = !$('noticiaCapaPreviewWrap').classList.contains('d-none') && $('noticiaCapaPreview').src;
    if (hasCover) {
      coverImg.src = $('noticiaCapaPreview').src;
      coverWrap.classList.remove('d-none');
    } else {
      coverWrap.classList.add('d-none');
    }

    const bodyEl = $('previewNoticiaBody');
    clearEl(bodyEl);
    conteudo
      .split(/\n{2,}|\r\n\r\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((text) => {
        const p = document.createElement('p');
        p.textContent = text;
        bodyEl.appendChild(p);
      });

    bootstrap.Modal.getOrCreateInstance($('noticiaPreviewModal')).show();
  }

  /* -----------------------------------------------------------
     4. IMAGENS DO SITE (DENTRO DE APARÊNCIA)
  ----------------------------------------------------------- */
  function renderSiteImagesCards() {
    const grid = $('siteImagesGrid');
    clearEl(grid);

    const byKey = {};
    state.imagens.forEach((row) => {
      byKey[row.chave] = row;
    });

    Object.keys(DEFAULT_SITE_IMAGES).forEach((chave) => {
      const def = DEFAULT_SITE_IMAGES[chave];
      const row = byKey[chave] || { chave, titulo: def.titulo, descricao: def.descricao };
      const col = document.createElement('div');
      col.className = 'col-md-6 col-xl-4';

      const card = document.createElement('div');
      card.className = 'site-image-card';

      const previewBox = document.createElement('div');
      previewBox.className = 'site-image-preview';
      const img = document.createElement('img');
      img.src = row.imagem_url || def.fallback;
      img.alt = def.defaultAlt;
      previewBox.appendChild(img);

      const body = document.createElement('div');
      body.className = 'site-image-body';

      const headerRow = document.createElement('div');
      headerRow.className = 'd-flex justify-content-between align-items-start gap-2 mb-1';
      const h4 = document.createElement('h3');
      h4.className = 'surface-title';
      h4.textContent = row.titulo || def.titulo;
      const badge = document.createElement('span');
      badge.className = row.imagem_url ? 'pill-tag pill-success' : 'pill-tag pill-neutral';
      badge.textContent = row.imagem_url ? 'Personalizada' : 'Padrão da escola';
      headerRow.append(h4, badge);

      const desc = document.createElement('p');
      desc.className = 'surface-desc mb-3';
      desc.textContent = row.descricao || def.descricao;

      const fileInfo = document.createElement('div');
      fileInfo.className = 'form-text mb-3';
      fileInfo.textContent = 'Selecione uma nova foto para substituir.';

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/jpeg,image/png,image/webp';
      fileInput.className = 'd-none';
      fileInput.id = 'siteImgFile-' + chave;
      fileInput.addEventListener('change', (ev) => {
        const file = ev.target.files && ev.target.files[0];
        if (!file) return;
        state.siteImagePendingFiles[chave] = file;
        img.src = URL.createObjectURL(file);
        fileInfo.textContent = `Pronto para salvar: ${file.name}`;
      });

      const actions = document.createElement('div');
      actions.className = 'mt-auto d-flex flex-wrap gap-2';

      const pickBtn = document.createElement('label');
      pickBtn.setAttribute('for', 'siteImgFile-' + chave);
      pickBtn.className = 'btn btn-outline-primary btn-sm';
      pickBtn.innerHTML = '<i class="bi bi-upload me-1"></i>Trocar';

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn btn-primary btn-sm';
      saveBtn.textContent = 'Salvar';
      saveBtn.addEventListener('click', () => saveSiteImage(chave, row, saveBtn));

      actions.append(pickBtn, saveBtn);

      if (row.imagem_url) {
        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'btn btn-light btn-sm';
        resetBtn.textContent = 'Restaurar';
        resetBtn.addEventListener('click', () => restoreSiteImage(chave, row, resetBtn));
        actions.appendChild(resetBtn);
      }

      body.append(headerRow, desc, fileInfo, fileInput, actions);
      card.append(previewBox, body);
      col.appendChild(card);
      grid.appendChild(col);
    });
  }

  async function saveSiteImage(chave, row, btn) {
    const pendingFile = state.siteImagePendingFiles[chave] || null;
    if (!pendingFile) {
      showToast('Escolha uma nova imagem antes de salvar.', 'warning');
      return;
    }

    setButtonLoading(btn, true);
    try {
      const oldPath = row.imagem_caminho || null;
      const uploaded = await window.epzmImageTools.uploadCompressedImage(pendingFile, {
        folder: 'site',
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.84,
      });

      const def = DEFAULT_SITE_IMAGES[chave];
      const { error } = await window.epzmSupabase.from('imagens_site').upsert(
        {
          chave,
          titulo: row.titulo || def.titulo,
          descricao: row.descricao || def.descricao,
          imagem_url: uploaded.publicUrl,
          imagem_caminho: uploaded.path,
          texto_alternativo: row.texto_alternativo || def.defaultAlt,
        },
        { onConflict: 'chave' }
      );

      if (error) throw new Error(error.message);
      if (oldPath && oldPath !== uploaded.path) {
        await window.epzmImageTools.deleteStorageImage(oldPath);
      }

      delete state.siteImagePendingFiles[chave];
      showToast('Imagem atualizada no site!');
      await loadAllData();
    } catch (err) {
      showToast('Erro ao salvar imagem: ' + err.message, 'danger');
    } finally {
      setButtonLoading(btn, false, 'Salvar');
    }
  }

  async function restoreSiteImage(chave, row, btn) {
    setButtonLoading(btn, true);
    try {
      const { error } = await window.epzmSupabase
        .from('imagens_site')
        .update({ imagem_url: null, imagem_caminho: null })
        .eq('chave', chave);
      if (error) throw new Error(error.message);
      if (row.imagem_caminho) {
        await window.epzmImageTools.deleteStorageImage(row.imagem_caminho);
      }
      delete state.siteImagePendingFiles[chave];
      showToast('Imagem padrão restaurada!');
      await loadAllData();
    } catch (err) {
      showToast('Erro ao restaurar imagem: ' + err.message, 'danger');
    } finally {
      setButtonLoading(btn, false, 'Restaurar');
    }
  }

  /* -----------------------------------------------------------
     5. CONFIGURAÇÕES UNIFICADAS (APARÊNCIA + DADOS DA ESCOLA)
  ----------------------------------------------------------- */
  const LEGACY_AVISO_HEX = { ambar: '#D97706', verde: '#0F5A45', roxo: '#4C1D95' };
  const TRABALHE_ICONS = [
    'bi-briefcase-fill',
    'bi-person-plus-fill',
    'bi-envelope-fill',
    'bi-whatsapp',
    'bi-file-earmark-person-fill',
    'bi-people-fill',
    'bi-building-fill',
    'bi-send-fill',
    'bi-award-fill',
    'bi-megaphone-fill',
  ];

  function resolveHexColor(val, fallback) {
    const raw = String(val || '').trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(raw)) return raw.toUpperCase();
    return fallback;
  }

  function renderTrabalheIconPicker() {
    const grid = $('trabalheIconPickerGrid');
    if (!grid) return;
    const selected = $('cfgBtnTrabalheIcone')?.value || 'bi-briefcase-fill';
    clearEl(grid);

    TRABALHE_ICONS.forEach((iconClass) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `icon-pick-btn ${selected === iconClass ? 'active' : ''}`;
      btn.title = iconClass;
      btn.innerHTML = `<i class="bi ${iconClass}"></i>`;
      btn.addEventListener('click', () => {
        $('cfgBtnTrabalheIcone').value = iconClass;
        markConfigDirty(true);
        renderTrabalheIconPicker();
        updateTrabalhePreview();
      });
      grid.appendChild(btn);
    });
  }

  function appendFormattedNodes(parent, rawText) {
    const tokenRegex = /(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*]+\*)/;
    let remaining = String(rawText || '');

    while (remaining.length > 0) {
      const match = tokenRegex.exec(remaining);
      if (!match) {
        parent.appendChild(document.createTextNode(remaining));
        break;
      }

      if (match.index > 0) {
        parent.appendChild(document.createTextNode(remaining.slice(0, match.index)));
      }

      const token = match[0];
      let tag = null;
      let inner = '';

      if (token.startsWith('**') && token.endsWith('**')) {
        tag = 'strong';
        inner = token.slice(2, -2);
      } else if (token.startsWith('__') && token.endsWith('__')) {
        tag = 'u';
        inner = token.slice(2, -2);
      } else if (token.startsWith('~~') && token.endsWith('~~')) {
        tag = 's';
        inner = token.slice(2, -2);
      } else if (token.startsWith('*') && token.endsWith('*')) {
        tag = 'em';
        inner = token.slice(1, -1);
      }

      if (tag && inner) {
        const node = document.createElement(tag);
        appendFormattedNodes(node, inner);
        parent.appendChild(node);
      } else {
        parent.appendChild(document.createTextNode(token));
      }

      remaining = remaining.slice(match.index + token.length);
    }
  }

  function renderSafeBoldText(el, rawText) {
    clearEl(el);
    appendFormattedNodes(el, rawText);
  }

  function stripRichMarkers(text) {
    return String(text || '').replace(/(\*\*|__|~~|\*)/g, '');
  }

  const DEFAULT_HERO_QUOTE =
    '“Ensina a criança no caminho em que deve andar, e ainda quando for velho não se desviará dele.”';
  const DEFAULT_HERO_REF = '— Provérbios 22:6';

  function applyFormatToHeroQuote(marker) {
    const input = $('cfgHeroQuoteTexto');
    if (!input || !marker) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;

    if (start === null || end === null || start === end) {
      showToast('Selecione primeiro o trecho da frase que deseja formatar.', 'warning');
      input.focus();
      return;
    }

    const mLen = marker.length;
    const val = input.value;
    const selected = val.slice(start, end);
    const before = val.slice(0, start);
    const after = val.slice(end);

    if (before.endsWith(marker) && after.startsWith(marker)) {
      input.value = before.slice(0, -mLen) + selected + after.slice(mLen);
      input.setSelectionRange(start - mLen, end - mLen);
    } else if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length > mLen * 2) {
      const inner = selected.slice(mLen, -mLen);
      input.value = before + inner + after;
      input.setSelectionRange(start, start + inner.length);
    } else {
      input.value = before + marker + selected + marker + after;
      input.setSelectionRange(start + mLen, end + mLen);
    }

    input.focus();
    markConfigDirty(true);
    updateTrabalhePreview();
  }

  function clearHeroQuoteFormatting() {
    const input = $('cfgHeroQuoteTexto');
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;

    if (start !== null && end !== null && start !== end) {
      const before = input.value.slice(0, start);
      const cleanSel = stripRichMarkers(input.value.slice(start, end));
      const after = input.value.slice(end);
      input.value = before + cleanSel + after;
      input.setSelectionRange(start, start + cleanSel.length);
    } else {
      input.value = stripRichMarkers(input.value);
    }

    input.focus();
    markConfigDirty(true);
    updateTrabalhePreview();
  }

  function updateTrabalhePreview() {
    const pill = $('cfgTrabalhePreviewPill');
    const iconEl = $('cfgTrabalhePreviewIcon');
    const textEl = $('cfgTrabalhePreviewText');
    const quoteInput = $('cfgHeroQuoteTexto');
    const quoteRefInput = $('cfgHeroQuoteRef');
    const quotePreview = $('cfgHeroQuotePreview');
    const quoteRefPreview = $('cfgHeroQuoteRefPreview');

    if (quoteInput && quotePreview) {
      const rawQuote = quoteInput.value.trim() || DEFAULT_HERO_QUOTE;
      const visibleLen = stripRichMarkers(quoteInput.value).length;
      if ($('cfgHeroQuoteCount')) {
        $('cfgHeroQuoteCount').textContent = `${visibleLen} / 180`;
      }
      renderSafeBoldText(quotePreview, rawQuote);
    }
    if (quoteRefInput && quoteRefPreview) {
      quoteRefPreview.textContent = quoteRefInput.value.trim() || DEFAULT_HERO_REF;
    }

    if (!pill || !iconEl || !textEl) return;

    const ativo = $('cfgBtnTrabalheAtivo')?.checked !== false;
    const hex = resolveHexColor($('cfgBtnTrabalheCor')?.value, '#0EA5E9');
    const txtColor = getContrastTextColor(hex);
    const textoRaw = $('cfgBtnTrabalheTexto')?.value || '';
    const texto = textoRaw.trim() || 'Trabalhe Conosco';
    const icone = $('cfgBtnTrabalheIcone')?.value || 'bi-briefcase-fill';

    if ($('cfgBtnTrabalheCount')) $('cfgBtnTrabalheCount').textContent = `${textoRaw.length} / 18`;
    if ($('cfgBtnTrabalheColorPicker')) $('cfgBtnTrabalheColorPicker').value = hex;
    if ($('cfgBtnTrabalheColorHex')) $('cfgBtnTrabalheColorHex').textContent = hex;

    document.querySelectorAll('#trabalheColorSwatches .color-swatch').forEach((btn) => {
      btn.classList.toggle('active', String(btn.getAttribute('data-color') || '').toUpperCase() === hex);
    });

    pill.style.background = hex;
    pill.style.color = txtColor;
    pill.classList.toggle('is-disabled', !ativo);
    iconEl.className = `bi ${icone}`;
    textEl.textContent = texto;
  }

  function resolveAvisoHex(val) {
    const raw = String(val || '').trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(raw)) return raw.toUpperCase();
    return LEGACY_AVISO_HEX[raw] || '#D97706';
  }

  function getContrastTextColor(hex) {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 165 ? '#18221F' : '#FFFFFF';
  }

  function updateAvisoPreview() {
    const ativo = $('cfgAvisoAtivo')?.checked;
    const texto = ($('cfgAvisoTexto')?.value || '').trim();
    const hex = resolveAvisoHex($('cfgAvisoCor')?.value);
    const preview = $('cfgAvisoPreview');
    const previewText = $('cfgAvisoPreviewText');
    if (!preview || !previewText) return;

    if ($('cfgAvisoColorPicker')) $('cfgAvisoColorPicker').value = hex;
    if ($('cfgAvisoColorHex')) $('cfgAvisoColorHex').textContent = hex;

    document.querySelectorAll('#avisoColorSwatches .color-swatch').forEach((btn) => {
      btn.classList.toggle('active', String(btn.getAttribute('data-color') || '').toUpperCase() === hex);
    });

    if (ativo && texto) {
      preview.className = 'aviso-live-preview';
      preview.style.background = hex;
      preview.style.color = getContrastTextColor(hex);
      previewText.textContent = texto;
    } else if (!ativo) {
      preview.className = 'aviso-live-preview is-off';
      preview.style.background = '';
      preview.style.color = '';
      previewText.textContent = 'Aviso desativado — ative o interruptor acima para exibir no topo do site.';
    } else {
      preview.className = 'aviso-live-preview';
      preview.style.background = hex;
      preview.style.color = getContrastTextColor(hex);
      previewText.textContent = 'Digite a mensagem do aviso abaixo para pré-visualizar aqui.';
    }
  }

  function populateConfigForm() {
    const cfg = state.configuracoes;
    if (!cfg) return;

    $('cfgAvisoAtivo').checked = Boolean(cfg.aviso_ativo);
    $('cfgAvisoTexto').value = cfg.aviso_texto || '';
    $('cfgAvisoLink').value = cfg.aviso_link || '';
    $('cfgAvisoCor').value = resolveAvisoHex(cfg.aviso_cor);

    const ctrl = cfg.controles_visuais && typeof cfg.controles_visuais === 'object' ? cfg.controles_visuais : {};
    $('cfgSecDiferenciais').checked = ctrl.mostrar_secao_diferenciais !== false;
    $('cfgSecMackenzie').checked = ctrl.mostrar_secao_mackenzie !== false;
    $('cfgSecSegmentos').checked = ctrl.mostrar_secao_segmentos !== false;
    $('cfgSecEventos').checked = ctrl.mostrar_secao_eventos !== false;
    $('cfgSecEquipe').checked = ctrl.mostrar_secao_equipe !== false;
    $('cfgSecMatriculas').checked = ctrl.mostrar_secao_matriculas !== false;

    $('cfgBtnMatriculaVisivel').checked = ctrl.mostrar_btn_matricula !== false;
    $('cfgTextoBtnMatricula').value = ctrl.texto_btn_matricula || 'MATRÍCULA E REMATRÍCULA';

    // Botão Opcional + Versículo / Citação do Banner Principal
    $('cfgHeroQuoteTexto').value = ctrl.hero_quote_texto || DEFAULT_HERO_QUOTE;
    $('cfgHeroQuoteRef').value = ctrl.hero_quote_ref || DEFAULT_HERO_REF;
    $('cfgBtnTrabalheAtivo').checked = ctrl.mostrar_trabalhe_conosco !== false;
    $('cfgBtnTrabalheTexto').value = (ctrl.trabalhe_texto || 'Trabalhe Conosco').slice(0, 18);
    $('cfgBtnTrabalheCor').value = resolveHexColor(ctrl.trabalhe_cor, '#0EA5E9');
    $('cfgBtnTrabalheIcone').value = ctrl.trabalhe_icone || 'bi-briefcase-fill';
    $('cfgLinkTrabalheConosco').value = ctrl.trabalhe_link || cfg.link_trabalhe_conosco || '';

    $('cfgWhatsappExibicao').value = cfg.whatsapp_exibicao || '';
    $('cfgWhatsappNumero').value = cfg.whatsapp_numero || '';
    $('cfgEmailContato').value = cfg.email_contato || '';
    $('cfgAnoMatricula').value = cfg.ano_matricula || '';
    $('cfgLinkMatricula').value = cfg.link_matricula || '';
    $('cfgEmailDpo').value = cfg.email_dpo || '';

    $('cfgStatAlunos').value = cfg.stat_alunos || '';
    $('cfgStatProfessores').value = cfg.stat_professores || '';
    $('cfgStatAnos').value = cfg.stat_anos_historia || '';
    $('cfgStatCompromisso').value = cfg.stat_compromisso || '';

    $('cfgLinkInstagram').value = cfg.link_instagram || '';
    $('cfgLinkFacebook').value = cfg.link_facebook || '';
    $('cfgLinkYoutube').value = cfg.link_youtube || '';

    updateAvisoPreview();
    renderTrabalheIconPicker();
    updateTrabalhePreview();
  }

  async function saveGlobalConfig() {
    const btn = $('saveConfigGlobalBtn');
    setButtonLoading(btn, true);

    try {
      const trabalheLink = $('cfgLinkTrabalheConosco').value.trim();
      const controlesVisuais = {
        mostrar_secao_diferenciais: $('cfgSecDiferenciais').checked,
        mostrar_secao_mackenzie: $('cfgSecMackenzie').checked,
        mostrar_secao_segmentos: $('cfgSecSegmentos').checked,
        mostrar_secao_eventos: $('cfgSecEventos').checked,
        mostrar_secao_equipe: $('cfgSecEquipe').checked,
        mostrar_secao_matriculas: $('cfgSecMatriculas').checked,
        mostrar_btn_matricula: $('cfgBtnMatriculaVisivel').checked,
        texto_btn_matricula: $('cfgTextoBtnMatricula').value.trim() || 'MATRÍCULA E REMATRÍCULA',
        hero_quote_texto: $('cfgHeroQuoteTexto').value.trim() || DEFAULT_HERO_QUOTE,
        hero_quote_ref: $('cfgHeroQuoteRef').value.trim() || DEFAULT_HERO_REF,
        mostrar_trabalhe_conosco: $('cfgBtnTrabalheAtivo').checked,
        trabalhe_texto: ($('cfgBtnTrabalheTexto').value.trim() || 'Trabalhe Conosco').slice(0, 18),
        trabalhe_cor: resolveHexColor($('cfgBtnTrabalheCor').value, '#0EA5E9'),
        trabalhe_icone: $('cfgBtnTrabalheIcone').value || 'bi-briefcase-fill',
        trabalhe_link: trabalheLink,
      };

      const payload = {
        id: 1,
        aviso_ativo: $('cfgAvisoAtivo').checked,
        aviso_texto: $('cfgAvisoTexto').value.trim(),
        aviso_link: $('cfgAvisoLink').value.trim(),
        aviso_cor: resolveAvisoHex($('cfgAvisoCor').value),
        controles_visuais: controlesVisuais,
        whatsapp_exibicao: $('cfgWhatsappExibicao').value.trim(),
        whatsapp_numero: $('cfgWhatsappNumero').value.replace(/\D/g, ''),
        email_contato: $('cfgEmailContato').value.trim(),
        ano_matricula: $('cfgAnoMatricula').value.trim(),
        link_matricula: $('cfgLinkMatricula').value.trim(),
        link_trabalhe_conosco: trabalheLink,
        email_dpo: $('cfgEmailDpo').value.trim(),
        stat_alunos: $('cfgStatAlunos').value.trim(),
        stat_professores: $('cfgStatProfessores').value.trim(),
        stat_anos_historia: $('cfgStatAnos').value.trim(),
        stat_compromisso: $('cfgStatCompromisso').value.trim(),
        link_instagram: $('cfgLinkInstagram').value.trim(),
        link_facebook: $('cfgLinkFacebook').value.trim(),
        link_youtube: $('cfgLinkYoutube').value.trim(),
      };

      const { error } = await window.epzmSupabase
        .from('configuracoes_site')
        .upsert(payload, { onConflict: 'id' });

      if (error) throw new Error(error.message);

      markConfigDirty(false);
      showToast('Alterações publicadas no site!');
      await loadAllData();
    } catch (err) {
      showToast('Erro ao salvar alterações: ' + err.message, 'danger');
    } finally {
      setButtonLoading(btn, false, 'Salvar alterações');
    }
  }

  /* -----------------------------------------------------------
     Exclusão genérica
  ----------------------------------------------------------- */
  function askDelete(type, item) {
    state.pendingDelete = { type, item };
    const label = type === 'equipe' ? item.nome : item.titulo;
    $('confirmDeleteText').textContent = `Excluir "${label}"? Esta ação não pode ser desfeita.`;
    bootstrap.Modal.getOrCreateInstance($('confirmDeleteModal')).show();
  }

  async function executeDelete() {
    if (!state.pendingDelete) return;
    const { type, item } = state.pendingDelete;
    const btn = $('confirmDeleteBtn');
    setButtonLoading(btn, true);

    try {
      const table = type === 'equipe' ? 'equipe_servidores' : 'noticias_eventos';
      const storagePath = type === 'equipe' ? item.foto_caminho : item.imagem_capa_caminho;

      const { error } = await window.epzmSupabase.from(table).delete().eq('id', item.id);
      if (error) throw new Error(error.message);

      if (storagePath) {
        await window.epzmImageTools.deleteStorageImage(storagePath);
      }

      bootstrap.Modal.getInstance($('confirmDeleteModal'))?.hide();
      showToast('Item excluído!');
      state.pendingDelete = null;
      await loadAllData();
    } catch (err) {
      showToast('Erro ao excluir: ' + err.message, 'danger');
    } finally {
      setButtonLoading(btn, false, 'Excluir');
    }
  }

  /* -----------------------------------------------------------
     Eventos e Inicialização
  ----------------------------------------------------------- */
  function bindEvents() {
    $('loginForm').addEventListener('submit', handleLoginSubmit);
    $('logoutBtn').addEventListener('click', handleLogout);

    $('togglePasswordBtn').addEventListener('click', () => {
      const input = $('loginPassword');
      const isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      $('togglePasswordBtn').innerHTML = isPass ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
    });

    // Sidebar & Mobile
    document.querySelectorAll('.admin-nav-item').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
    });
    $('openSidebarBtn')?.addEventListener('click', openMobileSidebar);
    $('closeSidebarBtn')?.addEventListener('click', closeMobileSidebar);
    $('sidebarBackdrop')?.addEventListener('click', closeMobileSidebar);
    $('refreshAllBtn')?.addEventListener('click', () => loadAllData().then(() => showToast('Sincronizado!')));

    // Sub-navegação da Aparência
    document.querySelectorAll('#aparenciaSubnav .settings-subnav-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchAparenciaPane(btn.getAttribute('data-pane')));
    });

    // Atalhos da Visão Geral
    $('quickNewEquipeBtn')?.addEventListener('click', () => {
      switchTab('equipe');
      openEquipeModal(null);
    });
    $('quickNewNoticiaBtn')?.addEventListener('click', () => {
      switchTab('noticias');
      openNoticiaModal(null);
    });

    // Segmented controls: Equipe
    document.querySelectorAll('#equipeCategoryTabs .seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#equipeCategoryTabs .seg-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.equipeFilterCat = btn.getAttribute('data-cat') || 'all';
        renderEquipeTable();
      });
    });

    // Segmented controls: Notícias
    document.querySelectorAll('#noticiasCategoryTabs .seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#noticiasCategoryTabs .seg-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.noticiasFilterCat = btn.getAttribute('data-cat') || 'all';
        renderNoticiasTable();
      });
    });

    // Equipe
    $('newEquipeBtn').addEventListener('click', () => openEquipeModal(null));
    $('equipeForm').addEventListener('submit', handleEquipeSubmit);
    $('equipeAtivo').addEventListener('change', updateDestaqueHomeControls);
    $('equipeDestaqueHome').addEventListener('change', updateDestaqueHomeControls);
    $('equipeSearchInput').addEventListener('input', renderEquipeTable);
    $('equipeFotoInput').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      state.equipeSelectedFile = file;
      $('equipeFotoPreview').src = URL.createObjectURL(file);
      $('equipeFotoInfo').textContent = `Selecionado: ${file.name}`;
    });

    // Notícias
    $('newNoticiaBtn').addEventListener('click', () => openNoticiaModal(null));
    $('noticiaForm').addEventListener('submit', handleNoticiaSubmit);
    $('noticiasAdminSearch').addEventListener('input', renderNoticiasTable);
    $('noticiaPreviewBtn').addEventListener('click', openNoticiaPreview);
    $('noticiaTitulo').addEventListener('input', (e) => {
      const slugInput = $('noticiaSlug');
      if (slugInput.dataset.manual !== 'true') slugInput.value = slugify(e.target.value);
    });
    $('noticiaSlug').addEventListener('input', (e) => {
      e.target.dataset.manual = 'true';
    });
    $('noticiaCapaInput').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      state.noticiaSelectedFile = file;
      state.noticiaRemoveCover = false;
      $('noticiaCapaPreview').src = URL.createObjectURL(file);
      $('noticiaCapaPreviewWrap').classList.remove('d-none');
      $('noticiaCapaInfo').textContent = `Selecionado: ${file.name}`;
    });
    $('removeNoticiaCoverBtn').addEventListener('click', () => {
      state.noticiaSelectedFile = null;
      state.noticiaRemoveCover = true;
      $('noticiaCapaInput').value = '';
      $('noticiaCapaPreviewWrap').classList.add('d-none');
    });

    // Aparência & Dados da Escola (Dirty Tracking + Sticky Save Bar)
    document.querySelectorAll('.config-dirty-field').forEach((field) => {
      const evt = field.type === 'checkbox' ? 'change' : 'input';
      field.addEventListener(evt, () => {
        markConfigDirty(true);
        updateAvisoPreview();
        updateTrabalhePreview();
      });
    });

    document.querySelectorAll('#avisoColorSwatches .color-swatch').forEach((btn) => {
      btn.addEventListener('click', () => {
        $('cfgAvisoCor').value = btn.getAttribute('data-color') || '#D97706';
        markConfigDirty(true);
        updateAvisoPreview();
      });
    });

    $('cfgAvisoColorPicker')?.addEventListener('input', (e) => {
      $('cfgAvisoCor').value = String(e.target.value || '#D97706').toUpperCase();
      markConfigDirty(true);
      updateAvisoPreview();
    });

    document.querySelectorAll('#trabalheColorSwatches .color-swatch').forEach((btn) => {
      btn.addEventListener('click', () => {
        $('cfgBtnTrabalheCor').value = btn.getAttribute('data-color') || '#0EA5E9';
        markConfigDirty(true);
        updateTrabalhePreview();
      });
    });

    document.querySelectorAll('#heroQuoteToolbar .fmt-btn[data-marker]').forEach((btn) => {
      btn.addEventListener('click', () => applyFormatToHeroQuote(btn.getAttribute('data-marker')));
    });
    $('btnHeroQuoteClearFmt')?.addEventListener('click', clearHeroQuoteFormatting);

    $('cfgBtnTrabalheColorPicker')?.addEventListener('input', (e) => {
      $('cfgBtnTrabalheCor').value = String(e.target.value || '#0EA5E9').toUpperCase();
      markConfigDirty(true);
      updateTrabalhePreview();
    });

    $('saveConfigGlobalBtn')?.addEventListener('click', saveGlobalConfig);
    $('discardConfigBtn')?.addEventListener('click', () => {
      populateConfigForm();
      markConfigDirty(false);
      showToast('Alterações descartadas.', 'warning');
    });

    $('confirmDeleteBtn').addEventListener('click', executeDelete);
  }

  async function init() {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
    const incomingType = searchParams.get('type') || hashParams.get('type');
    if (incomingType === 'invite') {
      window.location.replace('primeiro-acesso.html' + window.location.search + window.location.hash);
      return;
    }
    if (incomingType === 'recovery') {
      window.location.replace('redefinir-senha.html' + window.location.search + window.location.hash);
      return;
    }

    bindEvents();

    if (!window.isSupabaseConfigured || !window.isSupabaseConfigured() || !window.epzmSupabase) {
      $('configWarningAlert').classList.remove('d-none');
      showLoginView();
      return;
    }

    window.epzmSupabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        window.location.replace('redefinir-senha.html' + window.location.search + window.location.hash);
      } else if (event === 'SIGNED_OUT') {
        showLoginView();
      } else if (event === 'SIGNED_IN' && session) {
        showDashboardView(session);
      }
    });

    const { data } = await window.epzmSupabase.auth.getSession();
    if (data && data.session) {
      showDashboardView(data.session);
    } else {
      showLoginView();
    }
  }

  window.epzmAdminControls = {
    switchTab,
    switchAparenciaPane,
    getCurrentUserId: () => (state.session && state.session.user && state.session.user.id) || 'default',
  };

  document.addEventListener('DOMContentLoaded', init);
})();
