/**
 * Escola Presbiteriana Zenaide Magalhães
 * Configuração central do cliente Supabase (apenas chave pública ANON).
 *
 * IMPORTANTE:
 * - Nunca coloque a chave service_role neste arquivo.
 * - A segurança real é aplicada no PostgreSQL e no Storage via RLS (ver supabase/schema.sql).
 */

(function () {
  const CONFIG = {
    // Substitua pelos valores de Project Settings -> API no seu projeto Supabase:
    url: 'https://peefltzrmjvpomuzxwqy.supabase.co',
    anonKey: 'sb_publishable_FZhBomznb7_pKcDp73iCBw_8Xa3i-kW',
    storageBucket: 'midias-site',
  };

  window.EPZM_SUPABASE_CONFIG = CONFIG;

  window.isSupabaseConfigured = function () {
    return Boolean(
      CONFIG.url &&
      CONFIG.anonKey &&
      CONFIG.url.startsWith('https://') &&
      !CONFIG.url.includes('COLE_AQUI') &&
      !CONFIG.anonKey.includes('COLE_AQUI')
    );
  };

  window.epzmSupabase = null;

  if (window.isSupabaseConfigured() && window.supabase && typeof window.supabase.createClient === 'function') {
    window.epzmSupabase = window.supabase.createClient(CONFIG.url, CONFIG.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
})();
