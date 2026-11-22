/**
 * Escola Presbiteriana Zenaide Magalhães
 * Fluxos dedicados de autenticação com proteção estrita por token:
 * - primeiro-acesso.html (exige token type=invite)
 * - esqueci-senha.html   (solicitação de redefinição por e-mail)
 * - redefinir-senha.html (exige token type=recovery)
 */

(function () {
  const $ = (id) => document.getElementById(id);

  /* -----------------------------------------------------------
     Utilitários de UI e Validação de Senha Forte
  ----------------------------------------------------------- */
  function showAlert(elId, msg) {
    const el = $(elId);
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('d-none');
  }

  function hideAlert(elId) {
    const el = $(elId);
    if (el) el.classList.add('d-none');
  }

  function setButtonLoading(btn, loading, loadingText, defaultText) {
    if (!btn) return;
    if (loading) {
      btn.dataset.originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = loadingText || 'Processando...';
    } else {
      btn.disabled = false;
      btn.textContent = defaultText || btn.dataset.originalText || 'Continuar';
    }
  }

  function bindPasswordToggle(btnId, inputId) {
    const btn = $(btnId);
    const input = $(inputId);
    if (!btn || !input) return;
    btn.addEventListener('click', () => {
      const isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      btn.innerHTML = isPass ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
    });
  }

  function evaluatePassword(password) {
    const value = String(password || '');
    const hasMinLength = value.length >= 8;
    const hasLetter = /[A-Za-zÀ-ÿ]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasUpperAndLower = /[a-z]/.test(value) && /[A-Z]/.test(value);
    const hasSpecial = /[^A-Za-z0-9]/.test(value);

    const isValid = hasMinLength && hasLetter && hasNumber;

    let score = 0;
    if (hasMinLength) score += 1;
    if (hasLetter) score += 1;
    if (hasNumber) score += 1;
    if (hasUpperAndLower || hasSpecial) score += 1;
    if (value.length >= 12) score += 1;

    let level = 'weak';
    let label = 'Fraca';
    let percent = Math.min(100, Math.round((score / 5) * 100));

    if (!value.length) {
      percent = 0;
      label = '';
    } else if (score >= 4 && isValid) {
      level = 'strong';
      label = 'Forte';
    } else if (score >= 3 && isValid) {
      level = 'medium';
      label = 'Média';
    }

    return {
      isValid,
      hasMinLength,
      hasLetter,
      hasNumber,
      level,
      label,
      percent,
    };
  }

  function bindPasswordStrengthMeter(inputId) {
    const input = $(inputId);
    const fill = $('passwordStrengthFill');
    const text = $('passwordStrengthText');
    const ruleLength = $('ruleLength');
    const ruleLetter = $('ruleLetter');
    const ruleNumber = $('ruleNumber');

    if (!input) return;

    function updateRule(el, ok) {
      if (!el) return;
      el.classList.toggle('is-valid', ok);
      const icon = el.querySelector('i');
      if (icon) {
        icon.className = ok ? 'bi bi-check-circle-fill' : 'bi bi-circle';
      }
    }

    input.addEventListener('input', () => {
      const res = evaluatePassword(input.value);
      updateRule(ruleLength, res.hasMinLength);
      updateRule(ruleLetter, res.hasLetter);
      updateRule(ruleNumber, res.hasNumber);

      if (fill) {
        fill.style.width = res.percent + '%';
        fill.className = 'password-strength-fill strength-' + res.level;
      }
      if (text) {
        text.textContent = res.label ? 'Força da senha: ' + res.label : 'Força da senha';
      }
    });
  }

  /* -----------------------------------------------------------
     Extração e Validação Estrita de Token na URL
  ----------------------------------------------------------- */
  function extractAuthToken(expectedType) {
    const searchParams = new URLSearchParams(window.location.search);
    const hashRaw = window.location.hash ? window.location.hash.replace(/^#/, '') : '';
    const hashParams = new URLSearchParams(hashRaw);

    // 1. Formato recomendado (templates personalizados): ?token_hash=...&type=invite|recovery
    const tokenHash = searchParams.get('token_hash');
    const queryType = searchParams.get('type');
    if (tokenHash && queryType === expectedType) {
      return { mode: 'token_hash', tokenHash, type: queryType };
    }

    // 2. Formato fallback do template padrão do Supabase: #access_token=...&refresh_token=...&type=invite|recovery
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const hashType = hashParams.get('type');
    if (accessToken && refreshToken && hashType === expectedType) {
      return { mode: 'hash_session', accessToken, refreshToken, type: hashType };
    }

    // 3. Caso o Supabase retorne erro na URL (ex.: link expirado)
    const errorCode = searchParams.get('error_code') || hashParams.get('error_code') || hashParams.get('error');
    if (errorCode) {
      return { mode: 'error', errorCode };
    }

    return null;
  }

  function scrubUrlSensitiveParams() {
    try {
      if (window.location.search || window.location.hash) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (_) {
      // Ignora em ambientes sem History API
    }
  }

  async function authenticateWithToken(tokenInfo) {
    if (!window.epzmSupabase) {
      throw new Error('Supabase não configurado neste ambiente.');
    }

    if (tokenInfo.mode === 'token_hash') {
      const { data, error } = await window.epzmSupabase.auth.verifyOtp({
        token_hash: tokenInfo.tokenHash,
        type: tokenInfo.type,
      });
      if (error || !data || !data.session) {
        throw new Error('Este link é inválido ou já expirou. Solicite um novo convite ou redefinição.');
      }
      return data.session;
    }

    if (tokenInfo.mode === 'hash_session') {
      const { data, error } = await window.epzmSupabase.auth.setSession({
        access_token: tokenInfo.accessToken,
        refresh_token: tokenInfo.refreshToken,
      });
      if (error || !data || !data.session) {
        throw new Error('Sessão do link inválida ou expirada. Solicite um novo link.');
      }
      return data.session;
    }

    throw new Error('Token de acesso inválido.');
  }

  /* -----------------------------------------------------------
     1. Página: PRIMEIRO ACESSO (type=invite)
  ----------------------------------------------------------- */
  function initPrimeiroAcesso() {
    const tokenInfo = extractAuthToken('invite');
    const blockedView = $('blockedView');
    const formView = $('formView');
    const successView = $('successView');

    if (!window.isSupabaseConfigured || !window.isSupabaseConfigured() || !window.epzmSupabase) {
      $('blockedMessage').textContent =
        'O Supabase ainda não está configurado em js/supabase-config.js. Conclua a configuração antes de ativar acessos.';
      blockedView.classList.remove('d-none');
      return;
    }

    if (!tokenInfo || tokenInfo.mode === 'error') {
      blockedView.classList.remove('d-none');
      return;
    }

    // Remove o token da barra de endereço após capturar em memória
    scrubUrlSensitiveParams();
    formView.classList.remove('d-none');

    bindPasswordToggle('toggleNewPass', 'newPassword');
    bindPasswordToggle('toggleConfirmPass', 'confirmPassword');
    bindPasswordStrengthMeter('newPassword');

    let verifiedSession = null;

    $('firstAccessForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert('authErrorAlert');

      const nome = ($('fullName').value || '').trim();
      const senha = $('newPassword').value || '';
      const confirmacao = $('confirmPassword').value || '';

      if (nome.length < 3) {
        showAlert('authErrorAlert', 'Informe seu nome completo (mínimo de 3 caracteres).');
        return;
      }

      const check = evaluatePassword(senha);
      if (!check.isValid) {
        showAlert('authErrorAlert', 'A senha deve ter no mínimo 8 caracteres, incluindo letras e números.');
        return;
      }

      if (senha !== confirmacao) {
        showAlert('authErrorAlert', 'A confirmação da senha não confere.');
        return;
      }

      const submitBtn = $('firstAccessSubmitBtn');
      setButtonLoading(submitBtn, true, 'Ativando conta...');

      try {
        if (!verifiedSession) {
          verifiedSession = await authenticateWithToken(tokenInfo);
        }

        const { error: updateErr } = await window.epzmSupabase.auth.updateUser({
          password: senha,
          data: { nome_completo: nome },
        });

        if (updateErr) {
          throw new Error(updateErr.message);
        }

        try {
          const now = String(Date.now());
          localStorage.setItem('epzm_admin_login_at', now);
          localStorage.setItem('epzm_admin_last_activity', now);
        } catch (_) {}

        formView.classList.add('d-none');
        successView.classList.remove('d-none');

        setTimeout(() => {
          window.location.href = '/admin/';
        }, 1800);
      } catch (err) {
        showAlert('authErrorAlert', err.message || 'Não foi possível concluir o primeiro acesso.');
      } finally {
        setButtonLoading(submitBtn, false, '', 'Ativar Conta e Entrar');
      }
    });
  }

  /* -----------------------------------------------------------
     2. Página: ESQUECI A SENHA (solicitação)
  ----------------------------------------------------------- */
  function initEsqueciSenha() {
    if (!window.isSupabaseConfigured || !window.isSupabaseConfigured() || !window.epzmSupabase) {
      showAlert('authErrorAlert', 'Supabase não configurado em js/supabase-config.js.');
      return;
    }

    let cooldownTimer = null;

    $('forgotForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert('authErrorAlert');
      hideAlert('authSuccessAlert');

      const email = ($('forgotEmail').value || '').trim();
      if (!email || !email.includes('@')) {
        showAlert('authErrorAlert', 'Informe um endereço de e-mail válido.');
        return;
      }

      const submitBtn = $('forgotSubmitBtn');
      setButtonLoading(submitBtn, true, 'Enviando link...');

      try {
        const redirectUrl = new URL('/admin/redefinir-senha.html', window.location.origin).toString();
        const { error } = await window.epzmSupabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl,
        });

        if (error && error.status === 429) {
          throw new Error('Muitas solicitações seguidas. Aguarde alguns instantes e tente novamente.');
        }

        // Mensagem neutra por segurança (não revela se o e-mail existe no banco)
        showAlert(
          'authSuccessAlert',
          'Se este e-mail estiver cadastrado como administrador, enviamos um link seguro de redefinição. Verifique sua caixa de entrada e a pasta de spam.'
        );

        // Cooldown de 60 segundos para evitar reenvios acidentais
        let secondsLeft = 60;
        submitBtn.disabled = true;
        submitBtn.textContent = `Aguarde ${secondsLeft}s para reenviar`;

        clearInterval(cooldownTimer);
        cooldownTimer = setInterval(() => {
          secondsLeft -= 1;
          if (secondsLeft <= 0) {
            clearInterval(cooldownTimer);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Enviar link de redefinição';
          } else {
            submitBtn.textContent = `Aguarde ${secondsLeft}s para reenviar`;
          }
        }, 1000);
      } catch (err) {
        showAlert('authErrorAlert', err.message || 'Erro ao enviar solicitação. Tente novamente.');
        setButtonLoading(submitBtn, false, '', 'Enviar link de redefinição');
      }
    });
  }

  /* -----------------------------------------------------------
     3. Página: REDEFINIR SENHA (type=recovery)
  ----------------------------------------------------------- */
  function initRedefinirSenha() {
    const tokenInfo = extractAuthToken('recovery');
    const blockedView = $('blockedView');
    const formView = $('formView');
    const successView = $('successView');

    if (!window.isSupabaseConfigured || !window.isSupabaseConfigured() || !window.epzmSupabase) {
      $('blockedMessage').textContent =
        'O Supabase ainda não está configurado em js/supabase-config.js.';
      blockedView.classList.remove('d-none');
      return;
    }

    if (!tokenInfo || tokenInfo.mode === 'error') {
      blockedView.classList.remove('d-none');
      return;
    }

    scrubUrlSensitiveParams();
    formView.classList.remove('d-none');

    bindPasswordToggle('toggleNewPass', 'newPassword');
    bindPasswordToggle('toggleConfirmPass', 'confirmPassword');
    bindPasswordStrengthMeter('newPassword');

    let verifiedSession = null;

    $('resetPasswordForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert('authErrorAlert');

      const senha = $('newPassword').value || '';
      const confirmacao = $('confirmPassword').value || '';

      const check = evaluatePassword(senha);
      if (!check.isValid) {
        showAlert('authErrorAlert', 'A nova senha deve ter no mínimo 8 caracteres, incluindo letras e números.');
        return;
      }

      if (senha !== confirmacao) {
        showAlert('authErrorAlert', 'A confirmação da senha não confere.');
        return;
      }

      const submitBtn = $('resetSubmitBtn');
      setButtonLoading(submitBtn, true, 'Salvando nova senha...');

      try {
        if (!verifiedSession) {
          verifiedSession = await authenticateWithToken(tokenInfo);
        }

        const { error: updateErr } = await window.epzmSupabase.auth.updateUser({ password: senha });
        if (updateErr) {
          throw new Error(updateErr.message);
        }

        try {
          const now = String(Date.now());
          localStorage.setItem('epzm_admin_login_at', now);
          localStorage.setItem('epzm_admin_last_activity', now);
        } catch (_) {}

        formView.classList.add('d-none');
        successView.classList.remove('d-none');

        setTimeout(() => {
          window.location.href = '/admin/';
        }, 1800);
      } catch (err) {
        showAlert('authErrorAlert', err.message || 'Não foi possível redefinir a senha.');
      } finally {
        setButtonLoading(submitBtn, false, '', 'Salvar Nova Senha');
      }
    });
  }

  /* -----------------------------------------------------------
     Bootstrap automático conforme atributo data-auth-page
  ----------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    const pageType = document.body.getAttribute('data-auth-page');
    if (pageType === 'primeiro-acesso') {
      initPrimeiroAcesso();
    } else if (pageType === 'esqueci-senha') {
      initEsqueciSenha();
    } else if (pageType === 'redefinir-senha') {
      initRedefinirSenha();
    }
  });
})();
