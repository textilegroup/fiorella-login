/* =================================================================
   guard.js — Central de Acesso Fiorella Brasil
   -----------------------------------------------------------------
   Visual alinhado ao design system da Fiorella: branco predominante,
   vermelho nos detalhes, tipografia Archivo.
   As cores saem dos tokens de theme.css quando a página os tiver;
   quando não tiver, caem no valor light equivalente.
   -----------------------------------------------------------------
   Como usar numa ferramenta existente: UMA linha dentro do <head>.

     <script src="https://textilegroup.github.io/fiorella-users/guard.js"
             data-app="atas"></script>

   O valor de data-app é a "chave" cadastrada na Central de Acesso
   (área Ferramentas autorizadas).

   ATENÇÃO: cada ferramenta deve apontar para o guard.js do
   repositório da SUA organização — é dele que o guard tira o
   endereço do login. Uma ferramenta da Fiorella apontando para o
   guard.js do outro portal manda a pessoa para o hub errado.

   Atributos opcionais na mesma tag:
     data-barra="nao"      esconde a barra de identificação no topo.
     data-tema="completo"  carrega o theme.css inteiro do padrão Fiorella.
     data-tema="nao"       não injeta fonte nem tokens de cor.
   Sem data-tema, o guard injeta apenas a fonte Archivo e os tokens de
   cor — a paleta fica disponível e nada da página é restilizado.

   O que ele faz, nesta ordem:
     1. esconde a página enquanto verifica;
     2. sem sessão  -> manda para o login e volta sozinho depois;
     3. sem permissão para esta ferramenta -> tela de aviso;
     4. tudo certo  -> libera a página e publica window.APP.

   Depois disso a sua ferramenta pode usar:
     APP.usuario     -> { nome, email, nivel, setor }
     APP.permissao   -> 'ver' | 'editar' | 'admin'
     APP.podeEditar()-> true/false
     APP.eAdmin()    -> true/false
     APP.sair()
     await APP.pronto  -> promessa resolvida quando a checagem termina
   ================================================================= */
(function () {
  'use strict';

  var SUPABASE_URL  = 'https://eepmlsdbtcvsjxdcvimi.supabase.co';
  var SUPABASE_ANON = 'sb_publishable_048Dv-jRALn34Ythhj9ngA_fZ1gsNI_';
  var CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

  // --- descobre a própria URL, e daí a URL do hub -----------------
  var meuSrc = (document.currentScript && document.currentScript.src) || '';
  var APP_SLUG = (document.currentScript && document.currentScript.dataset.app) || '';
  var SEM_BARRA = (document.currentScript && document.currentScript.dataset.barra) === 'nao';
  var TEMA = (document.currentScript && document.currentScript.dataset.tema) || 'tokens';
  var HUB = meuSrc ? meuSrc.replace(/guard\.js(\?.*)?$/, 'index.html') : '/fiorella-users/index.html';
  var BASE = meuSrc ? meuSrc.replace(/guard\.js(\?.*)?$/, '') : '/fiorella-users/';

  if (!APP_SLUG) {
    console.error('[guard] Falta data-app="chave-da-ferramenta" na tag <script>.');
  }

  /* -----------------------------------------------------------------
     LAYOUT FIORELLA
     data-tema="tokens"   (padrão) fonte Archivo + tokens de cor. Não
                          restiliza nada: só disponibiliza a paleta,
                          e o CSS da própria página continua vencendo.
     data-tema="completo" carrega o theme.css inteiro do hub — use em
                          páginas que vão adotar os componentes do
                          design system (.card, .kpi, .app-header…).
     data-tema="nao"      não injeta nada.

     Os NOMES dos tokens são os mesmos do padrão anterior (--wine e
     companhia): só os valores mudaram, de vinho para vermelho. Assim
     nenhuma ferramenta já escrita precisa ser reescrita.
     ----------------------------------------------------------------- */
  var TOKENS_LIGHT =
    '--wine:#D32F2F;--wine-deep:#B71C1C;--wine-soft:#E45B5B;' +
    '--bg:#FAFAFA;--card:#FFFFFF;--sunk:#F6F6F7;' +
    '--ink:#1F1F22;--ink-2:#57565B;--ink-3:#8A898F;' +
    '--line:#E4E4E6;--line-2:#F0F0F1;' +
    '--s1:#D32F2F;--s2:#B8801F;--s3:#1E6FB8;--s4:#4E7A1E;' +
    '--pos:#2C6B4F;--neg:#C0392B;--chip:#F5F5F6;' +
    '--shadow:0 1px 2px rgba(31,31,34,.05),0 1px 8px rgba(31,31,34,.04);';
  var TOKENS_DARK =
    '--wine:#EF5350;--wine-deep:#B71C1C;--wine-soft:#F08A86;' +
    '--bg:#141416;--card:#1D1D20;--sunk:#26262A;' +
    '--ink:#F1EFEF;--ink-2:#B3B1B5;--ink-3:#84828A;' +
    '--line:#333136;--line-2:#2A282E;' +
    '--s1:#F08A86;--s2:#B8842C;--s3:#5B92E0;--s4:#6E9430;' +
    '--pos:#5FA37E;--neg:#E0705C;--chip:#2A282E;' +
    '--shadow:0 1px 2px rgba(0,0,0,.4);';

  function noTopoDoHead(el) {
    var h = document.head || document.documentElement;
    h.firstChild ? h.insertBefore(el, h.firstChild) : h.appendChild(el);
  }

  function aplicarTema() {
    if (TEMA === 'nao') return;

    // Fonte oficial do padrão.
    var f = document.createElement('link');
    f.rel = 'stylesheet';
    f.href = 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700' +
             '&family=Archivo+Narrow:wght@400;500;600;700&display=swap';
    noTopoDoHead(f);

    if (TEMA === 'completo') {
      var t = document.createElement('link');
      t.rel = 'stylesheet';
      t.href = BASE + 'theme.css';
      noTopoDoHead(t);
      return;
    }

    // Só os tokens. Entram no topo do <head> de propósito: assim o CSS
    // da própria ferramenta continua tendo a última palavra.
    var s = document.createElement('style');
    s.setAttribute('data-guard-tema', '');
    s.textContent =
      ':root{' + TOKENS_LIGHT + '}' +
      '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){' + TOKENS_DARK + '}}' +
      ':root[data-theme="dark"]{' + TOKENS_DARK + '}';
    noTopoDoHead(s);
  }

  aplicarTema();

  // --- esconde a página imediatamente (sem flash de conteúdo) -----
  var estilo = document.createElement('style');
  estilo.id = '__guard_estilo';
  estilo.textContent = 'body{visibility:hidden!important}';
  (document.head || document.documentElement).appendChild(estilo);

  function liberarPagina() {
    var e = document.getElementById('__guard_estilo');
    if (e) e.remove();
  }

  function irParaLogin() {
    location.replace(HUB + '?next=' + encodeURIComponent(location.href));
  }

  var FONTE = '"Archivo","Helvetica Neue",Arial,sans-serif';

  function telaDeAviso(titulo, texto, comBotaoSair) {
    function pintar() {
      document.body.innerHTML =
        '<div style="min-height:100vh;display:grid;place-items:center;padding:24px;' +
        'font-family:' + FONTE + ';font-size:13px;line-height:1.4;' +
        'background:var(--bg,#FAFAFA);color:var(--ink,#1F1F22)">' +
          '<div style="width:100%;max-width:372px;background:var(--card,#FFFFFF);' +
          'border:1px solid var(--line,#E4E4E6);border-radius:12px;overflow:hidden;' +
          'box-shadow:0 1px 2px rgba(31,31,34,.05),0 8px 26px rgba(31,31,34,.09)">' +
            '<div style="display:flex;align-items:center;gap:11px;padding:14px 22px;' +
            'background:var(--card,#FFFFFF);color:var(--ink,#1F1F22);' +
            'border-bottom:3px solid var(--wine,#D32F2F)">' +
              '<span style="width:34px;height:34px;border-radius:50%;flex-shrink:0;' +
              'background:var(--wine,#D32F2F);color:#fff;display:grid;place-items:center;' +
              'font-size:11.5px;font-weight:700">FIO</span>' +
              '<span>' +
                '<span style="display:block;font-size:15px;font-weight:700;line-height:1.15">' +
                'Central de Acesso</span>' +
                '<span style="display:block;font-size:10.5px;color:var(--ink-3,#8A898F);' +
                'margin-top:1px">Fiorella Brasil</span>' +
              '</span>' +
            '</div>' +
            '<div style="padding:24px 22px 20px">' +
              '<h2 style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.09em;' +
              'text-transform:uppercase;color:var(--wine,#D32F2F)">' + titulo + '</h2>' +
              '<p style="margin:0 0 20px;font-size:12px;color:var(--ink-2,#57565B)">' + texto + '</p>' +
              '<a href="' + HUB + '" style="display:block;text-align:center;padding:10px;' +
              'background:var(--wine,#D32F2F);color:#fff;border-radius:8px;text-decoration:none;' +
              'font-weight:700;font-size:12.5px;letter-spacing:.05em;text-transform:uppercase">' +
              'Ir para a Central</a>' +
              (comBotaoSair ? '<div style="text-align:center;margin-top:14px;padding-top:14px;' +
              'border-top:1px solid var(--line-2,#F0F0F1)"><button onclick="APP.sair()" ' +
              'style="background:none;border:0;color:var(--ink-3,#8A898F);cursor:pointer;padding:3px;' +
              'font-family:' + FONTE + ';font-size:11.5px;font-weight:500">Sair da conta</button></div>' : '') +
            '</div>' +
          '</div>' +
        '</div>';
      liberarPagina();
    }
    document.body ? pintar()
                  : document.addEventListener('DOMContentLoaded', pintar);
  }

  function carregarSDK() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise(function (ok, falha) {
      var s = document.createElement('script');
      s.src = CDN;
      s.onload = ok;
      s.onerror = function () { falha(new Error('Falha ao carregar o SDK do Supabase.')); };
      (document.head || document.documentElement).appendChild(s);
    });
  }

  var resolver, rejeitar;
  var pronto = new Promise(function (a, b) { resolver = a; rejeitar = b; });

  window.APP = {
    slug: APP_SLUG,
    hub: HUB,
    usuario: null,
    permissao: null,
    sb: null,
    pronto: pronto,
    podeEditar: function () {
      return this.permissao === 'editar' || this.permissao === 'admin';
    },
    eAdmin: function () { return this.permissao === 'admin'; },
    sair: function () {
      var cli = this.sb;
      // Volta para o login guardando de onde a pessoa saiu: quem entra de
      // novo cai na ferramenta que estava usando, e não parado no hub.
      var voltar = HUB + '?next=' + encodeURIComponent(location.href.split('#')[0]);
      Promise.resolve(cli && cli.auth.signOut()).then(function () {
        location.replace(voltar);
      });
    }
  };

  // --- barra de identificação no topo da ferramenta ---------------
  // Branca, com um filete vermelho embaixo: a mesma lógica do header
  // do hub, para a ferramenta não parecer de outra casa.
  function montarBarra() {
    if (SEM_BARRA) return;
    function pintar() {
      var nome = (APP.usuario.nome || '').trim();
      var ini = nome.split(/\s+/).map(function (p) { return p[0] || ''; });
      ini = ((ini[0] || '?') + (ini.length > 1 ? ini[ini.length - 1] : '')).toUpperCase();
      var rot = { admin: 'acesso total', editar: 'edição', ver: 'somente leitura' };

      var b = document.createElement('div');
      b.setAttribute('data-guard-barra', '');
      b.className = 'no-print';
      b.style.cssText = 'position:sticky;top:0;z-index:99999;display:flex;align-items:center;' +
        'gap:9px;padding:6px 16px;font-family:' + FONTE + ';font-size:11.5px;' +
        'background:var(--card,#FFFFFF);color:var(--ink,#1F1F22);' +
        'border-bottom:2px solid var(--wine,#D32F2F);' +
        'box-shadow:0 1px 3px rgba(31,31,34,.05)';
      b.innerHTML =
        '<a href="' + HUB + '" style="color:var(--wine,#D32F2F);text-decoration:none;' +
        'font-weight:700;letter-spacing:.05em;text-transform:uppercase;font-size:10.5px">' +
        '&#8592; Central</a>' +
        '<span style="flex:1"></span>' +
        '<span style="color:var(--ink-3,#8A898F);font-size:9.5px;font-weight:700;' +
        'letter-spacing:.08em;text-transform:uppercase">' + (rot[APP.permissao] || '') + '</span>' +
        '<span style="display:flex;align-items:center;gap:7px;padding:3px 8px 3px 3px;' +
        'border:1px solid var(--line,#E4E4E6);border-radius:8px;background:var(--chip,#F5F5F6)">' +
          '<span style="width:21px;height:21px;border-radius:50%;background:var(--wine,#D32F2F);' +
          'color:#fff;display:grid;place-items:center;font-size:9.5px;' +
          'font-weight:700">' + ini + '</span>' +
          '<span style="font-weight:600;color:var(--ink,#1F1F22)">' + nome + '</span>' +
        '</span>' +
        '<button style="border:1px solid var(--line,#E4E4E6);border-radius:8px;' +
        'background:var(--chip,#F5F5F6);color:var(--ink-2,#57565B);font-family:' + FONTE + ';' +
        'font-size:11px;font-weight:600;cursor:pointer;padding:5px 10px" ' +
        'onclick="APP.sair()">Sair</button>';
      document.body.insertBefore(b, document.body.firstChild);
    }
    document.body ? pintar()
                  : document.addEventListener('DOMContentLoaded', pintar);
  }

  // --- fluxo principal -------------------------------------------
  carregarSDK()
    .then(function () {
      APP.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
      return APP.sb.auth.getSession();
    })
    .then(function (r) {
      if (!r.data.session) { irParaLogin(); return Promise.reject('sem-sessao'); }
      return Promise.all([
        APP.sb.rpc('app_perfil'),
        APP.sb.rpc('app_permissao', { p_slug: APP_SLUG })
      ]);
    })
    .then(function (res) {
      var perfil = res[0].data && res[0].data[0];
      var perm = res[1].data;

      if (res[0].error || !perfil) { irParaLogin(); return Promise.reject('sem-perfil'); }

      if (!perfil.ativo) {
        telaDeAviso('Acesso aguardando liberação',
          'Sua conta existe, mas ainda não foi ativada por um administrador.', true);
        return Promise.reject('inativo');
      }

      if (!perm) {
        telaDeAviso('Sem permissão',
          'Seu nível de acesso (<strong>' + perfil.nivel + '</strong>) não inclui esta ferramenta. ' +
          'Peça a liberação a um administrador.', true);
        return Promise.reject('sem-permissao');
      }

      APP.usuario = { nome: perfil.nome, email: perfil.email, nivel: perfil.nivel, setor: perfil.setor };
      APP.permissao = perm;

      APP.sb.rpc('app_marcar_acesso');
      montarBarra();
      liberarPagina();
      resolver(APP);

      // Sessão encerrada em outra aba -> volta para o login.
      APP.sb.auth.onAuthStateChange(function (evento) {
        if (evento === 'SIGNED_OUT') location.replace(HUB);
      });
    })
    .catch(function (e) {
      if (typeof e === 'string') { rejeitar(e); return; }   // já tratado acima
      console.error('[guard]', e);
      telaDeAviso('Não foi possível verificar o acesso',
        'Confira sua conexão e recarregue a página.', false);
      rejeitar(e);
    });
})();
