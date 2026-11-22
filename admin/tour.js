/**
 * Escola Presbiteriana Zenaide Magalhães
 * Tour Guiado Interativo de Primeiro Acesso para o Gestor (/admin/)
 *
 * - Inicia automaticamente no primeiro acesso de cada usuário autenticado (localStorage por userId).
 * - Pode ser reaberto a qualquer momento clicando em "Tour Guiado" no topo do painel.
 * - Destaca os elementos reais na tela (spotlight) e navega automaticamente entre as abas.
 */

(function () {
  const STEPS = [
    {
      tab: 'visao-geral',
      selector: '#tab-visao-geral .kpi-grid',
      title: 'Bem-vindo ao Painel da Adminstração!',
      desc: 'Aqui na Visão Geral você acompanha os números principais do site: total de acessos nos últimos 30 dias, servidores ativos e notícias publicadas.',
    },
    {
      tab: 'visao-geral',
      selector: '#accessChartBars',
      title: 'Acessos ao Site',
      desc: 'Este gráfico mostra a evolução diária das visitas nos últimos 7 dias e, ao lado, as páginas mais acessadas. A contagem é totalmente anônima e o histórico se renova automaticamente a cada 30 dias.',
    },
    {
      tab: 'equipe',
      selector: '#newEquipeBtn',
      title: 'Cadastrar Equipe & Servidores',
      desc: 'Clique em "Novo Servidor" para adicionar professores, coordenadores ou gestores com foto. O contador "Home: X / 4" mostra quantos já estão em destaque na página inicial.',
    },
    {
      tab: 'equipe',
      selector: '#tab-equipe .surface-card',
      title: 'Ações Rápidas na Equipe',
      desc: 'Direto na tabela você pode usar as setas ↑ ↓ para mudar a ordem, clicar na estrela para destacar na página inicial (máximo 4) e usar o interruptor para exibir ou ocultar um profissional.',
    },
    {
      tab: 'noticias',
      selector: '#newNoticiaBtn',
      title: 'Publicar Notícias & Eventos',
      desc: 'Clique em "Nova Publicação" para criar notícias, eventos ou comunicados com foto de capa. Você pode clicar em "Pré-visualizar" antes de salvar ou alternar entre Publicado e Rascunho direto na tabela.',
    },
    {
      tab: 'aparencia',
      pane: 'pane-aviso',
      selector: '#pane-aviso .surface-card',
      title: 'Aviso Fixo no Topo do Site',
      desc: 'Precisa dar um recado urgente ou divulgar matrículas abertas? Ative o interruptor, escreva a mensagem, escolha a cor que desejar e veja a pré-visualização instantânea. O aviso fica fixo no topo enquanto estiver ativo.',
    },
    {
      tab: 'aparencia',
      pane: 'pane-imagens',
      selector: '#siteImagesGrid',
      title: 'Trocar Imagens Principais',
      desc: 'Aqui você substitui as 3 imagens principais da página inicial (Banner Hero, Fachada da Escola e Banner de Matrículas). Se quiser voltar à imagem original, basta clicar em "Restaurar".',
    },
    {
      tab: 'aparencia',
      pane: 'pane-secoes',
      selector: '#cardSecoesHome',
      title: 'Seções & Botão de Matrícula',
      desc: 'Ative ou oculte blocos inteiros da página inicial sem risco de desalinhar o site e, logo abaixo, personalize o texto, o ano e o link do botão de matrícula.',
    },
    {
      tab: 'aparencia',
      pane: 'pane-secoes',
      selector: '#cardBotaoOpcional',
      title: 'Botão Opcional na Barra Superior',
      desc: 'Ative ou desative um botão extra ao lado do Portal do Professor, escolhendo texto curto (até 18 caracteres), link, cor livre e ícone com pré-visualização em tempo real.',
    },
    {
      tab: 'aparencia',
      pane: 'pane-secoes',
      selector: '#cardVersiculoHero',
      title: 'Versículo / Citação com Formatação',
      desc: 'Edite o versículo e a referência sobre a foto principal. Selecione qualquer trecho com o mouse e aplique Negrito, Itálico, Sublinhado ou Tachado (e use Limpar quando quiser remover).',
    },
    {
      tab: 'escola',
      selector: '#tab-escola .settings-split-row',
      title: 'Dados da Escola & Salvamento',
      desc: 'Atualize WhatsApp, e-mail de contato, e-mail do encarregado LGPD, números da escola e redes sociais. Sempre que alterar algo em "Aparência" ou "Dados da Escola", uma barra aparecerá na base da tela para salvar ou descartar.',
    },
    {
      tab: 'visao-geral',
      selector: '#startTourBtn',
      title: 'Tudo pronto para começar!',
      desc: 'Você pode abrir o site ao vivo a qualquer momento pelo botão "Abrir site ao vivo" no rodapé da barra lateral — e rever este tutorial sempre que quiser clicando aqui em "Tour Guiado".',
    },
  ];

  let active = false;
  let currentIndex = 0;
  let activeUserId = 'default';
  let backdropEl = null;
  let spotlightEl = null;
  let cardEl = null;

  function storageKey(userId) {
    return 'epzm_admin_tour_done_' + (userId || 'default');
  }

  function removeTourElements() {
    backdropEl?.remove();
    spotlightEl?.remove();
    cardEl?.remove();
    backdropEl = null;
    spotlightEl = null;
    cardEl = null;
  }

  function finishTour(markCompleted = true) {
    active = false;
    removeTourElements();
    window.removeEventListener('resize', repositionCurrentStep);
    window.removeEventListener('scroll', repositionCurrentStep, true);
    document.removeEventListener('keydown', handleKeydown);

    if (markCompleted) {
      try {
        localStorage.setItem(storageKey(activeUserId), '1');
      } catch (_) {}
    }
  }

  function handleKeydown(e) {
    if (!active) return;
    if (e.key === 'Escape') {
      finishTour(true);
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
      nextStep();
    } else if (e.key === 'ArrowLeft') {
      prevStep();
    }
  }

  function positionElements(targetEl) {
    if (!spotlightEl || !cardEl) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 8;

    let rect = targetEl ? targetEl.getBoundingClientRect() : null;
    if (!rect || rect.width === 0 || rect.height === 0) {
      spotlightEl.style.top = '50%';
      spotlightEl.style.left = '50%';
      spotlightEl.style.width = '0px';
      spotlightEl.style.height = '0px';
      cardEl.style.top = Math.max(20, (vh - cardEl.offsetHeight) / 2) + 'px';
      cardEl.style.left = Math.max(12, (vw - cardEl.offsetWidth) / 2) + 'px';
      return;
    }

    const spotTop = Math.max(8, rect.top - pad);
    const spotLeft = Math.max(8, rect.left - pad);
    const spotWidth = Math.min(vw - spotLeft - 8, rect.width + pad * 2);
    const spotHeight = Math.min(vh - spotTop - 8, rect.height + pad * 2);

    spotlightEl.style.top = spotTop + 'px';
    spotlightEl.style.left = spotLeft + 'px';
    spotlightEl.style.width = spotWidth + 'px';
    spotlightEl.style.height = spotHeight + 'px';

    const cardW = cardEl.offsetWidth || 360;
    const cardH = cardEl.offsetHeight || 220;
    const gap = 14;

    // Tenta abaixo -> acima -> centro seguro
    let top = spotTop + spotHeight + gap;
    if (top + cardH > vh - 14) {
      top = spotTop - cardH - gap;
    }
    if (top < 14 || top + cardH > vh - 14) {
      top = Math.max(14, Math.min(vh - cardH - 14, vh - cardH - 20));
    }

    let left = spotLeft + spotWidth / 2 - cardW / 2;
    left = Math.max(12, Math.min(vw - cardW - 12, left));

    cardEl.style.top = top + 'px';
    cardEl.style.left = left + 'px';
  }

  function repositionCurrentStep() {
    if (!active) return;
    const step = STEPS[currentIndex];
    const targetEl = step && step.selector ? document.querySelector(step.selector) : null;
    positionElements(targetEl);
  }

  function renderStep() {
    if (!active) return;
    const step = STEPS[currentIndex];
    const controls = window.epzmAdminControls;

    if (controls && step.tab) {
      controls.switchTab(step.tab);
    }
    if (controls && step.pane) {
      controls.switchAparenciaPane(step.pane);
    }

    const targetEl = step.selector ? document.querySelector(step.selector) : null;
    if (targetEl && typeof targetEl.scrollIntoView === 'function') {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }

    const total = STEPS.length;
    const pct = Math.round(((currentIndex + 1) / total) * 100);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === total - 1;

    cardEl.innerHTML = '';

    const topRow = document.createElement('div');
    topRow.className = 'd-flex justify-content-between align-items-center';

    const badge = document.createElement('span');
    badge.className = 'epzm-tour-badge';
    badge.innerHTML = `<i class="bi bi-compass"></i> Passo ${currentIndex + 1} de ${total}`;

    const skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    skipBtn.className = 'btn btn-link btn-sm text-muted text-decoration-none p-0';
    skipBtn.textContent = 'Pular';
    skipBtn.addEventListener('click', () => finishTour(true));

    topRow.append(badge, skipBtn);

    const title = document.createElement('h3');
    title.className = 'epzm-tour-title';
    title.textContent = step.title;

    const desc = document.createElement('p');
    desc.className = 'epzm-tour-desc';
    desc.textContent = step.desc;

    const prog = document.createElement('div');
    prog.className = 'epzm-tour-progress';
    const progBar = document.createElement('div');
    progBar.className = 'epzm-tour-progress-bar';
    progBar.style.width = pct + '%';
    prog.appendChild(progBar);

    const footer = document.createElement('div');
    footer.className = 'epzm-tour-footer';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'btn btn-light btn-sm';
    prevBtn.textContent = 'Anterior';
    prevBtn.disabled = isFirst;
    prevBtn.addEventListener('click', prevStep);

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'btn btn-primary btn-sm px-3';
    nextBtn.textContent = isLast ? 'Concluir Tour' : 'Próximo →';
    nextBtn.addEventListener('click', nextStep);

    footer.append(prevBtn, nextBtn);
    cardEl.append(topRow, title, desc, prog, footer);

    // Reposiciona após o scroll suave assentar
    requestAnimationFrame(() => positionElements(targetEl));
    setTimeout(() => positionElements(targetEl), 280);
  }

  function nextStep() {
    if (currentIndex < STEPS.length - 1) {
      currentIndex += 1;
      renderStep();
    } else {
      finishTour(true);
    }
  }

  function prevStep() {
    if (currentIndex > 0) {
      currentIndex -= 1;
      renderStep();
    }
  }

  function startTour(userId) {
    if (active) return;
    activeUserId = userId || (window.epzmAdminControls && window.epzmAdminControls.getCurrentUserId()) || 'default';
    active = true;
    currentIndex = 0;

    backdropEl = document.createElement('div');
    backdropEl.className = 'epzm-tour-backdrop';
    backdropEl.addEventListener('click', () => finishTour(true));

    spotlightEl = document.createElement('div');
    spotlightEl.className = 'epzm-tour-spotlight';

    cardEl = document.createElement('div');
    cardEl.className = 'epzm-tour-card';
    cardEl.setAttribute('role', 'dialog');
    cardEl.setAttribute('aria-modal', 'true');

    document.body.append(backdropEl, spotlightEl, cardEl);
    window.addEventListener('resize', repositionCurrentStep);
    window.addEventListener('scroll', repositionCurrentStep, true);
    document.addEventListener('keydown', handleKeydown);

    renderStep();
  }

  function maybeStartFirstAccessTour(userId) {
    activeUserId = userId || 'default';
    try {
      if (localStorage.getItem(storageKey(activeUserId)) === '1') return;
    } catch (_) {}

    // Pequeno atraso para a dashboard terminar de renderizar os dados
    setTimeout(() => {
      const dash = document.getElementById('dashboardView');
      if (dash && !dash.classList.contains('d-none')) {
        startTour(activeUserId);
      }
    }, 600);
  }

  window.epzmAdminTour = {
    start: startTour,
    maybeStartFirstAccessTour,
  };

  document.addEventListener('DOMContentLoaded', () => {
    const triggerBtn = document.getElementById('startTourBtn');
    if (triggerBtn) {
      triggerBtn.addEventListener('click', () => startTour());
    }
  });
})();
